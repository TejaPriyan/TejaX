"""Planner + memory + pipeline integration tests."""

import asyncio

import pytest

from tejax.agents import Planner
from tejax.db import SessionLocal, init_db
from tejax.events import EventBus
from tejax.orchestration.mission_service import MissionService
from tejax.services.memory import MemoryService


@pytest.fixture(scope="module", autouse=True)
def _db():
    init_db()
    yield


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def test_planner_decomposes_traffic_mission(event_loop):
    from tejax.database.models import Mission

    db = SessionLocal()
    mission = Mission(id="planner-test", title="Predict traffic accidents", description="road safety", max_iterations=3)
    ctx = _ctx(mission, db)
    planner = Planner()
    plan = event_loop.run_until_complete(planner.run(ctx))
    assert len(plan["objectives"]) >= 6
    assert len(plan["tasks"]) >= 6
    assert plan["understanding"]
    db.close()


def test_memory_dedupes_and_retrieves(event_loop):
    db = SessionLocal()
    mem = MemoryService()

    async def go():
        m1 = await mem.store(db, type_="FACT", content="YOLO detectors are strong real-time baselines", source="test")
        m2 = await mem.store(db, type_="FACT", content="YOLO detectors are strong real-time baselines", source="test")
        assert m1.id == m2.id  # deduplicated
        results = await mem.retrieve(db, "real-time object detection baselines")
        assert any("YOLO" in r["content"] for r in results)
        return results

    results = event_loop.run_until_complete(go())
    assert results
    db.close()


def _ctx(mission, db):
    from tejax.agents import AgentContext
    bus = EventBus()
    return AgentContext(mission=mission, db=db, bus=bus, state={})
