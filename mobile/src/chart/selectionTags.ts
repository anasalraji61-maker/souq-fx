/**
 * وسوم الرسم المحدَّد على محور السعر — كما يُبرز TradingView أسعار طرفَي الرسم المحدَّد على المقياس.
 *
 * قبلها: سحب طرف ترند أو وقف «خطة شراء» إلى مستوى بعينه يعني التخمين بالعين أو جرّ التقاطع إلى
 * الطرف بعد تركه. الآن سعر كل طرف ظاهر على المحور بلون الرسم ويتبع الإصبع أثناء السحب. خالصة بلا
 * React، فتُفحص بـ`selectionTags.selftest.ts`.
 */
import { boxesTouch } from './axisTicks';
import { positionLevels, isPositionTool } from './positionTool';
import type { Drawing } from './types';

export type SelectionTagTone = 'line' | 'bull' | 'bear';
export type SelectionTag = { price: number; tone: SelectionTagTone; top: number };

/**
 * أسعار الرسم على المحور: الخطّ الأفقي سعره، ذو الطرفين طرفاه (مرّة واحدة إن تساويا)، وخطّة
 * الشراء/البيع دخولها ووقفها وهدفها. الخطّ الرأسي والملاحظة بلا سعر يُقرأ ⇒ لا شيء.
 */
export function selectionPrices(d: Drawing, symbol: string): { price: number; tone: SelectionTagTone }[] {
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
  return out;
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
