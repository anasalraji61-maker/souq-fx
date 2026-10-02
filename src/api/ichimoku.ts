/**
 * src/api/ichimoku.ts — Ichimoku Kinko Hyo API Client (Task 16)
 * Architect: Claude Haiku 4.5
 * Lead Builder: Google AI Studio
 */

export interface IchimokuValues {
  tenkan_sen: number;
  kijun_sen: number;
  senkou_span_a: number;
  senkou_span_b: number;
  chikou_span: number;
  cloud_top: number;
  cloud_bottom: number;
  cloud_thickness: number;
  cloud_color: 'GREEN' | 'RED';
  cloud_state: 'ABOVE_CLOUD' | 'BELOW_CLOUD' | 'INSIDE_CLOUD';
}

export interface IchimokuSignals {
  tk_cross: string;
  tk_state: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  cloud_breakout: 'BULLISH_BREAKOUT' | 'BEARISH_BREAKOUT' | 'CONSOLIDATION';
  cloud_color: 'GREEN' | 'RED';
  cloud_twist: boolean;
  chikou_confirmation: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  overall_trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0 to 100
}

export interface IchimokuAnalysisData {
  symbol: string;
  timeframe: string;
  timestamp: string;
  current_price: number;
  values: IchimokuValues;
  signals: IchimokuSignals;
  support_resistance: {
    tenkan_level: number;
    kijun_level: number;
    cloud_top_level: number;
    cloud_bottom_level: number;
  };
  chart_series: {
    closes: number[];
    tenkan: (number | null)[];
    kijun: (number | null)[];
    senkou_a: (number | null)[];
    senkou_b: (number | null)[];
    chikou: (number | null)[];
  };
  cached: boolean;
}

export interface IchimokuBacktestData {
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  win_rate: number;
  total_trades: number;
  profit_factor: number;
  max_drawdown: number;
  metrics_json?: {
    strategy?: string;
    kumo_breakout_win_rate?: number;
    tk_cross_win_rate?: number;
    avg_rr_ratio?: number;
    max_consecutive_wins?: number;
    max_consecutive_losses?: number;
  };
  created_at: string;
}

export const ichimokuAPI = {
  async analyze(symbol: string, timeframe: string = '1h'): Promise<IchimokuAnalysisData | null> {
    try {
      const response = await fetch(
        `/api/ichimoku/analyze/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch Ichimoku analysis:', error);
      return null;
    }
  },

  async getBacktest(symbol: string, timeframe: string = '1h'): Promise<IchimokuBacktestData | null> {
    try {
      const response = await fetch(
        `/api/ichimoku/backtest/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch Ichimoku backtest:', error);
      return null;
    }
  },
};
