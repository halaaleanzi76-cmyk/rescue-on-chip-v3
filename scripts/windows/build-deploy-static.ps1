# Rebuilds the web app into deploy/static (served by FastAPI on the hosted instance). Run before pushing UI changes.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location (Join-Path $root 'artifacts\rescue-lab')
$env:PORT = '5173'; $env:BASE_PATH = '/'
pnpm run build
Pop-Location
$dst = Join-Path $root 'deploy\static'
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Recurse (Join-Path $root 'artifacts\rescue-lab\dist\public') $dst
Write-Host "deploy/static updated"
