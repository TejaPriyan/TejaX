import asyncio
import json
import time
from collections import Counter
import random

import pytest
from fastapi.testclient import TestClient

from tejax.api.app import create_app
from tejax.config import get_settings
from tejax.agents.coder import build_real_dataset_code
from tejax.sandbox.runner import LocalRunner, build_runner
from tejax.providers.model import FallbackProvider, ModelProvider


def wait_status(client, mission_id, statuses, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        mission = client.get(f"/api/missions/{mission_id}").json()
        if mission["status"] in statuses:
            return mission
        time.sleep(.025)
    pytest.fail(f"Timed out waiting for {statuses}: {mission}")


@pytest.mark.parametrize("filename,content", [("../escape.csv", "x,y\n1,2"), ("..\\escape.csv", "x,y\n1,2"), ("x.json", "not json"), ("x.csv", "header"), ("x.exe", "x,y\n1,2")])
def test_invalid_datasets_rejected(filename, content):
    with TestClient(create_app()) as client:
        response = client.post("/api/datasets/upload", json={"filename": filename, "content": content})
        assert response.status_code == 422


def test_dataset_mission_is_measured_and_never_auto_certified():
    rows = [{"feature": i, "label": "A" if i % 3 else "B"} for i in range(20)]
    code, _ = build_real_dataset_code("records.json")
    first = asyncio.run(LocalRunner().run(code, files={"records.json": json.dumps(rows)}))
    assert first.ok, first.stderr
    random.Random(42).shuffle(rows)
    train, test = rows[:15], rows[15:]
    prediction = Counter(r["label"] for r in train).most_common(1)[0][0]
    expected = sum(r["label"] == prediction for r in test) / len(test)
    assert first.metrics["accuracy"] == expected
    revised, _ = build_real_dataset_code("records.json", variant=4)
    assert revised == code  # no fictitious improvement from an iteration counter
    with TestClient(create_app()) as client:
        payload = {"title": "Evaluate dataset baseline", "dataset_filename": "records.json", "dataset_content": json.dumps(rows), "maxIterations": 1}
        one = client.post("/api/missions", json=payload).json()
        two = client.post("/api/missions", json=payload).json()
        assert one["datasetFilename"] != two["datasetFilename"]
        assert client.post(f"/api/missions/{one['id']}/start").status_code == 200
        done = wait_status(client, one['id'], {"COMPLETED", "FAILED"})
        assert done["status"] == "COMPLETED", done.get('error')
        assert done["report"]["evidence_type"] == "DEMO"
        timeline = client.get(f"/api/missions/{one['id']}/timeline").json()
        test_event = next(e for e in timeline if e['type'] == 'TEST_COMPLETED')
        assert test_event['payload']['passed'] is True  # tester receives the dataset too
        tasks = client.get(f"/api/missions/{one['id']}/tasks").json()
        assert tasks and all(t['status'] == 'COMPLETED' for t in tasks)


def test_pause_resume_cancel_and_websocket(monkeypatch):
    monkeypatch.setattr(get_settings(), 'demo_pacing_seconds', .12)
    with TestClient(create_app()) as client:
        with client.websocket_connect('/ws') as ws:
            mission = client.post('/api/missions', json={'title':'Test pause and resume', 'maxIterations':1}).json()
            event = ws.receive_json()
            assert event['type'] == 'MISSION_CREATED'
            mid = mission['id']
            client.post(f'/api/missions/{mid}/start')
            assert client.post(f'/api/missions/{mid}/pause').json()['ok']
            wait_status(client, mid, {'PAUSED'})
            client.post(f'/api/missions/{mid}/start')
            wait_status(client, mid, {'RESEARCHING','DEVELOPING','EXPERIMENTING','COMPLETED'})
            client.post(f'/api/missions/{mid}/cancel')
            done = wait_status(client, mid, {'CANCELLED','COMPLETED'})
            agents = client.get(f'/api/missions/{mid}/agents').json()
            assert not any(a['status'] == 'ACTIVE' for a in agents)


def test_production_refuses_local_execution(monkeypatch):
    monkeypatch.setattr(get_settings(), 'environment', 'production')
    monkeypatch.setattr(get_settings(), 'sandbox_backend', 'local')
    with pytest.raises(RuntimeError, match='requires SANDBOX_BACKEND=docker'):
        build_runner()


def test_provider_failure_is_not_disguised_as_demo():
    class Broken(ModelProvider):
        name='broken'
        async def generate(self,*args,**kwargs):
            raise RuntimeError('unavailable')
    with pytest.raises(RuntimeError, match='All configured model providers failed'):
        asyncio.run(FallbackProvider([Broken()]).generate('system','prompt'))
