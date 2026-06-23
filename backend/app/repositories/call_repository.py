"""In-memory call session repository."""

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from app.models.call import CallSession
from app.models.transcript import TranscriptEntry


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class CallRepository:
    """Stores active and completed call sessions in memory."""

    def __init__(self) -> None:
        self._calls: dict[str, CallSession] = {}

    def create_call(self, scenario: str | None = None) -> CallSession:
        """Create a new call session and store it."""
        call_id = f"call_{uuid4().hex[:12]}"
        session = CallSession(
            call_id=call_id,
            status="idle",
            transcript=[],
            started_at=_now_iso(),
        )
        self._calls[call_id] = session
        return session

    def get_call(self, call_id: str) -> CallSession | None:
        """Get a call session by ID. Returns None if not found."""
        return self._calls.get(call_id)

    def update_status(
        self, call_id: str, status: Literal["idle", "active", "complete"]
    ) -> CallSession | None:
        """Update call status. Sets ended_at on complete."""
        call = self._calls.get(call_id)
        if not call:
            return None
        call.status = status
        if status == "complete":
            call.ended_at = _now_iso()
        return call

    def set_agent_config_snapshot(
        self, call_id: str, snapshot: str
    ) -> CallSession | None:
        """Store which agent config was active when the call started."""
        call = self._calls.get(call_id)
        if not call:
            return None
        call.agent_config_snapshot = snapshot
        return call

    def add_transcript(
        self, call_id: str, speaker: Literal["ai", "caller"], text: str
    ) -> TranscriptEntry | None:
        """Add a transcript entry to a call session."""
        call = self._calls.get(call_id)
        if not call:
            return None
        entry = TranscriptEntry(
            id=f"msg_{uuid4().hex[:8]}",
            speaker=speaker,
            text=text,
            timestamp=_now_iso(),
        )
        call.transcript.append(entry)
        return entry


# Singleton instance used across the application
call_repository = CallRepository()
