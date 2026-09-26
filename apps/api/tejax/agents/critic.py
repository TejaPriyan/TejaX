"""Critic agent — adversarial but constructive review.

Challenges assumptions, looks for bugs, unsupported conclusions and weak
evidence. Returns a structured Critique (issues + verdict + suggestions).
"""

from __future__ import annotations

from typing import Any

from ..constants import AgentStatus, AgentType
from ..providers import extract_json
from ..schemas import Critique, CritiqueIssue
from .base import AgentContext, BaseAgent, agent_system_prompt


class Critic(BaseAgent):
    agent_type = AgentType.CRITIC
    display_name = "Critic"
    description = "Adversarial reviewer: finds weaknesses, bugs and unsupported claims."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Reviewing solution", progress=0.2)
        await ctx.activity(None, "critic: adversarial review")
        await ctx.log(None, "Critic challenging the current solution")

        critique = await self._critique(ctx)
        await ctx.pacing()

        if critique.verdict == "REJECT":
            await ctx.set_agent(self.agent_type, status=AgentStatus.WARNING, task="Found blocking issues", progress=1.0)
        else:
            await ctx.set_agent(self.agent_type, status="ONLINE", task="Review complete", progress=1.0)
        return critique.model_dump()

    async def _critique(self, ctx: AgentContext) -> Critique:
        solution = ctx.state.get("solution") or {}
        experiment = ctx.state.get("last_experiment") or {}
        metrics = experiment.get("metrics") or {}
        score = metrics.get("score")

        # If a real model is configured, ask it for a critique.
        if ctx.provider.name != "demo":
            prompt = (
                f"Solution: {solution.get('name')} — {solution.get('hypothesis')}\n"
                f"Experiment metrics: {metrics}\n"
                "Return JSON: {\"verdict\": \"ACCEPT|NEEDS_IMPROVEMENT|REJECT\", "
                "\"issues\": [{\"severity\": \"low|medium|high\", \"category\": str, \"detail\": str, "
                "\"suggestion\": str}], \"changes\": [str], \"summary\": str}"
            )
            raw = await ctx.call_model(self.agent_type, agent_system_prompt(self), prompt)
            parsed = extract_json(raw)
            if parsed:
                try:
                    return Critique(**parsed)
                except Exception:
                    pass

        issues = [
            CritiqueIssue(
                severity="medium",
                category="Evaluation",
                detail="Results come from a simulated dataset, not a real held-out benchmark.",
                suggestion="Re-run on a labelled evaluation set before trusting the score.",
            ),
            CritiqueIssue(
                severity="low",
                category="Robustness",
                detail="Edge cases (occlusion, poor lighting, rare classes) are not yet covered.",
                suggestion="Add stress tests and report per-class metrics.",
            ),
        ]
        verdict = "NEEDS_IMPROVEMENT"
        if isinstance(score, (int, float)) and score >= 0.90:
            verdict = "ACCEPT"
        elif isinstance(score, (int, float)) and score < 0.60:
            verdict = "REJECT"
            issues.insert(0, CritiqueIssue(
                severity="high",
                category="Performance",
                detail=f"Score {score} is below the acceptable threshold.",
                suggestion="Reconsider the model architecture and feature set.",
            ))
        return Critique(
            verdict=verdict,
            issues=issues,
            changes=[i.suggestion for i in issues],
            summary="Solution is directionally sound but needs stronger evaluation evidence and robustness checks.",
        )
