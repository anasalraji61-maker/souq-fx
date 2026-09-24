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

/**
 * نهاية الصندوق الزمنية (فهرس `b`): **يمين الدخول دائماً** كـTradingView — سحبة لليسار تُعكس بالمسافة
 * نفسها كما يُعكس الوقف المرسوم بالجهة الخطأ. صندوق ممتدّ يسار الدخول كان يغطّي شموعاً **قبل** الصفقة،
 * بينما نتيجتها تُحسب على ما بعدها حتى آخر شمعة — فيظهر «TP ✓» بلا أي شمعة داخل الصندوق تلمس الهدف.
 */
export function positionEndIndex(entryIndex: number, rawEndIndex: number): number {
  if (!Number.isFinite(entryIndex) || !Number.isFinite(rawEndIndex)) return rawEndIndex;
  return rawEndIndex >= entryIndex ? rawEndIndex : entryIndex + (entryIndex - rawEndIndex);
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

export type PositionOutcomeState = 'open' | 'target' | 'stop' | 'ended';

export type PositionOutcome = {
  /** `open` الصندوق يمتدّ للشمعة الأخيرة ولم يُلمس حدّ؛ `ended` انتهى الصندوق قبلها بلا لمس. */
  state: PositionOutcomeState;
  /** سعر الخروج: الهدف/الوقف عند اللمس، وإلا إغلاق آخر شمعة داخل الصندوق. */
  exit: number;
  /** فهرس الشمعة التي حُسب عندها الخروج (بفهارس السلسلة نفسها). */
  exitIndex: number;
  /** الربح/الخسارة بوحدة المخاطرة: +2 عند هدف R:R 2، و−1 عند الوقف. */
  r: number;
};

type Bar = { high: number; low: number; close: number };

/**
 * نتيجة الصفقة المرسومة على الشموع كما يفعل TradingView: الدخول عند سعره بشمعة الدخول، ثم أوّل
 * شمعة **بعدها** داخل الصندوق تلمس الهدف أو الوقف. شمعة تلمسهما معاً ⇒ الوقف (لا يُعرف الأسبق داخل
 * الشمعة، والافتراض المتفائل يعِد بربح لم يحدث). لم يُلمس شيء ⇒ إغلاق آخر شمعة داخل الصندوق.
 *
 * `lastIndex` آخر شمعة **معروضة** (بالإعادة: خطوة الإعادة لا نهاية السلسلة — فلا تُكشف النتيجة
 * قبل أوانها). صندوق بلا عرض زمني (الطرفان على الشمعة نفسها) ⇒ مفتوح حتى آخر شمعة. دخول بعد آخر
 * شمعة (رسم بمنطقة المستقبل) ⇒ null.
 */
export function positionOutcome(
  levels: PositionLevels,
  bars: readonly Bar[],
  entryIndex: number,
  endIndex: number,
  lastIndex: number
): PositionOutcome | null {
  const last = Math.min(lastIndex, bars.length - 1);
  if (!(entryIndex >= 0) || entryIndex > last) return null;
  const risk = Math.abs(levels.entry - levels.stop);
  if (!(risk > 0)) return null;
  const boxEnd = endIndex > entryIndex ? endIndex : Infinity;
  const to = Math.min(boxEnd, last);
  const long = levels.side === 'long';
  const rOf = (exit: number) => ((long ? exit - levels.entry : levels.entry - exit) / risk);
  for (let i = entryIndex + 1; i <= to; i++) {
    const b = bars[i];
    if (!b) continue;
    const hitStop = long ? b.low <= levels.stop : b.high >= levels.stop;
    if (hitStop) return { state: 'stop', exit: levels.stop, exitIndex: i, r: -1 };
    const hitTarget = long ? b.high >= levels.target : b.low <= levels.target;
    if (hitTarget) return { state: 'target', exit: levels.target, exitIndex: i, r: levels.rr };
  }
  const exit = bars[to]?.close;
  if (exit == null || !Number.isFinite(exit)) return null;
  return { state: to >= last && boxEnd >= last ? 'open' : 'ended', exit, exitIndex: to, r: rOf(exit) };
}

/**
 * وسم خطّ الدخول: «+12.3 pip · +0.49R» مفتوحة، «TP ✓ +50.0 pip · +2R» عند الهدف، «SL ✕ −25.0 pip · −1R»
 * عند الوقف. الإشارة دائماً ظاهرة (+/−) لأن اللون وحده لا يكفي لمن لا يميّز الأحمر من الأخضر.
 */
export function positionOutcomeText(levels: PositionLevels, outcome: PositionOutcome, symbol: string): string {
  const up = outcome.r >= 0;
  const sign = up ? '+' : '−';
  const spec = instrumentSpec(symbol);
  const pips = spec ? pipsBetween(spec, levels.entry, outcome.exit) : null;
  const dist = pips != null ? `${sign}${pipsNumber(pips)} pip` : `${sign}${formatPrice(Math.abs(outcome.exit - levels.entry), symbol)}`;
  const r = `${sign}${rrText(Math.abs(outcome.r))}R`;
  const head = outcome.state === 'target' ? 'TP ✓ ' : outcome.state === 'stop' ? 'SL ✕ ' : '';
  return `${head}${dist} · ${r}`;
}

/** تقدير متحفّظ لعرض محرف الوسم (`fontSize: 10`، وزن 800) وهوامشه (`paddingHorizontal: 4` + الحدّ). */
export const POSITION_LABEL_CHAR_W = 6.2;
export const POSITION_LABEL_PAD = 10;

/**
 * يسار وسم الصندوق: عند يسار الصندوق ما دام الوسم يتّسع حتى حافّة اللوح، وإلا يُزاح يساراً ليتّسع.
 * المتداول يرسم الصفقة غالباً عند الشمعة الحيّة (يمين اللوح)، فكان «TP 1.09000 · 50.0 pip · R:R 2»
 * يُقصّ إلى «TP 1.090…» — تضيع النسبة، وهي سبب رسم الأداة أصلاً. لوح أضيق من الوسم ⇒ 2px (ويُقصّ).
 */
export function positionLabelLeft(preferred: number, text: string, plotW: number): number {
  const w = text.length * POSITION_LABEL_CHAR_W + POSITION_LABEL_PAD;
  return Math.max(2, Math.min(preferred, plotW - w - 2));
}
