"""SQLite persistence for MATRIX (alerts, chat, votes, users, layouts, progress)."""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import re
import secrets
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timezone
from typing import Any

from core.db_conn import DB_PATH, _conn


def get_db():
    """الحصول على اتصال بقاعدة البيانات (متوافق مع مواصفات المهام والمعماري)."""
    return _conn()



def _username_key(username: str) -> str:
    """مفتاح التفرّد: NFKC + casefold. `COLLATE NOCASE` بـSQLite يطوي a–z فقط ⇒ «Şêrko» و«şêrko»
    و«Émile» و«émile» (وكل سيريلي/يوناني) كانا حسابين يُعرضان متطابقين — انتحال (البند 9)."""
    return unicodedata.normalize("NFKC", username or "").casefold()


# حروف تُرى كحروف لاتينية/عربية أخرى ولا يطويها NFKC ولا casefold: «аlice» (а سيريلية) و«Αlice» (Α يونانية)
# و«alıce» (ı بلا نقطة) و«علی» (ی فارسية) و«عـلي» (تطويل) و«ali  ce» كانت حسابات مستقلّة تُعرض كالأصل —
# انتحال (البند 9). الطيّ بالمظهر لا باللفظ؛ الحرف الكبير مقدَّم (Η ⇒ h، Ν ⇒ n) لأن casefold يُسقطه، والطيّ
# الزائد لا يضرّ إلا برفض اسم شبيه. للفحص وحده (`username_skel`): الدخول والاسم المعروض لا يتغيّران.
_SKELETON = str.maketrans({
    # سيريلي
    "а": "a", "в": "b", "е": "e", "ё": "ë", "і": "i", "ї": "ï", "ј": "j", "к": "k", "м": "m", "н": "h",
    "о": "o", "р": "p", "с": "c", "т": "t", "у": "y", "х": "x", "ѕ": "s", "ԁ": "d", "ԛ": "q", "ԝ": "w",
    "ү": "y", "һ": "h", "ӏ": "l", "ь": "b",
    # يوناني
    "α": "a", "β": "b", "ε": "e", "ζ": "z", "η": "h", "ι": "i", "κ": "k", "μ": "m", "ν": "n", "ο": "o",
    "ρ": "p", "τ": "t", "υ": "y", "χ": "x",
    # لاتيني ممتدّ
    "ı": "i", "ȷ": "j", "ɑ": "a", "ɡ": "g",
    # عربي/فارسي/كردي: ي/ی/ى، ك/ک/ڪ، التطويل، الأرقام الهندية
    "ی": "ي", "ى": "ي", "ک": "ك", "ڪ": "ك", "\u0640": None,
    **{chr(0x0660 + d): str(d) for d in range(10)}, **{chr(0x06F0 + d): str(d) for d in range(10)},
})
_SPACES = re.compile(r"\s+")


def _username_skeleton(username: str) -> str:
    # علامات التركيب (Mn/Me) لا تغيّر مظهر الاسم بما يكفي: «ali̇ce» (نقطة فوق i) كان حساباً مستقلاً يُعرض
    # كـ«alice». تُسقط بعد NFD (فتتصادم «josé»/«jose» والاسم المشكول وغيره — طيّ زائد مقبول كما أعلاه).
    # العلامات تُسقط **قبل** جدول الشبيه: «άlice» (ά يونانية مشدّدة، ليست بالجدول) كانت تصير «αlice» بعد
    # الإسقاط فلا تُطوى إلى «alice» — حساب مستقلّ يُعرض كالأصل. كذلك «bόβ» و«йak».
    folded = unicodedata.normalize("NFD", _username_key(username))
    folded = "".join(ch for ch in folded if unicodedata.category(ch) not in ("Mn", "Me"))
    return _SPACES.sub(" ", unicodedata.normalize("NFC", folded.translate(_SKELETON)))


# نسخة قاعدة الهيكل: تُرفع حين تتغيّر `_username_skeleton` فيُعاد حساب العمود لكل الصفوف مرة واحدة.
_SKEL_VERSION = 3


def _fill_username_skel(c: sqlite3.Connection) -> None:
    for r in c.execute("SELECT id, username FROM users WHERE username_skel IS NULL").fetchall():
        c.execute("UPDATE users SET username_skel=? WHERE id=?", (_username_skeleton(r[1]), r[0]))


def _migrate_username_nocase(c: sqlite3.Connection) -> None:
    """«Ali» و«ali» كانا حسابين (`UNIQUE` حسّاس لحالة الأحرف) ⇒ انتحال اسم متداول معروف بحرف
    كبير، والحظر المحلي بالتطبيق يطبّع الاسم فيُخفي البريء مع المنتحل. عمود `username_key`
    (`_username_key`) بفهرس فريد يمنع ذلك بالقاعدة نفسها لكل الأبجديات. قاعدة قائمة فيها تصادم فعلاً
    لا يُنشأ عليها الفهرس (لا دمج حسابات آلياً) ويبقى الفحص بـ`_username_taken` عند التسجيل مانعاً
    لكل تصادم جديد."""
    cols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
    if "username_key" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN username_key TEXT")
    for r in c.execute("SELECT id, username FROM users WHERE username_key IS NULL").fetchall():
        c.execute("UPDATE users SET username_key=? WHERE id=?", (_username_key(r[1]), r[0]))
    if not c.execute(
        "SELECT 1 FROM users GROUP BY username COLLATE NOCASE HAVING COUNT(*) > 1 LIMIT 1"
    ).fetchone():
        # يبقى لإدراج خام لا يملأ `username_key` (ASCII وحده)
        c.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)"
        )
    if not c.execute(
        "SELECT 1 FROM users GROUP BY username_key HAVING COUNT(*) > 1 LIMIT 1"
    ).fetchone():
        c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_key ON users(username_key)")
    if "username_skel" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN username_skel TEXT")
    if c.execute("PRAGMA user_version").fetchone()[0] < _SKEL_VERSION:
        c.execute("UPDATE users SET username_skel=NULL")
        c.execute(f"PRAGMA user_version={_SKEL_VERSION}")
    _fill_username_skel(c)
    # غير فريد: قاعدة قائمة قد تحوي شبيهين فعلاً (لا دمج آلياً) — التسجيل الجديد يُمنع بـ`_username_taken`
    c.execute("CREATE INDEX IF NOT EXISTS idx_users_username_skel ON users(username_skel)")


def _username_taken(c: sqlite3.Connection, username: str, exclude_id: int | None = None) -> bool:
    _fill_username_skel(c)  # صفوف أُدرجت بعد آخر ملء (الإدراجات لا تكتبه)
    return c.execute(
        # الشطر الثاني لصفّ أُدرج خاماً بلا مفتاح؛ الثالث للشبيه بالمظهر (`_username_skeleton`)
        "SELECT 1 FROM users WHERE (username_key=? OR username=? COLLATE NOCASE OR username_skel=?) AND id<>?",
        (_username_key(username), username, _username_skeleton(username), exclude_id or -1),
    ).fetchone() is not None


# اسم الحساب المحذوف (`delete_user_account`) ومؤلّف الرسائل القديمة المجهول (`_LEGACY_CHAT_USER`):
# كان كلاهما قابلاً للتسجيل ⇒ من يسجّل «deleted_user_7» مسبقاً (المعرّفات تسلسلية) يجعل حذف الحساب 7
# يفشل بتصادم الاسم فيبقى بريده ودفتره وجلسته (شرط أبل 5.1.1(v))؛ ومن يسجّل «أنت» تُعرض رسائله بلا اسم.
_RESERVED_USERNAME = re.compile(r"^deleted_user_", re.IGNORECASE)
_RESERVED_USERNAMES = frozenset({"أنت"})


# علامات الاتجاه (LRM/RLM/ALM) تأتي مع نسخ اسم عربي ولصقه ولا تُرى: تُقطع من الطرفين كالفراغ لا تُرفض (launch142b).
_EDGE_JUNK = re.compile(r"^[\s\u200e\u200f\u061c]+|[\s\u200e\u200f\u061c]+$")
_ZWNJ = "\u200c"


def _clean_username(username: str) -> str:
    return _EDGE_JUNK.sub("", username or "")


def _arabic_letter(ch: str) -> bool:
    return ("\u0600" <= ch <= "\u06ff" or "\u0750" <= ch <= "\u077f") and unicodedata.category(ch).startswith("L")


def _zwnj_ok(username: str, i: int) -> bool:
    """ZWNJ يُكتب بأسماء كردية/فارسية بين حرفين عربيين (يقطع الوصل فيُرى أثره)؛ خارج ذلك محرف مخفيّ."""
    return 0 < i < len(username) - 1 and _arabic_letter(username[i - 1]) and _arabic_letter(username[i + 1])


LINK_RE = re.compile(
    r"(https?://|www\.|\bt\.me/|\bwa\.me/|\btelegram\.me/|\bchat\.whatsapp\.com/|"
    # + نطاقات المختصِرات وقنوات «توصيات VIP» الشائعة (bit.ly، ‎.ru، ‎.vip…) — كانت تمرّ
    r"\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|link|site|online|top|info|biz|co|app|"
    r"ly|ru|vip|cc|tk|club|pro|gg|ws|su|shop|store|live|icu)\b)",
    re.IGNORECASE,
)


# محارف لا تُرى وليست من الفئتين C/Z (فيفوتها الفحص أدناه): مُحدِّدات التنويع، رابط الحروف المركّبة، حرف
# الخمير الصامت، حشوات الهانغول، فراغ برايل. «alice\ufe0f» و«alice\u2800» كانا يُقبلان بجانب «alice».
_INVISIBLE_NON_CZ = re.compile(
    "[\u034f\u115f\u1160\u17b4\u17b5\u180b-\u180f\u2800\u3164\ufe00-\ufe0f\uffa0\U000e0100-\U000e01ef]"
)


def _check_username(username: str) -> None:
    """ValueError لاسم محجوز أو يحمل محارف لا تُرى/تُطبَّع: «alice\u200b» (عرض صفري) و«ａｌｉｃｅ» (عرض
    كامل) كانا يُقبلان بجانب «alice» ويُعرضان مثله — انتحال لا يمنعه فهرس `NOCASE` (backend-r47)."""
    if _RESERVED_USERNAME.match(username) or username in _RESERVED_USERNAMES:
        raise ValueError("username reserved")
    # الاسم يظهر مؤلّفاً على كل رسالة وفكرة: «t.me/forexvip» كان يتخطّى فلتر الروابط بالنصّ. و«@» يجعل
    # الدخول بالاسم يُعامَل كبريد (`login_user`) فلا يُدخَل أبداً، ويشبه بريد شخص آخر.
    if "@" in username or "/" in username or LINK_RE.search(username):
        raise ValueError("username has a link or @")
    if unicodedata.normalize("NFKC", username) != username or any(
        unicodedata.category(ch)[0] in "CZ" and ch != " " and not (ch == _ZWNJ and _zwnj_ok(username, i))
        for i, ch in enumerate(username)
    ) or _INVISIBLE_NON_CZ.search(username):
        raise ValueError("username has invisible or look-alike characters")


