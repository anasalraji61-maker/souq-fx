import { apiClient } from './client';
import { Candle } from '../types/market';
import { JournalEntry } from './journal';

export interface OrderFlowBar {
  time: number;
  close: number;
  delta: number;
  cumulative_delta: number;
  buy_volume: number;
  sell_volume: number;
  imbalance_pct: number;
  label: string; // "تقديري"
}

export interface VaRResult {
  equity: number;
  confidence_95: {
    var_pct: number;
    var_amount: number;
    cvar_pct: number;
    cvar_amount: number;
  };
  confidence_99: {
    var_pct: number;
    var_amount: number;
    cvar_pct: number;
    cvar_amount: number;
  };
  sample_size: number;
}

export interface CorrelationMatrixResult {
  symbols: string[];
  matrix: Record<string, Record<string, number>>;
}

export interface StressScenarioResult {
  name: string;
  shock_pct: number;
  estimated_pnl: number;
  projected_equity: number;
  equity_impact_pct: number;
  status: 'STABLE' | 'WARNING' | 'DANGER';
}

export interface PerformanceResult {
  initial_balance: number;
  current_equity: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  max_drawdown_usd: number;
  equity_curve: {
    trade_num: number;
    equity: number;
    pnl: number;
    date: string;
  }[];
  by_symbol: Record<string, { trades: number; pnl: number; win_rate: number }>;
  by_timeframe: Record<string, { trades: number; pnl: number; win_rate: number }>;
}

// 4.3 & 4.4 Order Flow calculation on closed candles only
export async function fetchOrderFlowAnalysis(
  closedCandles: Candle[],
  symbol: string,
  timeframe: string
): Promise<{ data: OrderFlowBar[] | null; isOffline: boolean }> {
  if (!closedCandles || closedCandles.length < 5) {
    return { data: null, isOffline: false };
  }

  const res = await apiClient.post<OrderFlowBar[]>('/api/analysis/order-flow', {
    candles: closedCandles,
    symbol,
    timeframe,
  });

  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return { data: res.data, isOffline: false };
  }

  // Local fallback computed from closed candles
  let cvd = 0;
  const bars: OrderFlowBar[] = closedCandles.map((c) => {
    const range = c.high - c.low || 1;
    const bodyBuy = (c.close - c.low) / range;
    const buyVol = Math.round(c.volume * Math.max(0.1, Math.min(0.9, bodyBuy)));
    const sellVol = c.volume - buyVol;
    const delta = buyVol - sellVol;
    cvd += delta;
    const imbalance = Math.round(((buyVol - sellVol) / (c.volume || 1)) * 100);

    return {
      time: c.time,
      close: c.close,
      delta,
      cumulative_delta: cvd,
      buy_volume: buyVol,
      sell_volume: sellVol,
      imbalance_pct: imbalance,
      label: 'تقديري',
    };
  });

  return { data: bars, isOffline: true };
}

// 4.1 VaR / CVaR 95 and 99
export async function fetchVaRAnalysis(
  closedTrades: JournalEntry[],
  equity: number = 10000
): Promise<{ data: VaRResult | null; isOffline: boolean }> {
  if (!closedTrades || closedTrades.length === 0) {
    return { data: null, isOffline: false };
  }

  const res = await apiClient.post<VaRResult>('/api/analysis/var', {
    trades: closedTrades,
    equity,
  });

  if (res.ok && res.data) {
    return { data: res.data, isOffline: false };
  }

  // Local calculation from closed trades
  const returns = closedTrades.map((t) => t.pnl / equity);
  returns.sort((a, b) => a - b); // ascending losses first

  const idx95 = Math.floor(returns.length * 0.05);
  const idx99 = Math.floor(returns.length * 0.01);

  const var95_ret = Math.abs(returns[idx95] || returns[0] || 0.015);
  const var99_ret = Math.abs(returns[idx99] || returns[0] || 0.035);

  const tail95 = returns.slice(0, Math.max(1, idx95));
  const cvar95_ret =
    Math.abs(tail95.reduce((acc, r) => acc + r, 0) / tail95.length) || var95_ret * 1.25;

  const tail99 = returns.slice(0, Math.max(1, idx99));
  const cvar99_ret =
    Math.abs(tail99.reduce((acc, r) => acc + r, 0) / tail99.length) || var99_ret * 1.35;

  const result: VaRResult = {
    equity,
    confidence_95: {
      var_pct: parseFloat((var95_ret * 100).toFixed(2)),
      var_amount: parseFloat((var95_ret * equity).toFixed(2)),
      cvar_pct: parseFloat((cvar95_ret * 100).toFixed(2)),
      cvar_amount: parseFloat((cvar95_ret * equity).toFixed(2)),
    },
    confidence_99: {
      var_pct: parseFloat((var99_ret * 100).toFixed(2)),
      var_amount: parseFloat((var99_ret * equity).toFixed(2)),
      cvar_pct: parseFloat((cvar99_ret * 100).toFixed(2)),
      cvar_amount: parseFloat((cvar99_ret * equity).toFixed(2)),
    },
    sample_size: closedTrades.length,
  };

  return { data: result, isOffline: true };
}

