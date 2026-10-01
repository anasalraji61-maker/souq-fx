/**
 * جلسات الفوركس الثلاث (طوكيو، لندن، نيويورك) على الفريمات داخل اليوم — دالة خالصة.
 *
 * متداول الفوركس يقرأ الشارت بالجلسة: اختراق افتتاح لندن، تقاطع لندن/نيويورك (أعلى سيولة
 * باليوم)، ونطاق آسيا الهادئ الذي يُكسر بعده. بلا تظليل يُعدّ ذلك من ساعة التقاطع شمعةً
 * شمعة، وبتوقيت الهاتف لا توقيت المدن.
 *
 * الساعات بالتوقيت المحلي لكل مدينة (العرف الشائع بمنصّات الفوركس)، مع التوقيت الصيفي:
 * - طوكيو 09:00–18:00 JST (لا توقيت صيفي) = 00:00–09:00 UTC.
 * - لندن 08:00–17:00 (GMT/BST) — الصيفي الأوروبي: آخر أحد من آذار حتى آخر أحد من تشرين
 *   الأول، عند 01:00 UTC.
 * - نيويورك 08:00–17:00 (EST/EDT) — `nyDst` بـ`marketHours.ts`.
 * حساب خالص بلا `Intl` (دعم المناطق الزمنية بمحرّك الهاتف غير مضمون).
 *
 * الشمعة تنتمي لجلسة إن **بدأت** داخلها. السبت والأحد (UTC) بلا جلسات.
 */
import { DAY_SEC, nyDst, ukDst } from './marketHours';

export { ukDst };

export type SessionId = 'tokyo' | 'london' | 'ny';

export const SESSION_IDS: readonly SessionId[] = ['tokyo', 'london', 'ny'];

const HOUR = 3600;

/** نافذة الجلسة `[from, to)` بالثواني UTC لليوم الذي يبدأ عند `dayStartSec` (منتصف ليل UTC). */
export function sessionWindowUtc(id: SessionId, dayStartSec: number): [number, number] {
  if (id === 'tokyo') return [dayStartSec, dayStartSec + 9 * HOUR];
  // الصيفي يُقرأ عند منتصف الجلسة: يوم التبديل (أحد) بلا جلسات أصلاً.
  if (id === 'london') {
    const off = ukDst(dayStartSec + 12 * HOUR) ? 1 : 0;
    return [dayStartSec + (8 - off) * HOUR, dayStartSec + (17 - off) * HOUR];
  }
  const off = nyDst(dayStartSec + 17 * HOUR) ? 4 : 5;
  return [dayStartSec + (8 + off) * HOUR, dayStartSec + (17 + off) * HOUR];
}

export function inSession(id: SessionId, sec: number): boolean {
  if (!Number.isFinite(sec)) return false;
  const day = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const dow = new Date(day * 1000).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const [from, to] = sessionWindowUtc(id, day);
  return sec >= from && sec < to;
}

export type SessionRun = { id: SessionId; from: number; to: number };

/**
 * فهارس متّصلة من الشموع داخل كل جلسة (`from`…`to` شاملة). فارغة على 4H فأكبر (شمعة 4H
 * تعبر حدّ الجلسة فالتظليل يكذب بساعات) أو حين تضيق الشمعة عن `minSlotPx` بعرض ساعة (تظليل
 * يصير ضجيجاً عند تصغير 1m لأيام).
 */
export function planSessionRuns(
  timesSec: readonly number[],
  stepSec: number,
  plotW: number,
  minHourPx = 2
): SessionRun[] {
  const n = timesSec.length;
  if (n === 0 || !(stepSec > 0) || stepSec > HOUR || !(plotW > 0)) return [];
  if ((plotW / n) * (HOUR / stepSec) < minHourPx) return [];
  const out: SessionRun[] = [];
  for (const id of SESSION_IDS) {
    let start = -1;
    for (let i = 0; i <= n; i++) {
      const inside = i < n && inSession(id, timesSec[i]!);
      if (inside && start < 0) start = i;
      else if (!inside && start >= 0) {
        out.push({ id, from: start, to: i - 1 });
        start = -1;
      }
    }
  }
  return out;
}

/**
 * فهارس الجلسة كاملةً حول `from`…`to` (فهارس `timeAt` المطلقة): الشريحة تُرسم بالنافذة المرئية فقط، لكن مداها
 * بالـpip يجب أن يكون للجلسة كلّها — شريحة طوكيو تبدأ قبل حافّة النافذة اليسرى كانت تقرأ «18.5 pip» ونطاق آسيا
 * الحقيقي 32. يمتدّ بالشموع المحمَّلة ما دامت داخل الجلسة نفسها في يوم UTC نفسه.
 */
export function fullSessionSpan(
  id: SessionId,
  timeAt: (i: number) => number,
  n: number,
  from: number,
  to: number
): [number, number] {
  const t0 = timeAt(from);
  if (!Number.isFinite(t0)) return [from, to];
  const day = Math.floor(t0 / DAY_SEC);
  const same = (i: number) => {
    const t = timeAt(i);
    return Number.isFinite(t) && Math.floor(t / DAY_SEC) === day && inSession(id, t);
  };
  let a = from;
  while (a > 0 && same(a - 1)) a--;
  let b = to;
  while (b < n - 1 && same(b + 1)) b++;
  return [a, b];
}
