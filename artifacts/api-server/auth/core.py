"""Server-side authentication and authorization.

Identity: Supabase Auth (real sign-up, email verification, password recovery).
Every protected request's bearer token is validated by asking Supabase itself
(GET /auth/v1/user), so revoked/expired sessions are rejected without local key handling.

Authorization: roles and account status live in our PostgreSQL `profiles` table and are
never taken from the client. The initial administrator is enrolled server-side only when
the Supabase-verified email equals INITIAL_ADMIN_EMAIL and no admin exists yet.
"""
from __future__ import annotations

import hashlib
import os
import threading
import time
from dataclasses import dataclass

import httpx
import psycopg
from fastapi import Depends, Header, HTTPException
from psycopg.types.json import Jsonb

from simulation import store

ROLES = ("admin", "researcher", "reviewer", "viewer")
_CACHE_TTL_S = 60.0
_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()


def settings() -> dict:
    return {
        "url": os.environ.get("SUPABASE_URL", "").rstrip("/"),
        "anon_key": os.environ.get("SUPABASE_ANON_KEY", ""),
        "admin_email": os.environ.get("INITIAL_ADMIN_EMAIL", "").strip().lower(),
    }


def configured() -> bool:
    s = settings()
    return bool(s["url"].startswith("https://") and s["anon_key"])


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    role: str
    status: str
    locale: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def fetch_supabase_user(token: str) -> dict | None:
    """Return the Supabase user for a token, or None if Supabase rejects it. Cached briefly by token hash."""
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    s = settings()
    try:
        resp = httpx.get(f"{s['url']}/auth/v1/user",
                         headers={"apikey": s["anon_key"], "Authorization": f"Bearer {token}"},
                         timeout=8.0)
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Authentication service is unreachable. Please retry.") from exc
    if resp.status_code in (401, 403):
        return None
    if resp.status_code != 200:
        raise HTTPException(503, "Authentication service returned an unexpected response.")
    user = resp.json()
    with _cache_lock:
        if len(_cache) > 5000:
            _cache.clear()
        _cache[key] = (now + _CACHE_TTL_S, user)
    return user


def audit(conn, actor_id: str | None, action: str, target_type: str | None = None,
          target_id: str | None = None, detail: dict | None = None) -> None:
    conn.execute("INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES (%s,%s,%s,%s,%s)",
                 (actor_id, action, target_type, target_id, Jsonb(detail or {})))


def sync_profile(sb_user: dict) -> CurrentUser:
    """Create/refresh the local profile for a Supabase-verified user; perform first-admin enrollment."""
    uid, email = sb_user["id"], (sb_user.get("email") or "").strip()
    verified_at = sb_user.get("email_confirmed_at") or sb_user.get("confirmed_at")
    admin_email = settings()["admin_email"]
    try:
        return _sync_profile_tx(uid, email, verified_at, admin_email)
    except psycopg.errors.UniqueViolation as exc:
        # Parallel first requests of the SAME new user can trip the email index before the
        # ON CONFLICT (id) arbiter sees the committed row. If the row is ours, just retry once.
        with store.connect() as conn:
            same_user = conn.execute("SELECT 1 FROM profiles WHERE id=%s", (uid,)).fetchone()
        if same_user:
            return _sync_profile_tx(uid, email, verified_at, admin_email)
        # Same email already bound to a different Supabase identity: never merge or take over the account.
        raise HTTPException(409, "This email is already linked to another account. Contact the administrator.") from exc


def _sync_profile_tx(uid, email, verified_at, admin_email) -> CurrentUser:
    candidate = bool(verified_at and admin_email and email.lower() == admin_email)
    with store.connect() as conn:
        if candidate:  # cheap pre-check outside the transaction: already admin -> no table lock needed
            existing = conn.execute("SELECT role FROM profiles WHERE id=%s", (uid,)).fetchone()
            conn.commit()
            candidate = not (existing and existing["role"] == "admin")
        with conn.transaction():
            if candidate:
                # Take the enrollment lock FIRST. Upgrading after the INSERT (ROW EXCLUSIVE ->
                # SHARE ROW EXCLUSIVE) deadlocked when the browser fired parallel first requests.
                conn.execute("LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE")
            row = conn.execute(
                """INSERT INTO profiles (id, email, email_verified_at) VALUES (%s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
                     email_verified_at = EXCLUDED.email_verified_at, last_seen_at = now()
                   RETURNING id, email, role, status, locale, (xmax = 0) AS inserted""",
                (uid, email, verified_at)).fetchone()
            if row["inserted"]:
                audit(conn, uid, "auth.profile_created", "profile", uid, {"email": email})
            # The lock above serializes enrollment so concurrent first logins cannot create two admins.
            if candidate and row["role"] != "admin":
                has_admin = conn.execute("SELECT 1 FROM profiles WHERE role='admin' LIMIT 1").fetchone()
                if not has_admin:
                    row = conn.execute("UPDATE profiles SET role='admin' WHERE id=%s RETURNING id, email, role, status, locale",
                                       (uid,)).fetchone()
                    audit(conn, uid, "auth.admin_enrolled", "profile", uid,
                          {"email": email, "basis": "INITIAL_ADMIN_EMAIL match after Supabase email verification"})
    return CurrentUser(id=str(row["id"]), email=row["email"], role=row["role"], status=row["status"], locale=row["locale"])


def _bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


def optional_user(authorization: str | None = Header(default=None)) -> CurrentUser | None:
    """Resolve the user if a valid token is present; anonymous requests get None."""
    token = _bearer(authorization)
    if token is None or not configured():
        return None
    sb = fetch_supabase_user(token)
    if sb is None:
        raise HTTPException(401, "Your session is invalid or has expired. Please sign in again.")
    if not (sb.get("email_confirmed_at") or sb.get("confirmed_at")):
        raise HTTPException(403, "Please verify your email address before using your account.")
    user = sync_profile(sb)
    if user.status != "active":
        raise HTTPException(403, "This account is suspended. Contact the administrator.")
    return user


def require_user(user: CurrentUser | None = Depends(optional_user),
                 authorization: str | None = Header(default=None)) -> CurrentUser:
    if not configured():
        raise HTTPException(503, "Accounts are not configured on this server yet (Supabase keys missing).")
    if user is None:
        raise HTTPException(401, "Sign in to use this feature.")
    return user


def require_role(*roles: str):
    def dep(user: CurrentUser = Depends(require_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(403, "You do not have permission for this action.")
        return user
    return dep


require_admin = require_role("admin")
