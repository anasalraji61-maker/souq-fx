import { apiClient } from './client';

/**
 * Tools API: screener, economic calendar, news, backtest.
 * The shapes follow the server exactly (main.py / screener.py / econ_calendar.py / backtest.py).
 * Nothing is invented when a value is missing: fields stay null and the UI shows "—".
 */

// ------------------------------------------------------------------------------------------------
// Screener

export const SCREENER_FILTER_IDS = [
  'rsi_oversold',
  'rsi_overbought',
  'ma_cross_up',
  'ma_cross_down',
  'macd_cross_up',
  'bullish',
  'bearish',
] as const;
export type ScreenerFilterId = (typeof SCREENER_FILTER_IDS)[number];

/** Symbols the market-data provider serves (twelve_data.SYMBOL_MAP), grouped for the filter chips. */
export const SCREENER_UNIVERSE: Record<'forex' | 'metals' | 'energy', string[]> = {
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'EURAUD', 'EURCHF', 'CADJPY'],
  metals: ['XAUUSD', 'XAGUSD'],
  energy: ['USOIL', 'UKOIL'],
};

export interface ScreenerHit {
  symbol: string;
  timeframe: string;
  last: number | null;
  change_pct: number | null;
  rsi: number | null;
  filters_matched: string[];
  data_kind: string | null;
  /** seconds UTC: when the candles were fetched */
  as_of: number | null;
  /** seconds UTC: close time of the last candle used */
  price_as_of: number | null;
}

export interface ScreenerRunResult {
  ok: boolean;
  results: ScreenerHit[];
  scanned: number;
  failed: string[];
  insufficient: Record<string, string[]>;
  total: number;
  provider_configured: boolean | null;
  error?: string;
  isOffline?: boolean;
}

