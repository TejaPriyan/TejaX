"""Full pipeline integration test — mission completes end-to-end."""

import asyncio

import pytest

from tejax.constants import MissionStatus
from tejax.db import SessionLocal, init_db
from tejax.events import EventBus
from tejax.orchestration.mission_service import MissionService
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


def test_pipeline_completes(event_loop):
    bus = EventBus()
    svc = MissionService(bus)

    async def go():
        db = SessionLocal()
        m = svc.create(
            db,
            title="Test crop disease detection system",
            description="Detect crop diseases from leaf images.",
            max_iterations=2,
        )
        await run_mission(m.id, bus)
        db2 = SessionLocal()
        mm = svc.get_mission(db2, m.id)
        assert mm.status == MissionStatus.COMPLETED
        assert mm.report is not None
        assert mm.report["final_solution"]
        exps = svc.get_experiments(db2, m.id)
        assert len(exps) >= 1
        assert exps[-1].metrics.get("score") is not None
        db2.close()
        db.close()

    event_loop.run_until_complete(go())
