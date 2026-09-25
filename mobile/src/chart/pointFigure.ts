import type { Candle } from '../api';
import type { SyntheticBar } from './types';
import { renkoAtrBox } from './renko';

/**
 * Point & Figure columns as synthetic candles (X = bull brick, O = bear).
 * الصندوق الافتراضي كـTradingView: ATR(14) على آخر شمعة مغلقة، والانعكاس 3 صناديق. كان نصف متوسط مدى
 * الشمعة للتاريخ كلّه ⇒ صندوق أصغر بكثير (ضجيج أعمدة) ويتغيّر مع كل تيك حيّ.
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

  const pushBrick = (dir: 1 | -1) => {
    const open = level * box;
    level += dir;
    const close = level * box;
    out.push({
      time: t,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 1,
      srcTime: src,
    });
    t += 60;
  };
  // عدد الصناديق التي يغطّيها الإغلاق فوق/تحت المستوى الحالي (هامش 1e-9 يمتصّ خطأ القسمة العشرية).
  const upBoxes = (px: number) => Math.floor(px / box + 1e-9) - level;
  const downBoxes = (px: number) => level - Math.ceil(px / box - 1e-9);

  for (const c of candles) {
    src = c.time;
    const px = c.close;
    if (direction === 0) {
      if (upBoxes(px) >= 1) {
        direction = 1;
        for (let n = upBoxes(px); n > 0; n--) pushBrick(1);
      } else if (downBoxes(px) >= 1) {
        direction = -1;
        for (let n = downBoxes(px); n > 0; n--) pushBrick(-1);
      }
      continue;
    }

    if (direction === 1) {
      for (let n = upBoxes(px); n > 0; n--) pushBrick(1);
      if (downBoxes(px) >= reversal) {
        direction = -1;
        for (let n = downBoxes(px); n > 0; n--) pushBrick(-1);
      }
    } else {
      for (let n = downBoxes(px); n > 0; n--) pushBrick(-1);
      if (upBoxes(px) >= reversal) {
        direction = 1;
        for (let n = upBoxes(px); n > 0; n--) pushBrick(1);
      }
    }
  }

  return out.length ? out : candles;
}
