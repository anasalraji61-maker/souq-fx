import type { Candle } from '../api';

function avgRange(candles: Candle[]): number {
  if (candles.length < 2) return 1e-8;
  const sum = candles.reduce((a, c) => a + (c.high - c.low), 0);
  return Math.max(sum / candles.length, 1e-8);
}

/**
 * Range bars — كل شمعة تمثّل مدى سعري ثابت وليس فترة زمنية ثابتة كباقي الأطر: تُغلق الشمعة
 * الحالية ويبدأ سطر جديد فور أن يتجاوز مدى (أعلى − أدنى) التراكمي منذ فتحها قيمة box، بعكس
 * Renko الذي يقفز بمسافة صندوق ثابتة من الفتح بلا فتيل حقيقي — Range يحافظ على أعلى/أدنى
 * فعليين (فتيل حقيقي) داخل كل شمعة، والفوليوم يتراكم من كل الشموع الأصلية داخل الشمعة الواحدة.
 */
export function rangeBars(candles: Candle[], boxSize?: number): Candle[] {
  if (candles.length < 2) return candles;
  const box = boxSize ?? avgRange(candles) * 1.5;
  const out: Candle[] = [];
  let open = candles[0].open;
  let high = candles[0].high;
  let low = candles[0].low;
  let close = candles[0].close;
  let vol = candles[0].volume ?? 0;
  let t = candles[0].time;
  /** شموع أصلية دخلت الشمعة الجارية منذ آخر إغلاق — غير صفر ⇒ شمعة تتكوّن. */
  let pending = 1;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    high = Math.max(high, c.high);
    low = Math.min(low, c.low);
    close = c.close;
    vol += c.volume ?? 0;
    pending += 1;
    if (high - low >= box) {
      out.push({ time: t, open, high, low, close, volume: vol });
      open = close;
      high = close;
      low = close;
      vol = 0;
      t = c.time;
      pending = 0;
    }
  }
  // الشمعة التي تتكوّن (لم تبلغ الصندوق بعد) كـTradingView: كانت تُرمى فيقف الشارت عند آخر شمعة مغلقة
  // بينما وسم السعر الحيّ يطبع سعراً أبعد، والتقاطع وصندوق الشراء/البيع لا يريان الحركة الجارية.
  if (out.length && pending > 0) out.push({ time: t, open, high, low, close, volume: vol });

  return out.length ? out : candles;
}
