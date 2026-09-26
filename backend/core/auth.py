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

from fastapi import Depends, Header, HTTPException

import db


def _auth_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return db.user_from_token(token)


# معرّف تثبيت عشوائي يولّده التطبيق مرة واحدة ويحفظه (`matrix.install.v1`). ليس هوية بل «مالك» صفوف
# المجهول (تنبيهات/يومية/توكن Push) حتى لا تكون كل صفوف غير المسجّلين دلواً واحداً يراه الجميع.
_INSTALL_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


# (توكن الجلسة، معرّف التثبيت) نُقلت صفوفه مرة — لا كتابة بكل طلب. بالتوكن لا بالحساب: دخول جديد
# (توكن جديد) بعد صفوف كُتبت مجهولةً بجلسة منتهية يَنقلها من جديد.
_CLAIMED: set[tuple[str, str]] = set()


def _install_key(
    x_install_id: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
    user: dict | None = Depends(_auth_user),
) -> str | None:
    """قيمة `X-Install-Id` إن كانت بالشكل المتوقع، وإلا None (عميل قديم ← سلوك الصفوف القديمة).

    مسجّل + معرّف تثبيت ⇒ صفوف الجهاز المجهولة تُنقل لحسابه (`db.claim_device_rows`)."""
    if not x_install_id:
        return None
    v = x_install_id.strip()
    if not _INSTALL_ID_RE.fullmatch(v):
        return None
    if user and authorization:
        memo = (authorization, v)
        if memo not in _CLAIMED:
            db.claim_device_rows(int(user["user_id"]), v)
            if len(_CLAIMED) > 10000:
                _CLAIMED.clear()
            _CLAIMED.add(memo)
    return v


def _owner_key(
    authorization: str | None = Header(default=None),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
) -> str | None:
    """`_install_key` لمسارات البيانات الشخصية (دفتر/تنبيهات/قائمة/تخطيطات): توكن مُرسَل غير صالح ⇒ 401.

    كان يُعامَل مجهولاً ⇒ الدفتر يُقرأ فارغاً بـ200 (إحصاءات 0 صفقة)، وصفقة تُحفظ للجهاز وردّها يحمل
    إحصاءات تلك الصفقة الوحيدة (نسبة فوز 0%) بدل إحصاءات الحساب — أرقام خاطئة بلا أي إشارة إلى أن
    الجلسة انتهت. التطبيق يعالج 401 منذ ui `aacb194`. `logout` يبقى على `_install_key` (يفكّ Push بالمنتهي)."""
    if authorization and not user:
        raise HTTPException(status_code=401, detail="login_required")
    return key
