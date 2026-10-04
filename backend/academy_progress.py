"""
Academy course progress computation and certificate management.
Pure logic module with no external dependencies except sqlite3 and academy_data.
"""

from __future__ import annotations

import hashlib
import sqlite3
from typing import Any

from academy_data import ACADEMY_SCHOOLS, get_school


def course_lecture_ids(school_id: str) -> list[str] | None:
    """
    Return all lecture IDs for a given school (course).
    Returns None if the school is unknown.
    """
    school = get_school(school_id)
    if not school:
        return None

    lecture_ids = []
    for level in school["levels"]:
        for lecture in level["lectures"]:
            lecture_ids.append(lecture["id"])
    return lecture_ids


def compute_course_progress(school_id: str, progress_rows: list[dict]) -> dict | None:
    """
    Compute progress for a specific course (school).

    Args:
        school_id: The school/course ID.
        progress_rows: List of progress rows from db.get_progress(user_id).

    Returns:
        Dict with keys: school_id, total, completed, percent, is_complete.
        Returns None if the school is unknown.
    """
    lecture_ids = course_lecture_ids(school_id)
    if lecture_ids is None:
        return None

    # Get unique lecture IDs from the course
    course_lecture_set = set(lecture_ids)

    # Count completed lectures that belong to this course
    completed_lecture_ids = set()
    for row in progress_rows:
        if (
            row.get("school_id") == school_id
            and row.get("completed") is True
            and row.get("lecture_id") in course_lecture_set
        ):
            completed_lecture_ids.add(row["lecture_id"])

    total = len(course_lecture_set)
    completed = len(completed_lecture_ids)

    if total == 0:
        percent = 0.0
    else:
        percent = round((completed / total) * 100, 1)
        if percent > 100:
            percent = 100.0

    is_complete = completed == total and total > 0

    return {
        "school_id": school_id,
        "total": total,
        "completed": completed,
        "percent": percent,
        "is_complete": is_complete,
    }


def compute_all_progress(progress_rows: list[dict]) -> list[dict]:
    """
    Compute progress for all schools, ordered by their order field.
    """
    results = []
    for school in sorted(ACADEMY_SCHOOLS, key=lambda s: s["order"]):
        prog = compute_course_progress(school["id"], progress_rows)
        if prog is not None:
            results.append(prog)
    return results


# Certificate store functions

def init_cert_db(path: str) -> None:
    """
    Initialize the certificate database.
    Creates table: certificates(id TEXT PRIMARY KEY, user_id INTEGER, school_id TEXT,
    issued_at REAL, UNIQUE(user_id, school_id))
    """
    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS certificates (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                school_id TEXT NOT NULL,
                issued_at REAL NOT NULL,
                UNIQUE(user_id, school_id)
            )
            """
        )
        conn.commit()


def _generate_cert_id(user_id: int, school_id: str) -> str:
    """Generate a deterministic certificate ID."""
    data = f"{user_id}:{school_id}"
    hash_hex = hashlib.sha1(data.encode()).hexdigest()[:10].upper()
    return f"CERT-{hash_hex}"


def issue_certificate(
    path: str, user_id: int, school_id: str, progress_rows: list[dict], now: float
) -> dict | None:
    """
    Issue a certificate for completing a course.

    Args:
        path: Path to the certificate SQLite database.
        user_id: User ID.
        school_id: School/course ID.
        progress_rows: List of progress rows from db.get_progress(user_id).
        now: Current timestamp (float).

    Returns:
        Certificate dict with keys: id, user_id, school_id, issued_at.
        Returns None if school is unknown or course is not 100% complete.
    """
    # Check if school exists and course is complete
    progress = compute_course_progress(school_id, progress_rows)
    if progress is None or not progress["is_complete"]:
        return None

    cert_id = _generate_cert_id(user_id, school_id)

    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row

        # Check if certificate already exists
        existing = conn.execute(
            "SELECT * FROM certificates WHERE id = ?", (cert_id,)
        ).fetchone()

        if existing:
            return {
                "id": existing["id"],
                "user_id": existing["user_id"],
                "school_id": existing["school_id"],
                "issued_at": existing["issued_at"],
            }

        # Insert new certificate
        conn.execute(
            "INSERT INTO certificates (id, user_id, school_id, issued_at) VALUES (?, ?, ?, ?)",
            (cert_id, user_id, school_id, now),
        )
        conn.commit()

        return {
            "id": cert_id,
            "user_id": user_id,
            "school_id": school_id,
            "issued_at": now,
        }


def list_certificates(path: str, user_id: int) -> list[dict]:
    """
    List all certificates for a user, ordered by issued_at.
    """
    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at",
            (user_id,),
        ).fetchall()

        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "school_id": row["school_id"],
                "issued_at": row["issued_at"],
            }
            for row in rows
        ]