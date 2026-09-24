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
 * يقصّ ناتج مؤشر محسوب على `n` شمعة إلى ما بعد `cut`: كل مصفوفة بطول `n` (ومصفوفات المصفوفات
 * كخطوط GMMA، وحقول الكائنات) تُقصّ؛ ما سواها (أعداد، مصفوفات بطول آخر) يبقى كما هو.
 */
export function trimIndicator<R>(result: R, n: number, cut: number): R {
  if (cut <= 0) return result;
  const trim = (x: unknown): unknown => {
    if (Array.isArray(x)) {
      if (x.length === n) return x.slice(cut);
      if (x.length > 0 && x.every((l) => Array.isArray(l) && l.length === n)) return x.map((l) => l.slice(cut));
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
