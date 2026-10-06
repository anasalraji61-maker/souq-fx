"""Stripe billing routes (web / desktop)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

import mailer
import stripe_billing
from core.auth import _auth_user

router = APIRouter(tags=["billing"])


def _base(request: Request) -> str:
    return mailer.public_base_url(str(request.base_url))


@router.get("/api/billing/config")
def billing_config():
    return {"enabled": stripe_billing.configured(), "test_mode": stripe_billing.test_mode() if stripe_billing.configured() else None}


class CheckoutBody(BaseModel):
    plan: str = Field(..., pattern="^(basic|pro|vip)$")


@router.post("/api/billing/checkout")
def billing_checkout(body: CheckoutBody, request: Request, user: dict | None = Depends(_auth_user)):
    if not stripe_billing.configured():
        raise HTTPException(status_code=503, detail="billing_unavailable")
    if not user:
        raise HTTPException(status_code=401, detail="login_required")
    try:
        url = stripe_billing.create_checkout(int(user["user_id"]), body.plan, _base(request))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="user not found") from exc
    except Exception as exc:  # Stripe/network errors
        stripe_billing.log.error("stripe checkout failed: %s", exc)
        raise HTTPException(status_code=502, detail="billing_error") from exc
    return {"url": url}


@router.post("/api/billing/portal")
def billing_portal(request: Request, user: dict | None = Depends(_auth_user)):
    if not stripe_billing.configured():
        raise HTTPException(status_code=503, detail="billing_unavailable")
    if not user:
        raise HTTPException(status_code=401, detail="login_required")
    try:
        url = stripe_billing.create_portal(int(user["user_id"]), _base(request))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="no_subscription") from exc
    except Exception as exc:
        stripe_billing.log.error("stripe portal failed: %s", exc)
        raise HTTPException(status_code=502, detail="billing_error") from exc
    return {"url": url}


@router.post("/api/billing/webhook")
async def billing_webhook(request: Request):
    if not stripe_billing.configured():
        raise HTTPException(status_code=404, detail="not found")
    payload = await request.body()
    try:
        result = stripe_billing.handle_event(payload, request.headers.get("stripe-signature"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid signature") from exc
    return {"received": True, **{k: v for k, v in result.items() if k in ("type", "duplicate", "plan", "ignored")}}
