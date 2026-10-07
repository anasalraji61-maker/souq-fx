"""Several server workers: shared rate limits, live ticks and a single background leader."""
import subprocess
import sys
import textwrap

import pytest

import shared_state
from core import db_conn


@pytest.fixture()
def multi(tmp_path, monkeypatch):
    monkeypatch.setenv("MATRIX_WORKERS", "3")
    monkeypatch.setattr(db_conn, "DB_PATH", tmp_path / "matrix.db")
    monkeypatch.setattr(shared_state, "_local", __import__("threading").local())
    return tmp_path


def test_single_worker_is_default(monkeypatch):
    monkeypatch.delenv("MATRIX_WORKERS", raising=False)
    assert not shared_state.multi()
    assert shared_state.is_leader()


def test_shared_limit_counts_across_callers(multi):
    assert [shared_state.allow("register", "1.2.3.4", 3, 3600) for _ in range(5)] == [True, True, True, False, False]
    assert shared_state.allow("register", "5.6.7.8", 3, 3600)  # another IP has its own budget


def test_login_failures_shared(multi):
    for _ in range(3):
        shared_state.record("login_fail", "alice")
    assert len(shared_state.recent("login_fail", "alice", 900)) == 3
    shared_state.clear("login_fail", "alice")
    assert shared_state.recent("login_fail", "alice", 900) == []


def test_ticks_reach_other_workers(multi, monkeypatch):
    import twelve_data_ws as ws

    shared_state.publish_ticks({"EURUSD": 1.1}, {"EURUSD": 100.0}, {})
    shared_state.publish_ticks({"EURUSD": 1.0}, {"EURUSD": 50.0}, {})  # older tick never overwrites a newer one
    monkeypatch.setattr(shared_state, "_is_leader", False)
    monkeypatch.setattr(ws, "LATEST", {})
    monkeypatch.setattr(ws, "LATEST_AT", {})
    monkeypatch.setattr(ws, "_last_sync", 0.0)
    assert ws.received_at(["EURUSD"]) == {"EURUSD": 100.0}
    assert ws.LATEST["EURUSD"] == 1.1


def test_only_one_leader(multi):
    code = textwrap.dedent(
        f"""
        import os, sys, time
        sys.path.insert(0, {str(db_conn.Path(__file__).resolve().parent.parent)!r})
        os.environ['MATRIX_WORKERS'] = '3'
        from core import db_conn
        db_conn.DB_PATH = db_conn.Path({str(multi / 'matrix.db')!r})
        import shared_state
        print(shared_state.acquire_leader(), flush=True)
        time.sleep(2)
        """
    )
    procs = [subprocess.Popen([sys.executable, "-c", code], stdout=subprocess.PIPE, text=True) for _ in range(3)]
    out = [p.communicate(timeout=20)[0].strip() for p in procs]
    assert sorted(out) == ["False", "False", "True"]


def test_static_cache_headers():
    from spa_static import cache_headers

    assert "immutable" in cache_headers("assets/index-abc123.js")["Cache-Control"]
    assert cache_headers("index.html")["Cache-Control"] == "no-cache"
    assert cache_headers("sw.js")["Cache-Control"] == "no-cache"
