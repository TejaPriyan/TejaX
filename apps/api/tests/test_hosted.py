import asyncio
import time

from fastapi.testclient import TestClient
import pytest
from starlette.websockets import WebSocketDisconnect

from tejax.hosted import create_hosted_app


def wait_done(client, mid):
    for _ in range(200):
        m = client.get('/api/missions/' + mid).json()
        if m['status'] in ('COMPLETED', 'FAILED', 'CANCELLED'):
            return m
        time.sleep(.01)
    pytest.fail('Mission did not finish')


def test_real_pipeline_contract_and_browser_isolation(tmp_path):
    calls = []
    async def provider(system, prompt):
        calls.append(prompt)
        return 'MODEL RESPONSE: proposed solution; not executed', {'prompt_tokens': 12, 'completion_tokens': 20}
    app = create_hosted_app(tmp_path/'hosted.db', provider, secure=False)
    with TestClient(app) as owner:
        stranger = TestClient(app)
        m = owner.post('/api/missions', json={'title':'Plan a study schedule'}).json()
        mid = m['id']
        assert stranger.get('/api/missions').json() == []
        for suffix in ('', '/tasks', '/timeline', '/agents', '/experiments'):
            assert stranger.get('/api/missions/'+mid+suffix).status_code == 404
        for action in ('start', 'pause', 'cancel'):
            assert stranger.post('/api/missions/'+mid+'/'+action).status_code == 404
        assert owner.post('/api/missions/'+mid+'/start').status_code == 200
        done = wait_done(owner, mid)
        assert done['status'] == 'COMPLETED'
        assert len(calls) == 5
        assert done['report']['experiments'] == []
        assert done['report']['evidence_type'] == 'UNKNOWN'
        assert done['report']['sandbox_security'] == 'DISABLED'
        assert done['report']['provenance_summary']['final_score'] is None
        assert 'MODEL RESPONSE' in done['report']['final_solution']
        assert len(owner.get('/api/system/observability').json()['modelRuns']) == 5
        assert stranger.get('/api/system/observability').json()['modelRuns'] == []
        assert stranger.get('/api/system/metrics').json()['totalMissions'] == 0
        assert stranger.get('/api/agents', params={'mission_id':mid}).status_code == 404
        stranger.close()


def test_no_model_editor_upload_demo_or_foreign_origin(tmp_path):
    app = create_hosted_app(tmp_path/'hosted.db', secure=False)
    with TestClient(app) as c:
        cookie = c.get('/api/system/status').headers['set-cookie']
        assert 'HttpOnly' in cookie and 'SameSite=strict' in cookie
        for path in ('/api/system/model', '/api/system/model/test', '/api/system/demo', '/api/datasets/upload', '/api/memory'):
            method = c.put if path == '/api/system/model' else c.post
            assert method(path, json={}).status_code == 403
        assert c.post('/api/missions', json={'title':'Test dataset', 'dataset_content':'private'}).status_code == 422
        assert c.post('/api/missions', content='x'*33000).status_code == 413
        assert c.get('/api/missions', headers={'Origin':'https://other.example'}).status_code == 403
        c.get('/api/system/status')
        assert c.cookies.get('tejax_session')
        with pytest.raises(WebSocketDisconnect):
            with c.websocket_connect('/ws', headers={'origin':'https://other.example'}): pass
        with c.websocket_connect('/ws', headers={'origin':'http://testserver'}): pass


def test_provider_failure_never_returns_demo(tmp_path):
    async def broken(system, prompt):
        raise RuntimeError('Groq usage limit reached. Wait and retry later.')
    app = create_hosted_app(tmp_path/'hosted.db', broken, secure=False)
    with TestClient(app) as c:
        mid = c.post('/api/missions', json={'title':'Real AI failure'}).json()['id']
        c.post('/api/missions/'+mid+'/start')
        done = wait_done(c, mid)
        assert done['status'] == 'FAILED'
        assert 'Groq usage limit' in done['error']
        assert done['report'] is None
        assert c.get('/api/system/observability').json()['totals']['failures'] == 1
        assert all(t['status'] == 'FAILED' for t in c.get('/api/missions/'+mid+'/tasks').json())


def test_global_capacity_pause_resume_cancel(tmp_path):
    async def slow(system, prompt):
        await asyncio.sleep(.15)
        return 'AI response', {}
    app = create_hosted_app(tmp_path/'hosted.db', slow, secure=False)
    with TestClient(app) as c:
        mid = c.post('/api/missions', json={'title':'First mission'}).json()['id']
        second = c.post('/api/missions', json={'title':'Second mission'}).json()['id']
        assert c.post('/api/missions/'+mid+'/start').status_code == 200
        assert c.post('/api/missions/'+second+'/start').status_code == 429
        assert c.post('/api/missions/'+mid+'/pause').status_code == 200
        time.sleep(.2)
        assert c.get('/api/missions/'+mid).json()['status'] == 'PAUSED'
        assert c.post('/api/missions/'+mid+'/start').status_code == 200
        assert c.post('/api/missions/'+mid+'/cancel').status_code == 200
        assert wait_done(c,mid)['status'] == 'CANCELLED'
        assert c.post('/api/missions/'+second+'/start').status_code == 200
