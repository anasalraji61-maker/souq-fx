"""فكرة الصفقة: مستويات ضمن ×10 من الدخول (لا R:R لا نهائي)، ومعرّف التصويت محدود."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

import main


def _idea(**kw):
    base = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2}
    return main.VoteCreate(**{**base, **kw})


@pytest.mark.parametrize("kw", [
    {"sl": 5e-324, "tp": 1.7e308},
    {"entry": 1e-300, "sl": 5e-324, "tp": 1.7e308},
    {"tp": 12.0},
    {"direction": "sell", "tp": 0.1, "sl": 1.2},
])
def test_extreme_levels_rejected(kw):
    with pytest.raises(ValidationError):
        _idea(**kw)


def test_normal_and_crypto_ideas_pass():
    assert _idea().entry == 1.1
    assert main.VoteCreate(symbol="BTCUSD", direction="sell", entry=60000, sl=66000, tp=30000).tp == 30000


def test_vote_id_bounded():
    with pytest.raises(ValidationError):
        main.VoteBallot(vote_id="v" * 65, choice="agree")
    assert main.VoteBallot(vote_id="v123", choice="agree").vote_id == "v123"
