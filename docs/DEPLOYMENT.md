# Deploying the lab safely

TejaX requires a persistent **single-process FastAPI service**. Vercel/GitHub Pages host the frontend; their SPA fallback is not a backend or WebSocket server. Do not point API requests at that fallback.

## Frontend

Set these at build time (never put model secrets in VITE variables):

```
VITE_API_URL=https://your-api-host.example
VITE_WS_URL=wss://your-api-host.example/ws
```

Omit both locally: Vite proxies `/api` and `/ws` to localhost:8000. `TEJAX_API_URL` optionally changes this development proxy target. The production host needs valid TLS, WebSocket upgrade support and CORS allowing the frontend origin.

## Backend

Run `uvicorn tejax.main:app --host 0.0.0.0 --port 8000 --workers 1` from `apps/api` with:

```
ENVIRONMENT=production
DATA_DIR=/persistent/tejax
DATABASE_URL=sqlite:////persistent/tejax/tejax.db
CORS_ORIGINS=https://your-preview.example,https://tejax.vercel.app
SANDBOX_BACKEND=docker
MODEL_PROVIDER=demo
```

The Docker execution host must have Docker available and the `python:3.12-slim` image provisioned. Do not expose the Docker socket to the browser. Local subprocess execution is for trusted development and is refused in production. It does not isolate the host filesystem/network and Windows does not provide the Unix memory limits.

**This is a single-operator lab, not a multi-tenant public service.** Place the API and frontend behind an authenticated access gateway before enabling remote users or paid providers. CORS does not authenticate users. Native accounts/tenant isolation and distributed job execution are not implemented. Model configuration is shared by the operator. Do not expose its API publicly without that access boundary.

Mission records and events persist in the database. Active tasks are in process; after restart, interrupted runs are marked failed with an explicit retry message, not silently claimed to be running. Multiple workers/replicas are unsupported. Use a durable worker queue before scaling.

## Preview gate

1. Preserve the current production deployment and the previous commit ID.
2. Use an isolated preview backend/database. Build the frontend with that API URL.
3. Run backend tests and `npm ci && npm run build` in `apps/web`.
4. Check `/api/system/status` returns JSON, WebSocket `/ws` connects, and pixel assets load.
5. Run the demo to a report; create a dataset mission; exercise pause/resume, cancellation and approval. Reload to verify persisted results.
6. Verify disconnected errors and recovery; inspect desktop/mobile and reduced-motion mode.
7. Test real provider calls only with the operator's configuration; demo success does not verify any cloud model.
8. Promote only after those checks pass on the actual preview host. Verify the production URL immediately afterward.

Rollback: restore the previous frontend deployment and backend image/commit together; preserve the persistent database and backup. This patch requires no schema migration. Do not deploy only the frontend and call the backend repaired.

## Evidence and limits

Demo mode is explicit. Configured provider failure fails visibly instead of masquerading as successful AI output. A dataset attachment is not proof of validated evidence. The built-in dataset evaluator measures a majority-label baseline on a fixed split; it assumes the last column is a categorical target and reports that assumption. It is not a regression model or domain validation. Cost is not metered. The existing domain simulators/sample gallery are illustrative, not mission-generated records.
