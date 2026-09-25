"""حدود جسمَي `/api/signals/social/consensus` و`/api/signals/indicators/forecast` — كانا
**الجسمين الوحيدين بالملف بلا قيد واحد** بينما كل جسم آخر يعلن حدّ الرمز والفريم منذ
تشغيلات سابقة. نفس صنف العيب المتكرّر: قاعدة مُعلَنة ومسارٌ خارجها.

- **الفريم المجهول يُبدَّل بـ15m صامتاً** داخل `build_series`، **وردّ التوقّع لا يحمل الفريم
  أصلاً**: المتداول يختار «4H» فتُحسب مؤشّراته على شموع 15 دقيقة ولا شيء بالردّ يقول ذلك.
- **معرّف مجهول يُهمَل بصمت**: بالتوقّع لا يصوّت المؤشّر الذي لا يطابق فيُبنى التوقّع بأقلّ
  ممّا تعرضه الواجهة؛ وبالإجماع تسقط المعرّفات المجهولة كلّها على `SOCIAL_CATALOG[:5]`
  الافتراضية — إجماع **خمسة مصادر لم يخترها المتداول** موسوماً باختياره.
- `symbol` بلا حدّ طول يذهب لرابط المزوّد عبر `build_series`.

**بلا شبكة**: المزوّد غير مهيّأ فيبني `build_series` سلسلةً بذرية محليّة — وهذه المسارات
تُرفض قبل بلوغه أصلاً.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import signal_hub


@pytest.fixture()
def client():
    return TestClient(main.app, raise_server_exceptions=False)


FORECAST = "/api/signals/indicators/forecast"
CONSENSUS = "/api/signals/social/consensus"


# ------------------------------------------------------------ الفريم

@pytest.mark.parametrize("path", [FORECAST, CONSENSUS])
@pytest.mark.parametrize("bad_tf", ["4h", "1D", "يومي", "", "2H"])
def test_unknown_timeframe_is_refused_not_silently_15m(client, path, bad_tf):
    res = client.post(path, json={"symbol": "EURUSD", "timeframe": bad_tf})
    assert res.status_code == 422, res.text


@pytest.mark.parametrize("path", [FORECAST, CONSENSUS])
@pytest.mark.parametrize("good_tf", ["1m", "15m", "1H", "4H", "D", "W"])
def test_every_timeframe_the_chart_offers_is_accepted(client, path, good_tf):
    """الحدّ يرصد المستحيل لا الصغير: كل فريم يعلنه `TF_SECONDS` يمرّ."""
    res = client.post(path, json={"symbol": "EURUSD", "timeframe": good_tf})
    assert res.status_code == 200, res.text


def test_the_frame_list_matches_the_chart(client):
    """حارس انحراف: لو زيد فريم للشارت ولم يُقبل هنا لظهر بهذا الاختبار."""
    for tf in main.TF_SECONDS:
        assert client.post(FORECAST, json={"timeframe": tf}).status_code == 200, tf


# ------------------------------------------------- معرّفات المؤشّرات

def test_unknown_indicator_is_refused_not_silently_ignored(client):
    res = client.post(FORECAST, json={"indicators": ["rsi", "supertrend"]})
    assert res.status_code == 422, res.text
    assert "supertrend" in res.text


def test_every_indicator_the_panel_offers_is_accepted(client):
    """معرّفات لوحة التوقّع الستّة حرفياً — لو انحرفت القائمتان لسقط هذا."""
    for ind in signal_hub.FORECAST_INDICATOR_IDS:
        res = client.post(FORECAST, json={"indicators": [ind]})
        assert res.status_code == 200, f"{ind}: {res.text}"


def test_all_six_together_are_accepted(client):
    res = client.post(FORECAST, json={"indicators": list(signal_hub.FORECAST_INDICATOR_IDS)})
    assert res.status_code == 200, res.text


def test_an_empty_indicator_list_no_longer_means_all_six(client):
    """`want = set(enabled or [...])`: القائمة الفارغة كانت تُستبدَل بالمؤشّرات الستّة كلّها —
    أي توقّع مبنيّ على مؤشّرات أطفأها المتداول بنفسه. (نصف العميل بالملاحظات.)"""
    assert client.post(FORECAST, json={"indicators": []}).status_code == 422


def test_omitting_indicators_still_means_all_six(client):
    """السلوك القائم كما هو: الحقل غير المرسَل ≠ قائمة فارغة."""
    res = client.post(FORECAST, json={"symbol": "EURUSD"})
    assert res.status_code == 200, res.text
    assert len(res.json()["votes"]) >= 1


def test_a_repeated_indicator_list_cannot_exceed_the_catalog(client):
    res = client.post(FORECAST, json={"indicators": ["rsi"] * 40})
    assert res.status_code == 422


# --------------------------------------------------- معرّفات المصادر
# لا فهرس مصادر بعد اليوم (الإجماع «غير متاح»): المعرّفات المحفوظة عند عميل قديم تُقبل وتُتجاهل،
# لكن القائمة تبقى محدودة.

def test_saved_source_ids_from_an_old_client_get_unavailable_not_422(client):
    res = client.post(CONSENSUS, json={"source_ids": ["tg_fxpulse", "app_tradingcentral"]})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "unavailable"


def test_source_list_is_still_bounded(client):
    assert client.post(CONSENSUS, json={"source_ids": ["x"] * 400}).status_code == 422
    assert client.post(CONSENSUS, json={"source_ids": ["x" * 500]}).status_code == 422


# ------------------------------------------------------------- الرمز

@pytest.mark.parametrize("path", [FORECAST, CONSENSUS])
@pytest.mark.parametrize("bad", ["", "EU", "E" * 13, "E" * 400])
def test_symbol_length_is_bounded_before_the_provider_url(client, path, bad):
    res = client.post(path, json={"symbol": bad})
    assert res.status_code == 422, res.text


@pytest.mark.parametrize("path", [FORECAST, CONSENSUS])
@pytest.mark.parametrize("good", ["EURUSD", "XAUUSD", "DXY", "BTCUSD"])
def test_real_symbols_pass(client, path, good):
    assert client.post(path, json={"symbol": good}).status_code == 200


# ------------------------------------------------------- ما لم يتغيّر

def test_a_plain_default_request_still_works(client):
    res = client.post(FORECAST, json={})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["symbol"] == "EURUSD"
    assert "direction" in body and "levels" in body


def test_consensus_default_request_still_works(client):
    res = client.post(CONSENSUS, json={})
    assert res.status_code == 200, res.text
    assert "direction" in res.json()
