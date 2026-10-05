"""
Tests for academy progress and certificate routes (T18b).
"""
import pytest
from fastapi.testclient import TestClient

import db
import main
from academy_data import ACADEMY_SCHOOLS
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_academy.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


_SCHOOL = ACADEMY_SCHOOLS[0]


def _register(client, username="student1"):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _complete_lecture(client, headers, school_id, lecture_id):
    """Complete a single lecture."""
    body = {"school_id": school_id, "lecture_id": lecture_id, "segment_index": 0, "completed": True}
    r = client.post("/api/academy/progress", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _complete_all_lectures(client, headers, school_id):
    """Complete all lectures in a school."""
    lecture_ids = []
    for level in ACADEMY_SCHOOLS[0]["levels"]:
        for lecture in level["lectures"]:
            lecture_ids.append(lecture["id"])

    for lecture_id in lecture_ids:
        _complete_lecture(client, headers, school_id, lecture_id)

    return lecture_ids


# ─── 401 tests ────────────────────────────────────────────────────────────────

def test_401_get_courses_without_token(client):
    """GET /courses returns 401 without token."""
    r = client.get("/api/academy/progress/courses")
    assert r.status_code == 401, r.text


def test_401_get_course_without_token(client):
    """GET /courses/{id} returns 401 without token."""
    r = client.get(f"/api/academy/progress/courses/{_SCHOOL['id']}")
    assert r.status_code == 401, r.text


def test_401_post_certificate_without_token(client):
    """POST /courses/{id}/certificate returns 401 without token."""
    r = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate")
    assert r.status_code == 401, r.text


def test_401_get_certificates_without_token(client):
    """GET /certificates returns 401 without token."""
    r = client.get("/api/academy/progress/certificates")
    assert r.status_code == 401, r.text


# ─── Progress tests ───────────────────────────────────────────────────────────

def test_get_courses_no_progress_shows_zero(client):
    """GET /courses with no progress shows 0% for all courses."""
    headers = _register(client, "student_zero")
    r = client.get("/api/academy/progress/courses", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "courses" in data
    assert "completed" in data
    assert data["completed"] == []
    for course in data["courses"].values():
        assert course["completed"] == 0
        assert course["completed_lectures"] == 0
        assert course["progress_pct"] == 0.0
        assert course["is_complete"] is False
        # Old keys still present
        assert course["total"] == course["total_lectures"]
        assert course["completed"] == course["completed_lectures"]
        assert course["percent"] == course["progress_pct"]


def test_get_courses_partial_progress(client):
    """GET /courses after completing one lecture shows partial progress."""
    headers = _register(client, "student_partial")
    # Complete first lecture
    lecture_id = _SCHOOL["levels"][0]["lectures"][0]["id"]
    _complete_lecture(client, headers, _SCHOOL["id"], lecture_id)

    r = client.get("/api/academy/progress/courses", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()

    assert "courses" in data
    assert "completed" in data
    # Find the first school
    course = data["courses"][_SCHOOL["id"]]
    assert course["completed"] > 0
    assert course["completed_lectures"] > 0
    assert course["percent"] > 0.0
    assert course["progress_pct"] > 0.0
    assert course["percent"] < 100.0
    assert course["progress_pct"] < 100.0
    assert course["is_complete"] is False


def test_get_course_unknown_school_returns_404(client):
    """GET /courses/{id} with unknown school returns 404."""
    headers = _register(client, "student_404")
    r = client.get("/api/academy/progress/courses/unknown-school", headers=headers)
    assert r.status_code == 404, r.text


# ─── Certificate tests ────────────────────────────────────────────────────────

def test_certificate_incomplete_course_returns_409(client):
    """Certificate on incomplete course returns 409."""
    headers = _register(client, "student_incomplete")
    # Complete only one lecture
    lecture_id = _SCHOOL["levels"][0]["lectures"][0]["id"]
    _complete_lecture(client, headers, _SCHOOL["id"], lecture_id)

    r = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers)
    assert r.status_code == 409, r.text
    assert "course_not_complete" in r.text


def test_certificate_unknown_school_returns_404(client):
    """Certificate on unknown school returns 404."""
    headers = _register(client, "student_unknown")
    r = client.post("/api/academy/progress/courses/unknown-school/certificate", headers=headers)
    assert r.status_code == 404, r.text


def test_certificate_complete_course_returns_200_with_cert_id(client):
    """Certificate after completing all lectures returns 200 with CERT- id."""
    headers = _register(client, "student_complete")
    _complete_all_lectures(client, headers, _SCHOOL["id"])

    r = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "certificate" in data
    cert = data["certificate"]
    assert cert["id"].startswith("CERT-")
    assert cert["user_id"] == 1
    assert cert["school_id"] == _SCHOOL["id"]
    assert "issued_at" in cert


def test_certificate_idempotent_second_call_returns_same_id_and_issued_at(client):
    """Second certificate call is idempotent (same id and issued_at)."""
    headers = _register(client, "student_idempotent")
    _complete_all_lectures(client, headers, _SCHOOL["id"])

    # First call
    r1 = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers)
    assert r1.status_code == 200, r1.text
    cert1 = r1.json()["certificate"]

    # Second call
    r2 = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers)
    assert r2.status_code == 200, r2.text
    cert2 = r2.json()["certificate"]

    assert cert2["id"] == cert1["id"]
    assert cert2["issued_at"] == cert1["issued_at"]


def test_get_certificates_lists_exactly_one_after_issuing(client):
    """GET /certificates lists exactly 1 certificate after issuing."""
    headers = _register(client, "student_list")
    _complete_all_lectures(client, headers, _SCHOOL["id"])

    # Issue certificate
    r_issue = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers)
    assert r_issue.status_code == 200, r_issue.text
    cert_id = r_issue.json()["certificate"]["id"]

    # List certificates
    r = client.get("/api/academy/progress/certificates", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == cert_id


def test_get_certificates_empty_for_fresh_user(client):
    """GET /certificates returns [] for a fresh user."""
    headers = _register(client, "student_fresh")
    r = client.get("/api/academy/progress/certificates", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data == []


def test_certificates_isolated_between_users(client):
    """A second user does not see the first user's certificates."""
    # User 1 completes course and gets certificate
    headers1 = _register(client, "student_user1")
    _complete_all_lectures(client, headers1, _SCHOOL["id"])
    r1 = client.post(f"/api/academy/progress/courses/{_SCHOOL['id']}/certificate", headers=headers1)
    assert r1.status_code == 200, r1.text
    cert1 = r1.json()["certificate"]["id"]

    # User 2 registers
    headers2 = _register(client, "student_user2")
    # User 2 should see empty list
    r2 = client.get("/api/academy/progress/certificates", headers=headers2)
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2 == []

    # User 1 still sees their certificate
    r1_list = client.get("/api/academy/progress/certificates", headers=headers1)
    assert r1_list.status_code == 200, r1_list.text
    data1 = r1_list.json()
    assert len(data1) == 1
    assert data1[0]["id"] == cert1