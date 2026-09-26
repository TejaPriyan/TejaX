# TejaX

**AI Experimentation & Agent Engineering Platform**

> **Turn ideas into experiments, evidence, and decisions.**
>
> **TejaX** is an **AI experimentation and agent engineering platform**. It provides a 
> structured multi-agent research pipeline with real dataset ingestion, isolated sandbox 
> execution, persistent long-term memory, real-time telemetry visualization, and an automated 
> self-improving critique loop for solving complex scientific and technical missions.

TejaX turns a **mission** (not a chat prompt) into a visible, auditable
pipeline:

```
USER → ENTER MISSION & DATASET → PLANNER CREATES TASKS → AGENTS EXECUTE
     → EXPERIMENT RUNS SAFELY → CRITIC REVIEWS → SYSTEM ITERATES
     → EVIDENCE CLASSIFIED & RECORDED IN LEDGER → USER SEES FINAL REPORT
```

…and renders the whole thing inside a live, interactive **3D AI laboratory** or **2D Pixel Lab**.

---

## Features

- **Real Dataset Ingestion & Validation** — attach real CSV/JSON tabular records or choose from 1-click verified datasets (Titanic, California Housing, Heart Disease). Mounted directly into isolated execution workspaces for empirical ground-truth benchmarking.
- **Evidence Classification & Mission Ledger** — automatic trust badges (`REAL EVIDENCE · DATASET VALIDATED` vs `SYNTHETIC SANDBOX`) and tamper-evident step-by-step decision audit logs.
- **Multi-agent system** — Planner, Researcher, Coder, **Tester**, Scientist,
  Critic, Analyst and Memory agents with typed, structured inter-agent messages.
- **Task graph** — objectives → tasks with dependencies, priorities,
  retries, cancellation and timeouts.
- **Self-improvement loop** — experiment → evaluate → critique → revise,
  capped by `MAX_AGENT_ITERATIONS` (no unbounded loops).
- **Human-approval checkpoint** — optionally pauses every mission after
  research and waits for an explicit Approve/Reject decision (Settings → toggle).
- **Safe experiments** — generated code runs in an isolated subprocess
  (or Docker container) with hard time/memory/CPU limits, a restricted
  filesystem and **no network**. Output, exit codes and metrics are captured.
- **Long-term memory** — curated memories with types (FACT, SOLUTION,
  FAILURE…), deduplication, keyword search and optional semantic search.
- **Real-time events** — a standardized event stream over WebSockets drives
  the timeline, dashboards and the 3D world.
- **Interactive 3D lab** — a central TejaX Core surrounded by 8 agent
  stations that light up, pulse and flash with real backend activity.
  Rotate / zoom / click stations to inspect agents. Includes a performance
  mode and a cinematic **camera auto-tour**.
- **Sound cues** — optional synthesized tones for task completion, experiment
  pass/fail, approvals and mission end (Settings → toggle).
- **Command Center, Missions, Agents, Experiments, Memory, Analytics,
  Observability and Settings** dashboards.
- **Company website** — a single-page, cinematic TejaX site (hero, mission,
  vision, technology, projects, innovation, future, about) with a generative
  3D particle-wave background that reacts to the cursor and scroll. The site
  and the lab are **one connected app**: "Enter TejaX" drops straight into the
  live platform, and live telemetry on the site is read from the same backend.
- **Demo Mode** — the full pipeline runs with **no model and no API key**,
  so the system can always be demonstrated and integration-tested.
- **Model abstraction** — `ModelProvider` interface with **demo**,
  **OpenAI-compatible** and **Ollama** providers. Runtime-configurable from the
  Settings panel with health checks and a connection test. Local-first,
  free-first.

## Architecture

```
apps/
  api/        FastAPI backend (orchestration, agents, sandbox, memory, events)
  web/        React + TypeScript + Tailwind + Three.js client
packages/     (reserved for shared/ui/types packages)
agents/       per-agent documentation lives in apps/api/tejax/agents
services/     orchestration, memory, experiments, events
database/     migrations (PostgreSQL) + seeds
sandbox/      experiment runners (local + docker)
docker/       Dockerfiles
docs/         architecture notes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Three.js |
| Backend | Python 3.11+, FastAPI, Pydantic, SQLAlchemy 2 |
| Database | SQLite (default) → PostgreSQL + pgvector (production) |
| Cache / events | Redis (optional) + in-process event bus + WebSockets |
| Execution | Isolated subprocess sandbox → Docker sandbox (optional) |
| Dev | Docker Compose, Git |

## Installation

```bash
git clone <your-repo-url> tejax
cd tejax
```

### Running locally (no paid APIs, no Docker)

**1. Backend**

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn tejax.main:app --host 0.0.0.0 --port 8000
```