def init_db() -> None:
    with _conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at REAL NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                symbol TEXT NOT NULL,
                condition TEXT NOT NULL,
                price REAL NOT NULL,
                note TEXT,
                active INTEGER DEFAULT 1,
                triggered INTEGER DEFAULT 0,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS group_messages (
                id TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                text TEXT NOT NULL,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dm_messages (
                id TEXT PRIMARY KEY,
                peer TEXT NOT NULL,
                user_name TEXT NOT NULL,
                text TEXT NOT NULL,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS votes (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                direction TEXT NOT NULL,
                entry REAL, sl REAL, tp REAL,
                note TEXT,
                agree INTEGER DEFAULT 0,
                disagree INTEGER DEFAULT 0,
                author TEXT,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS vote_ballots (
                vote_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                choice TEXT NOT NULL,
                PRIMARY KEY(vote_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS push_tokens (
                token TEXT PRIMARY KEY,
                user_id INTEGER,
                platform TEXT,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS layouts (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                name TEXT NOT NULL,
                payload TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS watchlist (
                user_id INTEGER,
                symbol TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, symbol)
            );
            CREATE TABLE IF NOT EXISTS academy_progress (
                user_id INTEGER NOT NULL,
                school_id TEXT NOT NULL,
                lecture_id TEXT NOT NULL,
                segment_index INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                updated_at REAL NOT NULL,
                PRIMARY KEY(user_id, school_id, lecture_id)
            );
            CREATE TABLE IF NOT EXISTS indicator_alerts (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                symbol TEXT NOT NULL,
                timeframe TEXT NOT NULL DEFAULT '15m',
                alert_type TEXT NOT NULL,
                condition TEXT NOT NULL,
                value REAL,
                fast_period INTEGER DEFAULT 9,
                slow_period INTEGER DEFAULT 21,
                note TEXT,
                active INTEGER DEFAULT 1,
                triggered INTEGER DEFAULT 0,
                ts TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                entry REAL NOT NULL,
                exit REAL,
                size REAL DEFAULT 1,
                pnl REAL,
                note TEXT,
                opened_at TEXT NOT NULL,
                closed_at TEXT,
                status TEXT NOT NULL DEFAULT 'open'
            );
            CREATE TABLE IF NOT EXISTS network_members (
                user_id INTEGER PRIMARY KEY,
                role TEXT NOT NULL DEFAULT 'trader',
                sponsor_id INTEGER,
                side TEXT,
                referral_code TEXT UNIQUE NOT NULL,
                left_count INTEGER NOT NULL DEFAULT 0,
                right_count INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(sponsor_id) REFERENCES users(id)
            );
            """
        )
        _purge_demo_seed(c)
        _migrate_indicator_alerts(c)
        _migrate_trades(c)
        _migrate_orders(c)
        _migrate_positions(c)
        _migrate_cache(c)
        _migrate_network(c)
        _migrate_commission_ledger(c)
        _migrate_user_email(c)
        _migrate_username_nocase(c)
        _migrate_push_lang(c)
        _migrate_group_user(c)
        _migrate_vote_user(c)
        _migrate_created_at(c)
        _migrate_content_reports(c)
        _migrate_owner_key(c)


def _migrate_owner_key(c: sqlite3.Connection) -> None:
    """معرّف تثبيت الجهاز (`X-Install-Id`) مالكاً لصفوف المجهول — تنبيهات السعر/المؤشر واليومية وتوكن الـPush.
    كانت كل صفوف المجهولين دلواً واحداً (`user_id IS NULL`): أي متداول غير مسجّل يرى تنبيهات ويوميات
    كل المجهولين ويعدّلها ويحذفها، وفحص `/api/alerts/check` من جهاز B يُطلق تنبيه A فيصل الإشعار لكل
    الأجهزة المجهولة. الصفوف القديمة بلا مفتاح تبقى لعملاء قدامى لا يرسلون الترويسة (راجع `_owner_clause`).
    `layouts`/`watchlist` بنفس القاعدة: كان أي مجهول (وأي مسجّل!) يقرأ تخطيطات كل المجهولين، ومجهول يكتب فوق
    تخطيط مجهول آخر بإرسال معرّفه، وقائمة الرموز المخصّصة للمجهول مشتركة بين كل الأجهزة."""
    for table in ("alerts", "indicator_alerts", "trades", "push_tokens", "layouts", "watchlist"):
        cols = {r[1] for r in c.execute(f"PRAGMA table_info({table})").fetchall()}
        if "owner_key" not in cols:
            c.execute(f"ALTER TABLE {table} ADD COLUMN owner_key TEXT")


def _owner_clause(user_id: int | None, owner_key: str | None = None) -> tuple[str, tuple]:
    """شرط الملكية الموحّد لصفوف التنبيهات/المؤشرات/اليومية.

    - مسجّل: صفوفه + صفوف المجهول التي أنشأها هذا الجهاز قبل الدخول (نفس `owner_key`).
    - مجهول بمعرّف تثبيت: صفوف جهازه فقط.
    - بلا ترويسة (عميل قديم): الصفوف القديمة بلا مفتاح فقط — لا يرى صفوف العملاء الجدد أبداً.
    - **مسجّل بلا ترويسة: صفوف حسابه وحدها.** كان يرى معها دلو المجهولين القديم (`owner_key IS NULL`)
      — صفوف **كل** متداول مجهول قبل معرّف التثبيت، لا صفوف جهازه — فيعدّلها ويغلقها ويحذفها،
      و`trade_stats` تخلط صفقات الغرباء بنسبة فوز حسابه.
    """
    if user_id:
        if owner_key:
            return "(user_id=? OR (user_id IS NULL AND owner_key=?))", (user_id, owner_key)
        return "user_id=?", (user_id,)
    if owner_key:
        return "(user_id IS NULL AND owner_key=?)", (owner_key,)
    return "(user_id IS NULL AND owner_key IS NULL)", ()


def claim_device_rows(user_id: int, owner_key: str) -> int:
    """صفوف هذا الجهاز المجهولة (قبل الدخول) تصير ملك الحساب فعلاً.

    كان «التبنّي» توسيع قراءة فقط (`_owner_clause`: `user_id IS NULL AND owner_key=K`) والصفوف تبقى
    بلا مالك ⇒ (1) حذف الحساب (`WHERE user_id=?`) يُبقي صفقاته وتنبيهاته قبل التسجيل، (2) حساب آخر
    يدخل على الهاتف نفسه يراها ويعدّلها وتدخل في نسبة فوزه، (3) صاحبها لا يراها على هاتفه الثاني.
    قائمة المتابعة: رمز موجود بالحساب **يُحذف** صفّه المجهول المكرَّر. كان يبقى (المفتاح `(user_id, symbol)`
    ⇒ `UPDATE OR IGNORE` يتخطّاه) فحذف الرمز من هاتف آخر يمسّ صفّ الحساب وحده ⇒ الرمز يعود على هذا
    الهاتف، ثم يبقى بقائمة المجهول/الحساب التالي عليه بعد الخروج.
    تحت قفل كتابة ومع جلسة حيّة (`_lock_owner`): حذف الحساب بين المصادقة والنقل كان ينقل يومية الجهاز
    إلى `user_id` محذوف ⇒ تختفي من الجهاز ولا يمحوها أحد. الحساب ذهب ⇒ لا نقل (0).
    """
    n = 0
    with _conn() as c:
        try:
            _lock_owner(c, user_id)
        except PermissionError:
            return 0
        c.execute(
            """DELETE FROM watchlist WHERE user_id IS NULL AND owner_key=?
               AND symbol IN (SELECT symbol FROM watchlist WHERE user_id=?)""",
            (owner_key, user_id),
        )
        for table in ("alerts", "indicator_alerts", "trades", "layouts", "watchlist"):
            n += c.execute(
                f"UPDATE OR IGNORE {table} SET user_id=? WHERE user_id IS NULL AND owner_key=?",
                (user_id, owner_key),
            ).rowcount
    return n


def _migrate_content_reports(c: sqlite3.Connection) -> None:
    """بلاغات المحتوى الذي ينشئه المستخدمون (محادثة المجموعة + أفكار الصفقات) — شرط أبل 1.2
    وسياسة Google Play للمحتوى الاجتماعي: آلية إبلاغ + إخفاء المحتوى المسيء. بلاغ واحد لكل حساب
    لكل عنصر (المفتاح الأساسي) فلا يقدر حساب واحد يُخفي محتوى غيره وحده."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS content_reports (
            kind TEXT NOT NULL,
            target_id TEXT NOT NULL,
            reporter_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at REAL NOT NULL,
            PRIMARY KEY(kind, target_id, reporter_id)
        )"""
    )


def _migrate_group_user(c: sqlite3.Connection) -> None:
    """مالك رسالة المجموعة — لتمييز «رسائلي» ولمحوها عند حذف الحساب (كان الاسم نصاً حرّاً فقط)."""
    cols = {r[1] for r in c.execute("PRAGMA table_info(group_messages)").fetchall()}
    if "user_id" not in cols:
        c.execute("ALTER TABLE group_messages ADD COLUMN user_id INTEGER")


def _migrate_created_at(c: sqlite3.Connection) -> None:
    """`created_at` = ثوانٍ UTC للحظة النشر (رسائل المجموعة وأفكار التصويت). `ts` نصّ «HH:MM» بساعة
    الخادم المحلية (برلين) بلا تاريخ ولا منطقة: متداول ببغداد يراه متأخّراً ساعة (ساعتين شتاءً)، ورسالة
    الأمس 22:00 تبدو من اليوم، وفكرة صفقة «09:10» لا تُربط بسعر لحظتها. الصفوف القديمة `created_at`
    NULL (لا تاريخ معروف لها — لا يُخترع)."""
    for table in ("group_messages", "votes"):
        cols = {r[1] for r in c.execute(f"PRAGMA table_info({table})").fetchall()}
        if "created_at" not in cols:
            c.execute(f"ALTER TABLE {table} ADD COLUMN created_at REAL")


def _migrate_vote_user(c: sqlite3.Connection) -> None:
    """ناشر فكرة التصويت — لـ`mine` (ui2: الواجهة تستثني فكرة المتداول نفسه من فلتر الحظر؛ `my_choice`
    صوتُه لا ملكيّته). كان الاسم نصاً فقط. الصفوف القديمة تُملأ من اسم الناشر (الأسماء فريدة بلا حالة
    أحرف)، ولا يُملأ المؤلّف القديم الثابت «أنت» ولا المجهول."""
    cols = {r[1] for r in c.execute("PRAGMA table_info(votes)").fetchall()}
    if "user_id" not in cols:
        c.execute("ALTER TABLE votes ADD COLUMN user_id INTEGER")
        c.execute(
            """UPDATE votes SET user_id=(SELECT u.id FROM users u
                   WHERE u.username = votes.author COLLATE NOCASE LIMIT 1)
               WHERE user_id IS NULL AND author IS NOT NULL AND author != ?""",
            (_LEGACY_VOTE_AUTHOR,),
        )


def _migrate_push_lang(c: sqlite3.Connection) -> None:
    """لغة واجهة الجهاز مع توكن الـPush — نص الإشعار بلغة المتداول (كان إنجليزياً خاماً للجميع)."""
    cols = {r[1] for r in c.execute("PRAGMA table_info(push_tokens)").fetchall()}
    if "lang" not in cols:
        c.execute("ALTER TABLE push_tokens ADD COLUMN lang TEXT")


def _migrate_user_email(c: sqlite3.Connection) -> None:
    cols = {r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()}
    if "email" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
    if "email_verified" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0")
    if "verification_code" not in cols:
        c.execute("ALTER TABLE users ADD COLUMN verification_code TEXT")
    c.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email != ''"
    )


def _migrate_network(c: sqlite3.Connection) -> None:
    c.execute(
        """CREATE TABLE IF NOT EXISTS network_members (
            user_id INTEGER PRIMARY KEY,
            role TEXT NOT NULL DEFAULT 'trader',
            sponsor_id INTEGER,
            side TEXT,
            referral_code TEXT UNIQUE NOT NULL,
            left_count INTEGER NOT NULL DEFAULT 0,
            right_count INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(sponsor_id) REFERENCES users(id)
        )"""
    )


def _migrate_commission_ledger(c: sqlite3.Connection) -> None:
    c.execute(
        """CREATE TABLE IF NOT EXISTS commission_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            earner_id INTEGER NOT NULL,
            source_user_id INTEGER,
            source_username TEXT,
            kind TEXT NOT NULL,
            rate REAL NOT NULL,
            points REAL NOT NULL,
            created_at REAL NOT NULL,
            month_key TEXT NOT NULL,
            FOREIGN KEY(earner_id) REFERENCES users(id)
        )"""
    )


def _migrate_indicator_alerts(c: sqlite3.Connection) -> None:
    c.execute(
        """CREATE TABLE IF NOT EXISTS indicator_alerts (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL DEFAULT '15m',
            alert_type TEXT NOT NULL,
            condition TEXT NOT NULL,
            value REAL,
            fast_period INTEGER DEFAULT 9,
            slow_period INTEGER DEFAULT 21,
            note TEXT,
            active INTEGER DEFAULT 1,
            triggered INTEGER DEFAULT 0,
            ts TEXT NOT NULL
        )"""
    )
    # وقت فتح الشمعة التي أُطلق عليها تقاطع MA/MACD — إعادة التسليح لا تُطلق على الشمعة نفسها ثانيةً
    cols = {r[1] for r in c.execute("PRAGMA table_info(indicator_alerts)").fetchall()}
    if "fired_bar" not in cols:
        c.execute("ALTER TABLE indicator_alerts ADD COLUMN fired_bar INTEGER")


# كانت قاعدة البيانات تُبذَر عند أول تشغيل برسائل مجموعة من «أحمد/سارة/كريم» وفكرتَي صفقة بأصوات
# مختلَقة (EURUSD بيع 18 موافق/5، XAUUSD شراء عند 2348.5) ورسائل خاصة — على خادم الإنتاج يراها أول
# المستخدمين كمجتمع حقيقي وتوصيات بأسعار قديمة (دليل اجتماعي مزيّف؛ خطر مراجعة المتجر). لا بذر بعد
# الآن، وتُحذف الصفوف البذرية القديمة فقط إن طابقت معرّفها **ونصّها** معاً (لا مساس بمحتوى حقيقي).
_DEMO_SEED_GROUP = (
    ("g1", "أحمد", "DXY يكسر 104.2 — راقبوا EURUSD"),
    ("g2", "سارة", "تصويتي شراء GBPUSD على الريتست"),
    ("g3", "كريم", "خبر CPI بعد ساعة — حجم منخفض الآن"),
)
_DEMO_SEED_DM = (
    ("d1", "سارة", "شفت السيولة عند 1.0850؟"),
    ("d2", "أنت", "نعم، أنتظر تأكيد الكسر"),
    ("d3", "كريم", "أرسلتك سيناريو الذهب"),
)
_DEMO_SEED_VOTES = (
    ("v1", "أحمد", "رفض عند المقاومة"),
    ("v2", "سارة", "دعم أسبوعي"),
)


def _purge_demo_seed(c: sqlite3.Connection) -> None:
    for gid, name, text in _DEMO_SEED_GROUP:
        c.execute("DELETE FROM group_messages WHERE id=? AND user_name=? AND text=?", (gid, name, text))
    for did, name, text in _DEMO_SEED_DM:
        c.execute("DELETE FROM dm_messages WHERE id=? AND user_name=? AND text=?", (did, name, text))
    for vid, author, note in _DEMO_SEED_VOTES:
        cur = c.execute("DELETE FROM votes WHERE id=? AND author=? AND note=?", (vid, author, note))
        if cur.rowcount:
            c.execute("DELETE FROM vote_ballots WHERE vote_id=?", (vid,))


_PBKDF2_ALGO = "pbkdf2_sha256"
_PBKDF2_ITERATIONS = 210_000


# قرار أنس ٧ (`docs/DECISIONS-ANAS.md`): ٨ أحرف حدّاً أدنى في التسجيل ووضع الراعي وتغيير كلمة المرور.
# الدخول لا يفحص الطول ⇒ الحسابات القديمة بكلمات ٤–٧ أحرف تبقى تدخل. نصّ الخطأ «password too short» ثابت
# (التطبيق يطابقه حرفياً في `AccountScreen.tsx`).
PASSWORD_MIN = 8


def _hash_password_legacy(password: str, salt: str) -> str:
    """الصيغة القديمة: sha256(salt:password) بجولة واحدة.

    تُستعمل **للتحقّق فقط** من كلمات المرور المخزَّنة قبل الترقية — لا يُكتب بها شيء جديد.
    """
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _hash_password_pbkdf2(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("ascii"), iterations
    ).hex()


def _encode_password(password: str) -> str:
    """تجزئة جديدة بصيغة ‎pbkdf2_sha256$<جولات>$<ملح>$<تجزئة>‎."""
    salt = secrets.token_hex(16)
    ph = _hash_password_pbkdf2(password, salt, _PBKDF2_ITERATIONS)
    return f"{_PBKDF2_ALGO}${_PBKDF2_ITERATIONS}${salt}${ph}"


def _verify_password(password: str, stored: str) -> tuple[bool, bool]:
    """يُعيد ‎(صحيحة؟, تحتاج إعادة تجزئة؟)‎ — بلا أي استثناء لأي مدخَل مشوَّه.

    إعادة التجزئة مطلوبة عند نجاح كلمة مرور مخزَّنة بالصيغة القديمة، أو بجولات أقلّ
    من العدد الحالي — فتُرقّى كسولاً عند أول دخول ناجح بلا مسّ كلمة المرور نفسها.
    """
    stored = str(stored or "")
    if stored.startswith(f"{_PBKDF2_ALGO}$"):
        parts = stored.split("$", 3)
        if len(parts) != 4:
            return (False, False)
        _, iter_s, salt, ph = parts
        try:
            iterations = int(iter_s)
        except ValueError:
            return (False, False)
        if iterations < 1 or not salt or not ph:
            return (False, False)
        try:
            calc = _hash_password_pbkdf2(password, salt, iterations)
        except (UnicodeEncodeError, ValueError):
            return (False, False)
        ok = hmac.compare_digest(calc, ph)
        return (ok, ok and iterations < _PBKDF2_ITERATIONS)

    # الصيغة القديمة: ‎<ملح>$<sha256>‎
    if "$" not in stored:
        return (False, False)
    salt, ph = stored.split("$", 1)
    ok = hmac.compare_digest(_hash_password_legacy(password, salt), ph)
    return (ok, ok)


def register_user(
    username: str,
    password: str,
    role: str = "trader",
    sponsor_code: str | None = None,
    side: str | None = None,
    email: str | None = None,
) -> dict[str, Any]:
    import commissions as commissions_mod
    import re

    username = _clean_username(username)
    email_norm = (email or "").strip().lower()
    if len(username) < 3 or len(password) < PASSWORD_MIN:
        raise ValueError("username/password too short")
    _check_username(username)
    # محارف تحكّم/تنسيق («b\x00@x.com»، عرض صفري) كانت تُقبل ⇒ بريد يُحفظ ويُعاد بمحرف لا يُرى
    if not email_norm or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_norm) or any(
        unicodedata.category(ch)[0] == "C" for ch in email_norm
    ):
        raise ValueError("invalid email")
    role = (role or "trader").strip().lower()
    if role not in commissions_mod.ROLE_LABELS_AR:
        raise ValueError("invalid role")
    side_norm = (side or "").strip().lower()
    if side_norm and side_norm not in ("left", "right"):
        raise ValueError("side must be left or right")

    stored = _encode_password(password)
    now = time.time()
    with _conn() as c:
        # قفل الكتابة **قبل** الفحوص (كـ`place_under_sponsor`): طلبان متزامنان «alice»/«аlice» (а سيريلية)
        # كانا يجتازان `_username_taken` معاً ثم يُدرَجان (مفتاحاهما مختلفان، وفهرس الهيكل غير فريد) ⇒
        # حسابان يُعرضان بالاسم نفسه.
        c.execute("BEGIN IMMEDIATE")
        sponsor_id: int | None = None
        if sponsor_code:
            code_norm = sponsor_code.strip().upper()
            sp = c.execute(
                "SELECT user_id FROM network_members WHERE referral_code=?", (code_norm,)
            ).fetchone()
            # رمز حساب محذوف (`delete_user_account`) كرمز غير موجود — لا راعٍ يملكه
            if not sp or code_norm.startswith(DELETED_CODE_PREFIX):
                raise ValueError("sponsor code not found")
            sponsor_id = int(sp["user_id"])
            if not side_norm:
                raise ValueError("side required when sponsor is set")
        taken = c.execute(
            "SELECT 1 FROM users WHERE lower(email)=?", (email_norm,)
        ).fetchone()
        if taken:
            raise ValueError("email taken")
        if _username_taken(c, username):
            raise ValueError("username or email taken")
        vcode = "".join(secrets.choice("0123456789") for _ in range(6))
        try:
            c.execute(
                "INSERT INTO users(username,username_key,password_hash,created_at,email,email_verified,verification_code) VALUES(?,?,?,?,?,0,?)",
                (username, _username_key(username), stored, now, email_norm, vcode),
            )
            uid = int(c.execute("SELECT last_insert_rowid()").fetchone()[0])
        except sqlite3.IntegrityError as exc:
            raise ValueError("username or email taken") from exc

        code = _make_referral_code(c, username, uid)
        c.execute(
            """INSERT INTO network_members
               (user_id,role,sponsor_id,side,referral_code,left_count,right_count,created_at)
               VALUES(?,?,?,?,?,0,0,?)""",
            (uid, role, sponsor_id, side_norm or None, code, now),
        )
        if sponsor_id and side_norm:
            _bump_leg_counts(c, sponsor_id, side_norm)
            # قرار أنس ١٤: التسجيل برمز إحالة كان يرفع عدّاد الراعي بلا سطر عمولة ⇒ تقريره ينقص عضواً
            _log_commission_on_place(c, sponsor_id, uid, username, now)

    session = create_session(uid, username, email_norm)
    session["referral_code"] = code
    session["role"] = role
    session["email_verified"] = False
    session["verification_code"] = vcode
    return session


def verify_email(user_id: int, code: str) -> bool:
    code_clean = (code or "").strip()
    with _conn() as c:
        row = c.execute("SELECT verification_code FROM users WHERE id=?", (user_id,)).fetchone()
        if not row:
            return False
        stored = str(row["verification_code"] or "").strip()
        if stored and hmac.compare_digest(stored, code_clean):
            c.execute("UPDATE users SET email_verified=1 WHERE id=?", (user_id,))
            return True
        return False


def resend_verification_code(user_id: int) -> str | None:
    vcode = "".join(secrets.choice("0123456789") for _ in range(6))
    with _conn() as c:
        row = c.execute("SELECT email, email_verified FROM users WHERE id=?", (user_id,)).fetchone()
        if not row or row["email_verified"]:
            return None
        c.execute("UPDATE users SET verification_code=? WHERE id=?", (vcode, user_id))
        return vcode


# رمز إحالة الحساب المحذوف. `_make_referral_code` يأخذ 6 محارف من الاسم أقصى ⇒ لا رمز حيّ يبدأ بـ7 محارف هذه
DELETED_CODE_PREFIX = "DELETED"


def _make_referral_code(c: sqlite3.Connection, username: str, uid: int) -> str:
    base = "".join(ch for ch in username.upper() if ch.isalnum())[:6] or "MX"
    code = f"{base}{uid:04d}"
    n = 0
    while c.execute(
        "SELECT 1 FROM network_members WHERE referral_code=?", (code,)
    ).fetchone():
        n += 1
        code = f"{base}{uid:04d}{n}"
    return code


def _bump_leg_counts(c: sqlite3.Connection, sponsor_id: int, side: str) -> None:
    """Increment left/right up the sponsor chain (binary placement under direct sponsor only)."""
    col = "left_count" if side == "left" else "right_count"
    # Direct sponsor gets the placement
    c.execute(
        f"UPDATE network_members SET {col} = {col} + 1 WHERE user_id=?",
        (sponsor_id,),
    )
    # Walk up: each ancestor gets +1 on the same geometric side relative to their tree
    # For v1: only direct sponsor counts for balance; ancestors also get the same side bump
    # if this node was placed under their left/right lineage.
    current = sponsor_id
    visited: set[int] = {sponsor_id}
    while True:
        row = c.execute(
            "SELECT sponsor_id, side FROM network_members WHERE user_id=?",
            (current,),
        ).fetchone()
        if not row or row["sponsor_id"] is None:
            break
        parent = int(row["sponsor_id"])
        if parent in visited:
            break
        visited.add(parent)
        parent_side = str(row["side"] or "")
        if parent_side not in ("left", "right"):
            break
        pcol = "left_count" if parent_side == "left" else "right_count"
        c.execute(
            f"UPDATE network_members SET {pcol} = {pcol} + 1 WHERE user_id=?",
            (parent,),
        )
        current = parent


def get_network_member(user_id: int) -> dict[str, Any] | None:
    with _conn() as c:
        row = c.execute(
            "SELECT * FROM network_members WHERE user_id=?", (user_id,)
        ).fetchone()
        if not row:
            return None
        sponsor_name = None
        if row["sponsor_id"]:
            s = c.execute(
                "SELECT username FROM users WHERE id=?", (row["sponsor_id"],)
            ).fetchone()
            sponsor_name = s["username"] if s else None
        children = c.execute(
            """SELECT u.id, u.username, n.side, n.role, n.referral_code,
                      n.left_count, n.right_count
               FROM network_members n JOIN users u ON u.id=n.user_id
               WHERE n.sponsor_id=? ORDER BY n.created_at""",
            (user_id,),
        ).fetchall()
    return {
        "user_id": int(row["user_id"]),
        "role": row["role"],
        "sponsor_id": row["sponsor_id"],
        "sponsor_username": sponsor_name,
        "side": row["side"],
        "referral_code": row["referral_code"],
        "left_count": int(row["left_count"]),
        "right_count": int(row["right_count"]),
        "directs": [
            {
                "user_id": int(r["id"]),
                "username": r["username"],
                "side": r["side"],
                "role": r["role"],
                "referral_code": r["referral_code"],
                "left_count": int(r["left_count"]),
                "right_count": int(r["right_count"]),
            }
            for r in children
        ],
    }


def get_network_tree(user_id: int, depth: int = 5) -> dict[str, Any] | None:
    """Recursive left/right tree for visualization."""
    depth = max(1, min(int(depth), 8))
    with _conn() as c:
        root = c.execute(
            """SELECT n.*, u.username FROM network_members n
               JOIN users u ON u.id=n.user_id WHERE n.user_id=?""",
            (user_id,),
        ).fetchone()
        if not root:
            return None

        def children_of(uid: int) -> list[sqlite3.Row]:
            return c.execute(
                """SELECT n.user_id, n.side, n.role, n.referral_code,
                          n.left_count, n.right_count, u.username
                   FROM network_members n JOIN users u ON u.id=n.user_id
                   WHERE n.sponsor_id=? ORDER BY n.created_at""",
                (uid,),
            ).fetchall()

        def build(uid: int, username: str, role: str, code: str, left_c: int, right_c: int, level: int) -> dict[str, Any]:
            kids = children_of(uid) if level < depth else []
            left_nodes = []
            right_nodes = []
            for k in kids:
                node = build(
                    int(k["user_id"]),
                    str(k["username"]),
                    str(k["role"]),
                    str(k["referral_code"]),
                    int(k["left_count"]),
                    int(k["right_count"]),
                    level + 1,
                )
                if str(k["side"]) == "right":
                    right_nodes.append(node)
                else:
                    left_nodes.append(node)
            return {
                "user_id": uid,
                "username": username,
                "role": role,
                "referral_code": code,
                "left_count": left_c,
                "right_count": right_c,
                "level": level,
                "left": left_nodes,
                "right": right_nodes,
            }

        return build(
            int(root["user_id"]),
            str(root["username"]),
            str(root["role"]),
            str(root["referral_code"]),
            int(root["left_count"]),
            int(root["right_count"]),
            0,
        )


def place_under_sponsor(
    sponsor_user_id: int,
    username: str,
    password: str | None,
    side: str,
    role: str = "trader",
    under_user_id: int | None = None,
) -> dict[str, Any]:
    """Place a new member on left/right under sponsor (or under a downline node)."""
    import commissions as commissions_mod

    username = _clean_username(username)
    side_norm = (side or "").strip().lower()
    role = (role or "trader").strip().lower()
    # كما كُتبت: كانت تُقصّ ⇒ «  abcd  » تُحفظ «abcd» والدخول (لا يقصّ) بما كتبه الراعي 401 بلا `temp_password`
    pwd = password or ""
    if not pwd.strip():
        pwd = ""
    if len(username) < 3:
        raise ValueError("username too short")
    _check_username(username)
    if not pwd:
        # فارغ = «ولّد لي كلمة مرور» — تُعاد بـ`temp_password` أدناه
        pwd = secrets.token_urlsafe(8)
    elif len(pwd) < PASSWORD_MIN:
        # كانت تُستبدل بعشوائية **لا تُعاد** (`temp_password` None لأن كلمة كُتبت): العضو يُنشأ ويُعدّ
        # بساق الراعي ولا يستطيع أحد الدخول بحسابه أبداً. نفس حدّ التسجيل (`register_user`).
        raise ValueError("password too short")
    if side_norm not in ("left", "right"):
        raise ValueError("side must be left or right")
    if role not in commissions_mod.ROLE_LABELS_AR:
        raise ValueError("invalid role")

    sponsor = get_network_member(sponsor_user_id)
    if not sponsor:
        raise ValueError("sponsor network not found")

    parent_id = sponsor_user_id
    if under_user_id is not None and int(under_user_id) != sponsor_user_id:
        if not _is_in_downline(sponsor_user_id, int(under_user_id)):
            raise ValueError("under_user_id not in your tree")
        parent_id = int(under_user_id)

    stored = _encode_password(pwd)
    now = time.time()
    with _conn() as c:
        # قفل الكتابة **قبل** فحص الساق: بلا ذلك طلبان متزامنان (مسارات sync على threadpool) يجتازان
        # الفحص معاً فيُوضع ابنان على الجانب نفسه ويُعدّان مرتين بساق الراعي وأسلافه وبدفتر العمولة.
        c.execute("BEGIN IMMEDIATE")
        # حساب محذوف بالشجرة: رمزه لا يعمل بالتسجيل (`DELETED_CODE_PREFIX`) — وكان `under_user_id` إليه
        # يضع عضواً تحت حساب لا يملكه أحد ويرفع عدّادات أسلافه (نفس ما يمنعه حذف الحساب).
        parent_code = c.execute(
            "SELECT referral_code FROM network_members WHERE user_id=?", (parent_id,)
        ).fetchone()
        if parent_code and str(parent_code["referral_code"] or "").startswith(DELETED_CODE_PREFIX):
            raise ValueError("under_user_id is a deleted account")
        taken = c.execute(
            "SELECT 1 FROM network_members WHERE sponsor_id=? AND side=?",
            (parent_id, side_norm),
        ).fetchone()
        if taken:
            raise ValueError("side already occupied")
        if _username_taken(c, username):
            raise ValueError("username taken")

        try:
            c.execute(
                "INSERT INTO users(username,username_key,password_hash,created_at) VALUES(?,?,?,?)",
                (username, _username_key(username), stored, now),
            )
            uid = int(c.execute("SELECT last_insert_rowid()").fetchone()[0])
        except sqlite3.IntegrityError as exc:
            raise ValueError("username taken") from exc

        code = _make_referral_code(c, username, uid)
        c.execute(
            """INSERT INTO network_members
               (user_id,role,sponsor_id,side,referral_code,left_count,right_count,created_at)
               VALUES(?,?,?,?,?,0,0,?)""",
            (uid, role, parent_id, side_norm, code, now),
        )
        _bump_leg_counts(c, parent_id, side_norm)
        _log_commission_on_place(c, sponsor_user_id, uid, username, now)

    return {
        "ok": True,
        "user_id": uid,
        "username": username,
        "side": side_norm,
        "role": role,
        "referral_code": code,
        "parent_id": parent_id,
        "temp_password": pwd if (password or "").strip() == "" else None,
        "tree": get_network_tree(sponsor_user_id, depth=5),
        "network": get_network_member(sponsor_user_id),
    }


COMMISSION_UNIT = 100.0  # نقاط أساس لكل عضو جديد


def _log_commission_on_place(
    c: sqlite3.Connection,
    earner_id: int,
    source_user_id: int,
    source_username: str,
    now: float,
) -> None:
    import commissions as commissions_mod

    # UTC (قرار أنس ١٤): كان بتوقيت الخادم المحلي ⇒ عضو 23:30 UTC آخر الشهر يُحسب بشهر آخر حسب مكان الخادم
    month_key = time.strftime("%Y-%m", time.gmtime(now))
    direct_pts = COMMISSION_UNIT * commissions_mod.DIRECT_RATE
    c.execute(
        """INSERT INTO commission_ledger
           (earner_id,source_user_id,source_username,kind,rate,points,created_at,month_key)
           VALUES(?,?,?,?,?,?,?,?)""",
        (
            earner_id,
            source_user_id,
            source_username,
            "direct",
            commissions_mod.DIRECT_RATE,
            direct_pts,
            now,
            month_key,
        ),
    )
    row = c.execute(
        "SELECT left_count, right_count, role FROM network_members WHERE user_id=?",
        (earner_id,),
    ).fetchone()
    # قرار أنس ١٤: عند مستوى مؤهل فقط (2، 4، 8…) — كانت عند أي تساوٍ (1=1، 3=3)
    if row and commissions_mod.pays_balance_bonus(
        int(row["left_count"]), int(row["right_count"]), str(row["role"] or "trader")
    ):
        bonus_pts = COMMISSION_UNIT * commissions_mod.BALANCE_BONUS_RATE
        c.execute(
            """INSERT INTO commission_ledger
               (earner_id,source_user_id,source_username,kind,rate,points,created_at,month_key)
               VALUES(?,?,?,?,?,?,?,?)""",
            (
                earner_id,
                source_user_id,
                source_username,
                "balance_bonus",
                commissions_mod.BALANCE_BONUS_RATE,
                bonus_pts,
                now,
                month_key,
            ),
        )


def get_commission_report(earner_id: int) -> dict[str, Any]:
    """Tables: commission rates + monthly profits for the earner."""
    import commissions as commissions_mod

    with _conn() as c:
        rows = c.execute(
            """SELECT month_key, kind, SUM(points) AS pts, COUNT(*) AS n
               FROM commission_ledger WHERE earner_id=?
               GROUP BY month_key, kind
               ORDER BY month_key DESC""",
            (earner_id,),
        ).fetchall()
        recent = c.execute(
            """SELECT source_username, kind, rate, points, created_at, month_key
               FROM commission_ledger WHERE earner_id=?
               ORDER BY created_at DESC LIMIT 40""",
            (earner_id,),
        ).fetchall()

    by_month: dict[str, dict[str, float]] = {}
    for r in rows:
        mk = str(r["month_key"])
        bucket = by_month.setdefault(mk, {"direct": 0.0, "balance_bonus": 0.0, "total": 0.0})
        pts = float(r["pts"] or 0)
        kind = str(r["kind"])
        if kind == "balance_bonus":
            bucket["balance_bonus"] += pts
        else:
            bucket["direct"] += pts
        bucket["total"] += pts

    monthly = [
        {
            "month": mk,
            "direct_points": round(v["direct"], 2),
            "balance_points": round(v["balance_bonus"], 2),
            "total_points": round(v["total"], 2),
            "direct_pct": int(commissions_mod.DIRECT_RATE * 100),
            "balance_pct": int(commissions_mod.BALANCE_BONUS_RATE * 100),
        }
        for mk, v in by_month.items()
    ]

    return {
        "unit": COMMISSION_UNIT,
        "commission_table": [
            {
                "type": "جلب مباشر",
                "rate_pct": int(commissions_mod.DIRECT_RATE * 100),
                "condition": "عند إدخال عضو جديد",
                "points_per_member": round(COMMISSION_UNIT * commissions_mod.DIRECT_RATE, 2),
            },
            {
                "type": "مكافأة توازن",
                "rate_pct": int(commissions_mod.BALANCE_BONUS_RATE * 100),
                "condition": "يمين = يسار عند مستوى مؤهل",
                "points_per_member": round(COMMISSION_UNIT * commissions_mod.BALANCE_BONUS_RATE, 2),
            },
            {
                "type": "فعّالة متوازن",
                "rate_pct": int((commissions_mod.DIRECT_RATE + commissions_mod.BALANCE_BONUS_RATE) * 100),
                "condition": "10% + 5%",
                "points_per_member": round(
                    COMMISSION_UNIT
                    * (commissions_mod.DIRECT_RATE + commissions_mod.BALANCE_BONUS_RATE),
                    2,
                ),
            },
            {
                "type": "فعّالة غير متوازن",
                "rate_pct": int(commissions_mod.DIRECT_RATE * 100),
                "condition": "يمين ≠ يسار، أو تساوٍ خارج المستويات",
                "points_per_member": round(COMMISSION_UNIT * commissions_mod.DIRECT_RATE, 2),
            },
        ],
        "levels_table": [
            {"role": commissions_mod.ROLE_LABELS_AR[r], "levels": commissions_mod.levels_for_role(r)}
            for r in ("trader", "trainer", "broker", "agent", "company")
        ],
        "monthly": monthly,
        "recent": [
            {
                "member": r["source_username"],
                "kind": "توازن" if r["kind"] == "balance_bonus" else "جلب",
                "rate_pct": int(float(r["rate"]) * 100),
                "points": float(r["points"]),
                "month": r["month_key"],
            }
            for r in recent
        ],
    }


def _is_in_downline(root_id: int, target_id: int) -> bool:
    with _conn() as c:
        frontier = [root_id]
        seen: set[int] = {root_id}
        while frontier:
            cur = frontier.pop()
            rows = c.execute(
                "SELECT user_id FROM network_members WHERE sponsor_id=?", (cur,)
            ).fetchall()
            for r in rows:
                cid = int(r["user_id"])
                if cid == target_id:
                    return True
                if cid not in seen:
                    seen.add(cid)
                    frontier.append(cid)
    return False


def ensure_network_for_user(user_id: int, username: str) -> dict[str, Any]:
    existing = get_network_member(user_id)
    if existing:
        return existing
    with _conn() as c:
        code = _make_referral_code(c, username, user_id)
        c.execute(
            """INSERT OR IGNORE INTO network_members
               (user_id,role,sponsor_id,side,referral_code,left_count,right_count,created_at)
               VALUES(?,?,NULL,NULL,?,0,0,?)""",
            (user_id, "trader", code, time.time()),
        )
    return get_network_member(user_id) or {}


_login_failures: dict[str, list[float]] = {}
_login_lock = threading.Lock()
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 15 * 60  # 15 دقيقة بالثواني


def _check_login_rate_limit(ident: str) -> None:
    now = time.time()
    key = ident.lower()
    with _login_lock:
        attempts = [t for t in _login_failures.get(key, []) if now - t < LOCKOUT_DURATION]
        _login_failures[key] = attempts
        if len(attempts) >= MAX_LOGIN_ATTEMPTS:
            oldest = attempts[0]
            remaining = int(math.ceil((LOCKOUT_DURATION - (now - oldest)) / 60))
            raise ValueError(
                f"حسابك مقفل مؤقتاً لتجاوز {MAX_LOGIN_ATTEMPTS} محاولات دخول خاطئة. يُرجى المحاولة بعد {max(1, remaining)} دقيقة."
            )


def _record_login_failure(ident: str) -> None:
    now = time.time()
    key = ident.lower()
    with _login_lock:
        attempts = [t for t in _login_failures.get(key, []) if now - t < LOCKOUT_DURATION]
        attempts.append(now)
        _login_failures[key] = attempts


def _clear_login_failures(ident: str) -> None:
    key = ident.lower()
    with _login_lock:
        _login_failures.pop(key, None)


def login_user(username_or_email: str, password: str) -> dict[str, Any]:
    ident = _clean_username(username_or_email)
    _check_login_rate_limit(ident)
    with _conn() as c:
        if "@" in ident:
            row = c.execute(
                "SELECT id, username, email, password_hash FROM users WHERE lower(email)=?",
                (ident.lower(),),
            ).fetchone()
        else:
            row = c.execute(
                "SELECT id, username, email, password_hash FROM users WHERE username=?",
                (ident,),
            ).fetchone()
            if not row:
                # «ali» يدخل حساب «Ali». إن وُجد تصادم قديم (قبل الفهرس) لا يُخمَّن أيّهما
                rows = c.execute(
                    "SELECT id, username, email, password_hash FROM users WHERE username_key=?",
                    (_username_key(ident),),
                ).fetchall()
                row = rows[0] if len(rows) == 1 else None
    if not row:
        _record_login_failure(ident)
        # تجزئة وهمية بالجولات نفسها: بلاها يُجاب الاسم غير الموجود فوراً والموجود بعد PBKDF2 (~60ms)
        # ⇒ زمن الردّ يكشف وجود الحساب.
        _verify_password(password, f"{_PBKDF2_ALGO}${_PBKDF2_ITERATIONS}${'0' * 32}${'0' * 64}")
        raise ValueError("invalid credentials")
    stored = str(row["password_hash"])
    ok, needs_rehash = _verify_password(password, stored)
    if not ok:
        _record_login_failure(ident)
        raise ValueError("invalid credentials")
    # ترقية كسولة: الدخول نجح فكلمة المرور بين أيدينا الآن وحدها هذه اللحظة (تُحسب خارج القفل).
    new_hash = _encode_password(password) if needs_rehash else None
    uid = int(row["id"])
    with _conn() as c:
        # التحقق أعلاه بلا قفل (PBKDF2 بطيء)؛ تغيير كلمة المرور أو حذف الحساب بينهما كان يُلغى:
        # الترقية تكتب تجزئة الكلمة القديمة فوق الجديدة/الميتة، والجلسة تُنشأ بعد أن أُلغيت الجلسات.
        # الآن التجزئة يجب أن تبقى هي التي تحقّقنا منها، والترقية والجلسة بالمعاملة نفسها.
        c.execute("BEGIN IMMEDIATE")
        cur = c.execute("SELECT username, email, password_hash FROM users WHERE id=?", (uid,)).fetchone()
        if not cur or str(cur["password_hash"]) != stored:
            _record_login_failure(ident)
            raise ValueError("invalid credentials")
        if new_hash:
            c.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, uid))
        token = _insert_session(c, uid)
    _clear_login_failures(ident)
    return {"token": token, "user_id": uid, "username": str(cur["username"]), "email": str(cur["email"] or "") or None}


def _insert_session(c: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    c.execute(
        "INSERT OR REPLACE INTO sessions(token,user_id,expires_at) VALUES(?,?,?)",
        (token, user_id, time.time() + 86400 * 30),
    )
    return token


def create_session(user_id: int, username: str, email: str | None = None) -> dict[str, Any]:
    with _conn() as c:
        token = _insert_session(c, user_id)
        if email is None:
            er = c.execute("SELECT email FROM users WHERE id=?", (user_id,)).fetchone()
            email = str(er["email"]) if er and er["email"] else None
    return {
        "token": token,
        "user_id": user_id,
        "username": username,
        "email": email,
    }


def user_from_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    with _conn() as c:
        row = c.execute(
            """SELECT s.user_id, u.username, u.email FROM sessions s
               JOIN users u ON u.id=s.user_id
               WHERE s.token=? AND s.expires_at>?""",
            (token, time.time()),
        ).fetchone()
    if not row:
        return None
    return {
        "user_id": int(row["user_id"]),
        "username": row["username"],
        "email": row["email"],
    }


def session_user_id(token: str | None) -> int | None:
    """مالك الجلسة **ولو انتهت** — للخروج وحده: توكن منتهٍ كان يجعل الخروج «ok» بلا فكّ رمز Push
    فتبقى إشعارات تنبيهات الحساب تصل الهاتف لمن يستعمله بعده. التوكن نفسه (32 بايت عشوائية) هو الإثبات."""
    if not token:
        return None
    with _conn() as c:
        row = c.execute("SELECT user_id FROM sessions WHERE token=?", (token,)).fetchone()
    return int(row["user_id"]) if row else None


def delete_user_account(user_id: int) -> None:
    """حذف حساب — شرط إلزامي لأبل (App Store Review Guideline 5.1.1(v): يجب أن يقدر
    المستخدم يحذف حسابه وبياناته الشخصية من داخل التطبيق).

    لا يُحذف صف users فعلياً: هذا المستخدم قد يكون sponsor_id لمستخدمين آخرين بشجرة
    الإحالة (network_members) وله سجل عمولات (commissions) — حذف الصف فعلياً يكسر
    سلامة شجرة/سجل مالي يخصّ أطرافاً أخرى. بدلاً من ذلك: تُمحى كل بيانات الهوية
    الشخصية القابلة للتعريف (username → معرّف مجهول ثابت غير قابل لتسجيل دخول،
    email → NULL، password_hash → قيمة عشوائية غير صالحة أبداً لأي كلمة مرور حقيقية)،
    وتُلغى كل الجلسات النشطة فوراً، ويُحذف المحتوى الشخصي البحت غير المرجعي من طرف
    آخر (تنبيهات الأسعار والمؤشرات، دفتر الصفقات، تخطيطات الشارت المحفوظة، رمز إشعارات Push، سجل أصواته على أفكار الصفقات — العدّادات تبقى، قائمة المتابعة المخصّصة، تقدّم الأكاديمية، رسائله بمحادثة المجموعة، ومحادثاته الخاصة بطرفيها، واسمه كناشر لأفكار الصفقات وكعضو مُحال بسجلّ العمولات). هذا يحقق
    الشرط الفعلي لأبل (إزالة البيانات الشخصية القابلة للتعريف) دون كسر شجرة العمولات.
    """
    placeholder = f"deleted_user_{user_id}"
    dead_hash = f"{secrets.token_hex(8)}${secrets.token_hex(32)}"
    with _conn() as c:
        if _username_taken(c, placeholder, user_id):
            # اسم سُجِّل قبل حجز البادئة (`_check_username`): لا يمنع الحذف — لاحقة عشوائية بدل 500
            placeholder = f"{placeholder}_{secrets.token_hex(4)}"
        old = c.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
        if old and old["username"]:
            # أفكار الصفقات تحفظ اسم الناشر نصاً (votes.author) — بلا هذا يبقى اسم الحساب المحذوف
            # ظاهراً للجميع على أفكاره. الأفكار نفسها تبقى (عليها أصوات آخرين) لكن كمجهولة.
            c.execute("UPDATE votes SET author=NULL WHERE author=?", (old["username"],))
            # الرسائل الخاصة تُخزَّن **بالاسم نصاً** لا بـuser_id (`dm_messages.user_name`
            # للمرسِل و`peer` مفتاحاً للمحادثة)، فلم يكن حذف الحساب يمسّها إطلاقاً: تبقى رسائل
            # الحساب المحذوف ومعها اسمه بالقاعدة إلى الأبد، وهو بالضبط ما يوجب شرط أبل إزالته.
            # تُحذف المحادثة الخاصة بطرفيها: خيط ثنائي مع حساب لم يعد موجوداً لا يُقرأ ولا يُردّ
            # عليه، وإبقاء نصف منه يُبقي الاسم ظاهراً.
            c.execute(
                "DELETE FROM dm_messages WHERE user_name=? OR peer=?",
                (old["username"], old["username"]),
            )
            # سجلّ العمولات يحفظ اسم العضو المُحال نصاً (`source_username`) بجانب `source_user_id`.
            # الصفوف نفسها سجلّ ماليّ لطرف آخر (الراعي) فتبقى — والاسم وحده يُمحى، نفس معالجة
            # `votes.author` بالضبط. (الحقل لا تعرضه أي واجهة بالتطبيق — يُعاد بـ`recent` فقط.)
            c.execute(
                "UPDATE commission_ledger SET source_username=NULL WHERE source_username=?",
                (old["username"],),
            )
        c.execute(
            "UPDATE users SET username=?, username_key=?, username_skel=NULL, email=NULL, password_hash=? WHERE id=?",
            (placeholder, _username_key(placeholder), dead_hash, user_id),
        )
        # رمز الإحالة مبنيّ من الاسم (`ALICE0001`) ويظهر بشجرة الراعي والفريق ⇒ كان يُبقي جزءاً من الاسم
        # المحذوف، ويظلّ رمز راعٍ صالحاً: التسجيل به يضع عضواً تحت حساب لا يملكه أحد ويرفع عدّادات ساقَيه
        # وأسلافه. يُستبدل برمز لا يحمل الاسم، والتسجيل يرفض بادئته (`DELETED_CODE_PREFIX`). الصفّ نفسه
        # يبقى — موضعه بالشجرة جزء من سلسلة الآخرين.
        c.execute(
            "UPDATE network_members SET referral_code=? WHERE user_id=?",
            (f"{DELETED_CODE_PREFIX}{user_id:04d}", user_id),
        )
        c.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM alerts WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM indicator_alerts WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM trades WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM push_tokens WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM layouts WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM vote_ballots WHERE user_id=?", (user_id,))
        # قائمة المتابعة المخصّصة وتقدّم الأكاديمية بيانات شخصية أيضاً وكانت تبقى بعد الحذف
        c.execute("DELETE FROM watchlist WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM academy_progress WHERE user_id=?", (user_id,))
        c.execute("DELETE FROM group_messages WHERE user_id=?", (user_id,))
        # بلاغاته عن محتوى الآخرين **تبقى**: كان حذفها يُنزل عدّاد العنصر تحت `REPORT_HIDE_THRESHOLD`
        # فتعود رسالة احتيال مخفية ظاهرة للجميع بلا مراجعة (وثلاثة حسابات تُبلغ ثم تُحذف = لا أثر).
        # الصفّ لا يحمل هوية: `reporter_id` يشير لصفّ users المُجهَّل أعلاه، والسبب من قائمة ثابتة.


# ─── Alerts ───────────────────────────────────────────────────────────────────

def list_alerts(
    user_id: int | None = None, *, all_users: bool = False, owner_key: str | None = None
) -> list[dict]:
    """Alerts visible to a caller — see `_owner_clause` (own account + this device's anonymous
    ones; an anonymous device sees only its own). ``all_users=True`` is for the server-side
    worker only and adds the internal ``user_id``/``owner_key`` so pushes reach the owner's
    devices, not everyone's."""
    with _conn() as c:
        if all_users:
            rows = c.execute("SELECT * FROM alerts ORDER BY ts DESC").fetchall()
            return [{**_alert_row(r), "user_id": r["user_id"], "owner_key": r["owner_key"]} for r in rows]
        sql, args = _owner_clause(user_id, owner_key)
        rows = c.execute(f"SELECT * FROM alerts WHERE {sql} ORDER BY ts DESC", args).fetchall()
    return [_alert_row(r) for r in rows]


def _alert_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "symbol": r["symbol"],
        "condition": r["condition"],
        "price": r["price"],
        "note": r["note"] or "",
        "active": bool(r["active"]),
        "triggered": bool(r["triggered"]),
        "ts": r["ts"],
    }


def create_alert(data: dict, user_id: int | None = None, owner_key: str | None = None) -> dict:
    with _conn() as c:
        _lock_owner(c, user_id)
        c.execute(
            """INSERT INTO alerts(id,user_id,owner_key,symbol,condition,price,note,active,triggered,ts)
               VALUES(?,?,?,?,?,?,?,1,0,?)""",
            (
                data["id"],
                user_id,
                owner_key,
                data["symbol"],
                data["condition"],
                data["price"],
                data.get("note", ""),
                data["ts"],
            ),
        )
    return data


class AlertChanged(Exception):
    """التنبيه تغيّر منذ قرأه العميل (`expect`) — `alert` = الصفّ المخزَّن."""

    def __init__(self, alert: dict):
        super().__init__("alert changed")
        self.alert = alert


_ALERT_EXPECT_COLS = ("symbol", "condition", "price", "triggered", "ts")


def update_alert(
    alert_id: str, data: dict, user_id: int | None = None, owner_key: str | None = None,
    expect: dict | None = None,
) -> dict | None:
    """Atomic edit of a price alert (symbol/condition/price/note) — re-arms it (triggered=0).

    Ownership: `_owner_clause` (own account or this device's anonymous alerts). Returns the
    updated row, or None when no row matched (missing or not owned) → the API answers 404.
    """
    sql, args = _owner_clause(user_id, owner_key)
    cond, cargs = "", ()
    for k, v in (expect or {}).items():
        if k not in _ALERT_EXPECT_COLS:
            continue
        alts = v if isinstance(v, tuple) else (int(v) if k == "triggered" else v,)  # tuple = أيّ واحدة تكفي
        cond += " AND (" + " OR ".join(f"{k} IS ?" for _ in alts) + ")"
        cargs += alts
    with _conn() as c:
        cur = c.execute(
            f"""UPDATE alerts SET symbol=?, condition=?, price=?, note=?, active=1, triggered=0, ts=?
               WHERE id=? AND {sql}{cond}""",
            (data["symbol"], data["condition"], data["price"], data.get("note", ""),
             data["ts"], alert_id, *args, *cargs),
        )
        if cur.rowcount == 0:
            if cond:
                row = c.execute(f"SELECT * FROM alerts WHERE id=? AND {sql}", (alert_id, *args)).fetchone()
                if row is not None:
                    raise AlertChanged(_alert_row(row))
            return None
        row = c.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    return _alert_row(row) if row else None


def delete_alert(alert_id: str, user_id: int | None = None, owner_key: str | None = None) -> bool:
    """Same ownership rule as update_alert (`_owner_clause`)."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM alerts WHERE id=? AND {sql}", (alert_id, *args))
    return cur.rowcount > 0


def mark_alert_triggered(alert_id: str, seen: dict | None = None) -> bool:
    """True فقط لمن نقله فعلاً من مُسلَّح إلى مُطلَق — الـworker ولوحة التنبيهات (فحص كل دقيقة من كل جهاز
    مفتوح) يقرآن triggered=0 بنفس اللحظة، فكان كلٌّ منهما يُرسل إشعاره (إشعارات مكرّرة لنفس التنبيه).

    `seen` = الصفّ كما قُرئ وفُحص: القلب يشترط أن الرمز/الشرط/السعر/وقت التسليح لم تتغيّر منذئذٍ.
    القائمة تُقرأ قبل طلبات المزوّد (حتى 25ث لكل رمز)، ومتداول يعدّل تنبيهه بينهما (1.1000 ⇒ 1.1200،
    `update_alert` يعيد تسليحه) كان تنبيهه **الجديد** يُوسَم مُطلَقاً بمستوى قديم لم يعد يريده ويُدفَع
    «تجاوز 1.1» — ولا يُطلق عند 1.1200 أبداً."""
    sql = "UPDATE alerts SET triggered=1 WHERE id=? AND triggered=0"
    args: tuple = (alert_id,)
    if seen is not None:
        sql += " AND symbol=? AND condition=? AND price=? AND ts IS ?"
        args += (seen["symbol"], seen["condition"], seen["price"], seen.get("ts"))
    with _conn() as c:
        cur = c.execute(sql, args)
    return cur.rowcount == 1


# ─── Chat / votes ─────────────────────────────────────────────────────────────

# كل رسالة مجموعة كانت تُحفظ باسم «أنت» (العميل يرسله ثابتاً) → كل متداول يرى رسائل الجميع «أنت»
# ومُعلَّمة كأنها رسائله. تلك الصفوف القديمة تُعرض الآن بلا اسم (الواجهة تكتب «متداول»).
_LEGACY_CHAT_USER = "أنت"


# ─── Moderation (Apple 1.2 / Google Play UGC) ────────────────────────────────────

# عدد الحسابات المختلفة التي تُبلغ عن عنصر حتى يُخفى عن الجميع تلقائياً (بانتظار مراجعة يدوية
# لجدول content_reports). ثلاثة: حساب واحد غاضب لا يُسكت أحداً، وثلاثة بلاغات مستقلة تكفي لإزالة
# الاحتيال/الإساءة الظاهرة بسرعة قبل أن يراها مبتدئ.
REPORT_HIDE_THRESHOLD = 3
REPORT_KINDS = ("group_message", "vote")


def report_content(kind: str, target_id: str, reporter_id: int, reason: str) -> bool | None:
    """يسجّل بلاغاً. None = العنصر غير موجود؛ True = بلاغ جديد؛ False = الحساب أبلغ عنه سابقاً."""
    table = {"group_message": "group_messages", "vote": "votes"}.get(kind)
    if table is None:
        return None
    with _conn() as c:
        if not c.execute(f"SELECT 1 FROM {table} WHERE id=?", (target_id,)).fetchone():
            return None
        cur = c.execute(
            """INSERT OR IGNORE INTO content_reports(kind,target_id,reporter_id,reason,created_at)
               VALUES(?,?,?,?,?)""",
            (kind, target_id, reporter_id, reason, time.time()),
        )
        return cur.rowcount > 0


def list_reports(limit: int = 200) -> list[dict]:
    """قائمة المراجعة للمشرف: كل عنصر مُبلَّغ عنه مع عدد البلاغات والأسباب ونصّه (إن بقي).

    الأقدم أولاً (بأول بلاغ): كانت الأحدث أولاً بحدّ 200 ⇒ فوق 200 عنصر معلّق يختفي الأقدم — وهو الأقرب
    لتجاوز مهلة أبل (24 ساعة) — من القائمة وهو ما يزال مخفياً/معلّقاً. المعالَج يُحذف بلاغه فيخرج منها."""
    with _conn() as c:
        rows = c.execute(
            """SELECT kind, target_id, COUNT(*) AS n, GROUP_CONCAT(DISTINCT reason) AS reasons,
                      MIN(created_at) AS first_at
               FROM content_reports GROUP BY kind, target_id ORDER BY first_at ASC, kind, target_id LIMIT ?""",
            (limit,),
        ).fetchall()
        out = []
        for r in rows:
            if r["kind"] == "group_message":
                t = c.execute("SELECT user_name AS author, text FROM group_messages WHERE id=?", (r["target_id"],)).fetchone()
            else:
                t = c.execute("SELECT author, symbol || ' ' || direction || ' — ' || COALESCE(note,'') AS text FROM votes WHERE id=?", (r["target_id"],)).fetchone()
            out.append({
                "kind": r["kind"],
                "target_id": r["target_id"],
                "reports": r["n"],
                "reasons": (r["reasons"] or "").split(","),
                "hidden_for_all": r["n"] >= REPORT_HIDE_THRESHOLD,
                "author": t["author"] if t else None,
                "text": t["text"] if t else None,
                "exists": t is not None,
            })
    return out


def count_reported_items() -> int:
    """عدد العناصر المعلّقة كلها (القائمة محدودة بـ200) — ليعرف المشرف أن بعدها المزيد."""
    with _conn() as c:
        return int(c.execute(
            "SELECT COUNT(*) FROM (SELECT 1 FROM content_reports GROUP BY kind, target_id)"
        ).fetchone()[0])


def moderate(kind: str, target_id: str, action: str) -> bool:
    """remove: حذف العنصر نهائياً (وأصوات الفكرة) + بلاغاته. dismiss: إسقاط البلاغات فيعود ظاهراً."""
    table = {"group_message": "group_messages", "vote": "votes"}.get(kind)
    if table is None:
        return False
    with _conn() as c:
        removed = 0
        if action == "remove":
            removed = c.execute(f"DELETE FROM {table} WHERE id=?", (target_id,)).rowcount
            if kind == "vote":
                c.execute("DELETE FROM vote_ballots WHERE vote_id=?", (target_id,))
        cur = c.execute("DELETE FROM content_reports WHERE kind=? AND target_id=?", (kind, target_id))
        # كان «remove» يعيد true دائماً ⇒ معرّف مكتوب خطأً «حُذف» والعنصر المُبلَّغ باقٍ
        return removed > 0 or cur.rowcount > 0


def _hidden_ids(c: sqlite3.Connection, kind: str, viewer_id: int | None) -> set[str]:
    """عناصر تُخفى عن هذا المشاهد: بلغت عتبة البلاغات، أو أبلغ هو عنها بنفسه (تختفي عنده فوراً)."""
    rows = c.execute(
        """SELECT target_id FROM content_reports WHERE kind=?
           GROUP BY target_id HAVING COUNT(*) >= ? OR SUM(reporter_id = ?) > 0""",
        (kind, REPORT_HIDE_THRESHOLD, viewer_id if viewer_id is not None else -1),
    ).fetchall()
    return {r["target_id"] for r in rows}


def group_messages(viewer_id: int | None = None, limit: int = 200) -> list[dict]:
    with _conn() as c:
        hidden = _hidden_ids(c, "group_message", viewer_id)
        # الحدّ بعد الإخفاء: كان `LIMIT` قبله ⇒ 150 رسالة سبام مُبلَّغ عنها بين آخر 200 تترك 50 ظاهرة والأقدم
        # السليمة لا تُجلب. جلب `limit + len(hidden)` يكفي دائماً (كل مخفيّ يُسقط صفّاً واحداً على الأكثر).
        rows = c.execute(
            "SELECT id,user_name,text,ts,created_at,user_id FROM group_messages ORDER BY rowid DESC LIMIT ?",
            (limit + len(hidden),),
        ).fetchall()
    rows = [r for r in rows if r["id"] not in hidden][:limit]
    rows.reverse()
    return [
        {
            "id": r["id"],
            "user": None if r["user_name"] in ("", _LEGACY_CHAT_USER) else r["user_name"],
            "text": r["text"],
            "ts": r["ts"],
            "created_at": r["created_at"],
            "room": "group",
            "mine": viewer_id is not None and r["user_id"] == viewer_id,
        }
        for r in rows
    ]


def _lock_author(c: sqlite3.Connection, user_id: int | None, name: str | None) -> None:
    """قفل كتابة ثم تحقّق أن الحساب ما يزال باسمه: المسار يقرأ الاسم عند المصادقة، وحذف حساب يُلتزم بين
    المصادقة والإدراج كان يترك رسالة/فكرة باسم المحذوف — اسم يصير متاحاً لمن يسجّله بعده. PermissionError."""
    if user_id is None:
        return
    c.execute("BEGIN IMMEDIATE")
    row = c.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if row is None or row["username"] != name:
        raise PermissionError("account gone")


def _lock_owner(c: sqlite3.Connection, user_id: int | None) -> None:
    """قفل كتابة ثم تحقّق أن للحساب جلسة بعد: المسار يصادق ثم يكتب، وحذف حساب يُلتزم بينهما (يمحو كل
    جلساته وبياناته) كان يترك صفقة/تنبيهاً/تخطيطاً باسم `user_id` المحذوف — بيانات شخصية لا يراها أحد
    ولا يمحوها حذف لاحق (شرط أبل 5.1.1(v)). المجهول (بلا حساب) يأخذ القفل وحده. PermissionError."""
    c.execute("BEGIN IMMEDIATE")
    if user_id is not None and c.execute("SELECT 1 FROM sessions WHERE user_id=?", (user_id,)).fetchone() is None:
        raise PermissionError("account gone")


def add_group_message(item: dict, user_id: int | None = None) -> dict:
    with _conn() as c:
        _lock_author(c, user_id, item["user"])
        c.execute(
            "INSERT INTO group_messages(id,user_name,text,ts,created_at,user_id) VALUES(?,?,?,?,?,?)",
            (item["id"], item["user"], item["text"], item["ts"], item.get("created_at"), user_id),
        )
    return item


def dm_peers() -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            """SELECT peer, text, ts FROM dm_messages d1
               WHERE rowid = (SELECT MAX(rowid) FROM dm_messages d2 WHERE d2.peer=d1.peer)"""
        ).fetchall()
    return [{"user": r["peer"], "last": r["text"], "ts": r["ts"]} for r in rows]


def dm_thread(peer: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT id,user_name,text,ts FROM dm_messages WHERE peer=? ORDER BY rowid",
            (peer,),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "user": r["user_name"],
            "text": r["text"],
            "ts": r["ts"],
            "room": "dm",
            "peer": peer,
        }
        for r in rows
    ]


def add_dm(item: dict) -> dict:
    with _conn() as c:
        c.execute(
            "INSERT INTO dm_messages(id,peer,user_name,text,ts) VALUES(?,?,?,?,?)",
            (item["id"], item["peer"], item["user"], item["text"], item["ts"]),
        )
    return item


# مؤلّف قديم ثابت كُتب لكل فكرة قبل ربطها بالحساب — يُعرض كمجهول لا «بواسطة أنت» للجميع
_LEGACY_VOTE_AUTHOR = "أنت"


def _vote_author(a: str | None) -> str | None:
    return None if not a or a == _LEGACY_VOTE_AUTHOR else a


def _vote_row(r, my_choice: str | None = None, viewer_id: int | None = None) -> dict:
    return {
        "id": r["id"],
        "symbol": r["symbol"],
        "direction": r["direction"],
        "entry": r["entry"],
        "sl": r["sl"],
        "tp": r["tp"],
        "note": r["note"] or "",
        "agree": r["agree"],
        "disagree": r["disagree"],
        "author": _vote_author(r["author"]),
        "ts": r["ts"],
        "created_at": r["created_at"],
        # صوت المستدعي على هذه الفكرة ('agree' | 'disagree') أو None (لم يصوّت / مجهول)
        "my_choice": my_choice,
        # فكرة المستدعي نفسه (ui2) — كرسائل المجموعة؛ المجهول لا يملك شيئاً
        "mine": viewer_id is not None and r["user_id"] == viewer_id,
    }


def list_votes(user_id: int | None = None, limit: int = 200) -> list[dict]:
    # بحدّ كمحادثة المجموعة (`group_messages` 200): كانت كل الأفكار منذ الإطلاق تُرسَل بكل فتح للشاشة
    # (مسار عامّ) — حساب واحد ينشر بحلقة يجعل كل تحميل ميغابايتات ويبطئ القاعدة للجميع.
    with _conn() as c:
        hidden = _hidden_ids(c, "vote", user_id)
        # الحدّ بعد الإخفاء (كمحادثة المجموعة): الأفكار المخفية كانت تستهلك من الـ200
        rows = c.execute("SELECT * FROM votes ORDER BY rowid DESC LIMIT ?", (limit + len(hidden),)).fetchall()
        rows = [r for r in rows if r["id"] not in hidden][:limit]
        mine: dict[str, str] = {}
        if user_id is not None:
            mine = {
                b["vote_id"]: b["choice"]
                for b in c.execute(
                    "SELECT vote_id, choice FROM vote_ballots WHERE user_id=?", (user_id,)
                ).fetchall()
            }
    return [_vote_row(r, mine.get(r["id"]), user_id) for r in rows]


def create_vote(item: dict, user_id: int | None = None) -> dict:
    with _conn() as c:
        _lock_author(c, user_id, item["author"])
        c.execute(
            """INSERT INTO votes(id,symbol,direction,entry,sl,tp,note,agree,disagree,author,ts,created_at,user_id)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                item["id"],
                item["symbol"],
                item["direction"],
                item["entry"],
                item["sl"],
                item["tp"],
                item["note"],
                item["agree"],
                item["disagree"],
                item["author"],
                item["ts"],
                item.get("created_at"),
                user_id,
            ),
        )
    return item


def ballot(vote_id: str, choice: str, user_id: int) -> dict | None:
    """صوت واحد لكل مستخدم على كل فكرة صفقة. كان كل طلب يزيد العدّاد بلا فحص «صوّت من قبل؟»
    فيقدر أي أحد يضخّم «نسبة الموافقة» بضغطات متكررة — مؤشر إجماع مضلِّل للمتداولين.
    الآن: أول صوت يُحتسب، نفس الخيار مجدداً لا يغيّر شيئاً، وتغيير الرأي ينقل الصوت (−1 من القديم،
    +1 للجديد) ضمن معاملة واحدة."""
    new_col = "agree" if choice == "agree" else "disagree"
    old_col = "disagree" if new_col == "agree" else "agree"
    with _conn() as c:
        # حساب حُذف بين المصادقة وهنا لا يترك صفّ صوت باسم `user_id` محذوف ولا يُحتسب صوته
        _lock_owner(c, user_id)
        if not c.execute("SELECT 1 FROM votes WHERE id=?", (vote_id,)).fetchone():
            return None
        if vote_id in _hidden_ids(c, "vote", user_id):
            # فكرة مخفية بالبلاغات لا تُقرأ نصّها من ردّ التصويت ولا تنمو «موافقتها» خفيةً
            return None
        # العدّاد يتحرّك فقط حين **تُغيِّر** الكتابة نفسها صفّ الصوت. كان الخيار السابق يُقرأ بـSELECT
        # (بلا قفل كتابة) ثم يُنقل الصوت: ضغطتان متزامنتان على «أعارض» (أو جهازان) تقرآن «أوافق»
        # كلتاهما فتنقلانه مرتين (موافقة −2، معارضة +2 ⇒ صوت متداول آخر يُمحى)، وأول صوتين متزامنين
        # يصطدم ثانيهما بالمفتاح الأساسي ⇒ 500. الكتابة الأولى تأخذ قفل SQLite فتنتظر الثانية حتى
        # تُثبَّت ثم لا تجد ما تغيّره (rowcount 0).
        if c.execute(
            "INSERT OR IGNORE INTO vote_ballots(vote_id,user_id,choice) VALUES(?,?,?)",
            (vote_id, user_id, new_col),
        ).rowcount == 1:
            c.execute(f"UPDATE votes SET {new_col}={new_col}+1 WHERE id=?", (vote_id,))
        elif c.execute(
            "UPDATE vote_ballots SET choice=? WHERE vote_id=? AND user_id=? AND choice=?",
            (new_col, vote_id, user_id, old_col),
        ).rowcount == 1:
            c.execute(
                f"UPDATE votes SET {old_col}=MAX({old_col}-1,0), {new_col}={new_col}+1 WHERE id=?",
                (vote_id,),
            )
        row = c.execute("SELECT * FROM votes WHERE id=?", (vote_id,)).fetchone()
    return _vote_row(row, new_col, user_id)


# ─── Push / layouts / watchlist / progress ────────────────────────────────────

def save_push_token(
    token: str,
    platform: str,
    user_id: int | None = None,
    lang: str | None = None,
    owner_key: str | None = None,
    session_token: str | None = None,
) -> None:
    """`session_token`: جلسة الطلب نفسها تُفحص تحت القفل — الطلب يصادق ثم ينتظر القفل، وخروج هذا الجهاز أو
    تغيير كلمة المرور (يُلغي جلسته ويفكّ رمزه) يُلتزم بينهما، و`_lock_owner` يكفيه أيّ جلسة للحساب ⇒ كان
    التسجيل الجاري يعيد ربط الهاتف بالحساب بعد الفكّ: الهاتف المشترك بعد «الخروج»، وهاتف الراعي بعد تغيير
    العضو كلمته، يتلقّيان تنبيهات الحساب. PermissionError (⇒ 401)."""
    with _conn() as c:
        _lock_owner(c, user_id)
        if user_id is not None and session_token is not None and c.execute(
            "SELECT 1 FROM sessions WHERE token=? AND user_id=?", (session_token, user_id)
        ).fetchone() is None:
            raise PermissionError("session gone")
        c.execute(
            """INSERT OR REPLACE INTO push_tokens(token,user_id,platform,updated_at,lang,owner_key)
               VALUES(?,?,?,?,?,?)""",
            (token, user_id, platform, time.time(), lang, owner_key),
        )


def logout_session(
    session_token: str, user_id: int, owner_key: str | None = None, push_token: str | None = None
) -> None:
    """خروج هذا الجهاز: تُلغى جلسته، ورمز Push الخاص به يُفكّ من الحساب. بلا هذا كان الخروج محلياً فقط
    (مسح التخزين): الجهاز يبقى `user_id=A` بـ`push_tokens` فتصل إشعارات تنبيهات A لمن يستعمل الهاتف بعده،
    والتوكن صالح حتى انتهائه. الجهاز يُعرَف بمعرّف التثبيت أو برمز Push نفسه."""
    with _conn() as c:
        c.execute("DELETE FROM sessions WHERE token=? AND user_id=?", (session_token, user_id))
        for col, val in (("owner_key", owner_key), ("token", push_token)):
            if val:
                c.execute(f"UPDATE push_tokens SET user_id=NULL WHERE user_id=? AND {col}=?", (user_id, val))


def change_password(
    user_id: int, session_token: str, current: str, new: str, owner_key: str | None = None
) -> None:
    """تغيير كلمة المرور بالحالية. العضو الذي يضعه راعيه (`place_under_sponsor`) يحمل كلمة كتبها الراعي
    أو استلمها `temp_password` ولم يكن له مسار لتغييرها ⇒ الراعي يدخل حسابه (دفتره، تنبيهاته، حذفه) للأبد.
    تُلغى كل الجلسات الأخرى ويُفكّ Push الأجهزة الأخرى (إلا جهاز هذا الطلب) — وإلا بقي هاتف الراعي
    يتلقّى إشعارات تنبيهات العضو. ValueError: الحالية خاطئة أو الجديدة قصيرة (حدّ التسجيل نفسه)."""
    if len(new or "") < PASSWORD_MIN:
        raise ValueError("password too short")
    with _conn() as c:
        c.execute("BEGIN IMMEDIATE")
        row = c.execute("SELECT password_hash FROM users WHERE id=?", (user_id,)).fetchone()
        if not row or not _verify_password(current, str(row["password_hash"]))[0]:
            raise ValueError("invalid current password")
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (_encode_password(new), user_id))
        c.execute("DELETE FROM sessions WHERE user_id=? AND token<>?", (user_id, session_token))
        # بلا معرّف تثبيت لا نعرف جهاز الطلب ⇒ يُفكّ الكل (كان `owner_key IS NOT NULL` فيبقى رمز قديم بلا
        # مفتاح — هاتف الراعي — مربوطاً ويتلقّى تنبيهات العضو). جهاز الطلب يعيد التسجيل عند فتح التطبيق.
        if owner_key:
            c.execute("UPDATE push_tokens SET user_id=NULL WHERE user_id=? AND owner_key IS NOT ?", (user_id, owner_key))
        else:
            c.execute("UPDATE push_tokens SET user_id=NULL WHERE user_id=?", (user_id,))


