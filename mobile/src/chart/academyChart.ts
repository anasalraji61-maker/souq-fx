import type { Timeframe } from '../timeframes';

/** Demo symbol per academy school for interactive lecture chart. */
export const ACADEMY_CHART: Record<string, { symbol: string; tf: Timeframe }> = {
  classic: { symbol: 'EURUSD', tf: '1H' },
  wyckoff: { symbol: 'GBPUSD', tf: '4H' },
  'ict-smc': { symbol: 'EURUSD', tf: '15m' },
  gann: { symbol: 'XAUUSD', tf: '1H' },
  elliott: { symbol: 'EURUSD', tf: '1H' },
  sk: { symbol: 'XAUUSD', tf: '15m' },
};

export function academyChartFor(schoolId: string) {
  return ACADEMY_CHART[schoolId] ?? { symbol: 'EURUSD', tf: '15m' as Timeframe };
}