**2. Frontend** (in another terminal)

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173** and press **▶ RUN DEMO** to watch a complete
mission execute in the 3D lab.

### Running with Docker

```bash
docker compose up --build
```

Starts PostgreSQL(+pgvector), Redis, the API and the web client.

## Environment variables

Copy `.env.example` → `.env` and adjust. Key settings:

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/tejax.db` | SQLite, or `postgresql+psycopg2://…` |
| `REDIS_URL` | `redis://localhost:6379/0` | optional cache/events bus |
| `MODEL_PROVIDER` | `demo` | `demo` / `openai_compat` / `ollama` |
| `MODEL_NAME` | — | model name (e.g. `llama3.1`, `gpt-4o-mini`) |
| `BASE_URL` / `API_KEY` | — | OpenAI-compatible endpoint + key (optional) |
| `OLLAMA_URL` | `http://localhost:11434` | local Ollama |
| `MAX_AGENT_ITERATIONS` | `5` | cap on improve-loop iterations |
| `EXPERIMENT_TIMEOUT` | `30` | sandbox wall-clock timeout (s) |
| `SANDBOX_BACKEND` | `local` | `local` or `docker` |
| `ENABLE_WEB_RESEARCH` | `false` | opt-in live web research |
| `ENABLE_DEMO_MODE` | `true` | offline demo pipeline |
| `ENABLE_HUMAN_APPROVAL` | `false` | pause missions for Approve/Reject after research |

The model provider, model name, base URL, API key and approval setting can
also be changed **at runtime** from **Settings → Model provider** (persisted to
`apps/api/data/runtime.json`), with a health indicator and a
**⚡ Test connection** button.

## Demo Mode

Demo Mode runs a real, end-to-end mission — *"Design an AI system for traffic
accident prediction"* — through the full Planner → Researcher → Coder →
Tester → Scientist → Critic → Analyst → Memory pipeline **without any AI
model**. The 3D lab, timeline and dashboards all react to the simulated
events. Click **▶ RUN DEMO** from the Command Center or Settings.

## Adding a model provider

Implement the `ModelProvider` interface in `apps/api/tejax/providers/model.py`:

```python
class ModelProvider(ABC):
    async def generate(self, system: str, prompt: str, **kw) -> ModelResult: ...
    async def stream(self, system: str, prompt: str, **kw): ...
    async def embed(self, text: str) -> list[float] | None: ...
```

Register it in `build_provider()` and set `MODEL_PROVIDER` accordingly. If a
provider errors, the orchestrator falls back to the demo provider — a missing
model never crashes a mission.

## Creating an agent

1. Subclass `BaseAgent` in `apps/api/tejax/agents/`.
2. Implement `async def run(self, ctx: AgentContext, task) -> dict`.
3. Register it in `AGENT_REGISTRY` (`apps/api/tejax/agents/__init__.py`).
4. Add its 3D station in `apps/web/src/lib/agents.ts`.

## Creating an experiment

Experiments are `{code, hypothesis, iteration}` objects run by the Scientist
through the sandbox. Generated code emits metrics with the marker:

```python
print("__TEJAX_METRIC__: " + json.dumps({"score": 0.912}))
```

The runner extracts metrics, enforces limits and records
`code / stdout / stderr / exit_code / execution_time / metrics / status`.

## Security

- **Generated code is always untrusted.** It runs in an isolated subprocess
  (or disposable Docker container) with memory/CPU/time limits, a restricted
  environment, and no network access.
- The AI never controls the host machine and never receives secrets or
  environment credentials.
- Inputs are validated (Pydantic); output sizes are truncated.
- No secrets are committed — use `.env` (see `.env.example`).

## Roadmap

- More specialized agents and multi-step approval workflows
- Knowledge graphs + browser research (opt-in)
- Vision / audio multi-modal inputs
- Distributed agents and benchmarking suites
- Collaborative human + AI workflows

## Limitations

- Research defaults to a **curated local knowledge base**, not live web
  search; unverified domains report "Insufficient evidence".
- Experiments use **deterministic simulations** unless a real model/data is
  provided — results must be validated on real datasets before any real-world
  use.
- Single-process deployment (in-process event bus); PostgreSQL/Redis are
  wired but optional.
- The UI is desktop-first; mobile remains usable but reduced.

## Author & Creator

**Teja Priyan**
- GitHub: [@TejaPriyan](https://github.com/TejaPriyan)
- Project: [TejaX — AI Experimentation & Agent Engineering Platform](https://github.com/TejaPriyan/TejaX)

## License

MIT License — Copyright (c) 2026 **Teja Priyan**. See [`LICENSE`](./LICENSE) for full details.
