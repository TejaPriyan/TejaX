-- TejaX PostgreSQL schema (used by docker-compose init for the `db` service).
-- The application also creates these tables automatically via SQLAlchemy when
-- running against PostgreSQL, so this file primarily documents the schema and
-- enables pgvector from first boot.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(36) PRIMARY KEY,
    username    VARCHAR(120) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missions (
    id             VARCHAR(36) PRIMARY KEY,
    user_id        VARCHAR(36) REFERENCES users(id),
    title          VARCHAR(300) NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    status         VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    current_phase  VARCHAR(32) NOT NULL DEFAULT '',
    max_iterations INTEGER NOT NULL DEFAULT 5,
    error          TEXT,
    report         JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_title ON missions(title);

CREATE TABLE IF NOT EXISTS mission_objectives (
    id          VARCHAR(36) PRIMARY KEY,
    mission_id  VARCHAR(36) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    index       INTEGER NOT NULL,
    title       VARCHAR(400) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      VARCHAR(32) NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_objectives_mission ON mission_objectives(mission_id);

CREATE TABLE IF NOT EXISTS agents (
    id           VARCHAR(36) PRIMARY KEY,
    type         VARCHAR(32) NOT NULL,
    name         VARCHAR(120) NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
    mission_id   VARCHAR(36),
    current_task TEXT,
    progress     DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_mission ON agents(mission_id);

CREATE TABLE IF NOT EXISTS agent_tasks (
    id           VARCHAR(36) PRIMARY KEY,
    mission_id   VARCHAR(36) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    agent_type   VARCHAR(32) NOT NULL,
    description  TEXT NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    priority     INTEGER NOT NULL DEFAULT 1,
    dependencies JSONB NOT NULL DEFAULT '[]',
    input        JSONB,
    output       JSONB,
    error        TEXT,
    attempts     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_mission ON agent_tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);

CREATE TABLE IF NOT EXISTS agent_messages (
    id          VARCHAR(36) PRIMARY KEY,
    mission_id  VARCHAR(36) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    from_agent  VARCHAR(32) NOT NULL,
    to_agent    VARCHAR(32) NOT NULL,
    type        VARCHAR(32) NOT NULL DEFAULT 'TASK',
    content     TEXT NOT NULL,
    priority    VARCHAR(16) NOT NULL DEFAULT 'normal',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_mission ON agent_messages(mission_id);

CREATE TABLE IF NOT EXISTS research_items (
    id           VARCHAR(36) PRIMARY KEY,
    mission_id   VARCHAR(36) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    objective_id VARCHAR(36),
    title        VARCHAR(400) NOT NULL,
    summary      TEXT NOT NULL,
    sources      JSONB NOT NULL DEFAULT '[]',
    confidence   DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_mission ON research_items(mission_id);

CREATE TABLE IF NOT EXISTS experiments (
    id             VARCHAR(36) PRIMARY KEY,
    mission_id     VARCHAR(36) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    name           VARCHAR(300) NOT NULL,
    iteration      INTEGER NOT NULL DEFAULT 1,
    hypothesis     TEXT NOT NULL DEFAULT '',
    status         VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    code           TEXT NOT NULL DEFAULT '',
    stdout         TEXT NOT NULL DEFAULT '',
    stderr         TEXT NOT NULL DEFAULT '',
    exit_code      INTEGER,
    execution_time DOUBLE PRECISION,
    metrics        JSONB,
    error          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_experiments_mission ON experiments(mission_id);

CREATE TABLE IF NOT EXISTS experiment_results (
    id            VARCHAR(36) PRIMARY KEY,
    experiment_id VARCHAR(36) NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    score         DOUBLE PRECISION,
    verdict       VARCHAR(32) NOT NULL DEFAULT 'UNDECIDED',
    analysis      JSONB,
    critique      JSONB,
    improvement   JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_results_experiment ON experiment_results(experiment_id);

CREATE TABLE IF NOT EXISTS memories (
    id          VARCHAR(36) PRIMARY KEY,
    type        VARCHAR(32) NOT NULL,
    content     TEXT NOT NULL,
    source      VARCHAR(120) NOT NULL DEFAULT '',
    mission_id  VARCHAR(36),
    importance  DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_mission ON memories(mission_id);

CREATE TABLE IF NOT EXISTS system_events (
    id          BIGSERIAL PRIMARY KEY,
    event_id    VARCHAR(40) UNIQUE NOT NULL,
    type        VARCHAR(48) NOT NULL,
    timestamp   BIGINT NOT NULL,
    mission_id  VARCHAR(36),
    agent_id    VARCHAR(36),
    payload     JSONB
);
CREATE INDEX IF NOT EXISTS idx_events_mission ON system_events(mission_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(type);

CREATE TABLE IF NOT EXISTS model_runs (
    id          BIGSERIAL PRIMARY KEY,
    provider    VARCHAR(32) NOT NULL,
    model       VARCHAR(120) NOT NULL DEFAULT '',
    agent_type  VARCHAR(32) NOT NULL DEFAULT '',
    latency_ms  INTEGER NOT NULL DEFAULT 0,
    tokens_in   INTEGER NOT NULL DEFAULT 0,
    tokens_out  INTEGER NOT NULL DEFAULT 0,
    ok          BOOLEAN NOT NULL DEFAULT TRUE,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(64) NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    mission_id  VARCHAR(36),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
