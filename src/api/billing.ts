/** Stripe card subscriptions (web / desktop). */
import { apiClient } from './client';
import { getToken } from './session';
import type { PlanId } from './plan';
import { tl } from '../i18n/locales';

let configCache: { enabled: boolean; test_mode: boolean | null } | null = null;

export async function billingConfig(): Promise<{ enabled: boolean; test_mode: boolean | null }> {
  if (configCache) return configCache;
  const res = await apiClient.get<{ enabled: boolean; test_mode: boolean | null }>('/api/billing/config');
  configCache = res.ok && res.data ? res.data : { enabled: false, test_mode: null };
  return configCache;
}

/** Go to Stripe Checkout. Returns an Arabic error message, or never returns (page navigates away). */
export async function startCheckout(plan: Exclude<PlanId, 'free'>): Promise<string | null> {
  if (!getToken()) return tl().mx2_signInFirst;
  const res = await apiClient.post<{ url: string }>('/api/billing/checkout', { plan });
  if (res.ok && res.data?.url) {
    window.location.href = res.data.url;
    return null;
  }
  if (res.status === 401) return tl().mx2_sessionEnded;
  if (res.status === 503) return tl().mx2_cardOff;
  return tl().mx2_checkoutFail;
}

/** Stripe customer portal (change card, cancel, invoices). */
export async function openBillingPortal(): Promise<string | null> {
  const res = await apiClient.post<{ url: string }>('/api/billing/portal', {});
  if (res.ok && res.data?.url) {
    window.location.href = res.data.url;
    return null;
  }
  if (res.status === 404) return tl().mx2_noCardSub;
  return tl().mx2_portalFail;
}
