"""Post-call summarizer — extracts category, caller name, and summary using free AI models.

Uses the same OpenRouter/Ollama pipeline as the conversation service.
Runs automatically when a call ends.
"""

import json
import logging
from dataclasses import dataclass

from app.models.transcript import TranscriptEntry
from app.prompts.summarizer_system import SUMMARIZER_SYSTEM_PROMPT
from app.services.voice_intake import _generate, AIServiceError

logger = logging.getLogger(__name__)


@dataclass
class CallSummaryResult:
    """Extracted call metadata."""

    caller_name: str | None
    category: str
    summary: str


VALID_CATEGORIES = {
    "payment_inquiry",
    "dispute",
    "hardship",
    "settlement",
    "callback",
    "general",
    "unknown",
}


def _format_transcript(transcript: list[TranscriptEntry]) -> str:
    """Format transcript entries into a readable string for the AI."""
    lines = []
    for entry in transcript:
        speaker = "AI Agent" if entry.speaker == "ai" else "Caller"
        lines.append(f"{speaker}: {entry.text}")
    return "\n".join(lines)


async def summarize_call(transcript: list[TranscriptEntry]) -> CallSummaryResult:
    """Extract category, caller name, and summary from a call transcript.

    Args:
        transcript: List of transcript entries from the call.

    Returns:
        CallSummaryResult with extracted metadata.

    Falls back to sensible defaults if AI fails.
    """
    if not transcript or len(transcript) < 2:
        return CallSummaryResult(
            caller_name=None,
            category="unknown",
            summary="Call too short to summarize",
        )

    formatted = _format_transcript(transcript)

    messages = [
        {"role": "system", "content": SUMMARIZER_SYSTEM_PROMPT},
        {"role": "user", "content": f"Transcript:\n{formatted}"},
    ]

    try:
        raw_response = await _generate(messages, max_tokens=150)

        # Parse JSON response
        # Strip markdown code fences if present
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)

        caller_name = data.get("caller_name")
        category = data.get("category", "unknown")
        summary = data.get("summary", "No summary available")

        # Validate category
        if category not in VALID_CATEGORIES:
            category = "unknown"

        # Validate caller_name
        if caller_name and not isinstance(caller_name, str):
            caller_name = None

        logger.info(
            f"Call summarized: category={category}, name={caller_name}, summary={summary[:50]}"
        )

        return CallSummaryResult(
            caller_name=caller_name,
            category=category,
            summary=summary,
        )

    except (json.JSONDecodeError, AIServiceError) as e:
        logger.warning(f"Call summarization failed: {e}")
        return CallSummaryResult(
            caller_name=None,
            category="unknown",
            summary="Summarization failed",
        )
    except Exception as e:
        logger.error(f"Unexpected error in call summarization: {e}")
        return CallSummaryResult(
            caller_name=None,
            category="unknown",
            summary="Summarization failed",
        )
