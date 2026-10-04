"""
Tests for academy_progress module.
"""

import pytest
import tempfile
import os

from academy_data import ACADEMY_SCHOOLS
from academy_progress import (
    course_lecture_ids,
    compute_course_progress,
    compute_all_progress,
    init_cert_db,
    issue_certificate,
    list_certificates,
)


@pytest.fixture
def cert_db_path(tmp_path):
    """Create a temporary certificate database."""
    path = tmp_path / "certs.db"
    init_cert_db(str(path))
    return str(path)


@pytest.fixture
def first_school():
    """Get the first school from ACADEMY_SCHOOLS."""
    return ACADEMY_SCHOOLS[0]


@pytest.fixture
def full_completion_rows(first_school):
    """Build progress rows for full completion of the first school."""
    lecture_ids = course_lecture_ids(first_school["id"])
    rows = []
    for lecture_id in lecture_ids:
        rows.append(
            {
                "school_id": first_school["id"],
                "lecture_id": lecture_id,
                "segment_index": 0,
                "completed": True,
            }
        )
    return rows


def test_course_lecture_ids_returns_list_for_first_school(first_school):
    """1. course_lecture_ids returns a non-empty list for the first school, and None for 'nope'."""
    ids = course_lecture_ids(first_school["id"])
    assert ids is not None
    assert len(ids) > 0

    assert course_lecture_ids("nope") is None


def test_empty_rows_gives_zero_completed_and_zero_percent(first_school):
    """2. Empty rows give 0 completed and 0.0 percent."""
    progress = compute_course_progress(first_school["id"], [])
    assert progress is not None
    assert progress["completed"] == 0
    assert progress["percent"] == 0.0
    assert progress["is_complete"] is False


def test_partial_completion_gives_correct_percent(first_school):
    """3. Partial completion gives the correct percent. Compute the expected value in the test from the total."""
    lecture_ids = course_lecture_ids(first_school["id"])
    total = len(lecture_ids)

    # Complete half the lectures (round down)
    completed_count = total // 2
    rows = []
    for i in range(completed_count):
        rows.append(
            {
                "school_id": first_school["id"],
                "lecture_id": lecture_ids[i],
                "segment_index": 0,
                "completed": True,
            }
        )

    progress = compute_course_progress(first_school["id"], rows)
    assert progress is not None
    assert progress["completed"] == completed_count
    expected_percent = round((completed_count / total) * 100, 1)
    assert progress["percent"] == expected_percent
    assert progress["is_complete"] is False


def test_full_completion_gives_100_and_is_complete(first_school, full_completion_rows):
    """4. Full completion gives 100.0 and is_complete true."""
    progress = compute_course_progress(first_school["id"], full_completion_rows)
    assert progress is not None
    assert progress["completed"] == progress["total"]
    assert progress["percent"] == 100.0
    assert progress["is_complete"] is True


def test_rows_with_completed_false_not_counted(first_school):
    """5. Rows with completed false are not counted."""
    lecture_ids = course_lecture_ids(first_school["id"])
    rows = [
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[0],
            "segment_index": 0,
            "completed": False,
        },
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[1],
            "segment_index": 0,
            "completed": True,
        },
    ]

    progress = compute_course_progress(first_school["id"], rows)
    assert progress is not None
    assert progress["completed"] == 1


def test_duplicate_rows_for_same_lecture_counted_once(first_school):
    """6. Duplicate rows for the same lecture are counted once."""
    lecture_ids = course_lecture_ids(first_school["id"])
    rows = [
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[0],
            "segment_index": 0,
            "completed": True,
        },
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[0],
            "segment_index": 1,
            "completed": True,
        },
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[1],
            "segment_index": 0,
            "completed": True,
        },
    ]

    progress = compute_course_progress(first_school["id"], rows)
    assert progress is not None
    assert progress["completed"] == 2


