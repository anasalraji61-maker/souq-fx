export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'D', 'W'] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

/** تسميات عربية مختصرة للعرض */
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': 'دقيقة',
  '5m': '5 د',
  '15m': '15 د',
  '30m': '30 د',
  '1H': 'ساعة',
  '4H': '4 س',
  D: 'يومي',
  W: 'أسبوعي',
};

export const TF_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '4H': 14400,
  D: 86400,
  W: 604800,
};

export const DEFAULT_FRAME_TIMEFRAMES: Timeframe[] = ['15m', '1H', '4H'];

export const FRAME_SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD'] as const;

export function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}

/** عدد شموع الظل اللازمة لتغطية نافذة الأساسي */
export function shadowBarsNeeded(
  primaryTf: Timeframe,
  shadowTf: Timeframe,
  primaryBars: number
): number {
  const p = TF_SECONDS[primaryTf] || 900;
  const s = TF_SECONDS[shadowTf] || 900;
  const bars = Math.max(40, primaryBars);
  if (s >= p) {
    return Math.min(5000, Math.max(220, Math.ceil(bars * (p / s)) + 80));
  }
  return Math.min(5000, Math.max(500, Math.ceil(bars * (p / s)) + 120));
}
