/** أدوات عامة (تنسيق السعر، تحويل الشموع) — لا علاقة مباشرة بعائلة مؤشرات معينة. */
import type { Candle } from '../../api';
import { chartPipSpec } from '../pipSpec';


/**
 * منازل السعر العشرية حسب الأداة لا حسب حجم الرقم: pip + خانة كسرية (pipette) كما يعرضها وسطاء الـ5 منازل —
 * EURUSD 1.08505 (5)، USDJPY/GBPJPY 157.423 (3)، XAUUSD 2650.35 (2)، XAGUSD 31.245 (3). null = أداة غير معروفة
 * (مؤشرات، عملات رقمية…) فيُستخدم التقدير من حجم الرقم. DXY ثلاث منازل.
 */
export function symbolPriceDecimals(symbol: string): number | null {
  const spec = chartPipSpec(symbol);
  if (!spec) {
    // مؤشّر الدولار يُسعَّر بثلاث منازل (104.235) — وهو رمز افتراضي بالرباعي ومرجع أخبار الدولار.
    // التقدير من حجم الرقم (≥100 ⇒ منزلتان) كان يقصّ خانته الأخيرة بالرأس والمحور والتقاطع.
    // أسماء الوسطاء كـ`marketHours` `DXY_RE`: USDINDEX (XM/Exness)، DXY.f، ولاحقة/بادئة منصّة (TVC:DXY) —
    // المطابقة التامّة لـDXY/USDX وحدهما كانت تطبع 104.24 لهذه كلها.
    const bare = symbol.trim().toUpperCase().replace(/^[A-Z0-9_]+:/, '').replace(/[^A-Z]/g, '');
    if (/^(DXY|USDX|USDINDEX)/.test(bare)) return 3;
    // النفط (WTI/برنت وأسماء الوسطاء: XTIUSD، SpotCrude، USOIL.m…) بثلاث منازل ثابتة: التقدير من حجم السعر
    // كان يقلبها عند عبور 100$ من 3 إلى 2 ⇒ خطّ محفوظ عند 99.953 يُطبع «99.95» والمحور والتقاطع يفقدان خانة.
    if (/^(USOIL|UKOIL|USCRUDE|UKBRENT|WTI|BRENT|XTI|XBR|SPOTCRUDE|SPOTBRENT|CLOIL|CRUDE)/.test(bare)) return 3;
    // الغاز الطبيعي (XNGUSD، NATGAS، NGAS، USNG) يُسعَّر بثلاث منازل (2.500) — بلا هذا كان التقدير من الحجم يطبع
    // «2.50000» بالمحور والتقاطع والقياس (‎+0.01500‎).
    if (/^(XNG|NATGAS|NGAS|USNG)/.test(bare)) return 3;
    // الفورنت مسعَّر بثلاث منازل عند وسطاء MT4/MT5 (USDHUF 350.123، EURHUF 395.456). بلا مواصفة pip
    // (الحاسبة لا تدعم HUF عمداً) فكان التقدير من الحجم (≥100 ⇒ منزلتان) يقصّ خانته بالمحور والتقاطع والرأس.
    return /^[A-Z]{3}HUF/.test(bare) ? 3 : null;
  }
  return Math.round(-Math.log10(spec.pipSize)) + 1;
}

/**
 * `symbol` اختياري: بدونه تُقدَّر المنازل من حجم الرقم — وهذا كان يقصّ خانة الين (157.423 → 157.42).
 *
 * `ref` (سعر الأداة الجاري) لأداة بلا منازل معروفة (النفط، الغاز، المؤشرات): المنازل من حجم **السعر** لا
 * حجم كل رقم، وإلا تقلّبت عند حدَّي 10 و100 — نفط حول 100 كان محوره «99.800» فوق «100.20» وقاعه «99.650»
 * بجانب قمّة «100.45»، والغاز حول 10 «9.98500» بجانب «10.015». المنازل خاصيّة الأداة كـTradingView.
 */
