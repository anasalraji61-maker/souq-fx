import { apiClient } from './client';
import { Candle, Timeframe, MarketSymbol } from '../types/market';
import { generateCandles } from '../data/candleGenerator';
import { INITIAL_SYMBOLS } from '../data/symbols';

export interface MarketQuote {
  symbol: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  dataKind: 'provider' | 'cache' | 'demo' | 'unavailable' | 'unknown';
  asOf: number | null;
  marketOpen: boolean | null;
  isDemo: boolean;
}

export interface MarketSession {
  name: string;
  nameAr: string;
  isOpen: boolean;
  hoursUtc: string;
}

export interface MarketStatus {
  isOpen: boolean;
  currentSession: string;
  nextSession: string;
  sessions: MarketSession[];
  providerConfigured: boolean;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  currency?: string;
  exchange?: string;
  category?: 'forex' | 'metals' | 'indices' | 'energy';
}

export interface CandlesResult {
  candles: Candle[];
  isDemo: boolean;
  dataKind: 'provider' | 'cache' | 'demo' | 'unavailable' | 'unknown';
  changePct: number | null;
  lastPrice: number | null;
}

/**
 * Single mapper for backend candle fields -> frontend Candle
 */
export function mapBackendCandleToFrontend(raw: any): Candle {
  // Normalize time: backend may send seconds or milliseconds
  let timeInSeconds = typeof raw.time === 'number' ? raw.time : parseInt(raw.time, 10) || 0;
  if (timeInSeconds > 2e10) {
    timeInSeconds = Math.floor(timeInSeconds / 1000);
  }

  return {
    time: timeInSeconds,
    open: Number(raw.open) || 0,
    high: Number(raw.high) || 0,
    low: Number(raw.low) || 0,
    close: Number(raw.close) || 0,
    volume: Number(raw.volume || 0),
  };
}

/**
 * 1.1 getCandles: GET /api/charts/{symbol}?timeframe={tf}&limit={limit}
 * Maps backend fields to Candle, flags demo/fallback cleanly.
 */
export async function getCandles(
  symbol: string,
  timeframe: string = '15m',
  limit: number = 300
): Promise<CandlesResult> {
  const cleanSym = symbol.trim().toUpperCase();
  const endpoint = `/api/charts/${encodeURIComponent(cleanSym)}?timeframe=${encodeURIComponent(
    timeframe
  )}&outputsize=${limit}&limit=${limit}`;

  try {
    const res = await apiClient.get<any>(endpoint);

    if (res.ok && res.data && Array.isArray(res.data.candles) && res.data.candles.length > 0) {
      const dataKind = res.data.data_source?.kind || 'unknown';
      const isDemo = dataKind === 'demo' || dataKind === 'unavailable';
      const candles: Candle[] = res.data.candles.map(mapBackendCandleToFrontend);

      // Ensure candles are sorted ascending by time
      candles.sort((a, b) => a.time - b.time);

      return {
        candles,
        isDemo,
        dataKind,
        changePct: typeof res.data.change_pct === 'number' ? res.data.change_pct : null,
        lastPrice: typeof res.data.last === 'number' ? res.data.last : candles[candles.length - 1]?.close ?? null,
      };
    }
  } catch (err) {
    console.warn(`[market] getCandles error for ${cleanSym}, falling back to generated data:`, err);
  }

  // Safe fallback to generated demo candles with explicit isDemo flag
  const symObj = INITIAL_SYMBOLS.find((s) => s.symbol === cleanSym);
  const basePrice = symObj
    ? symObj.price
    : cleanSym.includes('JPY')
    ? 150.0
    : cleanSym.includes('XAU') || cleanSym.includes('GOLD')
    ? 2700.0
    : cleanSym.includes('OIL')
    ? 72.0
    : 1.085;
  const tf = (timeframe as Timeframe) || '15m';
  const fallback = generateCandles(basePrice, tf, limit);
  return {
    candles: fallback,
    isDemo: true,
    dataKind: 'demo',
    changePct: null,
    lastPrice: fallback[fallback.length - 1]?.close ?? null,
  };
}

/**
 * 1.1 getQuote: GET /api/market/quote/{symbol}
 */
export async function getQuote(symbol: string): Promise<MarketQuote> {
  const cleanSym = symbol.trim().toUpperCase();
  const endpoint = `/api/market/quote/${encodeURIComponent(cleanSym)}`;

  try {
    const res = await apiClient.get<any>(endpoint);

    if (res.ok && res.data) {
      const d = res.data;
      const price = typeof d.price === 'number' ? d.price : null;
      const bid = typeof d.bid === 'number' ? d.bid : null;
      const ask = typeof d.ask === 'number' ? d.ask : null;
      const spread =
        bid !== null && ask !== null ? parseFloat(Math.abs(ask - bid).toFixed(5)) : null;

      const dataKind = d.data_kind || (d.source === 'unavailable' ? 'unavailable' : 'provider');
      const isDemo = dataKind === 'demo' || dataKind === 'unavailable';

      return {
        symbol: d.symbol || cleanSym,
        price,
        bid,
        ask,
        spread,
        dataKind,
        asOf: typeof d.as_of === 'number' ? d.as_of : null,
        marketOpen: typeof d.market_open === 'boolean' ? d.market_open : null,
        isDemo,
      };
    }
  } catch (err) {
    console.warn(`[market] getQuote error for ${cleanSym}:`, err);
  }

  // Safe fallback when quote fails
  return {
    symbol: cleanSym,
    price: null,
    bid: null,
    ask: null,
    spread: null,
    dataKind: 'unavailable',
    asOf: null,
    marketOpen: null,
    isDemo: true,
  };
}

