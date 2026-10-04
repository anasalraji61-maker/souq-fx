import math

import pytest

from backend.drawings import DrawingError, DrawingStore


def _store(tmp_path):
    return DrawingStore(tmp_path / "d.db")


def test_add_and_list_trendline_roundtrip(tmp_path):
    store = _store(tmp_path)
    points = [{"time": 1000, "price": 1.1}, {"time": 2000, "price": 1.2}]
    style = {"color": "red"}
    result = store.add("u1", "eurusd", "H1", "trendline", points, style)
    assert result["symbol"] == "EURUSD"
    assert result["id"]
    assert result["created_at"]

    rows = store.list("u1", "EURUSD", "H1")
    assert len(rows) == 1
    assert rows[0]["dtype"] == "trendline"
    assert rows[0]["points"] == points
    assert rows[0]["style"] == style
    assert rows[0]["symbol"] == "EURUSD"


def test_hline_single_point_ok_two_points_raise(tmp_path):
    store = _store(tmp_path)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}, {"time": 2, "price": 3.0}])


def test_trendline_one_point_raises(tmp_path):
    store = _store(tmp_path)
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "trendline", [{"time": 1, "price": 2.0}])


@pytest.mark.parametrize("bad_type", ["circle", "box", ""])
def test_unknown_type_raises(tmp_path, bad_type):
    store = _store(tmp_path)
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", bad_type, [{"time": 1, "price": 2.0}])


@pytest.mark.parametrize("bad_price", [float("nan"), float("inf"), -1.0, 0, "x", True, False])
def test_bad_price_raises(tmp_path, bad_price):
    store = _store(tmp_path)
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "trendline", [{"time": 1, "price": bad_price}, {"time": 2, "price": 3.0}])


@pytest.mark.parametrize("bad_time", ["abc", 1.5, 0, True])
def test_bad_time_raises(tmp_path, bad_time):
    store = _store(tmp_path)
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "trendline", [{"time": bad_time, "price": 2.0}, {"time": 2, "price": 3.0}])


def test_oversized_style_raises(tmp_path):
    store = _store(tmp_path)
    big = {"k": "v" * 2010}
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "trendline", [{"time": 1, "price": 2.0}, {"time": 2, "price": 3.0}], big)


def test_non_dict_style_raises(tmp_path):
    store = _store(tmp_path)
    with pytest.raises(DrawingError):
        store.add("u1", "btc", "H1", "trendline", [{"time": 1, "price": 2.0}, {"time": 2, "price": 3.0}], "nope")


def test_user_isolation(tmp_path):
    store = _store(tmp_path)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    store.add("u2", "btc", "H1", "hline", [{"time": 1, "price": 3.0}])
    assert len(store.list("u1", "btc", "H1")) == 1
    assert len(store.list("u2", "btc", "H1")) == 1


def test_symbol_and_timeframe_isolation(tmp_path):
    store = _store(tmp_path)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    store.add("u1", "eth", "H1", "hline", [{"time": 1, "price": 3.0}])
    store.add("u1", "btc", "M5", "hline", [{"time": 1, "price": 4.0}])
    assert len(store.list("u1", "btc", "H1")) == 1
    assert len(store.list("u1", "eth", "H1")) == 1
    assert len(store.list("u1", "btc", "M5")) == 1


def test_delete_own_and_other_user_and_unknown(tmp_path):
    store = _store(tmp_path)
    own = store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    other = store.add("u2", "btc", "H1", "hline", [{"time": 1, "price": 5.0}])

    assert store.delete("u1", own["id"]) is True
    # u1 cannot delete u2's drawing
    assert store.delete("u1", other["id"]) is False
    assert len(store.list("u2", "btc", "H1")) == 1

    assert store.delete("u1", "does-not-exist") is False


def test_clear_returns_count_and_scoped(tmp_path):
    store = _store(tmp_path)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    store.add("u1", "btc", "H1", "hline", [{"time": 2, "price": 3.0}])
    store.add("u1", "eth", "H1", "hline", [{"time": 1, "price": 4.0}])
    assert store.clear("u1", "btc", "H1") == 2
    assert len(store.list("u1", "btc", "H1")) == 0
    assert len(store.list("u1", "eth", "H1")) == 1


def test_limit_200_then_block_and_other_tf_allowed(tmp_path):
    store = _store(tmp_path)
    for _ in range(200):
        store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    with pytest.raises(DrawingError) as exc:
        store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])
    assert "limit" in str(exc.value).lower() or exc.value.args[0] == "limit"
    # different timeframe still allowed
    store.add("u1", "btc", "M5", "hline", [{"time": 1, "price": 2.0}])
    assert len(store.list("u1", "btc", "M5")) == 1


def test_empty_store_lists_empty_and_empty_user_id_raises(tmp_path):
    store = _store(tmp_path)
    assert store.list("u1", "btc", "H1") == []
    with pytest.raises(DrawingError):
        store.add("", "btc", "H1", "hline", [{"time": 1, "price": 2.0}])


def test_list_ordering_with_now(tmp_path):
    store = _store(tmp_path)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 2.0}], now=2.0)
    store.add("u1", "btc", "H1", "hline", [{"time": 1, "price": 3.0}], now=1.0)
    rows = store.list("u1", "btc", "H1")
    assert len(rows) == 2
    assert rows[0]["created_at"] == 1.0
    assert rows[1]["created_at"] == 2.0
