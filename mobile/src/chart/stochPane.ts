/**
 * هندسة لوحة الستوكاستيك — دالة خالصة مفصولة عن الرسم ليمكن اختبارها عددياً.
 *
 * سبب وجود الملف: `computeStoch` يعيد `{ k, d }` منذ البداية، وكانت اللوحة ترسم `k` وحده
 * و`d` لا يُرسم إطلاقاً — وهو نفس خلل MACD قبل إصلاحه: **تقاطع %K مع %D هو كل ما يستعمله
 * المتداول الفردي من هذا المؤشّر**. %K وحده يقول «تشبّع شرائي» ولا يقول متى ينعكس.
 *
 * والمدى هنا ثابت معلوم (0..100) لا يحتاج تطبيعاً ديناميكياً — بعكس MACD — فالتعيين
 * هو نفسه الذي تستعمله خطوط العتبات بـ`paneGuides.ts` حرفياً:
 *     top = ((max − v) / (max − min)) × innerH
 * فيقع خطّ %K عند 80 على خطّ العتبة 80 بالضبط لا بجواره.
 *
 * وأُضيف القصّ: الرسم السابق كان `marginTop` بلا حدّ، فقيمة 0 (قاع المدى) تضع خطاً
 * بسماكة 3px يبدأ عند `innerH` أي يخرج كلّه أسفل مساحة الرسم فوق اللوحة التالية.
 */

/** ارتفاع الحافة المحجوزة أعلى/أسفل مساحة الرسم داخل اللوحة (نفس ثابت بقية اللوحات). */
const PANE_PAD = 16;

/** سماكة خطّ %K و%D. رقمان لا عمود: المتداول يتابع تقاطعهما لا مساحتهما. */
export const STOCH_LINE_H = 2;

export interface StochPaneGeom {
  /** ارتفاع مساحة الرسم داخل اللوحة. */
  innerH: number;
  /**
   * موضع (top) خطّ بسماكة `STOCH_LINE_H` يمثّل القيمة `v`، مقصوصاً كاملاً داخل مساحة
   * الرسم. يعيد null للقيم غير الصالحة (null / NaN / Infinity) فلا يُرسم شيء.
   */
  y: (v: number | null | undefined) => number | null;
}

const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * يبني هندسة اللوحة من ارتفاعها ومدى المؤشّر.
 * `paneH` الصغير جداً (أو السالب أو NaN) يعطي `innerH = 0` وكل المواضع صفراً — بلا NaN.
 * مدى غير صالح (`max <= min`) يعيد كل القيم إلى الأعلى بدل قسمة على صفر.
 */
export function stochPaneGeom(paneH: number, min = 0, max = 100): StochPaneGeom {
  const innerH = Math.max(0, (Number.isFinite(paneH) ? paneH : 0) - PANE_PAD);
  const span = max - min;
  // أقصى `top` يبقي الخطّ كلّه داخل مساحة الرسم؛ ولا يقلّ عن صفر بلوحة أقصر من الخطّ نفسه.
  const maxTop = Math.max(0, innerH - STOCH_LINE_H);
  return {
    innerH,
    y: (v: number | null | undefined) => {
      if (!finite(v)) return null;
      if (!(span > 0)) return 0;
      return clamp(((max - v) / span) * innerH, 0, maxTop);
    },
  };
}
