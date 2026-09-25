"""ملاحظة التنبيه (سعر ومؤشّر) محدودة بـ500 كملاحظة الدفتر والتصويت (QA14)."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

import main


def test_price_alert_note_bounded():
    main.AlertCreate(symbol="EURUSD", condition="above", price=1.1, note="x" * 500)
    with pytest.raises(ValidationError):
        main.AlertCreate(symbol="EURUSD", condition="above", price=1.1, note="x" * 501)


def test_indicator_alert_note_bounded():
    main.IndicatorAlertCreate(symbol="EURUSD", alert_type="rsi", condition="above", value=70, note="x" * 500)
    with pytest.raises(ValidationError):
        main.IndicatorAlertCreate(symbol="EURUSD", alert_type="rsi", condition="above", value=70, note="x" * 501)