// 4.1 Correlation Matrix
export async function fetchCorrelationAnalysis(
  symbolPriceSeries: Record<string, number[]>
): Promise<{ data: CorrelationMatrixResult | null; isOffline: boolean }> {
  const symbols = Object.keys(symbolPriceSeries);
  if (symbols.length < 2) return { data: null, isOffline: false };

  const res = await apiClient.post<CorrelationMatrixResult>('/api/analysis/correlation', {
    series: symbolPriceSeries,
  });

  if (res.ok && res.data && res.data.matrix) {
    return { data: res.data, isOffline: false };
  }

  // Local Pearson Correlation
  const matrix: Record<string, Record<string, number>> = {};
  symbols.forEach((s1) => {
    matrix[s1] = {};
    symbols.forEach((s2) => {
      if (s1 === s2) {
        matrix[s1][s2] = 1.0;
        return;
      }
      const arr1 = symbolPriceSeries[s1];
      const arr2 = symbolPriceSeries[s2];
      const len = Math.min(arr1.length, arr2.length);
      if (len < 5) {
        matrix[s1][s2] = 0;
        return;
      }
      // Returns
      const ret1 = [];
      const ret2 = [];
      for (let i = 1; i < len; i++) {
        ret1.push((arr1[i] - arr1[i - 1]) / (arr1[i - 1] || 1));
        ret2.push((arr2[i] - arr2[i - 1]) / (arr2[i - 1] || 1));
      }
      const mean1 = ret1.reduce((a, b) => a + b, 0) / ret1.length;
      const mean2 = ret2.reduce((a, b) => a + b, 0) / ret2.length;
      let num = 0;
      let den1 = 0;
      let den2 = 0;
      for (let i = 0; i < ret1.length; i++) {
        const d1 = ret1[i] - mean1;
        const d2 = ret2[i] - mean2;
        num += d1 * d2;
        den1 += d1 * d1;
        den2 += d2 * d2;
      }
      const denom = Math.sqrt(den1 * den2);
      const r = denom === 0 ? 0 : num / denom;
      matrix[s1][s2] = parseFloat(r.toFixed(2));
    });
  });

  return { data: { symbols, matrix }, isOffline: true };
}

// 4.1 Stress Test (±2%, ±5%)
export async function fetchStressTestAnalysis(
  closedTrades: JournalEntry[],
  equity: number = 10000
): Promise<{ data: StressScenarioResult[] | null; isOffline: boolean }> {
  if (!closedTrades || closedTrades.length === 0) return { data: null, isOffline: false };

  const res = await apiClient.post<StressScenarioResult[]>('/api/analysis/stress-test', {
    trades: closedTrades,
    equity,
  });

  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return { data: res.data, isOffline: false };
  }

  // Local stress test calculations for ±2% and ±5%
  const avgTradeExposure =
    closedTrades.reduce((acc, t) => acc + t.lots * 100000, 0) / (closedTrades.length || 1);

  const shocks = [
    { name: 'صدمة إيجابية طفيفة (+2%)', shock: 0.02 },
    { name: 'صدمة سلبية طفيفة (-2%)', shock: -0.02 },
    { name: 'صدمة سيولة حادة (+5%)', shock: 0.05 },
    { name: 'صدمة سيولة عنيفة (-5%)', shock: -0.05 },
  ];

  const results: StressScenarioResult[] = shocks.map((sc) => {
    const estPnl = Math.round(avgTradeExposure * sc.shock * 0.15); // diversified factor
    const projEq = Math.max(0, equity + estPnl);
    const impactPct = parseFloat(((estPnl / equity) * 100).toFixed(2));
    let status: 'STABLE' | 'WARNING' | 'DANGER' = 'STABLE';
    if (impactPct < -15) status = 'DANGER';
    else if (impactPct < -5) status = 'WARNING';

    return {
      name: sc.name,
      shock_pct: sc.shock * 100,
      estimated_pnl: estPnl,
      projected_equity: projEq,
      equity_impact_pct: impactPct,
      status,
    };
  });

  return { data: results, isOffline: true };
}

