"""Tests for agent prompt composition."""

from app.models.agent_config import AgentConfig
from app.prompts.compose import (
    compose_system_prompt,
    default_config,
    is_customized,
)
from app.prompts.safety_guardrails import SAFETY_GUARDRAILS


def test_default_config_is_not_customized():
    config = default_config()
    assert config.preset_id == "collections_default"
    assert is_customized(config) is False


def test_compose_includes_safety_guardrails():
    prompt = compose_system_prompt(default_config())
    assert SAFETY_GUARDRAILS in prompt
    assert "RecoverAi" in prompt
    assert "Balance and payment inquiries" in prompt


def test_custom_system_prompt_appends_safety():
    config = default_config().model_copy(
        update={
            "custom_system_prompt": "You are a test agent for unit tests only.",
            "preset_id": "custom",
        }
    )
    prompt = compose_system_prompt(config)
    assert prompt.startswith("You are a test agent")
    assert SAFETY_GUARDRAILS in prompt


def test_is_customized_when_scope_changes():
    config = default_config().model_copy(
        update={"scope": "Only handle billing questions."}
    )
    assert is_customized(config) is True


def test_compose_meets_minimum_length():
    prompt = compose_system_prompt(default_config())
    assert len(prompt) >= 50
