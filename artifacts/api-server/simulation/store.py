"""PostgreSQL persistence; schema is managed by versioned migrations, never startup DDL.

Visibility rule (enforced in every query, not in the UI):
  anonymous  -> public demonstration runs only (owner_id IS NULL)
  user       -> public runs + own runs
  admin      -> all runs
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def connect():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, connect_timeout=10)


def _scope(viewer):
    """SQL predicate + params for runs visible to `viewer` (CurrentUser | None)."""
    if viewer is None:
        return "owner_id IS NULL", ()
    if getattr(viewer, "is_admin", False):
        return "TRUE", ()
    return "(owner_id IS NULL OR owner_id = %s)", (viewer.id,)


def save(result, owner_id=None):
    identifier = str(uuid4())
    created = datetime.now(timezone.utc).isoformat()
    record = {**result, "id": identifier, "created_at": created}
    with connect() as conn:
        with conn.transaction():
            conn.execute(
                "INSERT INTO simulation_runs (id,name,created_at,fingerprint,config,result,owner_id) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (identifier, result["config"]["name"], created, result["fingerprint"],
                 Jsonb(result["config"]), Jsonb(record), owner_id),
            )
            if owner_id:
                conn.execute("INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES (%s,'run.created','simulation_run',%s)",
                             (owner_id, identifier))
    return record


def load(identifier, viewer=None):
    where, params = _scope(viewer)
    with connect() as conn:
        row = conn.execute(f"SELECT result FROM simulation_runs WHERE id=%s AND {where}", (identifier, *params)).fetchone()
    return row["result"] if row else None


def history(viewer=None):
    where, params = _scope(viewer)
    with connect() as conn:
        rows = conn.execute(
            f"""SELECT id,name,created_at,fingerprint,
            (config->>'seed')::int AS seed, (config->>'replicates')::int AS replicates,
            result->'metrics'->2->>'peak_deviation_pct' AS peak
            FROM simulation_runs WHERE {where} ORDER BY created_at DESC LIMIT 200""", params
        ).fetchall()
    return [{"id": r["id"], "name": r["name"], "created_at": r["created_at"].isoformat(),
             "fingerprint": r["fingerprint"], "seed": r["seed"], "replicates": r["replicates"],
             "equalized_peak_pct": float(r["peak"]), "pressure_target_met": float(r["peak"]) <= 5+1e-10} for r in rows]


def summary(viewer=None):
    where, params = _scope(viewer)
    with connect() as conn:
        row = conn.execute(f"""SELECT count(*) AS total_runs,
            coalesce(sum((config->>'replicates')::int*4),0) AS virtual_chips FROM simulation_runs WHERE {where}""", params).fetchone()
        latest = conn.execute(f"SELECT id FROM simulation_runs WHERE {where} ORDER BY created_at DESC LIMIT 1", params).fetchone()
    return {**row, "latest_run_id": latest["id"] if latest else None}