def all_push_tokens() -> list[str]:
    with _conn() as c:
        rows = c.execute("SELECT token FROM push_tokens").fetchall()
    return [r["token"] for r in rows]


def _push_owner_sql(user_id: int | None, owner_key: str | None) -> tuple[str, tuple]:
    """أجهزة مالك التنبيه: حساب المستخدم، أو — لتنبيه مجهول — الجهاز الذي أنشأه (`owner_key`، حتى لو
    سجّل الدخول بعدها). تنبيه مجهول قديم بلا مفتاح → الأجهزة المجهولة القديمة بلا مفتاح فقط (كان
    إشعار أي تنبيه مجهول يصل لكل جهاز غير مسجّل)."""
    if user_id:
        return "user_id=?", (user_id,)
    if owner_key:
        return "owner_key=?", (owner_key,)
    return "user_id IS NULL AND owner_key IS NULL", ()


def push_tokens_for(user_id: int | None, owner_key: str | None = None) -> list[str]:
    """Devices of one owner (see `_push_owner_sql`). Alert pushes used to go to every device."""
    sql, args = _push_owner_sql(user_id, owner_key)
    with _conn() as c:
        rows = c.execute(f"SELECT token FROM push_tokens WHERE {sql}", args).fetchall()
    return [r["token"] for r in rows]


