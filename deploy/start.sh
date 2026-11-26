#!/usr/bin/env bash
# Start command for the hosted instance (Render): apply migrations, then serve API + web app.
set -euo pipefail
cd "$(dirname "$0")/.."
python scripts/windows/migrate.py
cd artifacts/api-server
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-10000}" --proxy-headers --forwarded-allow-ips='*'
