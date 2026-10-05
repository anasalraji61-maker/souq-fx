/**
 * src/api/mta.ts — Multi-Timeframe Analysis (MTA) API Client (Task 15)
 * Architect: Claude Haiku 4.5
 * Lead Builder: Google AI Studio
 */

import { apiClient } from './client';

export interface TimeframeSignalData {
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number; // 0 to 100
  cached: boolean;
  timestamp: number;
  indicators: {
    rsi: number;
    macd: number;
    macd_signal: number;
    macd_hist: number;
    bb_upper: number;
    bb_middle: number;
    bb_lower: number;
    ema_fast: number;
    ema_slow: number;
    stoch_k: number;
    stoch_d: number;
    adx: number;
    last_close: number;
  };
}

export interface MTAConsensusData {
  symbol: string;
  timestamp: string;
  consensus_direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence_score: number; // 0 to 100
  weighted_score: number;
  timeframes: Record<string, TimeframeSignalData>;
  warnings: string[];
  has_whipsaw_risk: boolean;
  has_macro_conflict: boolean;
}

export interface MTABacktestData {
  symbol: string;
  start_date: string;
  end_date: string;
  win_rate: number;
  total_trades: number;
  profit_factor: number;
  max_drawdown: number;
  metrics_json?: {
    sharpe_ratio?: number;
    avg_trade_pips?: number;
    max_consecutive_wins?: number;
    max_consecutive_losses?: number;
    timeframes_covered?: string[];
  };
  created_at: string;
}

export const mtaAPI = {
  async analyze(symbol: string): Promise<MTAConsensusData | null> {
    try {
      const res = await apiClient.get<MTAConsensusData>(`/api/mta/analyze/${encodeURIComponent(symbol)}`);
      return res.ok ? res.data : null;
    } catch (error) {
      console.error('Failed to fetch MTA analysis:', error);
      return null;
    }
  },

  async getBacktest(symbol: string): Promise<MTABacktestData | null> {
    try {
      const res = await apiClient.get<MTABacktestData>(`/api/mta/backtest/${encodeURIComponent(symbol)}`);
      return res.ok ? res.data : null;
    } catch (error) {
      console.error('Failed to fetch MTA backtest:', error);
      return null;
    }
  },
};
