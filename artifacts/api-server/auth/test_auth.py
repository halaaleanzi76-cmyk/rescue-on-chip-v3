"""Authorization tests against a real, freshly migrated PostgreSQL test database.

Supabase is replaced only at the HTTP boundary (tokens map to fake Supabase user payloads).
Everything else (roles, enrollment, ownership, audit) runs through real SQL.
Run from artifacts/api-server:  python -m unittest auth.test_auth -v
"""
import importlib
import os
import subprocess
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import httpx
import psycopg

ROOT = Path(__file__).resolve().parents[3]
TEST_DB = "rescue_on_chip_authtest"


def _server_uri() -> str:
    env = ROOT / ".runtime" / "db.env"
    base = os.environ.get("DATABASE_URL") or env.read_text(encoding="utf-8").split("=", 1)[1].strip()
    head, _, _ = base.partition("?")[0].rpartition("/")
    return head


def _fresh_test_db() -> str:
    head = _server_uri()
    with psycopg.connect(f"{head}/postgres", autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{TEST_DB}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{TEST_DB}"')
    url = f"{head}/{TEST_DB}"
    subprocess.run([sys.executable, str(ROOT / "scripts" / "windows" / "migrate.py")],
                   env={**os.environ, "DATABASE_URL": url}, check=True, capture_output=True)
    return url


ADMIN_EMAIL = "owner@example.test"


def sb_user(email, verified=True):
    return {"id": str(uuid.uuid4()), "email": email,
            "email_confirmed_at": "2026-11-26T10:00:00Z" if verified else None}


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.update({"DATABASE_URL": _fresh_test_db(), "SUPABASE_URL": "https://unit-test.supabase.co",
                           "SUPABASE_ANON_KEY": "anon-test-key", "INITIAL_ADMIN_EMAIL": ADMIN_EMAIL})
        from fastapi.testclient import TestClient
        import main
        importlib.reload(main)
        cls.main = main
        cls.tokens = {}
        cls.patcher = patch("auth.core.fetch_supabase_user", side_effect=lambda t: cls.tokens.get(t))
        cls.patcher.start()
        cls.client = TestClient(main.app)
        cls.client.__enter__()  # run lifespan (seeds the public demonstration run)

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        cls.patcher.stop()

    def login(self, email, verified=True):
        token = "tok-" + uuid.uuid4().hex
        self.tokens[token] = sb_user(email, verified)
        return {"Authorization": f"Bearer {token}"}

    def run_payload(self, name="auth test run"):
        defaults = self.client.get("/api/model").json()["defaults"]
        return {**defaults, "name": name}

    # ---- anonymous ----
    def test_anonymous_can_use_public_calculations_but_not_private_endpoints(self):
        self.assertEqual(self.client.get("/api/healthz").status_code, 200)
        self.assertEqual(self.client.post("/api/vascular/solve", json={}).status_code, 200)
        self.assertEqual(self.client.get("/api/me").status_code, 401)
        self.assertEqual(self.client.post("/api/runs", json=self.run_payload()).status_code, 401)
        self.assertEqual(self.client.get("/api/admin/users").status_code, 401)
        self.assertEqual(self.client.post("/api/ai/train").status_code, 401)
        runs = self.client.get("/api/runs").json()
        self.assertTrue(runs, "public demonstration run should be visible")

    def test_auth_config_exposes_only_public_values(self):
        cfg = self.client.get("/api/auth/config").json()
        self.assertTrue(cfg["configured"])
        self.assertEqual(cfg["supabase_anon_key"], "anon-test-key")
        self.assertNotIn("service", str(cfg).lower())

    # ---- token / verification ----
    def test_invalid_token_rejected(self):
        r = self.client.get("/api/me", headers={"Authorization": "Bearer not-a-real-token"})
        self.assertEqual(r.status_code, 401)

    def test_unverified_email_cannot_access_protected_resources(self):
        h = self.login("unverified@example.test", verified=False)
        self.assertEqual(self.client.get("/api/me", headers=h).status_code, 403)
        self.assertEqual(self.client.post("/api/runs", json=self.run_payload(), headers=h).status_code, 403)

    def test_unverified_admin_email_is_not_enrolled(self):
        h = self.login(ADMIN_EMAIL, verified=False)
        self.assertEqual(self.client.get("/api/admin/users", headers=h).status_code, 403)

    # ---- isolation ----
    def test_users_cannot_see_each_others_runs(self):
        alice, bob = self.login("alice@example.test"), self.login("bob@example.test")
        created = self.client.post("/api/runs", json=self.run_payload("alice private"), headers=alice)
        self.assertEqual(created.status_code, 201, created.text)
        run_id = created.json()["id"]
        self.assertEqual(self.client.get(f"/api/runs/{run_id}", headers=alice).status_code, 200)
        for path in (f"/api/runs/{run_id}", f"/api/runs/{run_id}/visualization", f"/api/runs/{run_id}/report?format=json"):
            self.assertEqual(self.client.get(path, headers=bob).status_code, 404, path)
            self.assertEqual(self.client.get(path).status_code, 404, path)
        self.assertNotIn(run_id, [r["id"] for r in self.client.get("/api/runs", headers=bob).json()])
        self.assertIn(run_id, [r["id"] for r in self.client.get("/api/runs", headers=alice).json()])

    def test_run_survives_new_connection(self):
        h = self.login("persist@example.test")
        run_id = self.client.post("/api/runs", json=self.run_payload("persist"), headers=h).json()["id"]
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            owner = conn.execute("SELECT p.email FROM simulation_runs r JOIN profiles p ON p.id=r.owner_id WHERE r.id=%s",
                                 (run_id,)).fetchone()
        self.assertEqual(owner[0], "persist@example.test")

    # ---- roles & admin ----
    def test_admin_enrollment_and_permissions(self):
        regular = self.login("regular@example.test")
        self.assertEqual(self.client.get("/api/admin/users", headers=regular).status_code, 403)
        self.assertEqual(self.client.post("/api/ai/train", headers=regular).status_code, 403)

        admin = self.login(ADMIN_EMAIL)
        me = self.client.get("/api/me", headers=admin).json()
        self.assertEqual(me["role"], "admin")
        users = self.client.get("/api/admin/users", headers=admin)
        self.assertEqual(users.status_code, 200)

        # A second verified account using the same email string cannot become a second admin.
        impostor = self.login(ADMIN_EMAIL.upper().replace("OWNER", "owner"))
        # (same address, different Supabase id: unique email index refuses a duplicate profile)
        r = self.client.get("/api/me", headers=impostor)
        self.assertNotEqual(r.status_code, 200)

        actions = [a["action"] for a in self.client.get("/api/admin/audit", headers=admin).json()]
        self.assertIn("auth.admin_enrolled", actions)

        # Admin changes a role; viewer then cannot create runs
        rid = self.client.get("/api/me", headers=regular).json()["id"]
        upd = self.client.patch(f"/api/admin/users/{rid}", json={"role": "viewer"}, headers=admin)
        self.assertEqual(upd.status_code, 200)
        self.assertEqual(self.client.post("/api/runs", json=self.run_payload(), headers=regular).status_code, 403)

        # Last active admin cannot demote themself
        self.assertEqual(self.client.patch(f"/api/admin/users/{me['id']}", json={"role": "researcher"}, headers=admin).status_code, 409)

        # Suspension blocks access
        self.client.patch(f"/api/admin/users/{rid}", json={"status": "suspended"}, headers=admin)
        self.assertEqual(self.client.get("/api/me", headers=regular).status_code, 403)

    def test_parallel_first_requests_do_not_deadlock(self):
        # Regression: a browser's first sign-in fires /me, /runs and /summary at once. The admin
        # enrollment lock used to be upgraded after the INSERT and deadlocked (HTTP 500).
        from concurrent.futures import ThreadPoolExecutor
        for email in ("parallel@example.test",):
            h = self.login(email)
            paths = ["/api/me", "/api/runs", "/api/summary"] * 4
            with ThreadPoolExecutor(max_workers=12) as pool:
                codes = list(pool.map(lambda p: self.client.get(p, headers=h).status_code, paths))
            self.assertEqual(set(codes), {200}, codes)

    def test_parallel_first_requests_for_admin_candidate(self):
        # Reproduces the observed production deadlock: the admin candidate's first sign-in hits
        # several endpoints at the same instant. Threads are released together by a barrier and
        # call the real profile sync against PostgreSQL (no HTTP layer to serialize them).
        import threading
        from auth import core
        errors, uid = [], str(uuid.uuid4())
        for _round in range(5):
            with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                conn.execute("UPDATE profiles SET role='researcher' WHERE role='admin'")
                conn.execute("DELETE FROM profiles WHERE lower(email)=lower(%s)", (ADMIN_EMAIL,))
            barrier = threading.Barrier(6)

            def first_request():
                barrier.wait()
                try:
                    core._sync_profile_tx(uid, ADMIN_EMAIL, "2026-11-26T10:00:00Z", ADMIN_EMAIL)
                except Exception as exc:  # noqa: BLE001
                    errors.append(type(exc).__name__)

            threads = [threading.Thread(target=first_request) for _ in range(6)]
            for t in threads: t.start()
            for t in threads: t.join()
            with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                n = conn.execute("SELECT count(*) FROM profiles WHERE role='admin'").fetchone()[0]
            self.assertEqual(n, 1)
        self.assertEqual(errors, [], f"concurrent first sign-in failed: {errors}")

    def test_profile_update_validates_input(self):
        h = self.login("prefs@example.test")
        self.assertEqual(self.client.patch("/api/me", json={"locale": "en"}, headers=h).json()["locale"], "en")
        self.assertEqual(self.client.patch("/api/me", json={"locale": "fr"}, headers=h).status_code, 422)
        self.assertEqual(self.client.patch("/api/me", json={"role": "admin"}, headers=h).json()["role"], "researcher")


class SupabaseBoundaryTests(unittest.TestCase):
    """fetch_supabase_user against mocked HTTP responses (no network)."""

    def setUp(self):
        os.environ.update({"SUPABASE_URL": "https://unit-test.supabase.co", "SUPABASE_ANON_KEY": "anon"})
        from auth import core
        core._cache.clear()
        self.core = core

    def _resp(self, status, body=None):
        return httpx.Response(status, json=body or {}, request=httpx.Request("GET", "https://x"))

    def test_valid_rejected_and_unreachable(self):
        with patch("httpx.get", return_value=self._resp(200, {"id": "u1", "email": "a@b.c"})) as g:
            self.assertEqual(self.core.fetch_supabase_user("t1")["id"], "u1")
            self.core.fetch_supabase_user("t1")
            self.assertEqual(g.call_count, 1, "second call should be served from the short cache")
            self.assertEqual(g.call_args.kwargs["headers"]["apikey"], "anon")
        with patch("httpx.get", return_value=self._resp(401)):
            self.assertIsNone(self.core.fetch_supabase_user("t2"))
        with patch("httpx.get", side_effect=httpx.ConnectError("down")):
            from fastapi import HTTPException
            with self.assertRaises(HTTPException) as ctx:
                self.core.fetch_supabase_user("t3")
            self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
