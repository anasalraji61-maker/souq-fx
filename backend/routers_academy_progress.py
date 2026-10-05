"""
Academy progress and certificate routes.
"""
from __future__ import annotations

import time

import db
import academy_progress
import academy_contract
from core import db_conn
from core.auth import _auth_user
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/api/academy/progress", tags=["academy"])


def _cert_path() -> str:
    """Return the certificate database path. Read at call time for test monkeypatching."""
    return str(db_conn.DB_PATH)


def _require(user: dict | None) -> None:
    """Raise 401 if user is not authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")


@router.get("/courses")
def get_all_progress(user: dict | None = Depends(_auth_user)):
    """Get progress for all courses."""
    _require(user)
    uid = user["user_id"]
    path = _cert_path()
    academy_progress.init_cert_db(path)
    rows = db.get_progress(uid)
    return academy_contract.build_courses_payload(rows)


@router.get("/courses/{school_id}")
def get_course_progress(school_id: str, user: dict | None = Depends(_auth_user)):
    """Get progress for a specific course."""
    _require(user)
    uid = user["user_id"]
    path = _cert_path()
    academy_progress.init_cert_db(path)
    rows = db.get_progress(uid)
    result = academy_progress.compute_course_progress(school_id, rows)
    if result is None:
        raise HTTPException(status_code=404, detail="school not found")
    return result


from pydantic import BaseModel


class CertBody(BaseModel):
    """Optional body for certificate issuance."""
    student_name: str | None = None


@router.post("/courses/{school_id}/certificate")
def issue_certificate(
    school_id: str,
    body: CertBody | None = None,
    user: dict | None = Depends(_auth_user),
):
    """Issue a certificate for completing a course."""
    _require(user)
    uid = user["user_id"]
    path = _cert_path()
    academy_progress.init_cert_db(path)
    rows = db.get_progress(uid)

    # Check if school exists
    if academy_progress.compute_course_progress(school_id, rows) is None:
        raise HTTPException(status_code=404, detail="school not found")

    cert = academy_progress.issue_certificate(path, uid, school_id, rows, time.time())
    if cert is None:
        raise HTTPException(status_code=409, detail="course_not_complete")

    student_name = body.student_name if body else None
    enriched = academy_contract.enrich_certificate(cert, student_name)
    return {"certificate": enriched}


@router.get("/certificates")
def list_certificates(user: dict | None = Depends(_auth_user)):
    """List all certificates for the authenticated user."""
    _require(user)
    uid = user["user_id"]
    path = _cert_path()
    academy_progress.init_cert_db(path)
    certs = academy_progress.list_certificates(path, uid)
    enriched = [academy_contract.enrich_certificate(c) for c in certs]
    return enriched