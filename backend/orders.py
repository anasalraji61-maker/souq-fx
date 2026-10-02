"""
MATRIX Advanced Order Types & Risk Management Module (Task 13)
Supports: Market, Limit, Stop, Trailing Stop, Take Profit, and OCO (One-Cancels-Other).
Pure Forex/Commodity execution. Zero Crypto.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import db


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    TRAILING_STOP = "trailing_stop"
    TAKE_PROFIT = "take_profit"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    TRIGGERED = "triggered"


# ==============================================================================
# Risk Management & Validation Functions
# ==============================================================================

def validate_stop_loss(side: str, entry_price: float, stop_loss: float) -> bool:
    """
    تحقق من صحة سعر وقف الخسارة مقارنة بسعر الدخول.
    - شراء (BUY): يجب أن يكون الوقف أقل من سعر الدخول وأكبر من صفر.
    - بيع (SELL): يجب أن يكون الوقف أعلى من سعر الدخول.
    """
    if entry_price <= 0 or stop_loss <= 0 or math.isinf(stop_loss) or math.isnan(stop_loss):
        return False
    
    side_lower = side.lower()
    if side_lower == "buy":
        return stop_loss < entry_price
    elif side_lower == "sell":
        return stop_loss > entry_price
    return False


def validate_take_profit(side: str, entry_price: float, take_profit: float) -> bool:
    """
    تحقق من صحة سعر أخذ الربح مقارنة بسعر الدخول.
    - شراء (BUY): يجب أن يكون الهدف أعلى من سعر الدخول.
    - بيع (SELL): يجب أن يكون الهدف أقل من سعر الدخول وأكبر من صفر.
    """
    if entry_price <= 0 or take_profit <= 0 or math.isinf(take_profit) or math.isnan(take_profit):
        return False
    
    side_lower = side.lower()
    if side_lower == "buy":
        return take_profit > entry_price
    elif side_lower == "sell":
        return take_profit < entry_price
    return False


def calculate_risk_reward(
    entry_price: float,
    stop_loss: float,
    take_profit: float,
    side: str = "buy"
) -> Dict[str, Any]:
    """
    حساب نسبة المخاطرة إلى العائد (Risk-to-Reward Ratio)
    ومعدل الفوز المطلوب للتعادل (Breakeven Winrate).
    """
    if entry_price <= 0 or stop_loss <= 0 or take_profit <= 0:
        return {
            "valid": False,
            "error": "Prices must be positive non-zero numbers",
            "ratio": 0.0,
            "risk_pct": 0.0,
            "reward_pct": 0.0,
            "breakeven_winrate": 0.0,
        }
    
    side_lower = side.lower()
    if side_lower == "buy":
        risk_dist = entry_price - stop_loss
        reward_dist = take_profit - entry_price
    else:
        risk_dist = stop_loss - entry_price
        reward_dist = entry_price - take_profit

    if risk_dist <= 0 or reward_dist <= 0:
        return {
            "valid": False,
            "error": "Invalid Stop Loss or Take Profit direction for the order side",
            "ratio": 0.0,
            "risk_pct": 0.0,
            "reward_pct": 0.0,
            "breakeven_winrate": 0.0,
        }

    ratio = reward_dist / risk_dist
    risk_pct = (risk_dist / entry_price) * 100.0
    reward_pct = (reward_dist / entry_price) * 100.0
    # Breakeven Winrate = 1 / (1 + Reward:Risk)
    breakeven_winrate = (1.0 / (1.0 + ratio)) * 100.0

    return {
        "valid": True,
        "entry_price": round(entry_price, 5),
        "stop_loss": round(stop_loss, 5),
        "take_profit": round(take_profit, 5),
        "risk_distance": round(risk_dist, 5),
        "reward_distance": round(reward_dist, 5),
        "risk_pct": round(risk_pct, 2),
        "reward_pct": round(reward_pct, 2),
        "ratio": round(ratio, 2),
        "ratio_str": f"1:{ratio:.2f}",
        "breakeven_winrate": round(breakeven_winrate, 1),
    }


def calculate_trailing_stop(
    current_price: float,
    extreme_price: float,
    trail_pct: float,
    side: str = "buy"
) -> Dict[str, float]:
    """
    تحديث وقف الخسارة المتحرك ديناميكياً مع حركة السعر.
    - شراء: يتتبع السعر للأعلى؛ إذا حقق السعر قمة جديدة يرتفع الوقف ولا ينزل أبداً.
    - بيع: يتتبع السعر للأسفل؛ إذا حقق السعر قاعاً جديداً ينخفض الوقف ولا يرتفع أبداً.
    """
    if trail_pct <= 0:
        raise ValueError("Trailing percentage must be positive")

    side_lower = side.lower()
    if side_lower == "buy":
        new_extreme = max(extreme_price, current_price)
        trailing_sl = new_extreme * (1.0 - (trail_pct / 100.0))
    else:
        new_extreme = min(extreme_price, current_price)
        trailing_sl = new_extreme * (1.0 + (trail_pct / 100.0))

    return {
        "extreme_price": round(new_extreme, 5),
        "trailing_stop_price": round(trailing_sl, 5),
    }


# ==============================================================================
# Order Lifecycle & Management
# ==============================================================================

def create_order(
    symbol: str,
    side: str,
    order_type: str,
    price: float,
    qty: float = 1.0,
    stop_loss: Optional[float] = None,
    take_profit: Optional[float] = None,
    trailing_stop_pct: Optional[float] = None,
    is_oco_group: Optional[str] = None,
    user_id: Optional[int] = None,
    owner_key: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    """
    إنشاء أمر جديد والتحقق من صحة المعطيات وإدراجه في قاعدة البيانات.
    """
    symbol_clean = symbol.strip().upper()
    side_clean = side.strip().lower()
    type_clean = order_type.strip().lower()

    if side_clean not in (OrderSide.BUY.value, OrderSide.SELL.value):
        raise ValueError(f"Invalid order side: {side}. Must be 'buy' or 'sell'.")

    valid_types = [t.value for t in OrderType]
    if type_clean not in valid_types:
        raise ValueError(f"Invalid order type: {order_type}. Must be one of {valid_types}.")

    if price <= 0:
        raise ValueError("Order price must be greater than zero.")

    if qty <= 0:
        raise ValueError("Order quantity must be positive.")

    # فحص الوقف والهدف إذا تم توفيرهما
    if stop_loss is not None and stop_loss > 0:
        if not validate_stop_loss(side_clean, price, stop_loss):
            raise ValueError(
                f"Invalid Stop Loss {stop_loss} for {side_clean.upper()} order at price {price}."
            )

    if take_profit is not None and take_profit > 0:
        if not validate_take_profit(side_clean, price, take_profit):
            raise ValueError(
                f"Invalid Take Profit {take_profit} for {side_clean.upper()} order at price {price}."
            )

    # وقف الخسارة المتحرك
    if type_clean == OrderType.TRAILING_STOP.value:
        if trailing_stop_pct is None or trailing_stop_pct <= 0:
            raise ValueError("Trailing stop order requires a positive trailing_stop_pct.")
        trail_calc = calculate_trailing_stop(price, price, trailing_stop_pct, side_clean)
        stop_loss = trail_calc["trailing_stop_price"]

    order_id = f"ord_{uuid.uuid4().hex[:12]}"

    # حفظ الأمر في قاعدة البيانات
    saved = db.add_order(
        order_id=order_id,
        symbol=symbol_clean,
        side=side_clean,
        order_type=type_clean,
        price=price,
        qty=qty,
        stop_loss_price=stop_loss,
        take_profit_price=take_profit,
        trailing_stop_pct=trailing_stop_pct,
        is_oco_group=is_oco_group,
        user_id=user_id,
        owner_key=owner_key,
        note=note,
    )
    return saved


def cancel_order(order_id: str, user_id: Optional[int] = None, owner_key: Optional[str] = None) -> bool:
    """إلغاء أمر معلق."""
    order = db.get_order(order_id)
    if not order:
        return False
    if order.get("status") != OrderStatus.PENDING.value:
        return False

    now_iso = datetime.now(timezone.utc).isoformat()
    return db.update_order_status(order_id, OrderStatus.CANCELLED.value, cancelled_at=now_iso)


def check_order_triggers(current_prices: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    فحص شروط تفعيل الأوامر المعلقة (Limit, Stop, Trailing Stop, Take Profit).
    تُستدعى عند كل إغلاق شمعة أو وصول نبضة سعرية حية.
    تتعامل مع إلغاء أوامر OCO تلقائياً عند تفعيل أحد أطرافها.
    """
    triggered_events: List[Dict[str, Any]] = []
    pending_orders = db.list_orders(status=OrderStatus.PENDING.value, limit=200)

    for order in pending_orders:
        symbol = order["symbol"]
        curr_price = current_prices.get(symbol)
        if curr_price is None or curr_price <= 0:
            continue

        oid = order["id"]
        order_type = order["order_type"]
        side = order["side"]
        target_price = float(order["price"])
        stop_loss = float(order["stop_loss_price"]) if order.get("stop_loss_price") else None
        take_profit = float(order["take_profit_price"]) if order.get("take_profit_price") else None
        oco_group = order.get("is_oco_group")

        is_triggered = False
        trigger_reason = ""
        execution_price = curr_price

        # 1. أوامر الحد (Limit Orders)
        if order_type == OrderType.LIMIT.value:
            if side == OrderSide.BUY.value and curr_price <= target_price:
                is_triggered = True
                trigger_reason = f"Buy Limit filled at {curr_price} <= {target_price}"
            elif side == OrderSide.SELL.value and curr_price >= target_price:
                is_triggered = True
                trigger_reason = f"Sell Limit filled at {curr_price} >= {target_price}"

        # 2. أوامر الوقف (Stop Orders)
        elif order_type == OrderType.STOP.value:
            if side == OrderSide.BUY.value and curr_price >= target_price:
                is_triggered = True
                trigger_reason = f"Buy Stop triggered at {curr_price} >= {target_price}"
            elif side == OrderSide.SELL.value and curr_price <= target_price:
                is_triggered = True
                trigger_reason = f"Sell Stop triggered at {curr_price} <= {target_price}"

        # 3. أوامر وقف الخسارة المتحرك (Trailing Stop)
        elif order_type == OrderType.TRAILING_STOP.value:
            trail_pct = float(order["trailing_stop_pct"] or 1.0)
            highest = float(order.get("highest_price") or target_price)
            lowest = float(order.get("lowest_price") or target_price)

            if side == OrderSide.BUY.value:
                # تحقق من ضرب وقف الخسارة
                if stop_loss and curr_price <= stop_loss:
                    is_triggered = True
                    trigger_reason = f"Trailing Stop hit at {curr_price} <= {stop_loss}"
                elif curr_price > highest:
                    # تحديث القمة والوقف للأعلى
                    updated = calculate_trailing_stop(curr_price, highest, trail_pct, "buy")
                    db.update_order_trailing(
                        oid,
                        highest_price=updated["extreme_price"],
                        stop_loss_price=updated["trailing_stop_price"]
                    )
            else:
                # بيع
                if stop_loss and curr_price >= stop_loss:
                    is_triggered = True
                    trigger_reason = f"Trailing Stop hit at {curr_price} >= {stop_loss}"
                elif curr_price < lowest:
                    # تحديث القاع والوقف للأسفل
                    updated = calculate_trailing_stop(curr_price, lowest, trail_pct, "sell")
                    db.update_order_trailing(
                        oid,
                        lowest_price=updated["extreme_price"],
                        stop_loss_price=updated["trailing_stop_price"]
                    )

        # 4. أوامر السوق المباشرة (Market Orders)
        elif order_type == OrderType.MARKET.value:
            is_triggered = True
            trigger_reason = f"Market Order executed at {curr_price}"

        # فحص إضافي لأخذ الربح / وقف الخسارة للأمر المرتبط
        if not is_triggered and (stop_loss or take_profit):
            if side == OrderSide.BUY.value:
                if stop_loss and curr_price <= stop_loss:
                    is_triggered = True
                    trigger_reason = f"Stop Loss hit at {curr_price} <= {stop_loss}"
                elif take_profit and curr_price >= take_profit:
                    is_triggered = True
                    trigger_reason = f"Take Profit hit at {curr_price} >= {take_profit}"
            else:
                if stop_loss and curr_price >= stop_loss:
                    is_triggered = True
                    trigger_reason = f"Stop Loss hit at {curr_price} >= {stop_loss}"
                elif take_profit and curr_price <= take_profit:
                    is_triggered = True
                    trigger_reason = f"Take Profit hit at {curr_price} <= {take_profit}"

        if is_triggered:
            now_iso = datetime.now(timezone.utc).isoformat()
            db.update_order_status(oid, OrderStatus.FILLED.value, filled_at=now_iso)

            cancelled_oco = []
            if oco_group:
                cancelled_oco = db.cancel_oco_group(oco_group, oid)

            event = {
                "order_id": oid,
                "symbol": symbol,
                "side": side,
                "order_type": order_type,
                "execution_price": execution_price,
                "qty": float(order["qty"]),
                "reason": trigger_reason,
                "oco_cancelled": cancelled_oco,
                "timestamp": now_iso,
            }
            triggered_events.append(event)

    return triggered_events
