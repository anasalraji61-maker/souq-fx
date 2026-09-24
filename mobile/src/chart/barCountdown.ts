import { forexNextCloseSec, isForexMarketOpen } from './marketHours';

/**
 * العدّ التنازلي لإغلاق الشمعة الجارية — يُكتب تحت سعر وسم السعر الحيّ.
 *
 * متداول الفوركس ينتظر إغلاق الشمعة ليحكم على كسر أو ابتلاع؛ بلا عدّاد يحسب الدقائق
 * بذهنه من ساعة الجهاز وفريم الشارت. الإغلاق = زمن افتتاح آخر شمعة + خطوة الفريم (لا تقريب
 * لحدود الساعة: الشمعة اليومية عند الوسطاء تفتح 21:00/22:00 UTC لا منتصف الليل).
 *
 * `null` = لا يُعرض: خطوة أطول من يوم (الأسبوعي — العدّ بالأيام لا يفيد بوسم ضيّق)، أو
 * الشمعة أُغلقت ولم تصل تاليتها (السوق مغلق/عطلة/انقطاع — عدّاد عالق عند 0:00 يوهم بحياة)،
 * أو المتبقّي أكبر من الخطوة (ساعة الجهاز متأخّرة عن الخادم: رقم مستحيل لا يُعرض).
 *
 * `symbol` اختياري: معه لا عدّاد والسوق مغلق، والإغلاق لا يتجاوز إغلاق الجمعة — يومية
 * الجمعة (مختومة 00:00 UTC) و4H الساعة 20:00 كانتا تعدّان ساعات بعد إغلاق السوق. وكذلك عشيّة
 * عطلتَي 25/12 و1/1 (`forexNextCloseSec`).
 */
export function barCloseCountdown(
  lastBarTime: number,
  stepSec: number,
  nowMs: number,
  symbol?: string
): string | null {
  if (!Number.isFinite(lastBarTime) || !Number.isFinite(nowMs)) return null;
  if (!(stepSec > 0) || stepSec > 86400) return null;
  const openSec = lastBarTime > 1e12 ? lastBarTime / 1000 : lastBarTime;
  let closeSec = openSec + stepSec;
  if (symbol) {
    if (!isForexMarketOpen(symbol, new Date(nowMs))) return null;
    const weekClose = forexNextCloseSec(symbol, nowMs);
    if (weekClose != null && weekClose < closeSec) closeSec = weekClose;
  }
  const remaining = closeSec - nowMs / 1000;
  if (!(remaining > 0) || remaining > stepSec + 1) return null;
  const total = Math.min(stepSec, Math.ceil(remaining));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
