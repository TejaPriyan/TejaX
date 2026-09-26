"""Tester agent — validates the Coder's prototype before evaluation.

Runs the generated code through the sandbox as a functional smoke test and
checks the invariants a trustworthy prototype must satisfy: it must exit
cleanly and emit a well-formed metric in [0, 1]. Results feed the Critic so a
prototype that fails validation is never silently accepted.
"""

from __future__ import annotations

from typing import Any

from ..constants import AgentStatus, AgentType, EventType
from ..sandbox import build_runner
from .base import AgentContext, BaseAgent


class Tester(BaseAgent):
    agent_type = AgentType.TESTER
    display_name = "Tester"
    description = "Writes and runs validation checks against the prototype inside the sandbox."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Validating prototype", progress=0.2)
        await ctx.activity(None, "tester: running validation checks")
        await ctx.emit(EventType.TEST_STARTED, None, {})

        solution = ctx.state.get("solution") or {}
        code = solution.get("code", "")
        await ctx.pacing()

        runner = build_runner()
        run = await runner.run(code)

        checks: list[dict[str, Any]] = []
        exit_ok = run.exit_code == 0
        checks.append({
            "name": "process exits cleanly",
            "passed": exit_ok,
            "detail": f"exit code {run.exit_code}" if not exit_ok else "exit code 0",
        })

        score = run.metrics.get("score")
        metric_ok = isinstance(score, (int, float)) and 0.0 <= float(score) <= 1.0
        checks.append({
            "name": "emits valid metric",
            "passed": metric_ok,
            "detail": f"score={score}" if not metric_ok else f"score={score}",
        })

        passed = exit_ok and metric_ok
        failed_names = [c["name"] for c in checks if not c["passed"]]
        summary = (
            "All validation checks passed."
            if passed
            else "Validation failed: " + "; ".join(failed_names)
        )

        result = {
            "passed": passed,
            "checks": checks,
            "summary": summary,
            "score": score,
        }
        ctx.state["test_result"] = result

        await ctx.emit(EventType.TEST_COMPLETED, None, {
            "passed": passed,
            "summary": summary,
            "checks": checks,
        })
        await ctx.set_agent(
            self.agent_type,
            status=AgentStatus.ONLINE if passed else AgentStatus.WARNING,
            task=f"Validation {'passed' if passed else 'failed'}",
            progress=1.0,
        )
        return result
