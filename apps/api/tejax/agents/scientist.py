"""Scientist agent — forms hypotheses, runs experiments safely, analyzes results."""

from __future__ import annotations

import uuid
from typing import Any

from ..constants import AgentType, EvidenceType, ExperimentStatus
from ..database.models import Experiment
from ..events import make_event
from ..sandbox import build_runner
from .base import AgentContext, BaseAgent

import datetime as _dt


class Scientist(BaseAgent):
    agent_type = AgentType.SCIENTIST
    display_name = "Scientist"
    description = "Designs hypotheses, runs sandboxed experiments and compares alternatives."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Designing experiment", progress=0.1)
        await ctx.activity(None, "scientist: forming hypothesis")

        solution = ctx.state.get("solution") or {}
        code = solution.get("code", "")
        hypothesis = solution.get("hypothesis", "Baseline hypothesis")
        iteration = int((task or {}).get("iteration", 1))
        name = (solution.get("name") or "experiment") + f" (iteration {iteration})"

        await ctx.pacing()
        result = await self._run_experiment(ctx, name=name, iteration=iteration, hypothesis=hypothesis, code=code)

        await ctx.set_agent(self.agent_type, status="ONLINE", task="Experiment complete", progress=1.0)
        return result

    async def _run_experiment(
        self,
        ctx: AgentContext,
        *,
        name: str,
        iteration: int,
        hypothesis: str,
        code: str,
    ) -> dict[str, Any]:
        # Determine evidence type based on real dataset vs provider mode
        is_demo = ctx.provider.name == "demo" or "demo" in getattr(ctx.provider, "name", "")
        has_dataset = bool(getattr(ctx.mission, "dataset_filename", None))
        if has_dataset:
            evidence = EvidenceType.REAL
        elif is_demo:
            evidence = EvidenceType.DEMO
        else:
            evidence = EvidenceType.SYNTHETIC

        # Find parent experiment for iteration linkage
        parent_id = None
        prev_experiments = ctx.state.get("experiments_ids", [])
        if prev_experiments:
            parent_id = prev_experiments[-1]

        experiment = Experiment(
            id=uuid.uuid4().hex,
            mission_id=ctx.mission.id,
            name=name,
            iteration=iteration,
            hypothesis=hypothesis,
            status=ExperimentStatus.RUNNING,
            code=code,
            # Phase 1 & 2: provenance fields
            evidence_type=evidence,
            parent_experiment_id=parent_id,
            model_provider=ctx.provider.name,
            model_name=getattr(ctx.provider, "model", "") or "",
        )
        ctx.db.add(experiment)
        ctx.db.commit()

        # Track experiment IDs for parent linkage
        ctx.state.setdefault("experiments_ids", []).append(experiment.id)

        await ctx.emit("EXPERIMENT_STARTED", None, {
            "experimentId": experiment.id, "name": name, "iteration": iteration,
        })
        await ctx.set_agent(self.agent_type, status="ACTIVE", task=f"Running: {name}", progress=0.5)
        await ctx.activity(None, "scientist: running sandboxed experiment")

        # Mount real dataset into sandbox workdir if available
        files: dict[str, str | bytes] = {}
        if has_dataset:
            ds_name = ctx.mission.dataset_filename
            content = ctx.state.get("dataset_content")
            if not content:
                import os
                from ..config import get_settings
                ds_path = os.path.join(os.path.abspath(get_settings().data_dir), "datasets", ds_name)
                if os.path.exists(ds_path):
                    try:
                        with open(ds_path, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()
                    except Exception:
                        content = ""
            if content:
                files[ds_name] = content

        runner = build_runner()
        run = await runner.run(code, files=files if files else None)

        experiment.status = (
            ExperimentStatus.PASSED if run.ok else
            (ExperimentStatus.TIMED_OUT if run.error and "timed out" in run.error.lower() else ExperimentStatus.FAILED)
        )
        experiment.stdout = run.stdout
        experiment.stderr = run.stderr
        experiment.exit_code = run.exit_code
        experiment.execution_time = round(run.execution_time, 3)
        experiment.metrics = run.metrics
        experiment.error = run.error
        experiment.completed_at = _dt.datetime.now(_dt.timezone.utc)

        # Phase 1 & 2: sandbox security and dataset metadata
        experiment.sandbox_type = run.sandbox_type
        provenance_data = {
            "sandbox_type": run.sandbox_type,
            "network_isolated": run.network_isolated,
            "security_warning": run.security_warning,
            "evidence_type": evidence,
            "model_provider": ctx.provider.name,
            "model_name": getattr(ctx.provider, "model", "") or "",
            "iteration": iteration,
            "parent_experiment_id": parent_id,
            "execution_time_s": round(run.execution_time, 3),
            "exit_code": run.exit_code,
            "reproducibility_command": f"python -I experiment.py" if not has_dataset else f"python -I experiment.py # (requires {ctx.mission.dataset_filename})",
        }
        if has_dataset:
            provenance_data["dataset"] = {
                "filename": ctx.mission.dataset_filename,
                "metadata": getattr(ctx.mission, "dataset_metadata", None),
            }
        experiment.provenance = provenance_data
        ctx.db.commit()

        payload = {
            "experimentId": experiment.id,
            "name": name,
            "iteration": iteration,
            "status": experiment.status,
            "metrics": run.metrics,
            "executionTime": experiment.execution_time,
            "error": run.error,
            "evidenceType": evidence,
            "sandboxType": run.sandbox_type,
        }
        await ctx.emit("EXPERIMENT_COMPLETED", None, payload)
        return {
            "experiment_id": experiment.id,
            "status": experiment.status,
            "metrics": run.metrics,
            "stdout": run.stdout,
            "stderr": run.stderr,
            "execution_time": run.execution_time,
            "error": run.error,
            "evidence_type": evidence,
            "sandbox_type": run.sandbox_type,
        }
