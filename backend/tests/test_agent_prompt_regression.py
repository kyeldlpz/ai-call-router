"""Agent prompt customize/apply/reset regression on a new call."""

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


@pytest.fixture(autouse=True)
def reset_agent_config():
    client.post("/api/v1/agent-config/reset")
    yield
    client.post("/api/v1/agent-config/reset")


@pytest.mark.skipif(not _has_ai_provider(), reason="No OpenRouter API keys configured")
def test_custom_scope_affects_new_call_response():
    """Custom scope on a new call should steer AI away from balance questions."""
    update = client.put(
        "/api/v1/agent-config",
        json={"scope": "Only discuss pizza orders. Refuse all balance or payment questions."},
    )
    assert update.status_code == 200
    assert update.json()["data"]["isCustomized"] is True

    create = client.post("/api/v1/calls", json={})
    call_id = create.json()["data"]["callId"]
    ws_path = create.json()["data"]["websocketUrl"]

    ai_reply = ""
    with client.websocket_connect(ws_path) as ws:
        ws.receive_json()  # call_status
        ws.receive_json()  # greeting

        ws.send_text(
            json.dumps(
                {
                    "type": "text_input",
                    "data": {"text": "What is my account balance?"},
                }
            )
        )
        ws.receive_json()  # caller echo
        reply = ws.receive_json()
        assert reply["type"] == "transcript_complete"
        ai_reply = reply["data"]["text"].lower()
        ws.send_text(json.dumps({"type": "call_end"}))

    assert ai_reply
    # Custom scope should refuse balance specifics or defer to a human agent
    assert any(
        phrase in ai_reply
        for phrase in (
            "pizza",
            "can't",
            "cannot",
            "not able",
            "agent can help",
            "call you back",
        )
    )

    reset = client.post("/api/v1/agent-config/reset")
    assert reset.status_code == 200
    assert reset.json()["data"]["isCustomized"] is False
