"""
Portfolio Risk Analysis Module — Task T04
MATRIX Platform Quantitative Risk Management

Calculates:
1. Historical and Parametric Value at Risk (VaR)
2. Conditional Value at Risk (CVaR)
3. Pearson correlation matrix
4. Position stress testing under market shocks
"""

from __future__ import annotations

import math
import statistics
from typing import Dict, List, Tuple, Union


def historical_var(returns: list[float], confidence: float = 0.95) -> float:
    """
    Calculate Value at Risk using historical method.
    
    Args:
        returns: List of period returns (e.g., -0.02 for a 2% loss)
        confidence: Confidence level (default: 0.95)
        
    Returns:
        VaR as a positive loss value
        
    Raises:
        ValueError: If returns is empty or confidence is not in (0,1)
    """
    if not returns:
        raise ValueError("returns cannot be empty")
    
    if not (0 < confidence < 1):
        raise ValueError("confidence must be between 0 and 1")
    
    # Sort returns in ascending order (worst losses first)
    sorted_returns = sorted(returns)
    n = len(sorted_returns)
    
    # Calculate index and clamp to valid range
    # Handle floating-point precision issues for exact fractions
    index_float = (1 - confidence) * n
    # For cases that should be exact integers, round them properly
    # Check if it's very close to an integer
    if abs(index_float - round(index_float)) < 1e-10:
        index = round(index_float)
    else:
        index = int(index_float)
    index = max(0, min(n - 1, index))
    
    # Return the loss as a positive number
    return max(0.0, -sorted_returns[index])


def historical_cvar(returns: list[float], confidence: float = 0.95) -> float:
    """
    Calculate Conditional Value at Risk using historical method.
    
    Args:
        returns: List of period returns
        confidence: Confidence level (default: 0.95)
        
    Returns:
        CVaR as a positive loss value
        
    Raises:
        ValueError: If returns is empty or confidence is not in (0,1)
    """
    if not returns:
        raise ValueError("returns cannot be empty")
    
    if not (0 < confidence < 1):
        raise ValueError("confidence must be between 0 and 1")
    
    # Get VaR cutoff
    var_cutoff = -historical_var(returns, confidence)
    
    # Find all returns that are <= the VaR cutoff
    tail_returns = [r for r in returns if r <= var_cutoff]
    
    # If no returns in tail, return the VaR value
    if not tail_returns:
        return historical_var(returns, confidence)
    
    # Calculate mean of tail returns and return as positive loss
    cvar = -statistics.mean(tail_returns)
    return max(cvar, historical_var(returns, confidence))


def parametric_var(returns: list[float], confidence: float = 0.95) -> float:
    """
    Calculate Value at Risk using parametric method with normal distribution.
    
    Args:
        returns: List of period returns
        confidence: Confidence level (default: 0.95)
        
    Returns:
        VaR as a positive loss value
        
    Raises:
        ValueError: If returns has fewer than 2 elements or confidence is not in (0,1)
    """
    if len(returns) < 2:
        raise ValueError("at least 2 returns required for parametric VaR")
    
    if not (0 < confidence < 1):
        raise ValueError("confidence must be between 0 and 1")
    
    # Calculate z-score for the given confidence level
    z = statistics.NormalDist().inv_cdf(confidence)
    
    # Calculate mean and standard deviation
    mean = statistics.mean(returns)
    stdev = statistics.pstdev(returns)
    
    # Calculate VaR and return as positive loss
    var = z * stdev - mean
    return max(0.0, var)


def var_report(returns: list[float]) -> dict:
    """
    Generate a comprehensive VaR report with multiple confidence levels.
    
    Args:
        returns: List of period returns
        
    Returns:
        Dictionary with VaR metrics
    """
    return {
        "var_95": historical_var(returns, 0.95),
        "var_99": historical_var(returns, 0.99),
        "cvar_95": historical_cvar(returns, 0.95),
        "cvar_99": historical_cvar(returns, 0.99),
        "parametric_var_95": parametric_var(returns, 0.95),
        "parametric_var_99": parametric_var(returns, 0.99),
        "n": len(returns),
        "estimated": True
    }


