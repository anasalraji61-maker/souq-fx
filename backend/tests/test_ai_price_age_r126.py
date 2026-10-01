"""run 126: سياق المساعد يذكر الوقت الحالي وعمر السعر، ويقول «ليس السعر الحالي» عن سعر قديم.

كان السياق «if it is not recent, say so» بلا وقت الآن بأيّ من الموجّهين ⇒ السبت، إغلاق الجمعة (عمره
~25 ساعة) يُكتب «EURUSD is currently trading at 1.17179»، و«that candle may still be forming» ثابتة
حتى لشمعة أُغلقت يقيناً."""
from __future__ import annotations

from fastapi.testclient import TestClient

import main

FRI_2045 = 1_790_369_100  # 2026-09-25 20:45 UTC (الجمعة، آخر شمعة 15m قبل الإغلاق)


def _series(as_of: float):
    def build(sym, timeframe="15m", outputsize=180):
        cs = [
            main.Candle(time=FRI_2045 - 900 * (39 - i), open=1.17, high=1.1710, low=1.1690, close=1.17 + i * 1e-4)
            for i in range(40)
        ]
        return main.ChartSeries(
            symbol=sym.upper(), timeframe=timeframe, candles=cs, change_pct=0.33, last=cs[-1].close,
            data_source=main.DataProvenance(kind="cache", as_of=as_of, channel="twelvedata"),
        )
    return build


def _ctx(monkeypatch, as_of: float, now: float) -> str:
    seen: dict = {}
    monkeypatch.setattr(main, "build_series", _series(as_of))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.time, "time", lambda: now)
    monkeypatch.setattr(
        main.openrouter_ai, "trading_answer",
        lambda q, sym, context, lang="ar": seen.setdefault("ctx", context) and "انتظر",
    )
    TestClient(main.app).post("/api/ai/ask", json={"question": "price now?", "symbol": "EURUSD"})
    return seen["ctx"]


def test_saturday_context_says_friday_price_is_not_current(monkeypatch):
    # جُلب الجمعة 20:55 (الشمعة الأخيرة جارية)، والسؤال السبت 21:45
    ctx = _ctx(monkeypatch, FRI_2045 + 600, FRI_2045 + 600 + 24 * 3600 + 50 * 60)
    assert "now=2026-09-26 21:45 UTC" in ctx
    assert "24 h 50 min old" in ctx
    assert "NOT the current price" in ctx
    assert "still forming when this price was fetched" in ctx


def test_closed_candle_is_called_closed(monkeypatch):
    # جُلب بعد إغلاق الجمعة ⇒ وقت السعر = نهاية الشمعة (21:00) ⇒ مغلقة
    ctx = _ctx(monkeypatch, FRI_2045 + 3600, FRI_2045 + 3600)
    assert "that candle is closed" in ctx and "forming" not in ctx


def test_fresh_price_is_latest_available_not_flagged_old(monkeypatch):
    ctx = _ctx(monkeypatch, FRI_2045 + 600, FRI_2045 + 600 + 120)
    assert "2 min old" in ctx
    assert "NOT the current price" not in ctx
    assert "latest available price, not a live price" in ctx
