"""run 112: ملفّ تقويم ForexFactory ليس خلاصة أخبار — لا `<item>` فيه ⇒ جلبه طلب مهدور."""
import news_feed

_FF_XML = """<?xml version="1.0"?><weeklyevents><event><title>CPI m/m</title><country>USD</country>
<date>09-23-2026</date><time>8:30am</time><impact>High</impact></event></weeklyevents>"""


def test_calendar_xml_yields_no_headlines():
    assert news_feed._parse_rss(_FF_XML, "www.forexfactory.com") == []


def test_calendar_file_not_polled_as_news():
    assert not any("ffcal" in u for u in news_feed.FEEDS)