def push_targets_for(
    user_id: int | None, owner_key: str | None = None, *, exclude_key: str | None = None
) -> list[tuple[str, str | None]]:
    """مثل `push_tokens_for` لكن مع لغة واجهة كل جهاز: [(token, lang)]. `exclude_key` = جهاز يُستثنى
    (الجهاز الذي فحص التنبيه بنفسه وأظهر إشعاره محلياً)."""
    sql, args = _push_owner_sql(user_id, owner_key)
    if exclude_key:
        sql, args = f"({sql}) AND owner_key IS NOT ?", (*args, exclude_key)
    with _conn() as c:
        rows = c.execute(f"SELECT token, lang FROM push_tokens WHERE {sql}", args).fetchall()
    return [(r["token"], r["lang"]) for r in rows]


def delete_push_token(token: str) -> None:
    with _conn() as c:
        c.execute("DELETE FROM push_tokens WHERE token = ?", (token,))


def _new_layout_id(c: sqlite3.Cursor) -> str:
    """معرّف تخطيط فريد فعلياً (لا يعتمد على ثانية الحفظ). ثانية الطابع الزمني القديمة
    كانت تتصادم بين مستخدمَين يحفظان بنفس الثانية → INSERT OR REPLACE يمحو تخطيط أحدهما."""
    for _ in range(6):
        cand = f"layout_{secrets.token_hex(6)}"
        if c.execute("SELECT 1 FROM layouts WHERE id=?", (cand,)).fetchone() is None:
            return cand
    return f"layout_{secrets.token_hex(12)}"


