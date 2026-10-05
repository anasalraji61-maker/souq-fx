/**
 * Volume Profile & Order Flow API Client — Task 17
 */

export interface VolumeBin {
  bin_index: number;
  price_level: number;
  volume: number;
  buy_volume: number;
  sell_volume: number;
  delta: number;
  is_poc: boolean;
  in_value_area: boolean;
  is_hvn: boolean;
  is_lvn: boolean;
}

export interface OrderFlowSummary {
  net_delta: number;
  total_buy_volume: number;
  total_sell_volume: number;
  buy_ratio_pct: number;
  cvd: number;
  order_flow_sentiment: string;
  recent_candles_count: number;
}

export interface VolumeProfileSignal {
  type: string;
  direction: 'BUY' | 'SELL';
  strength: number;
  message: string;
  target_price?: number;
  stop_loss?: number;
}

export interface VolumeProfileResponse {
  symbol: string;
  timeframe: string;
  timestamp: number;
  current_price: number;
  total_volume: number;
  poc_price: number;
  vah_price: number;
  val_price: number;
  price_to_poc_distance_pct: number;
  market_sentiment: 'STRONG_BULLISH' | 'BULLISH' | 'BALANCED' | 'BEARISH' | 'STRONG_BEARISH';
  hvn_levels: number[];
  lvn_levels: number[];
  bins: VolumeBin[];
  order_flow_summary: OrderFlowSummary;
  trading_signals: VolumeProfileSignal[];
}

export async function fetchVolumeProfileAnalysis(
  symbol: string,
  timeframe: string = '1h',
  bins: number = 30
): Promise<VolumeProfileResponse> {
  const res = await fetch(`/api/volume-profile/analyze/${symbol.toUpperCase()}?timeframe=${timeframe}&bins=${bins}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch volume profile analysis: ${res.statusText}`);
  }
  return res.json();
}

export interface OrderFlowDetails {
  symbol: string;
  timeframe: string;
  current_price: number;
  order_flow_summary: OrderFlowSummary;
  trading_signals: VolumeProfileSignal[];
  hvn_levels: number[];
  lvn_levels: number[];
}

export async function fetchOrderFlowDetails(
  symbol: string,
  timeframe: string = '1h'
): Promise<OrderFlowDetails> {
  const res = await fetch(`/api/volume-profile/order-flow/${symbol.toUpperCase()}?timeframe=${timeframe}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch order flow: ${res.statusText}`);
  }
  return res.json();
}
