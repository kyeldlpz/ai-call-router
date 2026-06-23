"""WebSocket transcript integration test — greeting + text_input round-trip."""

import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


def _has_ai_provider() -> bool:
    settings = get_settings()
    if settings.ai_provider == "openrouter":
        return bool(settings.openrouter_keys_list)
    return True


@pytest.mark.skipif(not _has_ai_provider(), reason="No OpenRouter API keys configured")
def test_call_transcript_ws_greeting_and_text_input():
    """POST call → WS connect → greeting → text_input → REST transcript has 3 entries."""
    create = client.post("/api/v1/calls", json={})
    assert create.status_code == 201
    call_id = create.json()["data"]["callId"]
    ws_path = create.json()["data"]["websocketUrl"]

    with client.websocket_connect(ws_path) as ws:
        # call_status → active
        msg = ws.receive_json()
        assert msg["type"] == "call_status"
        assert msg["data"]["status"] == "active"

        # AI greeting
        msg = ws.receive_json()
        assert msg["type"] == "transcript_complete"
        assert msg["data"]["speaker"] == "ai"
        assert msg["data"]["text"].strip()

        # Caller text_input round-trip
        ws.send_text(
            json.dumps(
                {
                    "type": "text_input",
                    "data": {"text": "I want to check my balance."},
                }
            )
        )

        msg = ws.receive_json()
        assert msg["type"] == "transcript_complete"
        assert msg["data"]["speaker"] == "caller"
        assert "balance" in msg["data"]["text"].lower()

        msg = ws.receive_json()
        assert msg["type"] == "transcript_complete"
        assert msg["data"]["speaker"] == "ai"
        assert msg["data"]["text"].strip()

        ws.send_text(json.dumps({"type": "call_end"}))

    # REST transcript matches WS flow
    call_resp = client.get(f"/api/v1/calls/{call_id}")
    assert call_resp.status_code == 200
    transcript = call_resp.json()["data"]["transcript"]
    assert len(transcript) == 3
    assert transcript[0]["speaker"] == "ai"
    assert transcript[1]["speaker"] == "caller"
    assert transcript[2]["speaker"] == "ai"
