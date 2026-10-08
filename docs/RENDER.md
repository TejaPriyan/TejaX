# Render Free: real AI advisory beta

The public entry point is `tejax.hosted:app`. It uses Groq for five actual model
calls (plan, knowledge analysis, proposed implementation, review, final answer).
It never imports or invokes experiment runners, never executes generated code,
does not browse, does not train models, and reports no fabricated test scores.
The existing local lab and full Docker pipeline remain separate.

Use the same Render service for the compiled website and backend. This keeps
HTTP-only session cookies and WebSockets on one origin; do not point a separate
Vercel frontend at this session-based beta.

Existing Render Python service settings:

- Branch: `codex/tejax-lab-reliability` (until the reviewed change is merged)
- Root directory: empty (repository root)
- Build: `pip install -r apps/api/requirements.txt && npm ci --prefix apps/web && VITE_API_URL=/ VITE_WS_URL=/ws npm run build --prefix apps/web`
- Start: `uvicorn tejax.hosted:app --app-dir apps/api --host 0.0.0.0 --port $PORT --workers 1`
- Health check: `/healthz`
- Instance: Free; no additional database/service created
- Environment: `PYTHON_VERSION=3.12.10`, `NODE_VERSION=22`,
  `GROQ_MODEL=openai/gpt-oss-120b`, and `GROQ_API_KEY` entered by the operator.

Do not place the key in a VITE variable, source file, screenshot or chat.
Deploy the hosted entry point before adding the key: the old operator API
does not provide the access restrictions of this public entry point.

Browser sessions are signed, HTTP-only and secure on Render. Each API read,
write and WebSocket event is scoped to that session. These are anonymous
browser sessions, not accounts: clearing cookies loses access. No dataset
uploads, shared memory, model editor, public model-test endpoint or demo
fallback is exposed. Inputs go to Groq; the UI states this before submission.

Limits: 32 KB request body, 300-character title, 4,000-character context,
five model calls of at most 1,600 completion tokens, one mission globally at
a time, three runs per browser per hour, and twenty starts per server process.
Each stage retries HTTP 429 at most twice when the provider requests a wait
of no more than 60 seconds. Missions have a five-minute overall timeout.
Previous-stage context is capped to keep requests small for the free tier.
The global limit bounds cookie-reset bypass. These are beta limits, not a
billing guarantee; set provider-side limits and use a free Groq account if
zero paid usage is required. A Render restart resets process counters.

SQLite data is temporary on Render Free. By default sessions/data are cleared
at process startup and records expire after 24 hours. Users can download their
report. This is not durable storage. A durable multi-user service requires
an external database, real accounts, durable job workers and quotas before
expanding access. No claim of production durability or validated AI science.

Rollback: restore the previous branch/root/build/start settings together;
remove the Groq key before restoring the old shared operator API.