def save_layout(
    layout_id: str | None,
    name: str,
    payload: dict,
    user_id: int | None = None,
    owner_key: str | None = None,
) -> dict:
    """يحفظ تخطيطاً ويعيده بمعرّفه الفعلي.

    الأمان/الملكية: `id` مفتاح أساسي عام، و`INSERT OR REPLACE` كان يسمح بالكتابة فوق تخطيط الغير
    (وإعادة إسناد ملكيته) بإرسال المعرّف نفسه. الآن: يُكتب فوق الصف فقط إن كان ضمن ملكية المستدعي
    (`_owner_clause` — حسابه أو تخطيطات جهازه المجهولة)؛ وإلا يُخصَّص معرّف جديد (نسخته الخاصة)،
    فلا فقدان بيانات ولا اختطاف ملكية — ولا يكتب مجهول فوق تخطيط مجهول آخر بعد الآن.
    """
    local_id = layout_id
    with _conn() as c:
        _lock_owner(c, user_id)
        if layout_id:
            row = c.execute("SELECT 1 FROM layouts WHERE id=?", (layout_id,)).fetchone()
            if row is not None:
                sql, args = _owner_clause(user_id, owner_key)
                mine = c.execute(
                    f"SELECT 1 FROM layouts WHERE id=? AND {sql}", (layout_id, *args)
                ).fetchone()
                if mine is None:
                    # المعرّف المحلي (`l<ms>`) عند مالك آخر (الحساب قبل الخروج، جهاز آخر): كان كل حفظ لاحق
                    # يُنشئ صفاً جديداً (التطبيق لا يحفظ المعرّف المُعاد) ⇒ نسخ تتراكم، والجهاز الجديد يستعيد
                    # **أقدمها**. الآن نسخة المستدعي السابقة لنفس المعرّف المحلي تُكتب فوقها.
                    own = c.execute(
                        f"SELECT id FROM layouts WHERE json_extract(payload, '$.id')=? AND {sql} "
                        "ORDER BY updated_at DESC LIMIT 1",
                        (layout_id, *args),
                    ).fetchone()
                    layout_id = own["id"] if own is not None else None
        if not layout_id:
            layout_id = _new_layout_id(c)
        if local_id:
            # نسخ قديمة للتخطيط المحلي نفسه عند المستدعي (من الحفظ القديم، أو ضمّ صفوف الجهاز للحساب) تُزال
            sql, args = _owner_clause(user_id, owner_key)
            c.execute(
                f"DELETE FROM layouts WHERE id<>? AND json_extract(payload, '$.id')=? AND {sql}",
                (layout_id, local_id, *args),
            )
        c.execute(
            """INSERT OR REPLACE INTO layouts(id,user_id,owner_key,name,payload,updated_at)
               VALUES(?,?,?,?,?,?)""",
            (layout_id, user_id, owner_key, name, json.dumps(payload), time.time()),
        )
    return {"id": layout_id, "name": name, "payload": payload}


