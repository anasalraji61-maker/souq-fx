"""Owner/admin API: overview numbers, users (search + suspend), launch waitlist, system status.

Protected by a secret token in the `X-Admin-Token` header (env `MATRIX_ADMIN_TOKEN`). Without a configured
token every admin route answers 404, so a server that never set one exposes nothing.
The public part is only `POST /api/waitlist` (launch "notify me" sign-ups).
"""
from __future__ import annotations

import csv
import io
import os
import secrets
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

import db
import mailer
from core.auth import _auth_user

router = APIRouter(tags=["admin"])

_STARTED_AT = time.time()


def admin_token_configured() -> str:
    return (os.getenv("MATRIX_ADMIN_TOKEN") or "").strip()


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    expected = admin_token_configured()
    if not expected:
        raise HTTPException(status_code=404, detail="not found")
    got = (x_admin_token or "").strip()
    if not got or not secrets.compare_digest(
        got.encode("utf-8", "surrogateescape"), expected.encode("utf-8", "surrogateescape")
    ):
        raise HTTPException(status_code=403, detail="forbidden")


# ---------------------------------------------------------------------------------------------
# Public: launch waitlist


class WaitlistJoin(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    plan: str | None = Field(default=None, max_length=16)
    lang: str | None = Field(default=None, max_length=8)
    source: str | None = Field(default=None, max_length=32)


_WAITLIST_HITS: dict[str, list[float]] = {}
_WAITLIST_MAX_PER_HOUR = 10


def _waitlist_ip_ok(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _WAITLIST_HITS.get(ip, []) if now - t < 3600]
    ok = len(hits) < _WAITLIST_MAX_PER_HOUR
    if ok:
        hits.append(now)
    _WAITLIST_HITS[ip] = hits
    if len(_WAITLIST_HITS) > 5000:
        _WAITLIST_HITS.clear()
    return ok


@router.post("/api/waitlist")
def waitlist_join(body: WaitlistJoin, request: Request, user: dict | None = Depends(_auth_user)):
    ip = request.client.host if request.client else "?"
    if not _waitlist_ip_ok(ip):
        raise HTTPException(status_code=429, detail="too many requests")
    try:
        new = db.waitlist_join(body.email, body.plan, body.lang, body.source, user["user_id"] if user else None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="invalid email") from exc
    return {"ok": True, "new": new}


# ---------------------------------------------------------------------------------------------
# Admin


def _count(c, sql: str, args: tuple = ()) -> int:
    row = c.execute(sql, args).fetchone()
    return int(row[0] or 0) if row else 0


def _table_exists(c, name: str) -> bool:
    return c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None


@router.get("/api/admin/overview", dependencies=[Depends(require_admin)])
def admin_overview(days: int = Query(default=30, ge=7, le=180)):
    now = time.time()
    day = 86400
    with db._conn() as c:
        users_total = _count(c, "SELECT COUNT(*) FROM users WHERE email IS NOT NULL")
        deleted = _count(c, "SELECT COUNT(*) FROM users WHERE email IS NULL")
        verified = _count(c, "SELECT COUNT(*) FROM users WHERE email IS NOT NULL AND email_verified=1")
        suspended = _count(c, "SELECT COUNT(*) FROM users WHERE suspended_at IS NOT NULL")
        signups = {
            "today": _count(c, "SELECT COUNT(*) FROM users WHERE created_at>=?", (now - day,)),
            "7d": _count(c, "SELECT COUNT(*) FROM users WHERE created_at>=?", (now - 7 * day,)),
            "30d": _count(c, "SELECT COUNT(*) FROM users WHERE created_at>=?", (now - 30 * day,)),
        }
        # Sessions last 30 days; a session created in the last 7 days ≈ an active user this week.
        active_7d = _count(
            c, "SELECT COUNT(DISTINCT user_id) FROM sessions WHERE expires_at>=?", (now + 30 * day - 7 * day,)
        )
        live_sessions = _count(c, "SELECT COUNT(*) FROM sessions WHERE expires_at>?", (now,))
        start = now - days * day
        rows = c.execute(
            "SELECT CAST((created_at - ?) / 86400 AS INTEGER) AS d, COUNT(*) AS n FROM users WHERE created_at>=? GROUP BY d",
            (start, start),
        ).fetchall()
        per_day = [0] * days
        for r in rows:
            d = int(r["d"])
            if 0 <= d < days:
                per_day[d] = int(r["n"])
        content = {
            "group_messages_24h": _count(c, "SELECT COUNT(*) FROM group_messages WHERE created_at>=?", (now - day,))
            if _has_column(c, "group_messages", "created_at") else None,
            "channel_messages_24h": _count(c, "SELECT COUNT(*) FROM community_messages WHERE created_at>=?", (now - day,))
            if _table_exists(c, "community_messages") else 0,
            "ideas": _count(c, "SELECT COUNT(*) FROM votes"),
            "alerts_active": _count(c, "SELECT COUNT(*) FROM alerts WHERE active=1 AND triggered=0")
            if _has_column(c, "alerts", "triggered") else _count(c, "SELECT COUNT(*) FROM alerts"),
            "journal_trades": _count(c, "SELECT COUNT(*) FROM trades"),
            "drawing_charts": _count(c, "SELECT COUNT(DISTINCT user_id || symbol || timeframe) FROM chart_drawings")
            if _table_exists(c, "chart_drawings") else 0,
            "push_devices": _count(c, "SELECT COUNT(*) FROM push_tokens"),
        }
    return {
        "users": {
            "total": users_total,
            "verified_email": verified,
            "suspended": suspended,
            "deleted": deleted,
            "active_7d": active_7d,
            "live_sessions": live_sessions,
        },
        "signups": signups,
        "signups_per_day": {"start": start, "days": days, "counts": per_day},
        "waitlist": db.waitlist_counts(),
        "reports_pending": db.count_reported_items(),
        "subscriptions": __import__("plans").subscription_stats(),
        "errors_24h": __import__("ops").error_counts(now - day),
        "backup": {k: v for k, v in __import__("ops").backup_status().items() if k != "files"},
        "content": content,
    }


def _has_column(c, table: str, col: str) -> bool:
    try:
        return any(r[1] == col for r in c.execute(f"PRAGMA table_info({table})").fetchall())
    except Exception:
        return False


@router.get("/api/admin/users", dependencies=[Depends(require_admin)])
def admin_users(
    q: str = Query(default="", max_length=100),
    status: str = Query(default="all", pattern="^(all|active|suspended|unverified|paying)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=1_000_000),
):
    where = ["u.email IS NOT NULL"]
    args: list = []
    term = q.strip().lower()
    if term:
        where.append("(lower(u.username) LIKE ? OR lower(u.email) LIKE ?)")
        like = f"%{term.replace('%', '').replace('_', '')}%"
        args += [like, like]
    if status == "suspended":
        where.append("u.suspended_at IS NOT NULL")
    elif status == "active":
        where.append("u.suspended_at IS NULL")
    elif status == "unverified":
        where.append("u.email_verified=0")
    elif status == "paying":
        where.append("u.plan IN ('basic','pro','vip') AND u.plan_expires_at > ?")
        args.append(time.time())
    sql_where = " AND ".join(where)
    with db._conn() as c:
        total = _count(c, f"SELECT COUNT(*) FROM users u WHERE {sql_where}", tuple(args))
        rows = c.execute(
            f"""SELECT u.id, u.username, u.email, u.email_verified, u.created_at, u.suspended_at, u.suspend_reason,
                       u.plan, u.plan_expires_at,
                       n.role,
                       (SELECT MAX(expires_at) FROM sessions s WHERE s.user_id=u.id) AS last_session_exp,
                       (SELECT COUNT(*) FROM trades t WHERE t.user_id=u.id) AS trades,
                       (SELECT COUNT(*) FROM alerts a WHERE a.user_id=u.id) AS alerts
                FROM users u LEFT JOIN network_members n ON n.user_id=u.id
                WHERE {sql_where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?""",
            (*args, limit, offset),
        ).fetchall()
    out = []
    for r in rows:
        exp = r["last_session_exp"]
        out.append(
            {
                "id": int(r["id"]),
                "username": r["username"],
                "email": r["email"],
                "email_verified": bool(r["email_verified"]),
                "role": r["role"],
                "created_at": r["created_at"],
                # sessions last 30 days, so the newest expiry - 30 days = time of the last sign-in
                "last_login_at": (float(exp) - 30 * 86400) if exp else None,
                "suspended_at": r["suspended_at"],
                "suspend_reason": r["suspend_reason"],
                "plan": r["plan"] if (r["plan"] and r["plan"] != "free" and r["plan_expires_at"] and float(r["plan_expires_at"]) > time.time()) else "free",
                "plan_expires_at": r["plan_expires_at"],
                "trades": int(r["trades"] or 0),
                "alerts": int(r["alerts"] or 0),
            }
        )
    return {"total": total, "users": out}


class SuspendBody(BaseModel):
    suspended: bool
    reason: str | None = Field(default=None, max_length=200)


@router.post("/api/admin/users/{user_id}/suspend", dependencies=[Depends(require_admin)])
def admin_suspend(user_id: int, body: SuspendBody):
    if not db.admin_set_suspended(user_id, body.suspended, body.reason):
        raise HTTPException(status_code=404, detail="user not found")
    return {"ok": True}


@router.get("/api/admin/waitlist", dependencies=[Depends(require_admin)])
def admin_waitlist(limit: int = Query(default=500, ge=1, le=5000), offset: int = Query(default=0, ge=0)):
    return {"counts": db.waitlist_counts(), "items": db.waitlist_list(limit, offset)}


@router.get("/api/admin/waitlist.csv", dependencies=[Depends(require_admin)])
def admin_waitlist_csv():
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "plan", "lang", "source", "user_id", "joined_utc"])
    for it in db.waitlist_list(100000, 0):
        joined = time.strftime("%Y-%m-%d %H:%M", time.gmtime(float(it["created_at"])))
        w.writerow([it["email"], it["plan"] or "", it["lang"] or "", it["source"] or "", it["user_id"] or "", joined])
    data = "﻿" + buf.getvalue()  # BOM so Excel opens UTF-8 correctly
    return Response(
        content=data.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="matrix-waitlist.csv"'},
    )


