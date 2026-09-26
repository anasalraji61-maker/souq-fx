"""launch217a: ردّ كردي يمرّ بالحارس ينتهي بملاحظة كردية (لا سطر عربي)، والاعتذار الكامل كردي."""
from fastapi.testclient import TestClient

import main
import openrouter_ai


def _arabic_only(text):
    # حروف كردية لا تُستعمل بالعربية — غيابها كلها يعني نصّاً عربياً
    return not any(ch in text for ch in "ێۆڕڵەپچژگ")


def test_kurdish_trade_line_gets_the_kurdish_note():
    out = openrouter_ai.guard_answer("RSI نیشاندەری خێرایییە.\nکڕین لە 1.0850", "ku")
    assert "1.0850" not in out and "RSI" in out
    assert out.endswith(openrouter_ai._GUARD_NOTE["ku"])
    assert openrouter_ai._GUARD_NOTE["ar"] not in out


def test_kurdish_ungrounded_number_gets_the_kurdish_number_note():
    out = openrouter_ai.guard_answer("RSI 63.2 ـە.\nنیشاندەرەکە بۆ فێربوونە.", "ku", ground="EURUSD last 1.13913")
    assert "63.2" not in out
    assert out.endswith(openrouter_ai._GUARD_NUMBER_NOTE["ku"])


def test_kurdish_all_lines_dropped_gives_the_kurdish_refusal():
    assert openrouter_ai.guard_answer("کڕین لە 1.0850", "ku") == openrouter_ai._GUARD_REFUSAL["ku"]


def test_kurdish_texts_are_kurdish_not_arabic():
    for d in (openrouter_ai._GUARD_NOTE, openrouter_ai._GUARD_NUMBER_NOTE, openrouter_ai._GUARD_REFUSAL):
        assert not _arabic_only(d["ku"]) and _arabic_only(d["ar"])


def test_unknown_lang_still_falls_back_to_arabic():
    assert openrouter_ai.guard_answer("کڕین لە 1.0850", "fr") == openrouter_ai._GUARD_REFUSAL["ar"]


def test_reply_lang_is_the_request_lang():
    for lang in ("ar", "en", "ku"):
        assert openrouter_ai.reply_lang(openrouter_ai._GUARD_REFUSAL[lang], lang) == lang


def test_academy_interrupt_kurdish_clarification_is_kurdish(monkeypatch):
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "interrupt_answer", lambda *a, **k: "بیکڕە ئێستا")
    r = TestClient(main.app).post("/api/academy/interrupt", json={
        "school_id": "basics", "lecture_id": "basics-l1-01", "question": "چی بکڕم؟", "lang": "ku"})
    body = r.json()
    assert body["clarification"] == openrouter_ai._GUARD_REFUSAL["ku"] and body["clarification_lang"] == "ku"
