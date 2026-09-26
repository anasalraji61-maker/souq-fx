import {
  dailyBarCloseSec,
  forexNextCloseSec,
  forexWeekCloseSec,
  iceBreakStartForCloseSec,
  isForexMarketOpen,
  nyFivePmUtcSec,
} from './marketHours';

const WEEK_SEC = 604800;

/**
 * العدّ التنازلي لإغلاق الشمعة الجارية — يُكتب تحت سعر وسم السعر الحيّ.
 *
 * متداول الفوركس ينتظر إغلاق الشمعة ليحكم على كسر أو ابتلاع؛ بلا عدّاد يحسب الدقائق
 * بذهنه من ساعة الجهاز وفريم الشارت. الإغلاق = زمن افتتاح آخر شمعة + خطوة الفريم (لا تقريب
 * لحدود الساعة: الشمعة اليومية عند الوسطاء تفتح 21:00/22:00 UTC لا منتصف الليل). مع `symbol` اليومية تُغلق
 * 17:00 نيويورك من يوم ختمها (`dailyBarCloseSec`) — كانت تعدّ لمنتصف ليل UTC: 3 ساعات زائدة صيفاً (2 شتاءً)،
 * وتختفي كل مساء حين يصل ختم الغد.
 *
 * الأسبوعي: يُغلق مع إغلاق أسبوع شمعته (الجمعة 17:00 نيويورك، `forexWeekCloseSec`) لا بعد 7 أيام من ختم الاثنين،
 * والكريبتو بعد 7 أيام. فوق اليوم يُكتب «4d 06:12» (أيام وساعات:دقائق) — بعرض «23:59:59» نفسه على الوسم.
 * عطلة 25/12 وسط الأسبوع لا تُغلق الأسبوعية (السوق مغلق فيها فلا عدّاد أصلاً)؛ عطلة الجمعة تُنهي الأسبوع الخميس.
 *
 * `null` = لا يُعرض: خطوة أطول من أسبوع، أو
 * الشمعة أُغلقت ولم تصل تاليتها (السوق مغلق/عطلة/انقطاع — عدّاد عالق عند 0:00 يوهم بحياة)،
 * أو المتبقّي أكبر من الخطوة (ساعة الجهاز متأخّرة عن الخادم: رقم مستحيل لا يُعرض).
 *
 * `symbol` اختياري: معه لا عدّاد والسوق مغلق، والإغلاق لا يتجاوز إغلاق الجمعة — يومية
 * الجمعة (مختومة 00:00 UTC) و4H الساعة 20:00 كانتا تعدّان ساعات بعد إغلاق السوق. وكذلك عشيّة
 * عطلتَي 25/12 و1/1 (`forexNextCloseSec`)، وكسر ICE اليومي لـDXY وبرنت (`iceBreakStartForCloseSec`).
 */
export function barCloseCountdown(
  lastBarTime: number,
  stepSec: number,
  nowMs: number,
  symbol?: string
): string | null {
  if (!Number.isFinite(lastBarTime) || !Number.isFinite(nowMs)) return null;
  if (!(stepSec > 0) || (stepSec > 86400 && stepSec !== WEEK_SEC)) return null;
  const openSec = lastBarTime > 1e12 ? lastBarTime / 1000 : lastBarTime;
  let closeSec = openSec + stepSec;
  if (symbol && stepSec === WEEK_SEC) {
    if (!isForexMarketOpen(symbol, new Date(nowMs))) return null;
    const weekClose = forexWeekCloseSec(symbol, openSec * 1000);
    if (weekClose != null) closeSec = weekClose;
    // عطلة **الجمعة** (25/12 و1/1 عام 2026): آخر تداول الأسبوع الخميس 17:00 نيويورك — كانت الأسبوعية تعدّ «1d 10:00»
    // واليومية بجانبها «10:00:00»، ثم تختفي عند إغلاق الخميس والعدّاد عند يوم كامل. عطلة وسط الأسبوع لا تُغلقها.
    const nc = forexNextCloseSec(symbol, nowMs);
    if (nc != null && nc < closeSec && nyFivePmUtcSec(Math.floor(nc / 86400) * 86400 + 86400) >= closeSec) closeSec = nc;
  } else if (symbol) {
    if (stepSec === 86400) closeSec = dailyBarCloseSec(symbol, openSec);
    if (!isForexMarketOpen(symbol, new Date(nowMs))) return null;
    const weekClose = forexNextCloseSec(symbol, nowMs);
    if (weekClose != null && weekClose < closeSec) closeSec = weekClose;
    // DXY/برنت: شمعة تنتهي داخل الكسر اليومي تُغلق فعلياً ببدايته.
    const breakStart = iceBreakStartForCloseSec(symbol, closeSec);
    if (breakStart != null && breakStart < closeSec) closeSec = breakStart;
  }
  const remaining = closeSec - nowMs / 1000;
  if (!(remaining > 0) || remaining > stepSec + 1) return null;
  const total = Math.min(stepSec, Math.ceil(remaining));
  if (total > 86400) {
    const d = Math.floor(total / 86400);
    const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, '0');
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    return `${d}d ${hh}:${mm}`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
