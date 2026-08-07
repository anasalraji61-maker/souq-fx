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

export const DEFAULT_FRAME_TIMEFRAMES: Timeframe[] = ['15m', '1H', '4H'];

export const FRAME_SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD'] as const;

export function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}
