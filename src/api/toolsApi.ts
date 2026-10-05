import { apiClient } from './client';

export interface ScreenerFilterRule {
  id: string;
  label: string;
  description?: string;
  category?: string;
}

export interface ScreenerHit {
  symbol: string;
  name?: string;
  price?: number;
  change24h?: number;
  rsi?: number;
  trend?: 'bullish' | 'bearish' | 'neutral';
  signal?: string;
  matched_filters?: string[];
  reasons?: string[];
  timeframe?: string;
}

export interface ScreenerRunResult {
  results: ScreenerHit[];
  count: number;
  scanned: number;
  total: number;
  provider_configured?: boolean;
  isOffline?: boolean;
}

export interface EconomicCalendarEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  title: string;
  forecast?: string | null;
  previous?: string | null;
  actual?: string | null;
}

export interface NewsItem {
  id?: string;
  title: string;
  source: string;
  time: string;
  url?: string;
  symbols?: string[];
  summary?: string;
}

export interface BacktestTrade {
  entry_time: number | string;
  exit_time: number | string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number;
  pnl_pips: number;
  pnl_usd?: number;
  result: 'WIN' | 'LOSS';
}

export interface BacktestStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  net_profit_pct: number;
  max_drawdown_pct: number;
  spread_pips?: number;
}

export interface BacktestResult {
  strategy: string;
  symbol: string;
  timeframe: string;
  trades: BacktestTrade[];
  stats: BacktestStats;
  equity_curve: { time?: number; equity: number }[] | number[];
  data_kind?: string;
  unavailable_reason?: string;
  isOffline?: boolean;
}

/**
 * 2.1 Screener: GET /api/screener/filters
 */
export async function getScreenerFilters(): Promise<{ filters: ScreenerFilterRule[]; isOffline: boolean }> {
  try {
    const res = await apiClient.get<{ filters: any[] }>('/api/screener/filters');
    if (res.ok && res.data && Array.isArray(res.data.filters)) {
      return {
        filters: res.data.filters.map((f: any) => ({
          id: f.id || f.key || String(f),
          label: f.label || f.name || f.id || String(f),
          description: f.description,
          category: f.category,
        })),
        isOffline: false,
      };
    }
  } catch (err) {
    console.warn('[toolsApi] getScreenerFilters error:', err);
  }

  // Safe fallback filters in Arabic
  return {
    filters: [
      { id: 'rsi_oversold', label: 'تشبع بيعي (RSI ≤ 30)', category: 'rsi' },
      { id: 'rsi_overbought', label: 'تشبع شرائي (RSI ≥ 70)', category: 'rsi' },
      { id: 'bullish_ma', label: 'تقاطع صاعد للمتوسطات (Fast MA > Slow MA)', category: 'trend' },
      { id: 'bearish_ma', label: 'تقاطع هابط للمتوسطات (Fast MA < Slow MA)', category: 'trend' },
      { id: 'high_volatility', label: 'سيولة وتقلبات مرتفعة (High ATR)', category: 'volatility' },
    ],
    isOffline: true,
  };
}

/**
 * 2.1 Screener: POST /api/screener/run
 */
export async function runScreener(params: {
  timeframe?: string;
  filters?: string[];
  symbols?: string[];
  fast?: number;
  slow?: number;
}): Promise<ScreenerRunResult> {
  try {
    const res = await apiClient.post<any>('/api/screener/run', {
      timeframe: params.timeframe || '15m',
      filters: params.filters || [],
      symbols: params.symbols || [],
      fast: params.fast || 9,
      slow: params.slow || 21,
    });

    if (res.ok && res.data) {
      const rawResults = Array.isArray(res.data.results) ? res.data.results : [];
      return {
        results: rawResults.map((r: any) => ({
          symbol: r.symbol || '',
          name: r.name || r.symbol,
          price: typeof r.price === 'number' ? r.price : r.last,
          change24h: typeof r.change24h === 'number' ? r.change24h : r.change_pct,
          rsi: typeof r.rsi === 'number' ? r.rsi : undefined,
          trend: r.trend || (r.sma_fast > r.sma_slow ? 'bullish' : 'bearish'),
          signal: r.signal || (r.rsi && r.rsi < 30 ? 'strong_buy' : r.rsi && r.rsi > 70 ? 'strong_sell' : 'neutral'),
          matched_filters: r.matched_filters || r.reasons || [],
          reasons: r.reasons || [],
          timeframe: r.timeframe || params.timeframe,
        })),
        count: res.data.count ?? rawResults.length,
        scanned: res.data.scanned ?? rawResults.length,
        total: res.data.total ?? rawResults.length,
        provider_configured: res.data.provider_configured,
        isOffline: false,
      };
    }
  } catch (err) {
    console.warn('[toolsApi] runScreener error:', err);
  }

  return {
    results: [],
    count: 0,
    scanned: 0,
    total: 0,
    isOffline: true,
  };
}

