"""Analyst agent — evaluates results, scores candidates, synthesizes summaries."""

from __future__ import annotations

from typing import Any

from ..constants import AgentStatus, AgentType
from ..providers import extract_json
from ..schemas import Analysis
from .base import AgentContext, BaseAgent, agent_system_prompt


class Analyst(BaseAgent):
    agent_type = AgentType.ANALYST
    display_name = "Analyst"
    description = "Evaluates experiment results, compares metrics and scores solutions."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Analyzing results", progress=0.3)
        await ctx.activity(None, "analyst: evaluating metrics")

        analysis = await self._analyze(ctx)
        await ctx.pacing()
        await ctx.set_agent(self.agent_type, status="ONLINE", task="Analysis complete", progress=1.0)
        return analysis.model_dump()

    async def _analyze(self, ctx: AgentContext) -> Analysis:
        experiment = ctx.state.get("last_experiment") or {}
        metrics = experiment.get("metrics") or {}
        score = metrics.get("score")
        history = ctx.state.get("score_history") or []

        if ctx.provider.name != "demo":
            prompt = (
                f"Experiment metrics: {metrics}\nScore history: {history}\n"
                "Return JSON: {\"score\": 0..1, \"summary\": str, \"trends\": [str], "
                "\"verdict\": \"PASS|FAIL|INSUFFICIENT_EVIDENCE\"}"
            )
            raw = await ctx.call_model(self.agent_type, agent_system_prompt(self), prompt)
            parsed = extract_json(raw)
            if parsed:
                try:
                    return Analysis(**parsed)
                except Exception:
                    pass

        if not isinstance(score, (int, float)):
            return Analysis(
                score=0.0, summary="Insufficient evidence: no measurable score produced.",
                trends=[], verdict="INSUFFICIENT_EVIDENCE",
            )
        verdict = "PASS" if score >= 0.60 else "FAIL"
        trends = []
        if history:
            prev = history[-1]
            delta = round((score - prev) * 100, 1)
            trends.append(f"Score changed {delta:+.1f} pts vs previous iteration")
            if delta > 0:
                trends.append("Improvement trend is positive")
            elif delta < 0:
                trends.append("Performance regressed — investigate")
            else:
                trends.append("Performance flat")
        return Analysis(
            score=round(score, 4),
            summary=f"Prototype scored {score:.4f} on the evaluation metric.",
            trends=trends,
            verdict=verdict,
        )
