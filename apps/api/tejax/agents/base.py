"""Agent base classes and the shared execution context.

Agents are pure decision-makers: they receive a structured `AgentContext`,
reason, and return structured outputs. They never touch the host directly —
code they produce is executed only through the sandbox.
"""

from __future__ import annotations

import asyncio
import hashlib
import time
from typing import Any

from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..constants import AgentStatus, AgentType, EventType
from ..database.models import Agent, AgentMessage, Mission, ModelRun
from ..events import EventBus, make_event
from ..providers import ModelProvider, build_provider
from ..services.memory import MemoryService


def agent_uid(mission_id: str, agent_type: str) -> str:
    return hashlib.md5(f"{mission_id}:{agent_type}".encode()).hexdigest()


class AgentContext:
    """Everything an agent is allowed to see and do."""

    def __init__(
        self,
        *,
        mission: Mission,
        db: Session,
        bus: EventBus,
        provider: ModelProvider | None = None,
        memory: MemoryService | None = None,
        settings: Settings | None = None,
        state: dict[str, Any] | None = None,
    ) -> None:
        self.mission = mission
        self.db = db
        self.bus = bus
        self.settings = settings or get_settings()
        self.provider = provider or build_provider()
        self.memory = memory or MemoryService(self.provider)
        self.state = state if state is not None else {}  # shared mutable mission state

    # --- events ----------------------------------------------------------
    async def emit(self, event_type: str, agent_id: str | None, payload: dict[str, Any] | None = None) -> None:
        await self.bus.publish(make_event(event_type, self.mission.id, agent_id, payload))

    async def log(self, agent_id: str | None, message: str) -> None:
        await self.emit(EventType.LOG, agent_id, {"message": message})

    async def message(self, from_agent: str, to_agent: str, content: str, type_: str = "TASK", priority: str = "normal") -> None:
        self.db.add(AgentMessage(
            id=hashlib.md5(f"{self.mission.id}:{from_agent}:{to_agent}:{time.time()}:{content[:40]}".encode()).hexdigest(),
            mission_id=self.mission.id,
            from_agent=from_agent,
            to_agent=to_agent,
            type=type_,
            content=content,
            priority=priority,
        ))

    async def set_agent(self, agent_type: str, *, status: str | None = None, task: str | None = None, progress: float | None = None) -> None:
        agent = self.db.query(Agent).filter_by(mission_id=self.mission.id, type=agent_type).first()
        if agent is None:
            return
        if status is not None:
            agent.status = status
        if task is not None:
            agent.current_task = task
        if progress is not None:
            agent.progress = progress
        self.db.commit()
        await self.emit(EventType.AGENT_STATUS, agent.id, {
            "agentType": agent.type,
            "status": agent.status,
            "currentTask": agent.current_task,
            "progress": agent.progress,
        })

    async def activity(self, agent_id: str | None, action: str) -> None:
        await self.emit(EventType.AGENT_ACTIVITY, agent_id, {"action": action})

    # --- model access ----------------------------------------------------
    async def call_model(self, agent_type: str, system: str, prompt: str) -> str:
        t0 = time.time()
        try:
            result = await self.provider.generate(system, prompt)
            self.db.add(ModelRun(
                provider=result.provider,
                model=result.model,
                agent_type=agent_type,
                latency_ms=result.latency_ms,
                tokens_in=result.tokens_in,
                tokens_out=result.tokens_out,
                ok=True,
            ))
            self.db.commit()
            return result.text
        except Exception as exc:  # model unavailable / timeout — never crash the mission
            self.db.add(ModelRun(
                provider=self.provider.name,
                model="",
                agent_type=agent_type,
                latency_ms=int((time.time() - t0) * 1000),
                ok=False,
                error=str(exc)[:400],
            ))
            self.db.commit()
            raise RuntimeError(f"Model provider failed for {agent_type}; check provider settings and retry.") from exc

    async def pacing(self, scale: float = 1.0) -> None:
        """Short pause so live activity is watchable; 0 when a real model runs."""
        if self.provider.name == "demo":
            await asyncio.sleep(self.settings.demo_pacing_seconds * scale)


class BaseAgent:
    agent_type: str = ""
    display_name: str = ""
    description: str = ""

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        raise NotImplementedError

    @property
    def id(self) -> str:
        return AgentType.LABELS.get(self.agent_type, self.agent_type)


def agent_system_prompt(agent: BaseAgent) -> str:
    return (
        "You are the %s agent inside TejaX, an autonomous multi-agent "
        "research and intelligence platform. Work in a structured, evidence-based way. "
        "Never fabricate sources, results, or data. If evidence is insufficient, say "
        "\"Insufficient evidence.\" Respond with valid JSON only." % agent.display_name
    )
