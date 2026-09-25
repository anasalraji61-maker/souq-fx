/**
 * القناة المتوازية: خطّ أساس (`a`→`b`) وخطّ موازٍ يبعد عنه `width` بوحدة السعر (موجب = فوقه).
 *
 * لماذا فرق سعري لا نقطة ثالثة: الرسومات مشتركة بين الفريمات ومرسوّة بالزمن (`drawingAnchors.ts`)،
 * وفرق السعر لا يتغيّر بتغيّر الفريم فلا يحتاج مرساة ثالثة، ويبقى مع التحريك (`translateDrawing`
 * ينسخ الرسم كما هو). والرسم بإصبع على الهاتف سحبة واحدة لا ثلاث نقرات: عرض القناة يُقدَّر من
 * الشموع بين الطرفين (`fitChannelWidth`)، ثم يُعدَّل بمقبض العرض.
 */

export type ChannelPoint = { index: number; price: number };
export type ChannelBar = { high: number; low: number };

/**
 * عرض القناة المناسب للشموع بين الطرفين: خطّ صاعد يُرسم على القيعان فالموازي على أبعد قمّة فوقه؛
 * وهابط يُرسم على القمم فالموازي على أبعد قاع تحته. ما لا يتجاوز الخطّ من الجهة المقابلة (أو
 * طرفان على شمعة واحدة، أو فهارس خارج السلسلة) ⇒ `fallback` بإشارة الجهة نفسها.
 *
 * @param bars السلسلة كاملة (`a.index`/`b.index` فهارس فيها).
 * @param fallback عرض موجب يُستعمل حين لا تعطي الشموع عرضاً (مثلاً خُمس المدى الظاهر).
 */
export function fitChannelWidth(
  bars: readonly ChannelBar[],
  a: ChannelPoint,
  b: ChannelPoint,
  fallback: number
): number {
  const left = a.index <= b.index ? a : b;
  const right = left === a ? b : a;
  const rising = right.price >= left.price;
  const fb = Math.abs(Number.isFinite(fallback) ? fallback : 0);
  const signed = rising ? fb : -fb;
  const span = right.index - left.index;
  if (!(span > 0)) return signed;
  const from = Math.max(0, Math.ceil(left.index));
  const to = Math.min(bars.length - 1, Math.floor(right.index));
  let best = 0;
  for (let i = from; i <= to; i++) {
    const bar = bars[i];
    if (!bar) continue;
    const line = left.price + ((right.price - left.price) * (i - left.index)) / span;
    const d = rising ? bar.high - line : bar.low - line;
    if (!Number.isFinite(d)) continue;
    if (rising ? d > best : d < best) best = d;
  }
  return best === 0 ? signed : best;
}

/** سعر منتصف الخطّ الموازي — موضع مقبض العرض. */
export function channelHandlePrice(a: ChannelPoint, b: ChannelPoint, width: number): number {
  return (a.price + b.price) / 2 + width;
}

/**
 * سعرا طرفَي خطّ موازٍ للأساس عند `frac` من العرض (1 = الموازي، ½ = الوسط) كما يُرسم.
 *
 * خطّياً: الطرفان + `width × frac`. **باللوغاريتمي** كانت الإزاحة نفسها بالسعر تُرسم أقلّ بكسلاً عند الطرف الأعلى
 * سعراً ⇒ الموازي والوسط غير موازيين للأساس (واضح بالذهب واليومي). المتوازي بالبكسل = نسبة ثابتة بالسعر، فالإزاحة
 * باللوغاريتم ثابتة ومختارة ليمرّ الموازي بمقبض العرض (`channelHandlePrice`) عند منتصف الأساس — فيبقى `width`
 * المحفوظ ومقبضه وعكسه (`channelWidthAt`) كما هي، ولا يتغيّر شيء بالمقياس الخطّي. سعر ≤0 ⇒ الخطّي احتياطاً.
 */
export function channelLinePrices(
  a: ChannelPoint,
  b: ChannelPoint,
  width: number,
  frac = 1,
  log = false
): { a: number; b: number } {
  const handle = channelHandlePrice(a, b, width);
  if (log && a.price > 0 && b.price > 0 && handle > 0) {
    const k = (Math.log(handle) - (Math.log(a.price) + Math.log(b.price)) / 2) * frac;
    const m = Math.exp(k);
    return { a: a.price * m, b: b.price * m };
  }
  return { a: a.price + width * frac, b: b.price + width * frac };
}

/** العرض الذي يضع مقبض العرض عند `price` (عكس `channelHandlePrice`). */
export function channelWidthAt(a: ChannelPoint, b: ChannelPoint, price: number): number {
  return price - (a.price + b.price) / 2;
}
