"""
T08j split test: verify the news_impact db block moved to db_analysis.py and re-exported from db.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import db
import db_analysis
from core import db_conn


@pytest.fixture()
def temp_db(tmp_path, monkeypatch):
    """Point the DB connection at a fresh temp SQLite file."""
    db_path = tmp_path / "t08j_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_reexport_identity():
    """db re-exports the news_impact functions from db_analysis (same objects)."""
    assert db._migrate_news_impact is db_analysis._migrate_news_impact
    assert db.log_volatility_alert is db_analysis.log_volatility_alert
    assert db.get_active_volatility_alerts is db_analysis.get_active_volatility_alerts


def test_log_then_read_back(temp_db):
    """log_volatility_alert then get_active_volatility_alerts returns the logged row."""
    row_id = db.log_volatility_alert(
        event_id="evt-zza-001",
        event_title="High Impact News ZZA",
        currency="zza",
        impact_level="high",
        scheduled_time="2024-01-01 10:00:00",
        minutes_remaining=15,
        risk_score=0.85,
        guard_mode_active=True,
        advisory="Avoid entering long positions 15 minutes before the event.",
        affected_pairs_json='["ZZA/USD"]'
    )
    assert row_id > 0

    rows = db.get_active_volatility_alerts("zza")
    assert len(rows) == 1
    rec = rows[0]
    assert rec["id"] == row_id
    assert rec["currency"] == "ZZA"
    assert rec["impact_level"] == "HIGH"
    assert rec["guard_mode_active"] is True
    assert rec["risk_score"] == 0.85
    assert rec["minutes_remaining"] == 15
    assert rec["created_at"]


def test_newest_first_and_limit(temp_db):
    """Logging multiple alerts returns newest first and honors the limit."""
    base = dict(
        event_title="News Event",
        currency="zza",
        impact_level="medium",
        scheduled_time="2024-01-01 10:00:00",
        minutes_remaining=10,
        risk_score=0.5,
        guard_mode_active=True,
        advisory="Watch for spikes.",
        affected_pairs_json="[]"
    )

    ids = []
    for i in range(3):
        ids.append(db.log_volatility_alert(event_id=f"evt-zza-{i}", **base))

    rows = db.get_active_volatility_alerts("ZZA", limit=2)
    assert len(rows) == 2
    assert [r["id"] for r in rows] == sorted(ids, reverse=True)[:2]
    assert rows[0]["id"] == ids[-1]


def test_currency_filter_and_empty_case(temp_db):
    """Currency filter excludes other currencies; an unlogged currency returns []."""
    db.log_volatility_alert(
        event_id="evt-zzb-001",
        event_title="High Impact News ZZB",
        currency="zzb",
        impact_level="high",
        scheduled_time="2024-01-01 11:00:00",
        minutes_remaining=20,
        risk_score=0.9,
        guard_mode_active=True,
        advisory="Risk elevated.",
        affected_pairs_json='["ZZB/USD"]'
    )

    rows_zza = db.get_active_volatility_alerts("ZZA")
    assert rows_zza == []
    assert all(r["currency"] != "ZZB" for r in rows_zza)

    rows_zznone = db.get_active_volatility_alerts("ZZNONE")
    assert rows_zznone == []


def test_volatility_tables_created(temp_db):
    """db.init_db() creates news_volatility_alerts and its index via _migrate_news_impact."""
    with db.get_db() as c:
        tables = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'news_volatility_alerts'"
        ).fetchall()
        indexes = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_news_vol_risk'"
        ).fetchall()
    assert {r[0] for r in tables} == {"news_volatility_alerts"}
    assert {r[0] for r in indexes} == {"idx_news_vol_risk"}
