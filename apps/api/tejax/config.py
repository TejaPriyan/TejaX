"""Configuration via environment variables / .env file."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TejaX"
    app_tagline: str = "Autonomous Intelligence Lab"
    environment: str = "development"

    # --- Data stores -----------------------------------------------------
    # Defaults to SQLite for zero-setup local development.
    # For production set e.g. postgresql+psycopg2://user:pass@localhost:5432/tejax
    database_url: str = "sqlite:///./data/tejax.db"
    redis_url: str = "redis://localhost:6379/0"
    data_dir: str = "./data"

    # --- Model provider --------------------------------------------------
    # auto | demo | groq | gemini | openrouter | nvidia | bytez | openai_compat | ollama
    # "auto" tries each provider in priority order until one succeeds.
    model_provider: str = "auto"
    model_name: str = ""

    # Provider-specific keys and URLs
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct"

    nvidia_api_key: str = ""
    nvidia_model: str = "nvidia/llama-3.1-nemotron-70b-instruct"

    bytez_api_key: str = ""
    bytez_model: str = "Qwen/Qwen3-4B"

    # Legacy: generic OpenAI-compatible endpoint
    api_key: str = ""
    base_url: str = ""
    # Local Ollama
    ollama_url: str = "http://localhost:11434"

    # --- Orchestration ---------------------------------------------------
    max_agent_iterations: int = 5
    demo_pacing_seconds: float = 1.6   # pacing for the watchable demo pipeline

    # --- Experiment sandbox ---------------------------------------------
    sandbox_backend: str = "local"     # local | docker
    experiment_timeout: int = 30       # wall-clock seconds
    experiment_memory_mb: int = 256
    experiment_cpu_seconds: int = 15

    # --- Feature flags ---------------------------------------------------
    enable_web_research: bool = False  # external web research is OFF by default
    enable_local_models: bool = True
    enable_demo_mode: bool = True

    # --- HTTP ------------------------------------------------------------
    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
