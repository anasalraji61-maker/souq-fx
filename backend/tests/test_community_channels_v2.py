"""Community channels v2: real sender names, link filter, reports (hide for reporter / threshold),
moderation and account deletion."""
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_community_v2.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _reg(client, name):
    r = client.post("/api/auth/register", json={"username": name, "email": f"{name}@x.co", "password": "pass1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _post(client, h, text, ch="forex", **kw):
    return client.post(f"/api/community/channels/{ch}/messages", json={"content": text, **kw}, headers=h)


def _list(client, h, ch="forex", **params):
    r = client.get(f"/api/community/channels/{ch}/messages", headers=h, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_sender_name_is_account_and_mine_flag(client):
    a = _reg(client, "alice_v2")
    b = _reg(client, "bob_v2")
    r = _post(client, a, "hello traders", sender_name="Admin")
    assert r.status_code == 200
    assert r.json()["sender_name"] == "alice_v2"
    assert r.json()["mine"] is True
    msgs = _list(client, b)
    assert msgs[0]["sender_name"] == "alice_v2"
    assert msgs[0]["mine"] is False
    assert _list(client, a)[0]["mine"] is True


@pytest.mark.parametrize("text", ["join t.me/vipsignals", "see https://x.example", "www.scam.io now", "ｔ．ｍｅ/abc"])
def test_links_rejected(client, text):
    a = _reg(client, "linker_v2")
    r = _post(client, a, text)
    assert r.status_code == 400
    assert r.json()["detail"] == "links_not_allowed"


def test_blank_rejected(client):
    a = _reg(client, "blank_v2")
    assert _post(client, a, "​  ").status_code == 400


def test_symbol_tag_normalised(client):
    a = _reg(client, "sym_v2")
    r = _post(client, a, "gold looks heavy", symbol_tag=" xauusd ", sentiment="weird")
    assert r.json()["symbol_tag"] == "XAUUSD"
    assert r.json()["sentiment"] == "neutral"


def test_report_hides_for_reporter_then_everyone(client):
    author = _reg(client, "author_v2")
    mid = _post(client, author, "a message to report").json()["id"]
    viewers = [_reg(client, f"viewer{i}_v2") for i in range(4)]
    r = client.post("/api/reports", json={"kind": "channel_message", "target_id": mid, "reason": "scam"}, headers=viewers[0])
    assert r.json() == {"ok": True, "new": True}
    assert all(m["id"] != mid for m in _list(client, viewers[0]))
    assert any(m["id"] == mid for m in _list(client, viewers[3]))
    for v in viewers[1:3]:
        client.post("/api/reports", json={"kind": "channel_message", "target_id": mid, "reason": "spam"}, headers=v)
    assert all(m["id"] != mid for m in _list(client, viewers[3]))
    # duplicate report from the same account is not new
    r = client.post("/api/reports", json={"kind": "channel_message", "target_id": mid, "reason": "scam"}, headers=viewers[0])
    assert r.json()["new"] is False


def test_report_unknown_message(client):
    h = _reg(client, "rep_v2")
    r = client.post("/api/reports", json={"kind": "channel_message", "target_id": "99999", "reason": "spam"}, headers=h)
    assert r.json() == {"ok": False, "error": "not_found"}


def test_moderation_lists_and_removes(client, monkeypatch):
    monkeypatch.setenv("MATRIX_MODERATION_TOKEN", "mod-secret")
    author = _reg(client, "modauthor_v2")
    mid = _post(client, author, "bad content here", ch="metals").json()["id"]
    rep = _reg(client, "modrep_v2")
    client.post("/api/reports", json={"kind": "channel_message", "target_id": mid, "reason": "abuse"}, headers=rep)
    r = client.get("/api/moderation/reports", headers={"X-Moderation-Token": "mod-secret"})
    items = [x for x in r.json()["reports"] if x["kind"] == "channel_message"]
    assert items and items[0]["author"] == "modauthor_v2" and "#metals" in items[0]["text"]
    r = client.post("/api/moderation/action", json={"kind": "channel_message", "target_id": mid, "action": "remove"},
                    headers={"X-Moderation-Token": "mod-secret"})
    assert r.json()["ok"] is True
    assert _list(client, author, ch="metals") == []


def test_limit_after_hiding_and_before_id(client):
    a = _reg(client, "pager_v2")
    ids = []
    for i in range(5):
        db_path = None  # rate limit: 5 per 10 s is the cap, so exactly 5 posts pass
        ids.append(_post(client, a, f"msg {i}").json()["id"])
    first = _list(client, a, limit=2)
    assert [m["id"] for m in first] == [ids[4], ids[3]]
    older = _list(client, a, limit=2, before_id=int(ids[3]))
    assert [m["id"] for m in older] == [ids[2], ids[1]]


def test_account_deletion_removes_channel_messages(client):
    a = _reg(client, "deleteme_v2")
    _post(client, a, "soon gone")
    other = _reg(client, "stay_v2")
    r = client.request("DELETE", "/api/auth/account", headers=a, json={"password": "pass1234"})
    assert r.status_code in (200, 204), r.text
    assert _list(client, other) == []
