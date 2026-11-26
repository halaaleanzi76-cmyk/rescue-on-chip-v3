# Rescue-on-Chip - one-click local start for Windows (PowerShell 5.1+)
# 1) installs missing dependencies  2) starts persistent PostgreSQL  3) applies schema
# 4) starts the Python API  5) starts the web app  6) health-checks  7) opens the browser
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
Set-Location $Root
$ApiPort = 8000
$WebPort = 5173
$Py = Join-Path $Root '.venv\Scripts\python.exe'
New-Item -ItemType Directory -Force (Join-Path $Root '.runtime') | Out-Null
$Logs = Join-Path $Root '.runtime'

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

Step 'Checking Python environment'
if (-not (Test-Path $Py)) {
  & py -3.12 -m venv .venv
  & $Py -m pip install --upgrade pip
  & $Py -m pip install -r requirements-windows.txt
}

Step 'Checking Node dependencies'
if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm }
  pnpm install --frozen-lockfile
}

Step 'Starting PostgreSQL (data in .data\pg)'
& $Py scripts\windows\localdb.py start
if ($LASTEXITCODE -ne 0) { throw 'Database failed to start' }
$env:DATABASE_URL = ((Get-Content .runtime\db.env) -replace '^DATABASE_URL=', '').Trim()

Step 'Applying database migrations'
& $Py scripts\windows\migrate.py
if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }

Step 'Stopping any previous app processes on ports'
foreach ($p in @($ApiPort, $WebPort)) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Step "Starting API on http://127.0.0.1:$ApiPort"
$env:PORT = "$ApiPort"
$api = Start-Process -FilePath $Py -ArgumentList 'artifacts\api-server\main.py' -WorkingDirectory $Root `
  -RedirectStandardOutput "$Logs\api.log" -RedirectStandardError "$Logs\api.err.log" -PassThru -WindowStyle Hidden

Step "Starting web app on http://localhost:$WebPort"
$env:PORT = "$WebPort"; $env:BASE_PATH = '/'; $env:API_PROXY_TARGET = "http://127.0.0.1:$ApiPort"
$web = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'pnpm --filter @workspace/rescue-lab run dev' -WorkingDirectory $Root `
  -RedirectStandardOutput "$Logs\web.log" -RedirectStandardError "$Logs\web.err.log" -PassThru -WindowStyle Hidden
@{ api = $api.Id; web = $web.Id } | ConvertTo-Json | Set-Content "$Logs\pids.json"

Step 'Health checks'
function Wait-Url($url, $name) {
  for ($i = 0; $i -lt 90; $i++) {
    try { $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { Write-Host "  OK  $name" -ForegroundColor Green; return } } catch {}
    Start-Sleep -Seconds 1
  }
  throw "$name did not become healthy - see .runtime\*.log"
}
Wait-Url "http://127.0.0.1:$ApiPort/api/healthz" 'API'
Wait-Url "http://localhost:$WebPort/" 'Web app'
Wait-Url "http://localhost:$WebPort/api/healthz" 'Web -> API proxy'

Write-Host "`nRescue-on-Chip is running:  http://localhost:$WebPort" -ForegroundColor Green
Write-Host "API docs:                   http://127.0.0.1:$ApiPort/api/docs"
Write-Host "Stop everything:            .\stop.ps1"
if (-not $NoBrowser) { Start-Process "http://localhost:$WebPort" }
