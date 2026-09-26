"""Run 91: RSS dates with non-RFC offsets were read as UTC (hours off)."""
import pytest

from news_feed import when_and_ts

BASE = "Tue, 23 Sep 2026 14:30:00"


@pytest.mark.parametrize("tail,utc", [
    ("+0000", "2026-09-23 14:30 UTC"),
    ("+0300", "2026-09-23 11:30 UTC"),
    ("+03:00", "2026-09-23 11:30 UTC"),
    ("GMT", "2026-09-23 14:30 UTC"),
    ("UTC", "2026-09-23 14:30 UTC"),
    ("EDT", "2026-09-23 18:30 UTC"),
    ("-0000", "2026-09-23 14:30 UTC"),
])
def test_known_offsets(tail, utc):
    assert when_and_ts(f"{BASE} {tail}") == (utc, when_and_ts(f"{BASE} {tail}")[1])
    assert when_and_ts(f"{BASE} {tail}")[1] is not None


def test_no_zone_is_utc():
    text, ts = when_and_ts(BASE)
    assert text == "2026-09-23 14:30 UTC" and ts is not None


@pytest.mark.parametrize("tail", ["GMT+1", "GMT-4", "UT+2", "GMT+0100", "EST5EDT", "+05", "BST"])
def test_unreadable_offsets_have_no_time(tail):
    text, ts = when_and_ts(f"{BASE} {tail}")
    assert ts is None
    assert text == f"{BASE} {tail}"[:32]