@router.get("/api/admin/system", dependencies=[Depends(require_admin)])
def admin_system():
    import twelve_data

    db_path = str(db.DB_PATH)
    try:
        db_size = os.path.getsize(db_path)
    except OSError:
        db_size = None
    version = None
    for cand in ("../VERSION", "VERSION"):
        try:
            with open(cand, encoding="utf-8") as fh:
                version = fh.read().strip()
                break
        except OSError:
            continue
    stats = dict(getattr(twelve_data, "_stats", {}) or {})
    return {
        "version": version,
        "uptime_s": int(time.time() - _STARTED_AT),
        "db_bytes": db_size,
        "market_data_key": bool((os.getenv("TWELVE_DATA_API_KEY") or "").strip()),
        "market_rpm": os.getenv("TWELVE_DATA_RPM") or None,
        "provider_stats": stats,
        "email": mailer.configured(),
        "public_base_url": os.getenv("PUBLIC_BASE_URL") or None,
        "live_trading_enabled": (os.getenv("LIVE_TRADING_ENABLED") or "false").lower() == "true",
        "moderation_token": bool((os.getenv("MATRIX_MODERATION_TOKEN") or "").strip()),
        "stripe": __import__("stripe_billing").configured(),
        "stripe_test_mode": __import__("stripe_billing").test_mode(),
        "iap": __import__("revenuecat").mobile_config()["enabled"],
    }
