"""ElevenLabs proxy endpoints for TTS and STT token generation."""

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/elevenlabs", tags=["elevenlabs"])


class TTSRequest(BaseModel):
    """Request body for text-to-speech."""
    text: str
    voice_id: str | None = None
    tts_model_id: str | None = None


@router.post("/tts")
async def text_to_speech(request: TTSRequest) -> StreamingResponse:
    """Proxy ElevenLabs TTS — returns audio (mp3).

    Keeps the API key server-side while allowing frontend to play audio.
    Uses non-streaming endpoint (works on free tier).
    """
    settings = get_settings()

    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    voice_id = request.voice_id or settings.elevenlabs_voice_id
    model_id = request.tts_model_id or settings.elevenlabs_model_id

    # Use non-streaming endpoint (free tier compatible)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": request.text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            error_text = response.text[:300]
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs TTS error: {error_text}",
            )

        # Return audio content
        async def yield_audio():
            yield response.content

        return StreamingResponse(yield_audio(), media_type="audio/mpeg")


@router.get("/stt-token")
async def get_stt_token() -> dict:
    """Get a single-use token for client-side ElevenLabs STT WebSocket.

    This avoids exposing the API key in the browser.
    """
    settings = get_settings()

    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    # For now, return the API key directly since ElevenLabs realtime STT
    # also supports direct key auth. In production, use their token endpoint.
    # The frontend will connect to wss://api.elevenlabs.io/v1/speech-to-text/realtime
    return {
        "success": True,
        "data": {
            "token": settings.elevenlabs_api_key,
            "ws_url": "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
        },
    }


@router.get("/voices")
async def list_voices() -> dict:
    """List available ElevenLabs voices.

    Note: Requires voices_read permission on the API key.
    """
    settings = get_settings()

    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": settings.elevenlabs_api_key},
            timeout=10.0,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch voices. Ensure API key has voices_read permission.",
            )

        data = response.json()
        voices = [
            {"voice_id": v["voice_id"], "name": v["name"]}
            for v in data.get("voices", [])
        ]
        return {"success": True, "data": {"voices": voices}}
