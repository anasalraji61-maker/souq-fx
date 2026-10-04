"""T21: Closed-candle audit — signal_hub must not use the forming candle in
stoch/ATR/levels.

The forming (still-changing) last candle must not leak into the stochastic,
trend ATR, or trade-level computations. Only `eval_candles` (with the forming
candle excluded when `require_closed` is True and the candle carries
`is_forming` / `forming`) may feed those calculations. These tests call
`signal_hub.indicator_forecast` directly with synthetic candle dicts — no DB.
"""
from __future__ import annotations

import math

import signal_hub

SYMBOL = "XAUUSD"


def _sine_candles(n: int = 60, base: float = 2650.0, amp: float = 1.5, rng: float = 0.6) -> list[dict]:
    """60 gentle sine candles (sufficient for stoch 14 + BB 20 + trend 10 + ATR 14)."""
    out = []
    for i in range(n):
        p = base + amp * math.sin(2 * math.pi * i / (n / 3))
        out.append({
            "time": 1_700_000_000 + i * 60,
            "open": round(p - 0.1, 2),
            "high": round(p + rng, 2),
            "low": round(p - rng, 2),
            "close": round(p, 2),
            "volume": 0,
        })
    return out


def _extreme_last(candles: list[dict], **kwargs) -> list[dict]:
    """Return a copy where the last candle is replaced by extreme values."""
    last = dict(candles[-1])
    last.update(kwargs)
    return candles[:-1] + [last]


def _relevant_fields(d: dict) -> dict:
    """Volatile / time-dependent fields are stripped for stable comparison."""
    return {
        "symbol": d.get("symbol"),
        "mode": d.get("mode"),
        "direction": d.get("direction"),
        "avg_score": d.get("avg_score"),
        "votes": d.get("votes"),
        "levels": d.get("levels"),
        "levels_basis": d.get("levels_basis"),
    }


# ---------------------------------------------------------------------- 1 & 2 & 3

def _forming_output(flag_key: str, **extreme):
    base = _sine_candles()
    # Modest: forming candle with normal (sine) values — still dropped by the flag.
    modest_last = dict(base[-1])
    modest_last[flag_key] = True
    modest_input = base[:-1] + [modest_last]
    modest = signal_hub.indicator_forecast(SYMBOL, modest_input, lang="en")

    # Wild: forming candle with extreme values — also dropped.
    wild_input = _sine_candles()
    wild_input[-1] = {**wild_input[-1], flag_key: True, **extreme}
    wild = signal_hub.indicator_forecast(SYMBOL, wild_input, lang="en")

    # Dropped: the forming candle removed from the list entirely.
    without = _sine_candles()[:-1]
    dropped = signal_hub.indicator_forecast(SYMBOL, without, lang="en")
    return modest, wild, dropped


def test_forming_is_forming_flag_keeps_output_stable():
    """1. `is_forming: True` with wild last candle ⇒ output identical to modest."""
    modest, wild, _ = _forming_output("is_forming", high=999999.0, low=-999999.0, close=0.0)
    assert _relevant_fields(wild) == _relevant_fields(modest)


def test_forming_forming_flag_keeps_output_stable():
    """2. `forming: True` with wild last candle ⇒ output identical to modest."""
    modest, wild, _ = _forming_output("forming", high=999999.0, low=-999999.0, close=0.0)
    assert _relevant_fields(wild) == _relevant_fields(modest)


def test_forming_output_matches_dropped_candle():
    """3. Output with forming flag equals output with the forming candle removed."""
    modest, wild, dropped = _forming_output("is_forming", high=999999.0, low=-999999.0, close=0.0)
    assert _relevant_fields(wild) == _relevant_fields(dropped)


# ---------------------------------------------------------------------- 4

