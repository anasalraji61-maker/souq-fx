/**
 * حالة سوق الفوركس/المعادن/النفط: تداول شبه متواصل من افتتاح سيدني مساء
 * الأحد (22:00 UTC) حتى إغلاق نيويورك مساء الجمعة (22:00 UTC) — تبسيط قياسي
 * تتبعه أغلب منصات التداول لعرض حالة "مفتوح/مغلق" بلا حاجة لخلاصة بيانات
 * إضافية أو تكلفة جديدة (بند 2 من قائمة الإطلاق، docs/ROADMAP.md).
 * الكريبتو (BTCUSD/ETHUSD) يتداول 24/7 فلا يُغلق أبداً.
 */

const ALWAYS_OPEN = new Set(['BTCUSD', 'ETHUSD']);

/** مفتوح الآن؟ بتوقيت UTC — 0=الأحد..6=السبت (نفس اصطلاح Date#getUTCDay). */
export function isForexMarketOpen(symbol: string, now: Date = new Date()): boolean {
  const sym = symbol.toUpperCase();
  if (ALWAYS_OPEN.has(sym)) return true;
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false; // السبت: مغلق طوال اليوم
  if (day === 0 && hour < 22) return false; // الأحد قبل افتتاح سيدني (22:00 UTC)
  if (day === 5 && hour >= 22) return false; // الجمعة بعد إغلاق نيويورك (22:00 UTC)
  return true;
}

export type MarketStatusLabels = { open: string; closed: string };

/** تسميات افتراضية بالعربية — توافق خلفي لأي استدعاء بلا كائن ترجمة. */
const MARKET_STATUS_LABELS_AR: MarketStatusLabels = {
  open: 'السوق مفتوح',
  closed: 'السوق مغلق',
};

export function marketStatusLabel(
  symbol: string,
  labels: MarketStatusLabels = MARKET_STATUS_LABELS_AR,
  now: Date = new Date()
): string {
  return isForexMarketOpen(symbol, now) ? labels.open : labels.closed;
}
