"""In-app subscriptions on iPhone / Android through RevenueCat.

The mobile app buys with Apple / Google billing (store rules for digital subscriptions) using the RevenueCat SDK,
logged in as the MATRIX account id (`app_user_id` = str(user_id)). RevenueCat validates the receipts with the
stores and calls our webhook; the webhook gives the account its plan until the store's expiry date.

Environment (all optional; without them the feature is off and the app hides the purchase buttons):
  REVENUECAT_WEBHOOK_SECRET   value RevenueCat sends in the Authorization header of every webhook call
  REVENUECAT_IOS_KEY          public SDK key for iOS (appl_...)       — safe to send to the app
  REVENUECAT_ANDROID_KEY      public SDK key for Android (goog_...)   — safe to send to the app
Store products must be named like the Stripe prices: matrix_basic_monthly / matrix_pro_monthly / matrix_vip_monthly
(an id containing one of those keys also works, e.g. Google's "matrix_pro_monthly:monthly").
"""
from __future__ import annotations

import json
import logging
import os
import re
import secrets
import sqlite3
import time
from typing import Any

import db
import plans

log = logging.getLogger("matrix.revenuecat")

GRACE_SECONDS = 2 * 86400
PRODUCT_KEYS = {"basic": "matrix_basic_monthly", "pro": "matrix_pro_monthly", "vip": "matrix_vip_monthly"}
GRANT_TYPES = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "UNCANCELLATION",
    "SUBSCRIPTION_EXTENDED",
    "TEMPORARY_ENTITLEMENT_GRANT",
    "NON_RENEWING_PURCHASE",
}
PAID_TYPES = {"INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"}
END_TYPES = {"EXPIRATION"}
STORE_METHOD = {"APP_STORE": "appstore", "MAC_APP_STORE": "appstore", "PLAY_STORE": "playstore"}


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def configured() -> bool:
    return bool(_env("REVENUECAT_WEBHOOK_SECRET"))


def mobile_config() -> dict[str, Any]:
    ios, android = _env("REVENUECAT_IOS_KEY"), _env("REVENUECAT_ANDROID_KEY")
    return {
        "enabled": configured() and bool(ios or android),
        "ios_key": ios or None,
        "android_key": android or None,
        "products": PRODUCT_KEYS,
    }


def migrate(c: sqlite3.Connection) -> None:
    cols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
    if "iap_original_id" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN iap_original_id TEXT")
    c.execute(
        """CREATE TABLE IF NOT EXISTS iap_events (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            received_at REAL NOT NULL
        )"""
    )


def _ensure(c: sqlite3.Connection) -> None:
    plans.migrate(c)
    pcols = {r[1] for r in c.execute("PRAGMA table_info(payments)").fetchall()}
    if pcols and "amount_usd_cents" not in pcols:
        c.execute("ALTER TABLE payments ADD COLUMN amount_usd_cents INTEGER")
    migrate(c)


def plan_for_product(product_id: str | None) -> str | None:
    pid = (product_id or "").lower()
    for plan in ("vip", "pro", "basic"):  # longest-match order is irrelevant: keys do not overlap
        if PRODUCT_KEYS[plan] in pid:
            return plan
    return None


def _user_id(ev: dict) -> int | None:
    cands = [ev.get("app_user_id"), ev.get("original_app_user_id"), *(ev.get("aliases") or [])]
    for c in cands:
        s = str(c or "")
        if re.fullmatch(r"\d{1,12}", s):
            return int(s)
    return None


def check_auth(header: str | None) -> bool:
    expected = _env("REVENUECAT_WEBHOOK_SECRET")
    if not expected:
        return False
    got = (header or "").strip()
    if got.lower().startswith("bearer "):
        got = got[7:].strip()
    exp = expected[7:].strip() if expected.lower().startswith("bearer ") else expected
    return bool(got) and secrets.compare_digest(got.encode("utf-8", "replace"), exp.encode("utf-8", "replace"))


