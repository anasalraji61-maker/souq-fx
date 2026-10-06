"""Plan routes: the caller's plan + limits (public), admin activation / cancel / payments / settings."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import mailer
import plans
from core.auth import _auth_user
from routers_admin import require_admin

router = APIRouter(tags=["plans"])


@router.get("/api/plan")
def my_plan(user: dict | None = Depends(_auth_user)):
    return plans.plan_payload(user["user_id"] if user else None)


class ActivateBody(BaseModel):
    plan: str = Field(..., pattern="^(basic|pro|vip)$")
    days: int = Field(..., ge=1, le=3660)
    amount_iqd: int | None = Field(default=None, ge=0, le=100_000_000)
    method: str | None = Field(default=None, max_length=16)
    reference: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=300)
    notify: bool = True


def _notify_activation(email: str, username: str, plan: str, expires_at: float) -> None:
    import time as _t

    end = _t.strftime("%Y-%m-%d", _t.gmtime(expires_at))
    label = plans.LABELS_AR.get(plan, plan)
    subject = f"تم تفعيل باقة {label} — MATRIX"
    text = (
        f"مرحباً {username}،\n\nتم تفعيل باقة {label} في حسابك على MATRIX، وتبقى فعّالة حتى {end}.\n"
        "شكراً لاشتراكك. افتح التطبيق وسجّل الدخول لتظهر المزايا الجديدة.\n\n"
        f"Hello {username}, your MATRIX {plan.upper()} plan is active until {end}.\n"
    )
    mailer.send(email, subject, text)


@router.post("/api/admin/users/{user_id}/plan", dependencies=[Depends(require_admin)])
def admin_activate(user_id: int, body: ActivateBody):
    if body.method is not None and body.method not in plans.PAYMENT_METHODS:
        raise HTTPException(status_code=422, detail="invalid method")
    try:
        res = plans.activate(user_id, body.plan, body.days, body.amount_iqd, body.method, body.reference, body.note)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="user not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    emailed = False
    if body.notify and mailer.configured():
        import db

        with db._conn() as c:
            row = c.execute("SELECT username, email FROM users WHERE id=?", (user_id,)).fetchone()
        if row and row["email"]:
            emailed = True
            # in-request is fine: admin action, rare; mailer never raises
            _notify_activation(row["email"], row["username"], res["plan"], res["expires_at"])
    return {"ok": True, **res, "emailed": emailed}


@router.post("/api/admin/users/{user_id}/plan/cancel", dependencies=[Depends(require_admin)])
def admin_cancel(user_id: int):
    if not plans.cancel(user_id):
        raise HTTPException(status_code=404, detail="user not found")
    return {"ok": True}


@router.get("/api/admin/payments", dependencies=[Depends(require_admin)])
def admin_payments(user_id: int | None = None, limit: int = 200):
    return {"payments": plans.payments(min(max(limit, 1), 1000), user_id), "stats": plans.subscription_stats()}


class SettingsBody(BaseModel):
    plan_enforcement: bool | None = None
    payment_instructions: str | None = Field(default=None, max_length=1000)


@router.get("/api/admin/settings", dependencies=[Depends(require_admin)])
def admin_settings():
    return {
        "plan_enforcement": plans.enforcement_on(),
        "payment_instructions": plans.payment_instructions(),
        "plan_limits": plans.LIMITS,
        "prices_usd": plans.PRICES_USD,
        "payment_methods": plans.PAYMENT_METHODS,
    }


@router.post("/api/admin/settings", dependencies=[Depends(require_admin)])
def admin_settings_save(body: SettingsBody):
    if body.plan_enforcement is not None:
        plans.set_setting("plan_enforcement", "1" if body.plan_enforcement else "0")
    if body.payment_instructions is not None:
        text = body.payment_instructions.strip()
        plans.set_setting("payment_instructions", text or plans.DEFAULT_PAYMENT_INSTRUCTIONS)
    return admin_settings()
