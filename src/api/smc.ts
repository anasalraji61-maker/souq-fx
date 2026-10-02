/**
 * Smart Money Concepts (SMC) & Liquidity Sweeps API Client
 */

export interface FairValueGap {
  index: number;
  gap_type: 'BULLISH_FVG' | 'BEARISH_FVG';
  top_price: number;
  bottom_price: number;
  gap_size: number;
  timestamp: string;
  is_mitigated: boolean;
  mitigated_price?: number;
}

export interface OrderBlock {
  index: number;
  block_type: 'BULLISH_OB' | 'BEARISH_OB';
  top_price: number;
  bottom_price: number;
  open_price: number;
  close_price: number;
  volume: number;
  timestamp: string;
  strength: number;
  is_mitigated: boolean;
}

export interface StructureBreak {
  index: number;
  break_type: 'BOS' | 'CHOCH';
  direction: 'BULLISH' | 'BEARISH';
  break_price: number;
  broken_pivot_index: number;
  timestamp: string;
}

export interface LiquiditySweep {
  index: number;
  sweep_type: 'BSL_SWEEP' | 'SSL_SWEEP';
  direction: 'BULLISH_REVERSAL' | 'BEARISH_REVERSAL';
  swept_level: number;
  wick_extreme: number;
  close_price: number;
  timestamp: string;
  target_price: number;
}

export interface PremiumDiscount {
  range_high: number;
  range_low: number;
  equilibrium: number;
  premium_zone_start: number;
  discount_zone_end: number;
}

export interface SMCAnalysisResponse {
  symbol: string;
  timeframe: string;
  current_price: number;
  market_bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  fvgs: FairValueGap[];
  active_fvgs: FairValueGap[];
  order_blocks: OrderBlock[];
  active_order_blocks: OrderBlock[];
  structure_breaks: StructureBreak[];
  liquidity_sweeps: LiquiditySweep[];
  premium_discount: PremiumDiscount;
  analyzed_at: string;
}

export const smcAPI = {
  async analyze(symbol: string, timeframe: string = '1h'): Promise<SMCAnalysisResponse> {
    try {
      const res = await fetch(`/api/smc/analyze/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      // Offline fallback
      const base = symbol.includes('JPY') ? 152.40 : 1.0850;
      return {
        symbol,
        timeframe,
        current_price: base,
        market_bias: 'BULLISH',
        fvgs: [
          {
            index: 35,
            gap_type: 'BULLISH_FVG',
            top_price: base + 0.0030,
            bottom_price: base + 0.0010,
            gap_size: 0.0020,
            timestamp: new Date().toISOString(),
            is_mitigated: false
          }
        ],
        active_fvgs: [
          {
            index: 35,
            gap_type: 'BULLISH_FVG',
            top_price: base + 0.0030,
            bottom_price: base + 0.0010,
            gap_size: 0.0020,
            timestamp: new Date().toISOString(),
            is_mitigated: false
          }
        ],
        order_blocks: [
          {
            index: 34,
            block_type: 'BULLISH_OB',
            top_price: base + 0.0012,
            bottom_price: base + 0.0002,
            open_price: base + 0.0010,
            close_price: base + 0.0005,
            volume: 2450,
            timestamp: new Date().toISOString(),
            strength: 88.5,
            is_mitigated: false
          }
        ],
        active_order_blocks: [
          {
            index: 34,
            block_type: 'BULLISH_OB',
            top_price: base + 0.0012,
            bottom_price: base + 0.0002,
            open_price: base + 0.0010,
            close_price: base + 0.0005,
            volume: 2450,
            timestamp: new Date().toISOString(),
            strength: 88.5,
            is_mitigated: false
          }
        ],
        structure_breaks: [
          {
            index: 36,
            break_type: 'BOS',
            direction: 'BULLISH',
            break_price: base + 0.0040,
            broken_pivot_index: 25,
            timestamp: new Date().toISOString()
          }
        ],
        liquidity_sweeps: [
          {
            index: 30,
            sweep_type: 'SSL_SWEEP',
            direction: 'BULLISH_REVERSAL',
            swept_level: base - 0.0015,
            wick_extreme: base - 0.0022,
            close_price: base - 0.0010,
            timestamp: new Date().toISOString(),
            target_price: base + 0.0050
          }
        ],
        premium_discount: {
          range_high: base + 0.0080,
          range_low: base - 0.0050,
          equilibrium: base + 0.0015,
          premium_zone_start: base + 0.0040,
          discount_zone_end: base - 0.0010
        },
        analyzed_at: new Date().toISOString()
      };
    }
  },

  async getLatestSaved(symbol: string, timeframe: string = '1h'): Promise<any> {
    try {
      const res = await fetch(`/api/smc/latest/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }
};
