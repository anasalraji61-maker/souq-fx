/**
 * أداتا «شراء/بيع» (مركز طويل/قصير) على الشارت — هندسة خالصة بلا React.
 *
 * ما يفعله المتداول قبل كل صفقة: يضع الدخول، ثم الوقف، ثم الهدف، ويقرأ المسافتين بالنقاط ونسبة
 * العائد للمخاطرة. قبل هذه الأداة كان يرسم ثلاثة خطوط أفقية ويقيس كلّاً منها بأداة القياس ثم يقسم
 * بيده. أداة TradingView المعروفة (Long/Short Position) تفعلها برسمة واحدة.
 *
 * التخزين على `Drawing` الموجود بلا حقل نقطة ثالث (فلا يتغيّر الحفظ ولا الإرساء بين الفريمات):
 * - `a` = الدخول (زمنه يرسي الحافّة اليسرى، وسعره سعر الدخول).
 * - `b` = الوقف (سعره سعر الوقف، وزمنه الحافّة اليمنى للصندوق).
 * - `rr` = نسبة الهدف إلى المخاطرة (الافتراضي 2) — الهدف مشتقّ فيتبع الدخول والوقف حين يُسحبان.
 *
 * الاتجاه من الأداة لا من موضع الإصبع: وقف رُسم بالجهة الخطأ (فوق دخول شراء) يُعكَس لجهته
 * بالمسافة نفسها — فالسحب «الخاطئ» يعطي رسمة صحيحة بدل صندوق مقلوب يَعِد بعكس ما أراد.
 */
import { formatPrice } from './indicators/utils';
import { instrumentSpec, pipsBetween } from '../positionSize';
import { pipsNumber } from './measureReadout';

export type PositionSide = 'long' | 'short';

export const DEFAULT_POSITION_RR = 2;
export const MIN_POSITION_RR = 0.1;
export const MAX_POSITION_RR = 20;

export function isPositionTool(tool: string | null | undefined): tool is PositionSide {
  return tool === 'long' || tool === 'short';
}

/** نسبة صالحة ضمن المدى، وغيابها/فسادها (رسمة محفوظة يدوياً مثلاً) ⇒ الافتراضي. */
export function clampRr(rr: number | null | undefined): number {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return DEFAULT_POSITION_RR;
  return Math.min(MAX_POSITION_RR, Math.max(MIN_POSITION_RR, rr));
}

/**
 * سعر الوقف بجهته الصحيحة. مسافة صفرية (نقرتان على السعر نفسه، أو مغناطيس جذب الطرفين للإغلاق
 * ذاته) ⇒ 20 pip للأداة المعروفة، و0.2% من السعر لغيرها — رسمة قابلة للسحب بدل صندوق بلا ارتفاع.
 */
export function positionStop(side: PositionSide, entry: number, rawStop: number, symbol: string): number {
  let risk = Math.abs(entry - rawStop);
  if (!(risk > 0) || !Number.isFinite(risk)) {
    const spec = instrumentSpec(symbol);
    risk = spec ? spec.pipSize * 20 : Math.abs(entry) * 0.002;
  }
  return side === 'long' ? entry - risk : entry + risk;
}

export type PositionLevels = {
  side: PositionSide;
  entry: number;
  stop: number;
  target: number;
  rr: number;
};

export function positionLevels(
  side: PositionSide,
  entry: number,
  rawStop: number,
  rr: number | null | undefined,
  symbol: string
): PositionLevels {
  const stop = positionStop(side, entry, rawStop, symbol);
  const r = clampRr(rr);
  const target = entry + (entry - stop) * r;
  return { side, entry, stop, target, rr: r };
}

/**
 * النسبة من سعر مقبض الهدف المسحوب. الهدف بالجهة الخطأ (تحت دخول الشراء) ⇒ أدنى نسبة لا قلب
 * الصفقة. مقرَّبة لمنزلتين: «2.37» تُقرأ، و2.3712 ضجيج إصبع.
 */
export function rrFromTarget(levels: Pick<PositionLevels, 'side' | 'entry' | 'stop'>, targetPrice: number): number {
  const risk = Math.abs(levels.entry - levels.stop);
  if (!(risk > 0) || !Number.isFinite(targetPrice)) return DEFAULT_POSITION_RR;
  const reward = levels.side === 'long' ? targetPrice - levels.entry : levels.entry - targetPrice;
  return clampRr(Math.max(MIN_POSITION_RR, Math.round((reward / risk) * 100) / 100));
}

/** «2» أو «2.5» أو «1.37» — بلا أصفار زائدة. */
export function rrText(rr: number): string {
  return String(Math.round(rr * 100) / 100);
}

/** المسافة بالنقاط («25.0 pip») أو بفرق السعر لأداة بلا مواصفة pip (DXY، مؤشرات). */
function distanceText(symbol: string, a: number, b: number): string {
  const spec = instrumentSpec(symbol);
  const pips = spec ? pipsBetween(spec, a, b) : null;
  if (pips != null) return `${pipsNumber(pips)} pip`;
  return formatPrice(Math.abs(a - b), symbol);
}

/**
 * وسما الصندوقين. الهدف يحمل النسبة («TP 1.09350 · 50.0 pip · R:R 2») لأنها ما يقرّر به المتداول
 * الدخول من عدمه؛ الوقف سعره ومسافته. TP/SL/R:R/pip لاتينية بكل اللغات كبقية نصوص التطبيق.
 */
export function positionLabels(levels: PositionLevels, symbol: string): { target: string; stop: string } {
  return {
    target: `TP ${formatPrice(levels.target, symbol)} · ${distanceText(symbol, levels.entry, levels.target)} · R:R ${rrText(levels.rr)}`,
    stop: `SL ${formatPrice(levels.stop, symbol)} · ${distanceText(symbol, levels.entry, levels.stop)}`,
  };
}
