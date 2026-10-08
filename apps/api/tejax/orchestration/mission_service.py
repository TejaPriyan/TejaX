"""Mission lifecycle service — creation, start/pause/cancel, queries."""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..constants import AgentStatus, AgentType, EventType, MissionStatus
from ..database.models import (
    Agent,
    AgentTask,
    Experiment,
    Mission,
    MissionObjective,
    SystemEvent,
)
from ..events import EventBus, make_event
from ..agents import agent_uid

# In-process registry of running missions (single-process deployment).
_running: dict[str, asyncio.Task] = {}
_controls: dict[str, dict[str, asyncio.Event]] = {}


def agent_rows_for_mission(mission_id: str) -> list[Agent]:
    rows = []
    for atype in AgentType.ALL:
        rows.append(Agent(
            id=agent_uid(mission_id, atype),
            type=atype,
            name=AgentType.LABELS[atype],
            status=AgentStatus.ONLINE,
            mission_id=mission_id,
        ))
    return rows


class MissionService:
    def __init__(self, bus: EventBus) -> None:
        self.bus = bus

    # --- lifecycle -------------------------------------------------------
    def create(
        self,
        db: Session,
        *,
        title: str,
        description: str,
        max_iterations: int,
        user_id: str | None = None,
        dataset_filename: str | None = None,
        dataset_metadata: dict[str, Any] | None = None,
    ) -> Mission:
        mission = Mission(
            id=uuid.uuid4().hex,
            user_id=user_id,
            title=title,
            description=description,
            status=MissionStatus.CREATED,
            current_phase="",
            max_iterations=max_iterations,
            dataset_filename=dataset_filename,
            dataset_metadata=dataset_metadata,
        )
        db.add(mission)
        db.flush()
        db.add_all(agent_rows_for_mission(mission.id))
        db.commit()
        db.refresh(mission)
        asyncio.create_task(self.bus.publish(make_event(EventType.MISSION_CREATED, mission.id)))
        return mission

    async def start(self, db: Session, mission_id: str) -> Mission:
        from .pipeline import run_mission

        mission = db.get(Mission, mission_id)
        if mission is None:
            raise KeyError(mission_id)
        if mission_id in _running:
            _controls[mission_id]["pause"].clear()
            return mission

        _controls[mission_id] = {
            "cancel": asyncio.Event(),
            "pause": asyncio.Event(),
            "approve": asyncio.Event(),
            "reject": asyncio.Event(),
        }
        task = asyncio.create_task(run_mission(mission_id, self.bus))
        _running[mission_id] = task
        return mission

    async def pause(self, mission_id: str) -> bool:
        ctrl = _controls.get(mission_id)
        if not ctrl:
            return False
        ctrl["pause"].set()
        return True

    async def cancel(self, mission_id: str) -> bool:
        ctrl = _controls.get(mission_id)
        if not ctrl:
            return False
        ctrl["cancel"].set()
        return True

    async def approve(self, mission_id: str) -> bool:
        ctrl = _controls.get(mission_id)
        if not ctrl:
            return False
        ctrl["approve"].set()
        return True

    async def reject(self, mission_id: str) -> bool:
        ctrl = _controls.get(mission_id)
        if not ctrl:
            return False
        ctrl["reject"].set()
        return True

    # --- queries ---------------------------------------------------------
    def list_missions(self, db: Session, limit: int = 50) -> list[Mission]:
        return list(db.scalars(select(Mission).order_by(Mission.created_at.desc()).limit(limit)))

    def get_mission(self, db: Session, mission_id: str) -> Mission | None:
        return db.get(Mission, mission_id)

    def get_objectives(self, db: Session, mission_id: str) -> list[MissionObjective]:
        return list(db.scalars(
            select(MissionObjective).where(MissionObjective.mission_id == mission_id).order_by(MissionObjective.index)
        ))

    def get_tasks(self, db: Session, mission_id: str) -> list[AgentTask]:
        return list(db.scalars(
            select(AgentTask).where(AgentTask.mission_id == mission_id).order_by(AgentTask.created_at)
        ))

    def get_agents(self, db: Session, mission_id: str) -> list[Agent]:
        return list(db.scalars(select(Agent).where(Agent.mission_id == mission_id)))

    def get_experiments(self, db: Session, mission_id: str) -> list[Experiment]:
        return list(db.scalars(
            select(Experiment).where(Experiment.mission_id == mission_id).order_by(Experiment.created_at)
        ))

    def get_timeline(self, db: Session, mission_id: str, limit: int = 300) -> list[dict[str, Any]]:
        events = db.scalars(
            select(SystemEvent)
            .where(SystemEvent.mission_id == mission_id)
            .order_by(SystemEvent.id.desc())
            .limit(limit)
        ).all()
        return [
            {
                "eventId": e.event_id,
                "type": e.type,
                "timestamp": e.timestamp,
                "missionId": e.mission_id,
                "agentId": e.agent_id,
                "payload": e.payload or {},
            }
            for e in reversed(events)
        ]

    @staticmethod
    def is_running(mission_id: str) -> bool:
        return mission_id in _running

    @staticmethod
    def running_count() -> int:
        return len(_running)
