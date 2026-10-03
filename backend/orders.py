"""
backend/orders.py — Advanced Order Types & Risk Management (Task 13)
Architect: Claude (Chief Architect)
Builder: Google AI Studio (Lead Builder)
Pure Forex & Precious Metals. Zero Crypto.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union

try:
    from backend.db import get_db, _conn
except ImportError:
    try:
        from db import get_db, _conn
    except ImportError:
        import db
        def get_db():
            return db._conn()


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
    ACTIVE = "active"
    FILLED = "filled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


@dataclass
class Order:
    id: str
    user_id: str
    symbol: str
    order_type: OrderType
    side: str  # 'buy' or 'sell'
    qty: Union[int, float]
    price: float  # Entry price
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop_pct: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    filled_price: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'symbol': self.symbol,
            'order_type': self.order_type.value if hasattr(self.order_type, 'value') else str(self.order_type),
            'side': self.side,
            'qty': self.qty,
            'price': self.price,
            'stop_loss': self.stop_loss,
            'take_profit': self.take_profit,
            'trailing_stop_pct': self.trailing_stop_pct,
            'status': self.status.value if hasattr(self.status, 'value') else str(self.status),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'filled_at': self.filled_at.isoformat() if self.filled_at else None,
            'filled_price': self.filled_price,
        }


def validate_order(
    symbol: str,
    order_type: Union[OrderType, str],
    price: float,
    qty: Union[int, float],
    stop_loss: Optional[float],
    take_profit: Optional[float],
    side: str = "buy"
) -> Tuple[bool, str]:
    """
    Validate order parameters. Returns (is_valid, error_message).
    """
    if qty <= 0:
        return False, "Quantity must be > 0"

    if price <= 0:
        return False, "Price must be > 0"

    if side.lower() == "buy":
        if stop_loss is not None and stop_loss >= price:
            return False, f"Stop loss ({stop_loss}) must be below entry ({price})"

        if take_profit is not None and take_profit <= price:
            return False, f"Take profit ({take_profit}) must be above entry ({price})"
    elif side.lower() == "sell":
        if stop_loss is not None and stop_loss <= price:
            return False, f"Stop loss ({stop_loss}) must be above entry ({price})"

        if take_profit is not None and (take_profit >= price or take_profit <= 0):
            return False, f"Take profit ({take_profit}) must be below entry ({price}) and > 0"
    else:
        return False, f"Invalid side: {side}"

    if stop_loss and take_profit:
        if side.lower() == "buy":
            risk = price - stop_loss
            reward = take_profit - price
        else:  # sell
            risk = stop_loss - price
            reward = price - take_profit
            
        risk_reward_ratio = reward / risk if risk > 0 else 0

        if risk_reward_ratio < 1:
            return False, f"Risk-Reward ratio is {risk_reward_ratio:.2f} (minimum 1:1 recommended)"

    return True, ""


def validate_stop_loss(
    position_price: float,
    stop_loss: float,
    max_risk_pct: float = 5.0,
    side: str = "buy"
) -> Tuple[bool, str]:
    """
    Validate stop loss doesn't exceed max risk percentage.
    """
    if side.lower() == "buy":
        if stop_loss >= position_price:
            return False, "Stop loss must be below entry price"
        risk_pct = ((position_price - stop_loss) / position_price) * 100
    elif side.lower() == "sell":
        if stop_loss <= position_price:
            return False, "Stop loss must be above entry price"
        risk_pct = ((stop_loss - position_price) / position_price) * 100
    else:
        return False, f"Invalid side: {side}"

    if risk_pct > max_risk_pct:
        return False, f"Stop loss risk is {risk_pct:.2f}% (max {max_risk_pct}%)"

    return True, ""


def validate_take_profit(side: str, entry: float, take_profit: float) -> bool:
    """
    Validate take profit based on order side.
    """
    if side.lower() == "buy":
        return take_profit > entry
    elif side.lower() == "sell":
        return 0 < take_profit < entry
    else:
        return False


def calculate_trailing_stop(
    current_price: float,
    entry_price: float,
    trail_pct: float,
    side: str = "buy"
) -> float:
    """
    Calculate trailing stop price based on percentage.
    For BUY orders: stop = current_price * (1 - trail_pct/100)
    For SELL orders: stop = current_price * (1 + trail_pct/100)
    """
    if side.lower() == "buy":
        return current_price * (1 - trail_pct / 100)
    elif side.lower() == "sell":
        return current_price * (1 + trail_pct / 100)
    else:
        # Default to buy behavior for invalid side
        return current_price * (1 - trail_pct / 100)


def calculate_risk_reward_ratio(entry: float, stop_loss: float, take_profit: float, side: str = "buy") -> float:
    """
    Calculate risk-reward ratio: reward / risk
    """
    if side.lower() == "buy":
        if stop_loss >= entry:
            return 0.0
        risk = entry - stop_loss
        reward = take_profit - entry
    elif side.lower() == "sell":
        if stop_loss <= entry:
            return 0.0
        risk = stop_loss - entry
        reward = entry - take_profit
    else:
        # Default to buy behavior for invalid side
        if stop_loss >= entry:
            return 0.0
        risk = entry - stop_loss
        reward = take_profit - entry

    return reward / risk if risk > 0 else 0.0


def calculate_position_size(
    account_balance: float,
    risk_pct: float,
    entry: float,
    stop_loss: float
) -> int:
    """
    Calculate position size based on account balance and risk percentage.
    """
    if stop_loss >= entry:
        return 0

    risk_amount = account_balance * (risk_pct / 100)
    risk_per_unit = round(entry - stop_loss, 6)

    position_size = int(round(risk_amount / risk_per_unit, 4))
    return max(1, position_size)


def create_order(
    user_id: str = "default_user",
    symbol: str = "EURUSD",
    order_type: str = "market",
    side: str = "buy",
    qty: Union[int, float] = 1,
    price: float = 1.0,
    stop_loss: Optional[float] = None,
    take_profit: Optional[float] = None,
    trailing_stop_pct: Optional[float] = None,
    is_oco_group: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict:
    """
    Create a new order. Returns order dict with ID.
    """
    # Normalize order_type
    ot_val = order_type.value if hasattr(order_type, 'value') else str(order_type).lower()
    
    # Normalize side
    side_normalized = side.lower() if isinstance(side, str) else str(side).lower()
    if hasattr(side, 'value'):
        side_normalized = side.value.lower()

    # Validate
    is_valid, error = validate_order(
        symbol,
        OrderType(ot_val),
        price,
        qty,
        stop_loss,
        take_profit,
        side_normalized
    )
    if not is_valid:
        return {'success': False, 'error': error}

    # Validate stop loss if provided
    if stop_loss is not None:
        is_valid, error = validate_stop_loss(price, stop_loss, side=side_normalized)
        if not is_valid:
            return {'success': False, 'error': error}

    order_id = f"{user_id}_{symbol}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    now = datetime.now(timezone.utc)

    try:
        with get_db() as c:
            c.execute("""
                INSERT INTO orders (
                    id, user_id, symbol, order_type, side, qty, price,
                    stop_loss_price, take_profit_price, trailing_stop_pct,
                    status, created_at, is_oco_group, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id, user_id, symbol.upper(), ot_val, side_normalized, qty, price,
                stop_loss, take_profit, trailing_stop_pct,
                OrderStatus.ACTIVE.value, now.isoformat(), is_oco_group, note
            ))
            c.commit()

        return {
            'success': True,
            'order_id': order_id,
            'id': order_id,
            'symbol': symbol.upper(),
            'order_type': ot_val,
            'side': side_normalized,
            'qty': qty,
            'price': price,
            'status': OrderStatus.ACTIVE.value,
            'message': f"Order created: {qty} {symbol} at {price}"
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_user_orders(user_id: str, status: Optional[str] = None) -> List[Dict]:
    """
    Get all orders for a user, optionally filtered by status.
    """
    with get_db() as c:
        if status:
            rows = c.execute("""
                SELECT * FROM orders WHERE user_id = ? AND status = ?
                ORDER BY created_at DESC
            """, (user_id, status)).fetchall()
        else:
            rows = c.execute("""
                SELECT * FROM orders WHERE user_id = ?
                ORDER BY created_at DESC
            """, (user_id,)).fetchall()

    return [dict(row) for row in rows]


def cancel_order(user_id: str, order_id: str) -> Dict:
    """
    Cancel an active order.
    """
    with get_db() as c:
        # Check ownership
        order = c.execute("""
            SELECT * FROM orders WHERE id = ? AND user_id = ?
        """, (order_id, user_id)).fetchone()

        if not order:
            return {'success': False, 'error': 'Order not found'}

        if order['status'] != OrderStatus.ACTIVE.value:
            return {'success': False, 'error': f"Cannot cancel {order['status']} order"}

        try:
            c.execute("""
                UPDATE orders SET status = ?, cancelled_at = ? WHERE id = ?
            """, (OrderStatus.CANCELLED.value, datetime.now(timezone.utc).isoformat(), order_id))
            c.commit()

            return {'success': True, 'message': 'Order cancelled'}
        except Exception as e:
            return {'success': False, 'error': str(e)}


def check_order_triggers(symbol: str, current_price: float) -> List[Dict]:
    """
    Check if any stop-loss or take-profit orders should trigger.
    Called when a new candle closes.
    """
    triggered = []
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as c:
        # Get all active orders for the symbol
        orders = c.execute("""
            SELECT * FROM orders WHERE symbol = ? AND status = ?
        """, (symbol.upper(), OrderStatus.ACTIVE.value)).fetchall()

        for order in orders:
            side = order['side'].lower()
            stop_loss_price = order['stop_loss_price']
            take_profit_price = order['take_profit_price']
            trailing_stop_pct = order['trailing_stop_pct']

            # 1. Stop Loss orders
            if stop_loss_price is not None:
                should_trigger = False
                if side == 'buy' and current_price <= stop_loss_price:
                    should_trigger = True
                elif side == 'sell' and current_price >= stop_loss_price:
                    should_trigger = True

                if should_trigger:
                    triggered.append({
                        'order_id': order['id'],
                        'type': 'STOP_LOSS',
                        'current_price': current_price,
                        'trigger_price': stop_loss_price
                    })

                    c.execute("""
                        UPDATE orders SET status = ?, filled_price = ?, filled_at = ?
                        WHERE id = ?
                    """, (OrderStatus.FILLED.value, current_price, now_iso, order['id']))

            # 2. Take Profit orders
            if take_profit_price is not None:
                should_trigger = False
                if side == 'buy' and current_price >= take_profit_price:
                    should_trigger = True
                elif side == 'sell' and current_price <= take_profit_price:
                    should_trigger = True

                if should_trigger:
                    triggered.append({
                        'order_id': order['id'],
                        'type': 'TAKE_PROFIT',
                        'current_price': current_price,
                        'trigger_price': take_profit_price
                    })

                    c.execute("""
                        UPDATE orders SET status = ?, filled_price = ?, filled_at = ?
                        WHERE id = ?
                    """, (OrderStatus.FILLED.value, current_price, now_iso, order['id']))

            # 3. Trailing Stop orders
            if trailing_stop_pct is not None:
                new_stop = calculate_trailing_stop(current_price, float(order['price']), float(trailing_stop_pct), side)

                should_trigger = False
                if side == 'buy' and current_price <= new_stop:
                    should_trigger = True
                elif side == 'sell' and current_price >= new_stop:
                    should_trigger = True

                if should_trigger:
                    triggered.append({
                        'order_id': order['id'],
                        'type': 'TRAILING_STOP',
                        'current_price': current_price,
                        'trigger_price': new_stop
                    })

                    c.execute("""
                        UPDATE orders SET status = ?, filled_price = ?, filled_at = ?
                        WHERE id = ?
                    """, (OrderStatus.FILLED.value, current_price, now_iso, order['id']))
                else:
                    c.execute("""
                        UPDATE orders SET stop_loss_price = ? WHERE id = ?
                    """, (new_stop, order['id']))

        c.commit()

    return triggered
