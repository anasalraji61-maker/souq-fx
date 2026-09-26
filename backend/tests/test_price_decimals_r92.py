"""Run 92: price_decimals follows the instrument (as the app's `symbolPriceDecimals`), not the price size."""
import pytest

import signal_hub


@pytest.mark.parametrize("sym,price,dp", [
    ("USOIL", 70.123, 3), ("USOIL", 100.12, 3), ("UKOIL", 99.9, 3), ("XBR/USD", 80.0, 3),
    ("XAGUSD", 30.12, 3), ("XAGUSD", 9.8, 3), ("XAUUSD", 950.0, 2), ("XAUUSD", 4100.0, 2),
    ("USDSEK", 9.9, 5), ("USDSEK", 10.1, 5), ("USDMXN", 18.5, 5), ("EURHUF", 395.4, 3), ("GBPJPY", 199.9, 3),
])
def test_fixed_decimals_do_not_flip_when_price_crosses_a_power_of_ten(sym, price, dp):
    assert signal_hub.price_decimals(price, sym) == dp


def test_large_unknown_prices_keep_two_decimals():
    # BTC 100001.2 was 0 decimals ⇒ «entry» 100001, not the real last close
    assert signal_hub.price_decimals(100001.2, "BTCUSD") == 2
    assert signal_hub.level_round(100001.2, 100001.2, "BTCUSD") == 100001.2


def test_oil_levels_round_to_the_tick():
    assert signal_hub.level_round(70.12371, 70.1, "USOIL") == 70.124
