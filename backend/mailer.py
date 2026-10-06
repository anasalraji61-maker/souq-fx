"""Outgoing e-mail (verification codes, password reset links) over plain SMTP.

Configuration (environment, e.g. /opt/matrix/shared/.env):
    SMTP_HOST       smtp server, e.g. smtp.gmail.com or smtp-relay.brevo.com
    SMTP_PORT       587 (STARTTLS, default) or 465 (SSL)
    SMTP_USER       login
    SMTP_PASSWORD   password / app password
    SMTP_FROM       sender address shown to users (defaults to SMTP_USER)
    SMTP_FROM_NAME  sender name (default "MATRIX")
    PUBLIC_BASE_URL public address of the site, used in links (e.g. https://matrix.example);
                    falls back to the address the request came in on.

When SMTP is not configured `configured()` is False and nothing is sent; callers must tell the user
honestly that e-mail is unavailable instead of pretending a message was sent.
"""
from __future__ import annotations

import html
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

log = logging.getLogger("matrix.mailer")

# Messages actually handed to SMTP (or captured in tests). Kept small; tests read it.
SENT_LOG: list[dict] = []
_SENT_LOG_MAX = 50


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def configured() -> bool:
    return bool(_env("SMTP_HOST") and _env("SMTP_USER") and _env("SMTP_PASSWORD"))


def public_base_url(fallback: str = "") -> str:
    base = _env("PUBLIC_BASE_URL") or fallback
    return base.rstrip("/")


def _wrap_html(title: str, body_html: str) -> str:
    return f"""<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{html.escape(title)}</title></head>
<body style="margin:0;background:#050b14;font-family:Tahoma,Arial,sans-serif;color:#e8eef9">
<div style="max-width:520px;margin:0 auto;padding:28px 18px">
  <div style="font-weight:800;font-size:20px;letter-spacing:.5px;margin-bottom:18px">
    <span style="display:inline-block;background:#2dd4bf;color:#042f2e;border-radius:8px;padding:2px 9px;margin-left:6px">M</span>MATRIX
  </div>
  <div style="background:#0b1220;border:1px solid #1e283d;border-radius:14px;padding:22px;line-height:1.8;font-size:15px">
    {body_html}
  </div>
  <p style="color:#64748b;font-size:12px;line-height:1.7;margin-top:16px">
    MATRIX منصة تحليل فني تعليمية، وليست نصيحة استثمارية. إذا لم تطلب هذه الرسالة فتجاهلها، فلن يتغيّر شيء في حسابك.<br>
    MATRIX is an educational technical-analysis platform. If you did not request this e-mail, ignore it.
  </p>
</div></body></html>"""


def send(to: str, subject: str, text: str, html_body: str | None = None) -> bool:
    """Send one e-mail. Returns True on success. Never raises (logs instead)."""
    to = (to or "").strip()
    if not to or "@" not in to:
        return False
    if not configured():
        log.warning("mailer: SMTP not configured, not sending %r", subject)
        return False

    host = _env("SMTP_HOST")
    port = int(_env("SMTP_PORT", "587") or 587)
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")
    sender = _env("SMTP_FROM") or user
    sender_name = _env("SMTP_FROM_NAME", "MATRIX")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name, sender))
    msg["To"] = to
    msg["Message-ID"] = make_msgid(domain=sender.split("@")[-1] if "@" in sender else None)
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context()) as s:
                s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=20) as s:
                s.ehlo()
                if _env("SMTP_STARTTLS", "1") != "0":
                    s.starttls(context=ssl.create_default_context())
                    s.ehlo()
                s.login(user, password)
                s.send_message(msg)
    except Exception as exc:  # network, auth, TLS — the request that queued it must not fail
        log.error("mailer: sending %r to %s failed: %s", subject, to, exc)
        return False

    SENT_LOG.append({"to": to, "subject": subject, "text": text})
    del SENT_LOG[:-_SENT_LOG_MAX]
    return True


# ---------------------------------------------------------------------------------------------
# Templates


def send_verification_code(to: str, username: str, code: str) -> bool:
    subject = f"رمز تأكيد بريدك في MATRIX: {code}"
    text = (
        f"مرحباً {username}،\n\n"
        f"رمز تأكيد بريدك الإلكتروني في MATRIX هو: {code}\n"
        "اكتبه في صفحة حسابي داخل التطبيق. الرمز للاستخدام مرة واحدة.\n\n"
        f"Hello {username}, your MATRIX e-mail verification code is: {code}\n"
    )
    body = (
        f"<p>مرحباً <strong>{html.escape(username)}</strong>،</p>"
        "<p>رمز تأكيد بريدك الإلكتروني في MATRIX:</p>"
        f'<p style="font-size:30px;font-weight:900;letter-spacing:6px;color:#2dd4bf;margin:10px 0" dir="ltr">{html.escape(code)}</p>'
        "<p>اكتبه في صفحة <strong>حسابي</strong> داخل التطبيق.</p>"
        f'<p style="color:#94a3b8;font-size:13px" dir="ltr">Your MATRIX verification code: <strong>{html.escape(code)}</strong></p>'
    )
    return send(to, subject, text, _wrap_html(subject, body))


def send_password_reset(to: str, username: str, link: str, minutes: int) -> bool:
    subject = "إعادة تعيين كلمة المرور — MATRIX"
    text = (
        f"مرحباً {username}،\n\n"
        "وصلنا طلب لإعادة تعيين كلمة مرور حسابك في MATRIX. افتح الرابط التالي لاختيار كلمة مرور جديدة:\n"
        f"{link}\n\n"
        f"الرابط صالح لمدة {minutes} دقيقة ولمرة واحدة. إذا لم تطلب ذلك فتجاهل الرسالة.\n\n"
        f"Hello {username}, open this link to choose a new MATRIX password (valid {minutes} minutes, one use):\n{link}\n"
    )
    safe_link = html.escape(link, quote=True)
    body = (
        f"<p>مرحباً <strong>{html.escape(username)}</strong>،</p>"
        "<p>وصلنا طلب لإعادة تعيين كلمة مرور حسابك في MATRIX.</p>"
        f'<p style="margin:18px 0"><a href="{safe_link}" style="background:#2dd4bf;color:#042f2e;text-decoration:none;'
        'font-weight:800;padding:11px 20px;border-radius:10px;display:inline-block">اختيار كلمة مرور جديدة</a></p>'
        f"<p style=\"color:#94a3b8;font-size:13px\">الرابط صالح لمدة {minutes} دقيقة ولمرة واحدة.</p>"
        f'<p style="color:#64748b;font-size:12px;word-break:break-all" dir="ltr">{safe_link}</p>'
    )
    return send(to, subject, text, _wrap_html(subject, body))