/**
 * 1.1 & 1.5 getMarketStatus: session calculation + backend status check
 */
export async function getMarketStatus(): Promise<MarketStatus> {
  let providerConfigured = false;

  try {
    const res = await apiClient.get<any>('/api/market/status');
    if (res.ok && res.data) {
      providerConfigured = !!res.data.configured;
    }
  } catch {
    // Ignore error, compute session from local clock
  }

  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const timeNum = hour + minute / 60;

  // Forex market weekend: Friday 21:00 UTC to Sunday 21:00 UTC
  const isWeekend =
    (day === 5 && timeNum >= 21) ||
    day === 6 ||
    (day === 0 && timeNum < 21);

  const sessions: MarketSession[] = [
    {
      name: 'Sydney',
      nameAr: 'سيدني',
      isOpen: !isWeekend && (timeNum >= 21 || timeNum < 6),
      hoursUtc: '21:00 - 06:00 UTC',
    },
    {
      name: 'Tokyo',
      nameAr: 'طوكيو',
      isOpen: !isWeekend && timeNum >= 0 && timeNum < 9,
      hoursUtc: '00:00 - 09:00 UTC',
    },
    {
      name: 'London',
      nameAr: 'لندن',
      isOpen: !isWeekend && timeNum >= 7 && timeNum < 16,
      hoursUtc: '07:00 - 16:00 UTC',
    },
    {
      name: 'New York',
      nameAr: 'نيويورك',
      isOpen: !isWeekend && timeNum >= 12 && timeNum < 21,
      hoursUtc: '12:00 - 21:00 UTC',
    },
  ];

  const openSessions = sessions.filter((s) => s.isOpen);
  const isOpen = !isWeekend && openSessions.length > 0;

  let currentSession = 'مغلق (عطلة نهاية الأسبوع)';
  if (isOpen) {
    currentSession = openSessions.map((s) => s.nameAr).join(' + ');
  } else if (!isWeekend) {
    currentSession = 'فترة تبديل السيولة';
  }

  // Calculate next session
  let nextSession = 'افتتاح سيدني (21:00 UTC)';
  if (timeNum < 7) nextSession = 'افتتاح لندن (07:00 UTC)';
  else if (timeNum < 12) nextSession = 'افتتاح نيويورك (12:00 UTC)';
  else if (timeNum < 21) nextSession = 'افتتاح سيدني (21:00 UTC)';
  else nextSession = 'افتتاح طوكيو (00:00 UTC)';

  return {
    isOpen,
    currentSession,
    nextSession,
    sessions,
    providerConfigured,
  };
}

/**
 * 1.1 & 1.6 searchSymbols: GET /api/symbols/search?q={query}
 * Enforces 0% crypto rule by filtering out any crypto symbols.
 */
export async function searchSymbols(
  q: string,
  limit: number = 20
): Promise<SymbolSearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  try {
    const res = await apiClient.get<any>(
      `/api/symbols/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (res.ok && res.data && Array.isArray(res.data.results)) {
      const results: SymbolSearchResult[] = res.data.results
        .filter((item: any) => {
          // 0% crypto rule: eliminate BTC, ETH, USDT, crypto tags
          const sym = (item.symbol || '').toUpperCase();
          const name = (item.instrument_name || item.name || '').toUpperCase();
          const cat = (item.category || '').toLowerCase();
          if (cat === 'crypto' || cat === 'cryptocurrency') return false;
          if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('USDT') || sym.includes('SOL')) return false;
          if (name.includes('BITCOIN') || name.includes('ETHEREUM') || name.includes('CRYPTO')) return false;
          return true;
        })
        .map((item: any) => {
          let category: 'forex' | 'metals' | 'indices' | 'energy' = 'forex';
          const sym = (item.symbol || '').toUpperCase();
          if (sym.includes('XAU') || sym.includes('XAG') || sym.includes('GOLD') || sym.includes('SILVER')) {
            category = 'metals';
          } else if (sym.includes('OIL') || sym.includes('BRENT') || sym.includes('GAS')) {
            category = 'energy';
          } else if (sym.includes('SPX') || sym.includes('NAS') || sym.includes('US30') || sym.includes('DAX')) {
            category = 'indices';
          }

          return {
            symbol: item.symbol || sym,
            name: item.instrument_name || item.name || sym,
            currency: item.currency,
            exchange: item.exchange,
            category,
          };
        });

      if (results.length > 0) {
        return results;
      }
    }
  } catch (err) {
    console.warn(`[market] searchSymbols error for "${query}":`, err);
  }

  // Local fallback from INITIAL_SYMBOLS
  const lowerQ = query.toLowerCase();
  return INITIAL_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(lowerQ) ||
      s.name.toLowerCase().includes(lowerQ)
  ).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    category: s.category,
  }));
}
