"""SQLite persistence for MATRIX (alerts, chat, votes, users, layouts, progress)."""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import sqlite3
import time
from typing import Any

from core.db_conn import DB_PATH, _conn


def _migrate_username_nocase(c: sqlite3.Connection) -> None:
    """«Ali» و«ali» كانا حسابين (`UNIQUE` حسّاس لحالة الأحرف) ⇒ انتحال اسم متداول معروف بحرف
    كبير، والحظر المحلي بالتطبيق يطبّع الاسم فيُخفي البريء مع المنتحل. فهرس فريد `NOCASE` يمنع
    ذلك بالقاعدة نفسها. قاعدة قائمة فيها تصادم فعلاً لا يُنشأ عليها الفهرس (لا دمج حسابات آلياً)
    ويبقى الفحص بـ`_username_taken` عند التسجيل مانعاً لكل تصادم جديد."""
    dup = c.execute(
        "SELECT 1 FROM users GROUP BY username COLLATE NOCASE HAVING COUNT(*) > 1 LIMIT 1"
    ).fetchone()
    if dup:
        return
    c.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)"
    )


def _username_taken(c: sqlite3.Connection, username: str) -> bool:
    # NOCASE يطوي ASCII فقط — والعربية بلا حالة أحرف أصلاً
    return c.execute(
        "SELECT 1 FROM users WHERE username=? COLLATE NOCASE", (username,)
    ).fetchone() is not None


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
        _migrate_network(c)
        _migrate_commission_ledger(c)
        _migrate_user_email(c)
        _migrate_username_nocase(c)
        _migrate_push_lang(c)
        _migrate_group_user(c)
        _migrate_vote_user(c)
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
    """
    if user_id:
        if owner_key:
            return "(user_id=? OR (user_id IS NULL AND owner_key=?))", (user_id, owner_key)
        return "(user_id=? OR (user_id IS NULL AND owner_key IS NULL))", (user_id,)
    if owner_key:
        return "(user_id IS NULL AND owner_key=?)", (owner_key,)
    return "(user_id IS NULL AND owner_key IS NULL)", ()


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

    username = username.strip()
    email_norm = (email or "").strip().lower()
    if len(username) < 3 or len(password) < 4:
        raise ValueError("username/password too short")
    if not email_norm or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_norm):
        raise ValueError("invalid email")
    role = (role or "trader").strip().lower()
    if role not in commissions_mod.ROLE_LABELS_AR:
        raise ValueError("invalid role")
    side_norm = (side or "").strip().lower()
    if side_norm and side_norm not in ("left", "right"):
        raise ValueError("side must be left or right")

    stored = _encode_password(password)
    with _conn() as c:
        sponsor_id: int | None = None
        if sponsor_code:
            sp = c.execute(
                "SELECT user_id FROM network_members WHERE referral_code=?",
                (sponsor_code.strip().upper(),),
            ).fetchone()
            if not sp:
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
        try:
            c.execute(
                "INSERT INTO users(username,password_hash,created_at,email) VALUES(?,?,?,?)",
                (username, stored, time.time(), email_norm),
            )
            uid = int(c.execute("SELECT last_insert_rowid()").fetchone()[0])
        except sqlite3.IntegrityError as exc:
            raise ValueError("username or email taken") from exc

        code = _make_referral_code(c, username, uid)
        c.execute(
            """INSERT INTO network_members
               (user_id,role,sponsor_id,side,referral_code,left_count,right_count,created_at)
               VALUES(?,?,?,?,?,0,0,?)""",
            (uid, role, sponsor_id, side_norm or None, code, time.time()),
        )
        if sponsor_id and side_norm:
            _bump_leg_counts(c, sponsor_id, side_norm)

    session = create_session(uid, username, email_norm)
    session["referral_code"] = code
    session["role"] = role
    return session


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

    username = username.strip()
    side_norm = (side or "").strip().lower()
    role = (role or "trader").strip().lower()
    pwd = (password or "").strip()
    if len(username) < 3:
        raise ValueError("username too short")
    if len(pwd) < 4:
        pwd = secrets.token_urlsafe(8)
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
                "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
                (username, stored, now),
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

    month_key = time.strftime("%Y-%m", time.localtime(now))
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
        "SELECT left_count, right_count FROM network_members WHERE user_id=?",
        (earner_id,),
    ).fetchone()
    if row and int(row["left_count"]) == int(row["right_count"]) and int(row["left_count"]) > 0:
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
                "condition": "يمين = يسار",
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
                "condition": "يمين ≠ يسار",
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


def login_user(username_or_email: str, password: str) -> dict[str, Any]:
    ident = username_or_email.strip()
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
                    "SELECT id, username, email, password_hash FROM users WHERE username=? COLLATE NOCASE",
                    (ident,),
                ).fetchall()
                row = rows[0] if len(rows) == 1 else None
    if not row:
        raise ValueError("invalid credentials")
    ok, needs_rehash = _verify_password(password, str(row["password_hash"]))
    if not ok:
        raise ValueError("invalid credentials")
    if needs_rehash:
        # ترقية كسولة: الدخول نجح فكلمة المرور بين أيدينا الآن وحدها هذه اللحظة.
        try:
            with _conn() as c:
                c.execute(
                    "UPDATE users SET password_hash=? WHERE id=?",
                    (_encode_password(password), int(row["id"])),
                )
        except sqlite3.Error:
            pass  # الدخول ناجح على أي حال؛ تُعاد المحاولة بالدخول التالي.
    return create_session(
        int(row["id"]),
        str(row["username"]),
        str(row["email"] or "") or None,
    )


def create_session(user_id: int, username: str, email: str | None = None) -> dict[str, Any]:
    token = secrets.token_urlsafe(32)
    exp = time.time() + 86400 * 30
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO sessions(token,user_id,expires_at) VALUES(?,?,?)",
            (token, user_id, exp),
        )
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


def delete_user_account(user_id: int) -> None:
    """حذف حساب — شرط إلزامي لأبل (App Store Review Guideline 5.1.1(v): يجب أن يقدر
    المستخدم يحذف حسابه وبياناته الشخصية من داخل التطبيق).

    لا يُحذف صف users فعلياً: هذا المستخدم قد يكون sponsor_id لمستخدمين آخرين بشجرة
    الإحالة (network_members) وله سجل عمولات (commissions) — حذف الصف فعلياً يكسر
    سلامة شجرة/سجل مالي يخصّ أطرافاً أخرى. بدلاً من ذلك: تُمحى كل بيانات الهوية
    الشخصية القابلة للتعريف (username → معرّف مجهول ثابت غير قابل لتسجيل دخول،
    email → NULL، password_hash → قيمة عشوائية غير صالحة أبداً لأي كلمة مرور حقيقية)،
    وتُلغى كل الجلسات النشطة فوراً، ويُحذف المحتوى الشخصي البحت غير المرجعي من طرف
    آخر (تنبيهات الأسعار والمؤشرات، دفتر الصفقات، تخطيطات الشارت المحفوظة، رمز إشعارات Push، سجل أصواته على أفكار الصفقات — العدّادات تبقى، قائمة المتابعة المخصّصة، تقدّم الأكاديمية، رسائله بمحادثة المجموعة، ومحادثاته الخاصة بطرفيها، بلاغاته عن محتوى الآخرين، واسمه كناشر لأفكار الصفقات وكعضو مُحال بسجلّ العمولات). هذا يحقق
    الشرط الفعلي لأبل (إزالة البيانات الشخصية القابلة للتعريف) دون كسر شجرة العمولات.
    """
    placeholder = f"deleted_user_{user_id}"
    dead_hash = f"{secrets.token_hex(8)}${secrets.token_hex(32)}"
    with _conn() as c:
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
            "UPDATE users SET username=?, email=NULL, password_hash=? WHERE id=?",
            (placeholder, dead_hash, user_id),
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
        c.execute("DELETE FROM content_reports WHERE reporter_id=?", (user_id,))


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


def update_alert(
    alert_id: str, data: dict, user_id: int | None = None, owner_key: str | None = None
) -> dict | None:
    """Atomic edit of a price alert (symbol/condition/price/note) — re-arms it (triggered=0).

    Ownership: `_owner_clause` (own account or this device's anonymous alerts). Returns the
    updated row, or None when no row matched (missing or not owned) → the API answers 404.
    """
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(
            f"""UPDATE alerts SET symbol=?, condition=?, price=?, note=?, active=1, triggered=0, ts=?
               WHERE id=? AND {sql}""",
            (data["symbol"], data["condition"], data["price"], data.get("note", ""),
             data["ts"], alert_id, *args),
        )
        if cur.rowcount == 0:
            return None
        row = c.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    return _alert_row(row) if row else None


def delete_alert(alert_id: str, user_id: int | None = None, owner_key: str | None = None) -> bool:
    """Same ownership rule as update_alert (`_owner_clause`)."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM alerts WHERE id=? AND {sql}", (alert_id, *args))
    return cur.rowcount > 0


