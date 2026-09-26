"""REST + WebSocket routes."""

from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..constants import EventType, MemoryType, MissionStatus
from ..database.models import Experiment, ModelRun, SystemEvent
from ..db import get_db
from ..providers import build_provider
from ..runtime import get_runtime
from ..schemas import ApiModel, MemoryCreate, MissionCreate, ModelConfigUpdate
from ..services.metrics import compute_metrics

from . import state

router = APIRouter(prefix="/api")
ws_router = APIRouter()


def _inspect_dataset(filename: str, content: str) -> dict[str, Any]:
    """Parse rows, columns, and sample preview from CSV or JSON text."""
    size_bytes = len(content.encode("utf-8"))
    columns: list[str] = []
    preview: list[dict[str, Any]] = []
    rows_count = 0

    if filename.lower().endswith(".json"):
        try:
            parsed = json.loads(content)
            if isinstance(parsed, list):
                rows_count = len(parsed)
                if rows_count > 0 and isinstance(parsed[0], dict):
                    columns = list(parsed[0].keys())
                    preview = parsed[:5]
            elif isinstance(parsed, dict):
                rows_count = 1
                columns = list(parsed.keys())
                preview = [parsed]
        except Exception:
            pass
    else:
        # Default to CSV
        try:
            f = io.StringIO(content)
            reader = csv.DictReader(f)
            columns = reader.fieldnames or []
            for i, row in enumerate(reader):
                if i < 5:
                    preview.append(dict(row))
                rows_count += 1
        except Exception:
            pass

    return {
        "filename": filename,
        "rows": rows_count,
        "columns": columns[:30],
        "size_bytes": size_bytes,
        "preview": preview,
    }


class DatasetUploadBody(ApiModel):
    filename: str
    content: str


# --- Datasets -----------------------------------------------------------
@router.post("/datasets/upload")
async def upload_dataset(body: DatasetUploadBody):
    from ..config import get_settings
    settings = get_settings()
    datasets_dir = os.path.join(os.path.abspath(settings.data_dir), "datasets")
    os.makedirs(datasets_dir, exist_ok=True)

    filename = body.filename or "dataset.csv"
    content = body.content or ""

    safe_name = re.sub(r"[^\w\-.]", "_", os.path.basename(filename))
    file_path = os.path.join(datasets_dir, safe_name)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    meta = _inspect_dataset(safe_name, content)
    meta["content"] = content
    return meta


