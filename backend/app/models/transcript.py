"""Transcript data models."""

from typing import Literal

from pydantic import BaseModel


class TranscriptEntry(BaseModel):
    """Single transcript message in a call."""
    id: str
    speaker: Literal["ai", "caller"]
    text: str
    timestamp: str
