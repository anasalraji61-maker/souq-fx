"""طبقة تنسيق المصادقة (auth) — أول خطوة هجرة آمنة من خطة إعادة الهيكلة إلى وحدات
مستقلة (راجع docs/ARCHITECTURE.md، قسم "خطة الهجرة الفورية الآمنة"، بند 1).

تحتوي فقط على `_auth_user` حالياً — تابع الاستخراج نُقل حرفياً من main.py بلا أي
تغيير بمنطقه. main.py يستوردها من هنا بدل تعريفها محلياً، وكل نقاط `Depends(_auth_user)`
الموجودة بمسارات API تستمر بالعمل بلا أي تغيير بالمسار أو السلوك — نقل ميكانيكي بحت.

نقاط الجلسة الفعلية (`create_session`/`user_from_token`) تبقى بـdb.py عمداً (طبقة
مستودع البيانات repositories، لا طبقة تنسيق core) — هذا الملف يعتمد عليها فقط.
"""
from __future__ import annotations

import re

from fastapi import Header

import db


def _auth_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return db.user_from_token(token)


# معرّف تثبيت عشوائي يولّده التطبيق مرة واحدة ويحفظه (`matrix.install.v1`). ليس هوية بل «مالك» صفوف
# المجهول (تنبيهات/يومية/توكن Push) حتى لا تكون كل صفوف غير المسجّلين دلواً واحداً يراه الجميع.
_INSTALL_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def _install_key(x_install_id: str | None = Header(default=None)) -> str | None:
    """قيمة `X-Install-Id` إن كانت بالشكل المتوقع، وإلا None (عميل قديم ← سلوك الصفوف القديمة)."""
    if not x_install_id:
        return None
    v = x_install_id.strip()
    return v if _INSTALL_ID_RE.fullmatch(v) else None
