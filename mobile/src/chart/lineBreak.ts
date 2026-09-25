import type { Candle } from '../api';
import type { SyntheticBar } from './types';

/** عدد الخطوط التي يجب كسر طرفها للانعكاس — افتراضي TradingView «Line Break» (3). */
export const LINE_BREAK_COUNT = 3;

/**
 * Line Break (Three Line Break) من الإغلاقات كـTradingView:
 * - خطّ جديد بالاتجاه نفسه حين يتجاوز الإغلاق طرف آخر خطّ (أعلاه للصاعد، أدناه للهابط)، يبدأ من ذلك الطرف.
 * - انعكاس حين يكسر الإغلاق طرف آخر `count` خطوط (أو كلها إن كانت أقلّ)، ويبدأ الخطّ من **أصل** آخر خطّ
 *   (أدنى الصاعد / أعلى الهابط) كما يُرسم بالكتب والمنصّات — فالخطّان المتعاكسان يتلاصقان بلا فجوة.
 * - إغلاق بين الحدّين لا يرسم شيئاً (الفوليوم يتراكم للخطّ التالي).
 * الخطّ بلا ذيول (أعلى/أدنى = طرفا الجسم). `time` مختلَق (+60 ث لكل خطّ كـRenko/Range) لأن الخطوط ليست زمناً،
 * و`srcTime` زمن الشمعة التي أغلقته — ما تُرسى عليه الرسومات والتقاطع (`drawingAnchors.ts`).
 * البداية: خطّ من افتتاح أول شمعة إلى أول إغلاق يختلف عنه.
 */
export function lineBreak(candles: Candle[], count = LINE_BREAK_COUNT): Candle[] {
  if (candles.length < 2) return candles;
  const n = Math.max(1, Math.floor(count));
  const out: SyntheticBar[] = [];
  let t = candles[0]!.time;
  let vol = 0;
  const push = (open: number, close: number, c: Candle) => {
    out.push({
      time: t,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      volume: vol,
      srcTime: c.time,
    });
    t += 60;
    vol = 0;
  };
  for (const c of candles) {
    vol += c.volume ?? 0;
    const close = c.close;
    if (!Number.isFinite(close)) continue;
    const last = out[out.length - 1];
    if (!last) {
      const open = candles[0]!.open;
      if (Number.isFinite(open) && close !== open) push(open, close, c);
      continue;
    }
    const up = last.close > last.open;
    const recent = out.slice(-n);
    if (up) {
      if (close > last.close) push(last.close, close, c);
      else if (close < Math.min(...recent.map((b) => b.low))) push(last.open, close, c);
    } else {
      if (close < last.close) push(last.close, close, c);
      else if (close > Math.max(...recent.map((b) => b.high))) push(last.open, close, c);
    }
  }
  // لا خطّ إطلاقاً (سعر مسطّح) ⇒ الشموع كما هي كي لا يفرغ الشارت.
  return out.length ? out : candles;
}
