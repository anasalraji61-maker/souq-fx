"""Subscription plans: limits per plan, the account's effective plan, manual activation (Zain Cash / FIB /
cash ... recorded by the admin), payment ledger, AI usage counters and runtime settings.

Enforcement is OFF until the admin turns it on (setting `plan_enforcement`), so nothing is locked for
early testers. While it is off every account behaves like the top plan for limits, but its real plan
is still reported.
"""
from __future__ import annotations

import sqlite3
import time
from typing import Any

import db

PLAN_ORDER = ("free", "basic", "pro", "vip")
PRICES_USD = {"free": 0, "basic": 10, "pro": 15, "vip": 20}
LABELS_AR = {"free": "المجانية", "basic": "الأساسية", "pro": "المحترف", "vip": "النخبة"}
PAYMENT_METHODS = ("zaincash", "fib", "qi", "asiahawala", "cash", "bank", "other")
# methods written by the billing integrations (not choosable in the admin activation form)
AUTO_METHODS = ("stripe", "appstore", "playstore")

# None = unlimited. Mirrors the pricing screen (SubscriptionPlansScreen.tsx).
LIMITS: dict[str, dict[str, int | None]] = {
    "free": {"charts": 1, "indicators_per_chart": 3, "watchlists": 1, "watchlist_symbols": 10, "alerts": 3, "ai_daily": 5},
    "basic": {"charts": 2, "indicators_per_chart": 10, "watchlists": 3, "watchlist_symbols": 50, "alerts": 20, "ai_daily": 20},
    "pro": {"charts": 4, "indicators_per_chart": None, "watchlists": None, "watchlist_symbols": None, "alerts": None, "ai_daily": 100},
    "vip": {"charts": 4, "indicators_per_chart": None, "watchlists": None, "watchlist_symbols": None, "alerts": None, "ai_daily": 300},
}
# Hard safety caps that apply even when enforcement is off (abuse / cost protection).
HARD_CAPS = {"alerts": 50, "ai_daily": 300}

DEFAULT_PAYMENT_INSTRUCTIONS = (
    "للاشتراك: حوّل قيمة الباقة عبر زين كاش أو FIB، ثم أرسل اسم المستخدم وصورة التحويل إلى بريد الدعم. "
    "نفعّل باقتك خلال ساعات."
)


# ---------------------------------------------------------------------------------------------
# Schema


