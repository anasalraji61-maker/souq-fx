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
  | 'netVolume'
  | 'pivotsHL'
  | 'tsf'
  | 'woodieCci'
  | 'stdErrorBands'
  | 'volume'
  | 'volumeProfile'
  | 'tpo'
  | 'cvd'
  | 'footprint'
  | 'donchianWidth'
  | 'connorsRsi'
  | 'keltnerWidth'
  | 'cfo'
  | 'vwMacd'
  | 'disparityIndex'
  | 'tii'
  | 'demarker'
  | 'rmi'
  | 'pgo'
  | 'twiggsMoneyFlow'
  | 'vzo'
  | 'avgPrice'
  | 'atrp'
  | 'vidya'
  | 'gmmaOsc'
  | 'iftRsi'
  | 'waveTrend'
  | 'accelBands'
  | 'cutlerRsi'
  | 'vwapBands'
  | 'frama'
  | 'parkinsonVol'
  | 'garmanKlassVol'
  | 'rogersSatchellVol'
  | 'yangZhangVol'
  | 'smiErgodic'
  | 'starcBands'
  | 'pmo'
  | 'trueRange'
  | 'stdError'
  | 'ewmaVol'
  | 'volRoc'
  | 'adxr'
  | 'volatilityRatio'
  | 'williamsAd'
  | 'fractalChaosOsc'
  | 'fractalChaosBands'
  | 'gannHiLo'
  | 'elderImpulse'
  | 'gapo'
  | 'pfe'
  | 'dma'
  | 'rainbowOsc'
  | 'trima'
  | 'efficiencyRatio'
  | 'vpci'
  | 'ttf'
  | 'tdi'
  | 'vfi'
  | 'cpr'
  | 'laguerreRsi'
  | 'pdhl'
  | 'sessions';

export type DrawTool =
  | 'none'
  | 'select'
  | 'trend'
  | 'ray'
  | 'hline'
  | 'hray'
  | 'vline'
  | 'rect'
  | 'fib'
  | 'zone'
  | 'note'
  | 'measure'
  | 'long'
  | 'short';

/**
 * `time` (ثوانٍ) مرساة الرسم الحقيقية متى وُجدت — `index` موضع مشتقّ منها داخل السلسلة
 * الحاليّة. راجع `drawingAnchors.ts`: الفهرس وحده يزحف مع نافذة الخادم المتحرّكة.
 */
/**
 * `ahead`: نقطة بعد آخر شمعة — `time` زمن آخر شمعة وقت الرسم، و`ahead` عدد الشموع بعدها
 * (لا زمن تقويمي مختلَق تُسقطه العطلة). راجع `drawingAnchors.ts`.
 * `aheadStep`: خطوة الفريم (ثوانٍ) التي عُدّت بها `ahead` — الرسومات مشتركة بين الفريمات،
 * فعشر شموع ساعة على اليومي أقلّ من نصف شمعة لا عشر شموع. غيابها ⇒ خطوة الفريم الحالي.
 * `sub`: نقطة رُسمت على Renko/Kagi/P&F — ترتيب لبنتها بين لبنات شمعتها المصدر (شمعة واحدة
 * قد تصنع عدّة لبنات بالزمن نفسه)، فتعود للّبنة ذاتها لا لأولى أخواتها. تُهمَل على الشموع.
 */
export type ChartPoint = {
  index: number;
  price: number;
  time?: number;
  ahead?: number;
  aheadStep?: number;
  sub?: number;
};

/**
 * لبنة Renko/Kagi/P&F: `time` مختلَق (أوّل شمعة + 60 ث لكل لبنة، ليبقى المحور متزايداً)،
 * و`srcTime` زمن الشمعة **الحقيقية** التي أكملتها — هو ما تُرسى عليه الرسومات بين الأنواع
 * والفريمات (`drawingAnchors.ts`).
 */
export type SyntheticBar = Candle & { srcTime?: number };

