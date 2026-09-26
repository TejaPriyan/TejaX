"""Pydantic schemas — request/response models and agent-structured outputs."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .constants import AgentType, MemoryType, MissionStatus, TaskStatus


def _to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)


# --- API request/response ------------------------------------------------
class MissionCreate(ApiModel):
    title: str = Field(min_length=2, max_length=300)
    description: str = Field(default="", max_length=6000)
    max_iterations: int = Field(default=5, ge=1, le=20)
    dataset_filename: str | None = None
    dataset_content: str | None = None
    dataset_metadata: dict[str, Any] | None = None


class DatasetUploadResponse(ApiModel):
    filename: str
    rows: int
    columns: list[str]
    size_bytes: int
    preview: list[dict[str, Any]] = Field(default_factory=list)
    content: str = ""


class Objective(BaseModel):
    id: str
    index: int
    title: str
    description: str = ""
    status: str = TaskStatus.PENDING


class Task(BaseModel):
    id: str
    mission_id: str
    agent_type: str
    description: str
    status: str = TaskStatus.PENDING
    priority: int = 1
    dependencies: list[str] = []
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    error: str | None = None
    attempts: int = 0


class AgentOut(BaseModel):
    id: str
    type: str
    name: str
    status: str
    mission_id: str | None = None
    current_task: str | None = None
    progress: float = 0.0


class ExperimentOut(BaseModel):
    id: str
    mission_id: str
    name: str
    iteration: int
    hypothesis: str = ""
    status: str
    code: str = ""
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    execution_time: float | None = None
    metrics: dict[str, Any] | None = None
    error: str | None = None
    created_at: datetime | None = None
    completed_at: datetime | None = None
    # Phase 1: provenance & trust
    evidence_type: str | None = None
    sandbox_type: str | None = None
    parent_experiment_id: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    random_seed: int | None = None
    revision_reason: str | None = None
    provenance: dict[str, Any] | None = None


class TimelineEvent(BaseModel):
    event_id: str
    type: str
    timestamp: int
    mission_id: str | None = None
    agent_id: str | None = None
    payload: dict[str, Any] = {}


class MemoryOut(BaseModel):
    id: str
    type: str
    content: str
    source: str = ""
    mission_id: str | None = None
    importance: float = 0.5
    score: float | None = None
    created_at: datetime | None = None


class MemoryCreate(ApiModel):
    type: str = MemoryType.FACT
    content: str = Field(min_length=1)
    source: str = ""
    importance: float = Field(default=0.5, ge=0.0, le=1.0)


class ModelConfigUpdate(ApiModel):
    provider: str | None = None       # demo | ollama | openai_compat
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    human_approval: bool | None = None


# --- Agent structured outputs -------------------------------------------
class PlanObjective(BaseModel):
    title: str
    description: str = ""


class PlanTask(BaseModel):
    agent_type: str = AgentType.RESEARCHER
    description: str
    dependencies: list[int] = []


class Plan(BaseModel):
    understanding: str
    objectives: list[PlanObjective]
    tasks: list[PlanTask]


class ResearchFinding(BaseModel):
    title: str
    summary: str
    sources: list[str] = []
    evidence: str = ""
    confidence: float = 0.5


class Hypothesis(BaseModel):
    statement: str
    experiment_name: str
    parameters: dict[str, Any] = {}


class Analysis(BaseModel):
    score: float
    summary: str
    trends: list[str] = []
    verdict: str = "INSUFFICIENT_EVIDENCE"  # PASS | FAIL | INSUFFICIENT_EVIDENCE


class CritiqueIssue(BaseModel):
    severity: str = "medium"  # low | medium | high
    category: str
    detail: str
    suggestion: str


class Critique(BaseModel):
    verdict: str = "NEEDS_IMPROVEMENT"  # ACCEPT | NEEDS_IMPROVEMENT | REJECT
    issues: list[CritiqueIssue] = []
    summary: str
    changes: list[str] = []


class Improvement(BaseModel):
    summary: str
    changes: list[str] = []


class MissionReport(BaseModel):
    problem: str
    approach: str
    research: str
    agents_involved: list[str] = Field(default_factory=list)
    experiments: list[dict[str, Any]] = Field(default_factory=list)
    iterations: int = 1
    failures: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    final_solution: str = ""
    confidence: str = ""
    limitations: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    # Phase 1: trust & provenance
    evidence_type: str = "UNKNOWN"
    sandbox_security: str = "LOCAL"
    provenance_summary: dict[str, Any] = Field(default_factory=dict)
    ledger: list[dict[str, Any]] = Field(default_factory=list)
