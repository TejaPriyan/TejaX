"""Serve the compiled lab and API on loopback, with free demo defaults."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
import threading
import time
import webbrowser
from starlette.websockets import WebSocket

ROOT = Path(__file__).resolve().parents[1]


class LocalOriginGuard:
    """Reject foreign browser origins, including WebSocket handshakes."""

    def __init__(self, app, origins):
        self.app = app
        self.origins = origins

    async def __call__(self, scope, receive, send):
        if scope['type'] in ('http', 'websocket'):
            headers = dict(scope.get('headers', []))
            origin = headers.get(b'origin')
            if origin is not None and origin.decode('latin1') not in self.origins:
                if scope['type'] == 'websocket':
                    await send({'type': 'websocket.close', 'code': 1008})
                else:
                    from starlette.responses import JSONResponse
                    await JSONResponse({'detail': 'Foreign browser origin is not allowed.'}, status_code=403)(scope, receive, send)
                return
        await self.app(scope, receive, send)


def create_local_app(port: int = 8765):
    dist = ROOT / 'apps' / 'web' / 'dist'
    if not (dist / 'index.html').is_file():
        raise RuntimeError('Build the website first, or use Start-TejaX.cmd.')
    data = ROOT / '.local-lab' / 'data'
    data.mkdir(parents=True, exist_ok=True)
    origins = {f'http://127.0.0.1:{port}', f'http://localhost:{port}'}
    os.environ.update(
        ENVIRONMENT='development', MODEL_PROVIDER='demo', SANDBOX_BACKEND='local',
        DATA_DIR=str(data), DATABASE_URL='sqlite:///' + (data / 'tejax.db').as_posix(),
        CORS_ORIGINS=','.join(sorted(origins)),
    )
    sys.path.insert(0, str(ROOT / 'apps' / 'api'))
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    from starlette.staticfiles import StaticFiles
    from tejax.api.app import app
    from tejax.runtime import get_runtime

    # Start free even if the last session selected a paid provider. Do not
    # rewrite the saved configuration or any existing development database.
    runtime = get_runtime()
    runtime.config.provider = 'demo'
    runtime.config.model = ''
    runtime.config.base_url = ''
    runtime.config.api_key = ''
    app.add_middleware(LocalOriginGuard, origins=origins)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost'])

    @app.get('/__local/status')
    async def local_status():
        return {'app': 'TejaX local lab', 'root': str(ROOT)}

    # Real API routes and /ws were registered first; static files never
    # intercept them. Unknown API paths stay 404 instead of returning index.html.
    @app.websocket('/{path:path}')
    async def missing_websocket(websocket: WebSocket, path: str):
        await websocket.close(code=1008)

    app.mount('/', StaticFiles(directory=dist, html=True), name='local-website')
    return app


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Port must be between 1024 and 65535.')
    import uvicorn
    server = uvicorn.Server(uvicorn.Config(create_local_app(args.port), host='127.0.0.1', port=args.port, workers=1))
    if not args.no_browser:
        def open_when_ready():
            for _ in range(120):
                if server.started:
                    webbrowser.open(f'http://127.0.0.1:{args.port}')
                    return
                if server.should_exit:
                    return
                time.sleep(.25)
        threading.Thread(target=open_when_ready, daemon=True).start()
    server.run()


if __name__ == '__main__':
    main()
