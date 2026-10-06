"""Academy curriculum translations: complete for English and Kurdish, served with ?lang=."""
import pytest
from fastapi.testclient import TestClient

import academy_data
import academy_i18n
import main


@pytest.mark.parametrize("lang", ["en", "ku"])
def test_every_lecture_and_segment_translated(lang):
    c = academy_i18n.coverage(lang)
    assert c["lectures_translated"] == c["lectures"] and c["segments_translated"] == c["segments"], c


@pytest.mark.parametrize("lang", ["en", "ku"])
def test_outlines_levels_schools_complete(lang):
    tr = academy_i18n.TRANSLATIONS[lang]
    for s in academy_data.ACADEMY_SCHOOLS:
        assert tr[f"school:{s['id']}"]["summary"]
        for lv in s["levels"]:
            assert tr[f"level:{s['id']}:{lv['level']}"]
            for l in lv["lectures"]:
                assert len(tr[f"lec:{l['id']}"]["outline"]) == len(l["outline"]), l["id"]


def test_english_has_no_arabic_letters():
    import re
    out = academy_i18n.localize_school(academy_data.get_school("ict-smc"), "en")
    text = str([out["summary"], [[l["title"], l["outline"], l["script_segments"]] for lv in out["levels"] for l in lv["lectures"]]])
    assert not re.search(r"[؀-ۿ]", text)


def test_api_lang_param_and_arabic_default():
    client = TestClient(main.app)
    ar = client.get("/api/academy/schools/basics").json()
    en = client.get("/api/academy/schools/basics?lang=en-US").json()
    ku = client.get("/api/academy/schools/basics?lang=ku").json()
    assert ar["levels"][0]["lectures"][0]["title"] == "ما هو الـ Pip (النقطة)؟"
    assert en["levels"][0]["lectures"][0]["title"] == "What is a pip?" and en["content_lang"] == "en"
    assert ku["levels"][0]["title"] == "چەمکە بنەڕەتییەکان"
    lec = client.get("/api/academy/schools/basics/lectures/basics-l1-02?lang=en").json()
    assert lec["title"] == "Lots and position size" and lec["script_segments"][0]["title"] == "Lot types"
    # the shared data is not modified by translating
    assert academy_data.get_school("basics")["levels"][0]["lectures"][0]["title"] == "ما هو الـ Pip (النقطة)؟"
