/**
 * MATRIX Advanced Orders & Risk Management Client API (Task 13)
 * Full support for Market, Limit, Stop, Trailing Stop, OCO, and Risk-Reward math.
 */

export type OrderType = 'market' | 'limit' | 'stop' | 'trailing_stop' | 'take_profit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'triggered';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  price: number;
  qty: number;
  stop_loss_price?: number | null;
  take_profit_price?: number | null;
  trailing_stop_pct?: number | null;
  highest_price?: number | null;
  lowest_price?: number | null;
  is_oco_group?: string | null;
  status: OrderStatus;
  created_at: string;
  filled_at?: string | null;
  cancelled_at?: string | null;
  note?: string | null;
}

export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  price: number;
  qty?: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  trailing_stop_pct?: number | null;
  is_oco_group?: string | null;
  note?: string | null;
}

export interface RiskRewardResult {
  valid: boolean;
  error?: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_distance?: number;
  reward_distance?: number;
  risk_pct?: number;
  reward_pct?: number;
  ratio?: number;
  ratio_str?: string;
  breakeven_winrate?: number;
}

const LOCAL_STORAGE_ORDERS_KEY = 'matrix_local_orders_v2';

function getStoredLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalOrders(orders: Order[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // ignore local storage errors
  }
}

/**
 * حساب محلي فوري لنسبة المخاطرة إلى العائد (Instant Client-side Calculation)
 */
export function calculateLocalRiskReward(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  side: OrderSide = 'buy'
): RiskRewardResult {
  if (entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) {
    return { valid: false, error: 'الأسعار يجب أن تكون أرقاماً موجبة أكبر من صفر' };
  }

  const riskDist = side === 'buy' ? entryPrice - stopLoss : stopLoss - entryPrice;
  const rewardDist = side === 'buy' ? takeProfit - entryPrice : entryPrice - takeProfit;

  if (riskDist <= 0) {
    return {
      valid: false,
      error: side === 'buy' ? 'وقف الخسارة يجب أن يكون أدنى من سعر الدخول' : 'وقف الخسارة يجب أن يكون أعلى من سعر الدخول',
    };
  }

  if (rewardDist <= 0) {
    return {
      valid: false,
      error: side === 'buy' ? 'الهدف الربحي يجب أن يكون أعلى من سعر الدخول' : 'الهدف الربحي يجب أن يكون أدنى من سعر الدخول',
    };
  }

  const ratio = rewardDist / riskDist;
  const riskPct = (riskDist / entryPrice) * 100;
  const rewardPct = (rewardDist / entryPrice) * 100;
  const breakevenWinrate = (1 / (1 + ratio)) * 100;

  return {
    valid: true,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_distance: Number(riskDist.toFixed(5)),
    reward_distance: Number(rewardDist.toFixed(5)),
    risk_pct: Number(riskPct.toFixed(2)),
    reward_pct: Number(rewardPct.toFixed(2)),
    ratio: Number(ratio.toFixed(2)),
    ratio_str: `1:${ratio.toFixed(2)}`,
    breakeven_winrate: Number(breakevenWinrate.toFixed(1)),
  };
}

/**
 * جلب قائمة الأوامر المعلقة والمنفذة
 */
export async function fetchOrders(status?: OrderStatus, symbol?: string): Promise<Order[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (symbol) params.append('symbol', symbol);

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) {
        return data.orders;
      }
    }
  } catch {
    // fallback to local storage
  }

  let list = getStoredLocalOrders();
  if (status) list = list.filter((o) => o.status === status);
  if (symbol) list = list.filter((o) => o.symbol.toUpperCase() === symbol.toUpperCase());
  return list;
}

/**
 * إرسال أمر تداول جديد
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: params.symbol,
        side: params.side,
        order_type: params.order_type,
        price: params.price,
        qty: params.qty ?? 1.0,
        stop_loss: params.stop_loss,
        take_profit: params.take_profit,
        trailing_stop_pct: params.trailing_stop_pct,
        is_oco_group: params.is_oco_group,
        note: params.note,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.order) {
        return data.order;
      }
    }
  } catch {
    // Offline/fallback execution
  }

  // Create local offline fallback order
  const newOrder: Order = {
    id: `ord_${Math.random().toString(36).substring(2, 11)}`,
    symbol: params.symbol.toUpperCase(),
    side: params.side,
    order_type: params.order_type,
    price: params.price,
    qty: params.qty ?? 1.0,
    stop_loss_price: params.stop_loss ?? null,
    take_profit_price: params.take_profit ?? null,
    trailing_stop_pct: params.trailing_stop_pct ?? null,
    highest_price: params.price,
    lowest_price: params.price,
    is_oco_group: params.is_oco_group ?? null,
    status: params.order_type === 'market' ? 'filled' : 'pending',
    created_at: new Date().toISOString(),
    filled_at: params.order_type === 'market' ? new Date().toISOString() : null,
    note: params.note ?? null,
  };

  const stored = getStoredLocalOrders();
  stored.unshift(newOrder);
  saveStoredLocalOrders(stored);

  return newOrder;
}

/**
 * إلغاء أمر معلق
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    if (res.ok) {
      return true;
    }
  } catch {
    // local fallback
  }

  const stored = getStoredLocalOrders();
  const found = stored.find((o) => o.id === orderId);
  if (found && found.status === 'pending') {
    found.status = 'cancelled';
    found.cancelled_at = new Date().toISOString();
    saveStoredLocalOrders(stored);
    return true;
  }
  return false;
}
