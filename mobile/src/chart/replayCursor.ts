/**
 * Bar Replay مرساة بالزمن لا بفهرس داخل النافذة.
 *
 * كانت الإعادة «أول N شمعة من النافذة الحالية»: السحب أو ‹ › يزيحان النافذة فتنزاح الشمعة المقطوعة معها —
 * سحبة نحو الحيّ تكشف شموعاً لم تُعَد بعد (تُفسد التمرين)، وسحبة للخلف تُخفي ما أُعيد. وعند امتلاء النافذة
 * تنتهي الإعادة ولو بقيت مئات الشموع حتى الحيّ.
 *
 * الآن: الشمعة المقطوعة = آخر شمعة زمنها ≤ زمن الإعادة. النافذة تُسحب بحرّية للخلف، ولا يتجاوز أوّلها
 * الشمعة المقطوعة نحو الحيّ. التقدّم عند نهاية النافذة يزيحها شمعة (كـTradingView: عرض الشمعة ثابت
 * والشارت ينساب يساراً) حتى الشمعة الحيّة.
 */

/** آخر فهرس زمنه ≤ `t` بسلسلة مرتّبة تصاعدياً؛ ‎-1‎ إن لم يوجد. */
export function lastAtOrBefore(times: readonly number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** أوّل فهرس زمنه > `t`؛ `times.length` إن لم يوجد. لبنات Renko بزمن واحد تُعبَر معاً فلا تعلق الخطوة. */
export function firstAfter(times: readonly number[], t: number): number {
  return lastAtOrBefore(times, t) + 1;
}

/** آخر فهرس زمنه < `t`؛ ‎-1‎ إن لم يوجد — الخطوة للخلف. */
export function lastBefore(times: readonly number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! < t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export interface ReplayWindow {
  start: number;
  end: number;
  windowLen: number;
  /** الشموع المكشوفة من أوّل النافذة (≥1). */
  revealed: number;
}

/**
 * نافذة الإعادة: كالنافذة العادية (`end = len − offset`، وآخر 10 شموع حدّ الإزاحة) لكن أوّلها لا يتعدّى
 * `cut` — المكشوف شمعة واحدة على الأقلّ ولا يُكشف ما بعد القطع.
 */
export function replayWindow(len: number, windowCount: number, offset: number, cut: number): ReplayWindow {
  const wc = Math.max(1, windowCount);
  let end = len - Math.min(Math.max(0, offset), Math.max(0, len - 10));
  if (cut >= 0 && end - wc > cut) end = Math.min(len, cut + wc);
  const start = Math.max(0, end - wc);
  const windowLen = Math.max(0, end - start);
  const revealed = Math.max(1, Math.min(windowLen, cut - start + 1));
  return { start, end, windowLen, revealed };
}

/** أدنى إزاحة (أقرب للحيّ) لا تتعدّى فيها النافذة القطع — حدّ السحب و‹ › أثناء الإعادة. */
export function replayMinOffset(len: number, windowCount: number, cut: number): number {
  return cut >= 0 ? Math.max(0, len - cut - Math.max(1, windowCount)) : 0;
}

/**
 * الإزاحة بعد نقل القطع إلى `cut`: للأمام خلف نهاية النافذة ⇒ تنزاح لتبقى الشمعة المقطوعة آخرها؛ للخلف
 * قبل أوّلها ⇒ ترجع لتكون أوّلها. داخل النافذة ⇒ كما هي (المتداول سحب إلى حيث يريد).
 */
export function replayFollowOffset(len: number, windowCount: number, offset: number, cut: number): number {
  const wc = Math.max(1, windowCount);
  const end = len - Math.min(Math.max(0, offset), Math.max(0, len - 10));
  if (cut > end - 1) return Math.max(0, len - 1 - cut);
  if (cut < end - wc) return replayMinOffset(len, wc, cut);
  return offset;
}

/**
 * الإزاحة بعد تكبير/تصغير أثناء الإعادة: الشمعة المقطوعة («الآن» المُعاد) تبقى بنسبتها من عرض اللوح، كما
 * تبقى الشمعة الحيّة بمكانها بالتكبير العادي. `zoomWindow` حول المركز أو الطرف الأيمن الحيّ كان يضع
 * النافذة بعد القطع ⇒ يقصّها `replayWindow` فتقفز المقطوعة إلى أوّل خانة (شمعة واحدة مكشوفة) أو تخرج.
 */
export function replayZoomOffset(
  len: number,
  count: number,
  offset: number,
  cut: number,
  nextCount: number
): number {
  if (len <= 0 || cut < 0) return Math.max(0, offset);
  const w = replayWindow(len, count, offset, cut);
  const ratio = (cut - w.start + 0.5) / Math.max(1, w.windowLen);
  const next = Math.max(1, Math.round(nextCount));
  const start = Math.max(0, Math.min(cut, Math.round(cut + 0.5 - ratio * next)));
  const end = Math.max(Math.min(len, 10), Math.min(len, start + next));
  return Math.max(0, len - end);
}
