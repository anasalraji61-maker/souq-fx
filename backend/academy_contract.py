"""
Academy contract helpers for frontend-backend alignment.
Pure logic module with no external dependencies except academy_data and academy_progress.
"""
from __future__ import annotations

from typing import Any

from academy_data import get_school
from academy_progress import compute_all_progress, compute_course_progress


def build_courses_payload(progress_rows: list[dict]) -> dict:
    """
    Build the payload for GET /api/academy/progress/courses.

    Args:
        progress_rows: List of progress rows from db.get_progress(user_id).

    Returns:
        Dict with keys:
        - completed: list of lecture_id where completed is true for that user
        - courses: dict keyed by school_id with values containing:
            - school_id (old key)
            - total (old key)
            - completed (old key)
            - percent (old key)
            - is_complete (old key)
            - total_lectures (new key, same as total)
            - completed_lectures (new key, same as completed)
            - progress_pct (new key, same as percent)
    """
    # Get completed lecture IDs
    completed_lecture_ids = [
        row["lecture_id"]
        for row in progress_rows
        if row.get("completed") is True
    ]

    # Compute all progress
    courses_list = compute_all_progress(progress_rows)

    # Convert to dict keyed by school_id with new keys
    courses_dict = {}
    for course in courses_list:
        school_id = course["school_id"]
        courses_dict[school_id] = {
            "school_id": course["school_id"],
            "total": course["total"],
            "completed": course["completed"],
            "percent": course["percent"],
            "is_complete": course["is_complete"],
            "total_lectures": course["total"],
            "completed_lectures": course["completed"],
            "progress_pct": course["percent"],
        }

    return {
        "completed": completed_lecture_ids,
        "courses": courses_dict,
    }


def enrich_certificate(cert: dict, student_name: str | None = None) -> dict:
    """
    Enrich a certificate with frontend-expected fields.

    Args:
        cert: Certificate dict from academy_progress (id, user_id, school_id, issued_at)
        student_name: Optional student name from request body

    Returns:
        Enriched certificate dict with:
        - id, user_id, school_id, issued_at (original keys kept)
        - course_name: school title from academy_data.get_school(school_id)
        - student_name: provided name or default "متداول MATRIX"
        - grade: defaults to "امتياز (Honor Distinction)"
    """
    school = get_school(cert["school_id"])
    course_name = school["name_ar"] if school else cert["school_id"]

    return {
        **cert,
        "course_name": course_name,
        "student_name": student_name or "متداول MATRIX",
        "grade": "امتياز (Honor Distinction)",
    }