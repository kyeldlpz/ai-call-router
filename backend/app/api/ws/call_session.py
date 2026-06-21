"""WebSocket call session handler — bidirectional relay between browser and OpenAI.

This is the core real-time pipeline:
  Browser (audio) → FastAPI → OpenAI Realtime API
  OpenAI (audio + transcript) → FastAPI → Browser
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from app.repositories.call_repository import call_repository
from app.services.voice_intake import (
    AIServiceError,
    RealtimeSession,
    close_session,
    create_realtime_session,
    parse_openai_event,
    receive_events,
    send_audio_chunk,
)

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def call_session_handler(websocket: WebSocket, call_id: str) -> None:
    """Handle a WebSocket connection for a voice call session.

    Lifecycle:
    1. Accept browser connection
    2. Validate call exists in repository
    3. Open OpenAI Realtime API session
    4. Send call_status: active to browser
    5. Run two concurrent relay loops
    6. Clean up on disconnect or call_end
    """
    # Validate call exists
    call = call_repository.get_call(call_id)
    if not call:
        await websocket.close(code=4004, reason="Call not found")
        return

    await websocket.accept()
    logger.info(f"Browser WebSocket connected: call={call_id}")

    # Track sequence for message ordering
    sequence = 0

    def next_seq() -> int:
        nonlocal sequence
        sequence += 1
        return sequence

    # Open OpenAI session
    openai_session: RealtimeSession | None = None
    try:
        openai_session = await create_realtime_session()
    except AIServiceError as e:
        logger.error(f"Failed to create OpenAI session for call={call_id}: {e}")
        await websocket.send_json({
            "type": "error",
            "data": {"message": str(e)},
            "timestamp": _now_iso(),
            "sequence": next_seq(),
        })
        await websocket.close(code=4500, reason="AI service unavailable")
        return

    # Mark call as active
    call_repository.update_status(call_id, "active")

    # Notify browser that session is ready
    await websocket.send_json({
        "type": "call_status",
        "data": {"status": "active"},
        "timestamp": _now_iso(),
        "sequence": next_seq(),
    })

    logger.info(f"Call active: call={call_id}, openai_session={openai_session.session_id}")

    # --- Relay loops ---

    async def browser_to_openai() -> None:
        """Forward audio from browser to OpenAI."""
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")

                if msg_type == "audio_input":
                    audio = data.get("data", {}).get("audio", "")
                    if audio and openai_session:
                        await send_audio_chunk(openai_session, audio)

                elif msg_type == "call_end":
                    logger.info(f"Call end requested by browser: call={call_id}")
                    return

        except WebSocketDisconnect:
            logger.info(f"Browser disconnected: call={call_id}")

    async def openai_to_browser() -> None:
        """Forward audio and transcript events from OpenAI to browser."""
        if not openai_session:
            return

        async for event in receive_events(openai_session):
            # Debug: log every event type received
            event_type = event.get("type", "unknown")
            logger.debug(f"OpenAI event: {event_type}")

            parsed = parse_openai_event(event)
            if parsed is None:
                continue

            msg_type = parsed["type"]
            msg_data = parsed["data"]

            # Store transcript in repository (only complete messages)
            if msg_type == "transcript_complete":
                speaker = msg_data.get("speaker", "ai")
                text = msg_data.get("text", "")
                if text:
                    call_repository.add_transcript(call_id, speaker, text)
                # Don't send AI transcript_complete to browser — deltas already built the message
                if speaker == "ai":
                    continue

            # Skip internal-only events
            if msg_type == "response_done":
                # Send to browser so it can finalize the streaming message
                try:
                    await websocket.send_json({
                        "type": "response_done",
                        "data": {},
                        "timestamp": _now_iso(),
                        "sequence": next_seq(),
                    })
                except Exception:
                    return
                continue

            # Send to browser
            try:
                await websocket.send_json({
                    "type": msg_type,
                    "data": msg_data,
                    "timestamp": _now_iso(),
                    "sequence": next_seq(),
                })
            except Exception:
                # Browser already disconnected
                return

    # Run both directions concurrently
    try:
        await asyncio.gather(
            browser_to_openai(),
            openai_to_browser(),
            return_exceptions=False,
        )
    except Exception as e:
        logger.error(f"Relay error for call={call_id}: {e}")
    finally:
        # Clean up
        if openai_session:
            await close_session(openai_session)
        call_repository.update_status(call_id, "complete")
        logger.info(f"Call session ended: call={call_id}")
