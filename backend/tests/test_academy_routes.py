"""الأكاديمية — المسار المجهول يجب أن يكون 404 لا 200 بجسم خطأ.

**لماذا هذا الملف**: الأكاديمية ثالث شاشات الـMVP، ومساراتها الثلاثة كانت تردّ **200**
بجسم `{"error": "not found"}` على معرّف لا وجود له. وعميل التطبيق يرمي عند `!res.ok` وحده
(`getJson`)، وله مسار احتياطي مكتوب لهذه الحالة بالضبط — فردُّ 200 كان **يعطّل احتياطيَّه**:

- `CoursesScreen`: يُسنَد كائن الخطأ كأنه مدرسة، فـ`school.levels` غير معرّفة = قائمة
  مستويات فارغة بلا رسالة ولا محتوى بديل (و`setSchoolFallback` لا يعمل أبداً).
- `LectureClassroom`: يبني محاضرة احتياطية بمقطعين عند الخطأ، وردُّ 200 يمرّ من فوقه فيُعرض
  «درس» بلا عنوان ولا مقاطع.

**بلا شبكة**: محتوى الأكاديمية ثابت بالمستودع (`academy_data`)، ولا مسار هنا يستدعي مزوّداً.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from academy_data import ACADEMY_SCHOOLS
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_academy.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


_SCHOOL = ACADEMY_SCHOOLS[0]
_LECTURE = _SCHOOL["levels"][0]["lectures"][0]


@pytest.mark.parametrize(
    "path",
    [
        "/api/academy/schools/does-not-exist",
        "/api/courses/does-not-exist",
    ],
)
def test_unknown_school_is_404(client, path):
    r = client.get(path)
    assert r.status_code == 404, r.text


def test_unknown_lecture_is_404(client):
    r = client.get(f"/api/academy/schools/{_SCHOOL['id']}/lectures/does-not-exist")
    assert r.status_code == 404, r.text


def test_lecture_of_unknown_school_is_404(client):
    r = client.get(f"/api/academy/schools/nope/lectures/{_LECTURE['id']}")
    assert r.status_code == 404, r.text


def test_error_body_never_returned_with_200(client):
    """الشكل نفسه هو العيب: جسمٌ يقول «خطأ» تحت حالة تقول «نجاح» لا يراه العميل خطأً."""
    for path in (
        "/api/academy/schools/nope",
        "/api/courses/nope",
        f"/api/academy/schools/{_SCHOOL['id']}/lectures/nope",
    ):
        r = client.get(path)
        assert not (r.status_code == 200 and "not found" in r.text), path


def test_real_school_and_lecture_still_served(client):
    """الحارس المعاكس: بلا هذا الاختبار قد يمرّ ردٌّ يجعل **كل** معرّف 404."""
    school = client.get(f"/api/academy/schools/{_SCHOOL['id']}")
    assert school.status_code == 200, school.text
    assert school.json()["levels"], "مدرسة بلا مستويات لا تُعرض شيئاً"

    course = client.get(f"/api/courses/{_SCHOOL['id']}")
    assert course.status_code == 200 and course.json()["id"] == _SCHOOL["id"]

    lec = client.get(f"/api/academy/schools/{_SCHOOL['id']}/lectures/{_LECTURE['id']}")
    assert lec.status_code == 200, lec.text
    assert lec.json()["script_segments"], "محاضرة بلا مقاطع لا تُسرد"


def test_schools_list_and_courses_list_still_served(client):
    assert client.get("/api/academy/schools").json()["schools"]
    assert client.get("/api/courses").json()["courses"]


def _register(client, username="student1"):
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_negative_segment_index_is_422(client):
    """الاستئناف يقرأ الموضع المحفوظ — وموضعٌ سالب يجعل المقطع الحالي غير معرّف بالقاعة."""
    r = client.post(
        "/api/academy/progress",
        json={"school_id": _SCHOOL["id"], "lecture_id": _LECTURE["id"], "segment_index": -1},
        headers=_register(client),
    )
    assert r.status_code == 422, r.text


def test_absurd_identifier_is_422(client):
    r = client.post(
        "/api/academy/progress",
        json={"school_id": "s" * 500, "lecture_id": _LECTURE["id"], "segment_index": 0},
        headers=_register(client, "student2"),
    )
    assert r.status_code == 422, r.text


def test_real_progress_save_still_works_and_completed_is_not_lowered(client):
    """الحارس المعاكس + قاعدة قائمة: «أنهاها» حدثٌ لا يُلغى بإعادة فتح المحاضرة للمراجعة."""
    headers = _register(client, "student3")
    body = {"school_id": _SCHOOL["id"], "lecture_id": _LECTURE["id"]}
    done = client.post("/api/academy/progress", json={**body, "segment_index": 2, "completed": True}, headers=headers)
    assert done.status_code == 200, done.text
    again = client.post("/api/academy/progress", json={**body, "segment_index": 0}, headers=headers)
    assert again.status_code == 200, again.text
    assert again.json()["progress"]["completed"] is True
    assert again.json()["progress"]["segment_index"] == 0


def test_course_cards_do_not_claim_zero_progress(client):
    # عامّة بلا مستخدم: كانت «progress: 0» لكل متعلّم حتى من أنهى كل المحاضرات
    for c in client.get("/api/courses").json()["courses"]:
        assert c["progress"] is None
    cid = client.get("/api/courses").json()["courses"][0]["id"]
    assert client.get(f"/api/courses/{cid}").json()["progress"] is None
    assert all(s["progress"] is None for s in client.get("/api/academy/schools").json()["schools"])


# ─── TTS: voice_id يُلصق بمسار ElevenLabs ───────────────────────────────────

@pytest.mark.parametrize("vid", ["../voices/add", "abc/../../user", "x" * 5, "a b c d e f g h"])
def test_tts_rejects_a_voice_id_that_is_not_a_plain_id(client, monkeypatch, vid):
    """«../voices/add» كان يصير POST إلى /v1/voices/add بمفتاح الخادم."""
    import elevenlabs_tts as tts

    monkeypatch.setattr(tts, "configured", lambda: True)
    sent = []
    monkeypatch.setattr(tts.httpx, "Client", lambda *a, **k: sent.append(1))
    r = client.post("/api/academy/tts", json={"text": "hi", "voice_id": vid})
    assert r.status_code == 422 and not sent


def test_synthesize_itself_refuses_a_path_voice_id(monkeypatch):
    import elevenlabs_tts as tts

    monkeypatch.setattr(tts, "_api_key", lambda: "k")
    with pytest.raises(ValueError, match="bad voice id"):
        tts.synthesize("hi", "../voices/add")


def test_tts_does_not_echo_the_provider_error_text(client, monkeypatch):
    import elevenlabs_tts as tts

    monkeypatch.setattr(tts, "configured", lambda: True)

    def boom(text, vid):
        raise RuntimeError("ElevenLabs 401: account secret-details")

    monkeypatch.setattr(tts, "synthesize", boom)
    r = client.post("/api/academy/tts", json={"text": "hi"})
    assert r.status_code == 502 and "secret" not in r.text


def test_progress_for_a_lecture_that_does_not_exist_or_past_its_end_is_refused(client):
    # كانت تُخزَّن وتُعاد: محاضرة وهمية (صفوف بلا حدّ)، وموضع 99 على محاضرة بثلاثة مقاطع ⇒
    # الاستئناف يفتح القاعة بلا مقطع حالي؛ و2**63 = 500 من SQLite
    headers = _register(client, "student_bounds")
    body = {"school_id": "basics", "lecture_id": "basics-l1-01", "segment_index": 0}
    assert client.post("/api/academy/progress", json={**body, "lecture_id": "zzz"}, headers=headers).status_code == 404
    assert client.post("/api/academy/progress", json={**body, "school_id": "no-such"}, headers=headers).status_code == 404
    for bad in (3, 99, 2**63):
        assert client.post("/api/academy/progress", json={**body, "segment_index": bad}, headers=headers).status_code == 422
    assert client.post("/api/academy/progress", json={**body, "segment_index": 2}, headers=headers).status_code == 200
    assert [p["lecture_id"] for p in client.get("/api/academy/progress", headers=headers).json()["progress"]] == ["basics-l1-01"]


def test_interrupt_on_unknown_lecture_is_404(client):
    r = client.post("/api/academy/interrupt", json={"school_id": "basics", "lecture_id": "zzz", "question": "why?"})
    assert r.status_code == 404


def test_lecture_duration_comes_from_its_narration_not_a_hand_written_number():
    """run 55: «45 د» لمحاضرة نصّها 7 كلمات (ثوانٍ من الصوت) — مدّة مخترَعة."""
    import academy_data
    for school in academy_data.ACADEMY_SCHOOLS:
        for level in school["levels"]:
            for lec in level["lectures"]:
                words = sum(len(s["narration"].split()) for s in lec["script_segments"])
                assert lec["narration_words"] == words
                assert lec["duration_min"] == max(1, -(-words // academy_data.NARRATION_WPM))


def test_courses_do_not_advertise_features_that_do_not_exist(monkeypatch):
    from fastapi.testclient import TestClient
    import main
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    c = TestClient(main.app)
    assert all(x["ai_tutor"] is False for x in c.get("/api/courses").json()["courses"])
    d = c.get("/api/courses/basics").json()
    assert d["ai_tutor"] is False and all(m["ai_quiz"] is False for m in d["modules"])


def test_progress_get_with_expired_token_is_401_not_empty(client):
    """منتهٍ/ملغى ⇒ 401 كالـPOST و`_owner_key` — كان `{"progress": []}` بـ200: كل محاضرة «غير مبدوءة»."""
    headers = _register(client, "student9")
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    r = client.get("/api/academy/progress", headers=headers)
    assert r.status_code == 401, r.text
    assert client.get("/api/academy/progress").json() == {"progress": []}  # الزائر بلا توكن كما هو


def test_interrupt_tutor_reply_goes_through_the_trade_call_guard(client, monkeypatch):
    # قرار أنس ٤ يشمل مدرّس الأكاديمية — كان ردّ النموذج يُعاد كما هو
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "interrupt_answer",
                        lambda *a, **k: "RSI measures momentum.\nBuy EURUSD at 1.0850, stop 1.0800.")
    r = client.post("/api/academy/interrupt", json={
        "school_id": "basics", "lecture_id": "basics-l1-01", "question": "what should I buy now?", "lang": "en"})
    out = r.json()["clarification"]
    assert "RSI measures momentum." in out and "1.0850" not in out and "was removed" in out