def delete_layout(layout_id: str, user_id: int | None = None, owner_key: str | None = None) -> int:
    """يحذف تخطيط المستدعي بمعرّفه — أو بمعرّفه المحلي داخل الحمولة (`payload.id`): الحفظ القديم كان يُنشئ
    صفاً بمعرّف خادم جديد بكل حفظ لنفس التخطيط المحلي، فالحذف بالمعرّف المحلي يزيل كل تلك النسخ."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(
            f"DELETE FROM layouts WHERE (id=? OR json_extract(payload, '$.id')=?) AND {sql}",
            (layout_id, layout_id, *args),
        )
    return cur.rowcount


def list_layouts(user_id: int | None = None, owner_key: str | None = None) -> list[dict]:
    """تخطيطات المستدعي فقط (`_owner_clause`). كانت تُعيد كل تخطيطات المجهولين لأي مستدعٍ."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        rows = c.execute(
            f"SELECT id,name,payload FROM layouts WHERE {sql} ORDER BY updated_at", args
        ).fetchall()
    out = []
    for r in rows:
        out.append({"id": r["id"], "name": r["name"], "payload": json.loads(r["payload"])})
    # نسخ متعدّدة لنفس التخطيط المحلي (`payload.id`) من الحفظ القديم: التطبيق يأخذ **أولها** (الأقدم) ⇒
    # كان يستعيد نسخة قديمة. تبقى الأحدث وحدها بموضعها.
    newest: dict = {}
    for i, item in enumerate(out):
        pid = item["payload"].get("id") if isinstance(item["payload"], dict) else None
        if isinstance(pid, str):
            newest[pid] = i
    return [
        item for i, item in enumerate(out)
        if not (isinstance(item["payload"], dict) and isinstance(item["payload"].get("id"), str)
                and newest[item["payload"]["id"]] != i)
    ]


def get_watchlist(user_id: int | None = None, owner_key: str | None = None) -> list[str]:
    """رموز المستدعي المخصّصة (`_owner_clause`)، بلا تكرار — المسجّل يرى أيضاً ما أضافه جهازه قبل الدخول."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        rows = c.execute(
            f"SELECT symbol FROM watchlist WHERE {sql} ORDER BY sort_order, rowid", args
        ).fetchall()
    out: list[str] = []
    for r in rows:
        if r["symbol"] not in out:
            out.append(r["symbol"])
    return out


def add_watchlist_symbol(
    symbol: str, user_id: int | None = None, owner_key: str | None = None
) -> list[str]:
    """يضيف رمزاً لقائمة المستدعي. التكرار يُفحص صراحةً: المفتاح الأساسي (user_id, symbol) لا يمنعه
    لصفوف المجهول لأن NULL لا يتساوى بـSQLite (كان كل ضغط «أضف» يُكرّر الرمز). يُقصّ كالحذف: « gbpusd»
    كان يُحفظ بمسافته والحذف يقصّ ⇒ `removed: 0` دائماً فلا يُزال أبداً."""
    sym = symbol.strip().upper()
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        _lock_owner(c, user_id)
        exists = c.execute(
            f"SELECT 1 FROM watchlist WHERE symbol=? AND {sql}", (sym, *args)
        ).fetchone()
        if exists is None:
            mx = c.execute(
                f"SELECT COALESCE(MAX(sort_order),0) FROM watchlist WHERE {sql}", args
            ).fetchone()[0]
            c.execute(
                "INSERT OR IGNORE INTO watchlist(user_id,owner_key,symbol,sort_order) VALUES(?,?,?,?)",
                (user_id, owner_key, sym, int(mx) + 1),
            )
    return get_watchlist(user_id, owner_key)


def remove_watchlist_symbol(
    symbol: str, user_id: int | None = None, owner_key: str | None = None
) -> tuple[int, list[str]]:
    """يحذف رمزاً من قائمة المستدعي ويعيد (عدد الصفوف المحذوفة، القائمة بعد الحذف).

    **بنفس شرط الملكية الذي يقرأ به** (`_owner_clause`) لا بـ`user_id` وحده: الرمز الذي أضافه
    الجهاز قبل إنشاء الحساب يظهر للمسجّل (`get_watchlist` يتبنّاه) — فحذفٌ بشرط أضيق كان يعني
    رمزاً يراه المتداول ولا يقدر إزالته أبداً.

    ويحذف **كل** الصفوف المطابقة لا صفّاً واحداً: الصفّ المجهول والصفّ المسجّل يحملان الرمز
    نفسه معاً، و`get_watchlist` يخفي التكرار بالعرض — فحذف صفٍّ واحد كان يُبقي الرمز ظاهراً
    كأن «إزالة» لم تعمل."""
    sym = symbol.strip().upper()
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM watchlist WHERE symbol=? AND {sql}", (sym, *args))
        removed = cur.rowcount
    return removed, get_watchlist(user_id, owner_key)


def save_progress(
    user_id: int,
    school_id: str,
    lecture_id: str,
    segment_index: int,
    completed: bool = False,
) -> dict:
    with _conn() as c:
        _lock_owner(c, user_id)
        # `completed` **يُثبَّت ولا يُخفَّض**: كان `INSERT OR REPLACE` يكتب الصفّ كاملاً، فمحاضرة
        # أنهاها المتداول ثم أعاد فتحها لمراجعة المقدّمة تُكتب فوراً `completed=0` — أي أن إعادة
        # المشاهدة تمحو الإنجاز. الموضع (`segment_index`) يتبع آخر مكان فعلاً (يصحّ أن يرجع
        # للخلف عند إعادة المشاهدة)، أما «أنهاها» فحدثٌ وقع ولا يُلغى بفتحها ثانيةً.
        c.execute(
            """INSERT INTO academy_progress
               (user_id,school_id,lecture_id,segment_index,completed,updated_at)
               VALUES(?,?,?,?,?,?)
               ON CONFLICT(user_id,school_id,lecture_id) DO UPDATE SET
                 segment_index=excluded.segment_index,
                 completed=MAX(academy_progress.completed, excluded.completed),
                 updated_at=excluded.updated_at""",
            (user_id, school_id, lecture_id, segment_index, int(completed), time.time()),
        )
        row = c.execute(
            """SELECT segment_index, completed FROM academy_progress
               WHERE user_id=? AND school_id=? AND lecture_id=?""",
            (user_id, school_id, lecture_id),
        ).fetchone()
    # يُعاد الصفّ **كما استقرّ بالقاعدة** لا كما وصل بالطلب: بعد التثبيت أعلاه قد يختلفان،
    # والعميل يبني عليه («أكمل من حيث توقفت» يقرأ هذا الردّ).
    return {
        "school_id": school_id,
        "lecture_id": lecture_id,
        "segment_index": int(row["segment_index"]) if row else segment_index,
        "completed": bool(row["completed"]) if row else completed,
    }


def get_progress(user_id: int) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM academy_progress WHERE user_id=?", (user_id,)
        ).fetchall()
    return [
        {
            "school_id": r["school_id"],
            "lecture_id": r["lecture_id"],
            "segment_index": r["segment_index"],
            "completed": bool(r["completed"]),
        }
        for r in rows
    ]


# ─── Indicator alerts ─────────────────────────────────────────────────────────

def list_indicator_alerts(
    user_id: int | None = None, *, all_users: bool = False, owner_key: str | None = None
) -> list[dict]:
    """Same visibility rule as list_alerts (see there)."""
    with _conn() as c:
        if all_users:
            rows = c.execute("SELECT * FROM indicator_alerts ORDER BY ts DESC").fetchall()
            return [
                {**_ind_alert_row(r), "user_id": r["user_id"], "owner_key": r["owner_key"]} for r in rows
            ]
        sql, args = _owner_clause(user_id, owner_key)
        rows = c.execute(
            f"SELECT * FROM indicator_alerts WHERE {sql} ORDER BY ts DESC", args
        ).fetchall()
    return [_ind_alert_row(r) for r in rows]


def _ind_alert_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "symbol": r["symbol"],
        "timeframe": r["timeframe"],
        "alert_type": r["alert_type"],
        "condition": r["condition"],
        "value": r["value"],
        "fast_period": r["fast_period"],
        "slow_period": r["slow_period"],
        "note": r["note"] or "",
        "active": bool(r["active"]),
        "triggered": bool(r["triggered"]),
        "ts": r["ts"],
        "fired_bar": r["fired_bar"],
    }


def create_indicator_alert(
    data: dict, user_id: int | None = None, owner_key: str | None = None
) -> dict:
    with _conn() as c:
        _lock_owner(c, user_id)
        c.execute(
            """INSERT INTO indicator_alerts
               (id,user_id,owner_key,symbol,timeframe,alert_type,condition,value,fast_period,slow_period,note,active,triggered,ts)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,1,0,?)""",
            (
                data["id"],
                user_id,
                owner_key,
                data["symbol"],
                data["timeframe"],
                data["alert_type"],
                data["condition"],
                data.get("value"),
                data.get("fast_period", 9),
                data.get("slow_period", 21),
                data.get("note", ""),
                data["ts"],
            ),
        )
    return data


def rearm_indicator_alert(
    alert_id: str, user_id: int | None = None, owner_key: str | None = None
) -> dict | None:
    """يعيد تنبيه مؤشر أُطلق إلى «يراقب» (triggered=0, active=1) — لمالكه فقط (`_owner_clause`).

    `ts` = لحظة إعادة التسليح (كـ`update_alert` للسعر): كان يبقى وقت الإنشاء، فتقاطع شمعة D انتهت
    قبل إعادة التسليح يمرّ من `cross_predates_arming` ويُطلق ثانيةً. و`fired_bar` يبقى ⇒ الشمعة التي
    أُطلق عليها لا تُطلقه مرّة أخرى وهي ما تزال جارية (`alert_worker.cross_is_stale`)."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(
            f"UPDATE indicator_alerts SET triggered=0, active=1, ts=? WHERE id=? AND {sql}",
            (datetime.now(timezone.utc).isoformat(), alert_id, *args),
        )
        if cur.rowcount == 0:
            return None
        r = c.execute("SELECT * FROM indicator_alerts WHERE id=?", (alert_id,)).fetchone()
    return _ind_alert_row(r) if r else None


def delete_indicator_alert(
    alert_id: str, user_id: int | None = None, owner_key: str | None = None
) -> bool:
    """Same ownership rule as delete_alert."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM indicator_alerts WHERE id=? AND {sql}", (alert_id, *args))
    return cur.rowcount > 0


def _migrate_trades(c: sqlite3.Connection) -> None:
    c.execute(
        """CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            entry REAL NOT NULL,
            exit REAL,
            size REAL DEFAULT 1,
            pnl REAL,
            note TEXT,
            opened_at TEXT NOT NULL,
            closed_at TEXT,
            status TEXT NOT NULL DEFAULT 'open'
        )"""
    )
    # وقف/هدف اختياريان لخطة الصفقة (R:R والنتيجة بالـR بالواجهة) — عمودان يُضافان لقواعد قائمة.
    cols = {r[1] for r in c.execute("PRAGMA table_info(trades)").fetchall()}
    if "sl" not in cols:
        c.execute("ALTER TABLE trades ADD COLUMN sl REAL")
    if "tp" not in cols:
        c.execute("ALTER TABLE trades ADD COLUMN tp REAL")
    # `pnl` مشتقّ كلياً من (side, entry, exit): صفقات أُغلقت قبل d2417d6 (2026-09-22) خُزّنت `نسبة × الحجم`
    # ⇒ ربح 1% بـ10 لوت = «10%» يتصدّر أفضل صفقة ومتوسط الربح ومجموع النتائج إلى الأبد. يُعاد الحساب
    # لكل صفقة مغلقة يختلف رقمها المخزَّن (عمليةٌ لا تغيّر صفاً صحيحاً، فتكرارها بكل إقلاع آمن).
    fixes = []
    for r in c.execute(
        "SELECT id, side, entry, exit, pnl FROM trades WHERE status='closed' AND exit IS NOT NULL"
    ).fetchall():
        want = _pnl_pct(r[1], r[2], r[3])
        if r[4] != want and not (want is not None and r[4] is not None and abs(r[4] - want) < 1e-9):
            fixes.append((want, r[0]))
    if fixes:
        c.executemany("UPDATE trades SET pnl=? WHERE id=?", fixes)


def _opt_level(v) -> float | None:
    """سعر وقف/هدف اختياري: رقم موجب منتهٍ وإلا None."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f > 0 and f != float("inf") else None


