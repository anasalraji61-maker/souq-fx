import type { Candle } from '../api';
import type { SyntheticBar } from './types';
import { renkoAtrBox } from './renko';

/**
 * Point & Figure: **شمعة واحدة لكل عمود** كـTradingView (عمود X صاعد، عمود O هابط)، `box` محمول عليها
 * ليرسم الشارت رمزاً لكل صندوق فوق بعضه. كانت شمعة لكل صندوق بخانة زمنية خاصة ⇒ عمود من خمسة X يُرسم
 * درجاً مائلاً من خمس خانات لا عموداً، فلا يُقرأ «كم صندوقاً صعد» ولا مستوى الانعكاس.
 * `open` مستوى ما قبل أوّل صندوق و`close` مستوى آخره: الرموز على المستويات ‎open ± box … close‎ ⇒ عمود O
 * يبدأ صندوقاً تحت قمّة X السابق (الاصطلاح الكلاسيكي) بلا ترتيب خاص. `srcTime` زمن الشمعة التي فتحت العمود
 * (الإرساء «عند أو قبل» يضع وقتاً داخل العمود عليه لا على سابقه).
 * الصندوق الافتراضي كـTradingView: ATR(14) على آخر شمعة مغلقة، والانعكاس 3 صناديق.
 */
export function pointFigure(candles: Candle[], boxSize?: number, reversal = 3): SyntheticBar[] {
  if (candles.length < 3) return candles;
  const box = boxSize ?? renkoAtrBox(candles);
  const out: SyntheticBar[] = [];
  // شبكة صناديق ثابتة (مضاعفات الصندوق) كـTradingView: العمود يبدأ من أقرب مستوى تحت الإغلاق الأول لا من
  // الإغلاق نفسه ⇒ حدود الأعمدة أرقام مستديرة تطابق ما يقرؤه المتداول هناك. والعدّ بفهرس صحيح لا بجمع
  // ‎+box‎ متكرّر ⇒ لا انجراف عشري بعد مئات الصناديق.
  let level = Math.floor(candles[0].close / box + 1e-9);
  let direction: 1 | -1 | 0 = 0;
  let t = candles[0].time;
  let src = candles[0].time;
  let col: SyntheticBar | null = null;

  // يمدّ العمود الحالي `n` صندوقاً باتجاهه، أو يفتح عموداً جديداً إن تغيّر الاتجاه.
  const extend = (dir: 1 | -1, n: number) => {
    if (n <= 0) return;
    if (!col || direction !== dir) {
      if (col) t += 60;
      direction = dir;
      col = { time: t, open: level * box, high: level * box, low: level * box, close: level * box, volume: 0, srcTime: src, box };
      out.push(col);
    }
    level += dir * n;
    const close = level * box;
    col.close = close;
    col.high = Math.max(col.open, close);
    col.low = Math.min(col.open, close);
  };
  // عدد الصناديق التي يغطّيها الإغلاق فوق/تحت المستوى الحالي (هامش 1e-9 يمتصّ خطأ القسمة العشرية).
  const upBoxes = (px: number) => Math.floor(px / box + 1e-9) - level;
  const downBoxes = (px: number) => level - Math.ceil(px / box - 1e-9);

  // الفوليوم الحقيقي لشموع العمود (كـTradingView) — كان عدد الصناديق ⇒ لوحة الفوليوم ورأسها يطبعان «3»
  // لعمود صعد 3 صناديق. الشمعة التي لا تمدّ ولا تعكس تُحسب للعمود القائم، وما قبل أوّل عمود لأوّله.
  let pendingVol = 0;
  for (const c of candles) {
    src = c.time;
    const px = c.close;
    pendingVol += c.volume != null && Number.isFinite(c.volume) ? c.volume : 0;
    if (direction === 0) {
      if (upBoxes(px) >= 1) extend(1, upBoxes(px));
      else if (downBoxes(px) >= 1) extend(-1, downBoxes(px));
    } else if (direction === 1) {
      if (upBoxes(px) >= 1) extend(1, upBoxes(px));
      else if (downBoxes(px) >= reversal) extend(-1, downBoxes(px));
    } else {
      if (downBoxes(px) >= 1) extend(-1, downBoxes(px));
      else if (upBoxes(px) >= reversal) extend(1, upBoxes(px));
    }
    const cur = out[out.length - 1];
    if (cur) {
      cur.volume = (cur.volume ?? 0) + pendingVol;
      pendingVol = 0;
    }
  }

  return out.length ? out : candles;
}
