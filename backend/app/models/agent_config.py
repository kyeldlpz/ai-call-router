"""Agent prompt configuration models."""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

AgentPresetId = Literal["collections_default", "custom"]

MAX_PERSONA = 2500
MAX_SCOPE = 2000
MAX_DEFER = 1500
MAX_CONVERSATION_RULES = 2000
MAX_CUSTOM_PROMPT = 8000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class AgentConfig(BaseModel):
    """User-editable agent prompt sections."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        ser_json_by_alias=True,
    )

    preset_id: AgentPresetId = "collections_default"
    persona: str = Field(..., max_length=MAX_PERSONA)
    scope: str = Field(..., max_length=MAX_SCOPE)
    defer_to_human: str = Field(..., max_length=MAX_DEFER)
    conversation_rules: str = Field(..., max_length=MAX_CONVERSATION_RULES)
    custom_system_prompt: str | None = Field(default=None, max_length=MAX_CUSTOM_PROMPT)
    updated_at: str = Field(default_factory=_now_iso)

    @field_validator("custom_system_prompt", mode="before")
    @classmethod
    def empty_custom_to_none(cls, v: str | None) -> str | None:
        if v is not None and not str(v).strip():
            return None
        return v


class AgentConfigUpdate(BaseModel):
    """Request body for updating agent config."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        ser_json_by_alias=True,
    )

    preset_id: AgentPresetId | None = None
    persona: str | None = Field(default=None, max_length=MAX_PERSONA)
    scope: str | None = Field(default=None, max_length=MAX_SCOPE)
    defer_to_human: str | None = Field(default=None, max_length=MAX_DEFER)
    conversation_rules: str | None = Field(
        default=None, max_length=MAX_CONVERSATION_RULES
    )
    custom_system_prompt: str | None = Field(
        default=None, max_length=MAX_CUSTOM_PROMPT
    )

    @field_validator("custom_system_prompt", mode="before")
    @classmethod
    def empty_custom_to_none(cls, v: str | None) -> str | None:
        if v is not None and not str(v).strip():
            return None
        return v


class AgentConfigResponse(BaseModel):
    """API response with composed preview."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        ser_json_by_alias=True,
    )

    config: AgentConfig
    composed_preview: str
    is_customized: bool