// 4.2 Performance Analysis & Equity Curve
export async function fetchPerformanceAnalysis(
  closedTrades: JournalEntry[],
  initialBalance: number = 10000
): Promise<{ data: PerformanceResult | null; isOffline: boolean }> {
  if (!closedTrades || closedTrades.length === 0) return { data: null, isOffline: false };

  const res = await apiClient.post<PerformanceResult>('/api/analysis/performance', {
    trades: closedTrades,
    initialBalance,
  });

  if (res.ok && res.data && res.data.equity_curve) {
    return { data: res.data, isOffline: false };
  }

  // Local Performance & Equity Curve
  let currentEq = initialBalance;
  let peak = initialBalance;
  let maxDd = 0;
  let maxDdPct = 0;

  const sortedTrades = [...closedTrades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const equityCurve = [
    { trade_num: 0, equity: initialBalance, pnl: 0, date: sortedTrades[0]?.date || 'البداية' },
  ];

  const bySymbol: Record<string, { trades: number; pnl: number; wins: number; win_rate: number }> =
    {};
  const byTimeframe: Record<
    string,
    { trades: number; pnl: number; wins: number; win_rate: number }
  > = {};

  sortedTrades.forEach((t, idx) => {
    currentEq += t.pnl;
    if (currentEq > peak) peak = currentEq;
    const dd = peak - currentEq;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
    if (ddPct > maxDdPct) maxDdPct = ddPct;

    equityCurve.push({
      trade_num: idx + 1,
      equity: parseFloat(currentEq.toFixed(2)),
      pnl: t.pnl,
      date: t.date,
    });

    // By Symbol
    if (!bySymbol[t.symbol]) {
      bySymbol[t.symbol] = { trades: 0, pnl: 0, wins: 0, win_rate: 0 };
    }
    bySymbol[t.symbol].trades++;
    bySymbol[t.symbol].pnl += t.pnl;
    if (t.pnl > 0) bySymbol[t.symbol].wins++;

    // By Timeframe (or tag)
    const tf = t.tags.find((tag) => ['1m', '5m', '15m', '1h', '4h', '1D'].includes(tag)) || '1h';
    if (!byTimeframe[tf]) {
      byTimeframe[tf] = { trades: 0, pnl: 0, wins: 0, win_rate: 0 };
    }
    byTimeframe[tf].trades++;
    byTimeframe[tf].pnl += t.pnl;
    if (t.pnl > 0) byTimeframe[tf].wins++;
  });

  // Calculate win rates
  Object.keys(bySymbol).forEach((k) => {
    bySymbol[k].win_rate = Math.round((bySymbol[k].wins / bySymbol[k].trades) * 100);
    bySymbol[k].pnl = parseFloat(bySymbol[k].pnl.toFixed(2));
  });
  Object.keys(byTimeframe).forEach((k) => {
    byTimeframe[k].win_rate = Math.round((byTimeframe[k].wins / byTimeframe[k].trades) * 100);
    byTimeframe[k].pnl = parseFloat(byTimeframe[k].pnl.toFixed(2));
  });

  const wins = sortedTrades.filter((t) => t.pnl > 0);
  const losses = sortedTrades.filter((t) => t.pnl < 0);
  const winRate = (wins.length / sortedTrades.length) * 100;

  const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 99.9;

  // Sharpe ratio approximation
  const pnlList = sortedTrades.map((t) => t.pnl);
  const meanPnl = pnlList.reduce((a, b) => a + b, 0) / pnlList.length;
  const variance = pnlList.reduce((acc, v) => acc + Math.pow(v - meanPnl, 2), 0) / pnlList.length;
  const stdDev = Math.sqrt(variance) || 1;
  const sharpe = parseFloat(((meanPnl / stdDev) * Math.sqrt(252)).toFixed(2));

  return {
    data: {
      initial_balance: initialBalance,
      current_equity: parseFloat(currentEq.toFixed(2)),
      total_trades: sortedTrades.length,
      winning_trades: wins.length,
      losing_trades: losses.length,
      win_rate: parseFloat(winRate.toFixed(1)),
      profit_factor: parseFloat(profitFactor.toFixed(2)),
      sharpe_ratio: Math.max(-5, Math.min(10, sharpe)),
      max_drawdown_pct: parseFloat(maxDdPct.toFixed(2)),
      max_drawdown_usd: parseFloat(maxDd.toFixed(2)),
      equity_curve: equityCurve,
      by_symbol: bySymbol,
      by_timeframe: byTimeframe,
    },
    isOffline: true,
  };
}
