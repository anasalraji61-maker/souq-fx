"""محلّل التقويم الاحتياطي (`_parse_ff`) — كان **بلا اختبار واحد** بينما مساره الشقيق
(`_parse_ff_json`) مُصحَّح ومُختبَر. ثلاث قواعد يطبّقها المسار الأساسي وكان هذا خارجها:

- **فرع RSS يقصّ الإزاحة الزمنية**: `pubDate[:22]` يحوّل «Tue, 23 Sep 2026 14:30:00 -0400» إلى
  «Tue, 23 Sep 2026 14:30» — الوقت بلا منطقته، وهو فعلياً 18:30 UTC. نفس عيب `news_feed`
  المصحَّح بتشغيل سابق، وبقي شقيقه هنا. وبلا `ts` فلا توقيت جهاز ولا ترتيب.
- **القصّ عند `MAX_EVENTS` داخل المحلّل** أي **قبل** فلاتر العملة/التأثير — نفس ما أُزيل من
  `_parse_ff_json` بتشغيل سابق: بأسبوع مزدحم تسقط أحداث آخره (NFP يوم الجمعة) حتى عمّن طلب
  `impact=high` وحده.
- **فرع `<event>` يعطي وقتاً بلا منطقة زمنية معروفة** ويُعرض خاماً بلوحة التقويم بجانب أوقاتٍ
  محوَّلة لتوقيت الجهاز، فيقرؤه المتداول توقيتَه.

**بلا شبكة**: كل اختبار على نصّ XML مبنيّ هنا.
"""
from __future__ import annotations

import time

import pytest

import econ_calendar as cal


def _rss(items: str) -> str:
    return f"<rss><channel>{items}</channel></rss>"


def _item(title: str, pub: str = "", cat: str = "high", desc: str = "USD event") -> str:
    return (
        f"<item><title>{title}</title><description>{desc}</description>"
        f"<category>{cat}</category><pubDate>{pub}</pubDate></item>"
    )


def _events(rows: str) -> str:
    return f"<weeklyevents>{rows}</weeklyevents>"


def _event(title: str, country: str = "USD", impact: str = "High", date: str = "09-25-2026",
           tm: str = "8:30am") -> str:
    return (
        f"<event><title>{title}</title><country>{country}</country><impact>{impact}</impact>"
        f"<date>{date}</date><time>{tm}</time><forecast>1.0</forecast><previous>0.9</previous></event>"
    )


# ------------------------------------------------ فرع RSS: وقت النشر ليس موعد الخبر

def test_rss_pubdate_is_not_the_event_time():
    """tools81: `pubDate` = متى نُشر العنصر. كان يُرسَل `ts` فيعدّ التطبيق تنازلياً لوقت النشر
    («خبر قوي بعد 20 د» خاطئ). لا حقل موعد بالعنصر ⇒ لا `ts` ولا ساعة."""
    out = cal._parse_ff(_rss(_item("NFP", "Tue, 23 Sep 2026 14:30:00 -0400")))
    assert len(out) == 1
    assert out[0]["ts"] is None
    assert out[0]["time_tbd"] is True
    assert out[0]["when"] == "هذا الأسبوع"
    assert "18:30" not in out[0]["when"] and "14:30" not in out[0]["when"]


def test_rss_publication_time_keeps_its_offset_in_its_own_field():
    """وقت النشر ليس محذوفاً بل بحقله المسمّى، بالإزاحة الزمنية (‎-0400‎ عند 14:30 = 18:30 UTC)."""
    out = cal._parse_ff(_rss(_item("NFP", "Tue, 23 Sep 2026 14:30:00 -0400")))
    assert out[0]["published"] == "2026-09-23 18:30 UTC"


def test_rss_unreadable_date_drops_neither_event_nor_invents_a_time():
    out = cal._parse_ff(_rss(_item("ECB", "not a date")))
    assert len(out) == 1, "الحدث لا يُسقَط لأجل تاريخ لا يُقرأ"
    assert out[0]["ts"] is None
    assert out[0]["published"] is None
    assert "UTC" not in out[0]["when"]


def test_rss_missing_date_falls_back_to_the_week_wording():
    out = cal._parse_ff(_rss(_item("ECB", "")))
    assert out[0]["when"] == "هذا الأسبوع"
    assert out[0]["ts"] is None
    assert out[0]["published"] is None


