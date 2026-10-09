"""
Tests for academy contract (T24).
Validates the frontend-backend contract for academy progress and certificates.
"""
import pytest

import db
import main
import academy_progress
import academy_contract
from academy_data import ACADEMY_SCHOOLS
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    from core import db_conn
    path = tmp_path / "test_academy.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.fixture()
def cert_db_path(tmp_path):
    """Create a temporary certificate database."""
    path = tmp_path / "certs.db"
    academy_progress.init_cert_db(str(path))
    return str(path)


@pytest.fixture()
def first_school():
    """Get the first school from ACADEMY_SCHOOLS."""
    return ACADEMY_SCHOOLS[0]


def _register(client, username="student1"):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _complete_lecture(client, headers, school_id, lecture_id):
    """Complete a single lecture with frontend body (no segment_index)."""
    body = {"school_id": school_id, "lecture_id": lecture_id, "completed": True}
    r = client.post("/api/academy/progress", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _complete_all_lectures(client, headers, school_id):
    """Complete all lectures in a school."""
    lecture_ids = []
    for school in ACADEMY_SCHOOLS:
        if school["id"] == school_id:
            for level in school["levels"]:
                for lecture in level["lectures"]:
                    lecture_ids.append(lecture["id"])
            break

    for lecture_id in lecture_ids:
        _complete_lecture(client, headers, school_id, lecture_id)

    return lecture_ids


# ─── Unit tests for academy_contract helpers ────────────────────────────────────

def test_build_courses_payload_empty_rows():
    """build_courses_payload with empty rows returns empty completed and all courses with zero progress."""
    payload = academy_contract.build_courses_payload([])
    assert payload["completed"] == []
    assert isinstance(payload["courses"], dict)
    assert len(payload["courses"]) > 0
    # All courses should have zero progress
    for course in payload["courses"].values():
        assert course["completed_lectures"] == 0
        assert course["progress_pct"] == 0.0
        assert course["is_complete"] is False


def test_build_courses_payload_with_progress(first_school):
    """build_courses_payload with some completed lectures returns correct shape."""
    lecture_ids = academy_progress.course_lecture_ids(first_school["id"])
    rows = [
        {"school_id": first_school["id"], "lecture_id": lecture_ids[0], "completed": True},
        {"school_id": first_school["id"], "lecture_id": lecture_ids[1], "completed": False},
        {"school_id": first_school["id"], "lecture_id": lecture_ids[2], "completed": True},
    ]
    payload = academy_contract.build_courses_payload(rows)

    # Check completed list
    assert payload["completed"] == [lecture_ids[0], lecture_ids[2]]

    # Check courses dict structure
    assert first_school["id"] in payload["courses"]
    course = payload["courses"][first_school["id"]]

    # Old keys present
    assert "school_id" in course
    assert "total" in course
    assert "completed" in course
    assert "percent" in course
    assert "is_complete" in course

    # New keys present
    assert "total_lectures" in course
    assert "completed_lectures" in course
    assert "progress_pct" in course

    # Values match
    assert course["total"] == course["total_lectures"]
    assert course["completed"] == course["completed_lectures"]
    assert course["percent"] == course["progress_pct"]
    assert course["completed_lectures"] == 2


def test_enrich_certificate_defaults(first_school):
    """enrich_certificate with no student_name uses defaults."""
    cert = {"id": "CERT-TEST", "user_id": 1, "school_id": first_school["id"], "issued_at": 1000.0}
    enriched = academy_contract.enrich_certificate(cert)

    assert enriched["id"] == "CERT-TEST"
    assert enriched["course_name"] == first_school["name_ar"]
    assert enriched["student_name"] == "متداول MATRIX"
    assert enriched["grade"] == "امتياز (Honor Distinction)"


def test_enrich_certificate_custom_student_name(first_school):
    """enrich_certificate with student_name uses provided name."""
    cert = {"id": "CERT-TEST", "user_id": 1, "school_id": first_school["id"], "issued_at": 1000.0}
    enriched = academy_contract.enrich_certificate(cert, student_name="Ali")

    assert enriched["student_name"] == "Ali"
    assert enriched["course_name"] == first_school["name_ar"]


# ─── Integration tests with TestClient ──────────────────────────────────────────

def test_courses_is_dict_keyed_by_school_id(client):
    """GET /courses returns a dict keyed by school_id."""
    headers = _register(client, "student_dict")
    r = client.get("/api/academy/progress/courses", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "courses" in data
    assert isinstance(data["courses"], dict)
    assert "completed" in data
    # Check all schools are keys
    for school in ACADEMY_SCHOOLS:
        assert school["id"] in data["courses"]


def test_completed_empty_for_fresh_user(client):
    """GET /courses returns empty completed list for fresh user."""
    headers = _register(client, "student_fresh")
    r = client.get("/api/academy/progress/courses", headers=headers)
    data = r.json()
    assert data["completed"] == []


def test_post_progress_frontend_body_updates_completed(client, first_school):
    """POST /api/academy/progress with frontend body updates completed list and progress."""
    headers = _register(client, "student_progress")
    lecture_id = first_school["levels"][0]["lectures"][0]["id"]

    # POST with frontend body (no segment_index)
    r = client.post(
        "/api/academy/progress",
        json={"lecture_id": lecture_id, "school_id": first_school["id"], "completed": True},
        headers=headers,
    )
    assert r.status_code == 200

    # Verify GET /courses reflects the change
    r = client.get("/api/academy/progress/courses", headers=headers)
    data = r.json()
    assert lecture_id in data["completed"]
    course = data["courses"][first_school["id"]]
    assert course["completed_lectures"] == 1
    total = course["total_lectures"]
    expected_pct = round((1 / total) * 100, 1)
    assert course["progress_pct"] == expected_pct


def test_post_progress_unknown_lecture_returns_404(client):
    """POST /api/academy/progress with unknown lecture returns 404."""
    headers = _register(client, "student_404")
    r = client.post(
        "/api/academy/progress",
        json={"lecture_id": "unknown-lecture", "school_id": "basics", "completed": True},
        headers=headers,
    )
    assert r.status_code == 404


def test_get_courses_without_auth_returns_401(client):
    """GET /courses without auth returns 401."""
    r = client.get("/api/academy/progress/courses")
    assert r.status_code == 401


def test_certificates_empty_before_completion(client):
    """GET /certificates returns [] before any completion."""
    headers = _register(client, "student_no_certs")
    r = client.get("/api/academy/progress/certificates", headers=headers)
    assert r.status_code == 200
    assert r.json() == []


def test_complete_school_then_post_certificate_with_student_name(client, first_school):
    """Complete all lectures, POST certificate with student_name, verify response."""
    headers = _register(client, "student_cert_with_name")
    _complete_all_lectures(client, headers, first_school["id"])

    r = client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        json={"student_name": "Ali"},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    cert = data["certificate"]
    assert cert["student_name"] == "Ali"
    assert cert["course_name"] == first_school["name_ar"]
    assert cert["grade"] == "امتياز (Honor Distinction)"
    assert cert["id"].startswith("CERT-")
    assert cert["school_id"] == first_school["id"]
    assert "issued_at" in cert


def test_certificate_idempotent_same_id(client, first_school):
    """POST certificate twice returns same id."""
    headers = _register(client, "student_idempotent")
    _complete_all_lectures(client, headers, first_school["id"])

    r1 = client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        json={"student_name": "Ali"},
        headers=headers,
    )
    r2 = client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        json={"student_name": "Ali"},
        headers=headers,
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["certificate"]["id"] == r2.json()["certificate"]["id"]
    assert r1.json()["certificate"]["issued_at"] == r2.json()["certificate"]["issued_at"]


def test_post_certificate_without_body_uses_default_student_name(client, first_school):
    """POST certificate without body works with default student_name."""
    headers = _register(client, "student_no_body")
    _complete_all_lectures(client, headers, first_school["id"])

    r = client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        headers=headers,  # No body
    )
    assert r.status_code == 200
    cert = r.json()["certificate"]
    assert cert["student_name"] == "متداول MATRIX"


