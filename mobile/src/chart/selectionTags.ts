/**
 * وسوم الرسم المحدَّد على محور السعر — كما يُبرز TradingView أسعار طرفَي الرسم المحدَّد على المقياس.
 *
 * قبلها: سحب طرف ترند أو وقف «خطة شراء» إلى مستوى بعينه يعني التخمين بالعين أو جرّ التقاطع إلى
 * الطرف بعد تركه. الآن سعر كل طرف ظاهر على المحور بلون الرسم ويتبع الإصبع أثناء السحب. خالصة بلا
 * React، فتُفحص بـ`selectionTags.selftest.ts`.
 */
import { boxesTouch } from './axisTicks';
import { channelLinePrices } from './channel';
import { signedDistanceText } from './measureReadout';
import { positionLevels, isPositionTool } from './positionTool';
import type { Drawing } from './types';

/** `now`: سعر خطّ الترند/الشعاع عند الشمعة الحيّة — يُرسم مفرَّغاً بلون الرسم لا مصمتاً كطرفيه. */
export type SelectionTagTone = 'line' | 'bull' | 'bear' | 'now';
export type SelectionTag = { price: number; tone: SelectionTagTone; top: number };

/**
 * أسعار الرسم على المحور: الخطّ الأفقي سعره، ذو الطرفين طرفاه (مرّة واحدة إن تساويا)، وخطّة
 * الشراء/البيع دخولها ووقفها وهدفها. الخطّ الرأسي والملاحظة بلا سعر يُقرأ ⇒ لا شيء.
 */
export function selectionPrices(
  d: Drawing,
  symbol: string,
  /** فهرس الشمعة الحيّة (آخر شمعة بالسلسلة) — لسعر الترند/الشعاع عندها (`lineValueAt`). */
  nowIndex?: number,
  /** المقياس اللوغاريتمي: الخطّ مستقيم بالبكسل = باللوغاريتم — راجع `lineValueAt`. */
  log = false
): { price: number; tone: SelectionTagTone }[] {
  if (d.tool === 'vline' || d.tool === 'note') return [];
  if (d.tool === 'hline' || !d.b) return [{ price: d.a.price, tone: 'line' }];
  if (isPositionTool(d.tool)) {
    const lv = positionLevels(d.tool, d.a.price, d.b.price, d.rr, symbol);
    return [
      { price: lv.entry, tone: 'line' },
      { price: lv.stop, tone: 'bear' },
      { price: lv.target, tone: 'bull' },
    ];
  }
  const out: { price: number; tone: SelectionTagTone }[] = [{ price: d.a.price, tone: 'line' }];
  if (d.b.price !== d.a.price) out.push({ price: d.b.price, tone: 'line' });
  // القناة: طرفا الموازي أيضاً — حدّها الآخر هو ما يُقرأ للهدف/الوقف.
  if (d.tool === 'channel' && d.width) {
    const par = channelLinePrices(d.a, d.b, d.width, 1, log);
    for (const price of [par.a, par.b]) {
      if (!out.some((o) => o.price === price)) out.push({ price, tone: 'line' });
    }
  }
  if ((d.tool === 'trend' || d.tool === 'ray') && nowIndex != null) {
    const now = lineValueAt(d.a, d.b, nowIndex, d.tool === 'ray', log);
    // عند طرفٍ بالضبط (رُسم على الشمعة الحيّة) ⇒ وسم الطرف يكفي.
    if (now != null && now !== d.a.price && now !== d.b.price) out.push({ price: now, tone: 'now' });
  }
  return out;
}

