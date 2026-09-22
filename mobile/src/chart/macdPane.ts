/**
 * هندسة لوحة MACD — دالة خالصة مفصولة عن الرسم ليمكن اختبارها عددياً.
 *
 * سبب وجود الملف: مقياس الهيستوغرام كان ثابتاً بالشيفرة `Math.abs(v) * 8000`، وهو رقم
 * معايَر على زوج بمقياس سعر واحد فقط. عملياً بتطبيق فوركس:
 * - EURUSD: الهيستوغرام بحدود 0.0002 → ‎1.6px‎ — لا يكاد يُرى.
 * - USDJPY: بحدود 0.05 → ‎400px‎ — يُقصّ لكامل الارتفاع دائماً.
 * - XAUUSD (الذهب، الأكثر تداولاً عند الأفراد): بحدود 2 → ‎16000px‎ — كتلة مصمتة أبداً.
 * فالمقياس صار من مدى البيانات نفسها بالنافذة المعروضة، لا من رقم ثابت.
 *
 * كذلك: خطّ MACD وخطّ الإشارة كانا يُحسبان بـ`computeMacd` ولا يُرسمان إطلاقاً — والتقاطع
 * بينهما هو كل ما يستعمله المتداول الفردي من هذا المؤشر. وأُضيف خطّ الصفر.
 *
 * ملاحظة صلاحية مقصودة: `signal` = ema(macdLine بعد تعويض null بصفر, 9)، فهو يحمل قيماً
 * غير حقيقية عند الشموع الأولى (المبنية على الأصفار) قبل أن يبدأ `macdLine` أصلاً. لذلك
 * فهرس الشمعة صالح **فقط** إذا كان `macdLine[i] != null` — وهو ما يحكم الرسم والمقياس معاً،
 * وإلا طغت قيم وهمية على مدى المقياس فسحقت الرسم الحقيقي.
 */

/** ارتفاع الحافة المحجوزة أعلى/أسفل مساحة الرسم داخل اللوحة (نفس ثابت بقية اللوحات). */
const PANE_PAD = 16;

export interface MacdPaneGeom {
  /** ارتفاع مساحة الرسم داخل اللوحة. */
  innerH: number;
  /** موضع خطّ الصفر (y) داخل مساحة الرسم. */
  zeroY: number;
  /** أكبر قيمة مطلقة بين الهيستوغرام والخطّين عند الفهارس الصالحة (بحدّ أدنى يمنع القسمة على صفر). */
  maxAbs: number;
  /** هل الفهرس صالح للرسم (macdLine غير null عنده). */
  valid: (i: number) => boolean;
  /** موضع (y) قيمة على المقياس — مقصوص داخل مساحة الرسم. */
  y: (v: number) => number;
  /** ارتفاع عمود الهيستوغرام لقيمة (لا يتجاوز نصف مساحة الرسم). */
  barH: (v: number) => number;
}

const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * يبني هندسة اللوحة من السلاسل الثلاث وارتفاع اللوحة.
 * `paneH` الصغير جداً (أو السالب) يعطي `innerH = 0` وكل المواضع صفراً — بلا NaN.
 */
export function macdPaneGeom(
  hist: readonly (number | null)[],
  macdLine: readonly (number | null)[],
  signal: readonly (number | null)[],
  paneH: number
): MacdPaneGeom {
  const innerH = Math.max(0, (Number.isFinite(paneH) ? paneH : 0) - PANE_PAD);
  const zeroY = innerH / 2;
  const half = innerH / 2;

  let maxAbs = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (!finite(macdLine[i])) continue;
    const m = macdLine[i] as number;
    if (Math.abs(m) > maxAbs) maxAbs = Math.abs(m);
    const h = hist[i];
    if (finite(h) && Math.abs(h) > maxAbs) maxAbs = Math.abs(h);
    const s = signal[i];
    if (finite(s) && Math.abs(s) > maxAbs) maxAbs = Math.abs(s);
  }
  if (!(maxAbs > 0)) maxAbs = 1e-9;

  return {
    innerH,
    zeroY,
    maxAbs,
    valid: (i: number) => finite(macdLine[i]),
    y: (v: number) => (finite(v) ? clamp(zeroY - (v / maxAbs) * half, 0, innerH) : zeroY),
    barH: (v: number) => (finite(v) ? clamp((Math.abs(v) / maxAbs) * half, 0, half) : 0),
  };
}
