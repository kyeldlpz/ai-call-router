"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings — loaded from .env file."""

    openai_api_key: str = ""
    openai_realtime_url: str = "wss://api.openai.com/v1/realtime"
    openai_realtime_model: str = "gpt-4o-realtime-preview"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