def test_rows_from_another_school_or_unknown_lecture_ignored(first_school):
    """7. Rows from another school, or with an unknown lecture id, are ignored."""
    lecture_ids = course_lecture_ids(first_school["id"])

    # Find another school
    other_school = None
    for s in ACADEMY_SCHOOLS:
        if s["id"] != first_school["id"]:
            other_school = s
            break

    other_lecture_ids = course_lecture_ids(other_school["id"])

    rows = [
        # From another school
        {
            "school_id": other_school["id"],
            "lecture_id": other_lecture_ids[0],
            "segment_index": 0,
            "completed": True,
        },
        # Unknown lecture id
        {
            "school_id": first_school["id"],
            "lecture_id": "unknown-lecture",
            "segment_index": 0,
            "completed": True,
        },
        # Valid row
        {
            "school_id": first_school["id"],
            "lecture_id": lecture_ids[0],
            "segment_index": 0,
            "completed": True,
        },
    ]

    progress = compute_course_progress(first_school["id"], rows)
    assert progress is not None
    assert progress["completed"] == 1


def test_unknown_school_returns_none():
    """8. An unknown school returns None."""
    assert compute_course_progress("unknown-school", []) is None


def test_compute_all_progress_length_and_order():
    """9. compute_all_progress has length len(ACADEMY_SCHOOLS) and is ordered by order."""
    rows = []
    results = compute_all_progress(rows)

    assert len(results) == len(ACADEMY_SCHOOLS)

    # Check ordering
    for i in range(len(results) - 1):
        assert results[i]["school_id"] == ACADEMY_SCHOOLS[i]["id"]


def test_issue_certificate_returns_none_when_incomplete(first_school, cert_db_path):
    """10. issue_certificate returns None when the course is incomplete."""
    rows = []  # Empty = incomplete
    result = issue_certificate(cert_db_path, 1, first_school["id"], rows, 1000.0)
    assert result is None


def test_issue_certificate_returns_none_for_unknown_school(cert_db_path):
    """11. issue_certificate returns None for an unknown school."""
    result = issue_certificate(cert_db_path, 1, "unknown-school", [], 1000.0)
    assert result is None


def test_complete_course_issues_certificate_with_cert_prefix(first_school, full_completion_rows, cert_db_path):
    """12. A complete course issues a certificate whose id starts with 'CERT-'."""
    result = issue_certificate(cert_db_path, 1, first_school["id"], full_completion_rows, 1000.0)
    assert result is not None
    assert result["id"].startswith("CERT-")
    assert result["user_id"] == 1
    assert result["school_id"] == first_school["id"]
    assert result["issued_at"] == 1000.0


def test_second_issue_call_returns_same_id_and_original_issued_at(first_school, full_completion_rows, cert_db_path):
    """13. A second issue call with a different now returns the same id and the original issued_at,
    and list_certificates has exactly 1 entry."""
    # First issue
    result1 = issue_certificate(cert_db_path, 1, first_school["id"], full_completion_rows, 1000.0)
    assert result1 is not None

    # Second issue with different timestamp
    result2 = issue_certificate(cert_db_path, 1, first_school["id"], full_completion_rows, 2000.0)
    assert result2 is not None

    # Same id and original issued_at
    assert result2["id"] == result1["id"]
    assert result2["issued_at"] == 1000.0

    # list_certificates has exactly 1 entry
    certs = list_certificates(cert_db_path, 1)
    assert len(certs) == 1
    assert certs[0]["id"] == result1["id"]


def test_certificates_for_different_users_have_different_ids_and_isolated(first_school, full_completion_rows, cert_db_path):
    """14. Certificates for different users have different ids, and list_certificates is isolated per user."""
    result1 = issue_certificate(cert_db_path, 1, first_school["id"], full_completion_rows, 1000.0)
    result2 = issue_certificate(cert_db_path, 2, first_school["id"], full_completion_rows, 1000.0)

    assert result1 is not None
    assert result2 is not None
    assert result1["id"] != result2["id"]

    # User 1 only sees their certificate
    certs1 = list_certificates(cert_db_path, 1)
    assert len(certs1) == 1
    assert certs1[0]["id"] == result1["id"]

    # User 2 only sees their certificate
    certs2 = list_certificates(cert_db_path, 2)
    assert len(certs2) == 1
    assert certs2[0]["id"] == result2["id"]