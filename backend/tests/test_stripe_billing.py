"""Stripe billing: checkout session, webhook signature, plan activation / renewal / cancel, idempotency."""
import hashlib
import hmac
import json
import time
import uuid

import pytest
import stripe
from fastapi.testclient import TestClient

import main
import plans
import stripe_billing

WHSEC = "whsec_test_secret_123"


@pytest.fixture()
def billing(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_dummy")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WHSEC)
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://matrix.test")
    stripe_billing._price_cache.clear()
    calls = {"customers": 0, "sessions": [], "products": 0}

    class Obj(dict):
        def __getattr__(self, k):
            return self[k]

    monkeypatch.setattr(stripe.Customer, "create", staticmethod(lambda **kw: calls.__setitem__("customers", calls["customers"] + 1) or Obj(id="cus_" + uuid.uuid4().hex[:8])))
    monkeypatch.setattr(stripe.Price, "list", staticmethod(lambda **kw: Obj(data=[])))
    monkeypatch.setattr(stripe.Product, "create", staticmethod(lambda **kw: calls.__setitem__("products", calls["products"] + 1) or Obj(id="prod_1")))
    monkeypatch.setattr(stripe.Price, "create", staticmethod(lambda **kw: Obj(id="price_" + kw["lookup_key"])))

    def sess(**kw):
        calls["sessions"].append(kw)
        return Obj(url="https://checkout.stripe.test/c/" + uuid.uuid4().hex[:6])

    monkeypatch.setattr(stripe.checkout.Session, "create", staticmethod(sess))
    return calls


def _register(c):
    name = "sb" + uuid.uuid4().hex[:10]
    r = c.post(
        "/api/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": "secret1234", "role": "trader"},
        headers={"X-Install-Id": uuid.uuid4().hex},
    )
    d = r.json()
    return d["user_id"], {"Authorization": "Bearer " + d["token"]}


def _signed(c, event: dict):
    payload = json.dumps(event).encode()
    t = int(time.time())
    sig = hmac.new(WHSEC.encode(), f"{t}.".encode() + payload, hashlib.sha256).hexdigest()
    return c.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": f"t={t},v1={sig}", "Content-Type": "application/json"})


def _sub_event(ev_type, uid, plan, status="active", period_end=None, sub_id="sub_1", customer=None):
    return {
        "id": "evt_" + uuid.uuid4().hex[:10],
        "type": ev_type,
        "data": {"object": {
            "id": sub_id, "object": "subscription", "status": status, "customer": customer,
            "metadata": {"matrix_user_id": str(uid), "matrix_plan": plan},
            "current_period_end": period_end or int(time.time()) + 30 * 86400,
            "items": {"data": [{"price": {"id": "price_x", "lookup_key": stripe_billing.LOOKUP_KEYS[plan]}}]},
        }},
    }


def test_disabled_without_keys(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    with TestClient(main.app) as c:
        assert c.get("/api/billing/config").json()["enabled"] is False
        assert c.post("/api/billing/checkout", json={"plan": "pro"}).status_code == 503
        assert c.post("/api/billing/webhook", content=b"{}").status_code == 404


def test_checkout_requires_login_and_creates_session(billing):
    with TestClient(main.app) as c:
        assert c.get("/api/billing/config").json() == {"enabled": True, "test_mode": True}
        assert c.post("/api/billing/checkout", json={"plan": "pro"}).status_code == 401
        uid, h = _register(c)
        r = c.post("/api/billing/checkout", json={"plan": "pro"}, headers=h)
        assert r.status_code == 200 and r.json()["url"].startswith("https://checkout.stripe.test/")
        kw = billing["sessions"][-1]
        assert kw["mode"] == "subscription" and kw["client_reference_id"] == str(uid)
        assert kw["line_items"][0]["price"] == "price_matrix_pro_monthly"
        assert kw["success_url"].startswith("https://matrix.test/?billing=success")
        # second checkout reuses the customer
        c.post("/api/billing/checkout", json={"plan": "vip"}, headers=h)
        assert billing["customers"] == 1
        assert c.post("/api/billing/checkout", json={"plan": "free"}, headers=h).status_code == 422


def test_webhook_signature_and_activation_flow(billing):
    with TestClient(main.app) as c:
        uid, h = _register(c)
        bad = c.post("/api/billing/webhook", content=b'{"id":"x"}', headers={"Stripe-Signature": "t=1,v1=bad"})
        assert bad.status_code == 400
        end = int(time.time()) + 30 * 86400
        r = _signed(c, _sub_event("customer.subscription.created", uid, "pro", period_end=end))
        assert r.status_code == 200 and r.json()["plan"] == "pro"
        me = c.get("/api/plan", headers=h).json()
        assert me["plan"] == "pro" and me["expires_at"] == pytest.approx(end + stripe_billing.GRACE_SECONDS)
        # duplicate delivery is ignored
        ev = _sub_event("customer.subscription.updated", uid, "vip")
        assert _signed(c, ev).json()["plan"] == "vip"
        assert _signed(c, ev).json().get("duplicate") is True
        # cancel -> free
        _signed(c, _sub_event("customer.subscription.deleted", uid, "vip"))
        assert c.get("/api/plan", headers=h).json()["plan"] == "free"


def test_manual_activation_not_wiped_by_old_subscription_end(billing, monkeypatch):
    monkeypatch.setenv("MATRIX_ADMIN_TOKEN", "a" * 32)
    with TestClient(main.app) as c:
        uid, h = _register(c)
        _signed(c, _sub_event("customer.subscription.created", uid, "basic", sub_id="sub_old"))
        c.post(f"/api/admin/users/{uid}/plan", json={"plan": "vip", "days": 30, "method": "zaincash"}, headers={"X-Admin-Token": "a" * 32})
        _signed(c, _sub_event("customer.subscription.deleted", uid, "basic", sub_id="sub_old"))
        assert c.get("/api/plan", headers=h).json()["plan"] == "vip"


def test_invoice_paid_recorded(billing, monkeypatch):
    monkeypatch.setenv("MATRIX_ADMIN_TOKEN", "a" * 32)
    with TestClient(main.app) as c:
        uid, h = _register(c)
        cust = "cus_" + uuid.uuid4().hex[:8]
        import db

        with db._conn() as conn:
            conn.execute("UPDATE users SET stripe_customer_id=? WHERE id=?", (cust, uid))
        now = int(time.time())
        ev = {"id": "evt_" + uuid.uuid4().hex[:8], "type": "invoice.paid", "data": {"object": {
            "id": "in_1", "customer": cust, "amount_paid": 1500, "livemode": False,
            "lines": {"data": [{"price": {"lookup_key": "matrix_pro_monthly"}, "period": {"start": now, "end": now + 30 * 86400}}]}}}}
        assert _signed(c, ev).status_code == 200
        pays = c.get(f"/api/admin/payments?user_id={uid}", headers={"X-Admin-Token": "a" * 32}).json()["payments"]
        assert pays and pays[0]["method"] == "stripe" and pays[0]["amount_usd_cents"] == 1500 and pays[0]["plan"] == "pro"