# --------------------------------------- القصّ لا يسبق الفلاتر بأي فرع

@pytest.mark.parametrize("branch", ["rss", "event"])
def test_parser_does_not_truncate_before_the_filters(branch):
    """أسبوع أكبر من `MAX_EVENTS`: المحلّل يُعيدها كلّها، و`fetch_calendar` وحده يقصّ **بعد**
    الفلترة — وإلا سقط آخر الأسبوع عمّن طلب عملةً أو تأثيراً بعينه."""
    n = cal.MAX_EVENTS + 40
    if branch == "rss":
        xml = _rss("".join(_item(f"E{i}") for i in range(n)))
    else:
        xml = _events("".join(_event(f"E{i}") for i in range(n)))
    assert len(cal._parse_ff(xml)) == n


def test_the_last_event_of_a_crowded_week_survives_a_high_impact_filter(monkeypatch):
    """الحالة الفعلية: NFP آخر الأسبوع بأسبوع مزدحم، والمتداول يطلب `impact=high` وحده.
    كان المحلّل يقصّ عند `MAX_EVENTS` قبل أن تصل الفلترة أصلاً."""
    xml = _events(
        "".join(_event(f"filler{i}", impact="Low") for i in range(cal.MAX_EVENTS + 10))
        + _event("Non-Farm Employment Change", impact="High")
    )
    parsed = cal._parse_ff(xml)
    monkeypatch.setattr(cal, "_CACHE", parsed)
    monkeypatch.setattr(cal, "_CACHE_TS", time.time())
    monkeypatch.setattr(cal, "_FAIL_TS", 0.0)
    titles = [e["title"] for e in cal.fetch_calendar(impact="high")]
    assert "Non-Farm Employment Change" in titles


# ------------------------------- فرع <event>: وقت بلا منطقة زمنية معروفة

def test_event_branch_declares_its_timezone_is_unknown():
    out = cal._parse_ff(_events(_event("Retail Sales")))
    assert out[0]["tz_unknown"] is True
    assert out[0]["ts"] is None, "لا يُخمَّن وقت لمنطقة مجهولة"
    assert out[0]["when"] == "2026-09-25 8:30am", "الساعة كما وردت، والتاريخ ISO لا شهراً أولاً"


def test_event_branch_date_is_iso_not_month_first():
    """«09-10-2026» بالمصدر = 10 سبتمبر؛ خاماً يُقرأ 9 أكتوبر بالعربية والأوروبية."""
    out = cal._parse_ff(_events(_event("CPI", date="09-10-2026")))
    assert out[0]["when"].startswith("2026-09-10 ")
    # صيغة غير متوقَّعة أو تاريخ مستحيل ⇒ كما ورد، لا تخمين
    assert cal._iso_date("13-40-2026") == "13-40-2026"
    assert cal._iso_date("Sep 10") == "Sep 10"


def test_rss_branch_is_not_marked_unknown_because_its_zone_is_real():
    """لا ساعة تُعرض أصلاً (`when` «هذا الأسبوع») ⇒ لا وسم «منطقة مجهولة»؛ غيابها بـ`time_tbd`."""
    out = cal._parse_ff(_rss(_item("NFP", "Tue, 23 Sep 2026 14:30:00 -0400")))
    assert out[0].get("tz_unknown") is None


def test_json_path_still_carries_a_real_ts_and_no_unknown_mark():
    """حارس معاكس: المسار الأساسي لم يُمسّ."""
    out = cal._parse_ff_json('[{"title":"NFP","country":"USD","impact":"High","date":"2026-09-25T08:30:00-04:00"}]')
    assert out[0]["ts"] == 1790339400
    assert out[0]["when"] == "2026-09-25 12:30 UTC"
    assert out[0].get("tz_unknown") is None


# ------------------------------------------------------- ما لم يتغيّر

def test_event_branch_keeps_its_fields():
    out = cal._parse_ff(_events(_event("Retail Sales", country="GBP", impact="Medium")))
    assert out[0]["currency"] == "GBP"
    assert out[0]["impact"] == "medium"
    assert out[0]["forecast"] == "1.0"
    assert out[0]["previous"] == "0.9"


def test_broken_xml_is_an_empty_list_not_a_crash():
    assert cal._parse_ff("<not xml") == []


