import type { Candle } from '../api';
import type { SyntheticBar } from './types';

/**
 * متوسط مدى الشموع **المغلقة** — الشمعة الحيّة (الأخيرة) خارجه: مداها يكبر مع كل تيك فكان الصندوق يتغيّر
 * ومعه كل شموع Range تُعاد تقسيماً تحت إصبع المتداول (كما أُصلح بـRenko).
 */
function avgRange(candles: Candle[]): number {
  if (candles.length < 2) return 1e-8;
  const closed = candles.length >= 3 ? candles.slice(0, -1) : candles;
  const sum = closed.reduce((a, c) => a + (c.high - c.low), 0);
  return Math.max(sum / closed.length, 1e-8);
}

/**
 * Range bars كـTradingView: **كل شمعة مغلقة بمدى الصندوق بالضبط** (أعلى − أدنى = box) وتُغلق عند طرفها،
 * والتالية تفتح من إغلاقها. كانت الشمعة تُغلق حين يتجاوز مداها التراكمي الصندوق فتحمل التجاوز كلّه:
 * شمعة خبر بثلاثة صناديق = شمعة Range واحدة بثلاثة أضعاف الطول — وتساوي الأطوال هو ما يُقرأ في Range.
 * مسار السعر داخل الشمعة الأصلية تقريبٌ معتاد: صاعدة فتح→أدنى→أعلى→إغلاق، هابطة فتح→أعلى→أدنى→إغلاق،
 * فحركة بعدّة صناديق تولّد عدّة شموع. `time` مختلَق (+60 ث لكل شمعة، كـRenko) لأن شمعة أصلية واحدة قد
 * تعطي عدّة شموع، و`srcTime` زمن الشمعة الأصلية التي فتحتها.
 */
export function rangeBars(candles: Candle[], boxSize?: number): Candle[] {
  if (candles.length < 2) return candles;
  const box = boxSize ?? avgRange(candles) * 1.5;
  const out: SyntheticBar[] = [];
  let open = candles[0].open;
  let high = open;
  let low = open;
  let cur = open;
  let vol = 0;
  let t = candles[0].time;
  let src = candles[0].time;

  const close = (at: number, c: Candle) => {
    out.push({ time: t, open, high: Math.max(high, at), low: Math.min(low, at), close: at, volume: vol, srcTime: src });
    t += 60;
    src = c.time;
    open = high = low = cur = at;
    vol = 0;
  };
  // يحرّك السعر إلى `target` ويغلق شمعة كلما بلغ المدى الصندوق (هامش 1e-9 من الصندوق لخطأ الجمع العشري).
  const moveTo = (target: number, c: Candle) => {
    const eps = box * 1e-9;
    for (let guard = 0; guard < 100000; guard++) {
      if (target > cur && target >= low + box - eps) close(low + box, c);
      else if (target < cur && target <= high - box + eps) close(high - box, c);
      else break;
    }
    high = Math.max(high, target);
    low = Math.min(low, target);
    cur = target;
  };

  for (const c of candles) {
    const bull = c.close >= c.open;
    for (const p of bull ? [c.open, c.low, c.high, c.close] : [c.open, c.high, c.low, c.close]) moveTo(p, c);
    vol += c.volume ?? 0;
  }
  // الشمعة التي تتكوّن (تحرّك السعر منذ فتحها ولم يبلغ الصندوق) كـTradingView: كانت تُرمى فيقف الشارت عند آخر شمعة مغلقة
  // بينما وسم السعر الحيّ يطبع سعراً أبعد، والتقاطع وصندوق الشراء/البيع لا يريان الحركة الجارية.
  if (out.length && high > low) out.push({ time: t, open, high, low, close: cur, volume: vol, srcTime: src });

  return out.length ? out : candles;
}
