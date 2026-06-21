"""OpenAI Realtime API voice session management.

Handles WebSocket connection to OpenAI's Realtime API, session creation,
configuration, audio relay, and event parsing.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import AsyncGenerator

import websockets
from websockets.legacy.client import WebSocketClientProtocol as ClientConnection

from app.config import get_settings
from app.prompts.intake_system import INTAKE_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Connection constants
CONNECTION_TIMEOUT_SECONDS = 30
SESSION_CONFIRM_TIMEOUT_SECONDS = 10

# Audio configuration matching OpenAI requirements
AUDIO_FORMAT = "pcm16"
SAMPLE_RATE = 24000
VOICE = "sage"

# VAD configuration
VAD_THRESHOLD = 0.5
VAD_PREFIX_PADDING_MS = 300
VAD_SILENCE_DURATION_MS = 500


class AIServiceError(Exception):
    """Raised when OpenAI Realtime API interaction fails."""
    pass


@dataclass
class RealtimeSession:
    """Represents an active OpenAI Realtime API WebSocket session."""

    ws: ClientConnection
    session_id: str = ""
    is_connected: bool = False
    _sequence: int = field(default=0, repr=False)

    def next_sequence(self) -> int:
        """Get monotonically increasing sequence number."""
        self._sequence += 1
        return self._sequence


async def create_realtime_session() -> RealtimeSession:
    """Open and configure a new OpenAI Realtime API session.

    Returns:
        RealtimeSession with an active WebSocket connection.

    Raises:
        AIServiceError: If connection or configuration fails.
    """
    settings = get_settings()

    if not settings.openai_api_key:
        raise AIServiceError("OPENAI_API_KEY is not configured")

    url = f"{settings.openai_realtime_url}?model={settings.openai_realtime_model}"
    logger.info(f"Connecting to OpenAI Realtime API: model={settings.openai_realtime_model}")

    # Establish WebSocket connection
    try:
        ws = await asyncio.wait_for(
            websockets.connect(
                url,
                extra_headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                },
            ),
            timeout=CONNECTION_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise AIServiceError(
            f"Connection to OpenAI timed out after {CONNECTION_TIMEOUT_SECONDS}s"
        )
    except Exception as e:
        raise AIServiceError(f"Failed to connect to OpenAI Realtime API: {e}")

    session = RealtimeSession(ws=ws)

    # Configure session
    # Configure session — GA API only accepts 'type' and 'instructions' in session.update
    # Audio format, voice, VAD, and transcription are configured by the model defaults
    session_config = {
        "type": "session.update",
        "session": {
            "type": "realtime",
            "instructions": INTAKE_SYSTEM_PROMPT,
        },
    }

    await ws.send(json.dumps(session_config))
    logger.info("Sent session.update to OpenAI")

    # Wait for session confirmation
    try:
        raw = await asyncio.wait_for(ws.recv(), timeout=SESSION_CONFIRM_TIMEOUT_SECONDS)
        event = json.loads(raw)
        event_type = event.get("type", "")

        if event_type == "session.created":
            session.session_id = event.get("session", {}).get("id", "")
            session.is_connected = True
            logger.info(f"OpenAI session created: id={session.session_id}")
        elif event_type == "session.updated":
            session.is_connected = True
            logger.info("OpenAI session confirmed (session.updated)")
        elif event_type == "error":
            error_msg = event.get("error", {}).get("message", "Unknown error")
            await ws.close()
            raise AIServiceError(f"OpenAI session error: {error_msg}")
        else:
            # Accept any initial event as confirmation
            session.is_connected = True
            logger.info(f"OpenAI session ready (received: {event_type})")

    except asyncio.TimeoutError:
        await ws.close()
        raise AIServiceError("Timed out waiting for session confirmation from OpenAI")

    return session


async def send_audio_chunk(session: RealtimeSession, audio_base64: str) -> None:
    """Send a base64-encoded PCM16 audio chunk to OpenAI.

    Args:
        session: Active realtime session.
        audio_base64: Base64 encoded PCM16 audio data from browser.
    """
    if not session.is_connected:
        return

    message = {
        "type": "input_audio_buffer.append",
        "audio": audio_base64,
    }

    try:
        await session.ws.send(json.dumps(message))
    except Exception as e:
        logger.warning(f"Failed to send audio chunk: {e}")


async def receive_events(session: RealtimeSession) -> AsyncGenerator[dict, None]:
    """Yield parsed events from the OpenAI Realtime API session.

    This is an async generator that continuously reads from the WebSocket
    and yields parsed event dictionaries until the connection closes.
    """
    try:
        async for raw_message in session.ws:
            try:
                event = json.loads(raw_message)
                yield event
            except json.JSONDecodeError:
                logger.warning("Received non-JSON message from OpenAI, skipping")
    except websockets.ConnectionClosed as e:
        logger.info(f"OpenAI WebSocket closed: code={e.code} reason={e.reason}")
    except Exception as e:
        logger.error(f"Error receiving from OpenAI: {e}")


async def close_session(session: RealtimeSession) -> None:
    """Close an OpenAI Realtime API session and clean up resources."""
    session.is_connected = False
    try:
        await session.ws.close()
        logger.info(f"OpenAI session closed: id={session.session_id}")
    except Exception as e:
        logger.warning(f"Error closing OpenAI session: {e}")


def parse_openai_event(event: dict) -> dict | None:
    """Parse an OpenAI Realtime API event into our internal WebSocket message format.

    Returns:
        Dict with {type, data} matching browser WebSocket protocol, or None if ignored.
    """
    event_type = event.get("type", "")

    # AI audio chunk — stream to browser for playback
    if event_type in ("response.audio.delta", "response.output_audio.delta"):
        delta = event.get("delta", "")
        if delta:
            return {"type": "audio_delta", "data": {"audio": delta}}

    # AI transcript delta — stream text word-by-word
    elif event_type in ("response.audio_transcript.delta", "response.output_audio_transcript.delta"):
        delta = event.get("delta", "")
        if delta:
            return {"type": "transcript_delta", "data": {"speaker": "ai", "text": delta}}

    # AI transcript complete — full AI response text
    elif event_type in ("response.audio_transcript.done", "response.output_audio_transcript.done"):
        transcript = event.get("transcript", "")
        if transcript:
            return {
                "type": "transcript_complete",
                "data": {"speaker": "ai", "text": transcript},
            }

    # User transcript complete — what the caller said
    elif event_type in (
        "conversation.item.input_audio_transcription.completed",
        "conversation.item.input_audio_transcription.done",
    ):
        transcript = event.get("transcript", "")
        if transcript:
            return {
                "type": "transcript_complete",
                "data": {"speaker": "caller", "text": transcript},
            }

    # Response done — AI finished this conversational turn
    elif event_type == "response.done":
        return {"type": "response_done", "data": {}}

    # Error from OpenAI
    elif event_type == "error":
        error_msg = event.get("error", {}).get("message", "Unknown AI error")
        error_code = event.get("error", {}).get("code", "")
        # Non-fatal errors (like unknown params) should be logged but not surfaced to user
        if error_code in ("invalid_request_error",) or "Unknown parameter" in error_msg:
            logger.warning(f"Non-fatal OpenAI error: {error_msg}")
            return None
        logger.error(f"OpenAI error event: {error_msg}")
        return {"type": "error", "data": {"message": f"AI service error: {error_msg}"}}

    # Events we intentionally ignore (noise in the protocol)
    elif event_type in (
        "session.created",
        "session.updated",
        "input_audio_buffer.speech_started",
        "input_audio_buffer.speech_stopped",
        "input_audio_buffer.committed",
        "response.created",
        "response.output_item.added",
        "response.content_part.added",
        "response.content_part.done",
        "response.output_item.done",
        "conversation.item.created",
        "conversation.item.added",
        "conversation.item.done",
        "rate_limits.updated",
        "response.output_audio.done",
    ):
        return None

    else:
        logger.debug(f"Unhandled OpenAI event: {event_type}")
        return None

    return None
