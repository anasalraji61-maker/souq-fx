"""Web chart tools are stored by /api/drawings and removed with the account."""
import uuid

from fastapi.testclient import TestClient

import main


def _register(c):
    name = "dw" + uuid.uuid4().hex[:10]
    r = c.post(
        "/api/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": "secret1234", "role": "trader"},
        headers={"X-Install-Id": uuid.uuid4().hex},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def _d(i, dtype, extra=None):
    item = {"id": f"draw-{i}", "type": dtype, "points": [{"time": 1700000000 + i, "price": 1.1}, {"time": 1700000900 + i, "price": 1.2}],
            "color": "#2DD4BF", "lineWidth": 1.5, "lineStyle": "solid"}
    item.update(extra or {})
    return item


WEB = ["trendline", "horizontal", "vertical", "ray", "extended", "channel", "arrow", "text", "price_range",
       "date_range", "fibonacci", "box", "measure", "position_long", "position_short"]


def test_all_web_tools_roundtrip():
    with TestClient(main.app) as c:
        h = _register(c)
        items = [_d(i, t, {"text": "ملاحظة"} if t == "text" else None) for i, t in enumerate(WEB)]
        r = c.post("/api/drawings?symbol=EURUSD&timeframe=15m", json=items, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["saved"] == len(WEB) and r.json()["skipped"] == 0
        back = c.get("/api/drawings?symbol=EURUSD&timeframe=15m", headers=h).json()
        assert sorted(d["type"] for d in back) == sorted(WEB)
        text = next(d for d in back if d["type"] == "text")
        assert text["id"] == f"draw-{WEB.index('text')}" and text["text"] == "ملاحظة" and text["color"] == "#2DD4BF"


def test_account_deletion_removes_chart_drawings():
    with TestClient(main.app) as c:
        h = _register(c)
        uid = c.get("/api/auth/me", headers=h).json()["user_id"]
        c.post("/api/drawings?symbol=XAUUSD&timeframe=4h", json=[_d(1, "box")], headers=h)
        assert c.delete("/api/auth/account", headers=h).status_code == 200
        import db

        with db._conn() as conn:
            left = conn.execute("SELECT COUNT(*) FROM chart_drawings WHERE user_id=?", (str(uid),)).fetchone()[0]
        assert left == 0
