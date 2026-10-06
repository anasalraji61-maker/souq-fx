import { apiClient } from './client';

/** Plan id from the displayed plan name/price (the pricing screen passes Arabic names). */
export function planIdFrom(planName: string, priceUsd: number): 'free' | 'basic' | 'pro' | 'vip' | null {
  const n = (planName || '').toLowerCase();
  if (/vip|نخبة|النخبة/.test(n) || priceUsd === 20) return 'vip';
  if (/pro|محترف|المحترف/.test(n) || priceUsd === 15) return 'pro';
  if (/basic|أساسي|الأساسية/.test(n) || priceUsd === 10) return 'basic';
  if (priceUsd === 0) return 'free';
  return null;
}

/** Join the launch waitlist on the server. Returns an Arabic error message, or null on success. */
export async function joinWaitlist(email: string, plan: string | null, source = 'pricing'): Promise<string | null> {
  let lang = 'ar';
  try {
    lang = (localStorage.getItem('matrix_lang') || 'ar').slice(0, 8);
  } catch {
    // default
  }
  const res = await apiClient.post<{ ok: boolean }>('/api/waitlist', { email: email.trim(), plan, lang, source });
  if (res.ok) return null;
  if (res.status === 422) return 'يرجى إدخال عنوان بريد إلكتروني صحيح.';
  if (res.status === 429) return 'محاولات كثيرة. حاول بعد قليل.';
  return 'تعذّر الاتصال بالخادم. تحقّق من الإنترنت وحاول مجدداً.';
}
