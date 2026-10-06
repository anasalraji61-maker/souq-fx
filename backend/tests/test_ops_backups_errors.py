"""Ops: database backups (consistent, gzip, retention, admin download) and error monitoring."""
import gzip
import sqlite3

import pytest
from fastapi.testclient import TestClient

import db
import main
import ops
from core import db_conn

ADMIN = {"X-Admin-Token": "test-admin-secret-1234567890"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "ops.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    monkeypatch.setenv("MATRIX_ADMIN_TOKEN", ADMIN["X-Admin-Token"])
    monkeypatch.setenv("MATRIX_BACKUP_DIR", str(tmp_path / "bk"))
    monkeypatch.setenv("MATRIX_BACKUP_KEEP", "3")
    monkeypatch.setattr(ops, "_migrated_for", None)
    import routers_ops
    routers_ops._HITS.clear()
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def test_backup_is_consistent_gzip_with_data(client, tmp_path):
    r = client.post("/api/auth/register", json={"username": "bk_user", "email": "bk@x.co", "password": "pass1234"})
    assert r.status_code == 200
    r = client.post("/api/admin/backups", headers=ADMIN)
    assert r.status_code == 200, r.text
    name = r.json()["backup"]["name"]
    assert ops.BACKUP_NAME_RE.match(name)
    raw = gzip.decompress((tmp_path / "bk" / name).read_bytes())
    restored = tmp_path / "restored.db"
    restored.write_bytes(raw)
    c = sqlite3.connect(restored)
    assert c.execute("SELECT username FROM users").fetchone()[0] == "bk_user"
    assert c.execute("PRAGMA integrity_check").fetchone()[0] == "ok"


def test_backup_retention_and_listing(client, monkeypatch):
    import time as _t
    names = []
    for i in range(5):
        monkeypatch.setattr(ops.time, "gmtime", lambda *_a, i=i: _t.struct_time((2026, 1, 1, 0, 0, i, 0, 1, 0)))
        names.append(ops.backup_now()["name"])
    st = client.get("/api/admin/backups", headers=ADMIN).json()
    assert st["count"] == 3
    assert [f["name"] for f in st["files"]] == sorted(names, reverse=True)[:3]


def test_backup_download_and_traversal(client):
    name = ops.backup_now()["name"]
    r = client.get(f"/api/admin/backups/{name}", headers=ADMIN)
    assert r.status_code == 200
    assert r.content[:2] == b"\x1f\x8b"
    assert client.get("/api/admin/backups/..%2Fops.db", headers=ADMIN).status_code == 404
    assert client.get("/api/admin/backups/matrix-1.db.gz", headers=ADMIN).status_code == 404


def test_backup_routes_need_admin(client):
    assert client.get("/api/admin/backups").status_code in (403, 404)
    assert client.post("/api/admin/backups").status_code in (403, 404)
    assert client.get("/api/admin/errors").status_code in (403, 404)


def test_backup_due(client, monkeypatch):
    assert ops.backup_due() is True
    ops.backup_now()
    assert ops.backup_due() is False
    monkeypatch.setenv("MATRIX_BACKUP_EVERY_H", "1")
    import time as _t
    assert ops.backup_due(_t.time() + 3601) is True


def test_unhandled_server_error_is_recorded(client, monkeypatch):
    def boom():
        raise ValueError("kaboom 12345 token=abcdef")

    monkeypatch.setattr(main.db, "list_votes", lambda *_a, **_k: boom())
    r = client.get("/api/votes")
    assert r.status_code == 500
    assert r.json() == {"detail": "internal_error"}
    client.get("/api/votes")
    items = client.get("/api/admin/errors", headers=ADMIN).json()["items"]
    srv = [i for i in items if i["source"] == "server"]
    assert len(srv) == 1 and srv[0]["count"] == 2
    assert srv[0]["kind"] == "ValueError" and srv[0]["path"] == "/api/votes"
    assert "abcdef" not in srv[0]["message"] and "[redacted]" in srv[0]["message"]


def test_client_errors_grouped_scrubbed_rate_limited(client):
    for _ in range(3):
        r = client.post(
            "/api/client-errors",
            json={"kind": "TypeError", "message": "x is undefined for a@b.co", "stack": "at f (app.js:1:2)", "url": "http://h/tools?token=1"},
        )
        assert r.status_code == 202
    data = client.get("/api/admin/errors?source=client", headers=ADMIN).json()
    assert len(data["items"]) == 1
    it = data["items"][0]
    assert it["count"] == 3 and it["path"] == "/tools" and "a@b.co" not in it["message"]
    assert data["last_24h"]["client"] == 3
    hits = [client.post("/api/client-errors", json={"message": f"e{i}"}).json()["ok"] for i in range(40)]
    assert hits.count(False) > 0


def test_errors_clear_and_cap(client, monkeypatch):
    monkeypatch.setattr(ops, "ERROR_ROWS_MAX", 5)
    for i in range(8):
        ops.record_error("client", "E", f"distinct message {chr(65 + i)}", "/p")
    assert len(ops.list_errors()) == 5
    first = ops.list_errors()[0]["id"]
    assert client.delete(f"/api/admin/errors/{first}", headers=ADMIN).json() == {"deleted": 1}
    assert client.delete("/api/admin/errors", headers=ADMIN).json()["deleted"] == 4


def test_overview_has_errors_and_backup(client):
    ov = client.get("/api/admin/overview", headers=ADMIN).json()
    assert "errors_24h" in ov and "backup" in ov and "files" not in ov["backup"]