def mark_alert_triggered(alert_id: str) -> bool:
    """True فقط لمن نقله فعلاً من مُسلَّح إلى مُطلَق — الـworker ولوحة التنبيهات (فحص كل دقيقة من كل جهاز
    مفتوح) يقرآن triggered=0 بنفس اللحظة، فكان كلٌّ منهما يُرسل إشعاره (إشعارات مكرّرة لنفس التنبيه)."""
    with _conn() as c:
        cur = c.execute("UPDATE alerts SET triggered=1 WHERE id=? AND triggered=0", (alert_id,))
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
    """قائمة المراجعة للمشرف: كل عنصر مُبلَّغ عنه مع عدد البلاغات والأسباب ونصّه (إن بقي)."""
    with _conn() as c:
        rows = c.execute(
            """SELECT kind, target_id, COUNT(*) AS n, GROUP_CONCAT(DISTINCT reason) AS reasons,
                      MAX(created_at) AS last_at
               FROM content_reports GROUP BY kind, target_id ORDER BY last_at DESC LIMIT ?""",
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


def moderate(kind: str, target_id: str, action: str) -> bool:
    """remove: حذف العنصر نهائياً (وأصوات الفكرة) + بلاغاته. dismiss: إسقاط البلاغات فيعود ظاهراً."""
    table = {"group_message": "group_messages", "vote": "votes"}.get(kind)
    if table is None:
        return False
    with _conn() as c:
        if action == "remove":
            c.execute(f"DELETE FROM {table} WHERE id=?", (target_id,))
            if kind == "vote":
                c.execute("DELETE FROM vote_ballots WHERE vote_id=?", (target_id,))
        cur = c.execute("DELETE FROM content_reports WHERE kind=? AND target_id=?", (kind, target_id))
        return cur.rowcount > 0 or action == "remove"


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
        rows = c.execute(
            "SELECT id,user_name,text,ts,user_id FROM group_messages ORDER BY rowid DESC LIMIT ?",
            (limit,),
        ).fetchall()
        hidden = _hidden_ids(c, "group_message", viewer_id)
    rows = [r for r in reversed(rows) if r["id"] not in hidden]
    return [
        {
            "id": r["id"],
            "user": None if r["user_name"] in ("", _LEGACY_CHAT_USER) else r["user_name"],
            "text": r["text"],
            "ts": r["ts"],
            "room": "group",
            "mine": viewer_id is not None and r["user_id"] == viewer_id,
        }
        for r in rows
    ]


def add_group_message(item: dict, user_id: int | None = None) -> dict:
    with _conn() as c:
        c.execute(
            "INSERT INTO group_messages(id,user_name,text,ts,user_id) VALUES(?,?,?,?,?)",
            (item["id"], item["user"], item["text"], item["ts"], user_id),
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
        # صوت المستدعي على هذه الفكرة ('agree' | 'disagree') أو None (لم يصوّت / مجهول)
        "my_choice": my_choice,
        # فكرة المستدعي نفسه (ui2) — كرسائل المجموعة؛ المجهول لا يملك شيئاً
        "mine": viewer_id is not None and r["user_id"] == viewer_id,
    }


def list_votes(user_id: int | None = None) -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM votes ORDER BY rowid DESC").fetchall()
        hidden = _hidden_ids(c, "vote", user_id)
        rows = [r for r in rows if r["id"] not in hidden]
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
        c.execute(
            """INSERT INTO votes(id,symbol,direction,entry,sl,tp,note,agree,disagree,author,ts,user_id)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
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
    with _conn() as c:
        if not c.execute("SELECT 1 FROM votes WHERE id=?", (vote_id,)).fetchone():
            return None
        prev = c.execute(
            "SELECT choice FROM vote_ballots WHERE vote_id=? AND user_id=?", (vote_id, user_id)
        ).fetchone()
        if prev is None:
            c.execute(
                "INSERT INTO vote_ballots(vote_id,user_id,choice) VALUES(?,?,?)",
                (vote_id, user_id, new_col),
            )
            c.execute(f"UPDATE votes SET {new_col}={new_col}+1 WHERE id=?", (vote_id,))
        elif prev["choice"] != new_col:
            old_col = "agree" if prev["choice"] == "agree" else "disagree"
            c.execute(
                "UPDATE vote_ballots SET choice=? WHERE vote_id=? AND user_id=?",
                (new_col, vote_id, user_id),
            )
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
) -> None:
    with _conn() as c:
        c.execute(
            """INSERT OR REPLACE INTO push_tokens(token,user_id,platform,updated_at,lang,owner_key)
               VALUES(?,?,?,?,?,?)""",
            (token, user_id, platform, time.time(), lang, owner_key),
        )


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


def push_targets_for(user_id: int | None, owner_key: str | None = None) -> list[tuple[str, str | None]]:
    """مثل `push_tokens_for` لكن مع لغة واجهة كل جهاز: [(token, lang)]."""
    sql, args = _push_owner_sql(user_id, owner_key)
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
    with _conn() as c:
        if layout_id:
            row = c.execute("SELECT 1 FROM layouts WHERE id=?", (layout_id,)).fetchone()
            if row is not None:
                sql, args = _owner_clause(user_id, owner_key)
                mine = c.execute(
                    f"SELECT 1 FROM layouts WHERE id=? AND {sql}", (layout_id, *args)
                ).fetchone()
                if mine is None:
                    layout_id = None
        if not layout_id:
            layout_id = _new_layout_id(c)
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
    return out


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
    لصفوف المجهول لأن NULL لا يتساوى بـSQLite (كان كل ضغط «أضف» يُكرّر الرمز)."""
    sym = symbol.upper()
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
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
    }


def create_indicator_alert(
    data: dict, user_id: int | None = None, owner_key: str | None = None
) -> dict:
    with _conn() as c:
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
    """يعيد تنبيه مؤشر أُطلق إلى «يراقب» (triggered=0, active=1) — لمالكه فقط (`_owner_clause`)."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(
            f"UPDATE indicator_alerts SET triggered=0, active=1 WHERE id=? AND {sql}", (alert_id, *args)
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


def _opt_level(v) -> float | None:
    """سعر وقف/هدف اختياري: رقم موجب منتهٍ وإلا None."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f > 0 and f != float("inf") else None


def _pnl_pct(side: str, entry: float, exit_price: float) -> float | None:
    """نسبة حركة السعر فقط — الحساب الوحيد بالملف (`add_trade`/`close_trade`/`update_trade` تستدعيه).

    **سعر دخول غير موجب يعيد None لا ZeroDivisionError**: المُصادِق يرفضه الآن عند الإنشاء، لكن صفّاً
    قديماً حُفظ قبل ذلك (`entry=0`) كان يجعل كل محاولة إغلاق تسقط بـ500 — أي صفقة عالقة مفتوحة
    للأبد لا يملك المتداول إزالتها إلا بحذفها. الآن تُغلق بنتيجة غير محسوبة (`pnl=None`، تتخطّاها
    الإحصاءات أصلاً)، ويستعيدها تصحيح سعر الدخول بـPATCH — فهو يعيد الحساب."""
    if not entry or entry <= 0:
        return None
    if side == "buy":
        return (exit_price - entry) / entry * 100
    return (entry - exit_price) / entry * 100


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
    صفحة واحدة (الأحدث أولاً)؛ `count_trades` يعطي الإجمالي ليعرف العميل أن هناك المزيد."""
    sql, args = _owner_clause(user_id, owner_key)
    limit = max(1, min(int(limit), TRADES_PAGE_MAX))
    offset = max(0, int(offset))
    with _conn() as c:
        rows = c.execute(
            f"SELECT * FROM trades WHERE {sql} ORDER BY opened_at DESC, id DESC LIMIT ? OFFSET ?",
            (*args, limit, offset),
        ).fetchall()
    out = [dict(r) for r in rows]
    for r in out:
        r.pop("owner_key", None)  # معرّف التثبيت سرّ الجهاز — لا يُعاد بالاستجابة
    return out


def count_trades(user_id: int | None = None, owner_key: str | None = None) -> int:
    sql, args = _owner_clause(user_id, owner_key)
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
        row["closed_at"] = row["closed_at"] or time.strftime("%Y-%m-%d %H:%M")
    with _conn() as c:
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


class TradeAlreadyClosed(Exception):
    """إغلاق صفقة مغلقة أصلاً. `trade` = الصفّ كما هو مخزَّن (بخروجه الأول)."""

    def __init__(self, trade: dict):
        super().__init__("trade already closed")
        self.trade = trade


def close_trade(
    trade_id: str, exit_price: float, user_id: int | None = None, owner_key: str | None = None
) -> dict | None:
    """يغلق صفقة **مفتوحة** فقط. كان `UPDATE … WHERE id=?` بلا شرط الحالة: جهازان يُغلقان الصفقة
    نفسها معاً ⇒ الثاني يمحو خروج الأول المسجَّل ونتيجته. الآن الشرط `status='open'` داخل
    التحديث نفسه (ذرّي بـSQLite) ⇒ الثاني يتلقّى `TradeAlreadyClosed` بالخروج الأول كما هو.
    تصحيح خروج مسجَّل عمداً يبقى عبر PATCH (`update_trade`)."""
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
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
        # نسبة حركة السعر فقط — راجع add_trade. None لصفّ قديم بدخول غير موجب (بدل 500 دائم).
        pnl = _pnl_pct(row["side"], float(row["entry"]), exit_price)
        closed_at = time.strftime("%Y-%m-%d %H:%M")
        cur = c.execute(
            f"UPDATE trades SET exit=?, pnl=?, closed_at=?, status='closed' "
            f"WHERE id=? AND status='open' AND {owner_sql}",
            (exit_price, pnl, closed_at, trade_id, *owner_args),
        )
        if cur.rowcount != 1:
            # سبقنا جهاز آخر بين القراءة والتحديث
            now = c.execute("SELECT * FROM trades WHERE id=?", (trade_id,)).fetchone()
            won = dict(now) if now else row
            won.pop("owner_key", None)
            raise TradeAlreadyClosed(won)
        row.update({"exit": exit_price, "pnl": pnl, "closed_at": closed_at, "status": "closed"})
        return row


def update_trade(
    trade_id: str, fields: dict, user_id: int | None = None, owner_key: str | None = None
) -> dict | None:
    """تعديل صفقة يملكها المستدعي. `fields` يحوي ما أُرسل فقط؛ exit/sl/tp = None تعني مسحاً.
    النتيجة (`pnl`) والحالة تُعاد حسابهما من الدخول/الخروج/الاتجاه بعد التعديل: خطأ كتابة بسعر الدخول
    كان يُفسد نسبة النجاح وصافي النقاط للأبد (الحلّ الوحيد كان الحذف وإعادة الكتابة)."""
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
    with _conn() as c:
        r = c.execute(
            f"SELECT * FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args)
        ).fetchone()
        if not r:
            return None
        row = dict(r)
        row.pop("owner_key", None)
        if "symbol" in fields:
            row["symbol"] = str(fields["symbol"]).strip().upper()
        if "side" in fields and fields["side"] in ("buy", "sell"):
            row["side"] = fields["side"]
        if "entry" in fields:
            row["entry"] = float(fields["entry"])
        if "size" in fields:
            row["size"] = float(fields["size"])
        if "note" in fields:
            row["note"] = fields["note"] or ""
        for k in ("sl", "tp"):
            if k in fields:
                row[k] = _opt_level(fields[k])
        if "exit" in fields:
            ex = _opt_level(fields["exit"])
            row["exit"] = ex
            if ex is None:
                row.update({"pnl": None, "closed_at": None, "status": "open"})
            else:
                row["status"] = "closed"
                row["closed_at"] = row.get("closed_at") or time.strftime("%Y-%m-%d %H:%M")
        if row.get("exit") is not None:
            row["pnl"] = _pnl_pct(row["side"], float(row["entry"]), float(row["exit"]))
        c.execute(
            f"""UPDATE trades SET symbol=?, side=?, entry=?, exit=?, size=?, pnl=?, note=?, sl=?, tp=?,
                closed_at=?, status=? WHERE id=? AND {owner_sql}""",
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
                row["closed_at"],
                row["status"],
                trade_id,
                *owner_args,
            ),
        )
        return row


def delete_trade(trade_id: str, user_id: int | None = None, owner_key: str | None = None) -> bool:
    owner_sql, owner_args = _trade_owner_clause(user_id, owner_key)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args))
    return cur.rowcount > 0


# |نتيجة| أقلّ من هذا = تعادل (خروج عند الدخول بالضبط، بعد تقريب الفاصلة العائمة).
BREAKEVEN_EPS = 1e-9


def trade_stats(user_id: int | None = None, owner_key: str | None = None) -> dict:
    """إحصاءات **كل** الصفقات المغلقة ذات النتيجة — لا صفحة القائمة. كانت تُحسب من أحدث 200 صفقة
    (مفتوحة+مغلقة) فتختفي القديمة من نسبة الفوز بلا إشارة.

    **التعادل ليس خسارة**: `pnl <= 0` كان يعدّ صفقة أُغلقت على الدخول خسارةً، فمتداول ينقل وقفه
    للتعادل يرى نسبة فوزه تهبط. الآن `win_rate` = رابحة ÷ (رابحة + خاسرة)، والتعادل يُعدّ وحده
    (`breakeven_count`) ويبقى ضمن `trade_count`."""
    sql, args = _owner_clause(user_id, owner_key)
    with _conn() as c:
        rows = c.execute(
            f"SELECT pnl FROM trades WHERE {sql} AND status='closed' AND pnl IS NOT NULL", args
        ).fetchall()
    pnls = [float(r[0]) for r in rows]
    empty = {
        "trade_count": 0,
        "win_rate": 0,
        "total_pnl_pct": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "best": 0,
        "worst": 0,
        "win_count": 0,
        "loss_count": 0,
        "breakeven_count": 0,
    }
    if not pnls:
        return empty
    wins = [p for p in pnls if p > BREAKEVEN_EPS]
    losses = [p for p in pnls if p < -BREAKEVEN_EPS]
    decided = len(wins) + len(losses)
    return {
        "trade_count": len(pnls),
        # كلّها تعادل ⇒ لا نسبة فوز ذات معنى: 0 كما في الدفتر الفارغ، و`breakeven_count` يوضّح
        "win_rate": round(len(wins) / decided * 100, 1) if decided else 0,
        "total_pnl_pct": round(sum(pnls), 2),
        "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
        "best": round(max(pnls), 2),
        "worst": round(min(pnls), 2),
        "win_count": len(wins),
        "loss_count": len(losses),
        "breakeven_count": len(pnls) - decided,
    }


def mark_indicator_alert_triggered(alert_id: str) -> bool:
    """مثل mark_alert_triggered: True لأول من يُطلقه فقط (لا إشعار مكرّر)."""
    with _conn() as c:
        cur = c.execute("UPDATE indicator_alerts SET triggered=1 WHERE id=? AND triggered=0", (alert_id,))
    return cur.rowcount == 1
