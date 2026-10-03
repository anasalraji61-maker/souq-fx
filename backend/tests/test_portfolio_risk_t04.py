"""
Tests for Portfolio Risk Analysis Module — Task T04
"""

import pytest
from backend.portfolio_risk import (
    historical_var,
    historical_cvar,
    parametric_var,
    var_report,
    correlation,
    correlation_matrix,
    stress_test
)


def test_historical_var_basic():
    """Test historical VaR with basic example from requirements."""
    returns = [-0.10, -0.05, -0.02, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    # n=10, 95%: index int(0.5)=0, so VaR=0.10
    assert historical_var(returns, 0.95) == pytest.approx(0.10)
    # At 80% confidence, index 2 gives 0.02
    assert historical_var(returns, 0.80) == pytest.approx(0.02)


def test_historical_var_all_positive():
    """Test historical VaR with all-positive returns gives 0.0."""
    returns = [0.01, 0.02, 0.03, 0.04, 0.05]
    assert historical_var(returns, 0.95) == 0.0


def test_historical_var_empty_raises():
    """Test historical VaR raises ValueError for empty input."""
    with pytest.raises(ValueError, match="returns cannot be empty"):
        historical_var([])


def test_historical_var_invalid_confidence():
    """Test historical VaR raises ValueError for invalid confidence."""
    returns = [-0.01, 0.01, -0.02, 0.02]
    with pytest.raises(ValueError, match="confidence must be between 0 and 1"):
        historical_var(returns, 1.5)
    with pytest.raises(ValueError, match="confidence must be between 0 and 1"):
        historical_var(returns, -0.1)


def test_historical_cvar_basic():
    """Test historical CVaR is >= historical VaR."""
    returns = [-0.10, -0.05, -0.02, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    var_95 = historical_var(returns, 0.95)
    cvar_95 = historical_cvar(returns, 0.95)
    assert cvar_95 >= var_95
    # At 80% confidence, cvar = mean(0.10,0.05,0.02) = 0.05666…
    var_80 = historical_var(returns, 0.80)
    cvar_80 = historical_cvar(returns, 0.80)
    assert cvar_80 == pytest.approx(0.056667, rel=1e-5)


def test_parametric_var_constant_returns():
    """Test parametric VaR with constant returns gives 0.0."""
    returns = [0.01] * 5
    # stdev 0, mean positive, clamped
    assert parametric_var(returns, 0.95) == 0.0


def test_parametric_var_known_case():
    """Test parametric VaR with known case."""
    returns = [-0.01, 0.01] * 50  # 100 returns, mean 0, pstdev 0.01
    var_95 = parametric_var(returns, 0.95)
    # VaR_95 ≈ 1.6449*0.01
    expected = 1.6449 * 0.01
    assert var_95 == pytest.approx(expected, rel=1e-3)
    # 99% value must be greater than 95% value
    var_99 = parametric_var(returns, 0.99)
    assert var_99 > var_95


def test_parametric_var_single_return_raises():
    """Test parametric VaR with 1 return raises ValueError."""
    with pytest.raises(ValueError, match="at least 2 returns required"):
        parametric_var([0.01])


def test_parametric_var_invalid_confidence():
    """Test parametric VaR raises ValueError for invalid confidence."""
    returns = [-0.01, 0.01]
    with pytest.raises(ValueError, match="confidence must be between 0 and 1"):
        parametric_var(returns, 1.5)


def test_var_report_basic():
    """Test var_report has all required keys."""
    returns = [-0.10, -0.05, -0.02, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    report = var_report(returns)
    assert "var_95" in report
    assert "var_99" in report
    assert "cvar_95" in report
    assert "cvar_99" in report
    assert "parametric_var_95" in report
    assert "parametric_var_99" in report
    assert "n" in report
    assert "estimated" in report
    assert report["estimated"] is True
    assert report["n"] == len(returns)
    # var_99 >= var_95
    assert report["var_99"] >= report["var_95"]


def test_correlation_perfect_positive():
    """Test correlation with perfect positive correlation."""
    a = [1, 2, 3]
    b = [2, 4, 6]  # b = 2*a
    assert correlation(a, b) == 1.0


def test_correlation_perfect_negative():
    """Test correlation with perfect negative correlation."""
    a = [1, 2, 3]
    b = [6, 4, 2]  # b = 8 - 2*a
    assert correlation(a, b) == -1.0


def test_correlation_constant_series():
    """Test correlation with constant series gives 0.0."""
    a = [1, 1, 1]
    b = [2, 3, 4]
    assert correlation(a, b) == 0.0
    # Also test the reverse
    assert correlation(b, a) == 0.0


def test_correlation_length_mismatch():
    """Test correlation raises ValueError for length mismatch."""
    a = [1, 2, 3]
    b = [1, 2]
    with pytest.raises(ValueError, match="series must have same length"):
        correlation(a, b)


def test_correlation_too_short():
    """Test correlation raises ValueError for series with < 2 elements."""
    a = [1]
    b = [2]
    with pytest.raises(ValueError, match="series must have at least 2 elements"):
        correlation(a, b)


def test_correlation_matrix_basic():
    """Test correlation_matrix basic properties."""
    series = {
        "A": [1, 2, 3, 4, 5],
        "B": [2, 4, 6, 8, 10],  # Perfect positive correlation with A
        "C": [5, 4, 3, 2, 1]    # Perfect negative correlation with A
    }
    result = correlation_matrix(series)
    assert "symbols" in result
    assert "matrix" in result
    assert "estimated" in result
    assert result["estimated"] is True
    assert len(result["symbols"]) == 3
    assert len(result["matrix"]) == 3
    # Check diagonal is 1.0
    assert result["matrix"][0][0] == 1.0
    assert result["matrix"][1][1] == 1.0
    assert result["matrix"][2][2] == 1.0
    # Check matrix is symmetric
    assert result["matrix"][0][1] == result["matrix"][1][0]
    assert result["matrix"][0][2] == result["matrix"][2][0]
    assert result["matrix"][1][2] == result["matrix"][2][1]


def test_correlation_matrix_empty():
    """Test correlation_matrix with empty input."""
    result = correlation_matrix({})
    assert result["symbols"] == []
    assert result["matrix"] == []
    assert result["estimated"] is True


def test_stress_test_buy_position():
    """Test stress_test with one buy position."""
    positions = [
        {"symbol": "AAPL", "side": "buy", "units": 1000, "price": 1.10}
    ]
    # notional = 1000 * 1.10 = 1100
    # shock -0.02 gives pnl = 1100 * (-0.02) = -22.0
    result = stress_test(positions, (-0.02,))
    assert len(result["scenarios"]) == 1
    scenario = result["scenarios"][0]
    assert scenario["shock"] == -0.02
    assert scenario["pnl"] == -22.0
    assert result["total_notional"] == 1100.0
    assert result["estimated"] is True


def test_stress_test_sell_position():
    """Test stress_test with one sell position."""
    positions = [
        {"symbol": "AAPL", "side": "sell", "units": 1000, "price": 1.10}
    ]
    # notional = 1000 * 1.10 = 1100
    # shock -0.02 gives pnl = -1100 * (-0.02) = 22.0
    result = stress_test(positions, (-0.02,))
    assert len(result["scenarios"]) == 1
    scenario = result["scenarios"][0]
    assert scenario["shock"] == -0.02
    assert scenario["pnl"] == 22.0


def test_stress_test_mixed_positions():
    """Test stress_test with mixed buy/sell positions."""
    positions = [
        {"symbol": "AAPL", "side": "buy", "units": 1000, "price": 1.10},   # notional 1100
        {"symbol": "GOOGL", "side": "sell", "units": 500, "price": 2.20}    # notional 1100
    ]
    result = stress_test(positions, (-0.02,))
    assert len(result["scenarios"]) == 1
    scenario = result["scenarios"][0]
    # For buy AAPL: pnl = 1100 * (-0.02) = -22.0
    # For sell GOOGL: pnl = -1100 * (-0.02) = 22.0
    # Total pnl = -22.0 + 22.0 = 0.0
    assert scenario["pnl"] == 0.0
    assert result["total_notional"] == 2200.0
    # Check by_symbol breakdown
    assert scenario["by_symbol"]["AAPL"] == -22.0
    assert scenario["by_symbol"]["GOOGL"] == 22.0


def test_stress_test_empty_positions():
    """Test stress_test with empty positions list."""
    result = stress_test([])
    assert result["scenarios"]  # Should have scenarios for each shock
    assert result["total_notional"] == 0.0
    assert result["estimated"] is True
    # Each scenario should have 0.0 pnl
    for scenario in result["scenarios"]:
        assert scenario["pnl"] == 0.0


def test_stress_test_invalid_side():
    """Test stress_test raises ValueError for invalid side."""
    positions = [
        {"symbol": "AAPL", "side": "hold", "units": 1000, "price": 1.10}
    ]
    with pytest.raises(ValueError, match="invalid side"):
        stress_test(positions)


def test_stress_test_invalid_units():
    """Test stress_test raises ValueError for units <= 0."""
    positions = [
        {"symbol": "AAPL", "side": "buy", "units": 0, "price": 1.10}
    ]
    with pytest.raises(ValueError, match="units and price must be positive"):
        stress_test(positions)


def test_stress_test_invalid_price():
    """Test stress_test raises ValueError for price <= 0."""
    positions = [
        {"symbol": "AAPL", "side": "buy", "units": 1000, "price": 0}
    ]
    with pytest.raises(ValueError, match="units and price must be positive"):
        stress_test(positions)


def test_all_result_dicts_have_estimated_true():
    """Test that every result dict has estimated=True."""
    returns = [-0.10, -0.05, -0.02, 0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    
    # Test var_report
    report = var_report(returns)
    assert report["estimated"] is True
    
    # Test correlation_matrix
    series = {"A": [1, 2, 3], "B": [2, 4, 6]}
    corr_matrix = correlation_matrix(series)
    assert corr_matrix["estimated"] is True
    
    # Test stress_test
    positions = [{"symbol": "AAPL", "side": "buy", "units": 1000, "price": 1.10}]
    stress_result = stress_test(positions)
    assert stress_result["estimated"] is True