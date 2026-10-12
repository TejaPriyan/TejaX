"""Model abstraction layer — multi-provider with automatic fallback.

The lab never talks to a model directly — it talks to a ModelProvider.
Implementations shipped out of the box:

* DemoProvider        — deterministic simulation; no model, no API key.
* GroqProvider        — Groq Cloud (free tier, fast inference).
* GeminiProvider      — Google Gemini via OpenAI-compatible endpoint.
* OpenRouterProvider  — OpenRouter (routes to many models).
* NvidiaProvider      — NVIDIA NIM API.
* BytezProvider       — Bytez API.
* OpenAICompatProvider — any OpenAI-compatible endpoint.
* OllamaProvider      — local Ollama models.
* FallbackProvider    — tries providers in order until one succeeds.

If a provider is unreachable the orchestrator falls back to the demo
provider so the system never hard-crashes on a missing model.
"""

from __future__ import annotations

import json
import logging
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from ..config import get_settings
try:
    from ..runtime import get_runtime
except ImportError:
    get_runtime = lambda: None

logger = logging.getLogger(__name__)


@dataclass
class ModelResult:
    text: str
    provider: str
    model: str = ""
    latency_ms: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    extra: dict[str, Any] = field(default_factory=dict)


class ModelProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        """Produce a completion (non-streaming convenience)."""

    async def stream(self, system: str, prompt: str, **kwargs: Any) -> AsyncIterator[str]:
        """Streamed completion — default implementation yields the full text."""
        result = await self.generate(system, prompt, **kwargs)
        yield result.text

    async def embed(self, text: str) -> list[float] | None:
        """Return an embedding vector, or None if unsupported."""
        return None

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "ok": True if self.name == "demo" else None,
                "note": "Use Test connection to verify a configured model."}


# --- Shared HTTP helper ---------------------------------------------------
async def _openai_chat(
    url: str,
    model: str,
    system: str,
    prompt: str,
    api_key: str = "",
    headers: dict[str, str] | None = None,
    timeout: int = 12,
    temperature: float = 0.4,
) -> tuple[str, dict[str, Any]]:
    """Make an OpenAI-compatible chat/completions POST and return (text, usage)."""
    import httpx

    hdrs = {"Content-Type": "application/json"}
    if api_key:
        hdrs["Authorization"] = f"Bearer {api_key}"
    if headers:
        hdrs.update(headers)

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=body, headers=hdrs)
        resp.raise_for_status()
        data = resp.json()

    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return text, usage


# --- Demo provider -------------------------------------------------------
class DemoProvider(ModelProvider):
    """Deterministic simulation used for Demo Mode and offline fallback."""

    name = "demo"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text = _demo_reply(prompt)
        return ModelResult(
            text=text,
            provider=self.name,
            model="tejax-core-engine",
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=_approx_tokens(prompt),
            tokens_out=_approx_tokens(text),
        )


