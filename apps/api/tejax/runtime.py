"""Runtime configuration — user-changeable settings that persist across
restarts without editing environment variables.

Stored as JSON in the data directory (never secrets in the repo). This is what
powers the Settings → Model panel and the human-approval checkpoint toggle.
"""

from __future__ import annotations

import json
import os
import threading
from dataclasses import asdict, dataclass, fields

from .config import get_settings


@dataclass
class RuntimeConfig:
    provider: str = ""          # demo | ollama | openai_compat  ("" = use env/settings)
    model: str = ""             # e.g. llama3.1, gpt-4o-mini
    base_url: str = ""          # OpenAI-compatible base URL / Ollama URL
    api_key: str = ""           # optional — only for OpenAI-compatible endpoints
    human_approval: bool = False

    def effective_provider(self) -> str:
        return (self.provider or get_settings().model_provider).strip().lower()


class RuntimeState:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.config = RuntimeConfig()
        self._path = os.path.join(os.path.abspath(get_settings().data_dir), "runtime.json")
        self._load()

    def _load(self) -> None:
        try:
            if os.path.exists(self._path):
                with open(self._path, encoding="utf-8") as f:
                    data = json.load(f)
                valid = {f.name for f in fields(RuntimeConfig)}
                for k, v in data.items():
                    if k in valid:
                        setattr(self.config, k, v)
        except Exception:
            pass

    def save(self) -> None:
        try:
            os.makedirs(os.path.dirname(self._path), exist_ok=True)
            with open(self._path, "w", encoding="utf-8") as f:
                json.dump(asdict(self.config), f, indent=2)
        except Exception:
            pass

    def update(self, **kwargs) -> RuntimeConfig:
        with self._lock:
            for k, v in kwargs.items():
                if v is not None and hasattr(self.config, k):
                    setattr(self.config, k, v)
            self.save()
            return self.config

    def snapshot(self) -> dict:
        with self._lock:
            return asdict(self.config)


_runtime: RuntimeState | None = None


def get_runtime() -> RuntimeState:
    global _runtime
    if _runtime is None:
        _runtime = RuntimeState()
    return _runtime
