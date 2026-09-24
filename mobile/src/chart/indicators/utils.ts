/** أدوات عامة (تنسيق السعر، تحويل الشموع) — لا علاقة مباشرة بعائلة مؤشرات معينة. */
import type { Candle } from '../../api';
import { instrumentSpec } from '../../positionSize';


/**
 * منازل السعر العشرية حسب الأداة لا حسب حجم الرقم: pip + خانة كسرية (pipette) كما يعرضها وسطاء الـ5 منازل —
 * EURUSD 1.08505 (5)، USDJPY/GBPJPY 157.423 (3)، XAUUSD 2650.35 (2)، XAGUSD 31.245 (3). null = أداة غير معروفة
 * (مؤشرات، عملات رقمية…) فيُستخدم التقدير من حجم الرقم. DXY ثلاث منازل.
 */
export function symbolPriceDecimals(symbol: string): number | null {
  const spec = instrumentSpec(symbol);
  if (!spec) {
    // مؤشّر الدولار يُسعَّر بثلاث منازل (104.235) — وهو رمز افتراضي بالرباعي ومرجع أخبار الدولار.
    // التقدير من حجم الرقم (≥100 ⇒ منزلتان) كان يقصّ خانته الأخيرة بالرأس والمحور والتقاطع.
    return /^(DXY|USDX)$/.test(symbol.trim().toUpperCase().replace(/[^A-Z]/g, '')) ? 3 : null;
  }
  return Math.round(-Math.log10(spec.pipSize)) + 1;
}

/** `symbol` اختياري: بدونه تُقدَّر المنازل من حجم الرقم — وهذا كان يقصّ خانة الين (157.423 → 157.42). */
export function formatPrice(n: number, symbol?: string) {
  const d = symbol ? symbolPriceDecimals(symbol) : null;
  if (d != null) return n.toFixed(d);
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  return n.toFixed(5);
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
