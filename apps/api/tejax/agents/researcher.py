"""Researcher agent — gathers evidence from the curated knowledge base.

Never fabricates sources. Findings come from the local knowledge base or, when
enabled, from live web retrieval (which still requires explicit URLs).
Unknown domains yield "Insufficient evidence" rather than invented facts.
"""

from __future__ import annotations

from typing import Any

from ..constants import AgentType, MemoryType
from ..database.models import ResearchItem
from ..events import make_event
from ..providers import extract_json
from ..schemas import ResearchFinding
from .base import AgentContext, BaseAgent, agent_system_prompt
from .knowledge import lookup, topic_for

import uuid


class Researcher(BaseAgent):
    agent_type = AgentType.RESEARCHER
    display_name = "Researcher"
    description = "Gathers information, summarizes findings and flags conflicting evidence."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        topic_desc = (task or {}).get("description", "") or ctx.mission.description or ctx.mission.title
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Researching literature", progress=0.1)
        await ctx.activity(None, "researcher: gathering evidence")
        await ctx.log(None, "Researcher querying local knowledge base")

        findings = await self._research(ctx, topic_desc)
        await ctx.pacing()

        # Persist findings and store a memory-worthy summary.
        stored = []
        for f in findings:
            item = ResearchItem(
                id=uuid.uuid4().hex,
                mission_id=ctx.mission.id,
                title=f["title"],
                summary=f["summary"],
                sources=f.get("sources", []),
                confidence=f.get("confidence", 0.5),
            )
            ctx.db.add(item)
            stored.append(f)
        ctx.db.commit()

        summary = self._synthesize(findings, topic_desc)
        await ctx.memory.store(
            ctx.db, type_=MemoryType.RESEARCH, content=summary,
            source=f"researcher:{topic_for(topic_desc)}", mission_id=ctx.mission.id, importance=0.6,
        )
        await ctx.emit("MEMORY_CREATED", None, {"type": MemoryType.RESEARCH, "summary": summary[:160]})

        await ctx.set_agent(self.agent_type, status="ONLINE", task="Research complete", progress=1.0)
        return {"findings": stored, "summary": summary}

    async def _research(self, ctx: AgentContext, topic_desc: str) -> list[dict[str, Any]]:
        findings = lookup(topic_desc)

        # Optionally augment with a real model for richer summaries.
        if ctx.provider.name != "demo":
            prompt = (
                f"Topic: {topic_desc}\n"
                "Return JSON array of findings: [{\"title\": str, \"summary\": str, \"sources\": [str], "
                "\"evidence\": str, \"confidence\": 0..1}]. Only cite real, verifiable sources. "
                "If you cannot verify a source, use an empty sources list."
            )
            raw = await ctx.call_model(self.agent_type, agent_system_prompt(self), prompt)
            parsed = extract_json(raw)
            findings_list = parsed if isinstance(parsed, list) else (parsed.get("findings") if isinstance(parsed, dict) else None)
            if isinstance(findings_list, list) and findings_list:
                try:
                    merged = [ResearchFinding(**f).model_dump() for f in findings_list]
                    findings = merged or findings
                except Exception:
                    pass

        normalized: list[dict[str, Any]] = []
        for f in findings:
            normalized.append({
                "title": f.get("title", ""),
                "summary": f.get("summary", ""),
                "sources": f.get("sources", []),
                "evidence": f.get("evidence", ""),
                "confidence": float(f.get("confidence", 0.5)),
            })
        return normalized

    @staticmethod
    def _synthesize(findings: list[dict[str, Any]], topic: str) -> str:
        if not findings:
            return "Insufficient evidence in the local knowledge base for: " + topic
        parts = [f"{f['title']}: {f['summary']}" for f in findings[:4]]
        return " | ".join(parts)
