/** DXY أولاً — مثل قائمة TradingView المرجعية */
export const WATCHLIST = [
  { symbol: 'DXY', label: 'DXY', group: 'Index' },
  { symbol: 'EURUSD', label: 'يورو / دولار', group: 'FX' },
  { symbol: 'GBPUSD', label: 'استرليني / دولار', group: 'FX' },
  { symbol: 'USDJPY', label: 'دولار / ين', group: 'FX' },
  { symbol: 'AUDUSD', label: 'أسترالي / دولار', group: 'FX' },
  { symbol: 'USDCAD', label: 'دولار / كندي', group: 'FX' },
  { symbol: 'NZDUSD', label: 'نيوزلندي / دولار', group: 'FX' },
  { symbol: 'USDCHF', label: 'دولار / فرنك', group: 'FX' },
  { symbol: 'EURJPY', label: 'يورو / ين', group: 'FX' },
  { symbol: 'GBPJPY', label: 'استرليني / ين', group: 'FX' },
  { symbol: 'EURGBP', label: 'يورو / استرليني', group: 'FX' },
  { symbol: 'AUDJPY', label: 'أسترالي / ين', group: 'FX' },
  { symbol: 'EURAUD', label: 'يورو / أسترالي', group: 'FX' },
  { symbol: 'EURCHF', label: 'يورو / فرنك', group: 'FX' },
  { symbol: 'CADJPY', label: 'كندي / ين', group: 'FX' },
  { symbol: 'XAUUSD', label: 'ذهب', group: 'Metals' },
  { symbol: 'XAGUSD', label: 'فضة', group: 'Metals' },
  { symbol: 'USOIL', label: 'نفط WTI', group: 'Energy' },
  { symbol: 'UKOIL', label: 'نفط Brent', group: 'Energy' },
  { symbol: 'BTCUSD', label: 'بيتكوين', group: 'Crypto' },
  { symbol: 'ETHUSD', label: 'إيثيريوم', group: 'Crypto' },
] as const;

export type WatchSymbol = (typeof WATCHLIST)[number]['symbol'];
