"""The mission pipeline — orchestrates agents through the full cycle.

Pipeline: UNDERSTANDING → PLANNING → RESEARCH → DEVELOPMENT → EXPERIMENT →
CRITIQUE → (IMPROVEMENT → EXPERIMENT)* → FINAL RESULT.

Iterations are capped by `mission.max_iterations` — there is no unbounded
loop. Every step is guarded by checkpoint() so pause/cancel take effect.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from ..agents import (
    AGENT_REGISTRY,
    Analyst,
    Coder,
    Critic,
    MemoryAgent,
    Planner,
    Researcher,
    Scientist,
    Tester,
    agent_uid,
)
from ..constants import (
    AgentStatus,
    EventType,
    ExperimentStatus,
    MemoryType,
    MissionStatus,
    TaskStatus,
)
from ..database.models import AgentTask, Experiment, ExperimentResult, Mission, MissionObjective
from ..db import SessionLocal
from ..events import EventBus, make_event
from ..schemas import MissionReport
from ..services.memory import MemoryService

from .mission_service import MissionService, _controls, _running


class _Stop(Exception):
    pass


async def run_mission(mission_id: str, bus: EventBus | None = None) -> None:
    """Full autonomous run. Emits everything the UI/3D world consumes."""
    from ..providers import build_provider

    bus = bus or EventBus()
    db = SessionLocal()
    try:
        mission = db.get(Mission, mission_id)
        if mission is None:
            return
        provider = build_provider()
        memory = MemoryService(provider)
        ctrl = _controls.get(mission_id, {"cancel": asyncio.Event(), "pause": asyncio.Event()})

        # Clean slate for a re-run of a previously completed mission.
        for model in (MissionObjective, AgentTask):
            for row in db.query(model).filter(model.mission_id == mission_id).all():
                db.delete(row)
        exp_ids = [e.id for e in db.query(Experiment).filter(Experiment.mission_id == mission_id).all()]
        for eid in exp_ids:
            for r in db.query(ExperimentResult).filter(ExperimentResult.experiment_id == eid).all():
                db.delete(r)
        for e in db.query(Experiment).filter(Experiment.mission_id == mission_id).all():
            db.delete(e)
        db.commit()

        state_dict: dict[str, Any] = {"score_history": []}
        if mission.dataset_filename:
            from ..config import get_settings
            import os
            ds_path = os.path.join(os.path.abspath(get_settings().data_dir), "datasets", mission.dataset_filename)
            if os.path.exists(ds_path):
                try:
                    with open(ds_path, "r", encoding="utf-8", errors="replace") as f:
                        state_dict["dataset_content"] = f.read()
                except Exception:
                    pass

        ctx = {
            "mission": mission,
            "db": db,
            "bus": bus,
            "provider": provider,
            "memory": memory,
            "state": state_dict,
        }

        mission.status = MissionStatus.PLANNING
        mission.started_at = datetime.now(timezone.utc)
        mission.current_phase = "UNDERSTANDING"
        db.commit()

        await bus.publish(make_event(EventType.MISSION_STARTED, mission_id))
        await _checkpoint(ctrl)

        # ---- PHASE 1: UNDERSTANDING + PLANNING ---------------------
        planner: Planner = AGENT_REGISTRY["planner"]()
        plan = await planner.run(_make_ctx(ctx))
        await _checkpoint(ctrl)

        mission.current_phase = "PLANNING"
        db.commit()
        await bus.publish(make_event(EventType.PLANNING_STARTED, mission_id))

        objectives = []
        for i, obj in enumerate(plan["objectives"]):
            row = MissionObjective(
                id=uuid.uuid4().hex, mission_id=mission_id, index=i,
                title=obj["title"], description=obj.get("description", ""),
                status=TaskStatus.PENDING,
            )
            db.add(row)
            objectives.append(row)
        db.flush()

        tasks = []
        for i, t in enumerate(plan["tasks"]):
            row = AgentTask(
                id=uuid.uuid4().hex,
                mission_id=mission_id,
                agent_type=t.get("agent_type", "researcher"),
                description=t.get("description", ""),
                status=TaskStatus.PENDING,
                priority=1,
                dependencies=[plan["tasks"][d]["description"][:120] for d in t.get("dependencies", [])],
            )
            db.add(row)
            tasks.append(row)
        db.flush()
        db.commit()
        for t in tasks:
            await bus.publish(make_event(EventType.TASK_CREATED, mission_id, None, {
                "taskId": t.id, "agentType": t.agent_type, "description": t.description,
            }))
        await bus.publish(make_event(EventType.PLANNING_COMPLETED, mission_id, None, {
            "objectiveCount": len(objectives), "taskCount": len(tasks),
        }))
        await _checkpoint(ctrl)

        # ---- PHASE 2: RESEARCH -------------------------------------
        mission.status = MissionStatus.RESEARCHING
        mission.current_phase = "RESEARCH"
        db.commit()
        researcher: Researcher = AGENT_REGISTRY["researcher"]()
        await _mark_task(db, bus, tasks, "researcher", TaskStatus.RUNNING)
        await bus.publish(make_event(EventType.RESEARCH_STARTED, mission_id))
        research = await researcher.run(_make_ctx(ctx))
        await _mark_task(db, bus, tasks, "researcher", TaskStatus.COMPLETED)
        await bus.publish(make_event(EventType.RESEARCH_COMPLETED, mission_id, None, {
            "summary": research.get("summary", "")[:300],
        }))
        ctx["state"]["research"] = research
        await _checkpoint(ctrl)

        # ---- HUMAN APPROVAL GATE (optional) ------------------------
        if _human_approval_enabled():
            mission.status = MissionStatus.AWAITING_APPROVAL
            mission.current_phase = "APPROVAL"
            db.commit()
            await _wait_approval(ctrl, bus, mission_id)
            await _checkpoint(ctrl)

        # ---- PHASE 3: DEVELOPMENT ----------------------------------
        mission.status = MissionStatus.DEVELOPING
        mission.current_phase = "DEVELOPMENT"
        db.commit()
        coder: Coder = AGENT_REGISTRY["coder"]()
        await _mark_task(db, bus, tasks, "coder", TaskStatus.RUNNING)
        await coder.run(_make_ctx(ctx))
        await _mark_task(db, bus, tasks, "coder", TaskStatus.COMPLETED)
        await bus.publish(make_event(EventType.CODE_GENERATED, mission_id, None, {
            "name": ctx["state"].get("solution", {}).get("name"),
        }))
        await _checkpoint(ctrl)

        # ---- TESTING (new) -----------------------------------------
        tester: Tester = AGENT_REGISTRY["tester"]()
        await _mark_task(db, bus, tasks, "tester", TaskStatus.RUNNING)
        await tester.run(_make_ctx(ctx))
        await _mark_task(db, bus, tasks, "tester", TaskStatus.COMPLETED)
        await _checkpoint(ctrl)

        # ---- PHASES 4-6: EXPERIMENT → CRITIQUE → IMPROVEMENT --------
        scientist: Scientist = AGENT_REGISTRY["scientist"]()
        critic: Critic = AGENT_REGISTRY["critic"]()
        analyst: Analyst = AGENT_REGISTRY["analyst"]()

        max_iterations = max(1, min(mission.max_iterations, 10))
        improvements: list[str] = []
        failures: list[str] = []
        critique = {"verdict": "NEEDS_IMPROVEMENT", "issues": [], "summary": "", "changes": []}
        final_analysis: dict[str, Any] = {}

        for iteration in range(1, max_iterations + 1):
            await _checkpoint(ctrl)

            # EXPERIMENT
            mission.status = MissionStatus.EXPERIMENTING
            mission.current_phase = "EXPERIMENT"
            db.commit()
            exp = await scientist.run(_make_ctx(ctx), task={"iteration": iteration})
            ctx["state"]["last_experiment"] = exp
            score = (exp.get("metrics") or {}).get("score")
            if isinstance(score, (int, float)):
                ctx["state"]["score_history"].append(round(score, 4))

            result_row = ExperimentResult(
                id=uuid.uuid4().hex,
                experiment_id=exp["experiment_id"],
                score=score,
                verdict="PASS" if exp["status"] == ExperimentStatus.PASSED else "FAIL",
            )
            db.add(result_row)
            db.commit()
            await _checkpoint(ctrl)

            # ANALYST (evaluation)
            mission.status = MissionStatus.EVALUATING
            mission.current_phase = "CRITIQUE"
            db.commit()
            final_analysis = await analyst.run(_make_ctx(ctx))
            result_row.analysis = final_analysis
            db.commit()
            await _checkpoint(ctrl)

            # CRITIC
            critique = await critic.run(_make_ctx(ctx))
            result_row.critique = critique
            db.commit()
            await bus.publish(make_event(EventType.CRITIQUE_CREATED, mission_id, None, {
                "verdict": critique.get("verdict"),
                "issueCount": len(critique.get("issues", [])),
                "summary": critique.get("summary", ""),
            }))

            if critique.get("verdict") == "ACCEPT":
                break
            if iteration >= max_iterations:
                break

            # IMPROVEMENT
            mission.status = MissionStatus.IMPROVING
            mission.current_phase = "IMPROVEMENT"
            db.commit()
            await coder.revise(_make_ctx(ctx), critique)
            improvements.append(critique.get("summary", ""))
            await bus.publish(make_event(EventType.IMPROVEMENT_CREATED, mission_id, None, {
                "iteration": iteration,
            }))
            await _checkpoint(ctrl)

        # ---- PHASE 7: FINAL RESULT --------------------------------
        mission.status = MissionStatus.EVALUATING
        mission.current_phase = "FINAL_RESULT"
        db.commit()

        memory_agent: MemoryAgent = AGENT_REGISTRY["memory"]()
        await memory_agent.run(_make_ctx(ctx))
        await _checkpoint(ctrl)

        report = _build_report(ctx, plan, research, critique, improvements, final_analysis, failures)
        mission.report = report
        mission.status = MissionStatus.COMPLETED
        mission.completed_at = datetime.now(timezone.utc)
        mission.current_phase = "FINAL_RESULT"
        db.commit()

        await _reset_agents(db, mission_id)
        await bus.publish(make_event(EventType.MISSION_COMPLETED, mission_id, None, {
            "report": report,
        }))

    except _Stop:
        mission = db.get(Mission, mission_id)
        if mission:
            ctrl = _controls.get(mission_id, {})
            if ctrl.get("reject", asyncio.Event()).is_set():
                mission.status = MissionStatus.REJECTED
                mission.error = "Rejected by human operator."
                mission.current_phase = "REJECTED"
            elif ctrl.get("cancel", asyncio.Event()).is_set():
                mission.status = MissionStatus.CANCELLED
            else:
                mission.status = MissionStatus.PAUSED
            db.commit()
            if mission.status == MissionStatus.REJECTED:
                await bus.publish(make_event(EventType.REJECTED, mission_id))
            else:
                event_type = EventType.MISSION_CANCELLED if mission.status == MissionStatus.CANCELLED else EventType.MISSION_PAUSED
                await bus.publish(make_event(event_type, mission_id))
    except Exception as exc:  # never crash the process on a failed mission
        mission = db.get(Mission, mission_id)
        if mission:
            mission.status = MissionStatus.FAILED
            mission.error = str(exc)[:500]
            mission.current_phase = "FAILED"
            db.commit()
        await bus.publish(make_event(EventType.MISSION_FAILED, mission_id, None, {"error": str(exc)[:300]}))
    finally:
        db.close()
        _running.pop(mission_id, None)
        _controls.pop(mission_id, None)


def _make_ctx(ctx: dict[str, Any]):
    from ..agents import AgentContext
    return AgentContext(
        mission=ctx["mission"],
        db=ctx["db"],
        bus=ctx["bus"],
        provider=ctx["provider"],
        memory=ctx["memory"],
        state=ctx["state"],
    )


async def _mark_task(db: Session, bus: EventBus, tasks: list[AgentTask], agent_type: str, status: str) -> None:
    for t in tasks:
        if t.agent_type == agent_type and t.status != TaskStatus.COMPLETED:
            t.status = status
            if status == TaskStatus.RUNNING and not t.started_at:
                t.started_at = datetime.now(timezone.utc)
            if status == TaskStatus.COMPLETED:
                t.completed_at = datetime.now(timezone.utc)
            db.commit()
            event = {
                TaskStatus.RUNNING: EventType.TASK_STARTED,
                TaskStatus.COMPLETED: EventType.TASK_COMPLETED,
                TaskStatus.FAILED: EventType.TASK_FAILED,
            }.get(status, EventType.TASK_STARTED)
            await bus.publish(make_event(event, t.mission_id, None, {
                "taskId": t.id, "agentType": t.agent_type, "description": t.description,
            }))
            return


async def _checkpoint(ctrl: dict[str, asyncio.Event]) -> None:
    if ctrl.get("cancel", asyncio.Event()).is_set():
        raise _Stop()
    if ctrl.get("pause", asyncio.Event()).is_set():
        # Wait until paused is cleared or cancelled.
        while ctrl.get("pause", asyncio.Event()).is_set():
            if ctrl.get("cancel", asyncio.Event()).is_set():
                raise _Stop()
            await asyncio.sleep(0.2)


def _human_approval_enabled() -> bool:
    from ..runtime import get_runtime
    return bool(get_runtime().config.human_approval)


async def _wait_approval(ctrl: dict[str, asyncio.Event], bus: EventBus, mission_id: str) -> None:
    """Block the pipeline until a human approves or rejects (or cancels)."""
    approve = ctrl.get("approve", asyncio.Event())
    reject = ctrl.get("reject", asyncio.Event())
    cancel = ctrl.get("cancel", asyncio.Event())

    await bus.publish(make_event(EventType.APPROVAL_REQUESTED, mission_id, None, {
        "message": "Human approval required before development begins.",
    }))

    while True:
        if approve.is_set():
            await bus.publish(make_event(EventType.APPROVED, mission_id))
            return
        if reject.is_set():
            raise _Stop()
        if cancel.is_set():
            raise _Stop()
        await asyncio.sleep(0.2)


async def _reset_agents(db: Session, mission_id: str) -> None:
    from ..database.models import Agent
    for agent in db.query(Agent).filter_by(mission_id=mission_id).all():
        if agent.status not in (AgentStatus.OFFLINE,):
            agent.status = AgentStatus.ONLINE
            agent.progress = 1.0
    db.commit()


def _build_report(
    ctx: dict[str, Any],
    plan: dict[str, Any],
    research: dict[str, Any],
    critique: dict[str, Any],
    improvements: list[str],
    analysis: dict[str, Any],
    failures: list[str],
) -> dict[str, Any]:
    from ..constants import EvidenceType

    mission = ctx["mission"]
    state = ctx["state"]
    provider = ctx["provider"]
    solution = state.get("solution") or {}
    exp = state.get("last_experiment") or {}
    metrics = exp.get("metrics") or {}
    score = metrics.get("score")
    score_history = state.get("score_history") or []

    is_demo = provider.name == "demo" or "demo" in provider.name
    provider_label = getattr(provider, "model", provider.name) or provider.name

    # --- Evidence classification ---
    has_dataset = bool(getattr(mission, "dataset_filename", None))
    if has_dataset:
        evidence_type = EvidenceType.REAL
    else:
        evidence_type = exp.get("evidence_type", EvidenceType.DEMO if is_demo else EvidenceType.SYNTHETIC)
    sandbox_security = exp.get("sandbox_type", "LOCAL")

    confidence = "Insufficient evidence"
    if isinstance(score, (int, float)):
        if has_dataset:
            if score >= 0.85:
                confidence = f"High — validated against real dataset '{mission.dataset_filename}' ({provider_label})."
            elif score >= 0.65:
                confidence = f"Moderate — evaluated against real dataset '{mission.dataset_filename}' with promising metrics."
            else:
                confidence = f"Low — below acceptance threshold on real dataset '{mission.dataset_filename}'."
        else:
            evidence_qualifier = {
                EvidenceType.DEMO: "deterministic simulation",
                EvidenceType.SYNTHETIC: "synthetic benchmark",
                EvidenceType.REAL: "real-world dataset",
            }.get(evidence_type, "unclassified source")
            if score >= 0.85:
                confidence = f"Moderate — results from {evidence_qualifier} ({provider_label}); validate on real data."
            elif score >= 0.65:
                confidence = f"Low-to-moderate — promising direction from {evidence_qualifier}; unvalidated."
            else:
                confidence = "Low — below the acceptance threshold."

    limitations = [
        f"Model provider: {provider_label} ({'real dataset evaluation' if has_dataset else 'synthetic benchmark' if not is_demo else 'deterministic simulation'}).",
        f"Evidence type: {evidence_type} — {'evaluated on real user dataset: ' + mission.dataset_filename if has_dataset else 'evaluation ran inside sandbox on synthetic data'}.",
        f"Sandbox: {sandbox_security} — {'network not isolated' if sandbox_security == 'LOCAL' else 'network disabled, read-only FS'}.",
    ]
    if is_demo and not has_dataset:
        limitations.append("No live web research was performed (ENABLE_WEB_RESEARCH=false).")
    limitations.append("Single-process deployment; no distributed agents yet.")

    next_steps = []
    if not has_dataset:
        next_steps.append("Validate on a real, labelled dataset with a proper train/test split.")
    else:
        next_steps.append(f"Deploy candidate model against production traffic or secondary out-of-sample data.")
    next_steps.append("Add per-class metrics and edge-case (robustness) stress-tests.")
    if is_demo:
        next_steps.append("Enable a real model provider (Groq, Gemini, OpenRouter, etc.) for generative planning.")
    next_steps.append("Containerize the sandbox with Docker for stronger isolation.")

    # --- Provenance summary ---
    provenance_summary = {
        "model_provider": provider.name,
        "model_name": provider_label,
        "evidence_type": evidence_type,
        "sandbox_type": sandbox_security,
        "network_isolated": sandbox_security == "DOCKER",
        "total_iterations": len(score_history),
        "score_trajectory": score_history,
        "final_score": score if isinstance(score, (int, float)) else None,
    }
    if has_dataset:
        provenance_summary["dataset"] = {
            "filename": mission.dataset_filename,
            "metadata": getattr(mission, "dataset_metadata", None),
        }

    # --- Mission Ledger (chronological evidence chain) ---
    ledger: list[dict[str, Any]] = []
    ledger.append({"step": 1, "phase": "PLANNING", "event": "Mission decomposed into objectives",
                    "detail": f"{len(plan.get('objectives', []))} objectives, {len(plan.get('tasks', []))} tasks"})
    if has_dataset:
        ds_meta_str = f" ({mission.dataset_metadata.get('rows')} rows, {len(mission.dataset_metadata.get('columns', []))} cols)" if isinstance(mission.dataset_metadata, dict) else ""
        ledger.append({"step": 2, "phase": "RESEARCH", "event": "Real Dataset Ingestion",
                        "detail": f"Attached real dataset '{mission.dataset_filename}'{ds_meta_str} into sandbox"})
    else:
        ledger.append({"step": 2, "phase": "RESEARCH", "event": "Evidence gathered",
                        "detail": research.get("summary", "")[:200]})
    for i, sh in enumerate(score_history, 1):
        iteration_detail = f"Score: {sh:.4f}"
        if i > 1 and score_history[i - 2] is not None:
            delta = round((sh - score_history[i - 2]) * 100, 1)
            iteration_detail += f" (delta: {delta:+.1f} pts)"
        ledger.append({"step": 2 + i, "phase": "EXPERIMENT", "event": f"Iteration #{i}",
                        "detail": iteration_detail})
    if critique.get("verdict"):
        ledger.append({"step": len(ledger) + 1, "phase": "CRITIQUE", "event": f"Verdict: {critique['verdict']}",
                        "detail": critique.get("summary", "")[:200]})
    if improvements:
        ledger.append({"step": len(ledger) + 1, "phase": "IMPROVEMENT",
                        "event": f"{len(improvements)} revision(s) applied",
                        "detail": "; ".join(improvements[:3])[:200]})
    ledger.append({"step": len(ledger) + 1, "phase": "MEMORY", "event": "Findings committed to long-term memory",
                    "detail": f"Evidence type: {evidence_type}"})
    ledger.append({"step": len(ledger) + 1, "phase": "FINAL_RESULT", "event": "Report assembled",
                    "detail": f"Confidence: {confidence[:60]}"})

    return MissionReport(
        problem=mission.title,
        approach=plan.get("understanding", ""),
        research=research.get("summary", ""),
        agents_involved=["planner", "researcher", "coder", "tester", "scientist", "critic", "analyst", "memory"],
        experiments=[
            {
                "name": exp.get("name") or solution.get("name"),
                "status": exp.get("status"),
                "metrics": metrics,
                "executionTime": exp.get("execution_time"),
                "evidenceType": evidence_type,
                "sandboxType": sandbox_security,
            }
        ] if exp else [],
        iterations=len(score_history),
        failures=failures,
        improvements=improvements or ([critique.get("summary", "")] if critique.get("summary") else []) if critique.get("verdict") == "ACCEPT" else improvements,
        final_solution=solution.get("code") or (
            f"# {solution.get('name')} — {solution.get('hypothesis', '')}\n"
            f"# Evaluation score: {score if isinstance(score, (int, float)) else 'n/a'}\n"
            f"# Provider: {provider_label}\n"
            f"# Evidence: {evidence_type}\n"
        ),
        confidence=confidence,
        limitations=limitations,
        next_steps=next_steps,
        evidence_type=evidence_type,
        sandbox_security=sandbox_security,
        provenance_summary=provenance_summary,
        ledger=ledger,
    ).model_dump()
