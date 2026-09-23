"""أخبار الفوركس — تصنيف التأثير ووسم الوقت. **بلا شبكة**: كل شيء على نصّ RSS مبنيّ بالاختبار.

**لماذا هذا الملف**: `news_feed` كان بلا اختبار واحد، وتصنيف التأثير فيه مطابقةٌ **جزئية**
(`"rate" in title.lower()`) — أي أن «corporate» و«moderate» و«accurate» و«separate»
و**«strategy»** كلّها تحقّق «rate» فتُعرَض عناوين عادية بشارة «عالي التأثير» الحمراء بلوحة
الأخبار. وهذه كلمات تتكرّر بعناوين الفوركس اليومية لا حالات نادرة.
"""
from __future__ import annotations

import pytest

import news_feed as nf


@pytest.mark.parametrize(
    "title",
    [
        "Corporate earnings beat estimates",
        "Moderate growth seen across Asia",
        "Accurate forecasts are rare, says analyst",
        "Separate trade deal signed",
        "Strategy note: gold at a crossroads",
    ],
)
def test_ordinary_headline_is_not_high_impact(title):
    """كلّها كانت `high` بسبب «rate» داخل الكلمة — وهي شارة يتصرّف عليها المتداول."""
    assert nf._impact_from_title(title) == "low"


@pytest.mark.parametrize(
    "title",
    ["Fed holds rates steady", "FOMC minutes due", "US CPI beats", "NFP preview", "Rate decision today"],
)
def test_real_high_impact_headline_still_high(title):
    """الحارس المعاكس: حدّ الكلمة لا يبتلع ما يجب أن يُرصد — والجمع `rates` أشيع من المفرد."""
    assert nf._impact_from_title(title) == "high"


@pytest.mark.parametrize("title", ["UK GDP revised up", "PMIs soften in September", "Employment data due"])
def test_medium_impact_headline(title):
    assert nf._impact_from_title(title) == "medium"


@pytest.mark.parametrize(
    "title, expected",
    [("قرار الفائدة الفيدرالي", "high"), ("ارتفاع التضخم", "high"), ("بيانات التوظيف", "medium")],
)
def test_arabic_keywords_still_match_with_the_definite_article(title, expected):
    """«الفائدة» أداةُ تعريفها ملتصقة، فحدّ الكلمة كان سيُسقطها — العربية مطابقةٌ جزئية عمداً."""
    assert nf._impact_from_title(title) == expected


@pytest.mark.parametrize("title", ["FedEx shares jump", "Feed prices climb for cattle"])
def test_word_that_merely_contains_an_acronym_is_not_high(title):
    assert nf._impact_from_title(title) == "low"


# ------------------------------------------------- وقت الخبر وترتيبه (بلا شبكة)


class _Resp:
    def __init__(self, text: str, status: int = 200):
        self.text = text
        self.status_code = status


class _FakeClient:
    """بديل `httpx.Client` — يردّ نصّاً مُعدّاً لكل رابط بلا أي نفاذ للشبكة."""

    by_url: dict[str, _Resp] = {}

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url, headers=None):
        return self.by_url.get(url, _Resp("", 404))


def _rss(*items: tuple[str, str]) -> str:
    body = "".join(f"<item><title>{t}</title><pubDate>{d}</pubDate></item>" for t, d in items)
    return f"<rss><channel>{body}</channel></rss>"


@pytest.fixture()
def feed(monkeypatch):
    """ذاكرة الوحدة عامّة — تُصفَّر لكل اختبار وإلا سرّب اختبارٌ نتيجته للتالي."""
    monkeypatch.setattr(nf, "_CACHE", [])
    monkeypatch.setattr(nf, "_CACHE_TS", 0.0)
    monkeypatch.setattr(nf.httpx, "Client", _FakeClient)

    def _serve(mapping: dict[str, str]):
        _FakeClient.by_url = {u: _Resp(x) for u, x in mapping.items()}

    yield _serve
    _FakeClient.by_url = {}


