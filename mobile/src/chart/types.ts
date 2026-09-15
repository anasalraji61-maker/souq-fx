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
  | 'twap'
  | 'obv'
  | 'mfi'
  | 'adx'
  | 'psar'
  | 'stddev'
  | 'aroon'
  | 'cmf'
  | 'supertrend'
  | 'keltner'
  | 'envelopes'
  | 'donchian'
  | 'ultimateOsc'
  | 'cmo'
  | 'trix'
  | 'force'
  | 'chaikinOsc'
  | 'dpo'
  | 'ao'
  | 'ac'
  | 'bop'
  | 'bullPower'
  | 'bearPower'
  | 'tsi'
  | 'coppock'
  | 'eom'
  | 'nvi'
  | 'ppo'
  | 'chaikinVol'
  | 'massIndex'
  | 'qstick'
  | 'chop'
  | 'bwmfi'
  | 'pvo'
  | 'apo'
  | 'vo'
  | 'vpt'
  | 'hv'
  | 'stochRsi'
  | 'rvi'
  | 'linRegSlope'
  | 'linRegR2'
  | 'lsma'
  | 'linRegChannel'
  | 'percentB'
  | 'bbw'
  | 'medianPrice'
  | 'typicalPrice'
  | 'weightedClose'
  | 'mcginley'
  | 'momentum'
  | 'vhf'
  | 'pvi'
  | 'ravi'
  | 'ulcer'
  | 'fisher'
  | 'kst'
  | 'vortex'
  | 'klinger'
  | 'ichimoku'
  | 'alligator'
  | 'gator'
  | 'vwma'
  | 'alma'
  | 'chandeKroll'
  | 'smi'
  | 'dmi'
  | 'chandelierExit'
  | 'gmma'
  | 'rwi'
  | 'aroonUpDown'
  | 'pivots'
  | 'zigzag'
  | 'adl'
  | 'fractals'
  | 't3'
  | 'rvix'
  | 'smma20'
  | 'kama'
  | 'stc'
  | 'zlema'
  | 'fibPivots'
  | 'camarilla'
  | 'woodiePivots'
  | 'demarkPivots'
  | 'squeeze'
  | 'cog'
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
  { id: 'twap', label: 'TWAP' },
  { id: 'obv', label: 'OBV', pane: true },
  { id: 'mfi', label: 'MFI', pane: true },
  { id: 'adx', label: 'ADX', pane: true },
  { id: 'psar', label: 'PSAR' },
  { id: 'stddev', label: 'STDEV', pane: true },
  { id: 'aroon', label: 'Aroon', pane: true },
  { id: 'cmf', label: 'CMF', pane: true },
  { id: 'supertrend', label: 'SuperTrend' },
  { id: 'keltner', label: 'Keltner' },
  { id: 'envelopes', label: 'Envelopes' },
  { id: 'donchian', label: 'Donchian' },
  { id: 'ultimateOsc', label: 'Ultimate Osc', pane: true },
  { id: 'cmo', label: 'CMO', pane: true },
  { id: 'trix', label: 'TRIX', pane: true },
  { id: 'force', label: 'Force Index', pane: true },
  { id: 'chaikinOsc', label: 'Chaikin Osc', pane: true },
  { id: 'dpo', label: 'DPO', pane: true },
  { id: 'ao', label: 'Awesome Osc', pane: true },
  { id: 'ac', label: 'Accelerator Osc', pane: true },
  { id: 'bop', label: 'Balance of Power', pane: true },
  { id: 'bullPower', label: 'Bull Power', pane: true },
  { id: 'bearPower', label: 'Bear Power', pane: true },
  { id: 'tsi', label: 'TSI', pane: true },
  { id: 'coppock', label: 'Coppock', pane: true },
  { id: 'eom', label: 'EOM', pane: true },
  { id: 'nvi', label: 'NVI', pane: true },
  { id: 'ppo', label: 'PPO', pane: true },
  { id: 'chaikinVol', label: 'Chaikin Vol', pane: true },
  { id: 'massIndex', label: 'Mass Index', pane: true },
  { id: 'qstick', label: 'Qstick', pane: true },
  { id: 'chop', label: 'Choppiness', pane: true },
  { id: 'bwmfi', label: 'BW MFI', pane: true },
  { id: 'pvo', label: 'PVO', pane: true },
  { id: 'apo', label: 'APO', pane: true },
  { id: 'vo', label: 'Volume Osc', pane: true },
  { id: 'vpt', label: 'VPT', pane: true },
  { id: 'hv', label: 'HV', pane: true },
  { id: 'stochRsi', label: 'StochRSI', pane: true },
  { id: 'rvi', label: 'RVI', pane: true },
  { id: 'linRegSlope', label: 'LR Slope', pane: true },
  { id: 'linRegR2', label: 'LR R²', pane: true },
  { id: 'lsma', label: 'LSMA' },
  { id: 'linRegChannel', label: 'LR Channel' },
  { id: 'percentB', label: '%B', pane: true },
  { id: 'bbw', label: 'BBW', pane: true },
  { id: 'medianPrice', label: 'Median Price' },
  { id: 'typicalPrice', label: 'Typical Price' },
  { id: 'weightedClose', label: 'Weighted Close' },
  { id: 'mcginley', label: 'McGinley' },
  { id: 'momentum', label: 'Momentum', pane: true },
  { id: 'vhf', label: 'VHF', pane: true },
  { id: 'pvi', label: 'PVI', pane: true },
  { id: 'ravi', label: 'RAVI', pane: true },
  { id: 'ulcer', label: 'Ulcer Index', pane: true },
  { id: 'fisher', label: 'Fisher Transform', pane: true },
  { id: 'kst', label: 'KST', pane: true },
  { id: 'vortex', label: 'Vortex', pane: true },
  { id: 'klinger', label: 'Klinger', pane: true },
  { id: 'ichimoku', label: 'Ichimoku' },
  { id: 'alligator', label: 'Alligator' },
  { id: 'gator', label: 'Gator Oscillator', pane: true },
  { id: 'vwma', label: 'VWMA' },
  { id: 'alma', label: 'ALMA' },
  { id: 'chandeKroll', label: 'Chande Kroll Stop' },
  { id: 'smi', label: 'SMI', pane: true },
  { id: 'dmi', label: 'DMI', pane: true },
  { id: 'chandelierExit', label: 'Chandelier Exit' },
  { id: 'gmma', label: 'GMMA' },
  { id: 'rwi', label: 'RWI', pane: true },
  { id: 'aroonUpDown', label: 'Aroon Up/Down', pane: true },
  { id: 'pivots', label: 'Pivot Points' },
  { id: 'zigzag', label: 'ZigZag' },
  { id: 'adl', label: 'A/D Line', pane: true },
  { id: 'fractals', label: 'Fractals' },
  { id: 't3', label: 'T3' },
  { id: 'rvix', label: 'RVI (Vol)', pane: true },
  { id: 'smma20', label: 'SMMA 20' },
  { id: 'kama', label: 'KAMA' },
  { id: 'stc', label: 'STC', pane: true },
  { id: 'zlema', label: 'ZLEMA' },
  { id: 'fibPivots', label: 'Fib Pivots' },
  { id: 'camarilla', label: 'Camarilla' },
  { id: 'woodiePivots', label: 'Woodie Pivots' },
  { id: 'demarkPivots', label: 'DeMark Pivots' },
  { id: 'squeeze', label: 'Squeeze', pane: true },
  { id: 'cog', label: 'COG', pane: true },
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
