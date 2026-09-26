"""Process-wide singletons shared by routes, WebSockets and the pipeline."""

from __future__ import annotations

from ..events import ConnectionManager, EventBus
from ..orchestration.mission_service import MissionService
from ..providers import build_provider
from ..sandbox import build_runner
from ..services.memory import MemoryService

bus = EventBus()
manager = ConnectionManager()
provider = build_provider()
memory = MemoryService(provider)
missions = MissionService(bus)
runner = build_runner()


def swap_provider(new_provider) -> None:
    """Hot-swap the global model provider at runtime."""
    global provider, memory
    provider = new_provider
    memory = MemoryService(provider)
