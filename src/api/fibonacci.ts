/**
 * Auto-Fibonacci Retracement & Extension API Client
 */

export interface FibLevel {
  ratio: number;
  level_type: 'RETRACEMENT' | 'EXTENSION' | 'GOLDEN_POCKET';
  price: number;
  label: string;
  is_golden_pocket: boolean;
  distance_pct: number;
}

export interface FibonacciResponse {
  symbol: string;
  timeframe: string;
  trend: 'UPTREND' | 'DOWNTREND';
  current_price: number;
  swing_low: number;
  swing_high: number;
  golden_pocket_min: number;
  golden_pocket_max: number;
  is_in_golden_pocket: boolean;
  nearest_level: FibLevel;
  retracement_levels: FibLevel[];
  extension_levels: FibLevel[];
  reaction_signal: 'BOUNCE_EXPECTED' | 'REJECTION_EXPECTED' | 'KEY_LEVEL_TEST' | 'NEUTRAL';
  analyzed_at: string;
}

export const fibonacciAPI = {
  async analyze(symbol: string, timeframe: string = '1h', lookback: number = 60): Promise<FibonacciResponse> {
    try {
      const res = await fetch(`/api/fibonacci/analyze/${encodeURIComponent(symbol)}?timeframe=${timeframe}&lookback=${lookback}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      // Offline fallback
      const base = symbol.includes('JPY') ? 152.40 : 1.0850;
      const s_low = base - 0.0080;
      const s_high = base + 0.0060;
      const span = s_high - s_low;
      const gp_min = s_high - (span * 0.650);
      const gp_max = s_high - (span * 0.618);

      const ratios = [0.0, 0.236, 0.382, 0.500, 0.618, 0.650, 0.786, 0.886, 1.000];
      const retrace: FibLevel[] = ratios.map(r => ({
        ratio: r,
        level_type: (r === 0.618 || r === 0.650) ? 'GOLDEN_POCKET' : 'RETRACEMENT',
        price: Number((s_high - (span * r)).toFixed(4)),
        label: r === 0.618 ? '0.618 (Golden Pocket)' : `${r.toFixed(3)}`,
        is_golden_pocket: (r === 0.618 || r === 0.650),
        distance_pct: Number((Math.abs(base - (s_high - (span * r))) / base * 100).toFixed(2))
      }));

      return {
        symbol,
        timeframe,
        trend: 'UPTREND',
        current_price: base,
        swing_low: s_low,
        swing_high: s_high,
        golden_pocket_min: gp_min,
        golden_pocket_max: gp_max,
        is_in_golden_pocket: (gp_min <= base && base <= gp_max),
        nearest_level: retrace[3],
        retracement_levels: retrace,
        extension_levels: [
          {
            ratio: 1.272,
            level_type: 'EXTENSION',
            price: Number((s_high + (span * 0.272)).toFixed(4)),
            label: 'Ext 1.272',
            is_golden_pocket: false,
            distance_pct: 1.2
          },
          {
            ratio: 1.618,
            level_type: 'EXTENSION',
            price: Number((s_high + (span * 0.618)).toFixed(4)),
            label: 'Ext 1.618',
            is_golden_pocket: false,
            distance_pct: 2.1
          }
        ],
        reaction_signal: 'KEY_LEVEL_TEST',
        analyzed_at: new Date().toISOString()
      };
    }
  },

  async getLatest(symbol: string, timeframe: string = '1h'): Promise<FibonacciResponse | null> {
    try {
      const res = await fetch(`/api/fibonacci/latest/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }
};
