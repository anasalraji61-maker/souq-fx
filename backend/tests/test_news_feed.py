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
