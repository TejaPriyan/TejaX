param([switch]$NoBrowser, [int]$Port = 8765)
$ErrorActionPreference = 'Stop'
# PowerShell 7 can pass its module search path to Windows PowerShell. Load
# Windows' own utility module explicitly so a double-click and a background
# start resolve the same built-in commands.
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility') -ErrorAction Stop
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535.' }

try {
    $running = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/__local/status" -TimeoutSec 2
    if ($running.app -eq 'TejaX local lab' -and $running.root -eq $repoRoot) {
        Write-Host "TejaX is already running at http://127.0.0.1:$Port"
        if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$Port" }
        exit 0
    }
} catch { }
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { throw "Port $Port is in use. Stop that server or choose another -Port." } finally { $listener.Stop() }

$pythonExe = Join-Path $repoRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) {
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv .venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv .venv }
    else { throw 'Install Python 3.12 from python.org, then run Start-TejaX again.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python environment.' }
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js LTS from nodejs.org, then run Start-TejaX again.' }

New-Item -ItemType Directory -Force -Path '.local-lab' | Out-Null
$requirementsHash = (Get-FileHash 'apps/api/requirements.txt').Hash
$pythonStamp = '.local-lab/python-dependencies.txt'
if (-not (Test-Path $pythonStamp) -or (Get-Content $pythonStamp -Raw).Trim() -ne $requirementsHash) {
    & $pythonExe -m pip install -r apps/api/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed. Check your internet connection and retry.' }
    Set-Content $pythonStamp $requirementsHash
}
$lockHash = (Get-FileHash 'apps/web/package-lock.json').Hash
$nodeStamp = '.local-lab/node-dependencies.txt'
if (-not (Test-Path 'apps/web/node_modules') -or -not (Test-Path $nodeStamp) -or (Get-Content $nodeStamp -Raw).Trim() -ne $lockHash) {
    & npm.cmd ci --prefix apps/web --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed. Check your internet connection and retry.' }
    Set-Content $nodeStamp $lockHash
}

# Explicitly override any remote frontend settings for this local build.
$env:VITE_API_URL = '/'
$env:VITE_WS_URL = '/ws'
& npm.cmd run build --prefix apps/web
if ($LASTEXITCODE -ne 0) { throw 'The website build failed; the server was not started.' }
Write-Host "`nTejaX local lab: http://127.0.0.1:$Port"
Write-Host 'Free demo mode. Keep this window open. Press Ctrl+C to stop.'
$serverArgs = @('scripts/local_server.py', '--port', "$Port")
if ($NoBrowser) { $serverArgs += '--no-browser' }
& $pythonExe @serverArgs
exit $LASTEXITCODE
