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


# ------------------------------------------------ فرع RSS: الإزاحة الزمنية

def test_rss_keeps_the_timezone_offset():
    """‎-0400‎ عند 14:30 تعني 18:30 UTC. القصّ عند 22 حرفاً كان يُلقي الإزاحة والوقت يبقى 14:30."""
    out = cal._parse_ff(_rss(_item("NFP", "Tue, 23 Sep 2026 14:30:00 -0400")))
    assert len(out) == 1
    assert out[0]["when"] == "2026-09-23 18:30 UTC"
    assert out[0]["ts"] == 1790188200  # 18:30 UTC لا 14:30


def test_rss_time_matches_the_json_path_format():
    """اللوحتان تُقرآن بنفس العين: نفس صيغة `_parse_ff_json` حرفياً."""
    out = cal._parse_ff(_rss(_item("CPI", "Fri, 25 Sep 2026 09:00:00 +0000")))
    assert out[0]["when"] == "2026-09-25 09:00 UTC"


def test_rss_feed_without_zone_is_read_utc_not_guessed():
    out = cal._parse_ff(_rss(_item("PMI", "Fri, 25 Sep 2026 09:00:00")))
    assert out[0]["when"] == "2026-09-25 09:00 UTC"


def test_rss_unreadable_date_drops_neither_event_nor_invents_a_time():
    out = cal._parse_ff(_rss(_item("ECB", "not a date")))
    assert len(out) == 1, "الحدث لا يُسقَط لأجل تاريخ لا يُقرأ"
    assert out[0]["ts"] is None
    assert "UTC" not in out[0]["when"]


def test_rss_missing_date_falls_back_to_the_week_wording():
    out = cal._parse_ff(_rss(_item("ECB", "")))
    assert out[0]["when"] == "هذا الأسبوع"
    assert out[0]["ts"] is None


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
    titles = [e["title"] for e in cal.fetch_calendar(impact="high")]
    assert "Non-Farm Employment Change" in titles


# ------------------------------- فرع <event>: وقت بلا منطقة زمنية معروفة

def test_event_branch_declares_its_timezone_is_unknown():
    out = cal._parse_ff(_events(_event("Retail Sales")))
    assert out[0]["tz_unknown"] is True
    assert out[0]["ts"] is None, "لا يُخمَّن وقت لمنطقة مجهولة"
    assert out[0]["when"] == "09-25-2026 8:30am", "النصّ كما ورد من المصدر بلا تحوير"


def test_rss_branch_is_not_marked_unknown_because_its_zone_is_real():
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
