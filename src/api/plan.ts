/**
 * The trader's subscription plan and the limits the app must apply now.
 * While the admin keeps enforcement off, every limit is null (unlimited) and nothing is locked.
 */
import { apiClient } from './client';
import { onSessionChange } from './session';

export type PlanId = 'free' | 'basic' | 'pro' | 'vip';
export type LimitKey = 'charts' | 'indicators_per_chart' | 'watchlists' | 'watchlist_symbols' | 'alerts' | 'ai_daily';

export interface PlanInfo {
  plan: PlanId;
  label: string;
  expires_at: number | null;
  days_left: number | null;
  enforcement: boolean;
  limits: Record<LimitKey, number | null>;
  plan_limits: Record<PlanId, Record<LimitKey, number | null>>;
  prices_usd: Record<PlanId, number>;
  labels: Record<PlanId, string>;
  payment_instructions: string;
}

const UNLIMITED: Record<LimitKey, number | null> = {
  charts: null,
  indicators_per_chart: null,
  watchlists: null,
  watchlist_symbols: null,
  alerts: null,
  ai_daily: null,
};

let current: PlanInfo | null = null;
const listeners = new Set<(p: PlanInfo | null) => void>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch {
      // ignore listener errors
    }
  });
}

export async function refreshPlan(): Promise<PlanInfo | null> {
  const res = await apiClient.get<PlanInfo>('/api/plan');
  if (res.ok && res.data && typeof res.data.plan === 'string') {
    current = res.data;
    emit();
  }
  return current;
}

export function getPlan(): PlanInfo | null {
  return current;
}

/** Current limit (null = unlimited, also when the plan is not loaded yet: never block on a network hiccup). */
export function planLimit(key: LimitKey): number | null {
  return current ? current.limits[key] ?? null : UNLIMITED[key];
}

export function onPlanChange(fn: (p: PlanInfo | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface PlanLimitEventDetail {
  limit: LimitKey;
  max: number | null;
}

/** Ask the app to show the upgrade dialog for a reached limit. */
export function requestUpgrade(limit: LimitKey, max: number | null) {
  window.dispatchEvent(new CustomEvent<PlanLimitEventDetail>('matrix:plan-limit', { detail: { limit, max } }));
}

/** True (and shows the upgrade dialog) when adding one more item would exceed the limit. */
export function blockedByPlan(limit: LimitKey, countAfterAdd: number): boolean {
  const max = planLimit(limit);
  if (max !== null && countAfterAdd > max) {
    requestUpgrade(limit, max);
    return true;
  }
  return false;
}

let started = false;
export function startPlanTracking() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void refreshPlan();
  onSessionChange(() => void refreshPlan());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshPlan();
  });
}
