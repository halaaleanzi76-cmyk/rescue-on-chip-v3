-- 002: accounts (identity lives in Supabase Auth; roles/status are authoritative here),
-- audit trail, and per-user ownership of saved runs.
CREATE TABLE IF NOT EXISTS profiles (
  id             uuid PRIMARY KEY,                -- Supabase auth.users.id
  email          text NOT NULL,
  role           text NOT NULL DEFAULT 'researcher' CHECK (role IN ('admin','researcher','reviewer','viewer')),
  status         text NOT NULL DEFAULT 'active'     CHECK (status IN ('active','suspended')),
  display_name   text,
  locale         text NOT NULL DEFAULT 'ar'         CHECK (locale IN ('ar','en')),
  email_verified_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx ON profiles (lower(email));
-- At most one admin can be created through automatic first-admin enrollment; further admins are granted by an admin.

CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,          -- e.g. auth.admin_enrolled, admin.role_changed, run.created
  target_type text,
  target_id   text,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

-- NULL owner = public demonstration run (seeded default), visible to everyone, editable by no one.
ALTER TABLE simulation_runs ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS simulation_runs_owner_idx ON simulation_runs (owner_id, created_at DESC);
