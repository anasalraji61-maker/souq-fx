import type { Candle } from '../api';

export type ChartKind =
  | 'candles'
  | 'hollow'
  | 'heikin'
  | 'bars'
  | 'line'
  | 'area'
  | 'baseline'
  | 'renko'
  | 'kagi'
  | 'pnf'
  | 'range';

export type IndicatorId =
  | 'sma20'
  | 'sma50'
  | 'ema21'
  | 'wma20'
  | 'dema20'
  | 'tema20'
  | 'hma20'
  | 'bb'
  | 'rsi'
  | 'macd'
  | 'stoch'
  | 'atr'
  | 'willr'
  | 'cci'
  | 'roc'
  | 'vwap'
  | 'obv'
  | 'mfi'
  | 'adx'
  | 'psar'
  | 'stddev'
  | 'aroon'
  | 'cmf'
  | 'supertrend'
  | 'keltner'
  | 'volume'
  | 'volumeProfile'
  | 'tpo'
  | 'cvd'
  | 'footprint';

export type DrawTool =
  | 'none'
  | 'select'
  | 'trend'
  | 'ray'
  | 'hline'
  | 'vline'
  | 'rect'
  | 'fib'
  | 'zone'
  | 'note'
  | 'measure';

export type ChartPoint = { index: number; price: number };

export type Drawing = {
  id: string;
  tool: Exclude<DrawTool, 'none'>;
  a: ChartPoint;
  b?: ChartPoint;
  text?: string;
  color: string;
};

export type LensMode = 'clean' | 'structure' | 'momentum' | 'liquidity';

export const CHART_KINDS: { id: ChartKind; label: string }[] = [
  { id: 'candles', label: 'شموع' },
  { id: 'hollow', label: 'مجوّفة' },
  { id: 'heikin', label: 'هيكن' },
  { id: 'bars', label: 'أعمدة' },
  { id: 'line', label: 'خط' },
  { id: 'area', label: 'منطقة' },
  { id: 'baseline', label: 'خط أساس' },
  { id: 'renko', label: 'Renko' },
  { id: 'kagi', label: 'Kagi' },
  { id: 'pnf', label: 'P&F' },
  { id: 'range', label: 'نطاق' },
];

export const INDICATORS: { id: IndicatorId; label: string; pane?: boolean }[] = [
  { id: 'sma20', label: 'SMA 20' },
  { id: 'sma50', label: 'SMA 50' },
  { id: 'ema21', label: 'EMA 21' },
  { id: 'wma20', label: 'WMA 20' },
  { id: 'dema20', label: 'DEMA 20' },
  { id: 'tema20', label: 'TEMA 20' },
  { id: 'hma20', label: 'HMA 20' },
  { id: 'bb', label: 'بولنجر' },
  { id: 'volume', label: 'فوليوم', pane: true },
  { id: 'volumeProfile', label: 'VP', pane: false },
  { id: 'tpo', label: 'TPO', pane: false },
  { id: 'cvd', label: 'CVD', pane: true },
  { id: 'footprint', label: 'Footprint', pane: false },
  { id: 'rsi', label: 'RSI', pane: true },
  { id: 'macd', label: 'MACD', pane: true },
  { id: 'stoch', label: 'Stoch', pane: true },
  { id: 'atr', label: 'ATR', pane: true },
  { id: 'willr', label: 'Williams %R', pane: true },
  { id: 'cci', label: 'CCI', pane: true },
  { id: 'roc', label: 'ROC', pane: true },
  { id: 'vwap', label: 'VWAP' },
  { id: 'obv', label: 'OBV', pane: true },
  { id: 'mfi', label: 'MFI', pane: true },
  { id: 'adx', label: 'ADX', pane: true },
  { id: 'psar', label: 'PSAR' },
  { id: 'stddev', label: 'STDEV', pane: true },
  { id: 'aroon', label: 'Aroon', pane: true },
  { id: 'cmf', label: 'CMF', pane: true },
  { id: 'supertrend', label: 'SuperTrend' },
  { id: 'keltner', label: 'Keltner' },
];

export const DRAW_TOOLS: { id: DrawTool; label: string }[] = [
  { id: 'none', label: 'مؤشر' },
  { id: 'select', label: 'تحديد' },
  { id: 'trend', label: 'ترند' },
  { id: 'ray', label: 'شعاع' },
  { id: 'hline', label: 'أفقي' },
  { id: 'vline', label: 'عمودي' },
  { id: 'rect', label: 'مستطيل' },
  { id: 'fib', label: 'فيبو' },
  { id: 'zone', label: 'منطقة' },
  { id: 'note', label: 'ملاحظة' },
  { id: 'measure', label: 'قياس' },
];

export const LENSES: { id: LensMode; label: string; hint: string }[] = [
  { id: 'clean', label: 'نظيف', hint: 'سعر فقط' },
  { id: 'structure', label: 'هيكل', hint: 'MA + مناطق' },
  { id: 'momentum', label: 'زخم', hint: 'RSI + MACD' },
  { id: 'liquidity', label: 'سيولة', hint: 'فوليوم + CVD' },
];

export function withVolume(candles: Candle[]): (Candle & { volume: number })[] {
  return candles.map((c, i) => ({
    ...c,
    volume:
      (c as Candle & { volume?: number }).volume ??
      Math.abs(c.close - c.open) * 1e6 * (0.6 + ((i * 17) % 40) / 40) +
        1000,
  }));
}