interface RawScreenerHit {
  symbol?: string;
  timeframe?: string;
  last?: number | null;
  change_pct?: number | null;
  rsi?: number | null;
  filters_matched?: string[];
  data_kind?: string | null;
  as_of?: number | null;
  price_as_of?: number | null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export async function runScreener(params: {
  timeframe: string;
  filters: ScreenerFilterId[];
  symbols: string[];
  fast?: number;
  slow?: number;
}): Promise<ScreenerRunResult> {
  const res = await apiClient.post<{
    results?: RawScreenerHit[];
    scanned?: number;
    failed?: string[];
    insufficient_data?: Record<string, string[]>;
    total?: number;
    provider_configured?: boolean;
  }>('/api/screener/run', {
    timeframe: params.timeframe,
    filters: params.filters,
    symbols: params.symbols.slice(0, 30),
    fast: params.fast ?? 9,
    slow: params.slow ?? 21,
  });
  if (res.ok && res.data) {
    const d = res.data;
    return {
      ok: true,
      results: (Array.isArray(d.results) ? d.results : []).map((r) => ({
        symbol: String(r.symbol || ''),
        timeframe: String(r.timeframe || params.timeframe),
        last: num(r.last),
        change_pct: num(r.change_pct),
        rsi: num(r.rsi),
        filters_matched: Array.isArray(r.filters_matched) ? r.filters_matched : [],
        data_kind: r.data_kind ?? null,
        as_of: num(r.as_of),
        price_as_of: num(r.price_as_of),
      })),
      scanned: d.scanned ?? 0,
      failed: Array.isArray(d.failed) ? d.failed : [],
      insufficient: d.insufficient_data || {},
      total: d.total ?? params.symbols.length,
      provider_configured: typeof d.provider_configured === 'boolean' ? d.provider_configured : null,
    };
  }
  return {
    ok: false,
    results: [],
    scanned: 0,
    failed: [],
    insufficient: {},
    total: 0,
    provider_configured: null,
    error: res.error || undefined,
    isOffline: res.isOffline,
  };
}

// ------------------------------------------------------------------------------------------------
// Economic calendar

export type CalendarImpact = 'high' | 'medium' | 'low' | 'holiday' | 'none';

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  /** '' when the source gave no known currency ("ALL" = global event) */
  currency: string;
  impact: CalendarImpact;
  /** seconds UTC; null when the source has no date */
  ts: number | null;
  /** date known but the time was not announced (holidays, tentative) */
  time_tbd: boolean;
  /** server text fallback ("2026-10-06 12:30 UTC", or "this week" in Arabic) */
  when: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

export interface CalendarResult {
  ok: boolean;
  events: EconomicCalendarEvent[];
  /** 'ok' | 'unavailable' (source unreachable: an empty list is not "no news") */
  status: 'ok' | 'unavailable' | null;
  /** seconds UTC of the data */
  as_of: number | null;
  stale: boolean;
  isOffline?: boolean;
}

interface RawCalendarEvent {
  id?: string;
  title?: string;
  currency?: string;
  impact?: string;
  ts?: number | null;
  time_tbd?: boolean;
  when?: string;
  forecast?: string | null;
  forecast_value?: string | null;
  previous?: string | null;
  actual?: string | null;
}

function figure(v: string | null | undefined): string | null {
  const s = (v ?? '').toString().trim();
  return s && s !== '—' ? s : null;
}

export async function getEconomicCalendar(): Promise<CalendarResult> {
  const res = await apiClient.get<{ events?: RawCalendarEvent[]; status?: string; as_of?: number | null; stale?: boolean }>(
    '/api/calendar'
  );
  if (res.ok && res.data && Array.isArray(res.data.events)) {
    const imp = (v?: string): CalendarImpact => {
      const s = (v || '').toLowerCase();
      return s === 'high' || s === 'medium' || s === 'low' || s === 'holiday' ? s : 'none';
    };
    return {
      ok: true,
      events: res.data.events.map((e, i) => ({
        id: e.id || `ev-${i}`,
        title: e.title || '',
        currency: (e.currency || '').toUpperCase(),
        impact: imp(e.impact),
        ts: num(e.ts),
        time_tbd: !!e.time_tbd,
        when: e.when || '',
        forecast: figure(e.forecast_value ?? e.forecast),
        previous: figure(e.previous),
        actual: figure(e.actual),
      })),
      status: res.data.status === 'unavailable' ? 'unavailable' : 'ok',
      as_of: num(res.data.as_of),
      stale: !!res.data.stale,
    };
  }
  return { ok: false, events: [], status: null, as_of: null, stale: false, isOffline: res.isOffline };
}

// ------------------------------------------------------------------------------------------------
// News (unchanged contract)

export interface NewsItem {
  id?: string;
  title: string;
  source: string;
  time: string;
  url?: string;
  symbols?: string[];
  summary?: string;
}

interface RawNewsItem {
  id?: string;
  title?: string;
  source?: string;
  time?: string;
  published_at?: string;
  url?: string;
  symbols?: string[];
  summary?: string;
  description?: string;
}

export async function getMarketNews(): Promise<{ news: NewsItem[]; isOffline: boolean }> {
  const res = await apiClient.get<{ news: RawNewsItem[] }>('/api/news');
  if (res.ok && res.data && Array.isArray(res.data.news)) {
    return {
      news: res.data.news.map((item, idx) => ({
        id: item.id || `news-${idx}`,
        title: item.title || '',
        source: item.source || '',
        time: item.time || item.published_at || '',
        url: item.url,
        symbols: Array.isArray(item.symbols) ? item.symbols : [],
        summary: item.summary || item.description || '',
      })),
      isOffline: false,
    };
  }
  return { news: [], isOffline: true };
}

// ------------------------------------------------------------------------------------------------
// Backtest

export type BacktestStrategy = 'ma_cross' | 'rsi_reversal' | 'macd_cross' | 'bb_bounce';

export interface BacktestTrade {
  side: 'long' | 'short';
  entry: number;
  exit: number;
  pnl_pct: number;
  mae_pct?: number;
  entry_time: number;
  exit_time: number;
  open?: boolean;
}

export interface BacktestStats {
  trade_count: number;
  win_rate: number | null;
  breakeven_count: number;
  total_return_pct: number | null;
  final_equity: number | null;
  avg_win_pct: number | null;
  avg_loss_pct: number | null;
  max_drawdown_pct: number | null;
  open_pnl_pct: number | null;
  spread_pips: number | null;
  costs_included: boolean | null;
  ruined_at_trade: number | null;
}

export interface BacktestResult {
  ok: boolean;
  strategy: string;
  symbol: string;
  timeframe: string;
  trades: BacktestTrade[];
  trades_truncated: boolean;
  stats: BacktestStats | null;
  /** equity, starting at 100 */
  equity_curve: number[];
  data_kind: string | null;
  unavailable_reason: string | null;
  error: string | null;
  as_of: number | null;
  isOffline?: boolean;
}

export async function runBacktest(params: {
  symbol: string;
  timeframe: string;
  strategy: BacktestStrategy;
  fast?: number;
  slow?: number;
  rsi_low?: number;
  rsi_high?: number;
}): Promise<BacktestResult> {
  const res = await apiClient.post<Record<string, unknown>>('/api/backtest', {
    symbol: params.symbol.toUpperCase(),
    timeframe: params.timeframe,
    strategy: params.strategy,
    fast: params.fast ?? 9,
    slow: params.slow ?? 21,
    rsi_low: params.rsi_low ?? 30,
    rsi_high: params.rsi_high ?? 70,
  });
  const base: BacktestResult = {
    ok: false,
    strategy: params.strategy,
    symbol: params.symbol.toUpperCase(),
    timeframe: params.timeframe,
    trades: [],
    trades_truncated: false,
    stats: null,
    equity_curve: [],
    data_kind: null,
    unavailable_reason: null,
    error: null,
    as_of: null,
  };
  if (!res.ok || !res.data) {
    return { ...base, error: res.error || 'request_failed', isOffline: res.isOffline };
  }
  const d = res.data as Record<string, unknown>;
  const s = (d.stats && typeof d.stats === 'object' ? d.stats : {}) as Record<string, unknown>;
  const hasStats = Object.keys(s).length > 0;
  const curve = Array.isArray(d.equity_curve)
    ? (d.equity_curve as unknown[])
        .map((p) => (typeof p === 'number' ? p : num((p as { equity?: unknown })?.equity)))
        .filter((v): v is number => v !== null)
    : [];
  return {
    ...base,
    ok: !d.error && d.data_kind !== 'demo',
    trades: Array.isArray(d.trades) ? (d.trades as BacktestTrade[]) : [],
    trades_truncated: !!d.trades_truncated,
    stats: hasStats
      ? {
          trade_count: Number(s.trade_count ?? 0),
          win_rate: num(s.win_rate),
          breakeven_count: Number(s.breakeven_count ?? 0),
          total_return_pct: num(s.total_return_pct),
          final_equity: num(s.final_equity),
          avg_win_pct: num(s.avg_win_pct),
          avg_loss_pct: num(s.avg_loss_pct),
          max_drawdown_pct: num(s.max_drawdown_pct),
          open_pnl_pct: num(s.open_pnl_pct),
          spread_pips: num(s.spread_pips),
          costs_included: typeof s.costs_included === 'boolean' ? s.costs_included : null,
          ruined_at_trade: num(s.ruined_at_trade),
        }
      : null,
    equity_curve: curve,
    data_kind: typeof d.data_kind === 'string' ? d.data_kind : null,
    unavailable_reason: typeof d.unavailable_reason === 'string' ? d.unavailable_reason : null,
    error: typeof d.error === 'string' ? d.error : null,
    as_of: num(d.as_of),
  };
}
