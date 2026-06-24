"""Call storage service — persists calls and transcripts to Supabase."""

import logging
from datetime import datetime, timezone
from typing import Literal

from app.services.supabase_client import get_supabase_service

logger = logging.getLogger(__name__)

Category = Literal["payment", "dispute", "hardship", "settlement", "callback", "general", "unknown"]


async def store_call(
    call_id: str,
    status: str,
    category: Category,
    summary: str,
    language: str,
    duration_seconds: int,
    started_at: str,
    ended_at: str | None,
    created_by: str | None = None,
) -> dict | None:
    """Store a completed call in Supabase."""
    supabase = get_supabase_service()
    if not supabase:
        logger.warning("Supabase not configured — call not stored")
        return None

    try:
        data = {
            "call_id": call_id,
            "status": status,
            "category": category,
            "summary": summary,
            "language": language,
            "duration_seconds": duration_seconds,
            "started_at": started_at,
            "ended_at": ended_at,
        }
        if created_by:
            data["created_by"] = created_by

        result = supabase.table("calls").insert(data).execute()
        logger.info(f"Stored call in Supabase: call_id={call_id}, category={category}")
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Failed to store call: {e}")
        return None


async def store_transcript_messages(
    call_db_id: str,
    messages: list[dict],
) -> bool:
    """Store transcript messages for a call in Supabase.

    Args:
        call_db_id: The UUID of the call in the calls table
        messages: List of {speaker, text, timestamp, sequence}
    """
    supabase = get_supabase_service()
    if not supabase:
        return False

    try:
        rows = [
            {
                "call_id": call_db_id,
                "speaker": msg["speaker"],
                "text": msg["text"],
                "timestamp": msg["timestamp"],
                "sequence": idx,
            }
            for idx, msg in enumerate(messages)
        ]

        if rows:
            supabase.table("transcript_messages").insert(rows).execute()
            logger.info(f"Stored {len(rows)} transcript messages for call {call_db_id}")

        return True
    except Exception as e:
        logger.error(f"Failed to store transcript: {e}")
        return False


async def get_calls_by_category(
    category: Category | None = None,
    limit: int = 50,
) -> list[dict]:
    """Fetch calls from Supabase, optionally filtered by category."""
    supabase = get_supabase_service()
    if not supabase:
        return []

    try:
        query = supabase.table("calls").select("*").order("created_at", desc=True).limit(limit)
        if category:
            query = query.eq("category", category)
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch calls: {e}")
        return []


async def get_call_with_transcript(call_id: str) -> dict | None:
    """Fetch a single call with its transcript messages."""
    supabase = get_supabase_service()
    if not supabase:
        return None

    try:
        # Get the call
        call_result = supabase.table("calls").select("*").eq("call_id", call_id).single().execute()
        if not call_result.data:
            return None

        call = call_result.data

        # Get transcript messages
        transcript_result = (
            supabase.table("transcript_messages")
            .select("*")
            .eq("call_id", call["id"])
            .order("sequence")
            .execute()
        )

        call["transcript"] = transcript_result.data or []
        return call
    except Exception as e:
        logger.error(f"Failed to fetch call with transcript: {e}")
        return None
