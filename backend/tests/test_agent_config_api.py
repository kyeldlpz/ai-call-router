"""Tests for agent config API."""

from fastapi.testclient import TestClient

from app.main import app
from app.prompts.compose import compose_system_prompt
from app.repositories.agent_config_repository import agent_config_repository

client = TestClient(app)


def setup_function() -> None:
    client.post("/api/v1/agent-config/reset")


def test_get_default_config():
    response = client.get("/api/v1/agent-config")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["isCustomized"] is False
    assert data["config"]["presetId"] == "collections_default"


def test_update_marks_customized_and_composes():
    response = client.put(
        "/api/v1/agent-config",
        json={"scope": "Only pizza orders."},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["isCustomized"] is True
    composed = compose_system_prompt(agent_config_repository.get())
    assert "pizza" in composed


def test_reset_restores_default():
    client.put("/api/v1/agent-config", json={"scope": "Custom scope only."})
    response = client.post("/api/v1/agent-config/reset")
    assert response.status_code == 200
    assert response.json()["data"]["isCustomized"] is False
