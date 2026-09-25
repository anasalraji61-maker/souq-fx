import type { Candle } from '../api';
import type { SyntheticBar } from './types';
import { renkoAtrBox } from './renko';

/**
 * Kagi كـTradingView: **شمعة واحدة لكل خطّ عمودي** (من نقطة الانعكاس إلى آخر قمّة/قاع بلغها)، والشارت
 * يصل كل خطّ بسابقه بخطّ أفقي عند `open`. كانت شمعة لكل قمّة جديدة بخانة خاصة ⇒ الصعود الواحد درج مائل
 * من خانات كثيرة لا خطّ واحد.
 * السُّمك بقاعدة Kagi لا باتجاه الخطّ: يصير سميكاً (yang) حين يتجاوز السعر **الكتف** السابق (قمّة آخر خطّ
 * صاعد)، ورفيعاً (yin) حين يكسر **الخصر** السابق (قاع آخر خطّ هابط) — وقد يتبدّل وسط الخطّ (`flipAt`).
 * كان السميك = كل صاعد، فيختفي أهمّ ما يقرؤه متداول Kagi: كسر الكتف/الخصر.
 * الانعكاس الافتراضي كـTradingView: ATR(14) على آخر شمعة مغلقة (مبلغ سعري ثابت). كان ‎0.4%‎ من السعر
 * ⇒ ~44 نقطة على EUR/USD لكل فريم: على 1د/5د لا ينعكس الخط تقريباً، وعلى اليومي ينعكس مع الضجيج.
 * `srcTime` زمن الشمعة التي فتحت الخطّ (كأعمدة P&F).
 */
export function kagi(candles: Candle[], reversalAmount?: number): SyntheticBar[] {
  if (candles.length < 2) return candles;
  const rev = reversalAmount ?? renkoAtrBox(candles);
  const out: SyntheticBar[] = [];
  let direction: 1 | -1 | 0 = 0;
  let extreme = candles[0].close;
  let t = candles[0].time;
  let line: SyntheticBar | null = null;

  const open = (c: Candle, dir: 1 | -1) => {
    if (line) t += 60;
    direction = dir;
    line = { time: t, open: extreme, high: extreme, low: extreme, close: extreme, volume: 0, srcTime: c.time };
    out.push(line);
  };
  const reach = (c: Candle, price: number) => {
    extreme = price;
    const l = line!;
    l.close = price;
    l.high = Math.max(l.open, price);
    l.low = Math.min(l.open, price);
    l.volume = (l.volume ?? 0) + (c.volume ?? 0);
  };

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const price = c.close;
    if (direction === 0) {
      if (price !== extreme) {
        open(c, price > extreme ? 1 : -1);
        reach(c, price);
      }
    } else if (direction === 1) {
      if (price > extreme) reach(c, price);
      else if (price <= extreme - rev) {
        open(c, -1);
        reach(c, price);
      }
    } else if (price < extreme) reach(c, price);
    else if (price >= extreme + rev) {
      open(c, 1);
      reach(c, price);
    }
  }
  if (!out.length) return candles;

  // السُّمك: يبدأ بحسب اتجاه أوّل خطّ، ويتبدّل عند تجاوز كتف/خصر الخطّ المماثل السابق.
  let thick = out[0].close > out[0].open;
  let shoulder: number | null = null;
  let waist: number | null = null;
  for (const b of out) {
    const up = b.close > b.open;
    const ref = up ? shoulder : waist;
    let flipAt: number | undefined;
    if (up && !thick && ref != null && b.close > ref) flipAt = ref;
    else if (!up && thick && ref != null && b.close < ref) flipAt = ref;
    b.kagi = flipAt != null ? { thickAtOpen: thick, flipAt } : { thickAtOpen: thick };
    if (flipAt != null) thick = !thick;
    if (up) shoulder = b.close;
    else waist = b.close;
  }
  return out;
}
