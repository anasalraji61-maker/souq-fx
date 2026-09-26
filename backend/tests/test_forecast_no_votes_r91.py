"""Run 91: forecast no-vote reason and the RSI placeholder on flat closes."""
import signal_hub


def _moving_then_flat(n=180, flat=20):
    c = []
    for i in range(n):
        p = 1.1 + (i % 7) * 0.001 if i < n - flat else 1.105
        c.append({"open": p, "high": p + 0.0005, "low": p - 0.0005, "close": p})
    return c


def test_bb_only_flat_window_is_no_movement_not_missing_data():
    out = signal_hub.indicator_forecast("EURUSD", _moving_then_flat(), enabled=["bb"], lang="en")
    assert out["direction"] is None
    assert out["disclaimer_code"] == "no_movement"
    assert out["levels_basis"]["unavailable"] == "no_votes"


def test_no_vote_snapshot_has_no_uncomputed_cross_flags():
    out = signal_hub.indicator_forecast("EURUSD", _moving_then_flat(), enabled=["bb"], lang="en")
    assert set(out["snapshot"]) == {"rsi", "change_pct", "change_bars", "last"}


def test_flat_closes_snapshot_rsi_is_none():
    c = [{"open": 3.75, "high": 3.7502, "low": 3.7498, "close": 3.75} for _ in range(180)]
    out = signal_hub.indicator_forecast("USDSAR", c, lang="en")
    assert out["votes"]  # stoch/trend from wicks
    assert out["snapshot"]["rsi"] is None


def test_moving_series_keeps_real_rsi():
    out = signal_hub.indicator_forecast("EURUSD", _moving_then_flat(flat=0), lang="en")
    assert isinstance(out["snapshot"]["rsi"], float)