def test_closed_candle_change_does_affect_output():
    """4. Without the forming flag (closed candle), mutating the last candle
    DOES change at least one of votes/levels — guards against ignoring everything."""
    base = _sine_candles()
    modest = signal_hub.indicator_forecast(SYMBOL, base, lang="en")
    mutated = _sine_candles()
    mutated[-1] = {**mutated[-1], "high": 999999.0, "low": -999999.0, "close": 0.0}
    wild = signal_hub.indicator_forecast(SYMBOL, mutated, lang="en")
    assert _relevant_fields(wild) != _relevant_fields(modest)


# ---------------------------------------------------------------------- 5

def test_require_closed_false_includes_forming_candle():
    """5. `require_closed=False` with a forming candle INCLUDES the last candle,
    so output differs from the dropped version when the last candle is extreme."""
    base = _sine_candles()
    mutated = _sine_candles()
    mutated[-1] = {**mutated[-1], "is_forming": True, "high": 999999.0, "low": -999999.0, "close": 0.0}
    included = signal_hub.indicator_forecast(SYMBOL, mutated, lang="en", require_closed=False)
    # dropped version uses the forming candle removed (default require_closed=True)
    without = _sine_candles()[:-1]
    dropped = signal_hub.indicator_forecast(SYMBOL, without, lang="en")
    assert _relevant_fields(included) != _relevant_fields(dropped)


# ---------------------------------------------------------------------- 6

def test_stoch_vote_independent_of_forming_candle():
    """6. Stochastic vote (enabled=["stoch"]) is independent of the forming candle."""
    # Modest: forming candle with normal values (dropped by the flag).
    base = _sine_candles()
    modest_input = list(base)
    modest_input[-1] = {**modest_input[-1], "is_forming": True}
    modest = signal_hub.indicator_forecast(SYMBOL, modest_input, enabled=["stoch"], lang="en")

    # Wild: forming candle with extreme values (also dropped).
    wild_input = _sine_candles()
    wild_input[-1] = {**wild_input[-1], "is_forming": True, "high": 999999.0, "low": -999999.0, "close": 0.0}
    wild = signal_hub.indicator_forecast(SYMBOL, wild_input, enabled=["stoch"], lang="en")
    assert _relevant_fields(wild) == _relevant_fields(modest)


# ---------------------------------------------------------------------- 7

def test_trade_levels_independent_of_forming_candle_range():
    """7. Trade levels (stop/target) are independent of the forming candle's range.
    Huge forming high/low must not widen the ATR levels."""
    # Modest: forming candle with normal values (dropped by the flag).
    base = _sine_candles()
    modest_input = list(base)
    modest_input[-1] = {**modest_input[-1], "is_forming": True}
    modest = signal_hub.indicator_forecast(SYMBOL, modest_input, lang="en")

    # Wild: forming candle with extreme values (also dropped).
    wild_input = _sine_candles()
    wild_input[-1] = {**wild_input[-1], "is_forming": True, "high": 999999.0, "low": -999999.0, "close": 0.0}
    wild = signal_hub.indicator_forecast(SYMBOL, wild_input, lang="en")
    # levels must be identical (same ATR from eval_candles)
    assert _relevant_fields(wild).get("levels") == _relevant_fields(modest).get("levels")
    # explicitly check ATR in levels_basis is unchanged
    assert wild["levels_basis"]["atr"] == modest["levels_basis"]["atr"]


# ---------------------------------------------------------------------- 8

def test_empty_and_single_forming_candle_do_not_raise():
    """8. Empty candle list and a single forming candle return a result without raising."""
    empty = signal_hub.indicator_forecast(SYMBOL, [], lang="en")
    assert empty["symbol"] == SYMBOL
    assert empty["mode"] == "indicators"

    single_forming = signal_hub.indicator_forecast(
        SYMBOL,
        [{"time": 1_700_000_000, "open": 1.0, "high": 2.0, "low": 0.5, "close": 1.5,
          "is_forming": True, "volume": 0}],
        lang="en",
    )
    assert single_forming["symbol"] == SYMBOL
    assert single_forming["mode"] == "indicators"


if __name__ == "__main__":
    import sys
    sys.exit(__import__("pytest").main([__file__, "-v", "-p", "no:cacheprovider"]))
