/**
 * سُمك ونمط خطوط الرسم (ترند، شعاع، أفقي، شعاع أفقي، رأسي) — كان اللون وحده قابلاً للتغيير، فدعمٌ رئيسي
 * ومستوى ثانوي بالسُمك نفسه لا يُفرَّق بينهما بنظرة، والمتقطّع ثابت للأفقي والرأسي وحدهما.
 *
 * الغياب = افتراضي الأداة كما كانت تُرسم (فالرسوم المحفوظة القديمة لا تتغيّر حرفاً)، والعودة للافتراضي
 * تحذف المفتاح لا تكتبه — كالسهم والقفل (`drawEdit.ts`). خالص: يُفحص بـ`lineStyle.selftest.ts`.
 */
import type { Drawing } from './types';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

/** بترتيب `tr.mcLineStyleNames`. */
export const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted'];
/** بالبكسل، والنقر يدور عليها. */
export const LINE_WIDTHS: readonly number[] = [1, 2, 3, 4];
/** زيادة السُمك للرسم المحدَّد أو تحت الفأرة — كانت 1⇒2.5 و2⇒3.5 قبل أن يصير السُمك قابلاً للتغيير. */
export const LINE_BOLD_EXTRA = 1.5;

type LineTool = 'trend' | 'ray' | 'hline' | 'hray' | 'vline';
const LINE_TOOLS: readonly Drawing['tool'][] = ['trend', 'ray', 'hline', 'hray', 'vline'];

export function hasLineStyle(tool: Drawing['tool']): tool is LineTool {
  return LINE_TOOLS.includes(tool);
}

/** كما كانت تُرسم: الترند والشعاع 2px متّصلان؛ الأفقي والرأسي 1px متقطّعان؛ الشعاع الأفقي 1px متّصل (لا يُخلط بالأفقي). */
export function defaultLineWidth(tool: Drawing['tool']): number {
  return tool === 'trend' || tool === 'ray' ? 2 : 1;
}

export function defaultLineStyle(tool: Drawing['tool']): LineStyle {
  return tool === 'hline' || tool === 'vline' ? 'dashed' : 'solid';
}

export function drawingLineWidth(d: Pick<Drawing, 'tool' | 'lineWidth'>): number {
  const w = d.lineWidth;
  return typeof w === 'number' && LINE_WIDTHS.includes(w) ? w : defaultLineWidth(d.tool);
}

export function drawingLineStyle(d: Pick<Drawing, 'tool' | 'lineStyle'>): LineStyle {
  const s = d.lineStyle;
  return s && LINE_STYLES.includes(s) ? s : defaultLineStyle(d.tool);
}

function nextOf<T>(list: readonly T[], cur: T): T {
  const i = list.indexOf(cur);
  return list[(i + 1) % list.length]!;
}

export function nextLineWidth(d: Pick<Drawing, 'tool' | 'lineWidth'>): number {
  return nextOf(LINE_WIDTHS, drawingLineWidth(d));
}

export function nextLineStyle(d: Pick<Drawing, 'tool' | 'lineStyle'>): LineStyle {
  return nextOf(LINE_STYLES, drawingLineStyle(d));
}

/** السُمك التالي بالدورة؛ مساوٍ للافتراضي ⇒ يُحذف المفتاح. غير الخطوط لا تتغيّر. */
export function withNextLineWidth(d: Drawing): Drawing {
  if (!hasLineStyle(d.tool)) return d;
  const w = nextLineWidth(d);
  const { lineWidth: _drop, ...rest } = d;
  return w === defaultLineWidth(d.tool) ? rest : { ...rest, lineWidth: w };
}

export function withNextLineStyle(d: Drawing): Drawing {
  if (!hasLineStyle(d.tool)) return d;
  const s = nextLineStyle(d);
  const { lineStyle: _drop, ...rest } = d;
  return s === defaultLineStyle(d.tool) ? rest : { ...rest, lineStyle: s };
}