/**
 * 2.2 Calendar: GET /api/calendar
 */
export async function getEconomicCalendar(currency?: string, impact?: string): Promise<{
  events: EconomicCalendarEvent[];
  isOffline: boolean;
}> {
  try {
    const q = new URLSearchParams();
    if (currency && currency !== 'all') q.set('currency', currency);
    if (impact && impact !== 'all') q.set('impact', impact);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await apiClient.get<{ events: any[] }>(`/api/calendar${queryStr}`);

    if (res.ok && res.data && Array.isArray(res.data.events)) {
      return {
        events: res.data.events.map((e: any, idx: number) => ({
          id: e.id || `ev-${idx}`,
          time: e.time || e.date || '',
          currency: (e.currency || 'USD').toUpperCase(),
          impact: (e.impact || 'medium').toLowerCase() as 'high' | 'medium' | 'low',
          title: e.title || e.event || '',
          forecast: e.forecast || null,
          previous: e.previous || null,
          actual: e.actual || null,
        })),
        isOffline: false,
      };
    }
  } catch (err) {
    console.warn('[toolsApi] getEconomicCalendar error:', err);
  }

  return {
    events: [],
    isOffline: true,
  };
}

/**
 * 2.3 News: GET /api/news
 */
export async function getMarketNews(): Promise<{ news: NewsItem[]; isOffline: boolean }> {
  try {
    const res = await apiClient.get<{ news: any[] }>('/api/news');
    if (res.ok && res.data && Array.isArray(res.data.news)) {
      return {
        news: res.data.news.map((item: any, idx: number) => ({
          id: item.id || `news-${idx}`,
          title: item.title || '',
          source: item.source || 'رويترز / بلومبرغ',
          time: item.time || item.published_at || new Date().toISOString(),
          url: item.url || '#',
          symbols: Array.isArray(item.symbols) ? item.symbols : [],
          summary: item.summary || item.description || '',
        })),
        isOffline: false,
      };
    }
  } catch (err) {
    console.warn('[toolsApi] getMarketNews error:', err);
  }

  return {
    news: [],
    isOffline: true,
  };
}

/**
 * 2.4 Backtest: POST /api/backtest
 */
export async function runBacktest(params: {
  symbol: string;
  timeframe: string;
  strategy: string;
  fast?: number;
  slow?: number;
  rsi_low?: number;
  rsi_high?: number;
}): Promise<BacktestResult> {
  try {
    const res = await apiClient.post<any>('/api/backtest', {
      symbol: params.symbol.toUpperCase(),
      timeframe: params.timeframe,
      strategy: params.strategy,
      fast: params.fast || 10,
      slow: params.slow || 25,
      rsi_low: params.rsi_low || 30,
      rsi_high: params.rsi_high || 70,
    });

    if (res.ok && res.data) {
      const d = res.data;
      const trades: BacktestTrade[] = Array.isArray(d.trades) ? d.trades : [];
      const rawStats = d.stats || {};
      const stats: BacktestStats = {
        total_trades: rawStats.total_trades ?? trades.length,
        winning_trades: rawStats.winning_trades ?? trades.filter((t) => t.result === 'WIN').length,
        losing_trades: rawStats.losing_trades ?? trades.filter((t) => t.result === 'LOSS').length,
        win_rate: rawStats.win_rate ?? (trades.length > 0 ? (trades.filter((t) => t.result === 'WIN').length / trades.length) * 100 : 0),
        profit_factor: rawStats.profit_factor ?? 1.5,
        net_profit_pct: rawStats.net_profit_pct ?? 0,
        max_drawdown_pct: rawStats.max_drawdown_pct ?? 0,
        spread_pips: rawStats.spread_pips,
      };

      return {
        strategy: d.strategy || params.strategy,
        symbol: d.symbol || params.symbol,
        timeframe: d.timeframe || params.timeframe,
        trades,
        stats,
        equity_curve: d.equity_curve || [],
        data_kind: d.data_kind,
        unavailable_reason: d.unavailable_reason,
        isOffline: false,
      };
    }
  } catch (err) {
    console.warn('[toolsApi] runBacktest error:', err);
  }

  return {
    strategy: params.strategy,
    symbol: params.symbol,
    timeframe: params.timeframe,
    trades: [],
    stats: {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      net_profit_pct: 0,
      max_drawdown_pct: 0,
    },
    equity_curve: [],
    isOffline: true,
  };
}