export function formatPrice(n: number, symbol?: string, ref?: number | null) {
  const d = symbol ? symbolPriceDecimals(symbol) : null;
  const m = ref != null && Number.isFinite(ref) && ref > 0 ? ref : n;
  const text = n.toFixed(d ?? magnitudeDecimals(m));
  // `toFixed` يُبقي الإشارة لسالب يُقرَّب لصفر: خطّ صفر مذبذب أو فرق ~−1e-17 كان «−0.00000».
  return /^-[0.]+$/.test(text) ? text.slice(1) : text;
}

/**
 * منازل أداة بلا مواصفة من حجم سعرها. تحت 0.01 تُضمن أربعة أرقام معنوية على الأقل: بخمس منازل ثابتة كان
 * SHIBUSD (0.00001234) يُطبع «0.00001» بكل المحور والتقاطع والرأس — كل علامات المحور الرقم نفسه، ولا حركة
 * تُقرأ. PEPE (0.0000089) كان «0.00001» والتقاطع يلتصق بصفر. سقف 20 منزلة (`toFixed` يقبل حتى 100): سقف 10
 * كان يطبع 1.23e-9 «0.0000000012» — رقمان معنويان فقط (tools63). `m` موجب أو صفر/غير منتهٍ ⇒ 5 كالسابق.
 */
export function magnitudeDecimals(m: number): number {
  const a = Math.abs(m);
  if (a >= 100) return 2;
  if (a >= 10) return 3;
  if (!(a > 0) || !Number.isFinite(a) || a >= 0.01) return 5;
  // 1e-12 يمتصّ خطأ log10 عند القوى العشرية (log10(0.001) قد يخرج −2.9999…).
  return Math.min(20, Math.max(5, Math.floor(-Math.log10(a) + 1e-12) + 4));
}

/**
 * مرجع منازل ثابت للجلسة لأداة بلا مواصفة: `formatPrice` يقدّرها من `ref`، و`series.last` مرجعاً كان يقلبها عند
 * عبور 10/100 — LTCUSD من 99.98 إلى 100.01 ⇒ المحور والتقاطع والوسوم كلها من 3 منازل إلى 2 (خطّ محفوظ 99.954
 * يُقرأ «99.95») ثم ترتدّ مع أوّل تيك تحت 100. يبقى المرجع السابق ما دام السعر الجديد ضمن ×3 منه (تذبذب حول
 * حدّ لا يقلب شيئاً)؛ خارجها (رمز آخر، سلسلة أولى بعد فراغ، حركة حقيقية بحجم عقد) يُعتمد الجديد. `next` غير
 * صالح ⇒ يبقى السابق.
 */
export function stickyPriceRef(prev: number | null | undefined, next: number | null | undefined): number | null {
  const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v) && v > 0;
  if (!ok(next)) return ok(prev) ? prev : null;
  if (ok(prev) && next <= prev * 3 && next >= prev / 3) return prev;
  return next;
}

/**
 * فرق سعرَين بمنازل **السعر** لا بحجم الفرق: لأداة بلا منازل معروفة (US30، BTCUSD، النفط) كان `formatPrice(diff)`
 * يقدّرها من الفرق نفسه — رقم صغير دائماً — فوقف 35 نقطة على US30 يُكتب «35.400» وحركة 0.8 «0.80000».
 * `ref` السعر المرجعي (أحد الطرفين). كمّية بلا إشارة. `priceRef` مرجع منازل الشارت (`formatPrice`) إن
 * كان غير `ref`: قياس غاز من 9.985 والمحور بثلاث منازل (سعره 10.02) كان «+0.03000».
 */
export function formatPriceDiff(diff: number, ref: number, symbol?: string, priceRef?: number | null): string {
  const priceText = formatPrice(Math.abs(ref), symbol, priceRef);
  const dp = priceText.includes('.') ? priceText.length - priceText.indexOf('.') - 1 : 0;
  return Math.abs(diff).toFixed(dp);
}

export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevClose = candles[0]?.close ?? 0;
  let prevOpen = candles[0]?.open ?? 0;
  for (const c of candles) {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
    prevOpen = haOpen;
    prevClose = haClose;
  }
  return out;
}
