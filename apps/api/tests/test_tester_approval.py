"""Tests for the new Tester agent and the human-approval checkpoint."""

import asyncio

import pytest

from tejax.constants import EventType, MissionStatus
from tejax.db import SessionLocal, init_db
from tejax.events import EventBus, make_event
from tejax.orchestration.mission_service import MissionService, _controls
from tejax.orchestration.pipeline import run_mission


@pytest.fixture(scope="module", autouse=True)
def _db():
    init_db()
    yield


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def test_pipeline_emits_tester_validation(event_loop):
    bus = EventBus()
    svc = MissionService(bus)
    captured: list[dict] = []

    async def listener(ev):
        captured.append(ev)

    bus.add_listener(listener)

    async def go():
        db = SessionLocal()
        m = svc.create(db, title="Tester smoke mission", description="Detect crop diseases.", max_iterations=2)
        await run_mission(m.id, bus)
        types = [e["type"] for e in captured if e.get("missionId") == m.id]
        assert EventType.TEST_STARTED in types
        assert EventType.TEST_COMPLETED in types
        completed = next(e for e in captured if e["type"] == EventType.TEST_COMPLETED and e.get("missionId") == m.id)
        assert completed["payload"]["passed"] is True
        db2 = SessionLocal()
        mm = svc.get_mission(db2, m.id)
        assert mm.status == MissionStatus.COMPLETED
        agent_types = [a.type for a in svc.get_agents(db2, m.id)]
        assert "tester" in agent_types
        db2.close()
        db.close()

    event_loop.run_until_complete(go())


def test_human_approval_gate_waits_then_approves(event_loop):
    bus = EventBus()
    svc = MissionService(bus)
    events: list[dict] = []

    async def listener(ev):
        events.append(ev)

    bus.add_listener(listener)

    async def go():
        from tejax.runtime import get_runtime
        get_runtime().update(human_approval=True)

        db = SessionLocal()
        m = svc.create(db, title="Approval gate mission", description="Detect crop diseases.", max_iterations=2)
        await svc.start(db, m.id)

        # wait until approval is requested
        for _ in range(200):
            await asyncio.sleep(0.1)
            if any(e["type"] == EventType.APPROVAL_REQUESTED for e in events):
                break
        assert any(e["type"] == EventType.APPROVAL_REQUESTED for e in events)

        # reject the mission
        await svc.reject(m.id)
        for _ in range(100):
            await asyncio.sleep(0.1)
            if any(e["type"] == EventType.REJECTED for e in events):
                break

        get_runtime().update(human_approval=False)
        db2 = SessionLocal()
        mm = svc.get_mission(db2, m.id)
        assert mm.status == MissionStatus.REJECTED
        db2.close()
        db.close()

    event_loop.run_until_complete(go())