def test_titleless_rows_are_skipped_in_both_branches():
    assert cal._parse_ff(_rss("<item><description>d</description></item>")) == []
    assert cal._parse_ff(_events("<event><country>USD</country></event>")) == []


# ------------------------------------------------ تصنيف التأثير (QA30)

@pytest.mark.parametrize(
    "raw,want",
    [("High", "high"), ("Medium", "medium"), ("Low", "low"), ("Holiday", "holiday"),
     ("Non-Economic", "none"), ("", "unknown"), (None, "unknown"), ("???", "unknown")],
)
def test_impact_is_never_guessed_low(raw, want):
    assert cal._impact(raw) == want


def test_ff_holiday_event_is_tagged_holiday():
    out = cal._parse_ff(_events(_event("Bank Holiday", "JPY", impact="Holiday")))
    assert out and out[0]["impact"] == "holiday"


# ------------------------------------------------------- «السابق» ليس توقّعاً

@pytest.mark.parametrize("branch", ["xml", "json"])
def test_missing_forecast_is_a_dash_not_the_previous_release(branch):
    """كان `forecast` = التوقّع أو **السابق**: حدث بلا توقّع يُعرض «توقّع 0.9» للعملاء القدامى وهو رقم
    الشهر الماضي. الآن «—»، والسابق بحقله."""
    if branch == "xml":
        rows = ('<event><title>CPI</title><country>USD</country><date>09-25-2026</date>'
                '<time>8:30am</time><impact>High</impact><previous>0.9</previous></event>')
        out = cal._parse_ff(_events(rows))
    else:
        out = cal._parse_ff_json('[{"title":"CPI","country":"USD","impact":"High",'
                                 '"date":"2026-09-25T08:30:00-04:00","previous":"0.9"}]')
    assert out[0]["forecast"] == "—"
    assert out[0]["forecast_value"] == ""
    assert out[0]["previous"] == "0.9"


# ------------------------------------------------ العملة: لا رمز مخترَع

def test_rss_currency_is_a_real_currency_not_the_first_acronym():
    """«CPI m/m» كانت عملته «CPI» و«ECB President Speaks» عملته «ECB» (أوّل كلمة من 3 أحرف كبيرة)."""
    out = cal._parse_ff(_rss(_item("CPI m/m", desc="CPI data for EUR")))
    assert out[0]["currency"] == "EUR"
    out = cal._parse_ff(_rss(_item("ECB President Speaks", desc="")))
    assert out[0]["currency"] == ""


def test_rss_without_any_currency_is_not_usd():
    out = cal._parse_ff(_rss(_item("Bank Holiday", desc="Markets closed")))
    assert out[0]["currency"] == ""


def test_missing_country_is_unknown_not_usd_in_both_branches():
    """حدث بلا بلد كان يُوسَم «USD» فيظهر بفلتر الدولار كخبر أمريكي."""
    xml = _events("<event><title>Talks</title><impact>High</impact></event>")
    assert cal._parse_ff(xml)[0]["currency"] == ""
    out = cal._parse_ff_json('[{"title":"Talks","impact":"High","date":"2026-09-25T08:30:00-04:00"}]')
    assert out[0]["currency"] == ""


def test_global_all_events_keep_all():
    out = cal._parse_ff_json('[{"title":"G20 Meetings","country":"All","impact":"Low","date":"2026-09-25T08:30:00-04:00"}]')
    assert out[0]["currency"] == "ALL"
    out = cal._parse_ff(_events(_event("Retail Sales", country="gbp")))
    assert out[0]["currency"] == "GBP"


# ------------------------------------- «All Day»/«Tentative»: لا ساعة مخترَعة

def test_json_tentative_at_ny_midnight_is_time_tbd_not_04_utc():
    """نسخة JSON تؤرّخ «Tentative» (قرار بنك اليابان) و«All Day» بمنتصف ليل نيويورك. كان `when` «04:00 UTC»
    وشريط «خبر قوي بعد…» يعدّ إليها — ساعة لم يعلنها أحد."""
    out = cal._parse_ff_json(
        '[{"title":"BOJ Policy Rate","country":"JPY","impact":"High","date":"2026-09-25T00:00:00-04:00"}]'
    )
    assert out[0]["time_tbd"] is True
    assert out[0]["when"] == "2026-09-25"  # التاريخ وحده، لا «04:00 UTC»
    assert out[0]["ts"] == 1790308800  # بداية اليوم بنيويورك — للتاريخ والترتيب


