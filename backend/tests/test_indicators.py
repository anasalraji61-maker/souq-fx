"""اختبارات وحدة لـindicators.py — منطق حسابي بحت (بلا شبكة/قاعدة بيانات)،
قيم محسوبة يدوياً بدقة قبل الكتابة (لا تشغيل تلقائي متاح بهذا التشغيل)."""
from __future__ import annotations

import indicators as ind


def test_sma_basic():
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    out = ind.sma(values, 3)
    assert out == [None, None, 2.0, 3.0, 4.0]


def test_sma_period_longer_than_series_is_all_none():
    values = [1.0, 2.0]
    out = ind.sma(values, 3)
    assert out == [None, None]


def test_ema_matches_hand_computed_values():
    # k = 2/(period+1) = 0.5 لسلسلة خطية بيتا بسيط يسهل حسابه يدوياً
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    out = ind.ema(values, 3)
    assert out == [None, None, 2.0, 3.0, 4.0]


def test_rsi_all_gains_is_100_after_warmup():
    # سلسلة تصاعدية بحتة (فرق 1.0 كل خطوة) → صفر خسائر إطلاقاً
    # → avg_loss = 0 طوال الوقت → rsi = 100.0 من مؤشر period فصاعداً
    values = [float(i) for i in range(1, 30)]  # 1.0..29.0 (29 قيمة)
    out = ind.rsi(values, period=14)
    assert out[:14] == [None] * 14
    assert all(v == 100.0 for v in out[14:])


def test_rsi_short_series_returns_all_none():
    values = [1.0, 2.0, 3.0]
    out = ind.rsi(values, period=14)
    assert out == [None, None, None]


def test_cross_up_true_when_fast_overtakes_slow():
    fast = [1.0, 3.0]
    slow = [2.0, 2.0]
    assert ind.cross_up(fast, slow) is True
    assert ind.cross_down(fast, slow) is False


def test_cross_down_true_when_fast_drops_below_slow():
    fast = [3.0, 1.0]
    slow = [2.0, 2.0]
    assert ind.cross_down(fast, slow) is True
    assert ind.cross_up(fast, slow) is False


def test_cross_helpers_false_when_none_present():
    assert ind.cross_up([None, 1.0], [None, 2.0]) is False
    assert ind.cross_down([None, 1.0], [None, 2.0]) is False


def test_cross_helpers_false_when_series_too_short():
    assert ind.cross_up([1.0], [2.0]) is False
    assert ind.cross_down([1.0], [2.0]) is False


def test_snapshot_empty_candles_returns_empty_dict():
    assert ind.snapshot([]) == {}


def test_snapshot_has_expected_keys_for_nonempty_candles():
    candles = [{"close": c} for c in [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]]
    out = ind.snapshot(candles, fast=2, slow=3)
    expected_keys = {
        "last",
        "change_pct",
        "rsi",
        "sma_fast",
        "sma_slow",
        "macd",
        "macd_signal",
        "ma_cross_up",
        "ma_cross_down",
        "macd_cross_up",
        "macd_cross_down",
    }
    assert expected_keys.issubset(out.keys())
    assert out["last"] == 8.0
    # (8-1)/1*100 = 700.0 — قسمة صحيحة بلا أي خطأ عائم يستدعي المقارنة التقريبية
    assert out["change_pct"] == 700.0


# ─── MACD: الإشارة لا تبدأ من صفر مختلَق ──────────────────────────────────────

def _wave(n: int) -> list[float]:
    import math
    return [1.10 + 0.01 * math.sin(i / 5) + 0.0003 * i for i in range(n)]


def test_macd_signal_is_none_until_nine_real_macd_values_exist():
    values = _wave(80)
    line, sig = ind.macd(values)
    assert len(sig) == len(values)
    assert all(x is None for x in line[:25]) and line[25] is not None
    assert all(x is None for x in sig[:33]), "لا إشارة قبل 9 قيم خطّ حقيقية"
    assert sig[33] is not None


def test_macd_signal_seed_is_the_mean_of_the_first_nine_real_macd_values():
    values = _wave(80)
    line, sig = ind.macd(values)
    assert abs(sig[33] - sum(line[25:34]) / 9) < 1e-12
    k = 2 / 10
    assert abs(sig[34] - (line[34] * k + sig[33] * (1 - k))) < 1e-12


def test_macd_has_no_cross_on_an_accelerating_uptrend():
    """صعود متسارع: الخطّ يرتفع باستمرار والإشارة تتأخّر تحته ⇒ لا تقاطع إطلاقاً، ولا يوجد
    تقاطع قبل أن توجد الإشارة (كانت «موجودة» من الشمعة 9 بقيم مبنية على أصفار)."""
    values = [1.0 + 0.00005 * i * i for i in range(80)]
    line, sig = ind.macd(values)
    crosses = [
        i for i in range(1, len(values))
        if ind.cross_up(line[: i + 1], sig[: i + 1]) or ind.cross_down(line[: i + 1], sig[: i + 1])
    ]
    assert crosses == []


def test_macd_short_series_is_all_none_not_zero():
    line, sig = ind.macd([1.0] * 20)
    assert line == [None] * 20 and sig == [None] * 20