def handle(body: bytes) -> dict[str, Any]:
    """Process one webhook call (auth already checked). ValueError on a malformed body."""
    try:
        data = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("invalid json") from exc
    ev = data.get("event") if isinstance(data, dict) else None
    if not isinstance(ev, dict) or not ev.get("id") or not ev.get("type"):
        raise ValueError("missing event")
    ev_id, ev_type = str(ev["id"])[:120], str(ev["type"])[:60]

    with db._conn() as c:
        _ensure(c)
        c.execute("BEGIN IMMEDIATE")
        if c.execute("SELECT 1 FROM iap_events WHERE id=?", (ev_id,)).fetchone():
            return {"type": ev_type, "duplicate": True}
        c.execute("INSERT INTO iap_events(id, type, received_at) VALUES(?,?,?)", (ev_id, ev_type, time.time()))

    if ev_type == "TEST":
        return {"type": ev_type, "ok": True}
    uid = _user_id(ev)
    if uid is None:
        return {"type": ev_type, "ignored": "unknown user"}
    product = ev.get("new_product_id") if ev_type == "PRODUCT_CHANGE" and ev.get("new_product_id") else ev.get("product_id")
    plan = plan_for_product(product)
    original = str(ev.get("original_transaction_id") or ev.get("transaction_id") or "")[:120] or None
    sandbox = str(ev.get("environment") or "").upper() == "SANDBOX"

    if ev_type in GRANT_TYPES:
        exp_ms = ev.get("expiration_at_ms")
        if not plan:
            return {"type": ev_type, "ignored": "unknown product"}
        if not isinstance(exp_ms, (int, float)) or exp_ms <= 0:
            return {"type": ev_type, "ignored": "no expiry"}
        until = float(exp_ms) / 1000 + GRACE_SECONDS
        with db._conn() as c:
            _ensure(c)
            row = c.execute("SELECT id FROM users WHERE id=? AND email IS NOT NULL", (uid,)).fetchone()
            if not row:
                return {"type": ev_type, "ignored": "unknown user"}
            c.execute(
                "UPDATE users SET plan=?, plan_expires_at=?, iap_original_id=? WHERE id=?",
                (plan, until, original, uid),
            )
            if any(r[1] == "stripe_subscription_id" for r in c.execute("PRAGMA table_info(users)").fetchall()):
                c.execute("UPDATE users SET stripe_subscription_id=NULL WHERE id=?", (uid,))
            if ev_type in PAID_TYPES:
                now = time.time()
                price = ev.get("price")  # USD value of the transaction, as RevenueCat reports it
                start = float(ev.get("purchased_at_ms") or now * 1000) / 1000
                c.execute(
                    """INSERT INTO payments(user_id, plan, days, amount_iqd, method, reference, note, starts_at, expires_at, created_at, amount_usd_cents)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        uid,
                        plan,
                        max(1, int(round((float(exp_ms) / 1000 - start) / 86400))),
                        None,
                        STORE_METHOD.get(str(ev.get("store") or "").upper(), "other"),
                        str(ev.get("transaction_id") or "")[:120] or None,
                        "In-app subscription" + (" (sandbox)" if sandbox else ""),
                        start,
                        float(exp_ms) / 1000,
                        now,
                        int(round(float(price) * 100)) if isinstance(price, (int, float)) and price >= 0 else None,
                    ),
                )
        return {"type": ev_type, "plan": plan, "user_id": uid, "until": until}

    if ev_type in END_TYPES:
        with db._conn() as c:
            _ensure(c)
            # only end the plan this store subscription gave (a later manual / Stripe plan is kept)
            cur = c.execute(
                "UPDATE users SET plan='free', plan_expires_at=NULL, iap_original_id=NULL WHERE id=? AND iap_original_id IS NOT NULL AND (iap_original_id=? OR ? IS NULL)",
                (uid, original, original),
            )
        return {"type": ev_type, "plan": "free" if cur.rowcount else None, "user_id": uid}

    # CANCELLATION / BILLING_ISSUE / TRANSFER ...: access stays until the expiry date already stored
    return {"type": ev_type, "ignored": True}
