"""طبقة تنسيق المصادقة (auth) — أول خطوة هجرة آمنة من خطة إعادة الهيكلة إلى وحدات
مستقلة (راجع docs/ARCHITECTURE.md، قسم "خطة الهجرة الفورية الآمنة"، بند 1).

تحتوي فقط على `_auth_user` حالياً — تابع الاستخراج نُقل حرفياً من main.py بلا أي
تغيير بمنطقه. main.py يستوردها من هنا بدل تعريفها محلياً، وكل نقاط `Depends(_auth_user)`
الموجودة بمسارات API تستمر بالعمل بلا أي تغيير بالمسار أو السلوك — نقل ميكانيكي بحت.

نقاط الجلسة الفعلية (`create_session`/`user_from_token`) تبقى بـdb.py عمداً (طبقة
مستودع البيانات repositories، لا طبقة تنسيق core) — هذا الملف يعتمد عليها فقط.
"""
from __future__ import annotations

from fastapi import Header

import db


def _auth_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return db.user_from_token(token)
