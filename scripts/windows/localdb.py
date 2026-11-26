"""Local persistent PostgreSQL for Windows development (no admin rights, no Docker).

Uses the `pgserver` package (real PostgreSQL binaries shipped as a wheel). Data lives in
<repo>/.data/pg and survives restarts. Commands:

    python scripts/windows/localdb.py start    # start (or reuse) server, ensure DB, write .runtime/db.env
    python scripts/windows/localdb.py stop
    python scripts/windows/localdb.py status
    python scripts/windows/localdb.py backup   # pg_dump-equivalent SQL snapshot into .data/backups
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

import psycopg
import pgserver

ROOT = Path(__file__).resolve().parents[2]
PGDATA = ROOT / ".data" / "pg"
RUNTIME = ROOT / ".runtime"
DB_NAME = "rescue_on_chip"


def _server(cleanup=None):
    PGDATA.mkdir(parents=True, exist_ok=True)
    # cleanup_mode=None keeps postgres running after this process exits (managed by start/stop).
    return pgserver.get_server(PGDATA, cleanup_mode=cleanup)


def _app_uri(srv) -> str:
    base = srv.get_uri()  # e.g. postgresql://postgres:@127.0.0.1:5435/postgres[?...]
    path, sep, query = base.partition("?")
    head, _, _db = path.rpartition("/")
    return f"{head}/{DB_NAME}{sep}{query}"


def start() -> str:
    srv = _server()
    with psycopg.connect(srv.get_uri(), autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname=%s", (DB_NAME,)).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{DB_NAME}"')
    uri = _app_uri(srv)
    with psycopg.connect(uri) as conn:
        version = conn.execute("SHOW server_version").fetchone()[0]
    RUNTIME.mkdir(exist_ok=True)
    (RUNTIME / "db.env").write_text(f"DATABASE_URL={uri}\n", encoding="utf-8")
    (RUNTIME / "db.json").write_text(json.dumps({"uri": uri, "pgdata": str(PGDATA), "version": version}), encoding="utf-8")
    print(f"PostgreSQL {version} ready")
    print(uri)
    return uri


def stop() -> None:
    if not (PGDATA / "postmaster.pid").exists():
        print("PostgreSQL is not running")
        return
    _server(cleanup="stop").cleanup()
    print("PostgreSQL stopped")


def status() -> None:
    running = (PGDATA / "postmaster.pid").exists()
    print(json.dumps({"running": running, "pgdata": str(PGDATA)}))


PG_BIN = Path(pgserver.__file__).parent / "pginstall" / "bin"


def _row_counts(uri: str) -> dict[str, int]:
    with psycopg.connect(uri) as conn:
        tables = [r[0] for r in conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").fetchall()]
        return {t: conn.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in tables}


def backup() -> Path:
    """Restorable backup: pg_dump custom format (+ a row-count manifest for verification)."""
    import subprocess
    uri = start()
    out_dir = ROOT / ".data" / "backups"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = out_dir / f"{DB_NAME}-{stamp}.dump"
    subprocess.run([str(PG_BIN / "pg_dump.exe"), "--format=custom", "--no-owner", f"--file={path}", f"--dbname={uri}"], check=True)
    counts = _row_counts(uri)
    path.with_suffix(".counts.json").write_text(json.dumps(counts, indent=1), encoding="utf-8")
    print(f"Backup written: {path} ({path.stat().st_size // 1024} KB, {sum(counts.values())} rows, {len(counts)} tables)")
    return path


def restore(dump_path: str | None = None, target_db: str = DB_NAME) -> None:
    """Restore a .dump into `target_db` (recreated). Usage: localdb.py restore <file.dump> [target_db]"""
    import subprocess
    srv_uri = _server().get_uri()
    if not dump_path:
        dumps = sorted((ROOT / ".data" / "backups").glob("*.dump"))
        if not dumps:
            raise SystemExit("No .dump backups found")
        dump_path = str(dumps[-1])
    with psycopg.connect(srv_uri, autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{target_db}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{target_db}"')
    head = _app_uri(_server()).rsplit("/", 1)[0]
    target_uri = f"{head}/{target_db}"
    subprocess.run([str(PG_BIN / "pg_restore.exe"), "--no-owner", f"--dbname={target_uri}", dump_path], check=True)
    counts = _row_counts(target_uri)
    expected_file = Path(dump_path).with_suffix(".counts.json")
    if expected_file.exists():
        expected = json.loads(expected_file.read_text(encoding="utf-8"))
        status = "MATCH" if expected == counts else f"MISMATCH expected={expected}"
    else:
        status = "no manifest"
    print(f"Restored {dump_path} -> {target_db}: {counts} [{status}]")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    if cmd == "restore":
        restore(sys.argv[2] if len(sys.argv) > 2 else None, sys.argv[3] if len(sys.argv) > 3 else DB_NAME)
    else:
        {"start": start, "stop": stop, "status": status, "backup": backup}[cmd]()
