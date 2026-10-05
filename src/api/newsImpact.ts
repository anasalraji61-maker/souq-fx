/**
 * News Impact & Volatility Guard API Client
 */

export interface VolatilityPreAlert {
  id: string;
  event_title: string;
  currency: string;
  impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduled_time: string;
  minutes_remaining: number;
  risk_score: number;
  guard_mode_active: boolean;
  affected_pairs: string[];
  advisory: 'FREEZE_ORDERS' | 'WIDEN_SL' | 'MONITOR' | 'NORMAL';
}

export interface NewsImpactResponse {
  status: 'GUARD_ACTIVE' | 'NORMAL';
  active_guard_mode: boolean;
  max_risk_score: number;
  total_alerts: number;
  alerts: VolatilityPreAlert[];
  scanned_at: string;
}

export interface SymbolGuardStatus {
  symbol: string;
  guard_mode_active: boolean;
  max_risk_score: number;
  recommendation: 'FREEZE_PENDING_ORDERS' | 'NORMAL';
  active_alerts: Array<Record<string, unknown>>;
}

export const newsImpactAPI = {
  async getUpcoming(minutes: number = 120): Promise<NewsImpactResponse> {
    try {
      const res = await fetch(`/api/news-impact/upcoming?minutes=${minutes}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      // Offline fallback
      return {
        status: 'GUARD_ACTIVE',
        active_guard_mode: true,
        max_risk_score: 95.0,
        total_alerts: 2,
        alerts: [
          {
            id: 'usd_cpi_mock',
            event_title: 'US Core Consumer Price Index (CPI) YoY',
            currency: 'USD',
            impact_level: 'HIGH',
            scheduled_time: new Date(Date.now() + 18 * 60000).toISOString(),
            minutes_remaining: 18,
            risk_score: 95.0,
            guard_mode_active: true,
            affected_pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
            advisory: 'WIDEN_SL'
          },
          {
            id: 'ecb_rate_mock',
            event_title: 'ECB Monetary Policy Statement & Rate Decision',
            currency: 'EUR',
            impact_level: 'HIGH',
            scheduled_time: new Date(Date.now() + 65 * 60000).toISOString(),
            minutes_remaining: 65,
            risk_score: 92.0,
            guard_mode_active: false,
            affected_pairs: ['EURUSD', 'EURGBP', 'EURJPY'],
            advisory: 'MONITOR'
          }
        ],
        scanned_at: new Date().toISOString()
      };
    }
  },

  async getSymbolGuard(symbol: string): Promise<SymbolGuardStatus> {
    try {
      const res = await fetch(`/api/news-impact/guard-status/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        symbol,
        guard_mode_active: symbol.includes('USD'),
        max_risk_score: symbol.includes('USD') ? 95.0 : 40.0,
        recommendation: symbol.includes('USD') ? 'FREEZE_PENDING_ORDERS' : 'NORMAL',
        active_alerts: []
      };
    }
  }
};
