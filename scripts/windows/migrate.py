"""Versioned SQL migrations: applies db/migrations/NNN_*.sql in order, once each, in a transaction.

Records filename + SHA-256 in schema_migrations; refuses to run if an applied file was edited.
Usage: DATABASE_URL=... python scripts/windows/migrate.py   (start.ps1 does this automatically)
"""
from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "db" / "migrations"


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        env = ROOT / ".runtime" / "db.env"
        url = env.read_text(encoding="utf-8").split("=", 1)[1].strip() if env.exists() else None
    if not url:
        print("DATABASE_URL is not set; run scripts/windows/localdb.py start first", file=sys.stderr)
        return 1
    files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9]_*.sql"))
    with psycopg.connect(url) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS schema_migrations (
            filename text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())""")
        applied = dict(conn.execute("SELECT filename, sha256 FROM schema_migrations").fetchall())
        conn.commit()
        for f in files:
            sql = f.read_text(encoding="utf-8")
            digest = hashlib.sha256(sql.encode()).hexdigest()
            if f.name in applied:
                if applied[f.name] != digest:
                    print(f"ERROR: applied migration {f.name} was modified; add a new migration instead", file=sys.stderr)
                    return 2
                continue
            with conn.transaction():
                conn.execute(sql)
                conn.execute("INSERT INTO schema_migrations (filename, sha256) VALUES (%s, %s)", (f.name, digest))
            print(f"applied {f.name}")
    print(f"migrations up to date ({len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
