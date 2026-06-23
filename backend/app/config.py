"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings — loaded from .env file."""

    # AI Provider: "ollama" or "openrouter"
    ai_provider: str = "openrouter"

    # Ollama (local LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # OpenRouter (multiple keys for rate-limit rotation)
    # Comma-separated list of API keys
    openrouter_api_keys: str = ""
    openrouter_model: str = "openai/gpt-oss-20b:free"
    # Comma-separated fallback models if primary is rate-limited
    openrouter_fallback_models: str = "google/gemma-4-31b-it:free,nvidia/nemotron-nano-9b-v2:free"

    # ElevenLabs (TTS and STT)
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "onwK4e9ZLuTAKqWW03F9"  # "Daniel" - warm conversational male voice (free tier)
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    @property
    def openrouter_keys_list(self) -> list[str]:
        """Parse comma-separated API keys into a list."""
        if not self.openrouter_api_keys:
            return []
        return [k.strip() for k in self.openrouter_api_keys.split(",") if k.strip()]

    @property
    def openrouter_models_list(self) -> list[str]:
        """Primary model + fallback models as an ordered list."""
        models = [self.openrouter_model]
        if self.openrouter_fallback_models:
            models += [m.strip() for m in self.openrouter_fallback_models.split(",") if m.strip()]
        return models

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
