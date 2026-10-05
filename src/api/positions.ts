/**
 * src/api/positions.ts — Position Management & Real-Time P&L Client (Task 14)
 * Architecture: Claude Haiku 4.5
 * Integration: Google AI Studio
 */

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  qty: number;
  avg_entry_price?: number;
  avgEntryPrice: number;
  open_time?: string;
  openTime: string;
  status: 'open' | 'closing' | 'closed' | 'liquidated';
  close_price?: number;
  closePrice?: number;
  close_time?: string;
  closeTime?: string;
  close_reason?: string;
  closeReason?: string;
  realized_pnl?: number;
  realizedPnl?: number;
  realized_pnl_pct?: number;
  realizedPnlPct?: number;
  notes?: string;
}

export interface AccountStats {
  openPositions: number;
  totalOpenPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  totalExposure: number;
  closedTrades: number;
  winRatePct: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

const LOCAL_POSITIONS_KEY = 'matrix_local_positions_v1';

// Raw API row shape: a partial Position with snake_case overrides from the backend.
// Numeric/string values may arrive as either depending on the source.
type RawPosition = Partial<Position> & Record<string, unknown>;

function normalizePosition(d: RawPosition): Position {
  return {
    ...d,
    avgEntryPrice: d.avg_entry_price ?? d.avgEntryPrice,
    openTime: d.open_time ?? d.openTime,
    closePrice: d.close_price ?? d.closePrice,
    closeTime: d.close_time ?? d.closeTime,
    closeReason: d.close_reason ?? d.closeReason,
    realizedPnl: d.realized_pnl ?? d.realizedPnl,
    realizedPnlPct: d.realized_pnl_pct ?? d.realizedPnlPct,
  } as Position;
}

function getLocalPositions(): Position[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSITIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalPositions(positions: Position[]): void {
  try {
    localStorage.setItem(LOCAL_POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage issues
  }
}

export const positionsAPI = {
  // Create position from order
  async createPosition(
    symbol: string,
    side: 'long' | 'short',
    qty: number,
    entryPrice: number,
    entryOrderId: string,
    slOrderId?: string,
    tpOrderId?: string,
    notes?: string
  ): Promise<{ positionId: string }> {
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side,
          qty,
          entry_price: entryPrice,
          entry_order_id: entryOrderId,
          stop_loss_order_id: slOrderId,
          take_profit_order_id: tpOrderId,
          notes,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return { positionId: data.position_id || data.id };
      }
    } catch {
      // offline fallback below
    }

    const posId = `pos_local_${Date.now()}`;
    const newPos: Position = {
      id: posId,
      symbol: symbol.toUpperCase(),
      side,
      qty,
      avgEntryPrice: entryPrice,
      avg_entry_price: entryPrice,
      openTime: new Date().toISOString(),
      open_time: new Date().toISOString(),
      status: 'open',
      notes,
    };
    const local = getLocalPositions();
    local.unshift(newPos);
    saveLocalPositions(local);
    return { positionId: posId };
  },

  // Get open positions
  async getOpenPositions(symbol?: string): Promise<Position[]> {
    try {
      const params = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
      const response = await fetch(`/api/positions/open${params}`);
      if (response.ok) {
        const data = (await response.json()) as RawPosition[];
        return data.map((d) => normalizePosition(d));
      }
    } catch {
      // fallback
    }

    const local = getLocalPositions().filter((p) => p.status === 'open');
    if (symbol) {
      return local.filter((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
    }
    return local;
  },

  // Get position history
  async getPositionHistory(symbol?: string, limit: number = 100): Promise<Position[]> {
    try {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);
      params.append('limit', limit.toString());
      const response = await fetch(`/api/positions/history?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as RawPosition[];
        return data.map((d) => normalizePosition(d));
      }
    } catch {
      // fallback
    }

    const local = getLocalPositions().filter((p) => p.status !== 'open');
    if (symbol) {
      return local.filter((p) => p.symbol.toUpperCase() === symbol.toUpperCase()).slice(0, limit);
    }
    return local.slice(0, limit);
  },

  // Close position
  async closePosition(
    positionId: string,
    closePrice: number,
    closeReason: string = 'manual'
  ): Promise<{ realizedPnl: number; realizedPnlPct: number }> {
    try {
      const response = await fetch(`/api/positions/${positionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          close_price: closePrice,
          close_reason: closeReason,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return {
          realizedPnl: data.realized_pnl ?? data.realizedPnl ?? 0,
          realizedPnlPct: data.realized_pnl_pct ?? data.realizedPnlPct ?? 0,
        };
      }
    } catch {
      // fallback
    }

    const local = getLocalPositions();
    const pos = local.find((p) => p.id === positionId);
    let pnl = 0;
    let pnlPct = 0;
    if (pos && pos.status === 'open') {
      pnl = this.calculateUnrealizedPnl(pos.side, pos.qty, pos.avgEntryPrice, closePrice);
      pnlPct = this.calculateUnrealizedPnlPct(pos.side, pos.qty, pos.avgEntryPrice, closePrice);
      pos.status = 'closed';
      pos.closePrice = closePrice;
      pos.close_price = closePrice;
      pos.closeTime = new Date().toISOString();
      pos.close_time = new Date().toISOString();
      pos.closeReason = closeReason;
      pos.close_reason = closeReason;
      pos.realizedPnl = pnl;
      pos.realized_pnl = pnl;
      pos.realizedPnlPct = pnlPct;
      pos.realized_pnl_pct = pnlPct;
      saveLocalPositions(local);
    }
    return { realizedPnl: pnl, realizedPnlPct: pnlPct };
  },

  // Add to position (pyramiding)
  async addToPosition(
    positionId: string,
    qty: number,
    entryPrice: number
  ): Promise<{ newQty: number; newAvgPrice: number }> {
    try {
      const response = await fetch(`/api/positions/${positionId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty,
          entry_price: entryPrice,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return {
          newQty: data.new_qty,
          newAvgPrice: data.new_avg_price,
        };
      }
    } catch {
      // fallback
    }

    const local = getLocalPositions();
    const pos = local.find((p) => p.id === positionId);
    if (pos && pos.status === 'open') {
      const totalQty = pos.qty + qty;
      const newAvg = (pos.avgEntryPrice * pos.qty + entryPrice * qty) / totalQty;
      pos.qty = totalQty;
      pos.avgEntryPrice = newAvg;
      pos.avg_entry_price = newAvg;
      saveLocalPositions(local);
      return { newQty: totalQty, newAvgPrice: newAvg };
    }
    return { newQty: qty, newAvgPrice: entryPrice };
  },

  // Get account stats
  async getAccountStats(currentPrices: Record<string, number>): Promise<AccountStats> {
    try {
      const response = await fetch('/api/positions/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_prices: currentPrices }),
      });
      if (response.ok) {
        const d = await response.json();
        return {
          openPositions: d.open_positions ?? 0,
          totalOpenPnl: d.total_open_pnl ?? 0,
          totalRealizedPnl: d.total_realized_pnl ?? 0,
          totalPnl: d.total_pnl ?? 0,
          totalExposure: d.total_exposure ?? 0,
          closedTrades: d.closed_trades ?? 0,
          winRatePct: d.win_rate_pct ?? 0,
          profitFactor: d.profit_factor ?? 0,
          avgWin: d.avg_win ?? 0,
          avgLoss: d.avg_loss ?? 0,
        };
      }
    } catch {
      // fallback
    }

    return {
      openPositions: 0,
      totalOpenPnl: 0,
      totalRealizedPnl: 0,
      totalPnl: 0,
      totalExposure: 0,
      closedTrades: 0,
      winRatePct: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
    };
  },

  // Calculate unrealized P&L for position (1,000 contract multiplier)
  calculateUnrealizedPnl(
    side: 'long' | 'short',
    qty: number,
    entryPrice: number,
    currentPrice: number
  ): number {
    const diff = side === 'long' ? currentPrice - entryPrice : entryPrice - currentPrice;
    return Math.round(diff * qty * 1000 * 100) / 100;
  },

  // Calculate unrealized P&L percentage
  calculateUnrealizedPnlPct(
    side: 'long' | 'short',
    qty: number,
    entryPrice: number,
    currentPrice: number
  ): number {
    const pnl = this.calculateUnrealizedPnl(side, qty, entryPrice, currentPrice);
    const nominal = entryPrice * qty * 1000;
    return nominal > 0 ? (pnl / nominal) * 100 : 0;
  },
};
