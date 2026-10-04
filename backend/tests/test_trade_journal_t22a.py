import math
import sqlite3

import pytest

from backend.trade_journal import (
    EMOTIONS,
    create_entry,
    delete_entry,
    get_entry,
    init_db,
    list_entries,
    stats_by_tag,
    update_entry,
)


def _conn(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "j.db"))
    init_db(conn)
    return conn


def test_init_db_is_idempotent(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "j.db"))
    init_db(conn)
    init_db(conn)  # should not raise
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='journal_entries'"
    ).fetchall()
    assert len(tables) == 1
    indexes = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_journal_user_trade'"
    ).fetchall()
    assert len(indexes) == 1


def test_create_then_get_round_trips_all_fields(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(
        conn,
        user_id=1,
        trade_id="T123",
        notes="my notes",
        tags=["A", "B"],
        emotion="confident",
        screenshot_url="https://example.com/img.png",
        pnl=12.5,
        now=100.0,
    )
    fetched = get_entry(conn, 1, entry["id"])
    assert fetched == {
        "id": entry["id"],
        "user_id": 1,
        "trade_id": "T123",
        "notes": "my notes",
        "tags": ["a", "b"],
        "emotion": "confident",
        "screenshot_url": "https://example.com/img.png",
        "pnl": 12.5,
        "created_at": 100.0,
        "updated_at": 100.0,
    }


def test_tags_are_normalised(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(conn, 1, "T1", tags=[" FOMO", "fomo", "", "Breakout"])
    assert entry["tags"] == ["fomo", "breakout"]
    assert get_entry(conn, 1, entry["id"])["tags"] == ["fomo", "breakout"]


def test_empty_trade_id_raises(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "")
    with pytest.raises(ValueError):
        create_entry(conn, 1, "   ".strip())


def test_invalid_emotion_raises(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", emotion="ecstatic")


def test_bad_screenshot_url_raises(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", screenshot_url="ftp://x")


def test_pnl_nan_and_bool_raise(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", pnl=float("nan"))
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", pnl=True)


def test_more_than_10_tags_raises(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", tags=["t%d" % i for i in range(11)])


def test_notes_too_long_raises(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        create_entry(conn, 1, "T1", notes="x" * 2001)
    ok = create_entry(conn, 1, "T1", notes="x" * 2000)
    assert len(ok["notes"]) == 2000


def test_list_entries_newest_first_and_paging(tmp_path):
    conn = _conn(tmp_path)
    ids = []
    for i in range(5):
        e = create_entry(conn, 1, "T%d" % i, notes="n%d" % i, now=float(i))
        ids.append(e["id"])
    rows = list_entries(conn, 1)
    assert [r["id"] for r in rows] == list(reversed(ids))
    rows = list_entries(conn, 1, limit=2, offset=1)
    assert [r["id"] for r in rows] == [ids[3], ids[2]]
    rows = list_entries(conn, 1, limit=9999)
    assert len(rows) == 5
    rows = list_entries(conn, 1, limit=0)
    assert len(rows) == 1


def test_list_entries_filter_by_tag_and_trade_id(tmp_path):
    conn = _conn(tmp_path)
    create_entry(conn, 1, "T1", tags=["alpha"])
    create_entry(conn, 1, "T2", tags=["beta"])
    create_entry(conn, 1, "T3", tags=["alpha", "beta"])
    by_tag = list_entries(conn, 1, tag="alpha")
    assert len(by_tag) == 2
    by_trade = list_entries(conn, 1, trade_id="T2")
    assert len(by_trade) == 1


def test_user_isolation(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(conn, 1, "T1")
    assert get_entry(conn, 2, entry["id"]) is None
    assert update_entry(conn, 2, entry["id"], notes="hi") is None
    assert delete_entry(conn, 2, entry["id"]) is False


def test_update_changes_fields_and_sets_updated_at(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(conn, 1, "T1", now=100.0, emotion="neutral")
    updated = update_entry(conn, 1, entry["id"], now=200.0, emotion="fearful", notes="x")
    assert updated["emotion"] == "fearful"
    assert updated["notes"] == "x"
    assert updated["updated_at"] == 200.0
    fetched = get_entry(conn, 1, entry["id"])
    assert fetched["emotion"] == "fearful"
    assert fetched["updated_at"] == 200.0


def test_update_unknown_field_raises(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(conn, 1, "T1")
    with pytest.raises(ValueError):
        update_entry(conn, 1, entry["id"], bogus="nope")


def test_update_missing_id_returns_none(tmp_path):
    conn = _conn(tmp_path)
    assert update_entry(conn, 1, 999, notes="hi") is None


def test_delete_returns_true_then_false(tmp_path):
    conn = _conn(tmp_path)
    entry = create_entry(conn, 1, "T1")
    assert delete_entry(conn, 1, entry["id"]) is True
    assert delete_entry(conn, 1, entry["id"]) is False


def test_stats_by_tag_known_numbers(tmp_path):
    conn = _conn(tmp_path)
    create_entry(conn, 1, "T1", tags=["a", "b"], pnl=10.0, now=1.0)
    create_entry(conn, 1, "T2", tags=["a"], pnl=-5.0, now=2.0)
    create_entry(conn, 1, "T3", tags=["b"], pnl=20.0, now=3.0)
    create_entry(conn, 1, "T4", tags=["a"], pnl=0.0, now=4.0)
    stats = stats_by_tag(conn, 1)
    a = next(s for s in stats if s["tag"] == "a")
    b = next(s for s in stats if s["tag"] == "b")
    assert a == {"tag": "a", "count": 3, "wins": 1, "win_rate": 0.3333, "total_pnl": 5.0}
    assert b == {"tag": "b", "count": 2, "wins": 2, "win_rate": 1.0, "total_pnl": 30.0}
    assert stats[0]["tag"] == "a"


def test_stats_by_tag_empty_returns_empty(tmp_path):
    conn = _conn(tmp_path)
    assert stats_by_tag(conn, 1) == []


def test_emotions_constant():
    assert EMOTIONS == ("calm", "confident", "fearful", "greedy", "anxious", "neutral")
