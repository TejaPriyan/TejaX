"""Autonomous Benchmark Engine.

Runs verified benchmark missions that execute the exact multi-agent pipeline
using deterministic heuristic synthesis or connected models, exercising full
planning, research, coding, critic evaluation, and sandboxed test execution.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..constants import MissionStatus
from ..database.models import Mission
from .mission_service import MissionService

DEMO_TITLE = "Design an AI system for traffic accident prediction"
DEMO_DESCRIPTION = (
    "Predict the risk of traffic accidents across road segments using temporal and "
    "spatial features (time of day, weather, road geometry, traffic flow). The system "
    "should rank high-risk segments and justify its predictions."
)

# Built-in second demo mission (road-safety violations) referenced in the spec.
VIOLATION_TITLE = "Build a computer vision system for detecting road safety violations"
VIOLATION_DESCRIPTION = (
    "Detect road-safety violations (speeding, red-light running, helmet absence) from "
    "camera feeds using detection, tracking and a rule engine."
)


def ensure_demo_mission(db: Session, service: MissionService) -> Mission:
    existing = db.scalars(select(Mission).where(Mission.title == DEMO_TITLE).limit(1)).first()
    if existing:
        return existing
    return service.create(db, title=DEMO_TITLE, description=DEMO_DESCRIPTION, max_iterations=4)


def ensure_violation_mission(db: Session, service: MissionService) -> Mission:
    existing = db.scalars(select(Mission).where(Mission.title == VIOLATION_TITLE).limit(1)).first()
    if existing:
        return existing
    return service.create(db, title=VIOLATION_TITLE, description=VIOLATION_DESCRIPTION, max_iterations=4)
