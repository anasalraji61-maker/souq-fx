/**
 * المؤشرات تُحسب على التاريخ كلّه حتى آخر شمعة معروضة، ثم تُقصّ للنافذة.
 *
 * كانت تُحسب على الشموع المعروضة وحدها (`source.plot`، 80 شمعة افتراضياً من ~180): يسار كل مؤشر
 * فارغ بطول فترته دائماً، وسحابة Ichimoku (52+26) لا تظهر إلا على آخر 3 شموع، وتكبير تحت 14 شمعة
 * يُخفي RSI كلّه — والأسوأ أن **قيمة الشمعة نفسها تتغيّر مع السحب والتكبير** (DEMA20 على الشمعة
 * الأخيرة: 1.07833 بنافذة 80 مقابل 1.07579 على السلسلة، ~25 pip)، فلا تطابق أي منصّة أخرى.
 *
 * بالإعادة `plot` مقطوعة عند شمعة الإعادة، فالتاريخ حتى آخر معروضة لا يكشف المستقبل.
 */
export type IndicatorBase<T> = { bars: T[]; cut: number };

export function indicatorBase<T>(all: readonly T[], start: number, plot: readonly T[]): IndicatorBase<T> {
  // التابع المتزامن قد يعرض احتياطاً شموعاً ليست `all[start…]` — عندها كما كان (النافذة وحدها).
  if (!plot.length || start < 0 || all[start] !== plot[0] || all[start + plot.length - 1] !== plot[plot.length - 1]) {
    return { bars: plot.slice(), cut: 0 };
  }
  return { bars: all.slice(0, start + plot.length), cut: start };
}

/**
 * أساس المؤشرات **الناظرة للأمام** (Chikou = إغلاق بعد 25 شمعة، Fractals بشمعتين يمين، Pivots HL بعشر، ZigZag
 * بآخر قمّة مؤكَّدة): تُحسب على السلسلة كلّها ثم تُقصّ للنافذة من الطرفين. على `indicatorBase` (حتى آخر شمعة
 * معروضة) كان التمرير للخلف يُفرغ آخر 25 خانة من Chikou وآخر شمعتين من الفراكتلات وعشراً من Pivots HL رغم أن
 * الشموع اللاحقة محمَّلة — وتظهر العلامات وتختفي عند الحافة اليمنى مع كل سحبة. TradingView يرسمها حيث توجد
 * شموع لاحقة؛ الحافة الحيّة وحدها فارغة.
 *
 * `live = false` (الإعادة): السلسلة حتى آخر شمعة معروضة فقط كي لا تكشف المستقبل.
 */
export type IndicatorRange<T> = { bars: T[]; from: number; to: number };

export function indicatorRangeBase<T>(
  all: readonly T[],
  start: number,
  plot: readonly T[],
  live: boolean
): IndicatorRange<T> {
  const b = indicatorBase(all, start, plot);
  const aligned =
    plot.length > 0 && start >= 0 && all[start] === plot[0] && all[start + plot.length - 1] === plot[plot.length - 1];
  // غير محاذية (احتياط التابع) أو إعادة ⇒ كالأساس العادي.
  if (!live || !aligned) return { bars: b.bars, from: b.cut, to: b.bars.length };
  return { bars: all.slice(), from: start, to: start + plot.length };
}

/**
 * يقصّ ناتج مؤشر محسوب على `n` شمعة إلى ما بعد `cut`: كل مصفوفة بطول `n` (ومصفوفات المصفوفات
 * كخطوط GMMA، وحقول الكائنات) تُقصّ؛ ما سواها (أعداد، مصفوفات بطول آخر) يبقى كما هو.
 */
export function trimIndicator<R>(result: R, n: number, cut: number): R {
  return trimIndicatorRange(result, n, cut, n);
}

/** كـ`trimIndicator` لكن إلى `[from, to)` — للمؤشرات المحسوبة على سلسلة تتجاوز يمين النافذة. */
export function trimIndicatorRange<R>(result: R, n: number, from: number, to: number): R {
  if (from <= 0 && to >= n) return result;
  const trim = (x: unknown): unknown => {
    if (Array.isArray(x)) {
      if (x.length === n) return x.slice(from, to);
      if (x.length > 0 && x.every((l) => Array.isArray(l) && l.length === n)) return x.map((l) => l.slice(from, to));
      return x;
    }
    if (x && typeof x === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(x)) out[k] = trim((x as Record<string, unknown>)[k]);
      return out;
    }
    return x;
  };
  return trim(result) as R;
}
