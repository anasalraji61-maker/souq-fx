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


def test_snapshot_change_names_its_window():
    """`change_pct` على كامل السلسلة لا يومياً — `change_bars` يقول كم شمعة **تغطّي** النسبة:
    4 إغلاقات = 3 حركات (من إغلاق الأولى). كان 4 ⇒ شمعة زائدة بالوصف."""
    out = ind.snapshot([{"close": c} for c in [1.0, 2.0, 3.0, 4.0]], fast=2, slow=3)
    assert out["change_pct"] == 300.0
    assert out["change_bars"] == 3


def test_snapshot_change_is_none_not_zero_when_first_close_is_zero():
    """إغلاق أوّل صفريّ ⇒ القسمة مستحيلة: كان «0%» (لا تغيّر) رقماً مخترَعاً."""
    out = ind.snapshot([{"close": c} for c in [0.0, 2.0, 3.0]], fast=2, slow=3)
    assert out["change_pct"] is None


def test_rsi_flat_series_is_neutral_50_not_overbought():
    # لا ربح ولا خسارة: كان 100 ⇒ «تشبّع شراء» (تنبيه RSI فوق 70، فلتر الماسح، صوت بيع) من لا حركة. كـMT5: 50
    out = ind.rsi([1.1] * 30, period=14)
    assert all(v == 50.0 for v in out[14:])


def test_rsi_flat_then_one_move_leaves_neutral():
    out = ind.rsi([1.1] * 20 + [1.2], period=14)
    assert out[19] == 50.0
    assert out[20] == 100.0  # ربح بلا أيّ خسارة ⇒ 100 كما كان


def test_snapshot_rsi_on_flat_candles_is_50():
    candles = [{"close": 1.1, "open": 1.1, "high": 1.1, "low": 1.1} for _ in range(40)]
    assert ind.snapshot(candles)["rsi"] == 50.0


def test_snapshot_single_close_has_no_change_not_zero():
    """إغلاق واحد = لا حركة تُقاس: كان «0.00%» (يُقرأ «ثابت») على رمز أعاد المزوّد له شمعة واحدة."""
    out = ind.snapshot([{"close": 1.1}])
    assert out["change_pct"] is None and out["change_bars"] == 0


def _flat_after_blip(price: float, blip: float, n_flat: int = 21) -> list[dict]:
    closes = [price] * 158 + [blip] + [price] * n_flat
    return [{"open": c, "high": c, "low": c, "close": c} for c in closes]


def test_equal_smas_from_float_noise_are_not_a_cross():
    # زوج مربوط: نقطة واحدة ثم 21 إغلاقاً متطابقاً ⇒ SMA9 = SMA21 = 3.7502 لكن جمع الفاصلة العائمة
    # يعطي 3.7502000000000004 مقابل 3.7502 ⇒ كان «تقاطع صاعد» بالماسح والتوقّع والتنبيه
    snap = ind.snapshot(_flat_after_blip(3.7502, 3.7503))
    assert snap["sma_fast"] != snap["sma_slow"]  # الضجيج موجود فعلاً
    assert snap["ma_cross_up"] is False
    assert snap["ma_cross_down"] is False


def test_no_noise_cross_across_prices_and_blips():
    for price in (0.6543, 1.0871, 3.7502, 7.8123, 149.37, 1934.55):
        for blip in (price * 1.0001, price * 0.9999, price * 1.001):
            for n_flat in range(21, 30):  # النقطة خرجت من النافذتين ⇒ الخطّان متساويان رياضياً
                snap = ind.snapshot(_flat_after_blip(price, blip, n_flat))
                assert not snap["ma_cross_up"] and not snap["ma_cross_down"], (price, blip, n_flat)


def test_real_tiny_cross_still_counts():
    # فرق حقيقي بحجم نقطة عُشرية على 1.1 (1e-6) أكبر بكثير من التسامح (1.1e-12)
    assert ind.cross_up([1.1, 1.100001], [1.1000005, 1.1000005]) is True
    assert ind.cross_down([1.100001, 1.1], [1.1000005, 1.1000005]) is True


def test_touch_within_noise_then_real_move_is_a_cross():
    # الأمس «مستوى واحد» بحدود الضجيج (فوق بـ4e-16) واليوم فوق فعلاً ⇒ تقاطع (كـa0 <= b0)
    assert ind.cross_up([3.7502000000000004, 3.7503], [3.7502, 3.7502]) is True


def test_macd_noise_is_measured_against_price_not_macd():
    # MACD قرب الصفر: فرق 1e-15 نسبيّ لقيمته كبير، لكنه ضجيج بالنسبة لسعر 3.75
    assert ind.cross_up([1e-6, 1e-6 + 1e-15], [1e-6 + 1e-15, 1e-6], scale=3.75) is False
    assert ind.cross_up([1e-6, 2e-6], [1.5e-6, 1.5e-6], scale=3.75) is True


def test_snapshot_crosses_null_when_not_computable():
    # run 102: 20 شمعة ⇒ SMA21 وخطّ إشارة MACD غير محسوبين ⇒ التقاطعات None لا `false` («لا تقاطع» لم يُحسب)
    import indicators as _ind
    candles = [{"time": i * 60, "open": 1 + i / 1000, "high": 1.01 + i / 1000, "low": 0.99 + i / 1000,
                "close": 1 + i / 1000, "volume": None} for i in range(20)]
    snap = _ind.snapshot(candles)
    assert snap["sma_slow"] is None
    for k in ("ma_cross_up", "ma_cross_down", "macd_cross_up", "macd_cross_down"):
        assert snap[k] is None
    long = [{**c, "time": i * 60} for i, c in enumerate(candles * 3)]
    snap = _ind.snapshot(long)
    assert all(snap[k] in (True, False) for k in ("ma_cross_up", "ma_cross_down", "macd_cross_up", "macd_cross_down"))
