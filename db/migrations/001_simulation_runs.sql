-- 001: persisted virtual-bench simulation runs (mirrors lib/db/src/schema/simulation-runs.ts)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  fingerprint text NOT NULL,
  config      jsonb NOT NULL,
  result      jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS simulation_runs_created_at_idx ON simulation_runs (created_at DESC);
