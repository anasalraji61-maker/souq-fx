/**
 * هندسة اللوحات ثنائية الجانب (هيستوغرام موجب/سالب حول الصفر) — دوال خالصة.
 *
 * سبب وجود الملف: ستّ وأربعون لوحة تضع أعمدتها هكذا حرفياً:
 *
 *     const h = Math.min(paneH - 16, (Math.abs(v) / max) * (paneH / 2 - 8));
 *     marginTop: v >= 0 ? paneH / 2 - h : paneH / 2
 *
 * ومساحة الرسم الفعلية داخل اللوحة `innerH = paneH - 16` (نفس ثابت `macdPane.ts`
 * و`stochPane.ts`). فالرقم `paneH / 2` **ليس** منتصف مساحة الرسم بل منتصف اللوحة
 * كاملةً — أي أن خطّ الصفر يقع أسفل مركزها الحقيقي بـ‎8px‎ ثابتة بكل لوحة. أثر ذلك:
 *
 * 1) **إزاحة خطّ الصفر**: المركز الحقيقي `(paneH − 16) / 2` = `paneH / 2 − 8`. فبلوحة
 *    بارتفاع 44px يقع «الصفر» عند 22 بدل 14 — إزاحة تساوي ‎‎57%‎ من نصف المساحة، لا
 *    خطأ تقريب. المتداول يقرأ عمقَ عمود سالب أكبر من الحقيقة وعمق عمود موجب أقلّ.
 * 2) **فيض أسفل اللوحة**: أطول عمود سالب يمتدّ إلى `paneH / 2 + (paneH / 2 − 8)`
 *    = `paneH − 8`، بينما مساحة الرسم تنتهي عند `paneH − 16` — فيض ‎8px‎ يقصّه
 *    `overflow: 'hidden'` باللوحة، أي أن قاع أعمق عمود **مقطوع دائماً** ولا يظهر مداه.
 * 3) **حدّ `Math.min` معطَّل**: الحدّ الأعلى مكتوب `paneH − 16` (المساحة كاملةً) بينما
 *    أقصى ارتفاع ممكن لعمود بجانب واحد هو نصفها — فالحدّ لا يقيّد شيئاً أبداً.
 *
 * ولهذا لم يكن الخلل ظاهراً كخطأ صريح: الاتجاه واللون سليمان دائماً، والعطب بالمحاذاة
 * وحدها — وهو بالضبط ما يفسّر تفاوت المحاذاة الملحوظ بين اللوحات ثنائية الجانب
 * واللوحات أحادية الجانب (RSI وأخواتها) المبنيّة أصلاً على `innerH` الصحيح.
 *
 * الدالتان هنا تُصلحان الثلاثة معاً بتعريف واحد: المرجع `innerH / 2` لا `paneH / 2`،
 * والحدّ الأعلى `innerH / 2` لا `innerH`. ولوحة بارتفاع صفر أو سالب أو NaN تعطي صفراً
 * بكل المواضع — بلا NaN يتسرّب لأنماط React Native.
 */

/** ارتفاع الحافة المحجوزة أعلى/أسفل مساحة الرسم داخل اللوحة (نفس ثابت `macdPane.ts`/`stochPane.ts`). */
export const PANE_PAD = 16;

const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** ارتفاع مساحة الرسم داخل لوحة بارتفاع `paneH`. لا يقلّ عن صفر ولا يكون NaN. */
export function centeredPaneInnerH(paneH: number): number {
  return Math.max(0, (finite(paneH) ? paneH : 0) - PANE_PAD);
}

/**
 * موضع (y) خطّ الصفر داخل مساحة الرسم — **مركزها الحقيقي**، وهو المرجع الذي تُقاس منه
 * الأعمدة صعوداً وهبوطاً. يُستعمل كذلك لرسم خطّ الصفر نفسه بنفس الموضع بالضبط.
 */
export function centeredPaneZeroY(paneH: number): number {
  return centeredPaneInnerH(paneH) / 2;
}

/**
 * ارتفاع عمود لقيمة `v` مقيسةً على `maxAbs` (أكبر قيمة مطلقة بالنافذة المعروضة، أو 1
 * للمؤشرات المحصورة رياضياً بـ‎±1‎ كـTwiggs MF وIFT-RSI).
 * لا يتجاوز **نصف** مساحة الرسم أبداً فلا يخرج العمود من الجانب المقابل.
 * `maxAbs` صفرية أو سالبة أو غير محدودة ← صفر (بدل قسمة على صفر أو NaN).
 */
export function centeredBarH(v: number, maxAbs: number, paneH: number): number {
  if (!finite(v) || !finite(maxAbs) || maxAbs <= 0) return 0;
  const half = centeredPaneInnerH(paneH) / 2;
  return clamp((Math.abs(v) / maxAbs) * half, 0, half);
}

/**
 * الهامش العلوي للعمود: القيم الموجبة تُرسم صاعدةً **من** خطّ الصفر فيبدأ العمود عند
 * `zeroY − h`، والسالبة تُرسم هابطةً **منه** فيبدأ عند `zeroY` تماماً.
 * `h` غير صالح أو `v` غير صالحة ← خطّ الصفر نفسه (عمود بلا امتداد، لا موضع مخترَع).
 */
export function centeredBarTop(v: number, h: number, paneH: number): number {
  const zeroY = centeredPaneZeroY(paneH);
  if (!finite(v) || !finite(h)) return zeroY;
  return v >= 0 ? zeroY - clamp(h, 0, zeroY) : zeroY;
}

/**
 * لون أعمدة Bill Williams (AO وAC) كـTradingView: أخضر حين يعلو العمود سابقه، أحمر حين لا يعلوه
 * (`diff <= 0`) — **لا** بإشارة القيمة. «الصحن» وتسارع AC يُقرآن من تبدّل اللون فوق الصفر وتحته؛ التلوين
 * بالإشارة يُخفيهما (عمود موجب يهبط يظهر أخضر). بلا عمود سابق ⇒ صاعد (`na <= 0` خطأ بـPine).
 * يُحسب على السلسلة **قبل** قصّ نافذة العرض كي يعرف أوّل عمود مرئيّ سابقه.
 */
export function risingBars(values: readonly (number | null)[]): boolean[] {
  return values.map((v, i) => {
    const prev = i > 0 ? values[i - 1] : null;
    return !(finite(v) && finite(prev) && v - prev <= 0);
  });
}