/**
 * سعر الخطّ المائل عند فهرس شمعة: أين يقع خطّ الترند **الآن** — المستوى الذي ينتظر عنده متداول
 * الارتداد/الكسر أمره أو تنبيهه، وكان يقرؤه بالعين من ميل الخطّ إلى المحور. `null` حين لا يمرّ الخطّ
 * بتلك الشمعة: الترند بين طرفيه فقط، والشعاع من طرفه الأول باتّجاه الثاني بلا نهاية (شعاع رُسم نحو
 * اليسار لا يبلغ الشمعة الحيّة)؛ خطّ رأسي (طرفان على شمعة واحدة)؛ أو سعر ≤ 0 (شعاع هابط بعيد).
 *
 * `log`: بالمقياس اللوغاريتمي يُرسم الخطّ مستقيماً بالبكسل أي باللوغاريتم، فالاستيفاء باللوغاريتم أيضاً
 * — الخطّي كان يطبع سعراً (ووسماً وبُعد pip) أعلى من الخطّ المرسوم بين طرفين متباعدين (الذهب، اليومي).
 * لا يُرفض الاستقراء خلف الطرف الأوّل حين `back` (سعر تنبيه الترند يُستقرأ حيث وقعت الشمعة الحالية).
 */
export function lineValueAt(
  a: { index: number; price: number },
  b: { index: number; price: number },
  index: number,
  ray: boolean,
  log = false,
  back = false
): number | null {
  const span = b.index - a.index;
  if (!Number.isFinite(index) || !Number.isFinite(span) || span === 0) return null;
  const t = (index - a.index) / span;
  if ((t < 0 && !back) || (!ray && t > 1)) return null;
  const price =
    log && a.price > 0 && b.price > 0
      ? Math.exp(Math.log(a.price) + (Math.log(b.price) - Math.log(a.price)) * t)
      : a.price + (b.price - a.price) * t;
  return Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * «1.08520 · −6.2 pip»: أين يقع الترند/الشعاع المحدَّد عند الشمعة الحيّة وكم يبعد السعر عنه — نصّ
 * وسم الهاتف وسطر القراءة. وسم المحور يعطي السعر وحده، والمتداول ينتظر الكسر/الارتداد فيسأل «كم
 * بقي؟». الإشارة كالخطّ الأفقي: من السعر إلى الخطّ (+ الخطّ فوقه، − تحته). `null` لغير الترند/الشعاع
 * أو لخطّ لا يبلغ الشمعة الحيّة. أداة بلا مواصفة pip (US30، BTCUSD، DXY) ⇒ فرق السعر مكان النقاط
 * («39100.00 · +100.00») كوسم الخطّ الأفقي — كان `null` فيختفي سعر الخطّ وبُعده معاً.
 */
export function lineNowText(
  d: Drawing,
  nowIndex: number,
  livePrice: number,
  symbol: string,
  fmt: (price: number) => string,
  lang?: string,
  log = false,
  /** مرجع منازل الأداة بلا مواصفة (`formatPriceDiff`) — آخر سعر بالسلسلة كبقية وسوم البُعد. */
  priceRef?: number | null
): string | null {
  if ((d.tool !== 'trend' && d.tool !== 'ray') || !d.b || !Number.isFinite(livePrice)) return null;
  const now = lineValueAt(d.a, d.b, nowIndex, d.tool === 'ray', log);
  if (now == null) return null;
  const dist = signedDistanceText(symbol, livePrice, now, lang, priceRef);
  return dist ? `${fmt(now)} · ${dist}` : null;
}

/**
 * مواضع الوسوم على المحور. سعر خارج المدى المرئيّ ⇒ لا وسم (وسم مقصوص للحافّة يكذب بموضعه).
 * وسم يلامس وسماً محجوزاً (`reserved`: السعر الحيّ) أو وسماً قبله ⇒ يُسقط — السعر الحيّ أهمّ،
 * وطرفان متلاصقان يُقرأ أحدهما عن الاثنين.
 */
export function placeSelectionTags(
  prices: readonly { price: number; tone: SelectionTagTone }[],
  yOf: (price: number) => number,
  plotH: number,
  tagH: number,
  reserved: readonly { top: number; h: number }[]
): SelectionTag[] {
  const out: SelectionTag[] = [];
  for (const p of prices) {
    const y = yOf(p.price);
    if (!Number.isFinite(y) || y < 0 || y > plotH) continue;
    const top = Math.max(0, Math.min(plotH - tagH - 2, y - tagH / 2));
    if (reserved.some((r) => boxesTouch(top, tagH, r.top, r.h, 0))) continue;
    if (out.some((t) => boxesTouch(top, tagH, t.top, tagH, 0))) continue;
    out.push({ ...p, top });
  }
  return out;
}
