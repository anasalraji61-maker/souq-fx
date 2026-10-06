/** Stripe card subscriptions (web / desktop). */
import { apiClient } from './client';
import { getToken } from './session';
import type { PlanId } from './plan';

let configCache: { enabled: boolean; test_mode: boolean | null } | null = null;

export async function billingConfig(): Promise<{ enabled: boolean; test_mode: boolean | null }> {
  if (configCache) return configCache;
  const res = await apiClient.get<{ enabled: boolean; test_mode: boolean | null }>('/api/billing/config');
  configCache = res.ok && res.data ? res.data : { enabled: false, test_mode: null };
  return configCache;
}

/** Go to Stripe Checkout. Returns an Arabic error message, or never returns (page navigates away). */
export async function startCheckout(plan: Exclude<PlanId, 'free'>): Promise<string | null> {
  if (!getToken()) return 'سجّل الدخول أولاً من صفحة «حسابي»، ثم اختر الباقة.';
  const res = await apiClient.post<{ url: string }>('/api/billing/checkout', { plan });
  if (res.ok && res.data?.url) {
    window.location.href = res.data.url;
    return null;
  }
  if (res.status === 401) return 'انتهت جلستك. سجّل الدخول مجدداً من صفحة «حسابي».';
  if (res.status === 503) return 'الدفع بالبطاقة غير مفعّل حالياً.';
  return 'تعذّر فتح صفحة الدفع. حاول بعد قليل.';
}

/** Stripe customer portal (change card, cancel, invoices). */
export async function openBillingPortal(): Promise<string | null> {
  const res = await apiClient.post<{ url: string }>('/api/billing/portal', {});
  if (res.ok && res.data?.url) {
    window.location.href = res.data.url;
    return null;
  }
  if (res.status === 404) return 'لا يوجد اشتراك بالبطاقة لهذا الحساب.';
  return 'تعذّر فتح بوابة الاشتراك. حاول بعد قليل.';
}
