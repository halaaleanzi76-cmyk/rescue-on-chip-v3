# Stops the web app, API and local PostgreSQL. Data in .data\pg is kept.
$Root = $PSScriptRoot
foreach ($p in @(8000, 5173)) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
& (Join-Path $Root '.venv\Scripts\python.exe') (Join-Path $Root 'scripts\windows\localdb.py') stop
Write-Host 'Rescue-on-Chip stopped (database files preserved in .data\pg).'
