# Free local TejaX

No hosting account, domain, credit card or model key is required. The public
Vercel website is separate and does not gain a backend from this setup.

1. Install Python 3.12 and Node.js LTS if they are not already installed.
2. Double-click `Start-TejaX.cmd` in the repository folder.
3. Wait for the website to open at http://127.0.0.1:8765.
4. Choose **Run demo** in the lab. The agents execute the demonstration
   pipeline and produce a report. This is scripted demo mode, not live AI inference.

The first start needs internet to install packages. Later starts reuse them
unless requirements change. Each start builds the current website source.
Leave the terminal window open while using the lab. Press Ctrl+C to stop;
double-click the launcher to start again. Starting it twice opens the running
copy instead of creating another backend. If the port belongs to another app,
the launcher reports it without stopping that app.

Mission records live in `.local-lab/data/tejax.db`, separate from earlier
development or preview databases. They survive restarts. To back them up,
stop the lab and copy `.local-lab/data` somewhere safe. An interrupted mission
is marked failed on restart and can be rerun; it does not silently resume.

The launcher always begins with the demo provider, even if a previous session
selected a paid provider. It does not erase saved provider settings. Selecting
another provider in Settings during a session is a separate, manual choice.
Keep demo mode for free use.

Only loopback connections are accepted. Browser requests from other origins
are rejected, including WebSockets. This is a trusted personal development
setup: the local experiment runner can access the host filesystem and network.
Do not expose it with port forwarding/tunnels or run untrusted generated code.
Public hosting requires the Docker execution and access boundary described in
[DEPLOYMENT.md](DEPLOYMENT.md).

Advanced: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Port 8766`
uses another local port. `-NoBrowser` keeps the browser from opening automatically.