def test_json_timed_event_is_not_time_tbd():
    out = cal._parse_ff_json(
        '[{"title":"NFP","country":"USD","impact":"High","date":"2026-09-25T08:30:00-04:00"},'
        '{"title":"GDT","country":"NZD","impact":"Low","date":"2026-09-25T00:30:00-04:00"}]'
    )
    assert [e["time_tbd"] for e in out] == [False, False]


@pytest.mark.parametrize("date, want_when", [
    ("2026-09-20T19:00:00-04:00", "2026-09-21"),  # كما بالخلاصة الحيّة لعطلة اليابان (الاثنين 21/9)
    ("2026-09-20T19:01:00-04:00", "2026-09-21"),
    ("2026-09-21T00:00:00-04:00", "2026-09-21"),
])
def test_json_holiday_has_no_clock_time_whatever_the_feed_hour(date, want_when):
    """كانت «Bank Holiday» بـ`T19:00-04:00` ⇒ `time_tbd` false و«2026-09-20 23:00 UTC»: عدّ تنازلي لساعة
    لا وجود لها، وباليوم السابق للعطلة."""
    out = cal._parse_ff_json(f'[{{"title":"Bank Holiday","country":"JPY","impact":"Holiday","date":"{date}"}}]')
    assert out[0]["impact"] == "holiday"
    assert out[0]["time_tbd"] is True
    assert out[0]["when"] == want_when


@pytest.mark.parametrize("tm,want", [("All Day", True), ("Tentative", True), ("", True), ("8:30am", False)])
def test_xml_event_branch_marks_unannounced_time(tm, want):
    out = cal._parse_ff(_events(_event("BOJ Policy Rate", country="JPY", tm=tm)))
    assert out[0]["time_tbd"] is want


def test_one_out_of_range_date_does_not_drop_the_whole_week():
    """`timestamp()` على سنة 1 بإزاحة موجبة = OverflowError (ليس ValueError) ⇒ كان الأسبوع كلّه يسقط."""
    import json

    rows = [
        {"title": "Bad", "country": "USD", "date": "0001-01-01T00:00:00+05:00", "impact": "High"},
        {"title": "NFP", "country": "USD", "date": "2026-10-02T08:30:00-04:00", "impact": "High"},
    ]
    out = cal._parse_ff_json(json.dumps(rows))
    by = {e["title"]: e for e in out}
    assert by["NFP"]["ts"] is not None
    assert by["Bad"]["ts"] is None and by["Bad"].get("time_tbd") is not True


def test_numeric_zero_forecast_is_kept_not_shown_as_missing():
    """`or ""` كان يُسقط الرقم 0 ⇒ توقّع 0 حقيقي يُعرض «—» (بلا توقّع)."""
    out = cal._parse_ff_json('[{"title":"Rate","country":"JPY","impact":"High",'
                             '"date":"2026-09-25T08:30:00-04:00","forecast":0,"previous":0.0,"actual":null}]')
    assert out[0]["forecast"] == "0"


def test_dst_shift_is_not_a_bank_holiday_and_keeps_its_time_tools147a():
    """الخلاصة الحيّة تضع تغيير الساعة بتأثير Holiday: كان يُعرض «عطلة» بلا ساعته (14:00 UTC لتقديم ساعة نيوزيلندا)."""
    out = cal._parse_ff_json(
        '[{"title":"Daylight Saving Time Shift","country":"NZD","impact":"Holiday","date":"2026-09-26T10:00:00-04:00"},'
        '{"title":"Bank Holiday","country":"JPY","impact":"Holiday","date":"2026-09-21T19:00:00-04:00"}]'
    )
    dst = next(e for e in out if e["currency"] == "NZD")
    assert dst["impact"] == "none" and dst["time_tbd"] is False
    assert dst["when"] == "2026-09-26 14:00 UTC" and dst["ts"] == 1790431200
    hol = next(e for e in out if e["currency"] == "JPY")
    assert hol["impact"] == "holiday" and hol["time_tbd"] is True
    xml = cal._parse_ff(_events(_event("DST Shift", impact="Holiday")))
    assert xml[0]["impact"] == "none"
