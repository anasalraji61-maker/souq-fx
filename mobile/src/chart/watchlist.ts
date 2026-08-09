/** DXY أولاً — اختصارات إنجليزية لجميع الرموز */
export const WATCHLIST = [
  { symbol: 'DXY', label: 'DXY', group: 'Index' },
  { symbol: 'EURUSD', label: 'EURUSD', group: 'FX' },
  { symbol: 'GBPUSD', label: 'GBPUSD', group: 'FX' },
  { symbol: 'USDJPY', label: 'USDJPY', group: 'FX' },
  { symbol: 'AUDUSD', label: 'AUDUSD', group: 'FX' },
  { symbol: 'USDCAD', label: 'USDCAD', group: 'FX' },
  { symbol: 'NZDUSD', label: 'NZDUSD', group: 'FX' },
  { symbol: 'USDCHF', label: 'USDCHF', group: 'FX' },
  { symbol: 'EURJPY', label: 'EURJPY', group: 'FX' },
  { symbol: 'GBPJPY', label: 'GBPJPY', group: 'FX' },
  { symbol: 'EURGBP', label: 'EURGBP', group: 'FX' },
  { symbol: 'AUDJPY', label: 'AUDJPY', group: 'FX' },
  { symbol: 'EURAUD', label: 'EURAUD', group: 'FX' },
  { symbol: 'EURCHF', label: 'EURCHF', group: 'FX' },
  { symbol: 'CADJPY', label: 'CADJPY', group: 'FX' },
  { symbol: 'XAUUSD', label: 'XAUUSD', group: 'Metals' },
  { symbol: 'XAGUSD', label: 'XAGUSD', group: 'Metals' },
  { symbol: 'USOIL', label: 'USOIL', group: 'Energy' },
  { symbol: 'UKOIL', label: 'UKOIL', group: 'Energy' },
  { symbol: 'BTCUSD', label: 'BTCUSD', group: 'Crypto' },
  { symbol: 'ETHUSD', label: 'ETHUSD', group: 'Crypto' },
] as const;

export type WatchSymbol = (typeof WATCHLIST)[number]['symbol'];
