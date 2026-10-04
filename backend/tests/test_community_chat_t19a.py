import sqlite3

import pytest

from backend.community_chat import (
    RateLimitError,
    extract_mentions,
    find_banned,
    init_db,
    list_channels,
    list_messages,
    post_message,
)


def _conn(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "c.db"))
    init_db(conn)
    return conn


# --- extract_mentions ---


def test_mentions_deduped_and_lowercased():
    assert extract_mentions("hi @Bob and @bob") == ["bob"]


def test_mentions_email_does_not_count():
    assert extract_mentions("mail a@b.com") == []


def test_mentions_keep_first_seen_order():
    assert extract_mentions("@Zoe @Amy @zoe @Amy") == ["zoe", "amy"]


def test_mentions_single_char_rejected():
    assert extract_mentions("@x") == []


def test_mentions_empty_string():
    assert extract_mentions("") == []


def test_mentions_punctuation_followed_by_at():
    assert extract_mentions("call @Bob, then @Carol.") == ["bob", "carol"]


# --- find_banned ---


def test_find_banned_case_insensitive():
    assert find_banned("This is a SCAM") is True


def test_find_banned_clean_text():
    assert find_banned("great market today") is False


def test_find_banned_word_boundary():
    assert find_banned("the scammer saw it") is False


def test_find_banned_all_words():
    assert find_banned("fraud alert") is True
    assert find_banned("click my spamlink now") is True


# --- post_message ---


def test_post_message_returns_all_keys(tmp_path):
    conn = _conn(tmp_path)
    result = post_message(conn, "general", "u1", "hello", 100.0)
    assert set(result) == {
        "id",
        "channel",
        "user_id",
        "text",
        "mentions",
        "flagged",
        "created_at",
    }
    assert result["id"] == 1
    assert result["channel"] == "general"
    assert result["user_id"] == "u1"
    assert result["text"] == "hello"
    assert result["mentions"] == []
    assert result["flagged"] is False
    assert result["created_at"] == 100.0


def test_post_message_stores_and_returns_mentions(tmp_path):
    conn = _conn(tmp_path)
    result = post_message(conn, "general", "u1", "@Bob @carol", 100.0)
    assert result["mentions"] == ["bob", "carol"]
    rows = list_messages(conn, "general")
    assert rows[0]["mentions"] == ["bob", "carol"]


def test_post_message_banned_flagged_but_kept(tmp_path):
    conn = _conn(tmp_path)
    result = post_message(conn, "general", "u1", "this is a scam", 100.0)
    assert result["flagged"] is True
    rows = list_messages(conn, "general")
    assert len(rows) == 1
    assert rows[0]["text"] == "this is a scam"
    assert rows[0]["flagged"] is True


def test_post_message_unknown_channel(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        post_message(conn, "nope", "u1", "hello", 100.0)


def test_post_message_empty_text(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        post_message(conn, "general", "u1", "", 100.0)
    with pytest.raises(ValueError):
        post_message(conn, "general", "u1", "   ", 100.0)


def test_post_message_too_long(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        post_message(conn, "general", "u1", "x" * 1001, 100.0)
    # exactly 1000 chars is fine
    ok = post_message(conn, "general", "u1", "x" * 1000, 100.0)
    assert len(ok["text"]) == 1000


# --- rate limit ---


def test_rate_limit_blocks_sixth_post(tmp_path):
    conn = _conn(tmp_path)
    for i in range(5):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    with pytest.raises(RateLimitError) as exc_info:
        post_message(conn, "general", "u1", "msg 5", 105.0)
    assert exc_info.value.retry_after > 0


def test_rate_limit_window_passed(tmp_path):
    conn = _conn(tmp_path)
    for i in range(5):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    # at now=111, the oldest (100.0) is no longer > 111 - 10 = 101
    result = post_message(conn, "general", "u1", "msg 5", 111.0)
    assert result["text"] == "msg 5"


def test_rate_limit_per_user(tmp_path):
    conn = _conn(tmp_path)
    for i in range(5):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    # different user unaffected
    result = post_message(conn, "general", "u2", "hi", 105.0)
    assert result["user_id"] == "u2"


def test_rate_limit_counts_across_channels(tmp_path):
    conn = _conn(tmp_path)
    post_message(conn, "general", "u1", "a", 100.0)
    post_message(conn, "forex", "u1", "b", 101.0)
    post_message(conn, "metals", "u1", "c", 102.0)
    post_message(conn, "signals", "u1", "d", 103.0)
    post_message(conn, "general", "u1", "e", 104.0)
    with pytest.raises(RateLimitError):
        post_message(conn, "forex", "u1", "f", 105.0)


# --- list_messages ---


def test_list_messages_newest_first(tmp_path):
    conn = _conn(tmp_path)
    for i in range(3):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    rows = list_messages(conn, "general")
    assert [r["text"] for r in rows] == ["msg 2", "msg 1", "msg 0"]
    assert [r["id"] for r in rows] == [3, 2, 1]


def test_list_messages_before_id_paging(tmp_path):
    conn = _conn(tmp_path)
    for i in range(4):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    rows = list_messages(conn, "general", limit=50, before_id=3)
    assert [r["id"] for r in rows] == [2, 1]


def test_list_messages_limit_clamped(tmp_path):
    conn = _conn(tmp_path)
    for i in range(5):
        post_message(conn, "general", "u1", f"msg {i}", 100.0 + i)
    # 0 clamps to 1
    rows = list_messages(conn, "general", limit=0)
    assert len(rows) == 1
    # 9999 clamps to 200 (each user posts once, so no rate limit)
    for i in range(210):
        post_message(conn, "forex", "user%d" % i, "msg %d" % i, 200.0)
    rows = list_messages(conn, "forex", limit=9999)
    assert len(rows) == 200


def test_list_messages_channels_isolated(tmp_path):
    conn = _conn(tmp_path)
    post_message(conn, "general", "u1", "in general", 100.0)
    post_message(conn, "forex", "u1", "in forex", 101.0)
    general = list_messages(conn, "general")
    forex = list_messages(conn, "forex")
    assert [r["text"] for r in general] == ["in general"]
    assert [r["text"] for r in forex] == ["in forex"]


def test_list_messages_unknown_channel(tmp_path):
    conn = _conn(tmp_path)
    with pytest.raises(ValueError):
        list_messages(conn, "nope")


# --- list_channels ---


def test_list_channels_default():
    channels = list_channels()
    assert len(channels) == 4
    ids = [c["id"] for c in channels]
    assert ids == ["general", "forex", "metals", "signals"]
    assert any(c["id"] == "general" for c in channels)
