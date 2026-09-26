"""In-process event bus + WebSocket connection manager.

Events are the backbone of the real-time experience: every agent action,
task transition and experiment result is published here and forwarded to
(1) the database (via a registered persistence listener) and
(2) connected WebSocket clients.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from collections import defaultdict
from typing import Any, Awaitable, Callable

from fastapi import WebSocket


def make_event(
    event_type: str,
    mission_id: str | None = None,
    agent_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "eventId": uuid.uuid4().hex,
        "type": event_type,
        "timestamp": int(time.time() * 1000),
        "missionId": mission_id,
        "agentId": agent_id,
        "payload": payload or {},
    }


class EventBus:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._listeners: list[Callable[[dict[str, Any]], Awaitable[None]]] = []
        self._history: list[dict[str, Any]] = []

    # --- subscriptions ---------------------------------------------------
    def subscribe(self, mission_id: str | None, queue: asyncio.Queue) -> None:
        self._queues[mission_id or "*"].add(queue)

    def unsubscribe(self, mission_id: str | None, queue: asyncio.Queue) -> None:
        self._queues[mission_id or "*"].discard(queue)

    def add_listener(self, fn: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        self._listeners.append(fn)

    # --- publishing ------------------------------------------------------
    async def publish(self, event: dict[str, Any]) -> None:
        self._history.append(event)
        if len(self._history) > 5000:
            self._history = self._history[-5000:]

        for fn in self._listeners:
            try:
                await fn(event)
            except Exception:  # persistence must never take down the bus
                pass

        for key in (event.get("missionId"), "*"):
            for q in list(self._queues.get(key, ())):
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass

    def recent(self, limit: int = 200) -> list[dict[str, Any]]:
        return self._history[-limit:]


class ConnectionManager:
    """Fan-out to all connected WebSocket clients."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)

    @property
    def count(self) -> int:
        return len(self._connections)

    async def broadcast(self, event: dict[str, Any]) -> None:
        if not self._connections:
            return
        message = json.dumps(event, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.discard(ws)
