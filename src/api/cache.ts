/**
 * src/api/cache.ts — Caching API Client (Task 22)
 * Architect: Claude Haiku 4.5
 * Lead Builder: Google AI Studio
 */

import { apiClient } from './client';

interface RawCacheStats {
  symbol?: string;
  hit_rate_pct?: number;
  overall_hit_rate_pct?: number;
  avg_hit_latency_ms?: number;
  avg_miss_latency_ms?: number;
  hits?: number;
  total_hits?: number;
  misses?: number;
  total_misses?: number;
}

export interface CacheMetrics {
  symbol: string;
  hitRate: string;
  avgHitLatency: string;
  avgMissLatency: string;
  totalHits: number;
  totalMisses: number;
}

export const cacheAPI = {
  // Invalidate candle cache (called on candle close)
  async invalidateCache(symbol: string, timeframe: string = '*', reason: string = 'candle_close') {
    try {
      const res = await apiClient.post<{ status?: string }>(
        `/api/cache/invalidate/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(
          timeframe
        )}&reason=${encodeURIComponent(reason)}`
      );
      return res.ok ? res.data : null;
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      return null;
    }
  },

  // Update hot symbols list
  async updateHotSymbols(symbols: string[]) {
    try {
      const res = await apiClient.post<unknown>('/api/cache/hot-symbols', symbols);
      return res.ok ? res.data : null;
    } catch (error) {
      console.error('Failed to update hot symbols:', error);
      return null;
    }
  },

  // Get cache statistics
  async getStats(symbol?: string) {
    try {
      const url = symbol ? `/api/cache/stats?symbol=${encodeURIComponent(symbol)}` : '/api/cache/stats';
      const res = await apiClient.get<RawCacheStats>(url);
      return res.ok ? res.data : null;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  },

  // Format cache statistics for display
  formatStats(stats: RawCacheStats | null | undefined): CacheMetrics | null {
    if (!stats) return null;

    const rate = stats.hit_rate_pct ?? stats.overall_hit_rate_pct ?? 0;
    const hitLat = stats.avg_hit_latency_ms ?? 0;
    const missLat = stats.avg_miss_latency_ms ?? 0;
    const hits = stats.hits ?? stats.total_hits ?? 0;
    const misses = stats.misses ?? stats.total_misses ?? 0;

    return {
      symbol: stats.symbol || 'All',
      hitRate: `${Number(rate).toFixed(1)}%`,
      avgHitLatency: `${Number(hitLat).toFixed(2)}ms`,
      avgMissLatency: `${Number(missLat).toFixed(2)}ms`,
      totalHits: hits,
      totalMisses: misses,
    };
  },
};