export type Drawing = {
  id: string;
  tool: Exclude<DrawTool, 'none'>;
  a: ChartPoint;
  b?: ChartPoint;
  text?: string;
  color: string;
  /** أداتا `long`/`short`: نسبة الهدف إلى المخاطرة (غيابها ⇒ 2) — راجع `positionTool.ts`. */
  rr?: number;
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
  { id: 'netVolume', label: 'Net Volume', pane: true },
  { id: 'pivotsHL', label: 'Pivot High/Low' },
  { id: 'tsf', label: 'TSF' },
  { id: 'woodieCci', label: 'Woodie CCI', pane: true },
  { id: 'stdErrorBands', label: 'Std Error Bands' },
  { id: 'donchianWidth', label: 'Donchian Width', pane: true },
  { id: 'connorsRsi', label: 'Connors RSI', pane: true },
  { id: 'keltnerWidth', label: 'Keltner Width', pane: true },
  { id: 'cfo', label: 'CFO', pane: true },
  { id: 'vwMacd', label: 'VW-MACD', pane: true },
  { id: 'disparityIndex', label: 'Disparity Index', pane: true },
  { id: 'tii', label: 'TII', pane: true },
  { id: 'demarker', label: 'DeMarker', pane: true },
  { id: 'rmi', label: 'RMI', pane: true },
  { id: 'pgo', label: 'PGO', pane: true },
  { id: 'twiggsMoneyFlow', label: 'Twiggs MF', pane: true },
  { id: 'vzo', label: 'VZO', pane: true },
  { id: 'avgPrice', label: 'Average Price' },
  { id: 'atrp', label: 'ATR%', pane: true },
  { id: 'vidya', label: 'VIDYA' },
  { id: 'gmmaOsc', label: 'GMMA Osc', pane: true },
  { id: 'iftRsi', label: 'IFT-RSI', pane: true },
  { id: 'waveTrend', label: 'WaveTrend', pane: true },
  { id: 'accelBands', label: 'Accel Bands' },
  { id: 'cutlerRsi', label: "Cutler's RSI", pane: true },
  { id: 'vwapBands', label: 'VWAP Bands' },
  { id: 'frama', label: 'FRAMA' },
  { id: 'parkinsonVol', label: 'Parkinson Vol', pane: true },
  { id: 'garmanKlassVol', label: 'G-K Vol', pane: true },
  { id: 'rogersSatchellVol', label: 'R-S Vol', pane: true },
  { id: 'yangZhangVol', label: 'Y-Z Vol', pane: true },
  { id: 'smiErgodic', label: 'SMI Ergodic Osc', pane: true },
  { id: 'starcBands', label: 'STARC Bands' },
  { id: 'pmo', label: 'PMO', pane: true },
  { id: 'trueRange', label: 'True Range', pane: true },
  { id: 'stdError', label: 'Std Error', pane: true },
  { id: 'ewmaVol', label: 'EWMA Vol', pane: true },
  { id: 'volRoc', label: 'Volume ROC', pane: true },
  { id: 'adxr', label: 'ADXR', pane: true },
  { id: 'volatilityRatio', label: 'Volatility Ratio', pane: true },
  { id: 'williamsAd', label: 'Williams A/D', pane: true },
  { id: 'fractalChaosOsc', label: 'Fractal Chaos Osc', pane: true },
  { id: 'fractalChaosBands', label: 'Fractal Chaos Bands' },
  { id: 'gannHiLo', label: 'Gann HiLo' },
  { id: 'elderImpulse', label: 'Elder Impulse' },
  { id: 'gapo', label: 'GAPO', pane: true },
  { id: 'pfe', label: 'PFE', pane: true },
  { id: 'dma', label: 'DMA' },
  { id: 'rainbowOsc', label: 'Rainbow Osc', pane: true },
  { id: 'trima', label: 'TRIMA' },
  { id: 'efficiencyRatio', label: 'Efficiency Ratio', pane: true },
  { id: 'vpci', label: 'VPCI', pane: true },
  { id: 'ttf', label: 'TTF', pane: true },
  { id: 'tdi', label: 'TDI', pane: true },
  { id: 'vfi', label: 'VFI', pane: true },
  { id: 'cpr', label: 'CPR' },
  { id: 'laguerreRsi', label: 'Laguerre RSI', pane: true },
  { id: 'pdhl', label: 'PDH / PDL' },
  { id: 'sessions', label: 'Sessions' },
];

export const DRAW_TOOLS: { id: DrawTool; label: string }[] = [
  { id: 'none', label: 'مؤشر' },
  { id: 'select', label: 'تحديد' },
  { id: 'trend', label: 'ترند' },
  { id: 'ray', label: 'شعاع' },
  { id: 'hline', label: 'أفقي' },
  { id: 'hray', label: 'شعاع أفقي' },
  { id: 'vline', label: 'عمودي' },
  { id: 'rect', label: 'مستطيل' },
  { id: 'fib', label: 'فيبو' },
  { id: 'zone', label: 'منطقة' },
  { id: 'note', label: 'ملاحظة' },
  { id: 'measure', label: 'قياس' },
  { id: 'long', label: 'شراء' },
  { id: 'short', label: 'بيع' },
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
