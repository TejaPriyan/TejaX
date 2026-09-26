"""ORM models — every table the lab needs.

Uses SQLAlchemy 2.0 style. JSON columns degrade to TEXT on SQLite, which is
fine for local development; PostgreSQL is recommended for production.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    missions: Mapped[list["Mission"]] = relationship(back_populates="user")


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(300), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="CREATED", index=True)
    current_phase: Mapped[str] = mapped_column(String(32), default="")
    max_iterations: Mapped[int] = mapped_column(Integer, default=5)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Phase 2: Real Dataset Ingestion ---
    dataset_filename: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    dataset_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)

    user: Mapped["User | None"] = relationship(back_populates="missions")
    objectives: Mapped[list["MissionObjective"]] = relationship(
        back_populates="mission", cascade="all, delete-orphan"
    )


class MissionObjective(Base):
    __tablename__ = "mission_objectives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(400))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="PENDING")

    mission: Mapped["Mission"] = relationship(back_populates="objectives")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    type: Mapped[str] = mapped_column(String(32), index=True)  # planner|researcher|...
    name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(32), default="ONLINE")
    mission_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    current_task: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    agent_type: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    priority: Mapped[int] = mapped_column(Integer, default=1)
    dependencies: Mapped[list] = mapped_column(JSON, default=list)
    input: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    output: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    from_agent: Mapped[str] = mapped_column(String(32))
    to_agent: Mapped[str] = mapped_column(String(32))
    type: Mapped[str] = mapped_column(String(32), default="TASK")
    content: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(16), default="normal")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ResearchItem(Base):
    __tablename__ = "research_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    objective_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    title: Mapped[str] = mapped_column(String(400))
    summary: Mapped[str] = mapped_column(Text)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("missions.id"), index=True)
    name: Mapped[str] = mapped_column(String(300))
    iteration: Mapped[int] = mapped_column(Integer, default=1)
    hypothesis: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="QUEUED")
    code: Mapped[str] = mapped_column(Text, default="")
    stdout: Mapped[str] = mapped_column(Text, default="")
    stderr: Mapped[str] = mapped_column(Text, default="")
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    execution_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Phase 1: Provenance & Trust fields (non-breaking, all nullable) ---
    evidence_type: Mapped[str | None] = mapped_column(String(16), nullable=True, default=None)       # REAL | SYNTHETIC | DEMO | UNKNOWN
    sandbox_type: Mapped[str | None] = mapped_column(String(16), nullable=True, default=None)        # LOCAL | DOCKER
    parent_experiment_id: Mapped[str | None] = mapped_column(String(36), nullable=True, default=None)
    model_provider: Mapped[str | None] = mapped_column(String(48), nullable=True, default=None)
    model_name: Mapped[str | None] = mapped_column(String(120), nullable=True, default=None)
    random_seed: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    revision_reason: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)               # full reproducibility blob


class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    experiment_id: Mapped[str] = mapped_column(ForeignKey("experiments.id"), index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    verdict: Mapped[str] = mapped_column(String(32), default="UNDECIDED")  # PASS|FAIL|INSUFFICIENT_EVIDENCE
    analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    critique: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    improvement: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(120), default="")
    mission_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    importance: Mapped[float] = mapped_column(Float, default=0.5)
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SystemEvent(Base):
    __tablename__ = "system_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(48), index=True)
    timestamp: Mapped[int] = mapped_column(Integer)
    mission_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    agent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ModelRun(Base):
    __tablename__ = "model_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(120), default="")
    agent_type: Mapped[str] = mapped_column(String(32), default="")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), index=True)
    value: Mapped[float] = mapped_column(Float)
    mission_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
