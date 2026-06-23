"""Call session data models — scaffolding only."""

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.models.transcript import TranscriptEntry


class CallCreate(BaseModel):
    """Request body for creating a new call."""
    scenario: str | None = None


class CallCreatedResponse(BaseModel):
    """Response after creating a call."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    call_id: str
    status: str
    websocket_url: str


class CallResponse(BaseModel):
    """Full call state response."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    call_id: str
    status: str
    started_at: str
    ended_at: str | None = None
    transcript: list[TranscriptEntry] = []
    duration_seconds: int = 0
    agent_config_snapshot: str | None = None


class CallSession(BaseModel):
    """Internal call session state (in-memory store)."""
    call_id: str
    status: Literal["idle", "active", "complete"] = "idle"
    transcript: list[TranscriptEntry] = []
    started_at: str = ""
    ended_at: str | None = None
    agent_config_snapshot: str | None = None
