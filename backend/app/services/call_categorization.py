"""Call categorization service — classifies completed calls using LLM."""

import json
import logging
from typing import Literal

from app.services.llm_client import generate_text

logger = logging.getLogger(__name__)

Category = Literal["payment", "dispute", "hardship", "settlement", "callback", "general", "unknown"]

CATEGORIZATION_PROMPT = """You are a call categorization system. Given a transcript of a collections call, classify it into exactly ONE category and provide a brief 2-sentence summary.

Categories:
- payment: Caller wants to know their balance or make a payment
- dispute: Caller disputes the debt or charges
- hardship: Caller reports financial difficulty (job loss, medical, etc.)
- settlement: Caller wants to negotiate a reduced payoff amount
- callback: Caller wants an agent to call them back
- general: General inquiry that doesn't fit other categories
- unknown: Cannot determine from the transcript

Respond in this exact JSON format:
{"category": "one_of_the_above", "summary": "Brief 2-sentence summary of the call."}

Transcript:
{transcript}"""


async def categorize_call(transcript_text: str) -> dict:
    """Categorize a call based on its transcript.

    Returns:
        {"category": "...", "summary": "..."}
    """
    if not transcript_text or len(transcript_text.strip()) < 10:
        return {"category": "unknown", "summary": "Call had insufficient content for categorization."}

    prompt = CATEGORIZATION_PROMPT.format(transcript=transcript_text)

    try:
        response = await generate_text(
            system_prompt="You are a precise JSON-only call classifier. Output valid JSON only.",
            user_prompt=prompt,
            max_tokens=200,
            temperature=0.0,
        )

        # Parse JSON response
        result = json.loads(response.strip())
        category = result.get("category", "unknown")
        summary = result.get("summary", "")

        # Validate category
        valid_categories = ["payment", "dispute", "hardship", "settlement", "callback", "general", "unknown"]
        if category not in valid_categories:
            category = "unknown"

        return {"category": category, "summary": summary}

    except json.JSONDecodeError:
        logger.warning(f"Failed to parse categorization response as JSON: {response[:100]}")
        return {"category": "unknown", "summary": "Categorization failed — could not parse AI response."}
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        return {"category": "unknown", "summary": f"Categorization failed: {str(e)}"}


def format_transcript_for_categorization(messages: list[dict]) -> str:
    """Format transcript messages into a readable string for the LLM."""
    lines = []
    for msg in messages:
        speaker = "AI" if msg.get("speaker") == "ai" else "Caller"
        text = msg.get("text", "")
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)
