"""Account, admin and auth-configuration endpoints."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from simulation import store
from .core import ROLES, CurrentUser, audit, configured, require_admin, require_user, settings

router = APIRouter(prefix="/api")


class AuthConfig(BaseModel):
    configured: bool
    supabase_url: str | None
    supabase_anon_key: str | None   # public by design (Supabase "anon"/publishable key)


class Profile(BaseModel):
    id: str
    email: str
    role: str
    status: str
    locale: str
    display_name: str | None
    created_at: str
    last_seen_at: str
    email_verified_at: str | None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    locale: Literal["ar", "en"] | None = None


class AdminUserUpdate(BaseModel):
    role: Literal["admin", "researcher", "reviewer", "viewer"] | None = None
    status: Literal["active", "suspended"] | None = None


class AuditEntry(BaseModel):
    id: int
    actor_email: str | None
    action: str
    target_type: str | None
    target_id: str | None
    detail: dict
    created_at: str


def _profile(row) -> dict:
    return {**row, "id": str(row["id"]),
            "created_at": row["created_at"].isoformat(), "last_seen_at": row["last_seen_at"].isoformat(),
            "email_verified_at": row["email_verified_at"].isoformat() if row["email_verified_at"] else None}


_PROFILE_COLS = "id, email, role, status, locale, display_name, created_at, last_seen_at, email_verified_at"


@router.get("/auth/config", response_model=AuthConfig, operation_id="getAuthConfig")
def auth_config():
    s = settings()
    ok = configured()
    return {"configured": ok, "supabase_url": s["url"] if ok else None, "supabase_anon_key": s["anon_key"] if ok else None}


@router.get("/me", response_model=Profile, operation_id="getMe")
def me(user: CurrentUser = Depends(require_user)):
    with store.connect() as conn:
        row = conn.execute(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id=%s", (user.id,)).fetchone()
    return _profile(row)


@router.patch("/me", response_model=Profile, operation_id="updateMe")
def update_me(data: ProfileUpdate, user: CurrentUser = Depends(require_user)):
    changes = data.model_dump(exclude_none=True)
    with store.connect() as conn:
        with conn.transaction():
            if changes:
                sets = ", ".join(f"{k}=%s" for k in changes)
                conn.execute(f"UPDATE profiles SET {sets} WHERE id=%s", (*changes.values(), user.id))
                audit(conn, user.id, "profile.updated", "profile", user.id, changes)
            row = conn.execute(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id=%s", (user.id,)).fetchone()
    return _profile(row)


@router.get("/admin/users", response_model=list[Profile], operation_id="adminListUsers")
def admin_users(_: CurrentUser = Depends(require_admin)):
    with store.connect() as conn:
        rows = conn.execute(f"SELECT {_PROFILE_COLS} FROM profiles ORDER BY created_at DESC LIMIT 1000").fetchall()
    return [_profile(r) for r in rows]


@router.patch("/admin/users/{user_id}", response_model=Profile, operation_id="adminUpdateUser")
def admin_update_user(user_id: str, data: AdminUserUpdate, admin: CurrentUser = Depends(require_admin)):
    changes = data.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(422, "Nothing to update.")
    with store.connect() as conn:
        with conn.transaction():
            conn.execute("LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE")
            target = conn.execute("SELECT id, role, status FROM profiles WHERE id::text=%s", (user_id,)).fetchone()
            if target is None:
                raise HTTPException(404, "User not found.")
            removing_admin = target["role"] == "admin" and (
                changes.get("role", "admin") != "admin" or changes.get("status") == "suspended")
            if removing_admin:
                admins = conn.execute("SELECT count(*) AS n FROM profiles WHERE role='admin' AND status='active'").fetchone()["n"]
                if admins <= 1:
                    raise HTTPException(409, "The last active administrator cannot be demoted or suspended.")
            sets = ", ".join(f"{k}=%s" for k in changes)
            conn.execute(f"UPDATE profiles SET {sets} WHERE id=%s", (*changes.values(), target["id"]))
            audit(conn, admin.id, "admin.user_updated", "profile", str(target["id"]),
                  {"before": {"role": target["role"], "status": target["status"]}, "after": changes})
            row = conn.execute(f"SELECT {_PROFILE_COLS} FROM profiles WHERE id=%s", (target["id"],)).fetchone()
    return _profile(row)


@router.get("/admin/audit", response_model=list[AuditEntry], operation_id="adminListAudit")
def admin_audit(limit: int = Query(200, ge=1, le=1000), _: CurrentUser = Depends(require_admin)):
    with store.connect() as conn:
        rows = conn.execute("""SELECT a.id, p.email AS actor_email, a.action, a.target_type, a.target_id, a.detail, a.created_at
                               FROM audit_log a LEFT JOIN profiles p ON p.id = a.actor_id
                               ORDER BY a.id DESC LIMIT %s""", (limit,)).fetchall()
    return [{**r, "created_at": r["created_at"].isoformat()} for r in rows]


assert set(ROLES) == {"admin", "researcher", "reviewer", "viewer"}
