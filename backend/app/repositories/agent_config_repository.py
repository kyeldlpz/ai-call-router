"""Global agent configuration persistence."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.models.agent_config import AgentConfig, AgentConfigUpdate
from app.prompts.compose import (
    composed_preview,
    default_config,
    is_customized,
)

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_CONFIG_PATH = _DATA_DIR / "agent_config.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class AgentConfigRepository:
    """Stores global agent prompt configuration on disk."""

    def __init__(self, config_path: Path = _CONFIG_PATH) -> None:
        self._path = config_path
        self._config: AgentConfig | None = None

    def _load_from_disk(self) -> AgentConfig | None:
        if not self._path.exists():
            return None
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
            return AgentConfig.model_validate(raw)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Invalid agent config file, using default: {e}")
            return None

    def _save_to_disk(self, config: AgentConfig) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            config.model_dump_json(indent=2, by_alias=True),
            encoding="utf-8",
        )

    def get(self) -> AgentConfig:
        """Return current global config, loading from disk or default."""
        if self._config is not None:
            return self._config
        loaded = self._load_from_disk()
        self._config = loaded if loaded is not None else default_config()
        return self._config

    def save(self, update: AgentConfigUpdate) -> AgentConfig:
        """Merge update into current config and persist."""
        current = self.get()
        data = current.model_dump()
        patch = update.model_dump(exclude_unset=True)
        data.update(patch)
        data["updated_at"] = _now_iso()

        config = AgentConfig.model_validate(data)
        preset_id = "custom" if is_customized(config) else "collections_default"
        config = config.model_copy(update={"preset_id": preset_id})
        self._config = config
        self._save_to_disk(config)
        return config

    def reset(self) -> AgentConfig:
        """Reset to collections_default preset."""
        config = default_config()
        config = config.model_copy(update={"updated_at": _now_iso()})
        self._config = config
        self._save_to_disk(config)
        return config

    def build_response(self) -> dict:
        """Build response payload with preview metadata."""
        config = self.get()
        return {
            "config": config,
            "composed_preview": composed_preview(config),
            "is_customized": is_customized(config),
        }


agent_config_repository = AgentConfigRepository()