PNL_PCT_MAX = 1e15


def _pnl_pct(side: str, entry: float, exit_price: float) -> float | None:
    """نسبة حركة السعر فقط — الحساب الوحيد بالملف (`add_trade`/`close_trade`/`update_trade` تستدعيه).

    **سعر دخول غير موجب يعيد None لا ZeroDivisionError**: المُصادِق يرفضه الآن عند الإنشاء، لكن صفّاً
    قديماً حُفظ قبل ذلك (`entry=0`) كان يجعل كل محاولة إغلاق تسقط بـ500 — أي صفقة عالقة مفتوحة
    للأبد لا يملك المتداول إزالتها إلا بحذفها. الآن تُغلق بنتيجة غير محسوبة (`pnl=None`، تتخطّاها
    الإحصاءات أصلاً)، ويستعيدها تصحيح سعر الدخول بـPATCH — فهو يعيد الحساب."""
    if not entry or entry <= 0:
        return None
    # **خروج غير موجب يعيد None كالدخول**: المُصادِق يرفضه الآن، لكن صفّاً قديماً بـ`exit=0` كان يُعاد حسابه بكل
    # إقلاع (`_migrate_trades`) خسارةَ −100% (أو −554% لخروج سالب) تدخل نسبة الفوز والمجموع و«أسوأ صفقة» —
    # نتيجة لم تحدث. الآن «غير محسوبة» حتى يصحّح المتداول الخروج بـPATCH.
    if exit_price is None or not exit_price > 0:
        return None
    if side == "buy":
        pnl = (exit_price - entry) / entry * 100
    else:
        pnl = (entry - exit_price) / entry * 100
    # **نتيجة خارج المدى تعيد None**: المُصادِق يقبل أيّ سعر موجب منتهٍ، فدخول 1e-300 وخروج 1e308 = `pnl=inf`
    # ⇒ الردّ لا يُسلسَل JSON ‏(500) ولا يعرف التطبيق رقم الصفقة ليحذفها، وكل طلب دفتر بعدها 500 لأنه يعيد
    # `trade_stats`. وصفقتان بـ1e306% منتهيتان لكن مجموعهما inf. سقف 1e15% (لا حركة سعر حقيقية تقاربه، وخطأ
    # كتابة كدخول 0.00001 بدل 1.1 ≈ 1e7% يبقى محسوباً) يجعل أيّ مجموع للصفوف منتهياً.
    if not math.isfinite(pnl) or abs(pnl) > PNL_PCT_MAX:
        return None
    return pnl


# صفحة الدفتر الافتراضية وسقفها. القائمة وحدها تُرقَّم — الإحصاءات تُحسب على **كل** الصفقات.
TRADES_PAGE = 200
TRADES_PAGE_MAX = 500


def list_trades(
    user_id: int | None = None,
    owner_key: str | None = None,
    limit: int = TRADES_PAGE,
    offset: int = 0,
) -> list[dict]:
    """Journal visible to the caller — same ownership rule as alerts (`_owner_clause`): an
    anonymous device used to see (and close/delete) every anonymous trader's journal.
    صفحة واحدة: **المفتوحة أولاً** ثم الأحدث (tools103b) — بترتيب «الأحدث» وحده كانت صفقة مفتوحة
    أقدم من أحدث 200 لا تصل التطبيق فيغيب خطرها عن مجموع المخاطر المفتوحة وتراكم العملة.
    `count_trades` يعطي الإجمالي ليعرف العميل أن هناك المزيد."""
    sql, args = _owner_clause(user_id, owner_key)
    limit = max(1, min(int(limit), TRADES_PAGE_MAX))
    offset = max(0, int(offset))
    with _conn() as c:
        rows = c.execute(
            f"SELECT * FROM trades WHERE {sql} ORDER BY (status='open') DESC, opened_at DESC, id DESC LIMIT ? OFFSET ?",
            (*args, limit, offset),
        ).fetchall()
    out = [dict(r) for r in rows]
    for r in out:
        r.pop("owner_key", None)  # معرّف التثبيت سرّ الجهاز — لا يُعاد بالاستجابة
    return out


def count_trades(
    user_id: int | None = None, owner_key: str | None = None, *, status: str | None = None
) -> int:
    sql, args = _owner_clause(user_id, owner_key)
    if status is not None:
        sql, args = f"({sql}) AND status=?", (*args, status)
    with _conn() as c:
        return int(c.execute(f"SELECT COUNT(*) FROM trades WHERE {sql}", args).fetchone()[0])


def _trade_owner_clause(user_id: int | None, owner_key: str | None = None) -> tuple[str, tuple]:
    """Same ownership rule as alerts."""
    return _owner_clause(user_id, owner_key)


def add_trade(data: dict, user_id: int | None = None, owner_key: str | None = None) -> dict:
    # معرّف بدقّة ميلي ثانية وحده كان يتصادم بين مستخدمَين يسجّلان بنفس اللحظة → IntegrityError (500)
    tid = data.get("id") or f"t{int(time.time() * 1000)}{secrets.token_hex(3)}"
    row = {
        "id": tid,
        "user_id": user_id,
        "symbol": data["symbol"].upper(),
        "side": data["side"],
        "entry": float(data["entry"]),
        "exit": float(data["exit"]) if data.get("exit") is not None else None,
        # None = لم يُكتب حجم. كان `float(size or 1)` فيُحفظ «1.00 لوت» لم يكتبه المتداول أحد.
        "size": float(data["size"]) if data.get("size") is not None else None,
        "pnl": float(data["pnl"]) if data.get("pnl") is not None else None,
        "note": data.get("note") or "",
        "sl": _opt_level(data.get("sl")),
        "tp": _opt_level(data.get("tp")),
        "opened_at": data.get("opened_at") or time.strftime("%Y-%m-%d %H:%M"),
        "closed_at": data.get("closed_at"),
        "status": data.get("status") or ("closed" if data.get("exit") is not None else "open"),
    }
    if row["exit"] is not None and row["pnl"] is None:
        # نسبة حركة السعر فقط (الوحدة المعروضة «%»): «% × الحجم» كان رقماً بلا وحدة مفهومة لحجم ≠ 1.
        # الحساب بـ_pnl_pct لا بنسخة ثالثة منه: النسخ المكرّرة كانت ترمي ZeroDivisionError على entry=0.
        row["pnl"] = _pnl_pct(row["side"], row["entry"], row["exit"])
        row["status"] = "closed"
        # «الآن» وقت إغلاق فقط إن سُجّلت الصفقة الآن (بلا `opened_at`). صفقة أغسطس تُسجَّل اليوم كانت
        # تُحفظ مغلقة اليوم (ومفتوحة بعد إغلاقها إن كان الفتح +4د) ⇒ null «غير معروف» لا تاريخ مخترَع.
        if not row["closed_at"] and not data.get("opened_at"):
            row["closed_at"] = time.strftime("%Y-%m-%d %H:%M")
    with _conn() as c:
        _lock_owner(c, user_id)
        c.execute(
            """INSERT INTO trades
               (id,user_id,owner_key,symbol,side,entry,exit,size,pnl,note,sl,tp,opened_at,closed_at,status)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                row["id"],
                row["user_id"],
                owner_key,
                row["symbol"],
                row["side"],
                row["entry"],
                row["exit"],
                row["size"],
                row["pnl"],
                row["note"],
                row["sl"],
                row["tp"],
                row["opened_at"],
                row["closed_at"],
                row["status"],
            ),
        )
    return row


def _in_dst_fold(stamp: str) -> bool:
    """`YYYY-MM-DD HH:MM` بتوقيت الخادم يقع في الساعة المكرَّرة عند نهاية التوقيت الصيفي (02:00–02:59 مرّتين
    بأوروبا) ⇒ لا تُعرف أيّ المرّتين هو."""
    try:
        dt = datetime.strptime(stamp, "%Y-%m-%d %H:%M")
        return dt.replace(fold=0).astimezone().utcoffset() != dt.replace(fold=1).astimezone().utcoffset()
    except (ValueError, OverflowError, OSError):
        return False


def journal_time_before(a: str, b: str) -> bool:
    """وقت الدفتر `a` يسبق `b` **يقيناً**. المقارنة النصّية زمنية إلا في الساعة المكرَّرة: صفقة كريبتو فُتحت 02:40
    (صيفي) وأُغلقت بعد 30 دقيقة = 02:10 (شتوي) كانت تُرفض «الإغلاق قبل الفتح» (422) بالإنشاء والإغلاق والتعديل،
    والإغلاق «الآن» يُختم 02:40 — وقت إغلاق مختلَق بعد الحقيقي بنصف ساعة. كلاهما داخل الساعة ⇒ لا يُحكم بالسبق.
    (خادم UTC — صورة Docker — بلا ساعة مكرَّرة.)"""
    return a < b and not (_in_dst_fold(a) and _in_dst_fold(b))


def _close_stamp(opened_at: str | None) -> str:
    """وقت إغلاق «الآن» لا يسبق الفتح: الفتح يُقبل حتى +5 دقائق (فرق ساعة الجهاز — TradeCreate) فصفقة تُغلق
    فوراً كانت تُحفظ مغلقة قبل فتحها (مدّة سالبة). الصيغة نفسها `%Y-%m-%d %H:%M` ⇒ المقارنة النصّية زمنية
    (عدا الساعة المكرَّرة — `journal_time_before`)."""
    now = time.strftime("%Y-%m-%d %H:%M")
    if opened_at and len(opened_at) == len(now) and journal_time_before(now, opened_at):
        return opened_at
    return now


class TradeAlreadyClosed(Exception):
    """إغلاق صفقة مغلقة أصلاً. `trade` = الصفّ كما هو مخزَّن (بخروجه الأول)."""

    def __init__(self, trade: dict):
        super().__init__("trade already closed")
        self.trade = trade


def close_trade(
    trade_id: str, exit_price: float, user_id: int | None = None, owner_key: str | None = None,
    expect: dict | None = None, closed_at: str | None = None,
) -> dict | None:
    """يغلق صفقة **مفتوحة** فقط. كان `UPDATE … WHERE id=?` بلا شرط الحالة: جهازان يُغلقان الصفقة
    نفسها معاً ⇒ الثاني يمحو خروج الأول المسجَّل ونتيجته. الآن الشرط `status='open'` داخل
    التحديث نفسه (ذرّي بـSQLite) ⇒ الثاني يتلقّى `TradeAlreadyClosed` بالخروج الأول كما هو.
    تصحيح خروج مسجَّل عمداً يبقى عبر PATCH (`update_trade`).
    `expect` (`seen_*` من نافذة التأكيد): مختلف عن المخزَّن ⇒ `TradeUpdateConflict` بقاعدة `update_trade`.
    `closed_at` (بصيغة الدفتر، tools130c): وقت الإغلاق الحقيقي بدل «الآن»؛ يسبق `opened_at` ⇒ `TradeCloseTimeInvalid`."""
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
    # النتيجة تُحسب من الدخول والاتجاه المقروءين: PATCH يصحّح الدخول من جهاز آخر بين القراءة والتحديث
    # كان يُكتب بعده `pnl` من الدخول القديم (شراء 1.2 صُحّح لـ1.1 وأُغلق 1.15 ⇒ −4.17% مخزّنة بدل +4.55%،
    # رابحة تُعدّ خاسرة بنسبة الفوز). التحديث مشروط بهما أيضاً؛ تغيّرا ⇒ تُعاد القراءة والحساب.
    for _ in range(_UPDATE_TRADE_ATTEMPTS):
        row = _try_close_trade(trade_id, exit_price, owner_sql, owner_args, expect or {}, closed_at)
        if row is not _STALE:
            return row
    raise TradeUpdateConflict(trade_id)


def _try_close_trade(
    trade_id: str, exit_price: float, owner_sql: str, owner_args: tuple, expect: dict, closed_at: str | None = None
):
    with _conn() as c:
        r = c.execute(
            f"SELECT * FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args)
        ).fetchone()
        if not r:
            return None
        row = dict(r)
        row.pop("owner_key", None)
        if row.get("status") != "open":
            raise TradeAlreadyClosed(row)
        seen = {k: row.get(k) for k in _TRADE_WRITE_COLS}
        if any(_seen_cmp(k, seen[k]) != _seen_cmp(k, v) for k, v in expect.items()):
            raise TradeUpdateConflict(trade_id)
        # نسبة حركة السعر فقط — راجع add_trade. None لصفّ قديم بدخول غير موجب (بدل 500 دائم).
        pnl = _pnl_pct(row["side"], float(row["entry"]), exit_price)
        if closed_at is None:
            closed_at = _close_stamp(row.get("opened_at"))
        elif row.get("opened_at") and journal_time_before(closed_at, str(row["opened_at"])):
            raise TradeCloseTimeInvalid("closed_at is before opened_at")
        cur = c.execute(
            f"UPDATE trades SET exit=?, pnl=?, closed_at=?, status='closed' "
            f"WHERE id=? AND {_SEEN_SQL} AND {owner_sql}",
            (exit_price, pnl, closed_at, trade_id, *(seen[k] for k in _TRADE_WRITE_COLS), *owner_args),
        )
        if cur.rowcount != 1:
            now = c.execute("SELECT * FROM trades WHERE id=?", (trade_id,)).fetchone()
            if now is None:
                return None  # حُذفت بين القراءة والتحديث
            won = dict(now)
            won.pop("owner_key", None)
            if won.get("status") != "open":
                raise TradeAlreadyClosed(won)  # سبقنا جهاز آخر بالإغلاق
            return _STALE  # ما تزال مفتوحة لكن صفّها تغيّر ⇒ إعادة القراءة (وفحص `expect`) والحساب
        row.update({"exit": exit_price, "pnl": pnl, "closed_at": closed_at, "status": "closed"})
        return row


def update_trade(
    trade_id: str, fields: dict, user_id: int | None = None, owner_key: str | None = None,
    expect: dict | None = None,
) -> dict | None:
    """تعديل صفقة يملكها المستدعي. `fields` يحوي ما أُرسل فقط؛ exit/sl/tp/size = None تعني مسحاً.
    النتيجة (`pnl`) والحالة تُعاد حسابهما من الدخول/الخروج/الاتجاه بعد التعديل: خطأ كتابة بسعر الدخول
    كان يُفسد نسبة النجاح وصافي النقاط للأبد (الحلّ الوحيد كان الحذف وإعادة الكتابة).
    `expect` ({"status"/"exit": ما رآه العميل}): الصفّ المخزَّن مختلف ⇒ `TradeUpdateConflict` بلا إعادة محاولة —
    الإعادة أدناه تحمي نافذة القراءة-الكتابة بالخادم فقط، لا نموذجاً فُتح قبل دقائق على جهاز آخر."""
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
    # قراءة-تعديل-كتابة للصفّ كلّه: إغلاقٌ من جهاز آخر بين القراءة والكتابة كانت الكتابة تمحوه
    # (تعيد exit/status القديمين من الصفّ المقروء) — نفس ضرر إغلاق الصفقة مرّتين. الكتابة الآن
    # مشروطة بأن الخروج والحالة لم يتغيّرا منذ القراءة؛ وإلا تُعاد القراءة ويُطبَّق التعديل على الجديد.
    for _ in range(_UPDATE_TRADE_ATTEMPTS):
        row = _try_update_trade(trade_id, fields, owner_sql, owner_args, expect or {})
        if row is not _STALE:
            return row
    raise TradeUpdateConflict(trade_id)


_UPDATE_TRADE_ATTEMPTS = 3
_STALE = object()
# كل عمود يعيد PATCH كتابته من الصفّ المقروء: كان الشرط الخروج والحالة وحدهما ⇒ تعديلان متزامنان (دخول
# من جهاز واتجاه من آخر) يعيد الثاني فيهما دخول الأول القديم فيُمحى تصحيحه بصمت، و`pnl` من الخليط.
# `opened_at` منها منذ tools150c (صار قابلاً للتعديل): تصحيح وقت الفتح من جهاز لا يُمحى بحفظ جهاز آخر.
_TRADE_WRITE_COLS = (
    "symbol", "side", "entry", "exit", "size", "pnl", "note", "sl", "tp", "opened_at", "closed_at", "status",
)
_SEEN_SQL = " AND ".join(f"{k} IS ?" for k in _TRADE_WRITE_COLS)


def _seen_cmp(col: str, v):
    """قيمة عمود كما يراها العميل: صفوف قديمة بخروج 0 (−100% قبل اشتراط الموجب) أو وقف 0 تصل النموذج
    «بلا قيمة» ولا يستطيع إرسال 0 (422) ⇒ كانت كل محاولة تعديل — الطريق الوحيد لتصحيحها — تعيد 409 للأبد."""
    if col in ("exit", "sl", "tp", "size"):
        return _opt_level(v)
    if col == "note":
        return v or ""
    if col == "symbol":
        return str(v).strip().upper() if v is not None else None
    return v


class TradeCloseTimeInvalid(ValueError):
    """`closed_at` بتعديل صفقة تبقى مفتوحة، أو يسبق وقت فتحها."""


class TradeOpenTimeInvalid(TradeCloseTimeInvalid):
    """`opened_at` جديد بعد وقت إغلاق الصفقة (المخزَّن أو المُرسَل معه)."""


class TradeUpdateConflict(Exception):
    """الصفقة تتغيّر (إغلاق/خروج) باستمرار بين القراءة والكتابة — لا نكتب فوق ما لم نقرأه."""


def _try_update_trade(trade_id: str, fields: dict, owner_sql: str, owner_args: tuple, expect: dict):
    with _conn() as c:
        r = c.execute(
            f"SELECT * FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args)
        ).fetchone()
        if not r:
            return None
        row = dict(r)
        row.pop("owner_key", None)
        seen = {k: row.get(k) for k in _TRADE_WRITE_COLS}
        if any(_seen_cmp(k, seen[k]) != _seen_cmp(k, v) for k, v in expect.items()):
            raise TradeUpdateConflict(trade_id)
        if "symbol" in fields:
            row["symbol"] = str(fields["symbol"]).strip().upper()
        if "side" in fields and fields["side"] in ("buy", "sell"):
            row["side"] = fields["side"]
        if "entry" in fields:
            row["entry"] = float(fields["entry"])
        if "size" in fields:
            # None = «حجم غير معروف» (كالإنشاء): صفوف قديمة حُفظت «1 لوت» افتراضياً لم يكتبه أحد، ولا طريق غيره لمسحه.
            row["size"] = float(fields["size"]) if fields["size"] is not None else None
        if "note" in fields:
            row["note"] = fields["note"] or ""
        # tools150c: صفقة سُجّلت بوقت «الآن» خطأً لا يُصحَّح فتحها أبداً (وإغلاقها الحقيقي يسبقه ⇒ 422). يُطبَّق قبل
        # الخروج ⇒ «الآن» لإغلاق بهذا التعديل (`_close_stamp`) وفحص `closed_at` يريان الفتح الجديد.
        if "opened_at" in fields:
            row["opened_at"] = fields["opened_at"]
        for k in ("sl", "tp"):
            if k in fields:
                row[k] = _opt_level(fields[k])
        if "exit" in fields:
            ex = _opt_level(fields["exit"])
            row["exit"] = ex
            if ex is None:
                row.update({"pnl": None, "closed_at": None, "status": "open"})
            else:
                # «الآن» فقط لصفقة كانت مفتوحة فتُغلق بهذا التعديل. تصحيح خروج صفقة مغلقة سُجّلت بأثر رجعي
                # (`closed_at` null «غير معروف» — add_trade) كان يختلق لها تاريخ إغلاق = اليوم.
                if seen["exit"] is None and "closed_at" not in fields:
                    row["closed_at"] = row.get("closed_at") or _close_stamp(row.get("opened_at"))
                row["status"] = "closed"
        if "closed_at" in fields:
            # run 91: وقت الإغلاق الحقيقي من العميل (null = غير معروف) — «الآن» لإعادة إغلاق صفقة أُعيد فتحها
            # بالتعديل كان تاريخاً مختلَقاً
            ca = fields["closed_at"]
            if ca is not None:
                if row.get("exit") is None:
                    raise TradeCloseTimeInvalid("closed_at needs exit")
                if row.get("opened_at") and journal_time_before(ca, str(row["opened_at"])):
                    raise TradeCloseTimeInvalid("closed_at is before opened_at")
            row["closed_at"] = ca if row.get("exit") is not None else None
        if "opened_at" in fields and row.get("closed_at") and journal_time_before(
            str(row["closed_at"]), str(row["opened_at"])
        ):
            # الإغلاق بعد الدمج (المخزَّن أو المُرسَل) يسبق الفتح الجديد. الفحص حين يُعدَّل الفتح فقط: صفّ قديم
            # مقلوب لا يصير 409/422 دائماً لكل حفظ ملاحظة.
            raise TradeOpenTimeInvalid("opened_at is after closed_at")
        if row.get("exit") is not None:
            row["pnl"] = _pnl_pct(row["side"], float(row["entry"]), float(row["exit"]))
        cur = c.execute(
            f"""UPDATE trades SET symbol=?, side=?, entry=?, exit=?, size=?, pnl=?, note=?, sl=?, tp=?,
                opened_at=?, closed_at=?, status=? WHERE id=? AND {_SEEN_SQL} AND {owner_sql}""",
            (
                row["symbol"],
                row["side"],
                row["entry"],
                row["exit"],
                row["size"],
                row["pnl"],
                row["note"],
                row["sl"],
                row["tp"],
                row["opened_at"],
                row["closed_at"],
                row["status"],
                trade_id,
                *(seen[k] for k in _TRADE_WRITE_COLS),
                *owner_args,
            ),
        )
        if cur.rowcount != 1:
            return _STALE
        return row


def delete_trade(trade_id: str, user_id: int | None = None, owner_key: str | None = None) -> bool:
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args))
    return cur.rowcount > 0


def journal_outcome(pnl: float) -> int:
    """1 ربح، −1 خسارة، 0 تعادل — **بما يُطبع** «0.00%» (قرار ٣ «بنفس التعريف»، tools137a): كان ±1e-9 ⇒ وقفٌ
    نُقل للدخول 1.0850 وضُرب بانزلاق 0.1 نقطة (1.08499، −0.0009%) يُعدّ خسارةً والسطر يقول 0.00%، فنسبة
    الفوز 50% ⇒ 33.3%. مرآة التطبيق `tradePlan.ts` `journalOutcome` (round إلى منزلتين، نصف زوجي)."""
    r = round(pnl, 2)
    return 1 if r > 0 else -1 if r < 0 else 0


def trade_stats(user_id: int | None = None, owner_key: str | None = None) -> dict:
    """إحصاءات **كل** الصفقات المغلقة ذات النتيجة — لا صفحة القائمة. كانت تُحسب من أحدث 200 صفقة
    (مفتوحة+مغلقة) فتختفي القديمة من نسبة الفوز بلا إشارة.

    **التعادل ليس خسارة**: `pnl <= 0` كان يعدّ صفقة أُغلقت على الدخول خسارةً، فمتداول ينقل وقفه
    للتعادل يرى نسبة فوزه تهبط. الآن `win_rate` = رابحة ÷ (رابحة + خاسرة)، والتعادل يُعدّ وحده
    (`breakeven_count`) ويبقى ضمن `trade_count`.

    **بلا صفقة حاسمة `win_rate` = None** (دفتر فارغ أو كلّه تعادل): 0 كانت تُعرض «نسبة نجاح 0%» = «خسر كل صفقاته»
    (backend-r6 (5)). التطبيق يعرض «—» لـnull (`journalWinRateLine`، `WeeklyReportPanel`)."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        rows = c.execute(
            f"SELECT pnl FROM trades WHERE {sql} AND status='closed' AND pnl IS NOT NULL", args
        ).fetchall()
    pnls = [float(r[0]) for r in rows]
    empty = {
        "trade_count": 0,
        "win_rate": None,
        "total_pnl_pct": 0,
        # لا صفقة ⇒ لا متوسّط ولا أفضل/أسوأ (None لا 0)، كالاختبار الخلفي `avg_win_pct`
        "avg_win": None,
        "avg_loss": None,
        "best": None,
        "worst": None,
        "win_count": 0,
        "loss_count": 0,
        "breakeven_count": 0,
    }
    if not pnls:
        return empty
    wins = [p for p in pnls if journal_outcome(p) > 0]
    losses = [p for p in pnls if journal_outcome(p) < 0]
    decided = len(wins) + len(losses)
    return {
        "trade_count": len(pnls),
        # كلّها تعادل ⇒ لا نسبة فوز ذات معنى: None كالدفتر الفارغ، و`breakeven_count` يوضّح
        "win_rate": round(len(wins) / decided * 100, 1) if decided else None,
        # `+ 0.0` كـ`backtest._round`: ما يُقرَّب صفراً إشارته ضجيج فاصلة عائمة — بيعان خاسران 11 و22 نقطة وشراء
        # رابح 33 نقطة على اليورو مجموعها −5.5e-17 ⇒ `-0.0` ⇒ «صافي −0.00%» خسارة لم تحدث. وأفضل/أسوأ كذلك.
        "total_pnl_pct": round(sum(pnls), 2) + 0.0,
        # بلا رابحة لا متوسّط ربح (None لا 0): «متوسّط الربح 0%» يُقرأ «ربحت صفقات بلا شيء» — كـ`backtest._stats`
        "avg_win": round(sum(wins) / len(wins), 2) + 0.0 if wins else None,
        "avg_loss": round(sum(losses) / len(losses), 2) + 0.0 if losses else None,  # لا «-0.0»
        "best": round(max(pnls), 2) + 0.0,
        "worst": round(min(pnls), 2) + 0.0,
        "win_count": len(wins),
        "loss_count": len(losses),
        "breakeven_count": len(pnls) - decided,
    }


