/**
 * «خبر قوي قريب» للزوج المعروض — رياضيات صرفة قابلة للاختبار بـtsx.
 *
 * المتداول الفردي يُفاجأ غالباً بخبر عالي التأثير (NFP/قرار فائدة) يقفز فيه السعر وينزلق الوقف.
 * نربط عملتي الزوج بأحداث التقويم عالية التأثير خلال الساعات القليلة القادمة (أو الجارية الآن).
 *
 * - عملات الزوج: EURUSD → EUR,USD؛ XAUUSD → USD (لا أحداث للذهب نفسه)؛ DXY/النفط → USD.
 *   رموز غير معروفة (مؤشرات أسهم/عملات رقمية) → [] فلا تنبيه بدل ربط مخمَّن.
 * - أحداث المثال (`sample`) لا تُستخدم أبداً: تحذير من خبر وهمي أسوأ من غياب التحذير.
 * - أحداث بلا وقت دقيق (`ts`) تُتجاهَل: لا نعرض عدّاً تنازلياً لا نعرفه.
 */

export type NewsEvent = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  ts?: number | null;
  sample?: boolean;
};

const FIAT = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY',
  'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'ZAR', 'MXN', 'SGD', 'HKD',
]);
const METALS = new Set(['XAU', 'XAG']);
/** رموز تُسعَّر بالدولار ويحرّكها خبر الدولار أولاً. */
const USD_DRIVEN = new Set(['DXY', 'USOIL', 'UKOIL', 'WTI', 'BRENT', 'XAUUSD', 'XAGUSD']);

export function symbolCurrencies(symbol: string): string[] {
  const s = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  if (USD_DRIVEN.has(s)) return ['USD'];
  if (s.length !== 6) return [];
  // CNH (يوان خارجي) يظهر بالتقويم كـCNY.
  const norm = (c: string) => (c === 'CNH' ? 'CNY' : c);
  const base = norm(s.slice(0, 3));
  const quote = norm(s.slice(3));
  /**
   * المعدن بعملة غير الدولار (XAUEUR، XAUAUD، XAGEUR…): الذهب يُسعَّر عالمياً بالدولار فيقفز بخبر
   * الدولار أولاً، ثم بخبر عملة التسعير. كانا يُرفضان كـ«ليس فوركس» فيغيب التحذير كلياً عن زوجٍ تقبله
   * حاسبة المخاطرة (`instrumentSpec`) وتحسب له حجم مركز — أي قبل الرواتب الأمريكية بدقائق بالضبط.
   */
  if (METALS.has(base)) return FIAT.has(quote) ? (quote === 'USD' ? ['USD'] : ['USD', quote]) : [];
  if (!FIAT.has(base) || !FIAT.has(quote)) return [];
  return base === quote ? [base] : [base, quote];
}

export const NEWS_HORIZON_MS = 3 * 60 * 60 * 1000;
export const NEWS_GRACE_MS = 15 * 60 * 1000;

/**
 * أقرب حدث عالي التأثير لعملات الزوج ضمن [الآن − 15د، الآن + 3س]؛ null إن لا يوجد.
 *
 * «أقرب» = أصغر بُعدٍ عن اللحظة **بالاتجاهين** (`|deltaMs|`)، والتعادل للقادم. كان الاختيار بأصغر
 * `deltaMs` بإشارتها، فالحدث الذي مضى أقدم يغلب دائماً: خبرٌ يوروبي صدر قبل 14 دقيقة كان يحجب
 * «الرواتب الأمريكية بعد دقيقتين» عن متداول EURUSD — فيقرأ «الآن» عن خبر انتهى، ولا يعرف أن
 * القفزة الحقيقية لم تقع بعد. وبين حدثين مضيا كان يُعرض الأقدم لا الأحدث.
 */
export function nextHighImpact(
  events: readonly NewsEvent[],
  currencies: readonly string[],
  nowMs: number,
  horizonMs: number = NEWS_HORIZON_MS,
  graceMs: number = NEWS_GRACE_MS
): { event: NewsEvent; deltaMs: number } | null {
  if (!currencies.length) return null;
  const want = new Set(currencies);
  let best: { event: NewsEvent; deltaMs: number } | null = null;
  for (const e of events) {
    if (e.sample) continue;
    if (String(e.impact).toLowerCase() !== 'high') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) continue;
    if (!want.has(String(e.currency).toUpperCase())) continue;
    const delta = e.ts * 1000 - nowMs;
    if (delta < -graceMs || delta > horizonMs) continue;
    const dist = Math.abs(delta);
    const bestDist = best ? Math.abs(best.deltaMs) : Infinity;
    if (dist < bestDist || (best && dist === bestDist && delta > best.deltaMs)) best = { event: e, deltaMs: delta };
  }
  return best;
}