# --- Missions ------------------------------------------------------------
@router.post("/missions", status_code=201)
async def create_mission(body: MissionCreate, db: Session = Depends(get_db)):
    from ..config import get_settings
    settings = get_settings()
    datasets_dir = os.path.join(os.path.abspath(settings.data_dir), "datasets")
    os.makedirs(datasets_dir, exist_ok=True)

    dataset_filename = body.dataset_filename
    dataset_metadata = body.dataset_metadata

    if body.dataset_content and dataset_filename:
        safe_name = re.sub(r"[^\w\-.]", "_", os.path.basename(dataset_filename))
        file_path = os.path.join(datasets_dir, safe_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(body.dataset_content)
        dataset_filename = safe_name
        if not dataset_metadata:
            dataset_metadata = _inspect_dataset(safe_name, body.dataset_content)

    mission = state.missions.create(
        db,
        title=body.title,
        description=body.description,
        max_iterations=body.max_iterations,
        dataset_filename=dataset_filename,
        dataset_metadata=dataset_metadata,
    )
    return _mission_dict(mission)


@router.get("/missions")
def list_missions(db: Session = Depends(get_db)):
    return [_mission_dict(m) for m in state.missions.list_missions(db)]


@router.get("/missions/{mission_id}")
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    m = state.missions.get_mission(db, mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    data = _mission_dict(m)
    data["objectives"] = [
        {"id": o.id, "index": o.index, "title": o.title, "description": o.description, "status": o.status}
        for o in state.missions.get_objectives(db, mission_id)
    ]
    return data


@router.post("/missions/{mission_id}/start")
async def start_mission(mission_id: str, db: Session = Depends(get_db)):
    try:
        await state.missions.start(db, mission_id)
    except KeyError:
        raise HTTPException(404, "Mission not found")
    return {"ok": True, "missionId": mission_id}


@router.post("/missions/{mission_id}/pause")
async def pause_mission(mission_id: str):
    ok = await state.missions.pause(mission_id)
    return {"ok": ok}


@router.post("/missions/{mission_id}/cancel")
async def cancel_mission(mission_id: str):
    ok = await state.missions.cancel(mission_id)
    return {"ok": ok}


@router.post("/missions/{mission_id}/approve")
async def approve_mission(mission_id: str):
    ok = await state.missions.approve(mission_id)
    return {"ok": ok}


@router.post("/missions/{mission_id}/reject")
async def reject_mission(mission_id: str):
    ok = await state.missions.reject(mission_id)
    return {"ok": ok}


@router.get("/missions/{mission_id}/timeline")
def mission_timeline(mission_id: str, db: Session = Depends(get_db)):
    return state.missions.get_timeline(db, mission_id)


@router.get("/missions/{mission_id}/agents")
def mission_agents(mission_id: str, db: Session = Depends(get_db)):
    return [_agent_dict(a) for a in state.missions.get_agents(db, mission_id)]


@router.get("/missions/{mission_id}/experiments")
def mission_experiments(mission_id: str, db: Session = Depends(get_db)):
    return [_experiment_dict(e) for e in state.missions.get_experiments(db, mission_id)]


@router.get("/missions/{mission_id}/tasks")
def mission_tasks(mission_id: str, db: Session = Depends(get_db)):
    return [
        {
            "id": t.id, "agentType": t.agent_type, "description": t.description,
            "status": t.status, "priority": t.priority, "dependencies": t.dependencies,
            "error": t.error, "attempts": t.attempts,
        }
        for t in state.missions.get_tasks(db, mission_id)
    ]


# --- Agents --------------------------------------------------------------
@router.get("/agents")
def list_agents(db: Session = Depends(get_db), mission_id: str | None = Query(default=None)):
    from ..database.models import Agent
    q = select(Agent)
    if mission_id:
        q = q.where(Agent.mission_id == mission_id)
    return [_agent_dict(a) for a in db.scalars(q).all()]


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    from ..database.models import Agent
    a = db.get(Agent, agent_id)
    if not a:
        raise HTTPException(404, "Agent not found")
    return _agent_dict(a)


# --- Memory --------------------------------------------------------------
@router.post("/memory")
async def create_memory(body: MemoryCreate, db: Session = Depends(get_db)):
    from ..events import make_event
    mem = await state.memory.store(
        db, type_=body.type, content=body.content, source=body.source, importance=body.importance
    )
    await state.bus.publish(make_event(EventType.MEMORY_CREATED, None, None, {"type": mem.type}))
    return {"id": mem.id, "type": mem.type, "content": mem.content}


@router.get("/memory/search")
async def search_memory(
    q: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    import time
    results = await state.memory.retrieve(db, q, limit=limit, type_=type)
    # count a retrieval event for metrics
    db.add(SystemEvent(event_id=f"retr-{time.time()}", type="MEMORY_RETRIEVED",
                       timestamp=int(time.time() * 1000)))
    db.commit()
    return {"query": q, "results": results}


# --- System --------------------------------------------------------------
@router.get("/system/status")
def system_status(db: Session = Depends(get_db)):
    from ..database.models import Agent, Memory, Mission

    agents_online = db.scalar(select(func.count(Agent.id)).where(Agent.status != "OFFLINE")) or 0
    memory_count = db.scalar(select(func.count(Memory.id))) or 0
    latest = state.missions.list_missions(db, limit=1)
    current = latest[0] if latest and latest[0].status in (
        MissionStatus.PLANNING, MissionStatus.RESEARCHING, MissionStatus.DEVELOPING,
        MissionStatus.EXPERIMENTING, MissionStatus.EVALUATING, MissionStatus.IMPROVING,
        MissionStatus.AWAITING_APPROVAL,
    ) else None
    exps_running = db.scalar(select(func.count(Experiment.id)).where(Experiment.status == "RUNNING")) or 0

    provider = build_provider()
    return {
        "app": "TejaX",
        "version": "0.2.0",
        "mode": "DEMO MODE" if provider.name == "demo" else provider.name,
        "agentsOnline": agents_online,
        "memoryCount": memory_count,
        "currentMission": {"id": current.id, "title": current.title, "status": current.status, "phase": current.current_phase} if current else None,
        "experimentsRunning": exps_runs(exps_running),
        "runningMissions": state.missions.running_count(),
        "websocketClients": state.manager.count,
        "humanApproval": bool(get_runtime().config.human_approval),
        "modelStatus": {
            "provider": provider.name,
            "model": getattr(provider, "model", "") or "tejax-core-engine",
            "ok": True,
        },
    }


def exps_runs(n: int) -> int:
    return n


@router.get("/system/metrics")
def system_metrics(db: Session = Depends(get_db)):
    return compute_metrics(db)


@router.get("/system/observability")
def observability(db: Session = Depends(get_db)):
    runs = db.scalars(select(ModelRun).order_by(ModelRun.id.desc()).limit(50)).all()
    total = db.scalar(select(func.count(ModelRun.id))) or 0
    failures = db.scalar(select(func.count(ModelRun.id)).where(ModelRun.ok == False)) or 0
    avg_latency = db.scalar(select(func.avg(ModelRun.latency_ms))) or 0
    return {
        "modelRuns": [
            {"provider": r.provider, "model": r.model, "agent": r.agent_type,
             "latencyMs": r.latency_ms, "ok": r.ok, "error": r.error,
             "tokensIn": r.tokens_in, "tokensOut": r.tokens_out}
            for r in runs
        ],
        "totals": {"runs": total, "failures": failures, "avgLatencyMs": round(float(avg_latency), 1)},
    }


@router.get("/system/model")
async def get_model_status():
    """Current model configuration, connectivity health and available models."""
    provider = build_provider()
    health = await provider.health()
    cfg = get_runtime().snapshot()
    if cfg.get("api_key"):
        cfg["api_key"] = "••••••••"
    return {
        "config": cfg,
        "effectiveProvider": provider.name,
        "effectiveModel": getattr(provider, "model", ""),
        "health": health,
    }


@router.put("/system/model")
async def update_model(body: ModelConfigUpdate):
    """Apply model configuration at runtime (persisted to data/runtime.json)."""
    rt = get_runtime()
    rt.update(
        provider=body.provider,
        model=body.model,
        base_url=body.base_url,
        api_key=body.api_key,
        human_approval=body.human_approval,
    )
    # Rebuild the process-wide provider singletons.
    state.provider = build_provider()
    state.memory.provider = state.provider
    health = await state.provider.health()
    return {
        "ok": True,
        "provider": state.provider.name,
        "model": getattr(state.provider, "model", ""),
        "health": health,
    }


@router.post("/system/model/test")
async def test_model():
    """Run a tiny generation through the active provider and report latency."""
    import time as _time
    provider = build_provider()
    t0 = _time.time()
    try:
        res = await provider.generate(
            "You are TejaX, an autonomous multi-agent intelligence research platform.",
            "Reply with exactly one line: MODEL_OK",
        )
        return {
            "ok": True,
            "provider": provider.name,
            "model": res.model or getattr(provider, "model", ""),
            "latencyMs": res.latency_ms,
            "sample": res.text[:160],
        }
    except Exception as exc:
        return {
            "ok": False,
            "provider": provider.name,
            "model": getattr(provider, "model", ""),
            "latencyMs": int((_time.time() - t0) * 1000),
            "error": str(exc)[:300],
        }


@router.post("/system/demo")
async def run_demo(db: Session = Depends(get_db)):
    """Seed + start the built-in demo mission if it isn't already running."""
    from ..orchestration.demo import ensure_demo_mission, DEMO_TITLE
    mission = ensure_demo_mission(db, state.missions)
    if mission.status not in (MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.CANCELLED) and state.missions.is_running(mission.id):
        return {"ok": True, "missionId": mission.id, "alreadyRunning": True}
    await state.missions.start(db, mission.id)
    return {"ok": True, "missionId": mission.id, "title": DEMO_TITLE}


# --- WebSocket -----------------------------------------------------------
@ws_router.websocket("/ws")
async def ws_global(ws: WebSocket):
    await state.manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        state.manager.disconnect(ws)
    except Exception:
        state.manager.disconnect(ws)


@ws_router.websocket("/ws/missions/{mission_id}")
async def ws_mission(ws: WebSocket, mission_id: str):
    await state.manager.connect(ws)
    # replay recent history for this mission
    recent = [e for e in state.bus.recent(500) if e.get("missionId") == mission_id]
    import json
    for e in recent[-100:]:
        await ws.send_text(json.dumps(e, default=str))
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        state.manager.disconnect(ws)
    except Exception:
        state.manager.disconnect(ws)


# --- helpers -------------------------------------------------------------
def _mission_dict(m) -> dict[str, Any]:
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "status": m.status,
        "currentPhase": m.current_phase,
        "maxIterations": m.max_iterations,
        "error": m.error,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
        "startedAt": m.started_at.isoformat() if m.started_at else None,
        "completedAt": m.completed_at.isoformat() if m.completed_at else None,
        "report": m.report,
        "datasetFilename": getattr(m, "dataset_filename", None),
        "datasetMetadata": getattr(m, "dataset_metadata", None),
    }


def _agent_dict(a) -> dict[str, Any]:
    return {
        "id": a.id, "type": a.type, "name": a.name, "status": a.status,
        "missionId": a.mission_id, "currentTask": a.current_task, "progress": a.progress,
    }


def _experiment_dict(e) -> dict[str, Any]:
    return {
        "id": e.id, "missionId": e.mission_id, "name": e.name, "iteration": e.iteration,
        "hypothesis": e.hypothesis, "status": e.status, "code": e.code,
        "stdout": e.stdout, "stderr": e.stderr, "exitCode": e.exit_code,
        "executionTime": e.execution_time, "metrics": e.metrics, "error": e.error,
        "createdAt": e.created_at.isoformat() if e.created_at else None,
        "completedAt": e.completed_at.isoformat() if e.completed_at else None,
        "evidenceType": getattr(e, "evidence_type", None) or "DEMO",
        "sandboxType": getattr(e, "sandbox_type", None) or "LOCAL",
        "parentExperimentId": getattr(e, "parent_experiment_id", None),
        "modelProvider": getattr(e, "model_provider", None),
        "modelName": getattr(e, "model_name", None),
        "randomSeed": getattr(e, "random_seed", None),
        "revisionReason": getattr(e, "revision_reason", None),
        "provenance": getattr(e, "provenance", None),
    }