def mark_indicator_alert_triggered(
    alert_id: str, bar_time: int | None = None, seen: dict | None = None
) -> bool:
    """مثل mark_alert_triggered: True لأول من يُطلقه فقط (لا إشعار مكرّر).
    `bar_time` = وقت فتح آخر شمعة وقت الإطلاق (يُحفظ `fired_bar`).

    `seen` = الصفّ كما قُرئ قبل جلب السلسلة: بدونه، الـworker يقرأ التنبيه، ثم يُطلقه فحص التطبيق على
    الشمعة X ويعيد المتداول تسليحه (triggered=0، `ts` جديد) — فيقلبه الـworker من نسخته القديمة ويدفع
    إشعاراً ثانياً لنفس تقاطع الشمعة X."""
    sql = "UPDATE indicator_alerts SET triggered=1, fired_bar=COALESCE(?, fired_bar) WHERE id=? AND triggered=0"
    args: tuple = (bar_time, alert_id)
    if seen is not None:
        sql += " AND ts IS ? AND fired_bar IS ?"
        args += (seen.get("ts"), seen.get("fired_bar"))
    with _conn() as c:
        cur = c.execute(sql, args)
    return cur.rowcount == 1


# ==============================================================================
# Task 13: Advanced Order Types & OCO Database Support
# ==============================================================================

def _migrate_orders(c: sqlite3.Connection) -> None:
    """إنشاء وتحديث جدول الأوامر المتقدمة (Market, Limit, Stop, Trailing Stop, OCO)."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            owner_key TEXT,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            order_type TEXT NOT NULL,
            price REAL NOT NULL,
            qty REAL NOT NULL DEFAULT 1.0,
            stop_loss_price REAL,
            take_profit_price REAL,
            trailing_stop_pct REAL,
            highest_price REAL,
            lowest_price REAL,
            is_oco_group TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            filled_at TEXT,
            filled_price REAL,
            cancelled_at TEXT,
            note TEXT
        )"""
    )
    cols = {r[1] for r in c.execute("PRAGMA table_info(orders)").fetchall()}
    if "filled_price" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN filled_price REAL")
    if "trailing_stop_pct" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN trailing_stop_pct REAL")
    if "is_oco_group" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN is_oco_group TEXT")
    if "highest_price" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN highest_price REAL")
    if "lowest_price" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN lowest_price REAL")
    if "owner_key" not in cols:
        c.execute("ALTER TABLE orders ADD COLUMN owner_key TEXT")
    
    c.execute("CREATE INDEX IF NOT EXISTS idx_orders_symbol_status ON orders(symbol, status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_orders_oco_group ON orders(is_oco_group)")


# ==============================================================================
# Task 14: Position Management & Real-Time P&L Tracking
# ==============================================================================

def _migrate_positions(c: sqlite3.Connection) -> None:
    """إنشاء وتحديث جدول المراكز المفتوحة والمغلقة ومتابعة الأرباح والخسائر اللحظية والهامش."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            qty INTEGER NOT NULL,
            avg_entry_price REAL NOT NULL,
            open_time TIMESTAMP NOT NULL,
            status TEXT NOT NULL,
            close_price REAL,
            close_time TIMESTAMP,
            close_reason TEXT,
            realized_pnl REAL,
            realized_pnl_pct REAL,
            entry_order_id TEXT,
            stop_loss_order_id TEXT,
            take_profit_order_id TEXT,
            notes TEXT
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_positions_symbol_status ON positions(symbol, status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_positions_open_time ON positions(open_time DESC)")


# ==============================================================================
# Task 22: Caching Strategy Optimization (Redis/Memory LRU + Hot Spot Caching)
# ==============================================================================

def _migrate_cache(c: sqlite3.Connection) -> None:
    """إنشاء وتحديث جداول إحصائيات الكاش وسجل إبطال الشموع."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS cache_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT DEFAULT (DATE('now')),
            symbol TEXT,
            hits INTEGER DEFAULT 0,
            misses INTEGER DEFAULT 0,
            avg_hit_latency_ms REAL DEFAULT 0,
            avg_miss_latency_ms REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, symbol)
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_cache_stats_date ON cache_stats(date)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_cache_stats_symbol ON cache_stats(symbol)")

    c.execute(
        """CREATE TABLE IF NOT EXISTS cache_invalidation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timeframe TEXT,
            invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_invalidation_symbol_time ON cache_invalidation_log(symbol, invalidated_at)")




def add_order(
    order_id: str,
    symbol: str,
    side: str,
    order_type: str,
    price: float,
    qty: float = 1.0,
    stop_loss_price: float | None = None,
    take_profit_price: float | None = None,
    trailing_stop_pct: float | None = None,
    is_oco_group: str | None = None,
    user_id: int | None = None,
    owner_key: str | None = None,
    note: str | None = None,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            """INSERT INTO orders (
                id, user_id, owner_key, symbol, side, order_type, price, qty,
                stop_loss_price, take_profit_price, trailing_stop_pct,
                highest_price, lowest_price, is_oco_group, status, created_at, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
            (
                order_id, user_id, owner_key, symbol.upper(), side.lower(), order_type.lower(),
                float(price), float(qty),
                stop_loss_price, take_profit_price, trailing_stop_pct,
                float(price), float(price), is_oco_group, now_iso, note
            ),
        )
    return get_order(order_id) or {}


def get_order(order_id: str) -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d.pop("owner_key", None)
    return d


def list_orders(
    user_id: int | None = None,
    owner_key: str | None = None,
    status: str | None = None,
    symbol: str | None = None,
    limit: int = 100,
) -> list[dict]:
    sql_parts = []
    args = []
    
    owner_sql, owner_args = _owner_clause(user_id, owner_key)
    sql_parts.append(f"({owner_sql})")
    args.extend(owner_args)
    
    if status:
        sql_parts.append("status = ?")
        args.append(status.lower())
    if symbol:
        sql_parts.append("symbol = ?")
        args.append(symbol.upper())
        
    where = " AND ".join(sql_parts)
    query = f"SELECT * FROM orders WHERE {where} ORDER BY created_at DESC LIMIT ?"
    args.append(max(1, min(limit, 200)))
    
    with _conn() as c:
        rows = c.execute(query, tuple(args)).fetchall()
        
    out = []
    for r in rows:
        d = dict(r)
        d.pop("owner_key", None)
        out.append(d)
    return out


def update_order_status(
    order_id: str,
    status: str,
    filled_at: str | None = None,
    cancelled_at: str | None = None,
) -> bool:
    with _conn() as c:
        cur = c.execute(
            """UPDATE orders 
               SET status = ?,
                   filled_at = COALESCE(?, filled_at),
                   cancelled_at = COALESCE(?, cancelled_at)
               WHERE id = ?""",
            (status.lower(), filled_at, cancelled_at, order_id),
        )
    return cur.rowcount > 0


def update_order_trailing(
    order_id: str,
    highest_price: float | None = None,
    lowest_price: float | None = None,
    stop_loss_price: float | None = None,
) -> bool:
    with _conn() as c:
        cur = c.execute(
            """UPDATE orders 
               SET highest_price = COALESCE(?, highest_price),
                   lowest_price = COALESCE(?, lowest_price),
                   stop_loss_price = COALESCE(?, stop_loss_price)
               WHERE id = ? AND status = 'pending'""",
            (highest_price, lowest_price, stop_loss_price, order_id),
        )
    return cur.rowcount > 0


def cancel_oco_group(oco_group: str, triggered_order_id: str) -> list[str]:
    """إلغاء كل الأوامر في مجموعة OCO باستثناء الأمر الذي تفعل (One-Cancels-Other)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cancelled_ids = []
    with _conn() as c:
        rows = c.execute(
            "SELECT id FROM orders WHERE is_oco_group = ? AND id != ? AND status = 'pending'",
            (oco_group, triggered_order_id),
        ).fetchall()
        for r in rows:
            oid = r[0]
            c.execute(
                "UPDATE orders SET status = 'cancelled', cancelled_at = ? WHERE id = ?",
                (now_iso, oid),
            )
            cancelled_ids.append(oid)
    return cancelled_ids

