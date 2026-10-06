"""Stripe subscriptions for the web / desktop app (card payments, monthly, automatic renewal).

Environment (set with set_stripe.sh, never in chat or git):
    STRIPE_SECRET_KEY        sk_live_... or sk_test_...
    STRIPE_WEBHOOK_SECRET    whsec_... (from the webhook endpoint created in the Stripe dashboard)
    STRIPE_PRICE_BASIC / STRIPE_PRICE_PRO / STRIPE_PRICE_VIP   optional explicit price ids; otherwise prices
                             with lookup keys matrix_basic_monthly / matrix_pro_monthly / matrix_vip_monthly are
                             used, and created automatically (USD 10 / 15 / 20 per month) the first time.

Flow: /api/billing/checkout -> Stripe Checkout -> webhook (checkout.session.completed, customer.subscription.*,
invoice.paid) -> the account's plan is set until the end of the paid period (+ a 2-day grace for renewals).
Mobile apps must use the stores' in-app billing; this module is for web and desktop.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from typing import Any

import db
import plans

log = logging.getLogger("matrix.stripe")

LOOKUP_KEYS = {"basic": "matrix_basic_monthly", "pro": "matrix_pro_monthly", "vip": "matrix_vip_monthly"}
GRACE_SECONDS = 2 * 86400
ACTIVE_STATUSES = ("active", "trialing", "past_due")

_price_cache: dict[str, str] = {}


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def configured() -> bool:
    return _env("STRIPE_SECRET_KEY").startswith(("sk_", "rk_")) and _env("STRIPE_WEBHOOK_SECRET").startswith("whsec_")


def test_mode() -> bool:
    return _env("STRIPE_SECRET_KEY").startswith(("sk_test_", "rk_test_"))


def _stripe():
    import stripe  # imported lazily: the app runs without the package when billing is off

    stripe.api_key = _env("STRIPE_SECRET_KEY")
    stripe.max_network_retries = 2
    return stripe


# ---------------------------------------------------------------------------------------------
# Schema


def migrate(c: sqlite3.Connection) -> None:
    cols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
    if "stripe_customer_id" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT")
    if "stripe_subscription_id" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT")
    pcols = {r[1] for r in c.execute("PRAGMA table_info(payments)").fetchall()}
    if pcols and "amount_usd_cents" not in pcols:
        c.execute("ALTER TABLE payments ADD COLUMN amount_usd_cents INTEGER")
    c.execute(
        """CREATE TABLE IF NOT EXISTS stripe_events (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            received_at REAL NOT NULL
        )"""
    )


_migrated_for: str | None = None


def _ensure(c: sqlite3.Connection) -> None:
    global _migrated_for
    key = str(db.DB_PATH)
    if _migrated_for != key:
        plans.migrate(c)
        migrate(c)
        _migrated_for = key


# ---------------------------------------------------------------------------------------------
# Prices


def price_id(plan: str) -> str:
    """Stripe price id for a plan (explicit env id, else lookup key, else create product + price)."""
    if plan not in LOOKUP_KEYS:
        raise ValueError("invalid plan")
    explicit = _env(f"STRIPE_PRICE_{plan.upper()}")
    if explicit:
        return explicit
    if plan in _price_cache:
        return _price_cache[plan]
    stripe = _stripe()
    found = stripe.Price.list(lookup_keys=[LOOKUP_KEYS[plan]], active=True, limit=1)
    data = list(getattr(found, "data", []) or [])
    if data:
        _price_cache[plan] = data[0]["id"]
        return _price_cache[plan]
    product = stripe.Product.create(
        name=f"MATRIX {plans.LABELS_AR[plan]} ({plan.upper()})",
        description="MATRIX — اشتراك شهري في أدوات التحليل الفني التعليمية",
        metadata={"matrix_plan": plan},
    )
    price = stripe.Price.create(
        product=product["id"],
        unit_amount=int(plans.PRICES_USD[plan]) * 100,
        currency="usd",
        recurring={"interval": "month"},
        lookup_key=LOOKUP_KEYS[plan],
        metadata={"matrix_plan": plan},
    )
    _price_cache[plan] = price["id"]
    return price["id"]


def plan_for_price(price: str | None) -> str | None:
    if not price:
        return None
    for plan in LOOKUP_KEYS:
        explicit = _env(f"STRIPE_PRICE_{plan.upper()}")
        if price == explicit or price == _price_cache.get(plan):
            return plan
    return None


# ---------------------------------------------------------------------------------------------
# Customers


def _user_row(user_id: int) -> sqlite3.Row | None:
    with db._conn() as c:
        _ensure(c)
        return c.execute(
            "SELECT id, username, email, stripe_customer_id, stripe_subscription_id FROM users WHERE id=?", (user_id,)
        ).fetchone()


def _customer_for(user_id: int) -> str:
    row = _user_row(user_id)
    if not row or not row["email"]:
        raise LookupError("user not found")
    if row["stripe_customer_id"]:
        return str(row["stripe_customer_id"])
    stripe = _stripe()
    cust = stripe.Customer.create(
        email=row["email"], name=row["username"], metadata={"matrix_user_id": str(user_id), "username": row["username"]}
    )
    with db._conn() as c:
        c.execute("UPDATE users SET stripe_customer_id=? WHERE id=?", (cust["id"], user_id))
    return str(cust["id"])


def _user_by_customer(customer_id: str | None) -> int | None:
    if not customer_id:
        return None
    with db._conn() as c:
        _ensure(c)
        row = c.execute("SELECT id FROM users WHERE stripe_customer_id=?", (customer_id,)).fetchone()
    return int(row["id"]) if row else None


# ---------------------------------------------------------------------------------------------
# Checkout / portal


def create_checkout(user_id: int, plan: str, base_url: str) -> str:
    stripe = _stripe()
    customer = _customer_for(user_id)
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer,
        client_reference_id=str(user_id),
        line_items=[{"price": price_id(plan), "quantity": 1}],
        allow_promotion_codes=True,
        subscription_data={"metadata": {"matrix_user_id": str(user_id), "matrix_plan": plan}},
        metadata={"matrix_user_id": str(user_id), "matrix_plan": plan},
        success_url=f"{base_url}/?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/?billing=cancel",
        locale="auto",
    )
    return str(session["url"])


def create_portal(user_id: int, base_url: str) -> str:
    row = _user_row(user_id)
    if not row or not row["stripe_customer_id"]:
        raise LookupError("no stripe customer")
    stripe = _stripe()
    portal = stripe.billing_portal.Session.create(customer=row["stripe_customer_id"], return_url=f"{base_url}/")
    return str(portal["url"])


# ---------------------------------------------------------------------------------------------
# Webhook


def _set_plan_until(user_id: int, plan: str | None, until: float | None, subscription_id: str | None) -> None:
    with db._conn() as c:
        _ensure(c)
        if plan and until:
            c.execute(
                "UPDATE users SET plan=?, plan_expires_at=?, stripe_subscription_id=? WHERE id=?",
                (plan, until, subscription_id, user_id),
            )
            if any(r[1] == "iap_original_id" for r in c.execute("PRAGMA table_info(users)").fetchall()):
                c.execute("UPDATE users SET iap_original_id=NULL WHERE id=?", (user_id,))
        else:
            # Ended: only clear when this subscription is the one that set the plan (a manual Zain Cash
            # activation recorded afterwards must not be wiped by an old Stripe subscription ending).
            c.execute(
                "UPDATE users SET plan='free', plan_expires_at=NULL, stripe_subscription_id=NULL WHERE id=? AND stripe_subscription_id=?",
                (user_id, subscription_id),
            )


def _sub_plan(sub: dict) -> str | None:
    meta = sub.get("metadata") or {}
    if meta.get("matrix_plan") in LOOKUP_KEYS:
        return meta["matrix_plan"]
    items = ((sub.get("items") or {}).get("data")) or []
    for it in items:
        price = it.get("price") or {}
        lk = price.get("lookup_key")
        for plan, key in LOOKUP_KEYS.items():
            if lk == key:
                return plan
        p = plan_for_price(price.get("id"))
        if p:
            return p
        pm = (price.get("metadata") or {}).get("matrix_plan")
        if pm in LOOKUP_KEYS:
            return pm
    return None


def _period_end(sub: dict) -> float | None:
    end = sub.get("current_period_end")
    if end is None:  # newer API versions keep it on the items
        items = ((sub.get("items") or {}).get("data")) or []
        ends = [it.get("current_period_end") for it in items if it.get("current_period_end")]
        end = max(ends) if ends else None
    return float(end) if end else None


def _apply_subscription(sub: dict) -> dict:
    user_id = None
    meta = sub.get("metadata") or {}
    if str(meta.get("matrix_user_id", "")).isdigit():
        user_id = int(meta["matrix_user_id"])
    user_id = user_id or _user_by_customer(sub.get("customer"))
    if not user_id:
        return {"ignored": "unknown customer"}
    status = sub.get("status")
    plan = _sub_plan(sub)
    end = _period_end(sub)
    if status in ACTIVE_STATUSES and plan and end:
        _set_plan_until(user_id, plan, end + GRACE_SECONDS, sub.get("id"))
        return {"user_id": user_id, "plan": plan, "until": end + GRACE_SECONDS}
    if status in ("canceled", "unpaid", "incomplete_expired"):
        _set_plan_until(user_id, None, None, sub.get("id"))
        return {"user_id": user_id, "plan": "free"}
    return {"user_id": user_id, "status": status}


def _record_invoice(inv: dict) -> dict:
    user_id = _user_by_customer(inv.get("customer"))
    if not user_id:
        return {"ignored": "unknown customer"}
    lines = ((inv.get("lines") or {}).get("data")) or []
    plan = None
    start = end = None
    for ln in lines:
        price = (ln.get("price") or ((ln.get("pricing") or {}).get("price_details") or {})) or {}
        lk = price.get("lookup_key") if isinstance(price, dict) else None
        for p, key in LOOKUP_KEYS.items():
            if lk == key:
                plan = p
        meta_plan = ((ln.get("metadata") or {}).get("matrix_plan"))
        plan = plan or (meta_plan if meta_plan in LOOKUP_KEYS else None)
        per = ln.get("period") or {}
        start = per.get("start") or start
        end = per.get("end") or end
    with db._conn() as c:
        _ensure(c)
        row = c.execute("SELECT plan FROM users WHERE id=?", (user_id,)).fetchone()
        plan = plan or (row["plan"] if row and row["plan"] in LOOKUP_KEYS else "pro")
        now = time.time()
        c.execute(
            """INSERT INTO payments(user_id, plan, days, amount_iqd, method, reference, note, starts_at, expires_at, created_at, amount_usd_cents)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (
                user_id,
                plan,
                int(round(((end or now + 30 * 86400) - (start or now)) / 86400)) or 30,
                None,
                "stripe",
                str(inv.get("id") or "")[:120] or None,
                "Stripe invoice" + (" (test)" if not inv.get("livemode", True) else ""),
                float(start or now),
                float(end or now + 30 * 86400),
                now,
                int(inv.get("amount_paid") or 0),
            ),
        )
    return {"user_id": user_id, "recorded": True}


