"""WebSocket call session handler — text-based conversation relay.

Flow:
  Browser (speech-to-text) → WebSocket (text) → FastAPI → Ollama
  Ollama (text response) → FastAPI → WebSocket (text) → Browser (text-to-speech)
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from app.repositories.agent_config_repository import agent_config_repository
from app.repositories.call_repository import call_repository
from app.services.call_summarizer import summarize_call
from app.services.voice_intake import (
    AIServiceError,
    ConversationSession,
    close_session,
    create_conversation_session,
    generate_greeting,
    generate_response,
)

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def call_session_handler(websocket: WebSocket, call_id: str) -> None:
    """Handle a WebSocket connection for a voice call session.

    Lifecycle:
    1. Accept browser connection
    2. Validate call exists in repository
    3. Create Ollama conversation session
    4. Send greeting to browser (for TTS)
    5. Loop: receive text → generate response → send text
    6. Clean up on disconnect or call_end
    """
    # Validate call exists
    call = call_repository.get_call(call_id)
    if not call:
        await websocket.close(code=4004, reason="Call not found")
        return

    # Prevent duplicate sessions for the same call
    if call.status == "active":
        await websocket.close(code=4009, reason="Call already has an active session")
        return

    await websocket.accept()
    logger.info(f"Browser WebSocket connected: call={call_id}")

    # Track sequence for message ordering
    sequence = 0

    def next_seq() -> int:
        nonlocal sequence
        sequence += 1
        return sequence

    # Create conversation session with Ollama
    session: ConversationSession | None = None
    try:
        session = await create_conversation_session()
    except AIServiceError as e:
        logger.error(f"Failed to create conversation session for call={call_id}: {e}")
        await websocket.send_json({
            "type": "error",
            "data": {"message": str(e)},
            "timestamp": _now_iso(),
            "sequence": next_seq(),
        })
        await websocket.close(code=4500, reason="AI service unavailable")
        return

    # Mark call as active and snapshot agent config
    config = agent_config_repository.get()
    call_repository.set_agent_config_snapshot(call_id, config.updated_at)
    call_repository.update_status(call_id, "active")

    # Notify browser that session is ready
    await websocket.send_json({
        "type": "call_status",
        "data": {"status": "active"},
        "timestamp": _now_iso(),
        "sequence": next_seq(),
    })

    logger.info(f"Call active: call={call_id}")

    # Generate and send AI greeting
    try:
        greeting = await generate_greeting(session)
        # Send as transcript_complete so the browser speaks it
        call_repository.add_transcript(call_id, "ai", greeting)
        await websocket.send_json({
            "type": "transcript_complete",
            "data": {"speaker": "ai", "text": greeting},
            "timestamp": _now_iso(),
            "sequence": next_seq(),
        })
    except Exception as e:
        logger.warning(f"Failed to send greeting: {e}")

    # --- Main conversation loop ---
    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "text_input":
                # Caller's transcribed speech
                user_text = data.get("data", {}).get("text", "").strip()
                if not user_text:
                    continue

                # Store caller transcript
                call_repository.add_transcript(call_id, "caller", user_text)

                # Send caller transcript back (for display confirmation)
                await websocket.send_json({
                    "type": "transcript_complete",
                    "data": {"speaker": "caller", "text": user_text},
                    "timestamp": _now_iso(),
                    "sequence": next_seq(),
                })

                # Generate AI response
                try:
                    ai_response = await generate_response(session, user_text)

                    # Store AI transcript
                    call_repository.add_transcript(call_id, "ai", ai_response)

                    # Send AI response to browser (browser will TTS it)
                    await websocket.send_json({
                        "type": "transcript_complete",
                        "data": {"speaker": "ai", "text": ai_response},
                        "timestamp": _now_iso(),
                        "sequence": next_seq(),
                    })

                except AIServiceError as e:
                    logger.error(f"AI response failed: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "data": {"message": f"AI service error: {e}"},
                        "timestamp": _now_iso(),
                        "sequence": next_seq(),
                    })

            elif msg_type == "call_end":
                logger.info(f"Call end requested by browser: call={call_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"Browser disconnected: call={call_id}")
    except Exception as e:
        logger.error(f"Session error for call={call_id}: {e}")
    finally:
        # Clean up
        if session:
            await close_session(session)
        call_repository.update_status(call_id, "complete")

        # Run post-call summarization (non-blocking, best-effort)
        call = call_repository.get_call(call_id)
        if call and call.transcript:
            try:
                result = await summarize_call(call.transcript)
                call_repository.set_call_summary(
                    call_id,
                    caller_name=result.caller_name,
                    category=result.category,
                    summary=result.summary,
                )
                logger.info(f"Call summarized: call={call_id}, category={result.category}")
            except Exception as e:
                logger.warning(f"Post-call summarization failed for call={call_id}: {e}")

        logger.info(f"Call session ended: call={call_id}")
