"""TejaX System Metrics.

These are system performance and observability metrics describing agent tasks,
experiment benchmarks, and autonomous swarm throughput.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..constants import AgentStatus, ExperimentStatus, MissionStatus
from ..database.models import (
    Agent,
    AgentTask,
    Experiment,
    Memory,
    Mission,
    SystemEvent,
)


def compute_metrics(db: Session) -> dict:
    total_missions = db.scalar(select(func.count(Mission.id))) or 0
    completed_missions = db.scalar(
        select(func.count(Mission.id)).where(Mission.status == MissionStatus.COMPLETED)
    ) or 0

    tasks_total = db.scalar(select(func.count(AgentTask.id))) or 0
    tasks_done = db.scalar(
        select(func.count(AgentTask.id)).where(AgentTask.status == "COMPLETED")
    ) or 0
    tasks_failed = db.scalar(
        select(func.count(AgentTask.id)).where(AgentTask.status.in_(["FAILED", "TIMED_OUT"]))
    ) or 0

    exps_pass = db.scalar(
        select(func.count(Experiment.id)).where(Experiment.status == ExperimentStatus.PASSED)
    ) or 0
    exps_fail = db.scalar(
        select(func.count(Experiment.id)).where(Experiment.status.in_([ExperimentStatus.FAILED, ExperimentStatus.TIMED_OUT]))
    ) or 0
    exps_total = exps_pass + exps_fail

    iterations = db.scalar(select(func.avg(Experiment.iteration))) or 0

    agents_active = db.scalar(
        select(func.count(Agent.id)).where(Agent.status == AgentStatus.ACTIVE)
    ) or 0
    agents_total = db.scalar(select(func.count(Agent.id))) or 0

    memory_retrievals = db.scalar(
        select(func.count(SystemEvent.id)).where(SystemEvent.type == "MEMORY_RETRIEVED")
    ) or 0

    error_recovery_rate = 0.0
    if (tasks_failed + tasks_done) > 0:
        # recovered = tasks that failed at least once but eventually completed
        recovered = db.scalar(select(func.count(AgentTask.id)).where(AgentTask.status == "COMPLETED", AgentTask.attempts > 1)) or 0
        error_recovery_rate = round(100 * recovered / (tasks_failed + tasks_done), 1)

    return {
        "tasksCompleted": tasks_done,
        "tasksFailed": tasks_failed,
        "successfulExperiments": exps_pass,
        "failedExperiments": exps_fail,
        "experimentSuccessRate": round(100 * exps_pass / exps_total, 1) if exps_total else 0.0,
        "averageIterations": round(float(iterations), 2),
        "improvementPercentage": _improvement_pct(db),
        "agentUtilization": round(100 * agents_active / agents_total, 1) if agents_total else 0.0,
        "missionCompletionRate": round(100 * completed_missions / total_missions, 1) if total_missions else 0.0,
        "memoryRetrievals": int(memory_retrievals),
        "errorRecoveryRate": error_recovery_rate,
        "totalMissions": total_missions,
    }


def _improvement_pct(db: Session) -> float:
    """Best observed relative improvement across multi-iteration missions."""
    exps = db.execute(
        select(Experiment).order_by(Experiment.mission_id, Experiment.iteration)
    ).scalars().all()
    by_mission: dict[str, list[float]] = {}
    for e in exps:
        score = (e.metrics or {}).get("score")
        if isinstance(score, (int, float)):
            by_mission.setdefault(e.mission_id, []).append(float(score))
    gains: list[float] = []
    for scores in by_mission.values():
        if len(scores) >= 2 and scores[0] > 0:
            best = max(scores)
            gains.append((best - scores[0]) / scores[0] * 100)
    if not gains:
        return 0.0
    return round(sum(gains) / len(gains), 1)
