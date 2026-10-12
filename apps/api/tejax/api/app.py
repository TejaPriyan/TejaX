"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..config import get_settings
from ..database.models import SystemEvent
from ..db import SessionLocal, init_db
from . import state
from .routes import router, ws_router


async def _persist_event(event: dict) -> None:
    """Event-bus listener: write every event to the system_events table."""
    db = SessionLocal()
    try:
        db.add(SystemEvent(
            event_id=event.get("eventId", ""),
            type=event.get("type", ""),
            timestamp=int(event.get("timestamp", 0)),
            mission_id=event.get("missionId"),
            agent_id=event.get("agentId"),
            payload=event.get("payload") or {},
        ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    state.bus.add_listener(_persist_event)
    broadcast = state.manager.broadcast
    state.bus.add_listener(broadcast)

    # Seed the demo mission so the lab is alive on first launch.
    db = SessionLocal()
    try:
        from ..orchestration.demo import ensure_demo_mission
        from ..database.models import Mission, Agent, AgentTask
        active_states = ["PLANNING", "RESEARCHING", "DEVELOPING", "EXPERIMENTING", "EVALUATING", "IMPROVING", "PAUSED", "AWAITING_APPROVAL"]
        for mission in db.query(Mission).filter(Mission.status.in_(active_states)):
            mission.status = "FAILED"
            mission.error = "The backend restarted during this run. Start a new run to retry."
            for agent in db.query(Agent).filter_by(mission_id=mission.id, status="ACTIVE"):
                agent.status = "ONLINE"
                agent.current_task = "Interrupted by backend restart"
            for task in db.query(AgentTask).filter_by(mission_id=mission.id, status="RUNNING"):
                task.status = "FAILED"
        db.commit()
        ensure_demo_mission(db, state.missions)
    finally:
        db.close()

    try:
        yield
    finally:
        import asyncio
        from ..orchestration.mission_service import _running
        tasks = list(_running.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        state.bus.remove_listener(_persist_event)
        state.bus.remove_listener(broadcast)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TejaX — Autonomous Intelligence Lab",
        version="0.1.0",
        description="Autonomous multi-agent intelligence and scientific research platform.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(ws_router)
    return app


app = create_app()
