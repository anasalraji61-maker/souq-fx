import { Candle, Timeframe, ChartType, IndicatorSettings, DrawingTool, DrawingItem } from '../../../types/market';

export interface ViewportState {
  visibleCount: number;
  panOffset: number;
  width: number;
  height: number;
  chartHeight: number;
  priceMarginRight: number;
  timeMarginBottom: number;
}

export interface PriceRange {
  minPrice: number;
  maxPrice: number;
  range: number;
  padding: number;
  adjustedMin: number;
  adjustedMax: number;
  adjustedRange: number;
}

export interface CrosshairPoint {
  x: number;
  y: number;
  candle: Candle | null;
  price: number;
}
