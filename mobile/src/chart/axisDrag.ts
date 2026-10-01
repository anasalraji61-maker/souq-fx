/**
 * سحب المحورَين كـTradingView — دوال خالصة.
 *
 * كان سحب محور السعر يحرّك الشارت رأسياً وسحب محور الزمن يحرّكه أفقياً — نسخة ثانية من سحب
 * الشارت نفسه. فعلى الهاتف **لا سبيل لمطّ السعر أو ضغطه** إطلاقاً (عجلة الفأرة فوق المحور
 * بالويب وحدها تفعل)، والمتداول الذي يريد رؤية شموع اليوم أطول ليقرأ ذيولها لا يجد إلا AUTO.
 *
 * - محور السعر: السحب لأسفل يضغط السعر (مدى أوسع)، ولأعلى يمطّه (مدى أضيق) — حول مركز العرض.
 * - محور الزمن: السحب يميناً يكبّر الشموع (عدد أقلّ)، ويساراً يصغّرها — الطرف الأيمن مثبَّت
 *   (الشمعة عند يمين اللوح تبقى مكانها، فمتابعة الحيّ لا تنقطع).
 * - كلاهما يُحسب **من حالة بدء السحب** كل إطار، فالعودة بالإصبع لموضعه تعيد العرض كما كان.
 * - نقرتان سريعتان على المحور ⇒ يعود مقياسه وحده تلقائياً (السعر: مقياس وإزاحة رأسية؛ الزمن:
 *   عدد الشموع) بلا لمس الآخر — AUTO بالزاوية تعيد الاثنين والنافذة للحيّ معاً.
 */
import { pinchWindow, type ZoomWindow } from './zoomWindow';

/** لكل بكسل سحب: 100px ≈ ×1.65. عجلة المحور بالويب `0.006` لكل وحدة `deltaY`. */
export const AXIS_DRAG_K = 0.005;

export const PRICE_SCALE_MIN = 0.01;
export const PRICE_SCALE_MAX = 200;

/** مقياس السعر بعد سحب `dy` بكسل (موجب = لأسفل = ضغط). */
export function priceAxisDragScale(startScale: number, dy: number): number {
  const start =
    Number.isFinite(startScale) && startScale > 0
      ? Math.max(PRICE_SCALE_MIN, Math.min(PRICE_SCALE_MAX, startScale))
      : 1;
  if (!Number.isFinite(dy) || dy === 0) return start;
  return Math.max(PRICE_SCALE_MIN, Math.min(PRICE_SCALE_MAX, start * Math.exp(dy * AXIS_DRAG_K)));
}

/** نافذة الشموع بعد سحب `dx` بكسل على محور الزمن (موجب = يميناً = تكبير)، الطرف الأيمن مثبَّت. */
export function timeAxisDragWindow(
  allLen: number,
  startCount: number,
  startOffset: number,
  dx: number
): ZoomWindow {
  const d = Number.isFinite(dx) ? dx : 0;
  return pinchWindow(allLen, startCount, startOffset, 1, Math.exp(d * AXIS_DRAG_K), 1);
}

/** نقرتان على المحور: ≤ 320ms بينهما و≤ 24px (لمس الإصبع لا يقع على البكسل نفسه). */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_SLOP = 24;

export type AxisTap = { at: number; x: number; y: number };

export function isDoubleTap(prev: AxisTap | null, next: AxisTap): boolean {
  if (!prev) return false;
  const dt = next.at - prev.at;
  if (!(dt >= 0 && dt <= DOUBLE_TAP_MS)) return false;
  return Math.hypot(next.x - prev.x, next.y - prev.y) <= DOUBLE_TAP_SLOP;
}

/** حركة أقلّ من هذا (بكسل) منذ اللمس = نقرة لا سحب. */
export const AXIS_TAP_SLOP = 6;
