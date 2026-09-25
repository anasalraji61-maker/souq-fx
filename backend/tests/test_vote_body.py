"""جسم `/api/votes` (QA29): الرمز كان 1–20 حرفاً حرّاً والمستويات أيّ float ⇒ أفكار برموز لا
يعرفها الخادم، وأسعار سالبة، ووقف شراء فوق الدخول تُنشر للمجتمع."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

import main

OK = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2}


def test_valid_buy_and_sell_accepted_and_symbol_normalized():
    assert main.VoteCreate(**{**OK, "symbol": " eur/usd "}).symbol == "EURUSD"
    main.VoteCreate(**{**OK, "direction": "sell", "sl": 1.2, "tp": 1.0})


@pytest.mark.parametrize("symbol", ["X", "EU", "ABCDEFGHIJKLM", "EUR USD", "يورو", "EUR-USD"])
def test_bad_symbols_rejected(symbol):
    with pytest.raises(ValidationError):
        main.VoteCreate(**{**OK, "symbol": symbol})


@pytest.mark.parametrize(
    "patch",
    [
        {"entry": -1.1},
        {"sl": 0},
        {"tp": float("inf")},
        {"sl": 1.15},                       # شراء بوقف فوق الدخول
        {"tp": 1.05},                       # شراء بهدف تحت الدخول
        {"sl": 1.1},                        # وقف = دخول
        {"direction": "sell"},              # بيع بمستويات شراء
    ],
)
def test_inconsistent_levels_rejected(patch):
    with pytest.raises(ValidationError):
        main.VoteCreate(**{**OK, **patch})