def migrate(c: sqlite3.Connection) -> None:
    cols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
    if "plan" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN plan TEXT")
    if "plan_expires_at" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN plan_expires_at REAL")
    c.execute(
        """CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan TEXT NOT NULL,
            days INTEGER NOT NULL,
            amount_iqd INTEGER,
            method TEXT,
            reference TEXT,
            note TEXT,
            starts_at REAL NOT NULL,
            expires_at REAL NOT NULL,
            created_at REAL NOT NULL
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)")
    c.execute(
        """CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at REAL NOT NULL
        )"""
    )
    c.execute(
        """CREATE TABLE IF NOT EXISTS ai_usage (
            owner TEXT NOT NULL,
            day TEXT NOT NULL,
            n INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(owner, day)
        )"""
    )


_migrated_for: str | None = None


def _ensure(c: sqlite3.Connection) -> None:
    """Lazy migration (tests swap DB files; the app also calls migrate at startup through db.init_db)."""
    global _migrated_for
    key = str(db.DB_PATH)
    if _migrated_for != key:
        migrate(c)
        _migrated_for = key


# ---------------------------------------------------------------------------------------------
# Settings


def get_setting(key: str, default: str | None = None) -> str | None:
    with db._conn() as c:
        _ensure(c)
        row = c.execute("SELECT value FROM app_settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with db._conn() as c:
        _ensure(c)
        c.execute(
            "INSERT INTO app_settings(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (key, value, time.time()),
        )


def enforcement_on() -> bool:
    return (get_setting("plan_enforcement", "0") or "0") == "1"


def payment_instructions() -> str:
    return get_setting("payment_instructions", DEFAULT_PAYMENT_INSTRUCTIONS) or DEFAULT_PAYMENT_INSTRUCTIONS


# ---------------------------------------------------------------------------------------------
# Plans


def user_plan(user_id: int | None) -> dict[str, Any]:
    """The account's plan right now (an expired paid plan counts as free)."""
    if not user_id:
        return {"plan": "free", "expires_at": None, "stored_plan": None}
    with db._conn() as c:
        _ensure(c)
        row = c.execute("SELECT plan, plan_expires_at FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        return {"plan": "free", "expires_at": None, "stored_plan": None}
    stored = row["plan"] if row["plan"] in PLAN_ORDER else None
    exp = float(row["plan_expires_at"]) if row["plan_expires_at"] is not None else None
    active = stored and stored != "free" and exp is not None and exp > time.time()
    return {"plan": stored if active else "free", "expires_at": exp if active else None, "stored_plan": stored}


def effective_limits(plan: str) -> dict[str, int | None]:
    """Limits the app must apply now: the plan's limits when enforcement is on, otherwise unlimited
    (only the hard caps remain)."""
    if enforcement_on():
        return dict(LIMITS.get(plan, LIMITS["free"]))
    return {k: None for k in LIMITS["free"]}


def plan_payload(user_id: int | None) -> dict[str, Any]:
    p = user_plan(user_id)
    now = time.time()
    days_left = int((p["expires_at"] - now) // 86400) if p["expires_at"] else None
    return {
        "plan": p["plan"],
        "label": LABELS_AR[p["plan"]],
        "expires_at": p["expires_at"],
        "days_left": days_left,
        "enforcement": enforcement_on(),
        "limits": effective_limits(p["plan"]),
        "plan_limits": LIMITS,
        "prices_usd": PRICES_USD,
        "labels": LABELS_AR,
        "payment_instructions": payment_instructions(),
    }


def activate(
    user_id: int,
    plan: str,
    days: int,
    amount_iqd: int | None = None,
    method: str | None = None,
    reference: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    """Give an account a paid plan for `days` days and record the payment.
    Renewing the same plan before it ends extends from the current end date; switching plans starts now."""
    if plan not in PLAN_ORDER or plan == "free":
        raise ValueError("invalid plan")
    if not (1 <= int(days) <= 3660):
        raise ValueError("invalid days")
    if method is not None and method not in PAYMENT_METHODS:
        raise ValueError("invalid method")
    now = time.time()
    with db._conn() as c:
        _ensure(c)
        c.execute("BEGIN IMMEDIATE")
        row = c.execute("SELECT plan, plan_expires_at, email FROM users WHERE id=?", (user_id,)).fetchone()
        if not row or not row["email"]:
            raise LookupError("user not found")
        cur_exp = float(row["plan_expires_at"]) if row["plan_expires_at"] is not None else 0.0
        start = cur_exp if (row["plan"] == plan and cur_exp > now) else now
        expires = start + int(days) * 86400
        c.execute("UPDATE users SET plan=?, plan_expires_at=? WHERE id=?", (plan, expires, user_id))
        # A manual activation now owns the plan: a Stripe subscription ending later must not reset it.
        ucols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
        if "stripe_subscription_id" in ucols:
            c.execute("UPDATE users SET stripe_subscription_id=NULL WHERE id=?", (user_id,))
        if "iap_original_id" in ucols:  # same for an App Store / Google Play subscription ending later
            c.execute("UPDATE users SET iap_original_id=NULL WHERE id=?", (user_id,))
        c.execute(
            """INSERT INTO payments(user_id, plan, days, amount_iqd, method, reference, note, starts_at, expires_at, created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (user_id, plan, int(days), amount_iqd, method, (reference or "")[:120] or None, (note or "")[:300] or None, start, expires, now),
        )
    return {"plan": plan, "starts_at": start, "expires_at": expires}


def cancel(user_id: int) -> bool:
    with db._conn() as c:
        _ensure(c)
        cur = c.execute("UPDATE users SET plan='free', plan_expires_at=NULL WHERE id=?", (user_id,))
    return cur.rowcount > 0


def payments(limit: int = 200, user_id: int | None = None) -> list[dict]:
    with db._conn() as c:
        _ensure(c)
        if user_id:
            rows = c.execute(
                """SELECT p.*, u.username FROM payments p LEFT JOIN users u ON u.id=p.user_id
                   WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT ?""",
                (user_id, limit),
            ).fetchall()
        else:
            rows = c.execute(
                """SELECT p.*, u.username FROM payments p LEFT JOIN users u ON u.id=p.user_id
                   ORDER BY p.created_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
    return [dict(r) for r in rows]


def subscription_stats() -> dict[str, Any]:
    now = time.time()
    with db._conn() as c:
        _ensure(c)
        active = {
            r["plan"]: int(r["n"])
            for r in c.execute(
                "SELECT plan, COUNT(*) AS n FROM users WHERE plan IN ('basic','pro','vip') AND plan_expires_at>? GROUP BY plan",
                (now,),
            ).fetchall()
        }
        revenue_30d = c.execute(
            "SELECT COALESCE(SUM(amount_iqd),0) FROM payments WHERE created_at>=?", (now - 30 * 86400,)
        ).fetchone()[0]
        expiring_7d = c.execute(
            "SELECT COUNT(*) FROM users WHERE plan IN ('basic','pro','vip') AND plan_expires_at>? AND plan_expires_at<?",
            (now, now + 7 * 86400),
        ).fetchone()[0]
    mrr_usd = sum(PRICES_USD[p] * n for p, n in active.items())
    return {
        "active": {p: active.get(p, 0) for p in ("basic", "pro", "vip")},
        "paying_total": sum(active.values()),
        "mrr_usd": mrr_usd,
        "revenue_30d_iqd": int(revenue_30d or 0),
        "expiring_7d": int(expiring_7d or 0),
    }


# ---------------------------------------------------------------------------------------------
# AI usage (per account, or per device for guests)


def _today() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def ai_take(owner: str, limit: int | None) -> tuple[bool, int]:
    """Count one AI question for today. Returns (allowed, used_after)."""
    cap = HARD_CAPS["ai_daily"] if limit is None else min(limit, HARD_CAPS["ai_daily"])
    day = _today()
    with db._conn() as c:
        _ensure(c)
        c.execute("BEGIN IMMEDIATE")
        row = c.execute("SELECT n FROM ai_usage WHERE owner=? AND day=?", (owner, day)).fetchone()
        used = int(row["n"]) if row else 0
        if used >= cap:
            return False, used
        c.execute(
            "INSERT INTO ai_usage(owner, day, n) VALUES(?,?,1) ON CONFLICT(owner, day) DO UPDATE SET n=n+1",
            (owner, day),
        )
        c.execute("DELETE FROM ai_usage WHERE day<?", (time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 86400)),))
    return True, used + 1


def ai_used_today(owner: str) -> int:
    with db._conn() as c:
        _ensure(c)
        row = c.execute("SELECT n FROM ai_usage WHERE owner=? AND day=?", (owner, _today())).fetchone()
    return int(row["n"]) if row else 0
