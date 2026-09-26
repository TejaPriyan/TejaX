"""Memory agent — stores useful discoveries and connects missions."""

from __future__ import annotations

from typing import Any

from ..constants import AgentType, MemoryType
from .base import AgentContext, BaseAgent


class MemoryAgent(BaseAgent):
    agent_type = AgentType.MEMORY
    display_name = "Memory"
    description = "Stores useful discoveries, dedupes, and links related missions."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Consolidating memory", progress=0.4)
        await ctx.activity(None, "memory: consolidating knowledge")

        solution = ctx.state.get("solution") or {}
        metrics = (ctx.state.get("last_experiment") or {}).get("metrics") or {}
        score = metrics.get("score")

        stored: list[str] = []
        if solution:
            mem = await ctx.memory.store(
                ctx.db,
                type_=MemoryType.SOLUTION,
                content=f"{ctx.mission.title} — {solution.get('name')}: "
                        f"{solution.get('hypothesis', '')} (score {score})",
                source="scientist",
                mission_id=ctx.mission.id,
                importance=0.8,
            )
            stored.append(mem.id)
        await ctx.emit("MEMORY_CREATED", None, {"type": MemoryType.SOLUTION})

        await ctx.pacing(0.5)
        await ctx.set_agent(self.agent_type, status="ONLINE", task="Memory updated", progress=1.0)
        return {"stored": stored}
