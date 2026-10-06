"""Mobile in-app subscriptions through RevenueCat webhooks."""
import json
import time

import pytest
from fastapi.testclient import TestClient

import db
import main
import plans
from core import db_conn

SECRET = "rc-webhook-secret-abc"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "rc.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    monkeypatch.setattr(plans, "_migrated_for", None)
    monkeypatch.setenv("REVENUECAT_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("REVENUECAT_IOS_KEY", "appl_public")
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _user(client, name="iap_user"):
    r = client.post("/api/auth/register", json={"username": name, "email": f"{name}@x.co", "password": "pass1234"})
    assert r.status_code == 200, r.text
    return r.json()


def _send(client, ev, auth=SECRET):
    return client.post(
        "/api/billing/revenuecat/webhook",
        content=json.dumps({"api_version": "1.0", "event": ev}),
        headers={"Authorization": auth, "Content-Type": "application/json"},
    )


def _ev(eid, etype, uid, product="matrix_pro_monthly", days=30, **kw):
    now_ms = int(time.time() * 1000)
    return {
        "id": eid,
        "type": etype,
        "app_user_id": str(uid),
        "product_id": product,
        "purchased_at_ms": now_ms,
        "expiration_at_ms": now_ms + days * 86400 * 1000,
        "store": "APP_STORE",
        "environment": "PRODUCTION",
        "original_transaction_id": "orig-1",
        "transaction_id": f"tx-{eid}",
        "price": 14.99,
        **kw,
    }


def _plan(client, token):
    return client.get("/api/plan", headers={"Authorization": f"Bearer {token}"}).json()


def test_mobile_config_public(client):
    cfg = client.get("/api/billing/mobile-config").json()
    assert cfg["enabled"] is True and cfg["ios_key"] == "appl_public" and cfg["products"]["pro"] == "matrix_pro_monthly"


def test_auth_required(client):
    u = _user(client)
    assert _send(client, _ev("e0", "INITIAL_PURCHASE", u["user_id"]), auth="wrong").status_code == 401
    assert _send(client, _ev("e0", "INITIAL_PURCHASE", u["user_id"]), auth="").status_code == 401
    assert _send(client, _ev("e0", "INITIAL_PURCHASE", u["user_id"]), auth="Bearer " + SECRET).status_code == 200


def test_off_without_secret(client, monkeypatch):
    monkeypatch.delenv("REVENUECAT_WEBHOOK_SECRET")
    assert _send(client, {"id": "x", "type": "TEST"}).status_code == 404
    assert client.get("/api/billing/mobile-config").json()["enabled"] is False


def test_purchase_grants_plan_and_records_payment(client):
    u = _user(client)
    r = _send(client, _ev("e1", "INITIAL_PURCHASE", u["user_id"], product="matrix_vip_monthly:monthly"))
    assert r.json()["plan"] == "vip"
    p = _plan(client, u["token"])
    assert p["plan"] == "vip" and p["days_left"] >= 30
    pays = plans.payments(user_id=u["user_id"])
    assert len(pays) == 1 and pays[0]["method"] == "appstore" and pays[0]["amount_usd_cents"] == 1499
    # duplicate delivery is ignored
    assert _send(client, _ev("e1", "INITIAL_PURCHASE", u["user_id"])).json()["duplicate"] is True
    assert len(plans.payments(user_id=u["user_id"])) == 1


def test_cancellation_keeps_access_expiration_ends_it(client):
    u = _user(client)
    _send(client, _ev("e1", "INITIAL_PURCHASE", u["user_id"]))
    _send(client, _ev("e2", "CANCELLATION", u["user_id"]))
    assert _plan(client, u["token"])["plan"] == "pro"
    _send(client, _ev("e3", "EXPIRATION", u["user_id"]))
    assert _plan(client, u["token"])["plan"] == "free"


def test_expiration_does_not_end_manual_plan(client):
    u = _user(client)
    _send(client, _ev("e1", "INITIAL_PURCHASE", u["user_id"]))
    plans.activate(u["user_id"], "vip", 30, method="zaincash")
    _send(client, _ev("e2", "EXPIRATION", u["user_id"]))
    assert _plan(client, u["token"])["plan"] == "vip"


def test_product_change_and_unknown(client):
    u = _user(client)
    _send(client, _ev("e1", "INITIAL_PURCHASE", u["user_id"], product="matrix_basic_monthly"))
    _send(client, _ev("e2", "PRODUCT_CHANGE", u["user_id"], product="matrix_basic_monthly", new_product_id="matrix_pro_monthly"))
    assert _plan(client, u["token"])["plan"] == "pro"
    assert _send(client, _ev("e3", "RENEWAL", u["user_id"], product="other_product")).json()["ignored"] == "unknown product"
    assert _send(client, _ev("e4", "RENEWAL", "$RCAnonymousID:abc")).json()["ignored"] == "unknown user"
    assert _send(client, {"id": "t1", "type": "TEST"}).json()["type"] == "TEST"
    assert client.post("/api/billing/revenuecat/webhook", content=b"not json", headers={"Authorization": SECRET}).status_code == 400
