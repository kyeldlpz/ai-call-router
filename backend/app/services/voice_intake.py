"""AI conversational service with Ollama and OpenRouter support.

Supports:
- Ollama (local, free)
- OpenRouter (free models, multiple API keys with rotation on rate-limit)

The browser handles STT/TTS; this service only deals with text in/text out.
"""

import logging
import random
from dataclasses import dataclass, field

import httpx

from app.config import get_settings
from app.prompts.compose import compose_system_prompt
from app.repositories.agent_config_repository import agent_config_repository

logger = logging.getLogger(__name__)

# Timeouts
OLLAMA_TIMEOUT_SECONDS = 60
OPENROUTER_TIMEOUT_SECONDS = 30


class AIServiceError(Exception):
    """Raised when AI service interaction fails."""
    pass


class _KeyRotator:
    """Rotates through multiple API keys, skipping rate-limited ones."""

    def __init__(self, keys: list[str]):
        self._keys = keys
        self._index = 0

    @property
    def has_keys(self) -> bool:
        return len(self._keys) > 0

    @property
    def count(self) -> int:
        return len(self._keys)

    def next(self) -> str:
        """Get the next key in rotation."""
        if not self._keys:
            raise AIServiceError("No OpenRouter API keys configured")
        key = self._keys[self._index % len(self._keys)]
        self._index += 1
        return key

    def current(self) -> str:
        """Get current key without advancing."""
        if not self._keys:
            raise AIServiceError("No OpenRouter API keys configured")
        return self._keys[(self._index - 1) % len(self._keys)]


# Global key rotator (initialized on first use)
_rotator: _KeyRotator | None = None


def _get_rotator() -> _KeyRotator:
    global _rotator
    if _rotator is None:
        settings = get_settings()
        _rotator = _KeyRotator(settings.openrouter_keys_list)
    return _rotator


@dataclass
class ConversationSession:
    """Tracks conversation history for a call session."""

    session_id: str = ""
    is_connected: bool = False
    messages: list = field(default_factory=list)
    _sequence: int = field(default=0, repr=False)

    def next_sequence(self) -> int:
        """Get monotonically increasing sequence number."""
        self._sequence += 1
        return self._sequence


async def create_conversation_session() -> ConversationSession:
    """Create a new conversation session.

    Returns:
        ConversationSession ready to receive messages.

    Raises:
        AIServiceError: If the AI provider is not reachable.
    """
    settings = get_settings()

    if settings.ai_provider == "ollama":
        # Verify Ollama is running
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.ollama_base_url}/api/tags",
                    timeout=5.0,
                )
                if response.status_code != 200:
                    raise AIServiceError("Ollama is not responding")
        except httpx.ConnectError:
            raise AIServiceError(
                f"Cannot connect to Ollama at {settings.ollama_base_url}. "
                "Make sure Ollama is running (ollama serve)."
            )
        except AIServiceError:
            raise
        except Exception as e:
            raise AIServiceError(f"Failed to connect to Ollama: {e}")

        logger.info(f"Conversation session created: provider=ollama, model={settings.ollama_model}")

    elif settings.ai_provider == "openrouter":
        rotator = _get_rotator()
        if not rotator.has_keys:
            raise AIServiceError(
                "No OpenRouter API keys configured. "
                "Set OPENROUTER_API_KEYS in .env (comma-separated)."
            )
        logger.info(
            f"Conversation session created: provider=openrouter, "
            f"model={settings.openrouter_model}, keys={rotator.count}"
        )

    else:
        raise AIServiceError(f"Unknown AI provider: {settings.ai_provider}")

    config = agent_config_repository.get()
    system_prompt = compose_system_prompt(config)
    logger.debug(
        "Conversation session prompt: config_updated_at=%s chars=%d",
        config.updated_at,
        len(system_prompt),
    )

    session = ConversationSession(
        session_id=f"session_{id(object())}",
        is_connected=True,
        messages=[
            {"role": "system", "content": system_prompt},
        ],
    )

    return session


async def _call_ollama(messages: list[dict], max_tokens: int = 256) -> str:
    """Call Ollama API."""
    settings = get_settings()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": max_tokens,
                },
            },
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )

        if response.status_code != 200:
            raise AIServiceError(f"Ollama returned status {response.status_code}")

        data = response.json()
        return data.get("message", {}).get("content", "")


