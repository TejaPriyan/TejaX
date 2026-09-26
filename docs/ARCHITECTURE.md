# TejaX — Architecture

TejaX is an **AI experimentation and agent engineering platform**.
This document explains how the pieces fit together.

## High-level flow

```
USER ─▶ Command Center (React) ─▶ FastAPI ─▶ Mission Controller
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                     PLANNER             RESEARCHER            CODER
                         │                    │                    │
                         └────── task graph ──┴────────────┬───────┘
                                                          ▼
                                                     SCIENTIST ─▶ SANDBOX
                                                          │        (limits/timeouts)
                                                          ▼
                                                     ANALYST ─▶ CRITIC
                                                          │           │
                                                          └─ improve ─┘  (≤ MAX_ITERATIONS)
                                                          ▼
                                                      MEMORY ─▶ REPORT
```

All activity is emitted as **events** on an in-process event bus, persisted to
`system_events`, and fanned out to browsers over **WebSocket** (`/ws`). The 3D
laboratory and every dashboard consume the same stream, so the visualization
is never "decoration" — it mirrors the backend state.

## Components

| Layer | Location | Responsibility |
|---|---|---|
| Web client | `apps/web` | React + TS + Tailwind + Three.js UI and 3D lab |
| API | `apps/api` | FastAPI app, REST + WebSocket |
| Orchestration | `apps/api/tejax/orchestration` | Mission service, pipeline runner |
| Agents | `apps/api/tejax/agents` | Planner / Researcher / Coder / Scientist / Critic / Analyst / Memory |
| Providers | `apps/api/tejax/providers` | `ModelProvider` abstraction (demo / OpenAI-compat / Ollama) |
| Memory | `apps/api/tejax/services/memory.py` | keyword + optional semantic retrieval |
| Sandbox | `apps/api/tejax/sandbox` | local subprocess runner + Docker runner |
| Events | `apps/api/tejax/events.py` | event bus + WebSocket connection manager |

## Key design decisions

- **Structured agent communication.** Agents exchange typed task/message
  objects (`AgentMessage`, `AgentTask`) rather than free-form strings.
- **Deterministic-first agents.** Each agent has a robust offline behavior; a
  configured model *augments* reasoning when available, and the system falls
  back gracefully if the model is unreachable.
- **Iterations are bounded.** `MAX_AGENT_ITERATIONS` caps the
  experiment→critique→improve loop; there is no unbounded autonomy.
- **Everything generated is untrusted.** Code runs in an isolated subprocess
  (or disposable Docker container) with memory/CPU/time limits, restricted
  environment and no network. Metric extraction uses an explicit marker.
- **Honest by default.** Research is grounded in a curated local knowledge
  base with real, labelled sources. Unknown domains return
  "Insufficient evidence" instead of invented facts. Web research is opt-in.
- **Zero-dependency startup.** SQLite + in-process events mean the lab runs
  with no external services; PostgreSQL/pgvector + Redis are optional for
  production.

## Mission pipeline

1. **UNDERSTANDING / PLANNING** — Planner produces objectives + task graph.
2. **RESEARCH** — Researcher pulls from the knowledge base (or a model).
3. **DEVELOPMENT** — Coder writes a prototype.
4. **EXPERIMENT** — Scientist runs it sandboxed; Analyst scores the result.
5. **CRITIQUE** — Critic issues an adversarial, constructive review.
6. **IMPROVEMENT** — Coder revises; loop back to 4 until accepted or cap.
7. **FINAL_RESULT** — Memory consolidates; a report with confidence,
   limitations and next steps is generated.
