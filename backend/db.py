"""SQLite persistence for MATRIX (alerts, chat, votes, users, layouts, progress)."""
from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
import time
from typing import Any

from core.db_conn import DB_PATH, _conn


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
        _seed_if_empty(c)
        _migrate_indicator_alerts(c)
        _migrate_trades(c)
        _migrate_network(c)
        _migrate_commission_ledger(c)
        _migrate_user_email(c)
        _migrate_push_lang(c)


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


def _seed_if_empty(c: sqlite3.Connection) -> None:
    n = c.execute("SELECT COUNT(*) FROM group_messages").fetchone()[0]
    if n:
        return
    seeds = [
        ("g1", "أحمد", "DXY يكسر 104.2 — راقبوا EURUSD", "21:02"),
        ("g2", "سارة", "تصويتي شراء GBPUSD على الريتست", "21:05"),
        ("g3", "كريم", "خبر CPI بعد ساعة — حجم منخفض الآن", "21:08"),
    ]
    c.executemany(
        "INSERT INTO group_messages(id,user_name,text,ts) VALUES(?,?,?,?)", seeds
    )
    c.executemany(
        "INSERT INTO dm_messages(id,peer,user_name,text,ts) VALUES(?,?,?,?,?)",
        [
            ("d1", "سارة", "سارة", "شفت السيولة عند 1.0850؟", "20:40"),
            ("d2", "سارة", "أنت", "نعم، أنتظر تأكيد الكسر", "20:42"),
            ("d3", "كريم", "كريم", "أرسلتك سيناريو الذهب", "19:15"),
        ],
    )
    c.executemany(
        """INSERT INTO votes(id,symbol,direction,entry,sl,tp,note,agree,disagree,author,ts)
           VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        [
            ("v1", "EURUSD", "sell", 1.0862, 1.0895, 1.0790, "رفض عند المقاومة", 18, 5, "أحمد", "21:00"),
            ("v2", "XAUUSD", "buy", 2348.5, 2335.0, 2372.0, "دعم أسبوعي", 12, 9, "سارة", "20:50"),
        ],
    )


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


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

    salt = secrets.token_hex(8)
    ph = _hash_password(password, salt)
    stored = f"{salt}${ph}"
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

    salt = secrets.token_hex(8)
    ph = _hash_password(pwd, salt)
    stored = f"{salt}${ph}"
    now = time.time()
    with _conn() as c:
        taken = c.execute(
            "SELECT 1 FROM network_members WHERE sponsor_id=? AND side=?",
            (parent_id, side_norm),
        ).fetchone()
        if taken:
            raise ValueError("side already occupied")

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
        raise ValueError("invalid credentials")
    salt, ph = str(row["password_hash"]).split("$", 1)
    if _hash_password(password, salt) != ph:
        raise ValueError("invalid credentials")
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
    آخر (تنبيهات الأسعار والمؤشرات، دفتر الصفقات، تخطيطات الشارت المحفوظة، رمز إشعارات Push). هذا يحقق
    الشرط الفعلي لأبل (إزالة البيانات الشخصية القابلة للتعريف) دون كسر شجرة العمولات.
    """
    placeholder = f"deleted_user_{user_id}"
    dead_hash = f"{secrets.token_hex(8)}${secrets.token_hex(32)}"
    with _conn() as c:
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


# ─── Alerts ───────────────────────────────────────────────────────────────────

def list_alerts(user_id: int | None = None, *, all_users: bool = False) -> list[dict]:
    """Alerts visible to a caller: a signed-in user → their own + legacy anonymous ones
    (user_id IS NULL); an anonymous caller → anonymous ones only (it used to get EVERY
    user's alerts). ``all_users=True`` is for the server-side worker only and adds the
    internal ``user_id`` so pushes reach the owner's devices, not everyone's."""
    with _conn() as c:
        if all_users:
            rows = c.execute("SELECT * FROM alerts ORDER BY ts DESC").fetchall()
            return [{**_alert_row(r), "user_id": r["user_id"]} for r in rows]
        if user_id:
            rows = c.execute(
                "SELECT * FROM alerts WHERE user_id IS NULL OR user_id=? ORDER BY ts DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = c.execute("SELECT * FROM alerts WHERE user_id IS NULL ORDER BY ts DESC").fetchall()
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


def create_alert(data: dict, user_id: int | None = None) -> dict:
    with _conn() as c:
        c.execute(
            """INSERT INTO alerts(id,user_id,symbol,condition,price,note,active,triggered,ts)
               VALUES(?,?,?,?,?,?,1,0,?)""",
            (
                data["id"],
                user_id,
                data["symbol"],
                data["condition"],
                data["price"],
                data.get("note", ""),
                data["ts"],
            ),
        )
    return data


def update_alert(alert_id: str, data: dict, user_id: int | None = None) -> dict | None:
    """Atomic edit of a price alert (symbol/condition/price/note) — re-arms it (triggered=0).

    Ownership: a signed-in user may edit their own alerts or legacy/anonymous ones
    (user_id IS NULL); an anonymous client only anonymous ones. Returns the updated row,
    or None when no row matched (missing or not owned) → the API answers 404.
    """
    with _conn() as c:
        if user_id:
            cur = c.execute(
                """UPDATE alerts SET symbol=?, condition=?, price=?, note=?, active=1, triggered=0, ts=?
                   WHERE id=? AND (user_id IS NULL OR user_id=?)""",
                (data["symbol"], data["condition"], data["price"], data.get("note", ""),
                 data["ts"], alert_id, user_id),
            )
        else:
            cur = c.execute(
                """UPDATE alerts SET symbol=?, condition=?, price=?, note=?, active=1, triggered=0, ts=?
                   WHERE id=? AND user_id IS NULL""",
                (data["symbol"], data["condition"], data["price"], data.get("note", ""),
                 data["ts"], alert_id),
            )
        if cur.rowcount == 0:
            return None
        row = c.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    return _alert_row(row) if row else None


def delete_alert(alert_id: str, user_id: int | None = None) -> bool:
    """Same ownership rule as update_alert: own or legacy-anonymous for a signed-in user,
    anonymous only for an anonymous caller (anyone could delete anyone's alert before)."""
    with _conn() as c:
        if user_id:
            cur = c.execute(
                "DELETE FROM alerts WHERE id=? AND (user_id IS NULL OR user_id=?)", (alert_id, user_id)
            )
        else:
            cur = c.execute("DELETE FROM alerts WHERE id=? AND user_id IS NULL", (alert_id,))
    return cur.rowcount > 0


def mark_alert_triggered(alert_id: str) -> None:
    with _conn() as c:
        c.execute("UPDATE alerts SET triggered=1 WHERE id=?", (alert_id,))


# ─── Chat / votes ─────────────────────────────────────────────────────────────

def group_messages() -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT id,user_name,text,ts FROM group_messages ORDER BY rowid"
        ).fetchall()
    return [
        {"id": r["id"], "user": r["user_name"], "text": r["text"], "ts": r["ts"], "room": "group"}
        for r in rows
    ]


def add_group_message(item: dict) -> dict:
    with _conn() as c:
        c.execute(
            "INSERT INTO group_messages(id,user_name,text,ts) VALUES(?,?,?,?)",
            (item["id"], item["user"], item["text"], item["ts"]),
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


def list_votes() -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM votes ORDER BY rowid DESC").fetchall()
    return [
        {
            "id": r["id"],
            "symbol": r["symbol"],
            "direction": r["direction"],
            "entry": r["entry"],
            "sl": r["sl"],
            "tp": r["tp"],
            "note": r["note"] or "",
            "agree": r["agree"],
            "disagree": r["disagree"],
            "author": r["author"],
            "ts": r["ts"],
        }
        for r in rows
    ]


def create_vote(item: dict) -> dict:
    with _conn() as c:
        c.execute(
            """INSERT INTO votes(id,symbol,direction,entry,sl,tp,note,agree,disagree,author,ts)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
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
            ),
        )
    return item


def ballot(vote_id: str, choice: str) -> dict | None:
    col = "agree" if choice == "agree" else "disagree"
    with _conn() as c:
        c.execute(f"UPDATE votes SET {col}={col}+1 WHERE id=?", (vote_id,))
        row = c.execute("SELECT * FROM votes WHERE id=?", (vote_id,)).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "symbol": row["symbol"],
        "direction": row["direction"],
        "entry": row["entry"],
        "sl": row["sl"],
        "tp": row["tp"],
        "note": row["note"] or "",
        "agree": row["agree"],
        "disagree": row["disagree"],
        "author": row["author"],
        "ts": row["ts"],
    }


# ─── Push / layouts / watchlist / progress ────────────────────────────────────

def save_push_token(
    token: str, platform: str, user_id: int | None = None, lang: str | None = None
) -> None:
    with _conn() as c:
        c.execute(
            """INSERT OR REPLACE INTO push_tokens(token,user_id,platform,updated_at,lang)
               VALUES(?,?,?,?,?)""",
            (token, user_id, platform, time.time(), lang),
        )


def all_push_tokens() -> list[str]:
    with _conn() as c:
        rows = c.execute("SELECT token FROM push_tokens").fetchall()
    return [r["token"] for r in rows]


def push_tokens_for(user_id: int | None) -> list[str]:
    """Devices of one owner: a user's registered tokens, or — for a legacy anonymous alert —
    the tokens registered without an account. Alert pushes used to go to every device."""
    with _conn() as c:
        if user_id:
            rows = c.execute("SELECT token FROM push_tokens WHERE user_id=?", (user_id,)).fetchall()
        else:
            rows = c.execute("SELECT token FROM push_tokens WHERE user_id IS NULL").fetchall()
    return [r["token"] for r in rows]


def push_targets_for(user_id: int | None) -> list[tuple[str, str | None]]:
    """مثل `push_tokens_for` لكن مع لغة واجهة كل جهاز: [(token, lang)]."""
    with _conn() as c:
        if user_id:
            rows = c.execute(
                "SELECT token, lang FROM push_tokens WHERE user_id=?", (user_id,)
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT token, lang FROM push_tokens WHERE user_id IS NULL"
            ).fetchall()
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
    layout_id: str | None, name: str, payload: dict, user_id: int | None = None
) -> dict:
    """يحفظ تخطيطاً ويعيده بمعرّفه الفعلي.

    الأمان/الملكية: `id` كان مفتاحاً أساسياً عاماً، و`INSERT OR REPLACE` يسمح لأي مستخدم
    بالكتابة فوق تخطيط غيره (وإعادة إسناد ملكيته) بإرسال المعرّف نفسه — أو بتصادم بريء بين
    مستخدمَين بنفس الثانية. الآن: لا يُكتب فوق صفٍّ يملكه مستخدم آخر — عند التعارض يُخصَّص
    معرّف جديد للمستدعي (نسخته الخاصة)، فلا فقدان بيانات ولا اختطاف ملكية.
    """
    with _conn() as c:
        if layout_id:
            row = c.execute(
                "SELECT user_id FROM layouts WHERE id=?", (layout_id,)
            ).fetchone()
            # صفّ قائم بمالك مختلف (أو تخطيط عام مقابل مستخدم مسجّل) → لا تُصِبه، خصّص معرّفاً جديداً
            if row is not None and row["user_id"] != user_id:
                layout_id = None
        if not layout_id:
            layout_id = _new_layout_id(c)
        c.execute(
            """INSERT OR REPLACE INTO layouts(id,user_id,name,payload,updated_at)
               VALUES(?,?,?,?,?)""",
            (layout_id, user_id, name, json.dumps(payload), time.time()),
        )
    return {"id": layout_id, "name": name, "payload": payload}


def list_layouts(user_id: int | None = None) -> list[dict]:
    with _conn() as c:
        if user_id:
            rows = c.execute(
                "SELECT id,name,payload FROM layouts WHERE user_id IS NULL OR user_id=?",
                (user_id,),
            ).fetchall()
        else:
            rows = c.execute("SELECT id,name,payload FROM layouts WHERE user_id IS NULL").fetchall()
    out = []
    for r in rows:
        out.append({"id": r["id"], "name": r["name"], "payload": json.loads(r["payload"])})
    return out


def get_watchlist(user_id: int | None = None) -> list[str]:
    with _conn() as c:
        rows = c.execute(
            "SELECT symbol FROM watchlist WHERE user_id IS ? ORDER BY sort_order",
            (user_id,),
        ).fetchall()
    return [r["symbol"] for r in rows]


def add_watchlist_symbol(symbol: str, user_id: int | None = None) -> list[str]:
    sym = symbol.upper()
    with _conn() as c:
        mx = c.execute(
            "SELECT COALESCE(MAX(sort_order),0) FROM watchlist WHERE user_id IS ?",
            (user_id,),
        ).fetchone()[0]
        c.execute(
            "INSERT OR IGNORE INTO watchlist(user_id,symbol,sort_order) VALUES(?,?,?)",
            (user_id, sym, int(mx) + 1),
        )
    return get_watchlist(user_id)


def save_progress(
    user_id: int,
    school_id: str,
    lecture_id: str,
    segment_index: int,
    completed: bool = False,
) -> dict:
    with _conn() as c:
        c.execute(
            """INSERT OR REPLACE INTO academy_progress
               (user_id,school_id,lecture_id,segment_index,completed,updated_at)
               VALUES(?,?,?,?,?,?)""",
            (user_id, school_id, lecture_id, segment_index, int(completed), time.time()),
        )
    return {
        "school_id": school_id,
        "lecture_id": lecture_id,
        "segment_index": segment_index,
        "completed": completed,
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

def list_indicator_alerts(user_id: int | None = None, *, all_users: bool = False) -> list[dict]:
    """Same visibility rule as list_alerts (see there)."""
    with _conn() as c:
        if all_users:
            rows = c.execute("SELECT * FROM indicator_alerts ORDER BY ts DESC").fetchall()
            return [{**_ind_alert_row(r), "user_id": r["user_id"]} for r in rows]
        if user_id:
            rows = c.execute(
                "SELECT * FROM indicator_alerts WHERE user_id IS NULL OR user_id=? ORDER BY ts DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM indicator_alerts WHERE user_id IS NULL ORDER BY ts DESC"
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


def create_indicator_alert(data: dict, user_id: int | None = None) -> dict:
    with _conn() as c:
        c.execute(
            """INSERT INTO indicator_alerts
               (id,user_id,symbol,timeframe,alert_type,condition,value,fast_period,slow_period,note,active,triggered,ts)
               VALUES(?,?,?,?,?,?,?,?,?,?,1,0,?)""",
            (
                data["id"],
                user_id,
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


def delete_indicator_alert(alert_id: str, user_id: int | None = None) -> bool:
    """Same ownership rule as delete_alert."""
    with _conn() as c:
        if user_id:
            cur = c.execute(
                "DELETE FROM indicator_alerts WHERE id=? AND (user_id IS NULL OR user_id=?)",
                (alert_id, user_id),
            )
        else:
            cur = c.execute("DELETE FROM indicator_alerts WHERE id=? AND user_id IS NULL", (alert_id,))
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


def list_trades(user_id: int | None = None, days: int = 30) -> list[dict]:
    """Journal visible to the caller: own + legacy anonymous trades for a signed-in user,
    anonymous ones only otherwise (an anonymous caller used to get every user's journal)."""
    with _conn() as c:
        if user_id is not None:
            rows = c.execute(
                "SELECT * FROM trades WHERE user_id=? OR user_id IS NULL ORDER BY opened_at DESC LIMIT 200",
                (user_id,),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM trades WHERE user_id IS NULL ORDER BY opened_at DESC LIMIT 200"
            ).fetchall()
    return [dict(r) for r in rows]


def _trade_owner_clause(user_id: int | None) -> tuple[str, tuple]:
    """Same ownership rule as alerts: own or legacy-anonymous, or anonymous-only when signed out."""
    if user_id is not None:
        return "(user_id IS NULL OR user_id=?)", (user_id,)
    return "user_id IS NULL", ()


def add_trade(data: dict, user_id: int | None = None) -> dict:
    # معرّف بدقّة ميلي ثانية وحده كان يتصادم بين مستخدمَين يسجّلان بنفس اللحظة → IntegrityError (500)
    tid = data.get("id") or f"t{int(time.time() * 1000)}{secrets.token_hex(3)}"
    row = {
        "id": tid,
        "user_id": user_id,
        "symbol": data["symbol"].upper(),
        "side": data["side"],
        "entry": float(data["entry"]),
        "exit": float(data["exit"]) if data.get("exit") is not None else None,
        "size": float(data.get("size") or 1),
        "pnl": float(data["pnl"]) if data.get("pnl") is not None else None,
        "note": data.get("note") or "",
        "sl": _opt_level(data.get("sl")),
        "tp": _opt_level(data.get("tp")),
        "opened_at": data.get("opened_at") or time.strftime("%Y-%m-%d %H:%M"),
        "closed_at": data.get("closed_at"),
        "status": data.get("status") or ("closed" if data.get("exit") is not None else "open"),
    }
    if row["exit"] is not None and row["pnl"] is None:
        if row["side"] == "buy":
            row["pnl"] = (row["exit"] - row["entry"]) / row["entry"] * 100 * row["size"]
        else:
            row["pnl"] = (row["entry"] - row["exit"]) / row["entry"] * 100 * row["size"]
        row["status"] = "closed"
        row["closed_at"] = row["closed_at"] or time.strftime("%Y-%m-%d %H:%M")
    with _conn() as c:
        c.execute(
            """INSERT INTO trades
               (id,user_id,symbol,side,entry,exit,size,pnl,note,sl,tp,opened_at,closed_at,status)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                row["id"],
                row["user_id"],
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


def close_trade(trade_id: str, exit_price: float, user_id: int | None = None) -> dict | None:
    owner_sql, owner_args = _trade_owner_clause(user_id)
    with _conn() as c:
        r = c.execute(
            f"SELECT * FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args)
        ).fetchone()
        if not r:
            return None
        row = dict(r)
        entry = float(row["entry"])
        size = float(row["size"] or 1)
        if row["side"] == "buy":
            pnl = (exit_price - entry) / entry * 100 * size
        else:
            pnl = (entry - exit_price) / entry * 100 * size
        closed_at = time.strftime("%Y-%m-%d %H:%M")
        c.execute(
            "UPDATE trades SET exit=?, pnl=?, closed_at=?, status='closed' WHERE id=?",
            (exit_price, pnl, closed_at, trade_id),
        )
        row.update({"exit": exit_price, "pnl": pnl, "closed_at": closed_at, "status": "closed"})
        return row


def delete_trade(trade_id: str, user_id: int | None = None) -> bool:
    owner_sql, owner_args = _trade_owner_clause(user_id)
    with _conn() as c:
        cur = c.execute(f"DELETE FROM trades WHERE id=? AND {owner_sql}", (trade_id, *owner_args))
    return cur.rowcount > 0


def trade_stats(user_id: int | None = None) -> dict:
    trades = [t for t in list_trades(user_id) if t.get("status") == "closed" and t.get("pnl") is not None]
    if not trades:
        return {
            "trade_count": 0,
            "win_rate": 0,
            "total_pnl_pct": 0,
            "avg_win": 0,
            "avg_loss": 0,
            "best": 0,
            "worst": 0,
        }
    wins = [t for t in trades if float(t["pnl"]) > 0]
    losses = [t for t in trades if float(t["pnl"]) <= 0]
    pnls = [float(t["pnl"]) for t in trades]
    return {
        "trade_count": len(trades),
        "win_rate": round(len(wins) / len(trades) * 100, 1),
        "total_pnl_pct": round(sum(pnls), 2),
        "avg_win": round(sum(float(t["pnl"]) for t in wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(float(t["pnl"]) for t in losses) / len(losses), 2) if losses else 0,
        "best": round(max(pnls), 2),
        "worst": round(min(pnls), 2),
    }


def mark_indicator_alert_triggered(alert_id: str) -> None:
    with _conn() as c:
        c.execute("UPDATE indicator_alerts SET triggered=1 WHERE id=?", (alert_id,))