def correlation(a: list[float], b: list[float]) -> float:
    """
    Calculate Pearson correlation between two series.
    
    Args:
        a: First series of values
        b: Second series of values
        
    Returns:
        Pearson correlation coefficient
        
    Raises:
        ValueError: If series lengths differ or are less than 2
    """
    if len(a) != len(b):
        raise ValueError("series must have same length")
    
    if len(a) < 2:
        raise ValueError("series must have at least 2 elements")
    
    # Check for zero variance in either series
    if statistics.pvariance(a) == 0 or statistics.pvariance(b) == 0:
        return 0.0
    
    # Calculate correlation using the formula
    mean_a = statistics.mean(a)
    mean_b = statistics.mean(b)
    
    numerator = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(len(a)))
    
    sum_sq_a = sum((x - mean_a) ** 2 for x in a)
    sum_sq_b = sum((x - mean_b) ** 2 for x in b)
    
    denominator = math.sqrt(sum_sq_a * sum_sq_b)
    
    if denominator == 0:
        return 0.0
    
    return round(numerator / denominator, 6)


def correlation_matrix(series: dict[str, list[float]]) -> dict:
    """
    Generate correlation matrix for multiple symbol series.
    
    Args:
        series: Dictionary mapping symbols to lists of values
        
    Returns:
        Dictionary with symbols list, correlation matrix, and estimated flag
    """
    symbols = list(series.keys())
    n = len(symbols)
    
    if n == 0:
        return {
            "symbols": [],
            "matrix": [],
            "estimated": True
        }
    
    # Initialize matrix
    matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    
    # Fill the matrix
    for i in range(n):
        for j in range(n):
            if i == j:
                # Diagonal is always 1.0
                matrix[i][j] = 1.0
            else:
                # Calculate correlation between series
                matrix[i][j] = correlation(series[symbols[i]], series[symbols[j]])
    
    # Round all values to 6 decimals
    for i in range(n):
        for j in range(n):
            matrix[i][j] = round(matrix[i][j], 6)
    
    return {
        "symbols": symbols,
        "matrix": matrix,
        "estimated": True
    }


def stress_test(positions: list[dict], shocks: tuple = (-0.05, -0.02, 0.02, 0.05)) -> dict:
    """
    Calculate P&L under various market shocks for a portfolio of positions.
    
    Args:
        positions: List of position dictionaries with keys: symbol, side, units, price
        shocks: Tuple of shock values (default: (-0.05, -0.02, 0.02, 0.05))
        
    Returns:
        Dictionary with stress test results
        
    Raises:
        ValueError: If position data is invalid
    """
    # Validate positions
    total_notional = 0.0
    for pos in positions:
        if pos.get("side") not in ["buy", "sell"]:
            raise ValueError("invalid side")
        
        units = pos.get("units", 0)
        price = pos.get("price", 0)
        
        if units <= 0 or price <= 0:
            raise ValueError("units and price must be positive")
        
        total_notional += units * price
    
    # Calculate P&L for each shock scenario
    scenarios = []
    for shock in shocks:
        total_pnl = 0.0
        by_symbol = {}
        
        for pos in positions:
            symbol = pos["symbol"]
            side = pos["side"]
            units = pos["units"]
            price = pos["price"]
            
            notional = units * price
            # For buy positions: P&L = +notional * shock
            # For sell positions: P&L = -notional * shock
            pnl = notional * shock if side == "buy" else -notional * shock
            
            total_pnl += pnl
            
            # Track P&L by symbol
            if symbol in by_symbol:
                by_symbol[symbol] += pnl
            else:
                by_symbol[symbol] = pnl
        
        scenarios.append({
            "shock": shock,
            "pnl": round(total_pnl, 6),
            "by_symbol": {sym: round(pnl, 6) for sym, pnl in by_symbol.items()}
        })
    
    return {
        "scenarios": scenarios,
        "total_notional": round(total_notional, 6),
        "estimated": True
    }