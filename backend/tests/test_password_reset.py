"""Forgot / reset password and real e-mail delivery of verification codes."""
import re
import time
import uuid

import pytest
from fastapi.testclient import TestClient

import db
import mailer
import main


@pytest.fixture()
def outbox(monkeypatch):
    sent: list[dict] = []
    monkeypatch.setenv("SMTP_HOST", "smtp.test")
    monkeypatch.setenv("SMTP_USER", "u")
    monkeypatch.setenv("SMTP_PASSWORD", "p")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://matrix.test")

    def fake_send(to, subject, text, html_body=None):
        sent.append({"to": to, "subject": subject, "text": text, "html": html_body})
        return True

    monkeypatch.setattr(mailer, "send", fake_send)
    main._FORGOT_IP_HITS.clear()
    return sent


def _register(c, email=None):
    name = "pr" + uuid.uuid4().hex[:10]
    email = email or f"{name}@example.com"
    r = c.post(
        "/api/auth/register",
        json={"username": name, "email": email, "password": "oldpass123", "role": "trader"},
        headers={"X-Install-Id": uuid.uuid4().hex},
    )
    assert r.status_code == 200, r.text
    return name, email, r.json()


def _token_from(mail):
    m = re.search(r"#token=([A-Za-z0-9_\-]+)", mail["text"])
    assert m, mail["text"]
    return m.group(1)


def test_unavailable_without_smtp(monkeypatch):
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.delenv(k, raising=False)
    with TestClient(main.app) as c:
        assert c.get("/api/auth/email-status").json() == {"email": False}
        assert c.post("/api/auth/forgot", json={"email": "x@example.com"}).status_code == 503
        name, email, reg = _register(c)
        assert reg["email_delivery"] == "unavailable"
        assert "verification_code" not in reg
        h = {"Authorization": "Bearer " + reg["token"]}
        assert c.post("/api/auth/resend-verification", headers=h).status_code == 503


def test_register_sends_verification_code(outbox):
    with TestClient(main.app) as c:
        name, email, reg = _register(c)
        assert reg["email_delivery"] == "sent"
        mails = [m for m in outbox if m["to"] == email]
        assert len(mails) == 1
        code = re.search(r"(\d{6})", mails[0]["subject"]).group(1)
        h = {"Authorization": "Bearer " + reg["token"]}
        assert c.post("/api/auth/verify-email", json={"code": code}, headers=h).status_code == 200


def test_full_reset_flow(outbox):
    with TestClient(main.app) as c:
        name, email, reg = _register(c)
        old_token = reg["token"]
        assert c.post("/api/auth/forgot", json={"email": email.upper()}).json() == {"ok": True}
        mail = [m for m in outbox if "كلمة المرور" in m["subject"]][-1]
        assert mail["to"] == email
        assert "https://matrix.test/legal/reset-password.html#token=" in mail["text"]
        token = _token_from(mail)

        assert c.post("/api/auth/reset", json={"token": token, "new_password": "short"}).status_code == 400
        r = c.post("/api/auth/reset", json={"token": token, "new_password": "newpass123"})
        assert r.status_code == 200, r.text
        # every session signed out
        assert c.get("/api/auth/me", headers={"Authorization": "Bearer " + old_token}).status_code == 401
        # old password no longer works, new one does
        assert c.post("/api/auth/login", json={"username": name, "password": "oldpass123"}).status_code == 401
        assert c.post("/api/auth/login", json={"username": name, "password": "newpass123"}).status_code == 200
        # link is single-use
        assert c.post("/api/auth/reset", json={"token": token, "new_password": "another123"}).status_code == 400


def test_unknown_email_same_answer_and_no_mail(outbox):
    with TestClient(main.app) as c:
        before = len(outbox)
        r = c.post("/api/auth/forgot", json={"email": f"nobody-{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200 and r.json() == {"ok": True}
        assert len(outbox) == before


def test_cooldown_and_expiry(outbox, monkeypatch):
    with TestClient(main.app) as c:
        name, email, reg = _register(c)
        c.post("/api/auth/forgot", json={"email": email})
        c.post("/api/auth/forgot", json={"email": email})  # within cooldown: no second mail
        mails = [m for m in outbox if m["to"] == email and "كلمة المرور" in m["subject"]]
        assert len(mails) == 1
        token = _token_from(mails[0])
        real = time.time
        monkeypatch.setattr(db.time, "time", lambda: real() + db.PASSWORD_RESET_TTL + 5)
        assert c.post("/api/auth/reset", json={"token": token, "new_password": "newpass123"}).status_code == 400


def test_ip_rate_limit(outbox):
    with TestClient(main.app) as c:
        codes = [c.post("/api/auth/forgot", json={"email": f"z{i}@example.com"}).status_code for i in range(7)]
        assert codes[:5] == [200] * 5 and 429 in codes[5:]


def test_deleted_account_link_stops_working(outbox):
    with TestClient(main.app) as c:
        name, email, reg = _register(c)
        c.post("/api/auth/forgot", json={"email": email})
        token = _token_from([m for m in outbox if m["to"] == email and "كلمة المرور" in m["subject"]][-1])
        h = {"Authorization": "Bearer " + reg["token"]}
        assert c.delete("/api/auth/account", headers=h).status_code == 200
        assert c.post("/api/auth/reset", json={"token": token, "new_password": "newpass123"}).status_code == 400
