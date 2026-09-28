export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export type SymbolCategory = 'all' | 'forex' | 'metals' | 'indices' | 'crypto';

export interface MarketSymbol {
  symbol: string;
  name: string;
  category: 'forex' | 'metals' | 'indices' | 'crypto';
  price: number;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  changePips: number;
  high24h: number;
  low24h: number;
  pipScale: number; // 0.0001 for standard, 0.01 for JPY/Gold
  precision: number;
  baseCurrency: string;
  quoteCurrency: string;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSettings {
  showSma20: boolean;
  showSma50: boolean;
  showSma200: boolean;
  showEma: boolean;
  emaPeriod: number;
  showBollinger: boolean;
  bollingerPeriod: number;
  bollingerStdDev: number;
  showRsi: boolean;
  rsiPeriod: number;
  showMacd: boolean;
  showStochastic: boolean;
  showSupertrend: boolean;
  showVolume: boolean;
}

export type ChartType = 'candles' | 'line' | 'area';

export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci' | 'position_long' | 'position_short';

export interface DrawingItem {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color?: string;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  lots: number;
  pnl: number;
  date: string;
  status: 'closed' | 'open';
  notes?: string;
  strategy?: string;
}

export interface EconomicEvent {
  id: string;
  time: string;
  date: string;
  currency: string;
  country: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  actual: string | null;
  forecast: string;
  previous: string;
}

export interface ScreenerItem {
  symbol: string;
  price: number;
  change24h: number;
  rsi: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  macdSignal: 'bullish_cross' | 'bearish_cross' | 'neutral';
  maStatus: 'above_all' | 'golden_cross' | 'death_cross' | 'below_all';
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

export interface PriceAlertItem {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  note: string;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfitPct: number;
  maxDrawdownPct: number;
  trades: {
    id: number;
    type: 'buy' | 'sell';
    entryTime: string;
    exitTime: string;
    entryPrice: number;
    exitPrice: number;
    profitPct: number;
    equity: number;
  }[];
}