async def _call_openrouter(messages: list[dict], max_tokens: int = 256) -> str:
    """Call OpenRouter API with key rotation AND model fallback on rate-limit."""
    settings = get_settings()
    rotator = _get_rotator()
    models = settings.openrouter_models_list

    last_error = ""

    # Try each model
    for model in models:
        # Try each key for this model
        for _ in range(rotator.count):
            api_key = rotator.next()

            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:3000",
                            "X-Title": "RecoverAi",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "max_tokens": max_tokens,
                            "temperature": 0.7,
                        },
                        timeout=OPENROUTER_TIMEOUT_SECONDS,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        content = (
                            data.get("choices", [{}])[0]
                            .get("message", {})
                            .get("content", "")
                        )
                        if content:
                            logger.debug(f"OpenRouter success: model={model}, key=...{api_key[-6:]}")
                            return content
                        # Empty response — try next
                        last_error = f"{model} returned empty response"
                        break  # Move to next model

                    elif response.status_code == 429:
                        # Rate limited — try next key
                        logger.warning(
                            f"OpenRouter 429: model={model}, key=...{api_key[-6:]}"
                        )
                        last_error = "Rate limited"
                        continue

                    elif response.status_code == 404:
                        # Model unavailable — skip to next model
                        logger.warning(f"OpenRouter 404: model={model} not available")
                        last_error = f"{model} not available"
                        break

                    else:
                        error_text = response.text[:200]
                        logger.error(
                            f"OpenRouter {response.status_code}: model={model} - {error_text}"
                        )
                        last_error = f"{model} returned status {response.status_code}"
                        continue

            except httpx.TimeoutException:
                last_error = f"{model} timed out"
                logger.warning(f"OpenRouter timeout: model={model}, key=...{api_key[-6:]}")
                continue
            except Exception as e:
                last_error = str(e)
                continue

        else:
            # All keys exhausted for this model — try next model
            continue

    raise AIServiceError(f"All OpenRouter models/keys exhausted: {last_error}")


async def _generate(messages: list[dict], max_tokens: int = 256) -> str:
    """Route to the configured AI provider."""
    settings = get_settings()

    if settings.ai_provider == "ollama":
        return await _call_ollama(messages, max_tokens)
    elif settings.ai_provider == "openrouter":
        return await _call_openrouter(messages, max_tokens)
    else:
        raise AIServiceError(f"Unknown AI provider: {settings.ai_provider}")


async def generate_response(session: ConversationSession, user_text: str) -> str:
    """Generate an AI response to the user's message.

    Args:
        session: Active conversation session with message history.
        user_text: The caller's transcribed speech.

    Returns:
        AI response text.

    Raises:
        AIServiceError: If the AI fails to generate a response.
    """
    # Add user message to history
    session.messages.append({"role": "user", "content": user_text})

    try:
        ai_text = await _generate(session.messages, max_tokens=150)

        if not ai_text:
            raise AIServiceError("AI returned empty response")

        # Add AI response to history
        session.messages.append({"role": "assistant", "content": ai_text})
        logger.debug(f"AI response: {ai_text[:100]}...")
        return ai_text

    except AIServiceError:
        # Remove the user message if we failed (don't corrupt history)
        session.messages.pop()
        raise
    except Exception as e:
        session.messages.pop()
        raise AIServiceError(f"Unexpected error: {e}")


async def generate_greeting(session: ConversationSession) -> str:
    """Generate the initial AI greeting when a call starts.

    Returns:
        AI greeting text to be spoken via TTS.
    """
    greeting_messages = session.messages + [
        {
            "role": "user",
            "content": "(A new caller has just connected. Greet them warmly and ask how you can help.)",
        },
    ]

    try:
        ai_text = await _generate(greeting_messages, max_tokens=60)

        if not ai_text:
            return "Hello! Thank you for calling. How can I help you today?"

        # Add to session history
        session.messages.append({"role": "assistant", "content": ai_text})
        return ai_text

    except Exception as e:
        logger.warning(f"Failed to generate greeting: {e}")
        return "Hello! Thank you for calling. How can I help you today?"


async def close_session(session: ConversationSession) -> None:
    """Close a conversation session and clean up resources."""
    session.is_connected = False
    session.messages = []
    logger.info(f"Conversation session closed: id={session.session_id}")
