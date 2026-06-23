"""Temporary script to verify OpenRouter connectivity."""
import asyncio

from app.config import get_settings
from app.services.voice_intake import (
    AIServiceError,
    create_conversation_session,
    generate_response,
)


async def main() -> None:
    settings = get_settings()
    print(f"provider={settings.ai_provider} model={settings.openrouter_model}")
    session = await create_conversation_session()
    try:
        response = await generate_response(session, "Say hello in one short sentence.")
        print("AI response:", response[:200])
    except AIServiceError as exc:
        print("FAILED:", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    asyncio.run(main())
