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
    return /^(DXY|USDX)$/.test(symbol.trim().toUpperCase().replace(/[^A-Z]/g, '')) ? 3 : null;
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
  if (d != null) return n.toFixed(d);
  const m = ref != null && Number.isFinite(ref) && ref > 0 ? ref : n;
  if (m >= 100) return n.toFixed(2);
  if (m >= 10) return n.toFixed(3);
  return n.toFixed(5);
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