def test_get_certificates_returns_list_with_all_keys(client, first_school):
    """GET /certificates returns list with all 6 keys."""
    headers = _register(client, "student_cert_list")
    _complete_all_lectures(client, headers, first_school["id"])

    client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        json={"student_name": "Ali"},
        headers=headers,
    )

    r = client.get("/api/academy/progress/certificates", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 1
    cert = data[0]
    # All 6 keys present
    assert "id" in cert
    assert "school_id" in cert
    assert "course_name" in cert
    assert "student_name" in cert
    assert "issued_at" in cert
    assert "grade" in cert


def test_post_certificate_incomplete_school_returns_409(client, first_school):
    """POST certificate for incomplete school returns 409."""
    headers = _register(client, "student_incomplete_cert")
    # Complete only one lecture
    lecture_id = first_school["levels"][0]["lectures"][0]["id"]
    _complete_lecture(client, headers, first_school["id"], lecture_id)

    r = client.post(
        f"/api/academy/progress/courses/{first_school['id']}/certificate",
        headers=headers,
    )
    assert r.status_code == 409
    assert "course_not_complete" in r.text


def test_post_certificate_unknown_school_returns_404(client):
    """POST certificate for unknown school returns 404."""
    headers = _register(client, "student_unknown_school")
    r = client.post(
        "/api/academy/progress/courses/unknown-school/certificate",
        headers=headers,
    )
    assert r.status_code == 404