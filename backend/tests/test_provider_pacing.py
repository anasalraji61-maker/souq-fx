"""Provider pacing: TWELVE_DATA_RPM caps provider requests per 60 s window (0/unset = unlimited)."""
import twelve_data as td


def _reset():
    td._PACE_TIMES.clear()


def test_unlimited_when_unset(monkeypatch):
    monkeypatch.delenv("TWELVE_DATA_RPM", raising=False)
    _reset()
    assert all(td.take_provider_slot() for _ in range(50))


def test_caps_requests_per_minute(monkeypatch):
    monkeypatch.setenv("TWELVE_DATA_RPM", "3")
    _reset()
    assert [td.take_provider_slot() for _ in range(5)] == [True, True, True, False, False]


def test_window_slides_after_60_seconds(monkeypatch):
    monkeypatch.setenv("TWELVE_DATA_RPM", "2")
    _reset()
    clock = [1000.0]
    monkeypatch.setattr(td.time, "time", lambda: clock[0])
    assert td.take_provider_slot() and td.take_provider_slot()
    assert not td.take_provider_slot()
    clock[0] += 60.0
    assert td.take_provider_slot()


def test_invalid_value_means_unlimited(monkeypatch):
    monkeypatch.setenv("TWELVE_DATA_RPM", "abc")
    _reset()
    assert all(td.take_provider_slot() for _ in range(20))


def test_quote_book_skips_provider_when_over_budget(monkeypatch):
    monkeypatch.setenv("TWELVE_DATA_RPM", "1")
    monkeypatch.setattr(td, "_api_key", lambda: "k")
    _reset()
    td.take_provider_slot()  # budget used up

    class Boom:
        def __init__(self, *a, **k):
            raise AssertionError("provider must not be called when over budget")

    monkeypatch.setattr(td.httpx, "Client", Boom)
    assert td.fetch_quote_book("EURUSD") is None