@pytest.mark.parametrize(
    "raw, expected_when",
    [
        ("Tue, 23 Sep 2026 14:30:00 +0000", "2026-09-23 14:30 UTC"),
        # إزاحة المنطقة كانت تُقصّ مع الوقت: هذا الخبر عند 18:30 UTC لا 14:30
        ("Tue, 23 Sep 2026 14:30:00 -0400", "2026-09-23 18:30 UTC"),
        ("Tue, 23 Sep 2026 14:30:00", "2026-09-23 14:30 UTC"),
    ],
)
def test_pubdate_becomes_utc_with_a_time_not_a_bare_date(raw, expected_when):
    """`pub.text[:16]` كان يعطي «Tue, 23 Sep 2026» — تاريخاً بلا وقت وبلا منطقة زمنية."""
    when, ts = nf._when_and_ts(raw)
    assert when == expected_when
    assert isinstance(ts, int) and ts > 0


@pytest.mark.parametrize("raw", ["not a date at all", "", None])
def test_unreadable_pubdate_keeps_a_string_and_no_ts(raw):
    """تاريخ لا يُقرأ لا يُسقط الخبر ولا يخترع وقتاً: نصّه كما هو (أو «اليوم») و`ts` فارغ."""
    when, ts = nf._when_and_ts(raw)
    assert ts is None and isinstance(when, str) and when


def test_every_item_carries_ts_for_local_time_display(feed):
    """التطبيق يعرض وقت الأحداث بتوقيت الجهاز اعتماداً على `ts` — والأخبار كانت وحدها بلا وسم."""
    feed({nf.FEEDS[0]: _rss(("Fed holds rates steady", "Tue, 23 Sep 2026 14:30:00 +0000"))})
    items = nf.fetch_news()
    assert items and items[0]["ts"] == 1790173800
    assert items[0]["when"] == "2026-09-23 14:30 UTC"


def test_newest_first_across_feeds(feed):
    """كانت القائمة بترتيب الخلاصات: كل أخبار المصدر الأول ثم الثاني مهما تفاوتت أعمارها."""
    feed(
        {
            nf.FEEDS[0]: _rss(("Old story", "Mon, 21 Sep 2026 08:00:00 +0000")),
            nf.FEEDS[1]: _rss(("Fresh story", "Wed, 23 Sep 2026 08:00:00 +0000")),
        }
    )
    titles = [n["title"] for n in nf.fetch_news()]
    assert titles == ["Fresh story", "Old story"]


def test_item_without_a_date_sorts_last_and_is_kept(feed):
    feed(
        {
            nf.FEEDS[0]: "<rss><channel><item><title>No date here</title></item></channel></rss>",
            nf.FEEDS[1]: _rss(("Dated story", "Wed, 23 Sep 2026 08:00:00 +0000")),
        }
    )
    items = nf.fetch_news()
    assert [n["title"] for n in items] == ["Dated story", "No date here"]
    assert items[-1]["ts"] is None


def test_duplicate_title_keeps_the_newest_copy(feed):
    """المعرّف من العنوان وحده (دمجٌ مقصود بين المصدرين) — فليكن الباقي الأحدث لا الأسبق مصدراً."""
    feed(
        {
            nf.FEEDS[0]: _rss(("Same headline", "Mon, 21 Sep 2026 08:00:00 +0000")),
            nf.FEEDS[1]: _rss(("Same headline", "Wed, 23 Sep 2026 08:00:00 +0000")),
        }
    )
    items = nf.fetch_news()
    assert len(items) == 1
    assert items[0]["when"] == "2026-09-23 08:00 UTC"


def test_cap_of_twenty_drops_the_oldest_not_the_second_feed(feed):
    """القصّ كان يُبقي الأقدم لمجرّد أن مصدره أوّلاً — فتختفي أخبار اليوم من المصدر الثاني."""
    old = _rss(*[(f"Old {i}", "Mon, 21 Sep 2026 08:00:00 +0000") for i in range(12)])
    new = _rss(*[(f"New {i}", "Wed, 23 Sep 2026 08:00:00 +0000") for i in range(12)])
    feed({nf.FEEDS[0]: old, nf.FEEDS[1]: new})
    items = nf.fetch_news()
    assert len(items) == 20
    assert all(n["title"].startswith("New") for n in items[:12])


def test_all_sources_down_returns_empty_and_retries_soon(feed):
    """لا عناوين مختلَقة عند تعذّر المصادر، ولا تخزين «لا أخبار» ربع ساعة."""
    feed({})
    assert nf.fetch_news() == []
    assert nf.EMPTY_TTL < nf.TTL