def handle_event(payload: bytes, sig_header: str | None) -> dict[str, Any]:
    """Verify and process one webhook call. ValueError on a bad signature/payload."""
    stripe = _stripe()
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, _env("STRIPE_WEBHOOK_SECRET"))
    except Exception as exc:  # stripe.SignatureVerificationError, ValueError
        raise ValueError("invalid signature") from exc
    ev = json.loads(payload.decode("utf-8")) if isinstance(payload, (bytes, bytearray)) else json.loads(payload)
    ev_id, ev_type = ev.get("id"), ev.get("type")
    obj = ((ev.get("data") or {}).get("object")) or {}

    with db._conn() as c:
        _ensure(c)
        c.execute("BEGIN IMMEDIATE")
        if c.execute("SELECT 1 FROM stripe_events WHERE id=?", (ev_id,)).fetchone():
            return {"duplicate": True}
        c.execute("INSERT INTO stripe_events(id, type, received_at) VALUES(?,?,?)", (ev_id, ev_type, time.time()))

    result: dict[str, Any] = {"type": ev_type}
    if ev_type == "checkout.session.completed":
        uid = obj.get("client_reference_id")
        cust = obj.get("customer")
        if uid and str(uid).isdigit() and cust:
            with db._conn() as c:
                c.execute(
                    "UPDATE users SET stripe_customer_id=COALESCE(stripe_customer_id, ?) WHERE id=?", (cust, int(uid))
                )
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                sub = stripe.Subscription.retrieve(sub_id)
                result.update(_apply_subscription(_to_dict(sub)))
            except Exception as exc:  # network: the subscription.* event will apply it anyway
                log.warning("stripe: could not fetch subscription %s: %s", sub_id, exc)
    elif ev_type in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        if ev_type == "customer.subscription.deleted":
            obj = dict(obj, status="canceled")
        result.update(_apply_subscription(obj))
    elif ev_type == "invoice.paid":
        result.update(_record_invoice(obj))
    else:
        result["ignored"] = True
    return result


def _to_dict(obj: Any) -> dict:
    if isinstance(obj, dict):
        return obj
    to = getattr(obj, "to_dict_recursive", None) or getattr(obj, "to_dict", None)
    if to:
        return to()
    return json.loads(str(obj))
