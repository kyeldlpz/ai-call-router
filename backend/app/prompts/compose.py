"""Compose system prompts from agent configuration."""

from app.models.agent_config import AgentConfig
from app.prompts.presets import collections_default
from app.prompts.safety_guardrails import SAFETY_GUARDRAILS

PREVIEW_MAX_CHARS = 500
MIN_COMPOSED_LENGTH = 50


def default_config() -> AgentConfig:
    """Return the collections_default preset as an AgentConfig."""
    return AgentConfig(
        preset_id="collections_default",
        persona=collections_default.PERSONA,
        scope=collections_default.SCOPE,
        defer_to_human=collections_default.DEFER_TO_HUMAN,
        conversation_rules=collections_default.CONVERSATION_RULES,
        custom_system_prompt=None,
    )


def is_customized(config: AgentConfig) -> bool:
    """True if config differs from the default preset sections."""
    default = default_config()
    if config.custom_system_prompt:
        return True
    return (
        config.persona.strip() != default.persona.strip()
        or config.scope.strip() != default.scope.strip()
        or config.defer_to_human.strip() != default.defer_to_human.strip()
        or config.conversation_rules.strip() != default.conversation_rules.strip()
    )


def compose_system_prompt(config: AgentConfig) -> str:
    """Build the final system prompt from config layers."""
    if config.custom_system_prompt and config.custom_system_prompt.strip():
        body = config.custom_system_prompt.strip()
    else:
        body = "\n\n".join(
            part.strip()
            for part in [
                config.persona,
                f"What you can help with:\n{config.scope}",
                f"Hand off to human:\n{config.defer_to_human}",
                config.conversation_rules,
            ]
            if part.strip()
        )

    composed = f"{body}\n\n{SAFETY_GUARDRAILS}"
    if len(composed) < MIN_COMPOSED_LENGTH:
        raise ValueError(
            f"Composed system prompt too short (min {MIN_COMPOSED_LENGTH} characters)"
        )
    return composed


def composed_preview(config: AgentConfig, max_chars: int = PREVIEW_MAX_CHARS) -> str:
    """Return a truncated preview of the composed system prompt."""
    full = compose_system_prompt(config)
    if len(full) <= max_chars:
        return full
    return full[: max_chars - 3].rstrip() + "..."