# --- Groq provider -------------------------------------------------------
class GroqProvider(ModelProvider):
    name = "groq"

    def __init__(self, api_key: str = "", model: str = "") -> None:
        s = get_settings()
        self.api_key = api_key or s.groq_api_key
        self.model = model or s.groq_model or "llama-3.3-70b-versatile"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text, usage = await _openai_chat(
            url="https://api.groq.com/openai/v1/chat/completions",
            model=self.model, system=system, prompt=prompt,
            api_key=self.api_key, temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- Gemini provider (via OpenAI-compat endpoint) -------------------------
class GeminiProvider(ModelProvider):
    name = "gemini"

    def __init__(self, api_key: str = "", model: str = "") -> None:
        s = get_settings()
        self.api_key = api_key or s.gemini_api_key
        self.model = model or s.gemini_model or "gemini-2.0-flash"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        url = f"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        text, usage = await _openai_chat(
            url=url, model=self.model, system=system, prompt=prompt,
            api_key=self.api_key, temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- OpenRouter provider --------------------------------------------------
class OpenRouterProvider(ModelProvider):
    name = "openrouter"

    def __init__(self, api_key: str = "", model: str = "") -> None:
        s = get_settings()
        self.api_key = api_key or s.openrouter_api_key
        self.model = model or s.openrouter_model or "meta-llama/llama-3.3-70b-instruct"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text, usage = await _openai_chat(
            url="https://openrouter.ai/api/v1/chat/completions",
            model=self.model, system=system, prompt=prompt,
            api_key=self.api_key,
            headers={"HTTP-Referer": "https://tejax.local", "X-Title": "TejaX"},
            temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- NVIDIA NIM provider --------------------------------------------------
class NvidiaProvider(ModelProvider):
    name = "nvidia"

    def __init__(self, api_key: str = "", model: str = "") -> None:
        s = get_settings()
        self.api_key = api_key or s.nvidia_api_key
        self.model = model or s.nvidia_model or "nvidia/llama-3.1-nemotron-70b-instruct"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text, usage = await _openai_chat(
            url="https://integrate.api.nvidia.com/v1/chat/completions",
            model=self.model, system=system, prompt=prompt,
            api_key=self.api_key, temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- Bytez provider -------------------------------------------------------
class BytezProvider(ModelProvider):
    name = "bytez"

    def __init__(self, api_key: str = "", model: str = "") -> None:
        s = get_settings()
        self.api_key = api_key or s.bytez_api_key
        self.model = model or s.bytez_model or "Qwen/Qwen3-4B"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text, usage = await _openai_chat(
            url="https://api.bytez.com/models/v2/openai/v1/chat/completions",
            model=self.model, system=system, prompt=prompt,
            api_key=self.api_key, temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- OpenAI-compatible provider ------------------------------------------
class OpenAICompatProvider(ModelProvider):
    name = "openai_compat"

    def __init__(self, base_url: str = "", api_key: str = "", model: str = "") -> None:
        self.base_url = (base_url or get_settings().base_url).rstrip("/")
        self.api_key = api_key or get_settings().api_key
        self.model = model or get_settings().model_name or "gpt-4o-mini"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        t0 = time.time()
        text, usage = await _openai_chat(
            url=f"{self.base_url}/chat/completions",
            model=self.model, system=system, prompt=prompt,
            api_key=self.api_key, temperature=kwargs.get("temperature", 0.4),
        )
        return ModelResult(
            text=text, provider=self.name, model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
        )


# --- Ollama provider -----------------------------------------------------
class OllamaProvider(ModelProvider):
    name = "ollama"

    def __init__(self, base_url: str = "", model: str = "") -> None:
        self.base_url = (base_url or get_settings().ollama_url).rstrip("/")
        self.model = model or get_settings().model_name or "llama3.1"

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        import httpx

        t0 = time.time()
        url = f"{self.base_url}/api/chat"
        body = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": kwargs.get("temperature", 0.4)},
        }
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()
        text = data.get("message", {}).get("content", "")
        return ModelResult(
            text=text,
            provider=self.name,
            model=self.model,
            latency_ms=int((time.time() - t0) * 1000),
            tokens_in=data.get("prompt_eval_count", 0),
            tokens_out=data.get("eval_count", 0),
        )

    async def embed(self, text: str) -> list[float] | None:
        import httpx

        url = f"{self.base_url}/api/embeddings"
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json={"model": self.model, "prompt": text})
            resp.raise_for_status()
            return resp.json().get("embedding")


# --- Fallback provider (tries providers in sequence) ----------------------
class FallbackProvider(ModelProvider):
    """Tries providers in priority order. Falls back to DemoProvider on total failure."""

    name = "auto"

    def __init__(self, providers: list[ModelProvider] | None = None) -> None:
        self._providers = providers or _build_auto_chain()
        self._active: ModelProvider | None = None
        # Current active model info for display
        self.model = ""

    @property
    def active_provider(self) -> ModelProvider | None:
        return self._active

    async def generate(self, system: str, prompt: str, **kwargs: Any) -> ModelResult:
        errors: list[str] = []
        for p in self._providers:
            try:
                result = await p.generate(system, prompt, **kwargs)
                self._active = p
                self.model = result.model
                self.name = f"auto({p.name})"
                return result
            except Exception as exc:
                errors.append(f"{p.name}: {exc}")
                logger.warning("FallbackProvider: %s failed: %s", p.name, exc)
                continue

        raise RuntimeError("All configured model providers failed. Check configuration or explicitly select demo mode.")

    async def embed(self, text: str) -> list[float] | None:
        for p in self._providers:
            try:
                result = await p.embed(text)
                if result is not None:
                    return result
            except Exception:
                continue
        return None

    async def health(self) -> dict[str, Any]:
        results = []
        for p in self._providers:
            try:
                h = await p.health()
                results.append(h)
            except Exception as exc:
                results.append({"provider": p.name, "ok": False, "error": str(exc)[:200]})
        return {"provider": "auto", "ok": any(r.get("ok") for r in results), "providers": results}


def _build_auto_chain() -> list[ModelProvider]:
    """Build the ordered list of providers that have API keys configured."""
    s = get_settings()
    chain: list[ModelProvider] = []

    if s.groq_api_key:
        chain.append(GroqProvider())
    if s.gemini_api_key:
        chain.append(GeminiProvider())
    if s.openrouter_api_key:
        chain.append(OpenRouterProvider())
    if s.nvidia_api_key:
        chain.append(NvidiaProvider())
    if s.bytez_api_key:
        chain.append(BytezProvider())
    if s.base_url and s.api_key:
        chain.append(OpenAICompatProvider())

    # Always have demo as the ultimate fallback inside the chain too
    if not chain:
        chain.append(DemoProvider())
    return chain


# --- Factory -------------------------------------------------------------
def build_provider(name: str | None = None) -> ModelProvider:
    settings = get_settings()
    rt_cfg = get_runtime().config if get_runtime() else None
    rt_provider = getattr(rt_cfg, "provider", "") or ""
    name = (name or rt_provider or settings.model_provider).strip().lower()

    rt_key = getattr(rt_cfg, "api_key", "") or ""
    rt_model = getattr(rt_cfg, "model", "") or ""
    rt_url = getattr(rt_cfg, "base_url", "") or ""

    if name == "groq":
        return GroqProvider(api_key=rt_key, model=rt_model)
    if name == "gemini":
        return GeminiProvider(api_key=rt_key, model=rt_model)
    if name == "openrouter":
        return OpenRouterProvider(api_key=rt_key, model=rt_model)
    if name == "nvidia":
        return NvidiaProvider(api_key=rt_key, model=rt_model)
    if name == "bytez":
        return BytezProvider(api_key=rt_key, model=rt_model)
    if name == "openai_compat":
        return OpenAICompatProvider(base_url=rt_url, api_key=rt_key, model=rt_model)
    if name == "ollama":
        return OllamaProvider(base_url=rt_url, model=rt_model)
    if name == "demo":
        return DemoProvider()
    if name == "auto":
        chain = _build_auto_chain()
        return chain[0] if len(chain) == 1 else FallbackProvider(chain)

    return FallbackProvider()


# --- Demo reply heuristics (deterministic, offline) ----------------------
def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _demo_reply(prompt: str) -> str:
    """Very small deterministic shim: agents never rely on it for facts."""
    if '"task"' in prompt.lower() or "create a plan" in prompt.lower():
        return json.dumps({"understanding": "Deterministic offline plan.", "marker": "demo"})
    return json.dumps({"note": "offline demo provider", "marker": "demo"})


def extract_json(text: str) -> dict[str, Any] | None:
    """Best-effort JSON extraction from a model reply."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return None
