"""LLM client — calls OpenRouter or Ollama for text generation."""

import logging
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_key_index = 0


def _get_next_openrouter_key() -> str:
    """Rotate through available OpenRouter API keys."""
    global _key_index
    settings = get_settings()
    keys = settings.openrouter_keys_list
    if not keys:
        raise ValueError("No OpenRouter API keys configured")
    key = keys[_key_index % len(keys)]
    _key_index += 1
    return key


async def generate_text(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> str:
    """Generate text using the configured LLM provider.

    Returns the generated text string.
    Raises Exception on failure.
    """
    settings = get_settings()

    if settings.ai_provider == "ollama":
        return await _call_ollama(system_prompt, user_prompt, max_tokens, temperature)
    else:
        return await _call_openrouter(system_prompt, user_prompt, max_tokens, temperature)


async def _call_openrouter(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    """Call OpenRouter API."""
    settings = get_settings()
    models = settings.openrouter_models_list

    for model in models:
        try:
            api_key = _get_next_openrouter_key()
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                elif response.status_code == 429:
                    logger.warning(f"Rate limited on {model}, trying next model...")
                    continue
                else:
                    logger.warning(f"OpenRouter error ({response.status_code}) for {model}: {response.text[:200]}")
                    continue

        except Exception as e:
            logger.warning(f"OpenRouter call failed for {model}: {e}")
            continue

    raise Exception("All LLM models failed or rate-limited")


async def _call_ollama(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    """Call local Ollama instance."""
    settings = get_settings()
    url = f"{settings.ollama_base_url}/api/chat"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            json={
                "model": settings.ollama_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                },
            },
        )

        if response.status_code == 200:
            data = response.json()
            return data["message"]["content"]
        else:
            raise Exception(f"Ollama error: {response.status_code} — {response.text[:200]}")
