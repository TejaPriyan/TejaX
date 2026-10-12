"""Public, browser-isolated AI advisory beta. Never executes generated code.

This entry point deliberately does not import the single-operator API, its
shared memory, runtime model editor, or experiment runners.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time

import httpx
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

STAGES = [
    ('planner', 'PLANNING', 'Clarify the objective and propose a practical plan.'),
    ('researcher', 'RESEARCHING', 'Explain relevant knowledge, assumptions and uncertainties. You have no web access; do not invent citations.'),
    ('coder', 'DEVELOPING', 'Propose a concrete solution, including code when useful. Do not claim you executed anything.'),
    ('critic', 'EVALUATING', 'Review the proposed solution for errors, missing assumptions and limitations. No tests have been executed.'),
    ('analyst', 'EVALUATING', 'Write the final answer to the user, incorporating the review. Include practical next steps and clearly identify unverified claims.'),
]
ROLES = ['planner', 'researcher', 'coder', 'tester', 'scientist', 'critic', 'analyst', 'memory']
ACTIVE = {'PLANNING', 'RESEARCHING', 'DEVELOPING', 'EVALUATING', 'PAUSED'}


def utcnow():
    return datetime.now(timezone.utc).isoformat()


async def groq_generate(system: str, prompt: str):
    key = os.getenv('GROQ_API_KEY', '').strip()
    if not key:
        raise RuntimeError('The operator has not configured the Groq API key.')
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(3):
            response = await client.post('https://api.groq.com/openai/v1/chat/completions',
                headers={'Authorization': f'Bearer {key}'}, json={
                'model': os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b'),
                'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
                'max_completion_tokens': 1600, 'temperature': .3,
                })
            if response.status_code != 429 or attempt == 2:
                break
            try:
                delay = float(response.headers.get('retry-after', '20'))
            except ValueError:
                delay = 20
            if not 0 <= delay <= 60:
                break
            await asyncio.sleep(max(1, delay))
    if response.status_code == 429:
        raise RuntimeError('Groq usage limit reached. Wait and retry later.')
    if response.status_code in (401, 403):
        raise RuntimeError('Groq rejected the server credentials. The operator must check the API key.')
    if not response.is_success:
        raise RuntimeError(f'Groq request failed (HTTP {response.status_code}). No demo fallback was used.')
    data = response.json()
    answer = data['choices'][0]['message'].get('content')
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError('Groq returned no answer. No demo fallback was used.')
    return answer[:16000], data.get('usage', {})


class MissionInput(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    description: str = Field(default='', max_length=4000)
    dataset_filename: str | None = None
    dataset_content: str | None = None


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in ('POST', 'PUT', 'PATCH'):
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > 32768:
                return await JSONResponse({'detail': 'Request exceeds 32 KB.'}, status_code=413)(scope, receive, send)
            if not message.get('more_body'):
                break
        delivered = False
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()
        await self.app(scope, replay, send)


def create_hosted_app(db_path=None, generate=None, secure=None):
    db_path = Path(db_path or os.getenv('HOSTED_DB_PATH', './data/hosted.db'))
    generate = generate or groq_generate
    secure = bool(os.getenv('RENDER')) if secure is None else secure
    secret = os.getenv('SESSION_SECRET', '').encode() or secrets.token_bytes(32)
    running, controls, sockets = {}, {}, {}
    started_this_boot = 0
    model = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

    @contextmanager
    def connection():
        db = sqlite3.connect(db_path)
        try:
            with db:
                yield db
        finally:
            db.close()

    def save(owner, mission):
        with connection() as db:
            db.execute('INSERT OR REPLACE INTO missions VALUES (?, ?, ?, ?)',
                (mission['id'], owner, mission['_created'], json.dumps(mission)))

    def items(owner):
        with connection() as db:
            return [json.loads(row[0]) for row in db.execute('SELECT data FROM missions WHERE owner=? ORDER BY created DESC', (owner,))]

    def owned(owner, mid):
        with connection() as db:
            row = db.execute('SELECT data FROM missions WHERE id=? AND owner=?', (mid, owner)).fetchone()
        if not row:
            raise HTTPException(404, 'Mission not found')
        return json.loads(row[0])

    def public(m):
        return {key: value for key, value in m.items() if not key.startswith('_')}

    def signature(owner):
        return hmac.new(secret, owner.encode(), hashlib.sha256).hexdigest()

    def read_cookie(value):
        if not value or len(value) != 97:
            return None
        owner, sep, digest = value.partition('.')
        return owner if sep and len(owner) == 32 and hmac.compare_digest(signature(owner), digest) else None

    async def event(owner, m, kind, payload=None):
        ev = {'eventId': secrets.token_hex(16), 'type': kind, 'timestamp': int(time.time()*1000),
            'missionId': m['id'], 'agentId': None, 'payload': payload or {}}
        m['_timeline'] = (m['_timeline'] + [ev])[-100:]
        save(owner, m)
        for ws in list(sockets.get(owner, [])):
            try:
                await asyncio.wait_for(ws.send_json(ev), timeout=1)
            except Exception:
                sockets[owner].discard(ws)

    async def checkpoint(owner, m, ctrl):
        while ctrl['paused']:
            if ctrl['cancel']:
                raise asyncio.CancelledError()
            await asyncio.sleep(.1)
        if ctrl['cancel']:
            raise asyncio.CancelledError()

    async def run(owner, mid):
        m = owned(owner, mid)
        ctrl = controls[mid]
        outputs = []
        try:
            for index, (role, phase, instruction) in enumerate(STAGES):
                await checkpoint(owner, m, ctrl)
                m['status'], m['currentPhase'] = phase, phase
                task = m['_tasks'][index]
                task['status'], task['attempts'] = 'RUNNING', 1
                await event(owner, m, 'AGENT_STATUS', {'agentType': role, 'status': 'ACTIVE', 'currentTask': instruction, 'progress': .2})
                prompt = f"Mission: {m['title']}\nContext: {m['description']}\n"
                prompt += '\n'.join(f'{STAGES[i][0]}: {value[:1500]}' for i, value in enumerate(outputs))
                before = time.monotonic()
                try:
                    text, usage = await generate(
                        'You are TejaX, an AI advisory assistant. ' + instruction +
                        ' Be concise and helpful. You cannot browse, run code, train models or test anything. Never claim measured results.', prompt)
                except Exception:
                    m['_usage'].append({'provider': 'groq', 'model': model, 'agent': role,
                        'latencyMs': round((time.monotonic()-before)*1000), 'ok': False,
                        'tokensIn': None, 'tokensOut': None})
                    raise
                outputs.append(text)
                m['_usage'].append({'provider': 'groq', 'model': model, 'agent': role,
                    'latencyMs': round((time.monotonic()-before)*1000), 'ok': True,
                    'tokensIn': usage.get('prompt_tokens', 0), 'tokensOut': usage.get('completion_tokens', 0)})
                task['status'] = 'COMPLETED'
                await event(owner, m, 'AGENT_STATUS', {'agentType': role, 'status': 'ONLINE', 'currentTask': 'Response received', 'progress': 1})
                if ctrl['paused']:
                    m['status'] = 'PAUSED'
                    await event(owner, m, 'MISSION_PAUSED')
                await checkpoint(owner, m, ctrl)
            m['report'] = {
                'problem': m['title'], 'approach': outputs[0], 'research': outputs[1],
                'agents_involved': [s[0] for s in STAGES], 'experiments': [], 'iterations': 0,
                'failures': [], 'improvements': [outputs[3]],
                'final_solution': outputs[4] + '\n\nProposed implementation (not executed):\n' + outputs[2],
                'confidence': 'AI-generated advice; not independently verified.',
                'limitations': ['No code, experiments or tests were executed.', 'No live web research was performed.',
                    'This free beta loses history when the server restarts. Save results you need.', 'Your mission text is sent to Groq.'],
                'next_steps': ['Review the proposed solution and test it in an isolated environment.'],
                'evidence_type': 'UNKNOWN', 'sandbox_security': 'DISABLED',
                'provenance_summary': {'model_provider': 'groq', 'model_name': model, 'evidence_type': 'UNKNOWN',
                    'sandbox_type': 'DISABLED', 'network_isolated': False, 'total_iterations': 0, 'score_trajectory': [], 'final_score': None},
                'ledger': [{'step': i+1, 'phase': stage[1], 'event': stage[0] + ' AI response received',
                    'detail': 'Model output only; no execution or measurement.'} for i, stage in enumerate(STAGES)],
            }
            m['status'], m['currentPhase'], m['completedAt'] = 'COMPLETED', 'FINAL_RESULT', utcnow()
            await event(owner, m, 'MISSION_COMPLETED', {'report': m['report']})
        except asyncio.CancelledError:
            m['status'], m['completedAt'] = 'CANCELLED', utcnow()
            await event(owner, m, 'MISSION_CANCELLED')
            raise
        except Exception as exc:
            # HTTP response bodies and request headers are never returned or logged.
            m['error'] = str(exc) if isinstance(exc, RuntimeError) else 'The AI request failed or timed out. Please retry later.'
            m['status'], m['currentPhase'], m['completedAt'] = 'FAILED', 'FAILED', utcnow()
            await event(owner, m, 'MISSION_FAILED', {'error': m['error']})
        finally:
            for task in m['_tasks']:
                if task['status'] in ('RUNNING', 'PENDING'):
                    task['status'] = 'CANCELLED' if m['status'] == 'CANCELLED' else 'FAILED'
            save(owner, m)
            running.pop(mid, None)
            controls.pop(mid, None)

    async def bounded_run(owner, mid):
        try:
            await asyncio.wait_for(run(owner, mid), timeout=300)
        except asyncio.TimeoutError:
            m = owned(owner, mid)
            m.update(status='FAILED', error='Mission exceeded the five-minute beta limit.', completedAt=utcnow())
            await event(owner, m, 'MISSION_FAILED', {'error': m['error']})

    @asynccontextmanager
    async def lifespan(app):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with connection() as db:
            db.execute('CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, owner TEXT NOT NULL, created REAL NOT NULL, data TEXT NOT NULL)')
            db.execute('CREATE INDEX IF NOT EXISTS mission_owner ON missions(owner)')
            # This beta intentionally has temporary, process-scoped browser sessions.
            if not os.getenv('SESSION_SECRET'):
                db.execute('DELETE FROM missions')
            else:
                for mid, raw in db.execute('SELECT id,data FROM missions').fetchall():
                    m = json.loads(raw)
                    if m['status'] in ACTIVE:
                        m.update(status='FAILED', error='Server restarted during this mission.', completedAt=utcnow())
                        db.execute('UPDATE missions SET data=? WHERE id=?', (json.dumps(m), mid))
        yield
        for task in list(running.values()):
            task.cancel()
        await asyncio.gather(*list(running.values()), return_exceptions=True)

    app = FastAPI(title='TejaX online AI beta', lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware('http')
    async def session(request, call_next):
        origin = request.headers.get('origin')
        expected = os.getenv('RENDER_EXTERNAL_URL', str(request.base_url).rstrip('/'))
        if origin and origin != expected:
            return JSONResponse({'detail': 'Cross-origin requests are not allowed.'}, status_code=403)
        owner = read_cookie(request.cookies.get('tejax_session'))
        fresh = owner is None
        request.state.owner = owner or secrets.token_hex(16)
        response = await call_next(request)
        if fresh and request.url.path.startswith('/api/'):
            value = request.state.owner + '.' + signature(request.state.owner)
            response.set_cookie('tejax_session', value, httponly=True, secure=secure, samesite='strict', max_age=86400)
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        return response

    app.add_middleware(BodyLimit)

    @app.get('/healthz')
    async def health():
        return {'ok': True, 'mode': 'advisory', 'providerConfigured': bool(os.getenv('GROQ_API_KEY'))}

    @app.get('/api/system/status')
    async def status(request: Request):
        mine = items(request.state.owner)
        active = next((m for m in mine if m['id'] in running), None)
        return {'app': 'TejaX', 'version': '0.3.0', 'mode': 'GROQ AI · ADVISORY BETA', 'hosted': True,
            'agentsOnline': 5, 'memoryCount': 0, 'experimentsRunning': 0, 'runningMissions': int(active is not None),
            'websocketClients': len(sockets.get(request.state.owner, [])), 'humanApproval': False,
            'currentMission': {'id': active['id'], 'title': active['title'], 'status': active['status'], 'phase': active['currentPhase']} if active else None,
            'modelStatus': {'provider': 'groq', 'model': model, 'ok': None},
            'notice': 'Real AI advice via Groq. Code is not executed. Missions are private to this browser session; history is temporary and may reset. Do not submit secrets or sensitive data.'}

    @app.get('/api/missions')
    async def missions(request: Request):
        return [public(m) for m in items(request.state.owner)]

    @app.post('/api/missions', status_code=201)
    async def create(body: MissionInput, request: Request):
        if body.dataset_filename or body.dataset_content:
            raise HTTPException(422, 'Dataset uploads are unavailable in the online advisory beta. Describe your data without sensitive records.')
        with connection() as db:
            db.execute('DELETE FROM missions WHERE created < ?', (time.time()-86400,))
            count = db.execute('SELECT count(*) FROM missions').fetchone()[0]
        if count >= 200 or len(items(request.state.owner)) >= 10:
            raise HTTPException(429, 'Temporary mission storage is full. Please try again later.')
        mid = secrets.token_hex(16)
        m = {'id': mid, 'title': body.title, 'description': body.description, 'status': 'CREATED',
            'currentPhase': '', 'maxIterations': 1, 'error': None, 'createdAt': utcnow(), 'startedAt': None,
            'completedAt': None, 'report': None, 'objectives': [], 'datasetFilename': None, 'datasetMetadata': None,
            '_created': time.time(), '_starts': [], '_timeline': [], '_usage': [],
            '_tasks': [{'id': mid+'-'+role, 'agentType': role, 'description': instruction, 'status': 'PENDING',
                'priority': 1, 'dependencies': [], 'error': None, 'attempts': 0} for role, _, instruction in STAGES]}
        save(request.state.owner, m)
        return public(m)

    @app.get('/api/missions/{mid}')
    async def mission(mid: str, request: Request):
        return public(owned(request.state.owner, mid))

    @app.post('/api/missions/{mid}/start')
    async def start(mid: str, request: Request):
        nonlocal started_this_boot
        owner = request.state.owner
        m = owned(owner, mid)
        if mid in running:
            controls[mid]['paused'] = False
            m['status'] = m['currentPhase'] if m['currentPhase'] in ACTIVE else 'PLANNING'
            save(owner, m)
            return {'ok': True}
        if not os.getenv('GROQ_API_KEY') and generate is groq_generate:
            raise HTTPException(503, 'The operator must configure Groq before missions can run.')
        recent = sum(sum(t > time.time()-3600 for t in x['_starts']) for x in items(owner))
        if running or recent >= 3 or started_this_boot >= 20:
            raise HTTPException(429, 'Beta capacity reached: one mission at a time, three runs per browser per hour, and twenty runs per server session. Try later.')
        started_this_boot += 1
        m['_starts'].append(time.time())
        m.update(status='PLANNING', currentPhase='PLANNING', startedAt=utcnow(), completedAt=None, report=None, error=None)
        m['_usage'], m['_timeline'] = [], []
        for task in m['_tasks']:
            task.update(status='PENDING', attempts=0)
        save(owner, m)
        controls[mid] = {'paused': False, 'cancel': False}
        running[mid] = asyncio.create_task(bounded_run(owner, mid))
        def cleanup(task):
            if running.get(mid) is task:
                running.pop(mid, None)
                controls.pop(mid, None)
        running[mid].add_done_callback(cleanup)
        return {'ok': True}

    @app.post('/api/missions/{mid}/{action}')
    async def control(mid: str, action: str, request: Request):
        m = owned(request.state.owner, mid)
        if action not in ('pause', 'cancel'):
            raise HTTPException(403, 'This action is unavailable in the advisory beta.')
        if mid not in controls:
            raise HTTPException(409, 'Mission is not running.')
        if action == 'pause':
            controls[mid]['paused'] = True
            m['status'] = 'PAUSED'
            save(request.state.owner, m)
        else:
            controls[mid]['cancel'] = True
            running[mid].cancel()
            m.update(status='CANCELLED', completedAt=utcnow())
            for task in m['_tasks']:
                if task['status'] in ('RUNNING', 'PENDING'):
                    task['status'] = 'CANCELLED'
            save(request.state.owner, m)
        return {'ok': True}

    def agents(m):
        return [{'id': m['id']+'-'+role, 'type': role, 'name': role.title(), 'missionId': m['id'],
            'status': ('ACTIVE' if any(t['agentType']==role and t['status']=='RUNNING' for t in m['_tasks']) else 'ONLINE') if role in [s[0] for s in STAGES] else 'OFFLINE',
            'currentTask': next((t['description'] for t in m['_tasks'] if t['agentType']==role), 'Unavailable: no code execution or shared memory'),
            'progress': 1 if any(t['agentType']==role and t['status']=='COMPLETED' for t in m['_tasks']) else 0} for role in ROLES]

    @app.get('/api/missions/{mid}/{section}')
    async def details(mid: str, section: str, request: Request):
        m = owned(request.state.owner, mid)
        if section == 'agents': return agents(m)
        if section == 'tasks': return m['_tasks']
        if section == 'timeline': return m['_timeline']
        if section == 'experiments': return []
        raise HTTPException(404, 'Not found')

    @app.get('/api/agents')
    async def all_agents(request: Request, mission_id: str | None = None):
        mine = [owned(request.state.owner, mission_id)] if mission_id else items(request.state.owner)[:1]
        return agents(mine[0]) if mine else []

    @app.get('/api/system/metrics')
    async def metrics(request: Request):
        mine = items(request.state.owner)
        tasks = [t for m in mine for t in m['_tasks']]
        return {'tasksCompleted': sum(t['status']=='COMPLETED' for t in tasks), 'tasksFailed': sum(t['status']=='FAILED' for t in tasks),
            'successfulExperiments': 0, 'failedExperiments': 0, 'experimentSuccessRate': 0, 'averageIterations': 0,
            'improvementPercentage': 0, 'agentUtilization': round(100*sum(t['status']=='RUNNING' for t in tasks)/len(tasks),1) if tasks else 0,
            'missionCompletionRate': round(100*sum(m['status']=='COMPLETED' for m in mine)/len(mine),1) if mine else 0,
            'memoryRetrievals': 0, 'errorRecoveryRate': 0, 'totalMissions': len(mine)}

    @app.get('/api/system/model')
    async def model_status():
        return {'config': {'provider': 'groq', 'model': model, 'base_url': '', 'api_key': '', 'human_approval': False},
            'effectiveProvider': 'groq', 'effectiveModel': model, 'health': {'provider': 'groq', 'ok': None}}

    @app.get('/api/system/observability')
    async def observations(request: Request):
        runs = [r for m in items(request.state.owner) for r in m['_usage']]
        return {'modelRuns': runs[-50:], 'totals': {'runs': len(runs), 'failures': sum(not r['ok'] for r in runs),
            'avgLatencyMs': round(sum(r['latencyMs'] for r in runs)/len(runs)) if runs else 0}}

    @app.get('/api/memory/search')
    async def memory(q: str = ''):
        return {'query': q, 'results': []}

    @app.api_route('/api/{path:path}', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    async def unavailable(path: str):
        raise HTTPException(403, 'This feature is unavailable in the public advisory beta. Model settings are managed by the operator.')

    @app.websocket('/ws')
    async def websocket(ws: WebSocket):
        owner = read_cookie(ws.cookies.get('tejax_session'))
        expected = os.getenv('RENDER_EXTERNAL_URL', str(ws.url).replace('ws://','http://').replace('wss://','https://').rsplit('/ws',1)[0])
        if not owner or ws.headers.get('origin') != expected or sum(map(len, sockets.values())) >= 64 or len(sockets.get(owner, [])) >= 2:
            await ws.close(code=1008)
            return
        await ws.accept()
        sockets.setdefault(owner, set()).add(ws)
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            sockets[owner].discard(ws)
            if not sockets[owner]: sockets.pop(owner, None)

    static = Path(__file__).resolve().parents[2] / 'web' / 'dist'
    if static.is_dir():
        app.mount('/', StaticFiles(directory=static, html=True), name='website')
    return app


app = create_hosted_app()
