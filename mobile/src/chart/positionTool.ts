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
import { formatPrice, formatPriceDiff } from './indicators/utils';
import { pipsBetween } from '../positionSize';
import { chartPipSpec } from './pipSpec';
import { pipsNumber, pipUnit } from './measureReadout';

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
    const spec = chartPipSpec(symbol);
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
  let r = clampRr(rr);
  // بيع بوقف بعيد ونسبة كبيرة (عملة رقمية: وقف 30% × R:R 5) كان يرسم «TP -0.50000» — سعر لا يوجد، وبلا
  // مسافة pip. النسبة تُقصّ لأعلى ما يُبقي الهدف فوق الصفر (منزلتان للأسفل)، فتقرأ R:R الممكنة فعلاً.
  if (side === 'short' && entry > 0 && stop > entry) {
    const maxR = Math.floor(((entry / (stop - entry)) * 100) - 1e-9) / 100;
    if (maxR > 0 && r > maxR) r = maxR;
  }
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
function distanceText(symbol: string, a: number, b: number, lang?: string, priceRef?: number | null): string {
  const spec = chartPipSpec(symbol);
  const pips = spec ? pipsBetween(spec, a, b) : null;
  if (pips != null) return `${pipsNumber(pips)} ${pipUnit(lang)}`;
  return formatPriceDiff(a - b, a, symbol, priceRef);
}

/**
 * `priceRef` مرجع منازل الشارت (`series.last`) لأداة بلا منازل معروفة: كانت من سعر الدخول، فغاز عند 10.02
 * (محور بثلاث منازل) ودخول 9.985 يُكتب «TP 10.08500 · 0.10000» بجوار محور «10.085».
 *
 * وسما الصندوقين. الهدف يحمل النسبة («TP 1.09350 · 50.0 pip · R:R 2») لأنها ما يقرّر به المتداول
 * الدخول من عدمه؛ الوقف سعره ومسافته. TP/SL/R:R/pip لاتينية بكل اللغات كبقية نصوص التطبيق.
 */
export function positionLabels(
  levels: PositionLevels,
  symbol: string,
  lang?: string,
  priceRef?: number | null
): { target: string; stop: string } {
  const ref = priceRef ?? levels.entry;
  return {
    target: `TP ${formatPrice(levels.target, symbol, ref)} · ${distanceText(symbol, levels.entry, levels.target, lang, ref)} · R:R ${rrText(levels.rr)}`,
    stop: `SL ${formatPrice(levels.stop, symbol, ref)} · ${distanceText(symbol, levels.entry, levels.stop, lang, ref)}`,
  };
}

export type PositionOutcomeState = 'open' | 'target' | 'stop' | 'ended' | 'pending' | 'missed';

export type PositionOutcome = {
  /**
   * `open` الصندوق يمتدّ للشمعة الأخيرة ولم يُلمس حدّ؛ `ended` انتهى الصندوق قبلها بلا لمس.
   * `pending` لم يبلغ السعر الدخول بعد (أمر معلّق: شراء عند دعم تحت السعر)؛ `missed` انتهى الصندوق ولم يبلغه.
   */
  state: PositionOutcomeState;
  /** سعر الخروج: الهدف/الوقف عند اللمس، وإلا إغلاق آخر شمعة داخل الصندوق. */
  exit: number;
  /** فهرس الشمعة التي حُسب عندها الخروج (بفهارس السلسلة نفسها). */
  exitIndex: number;
  /** فهرس شمعة التنفيذ (بلوغ سعر الدخول)؛ للمعلّق/الفائت = `exitIndex`. */
  fillIndex: number;
  /** الربح/الخسارة بوحدة المخاطرة: +2 عند هدف R:R 2، و−1 عند الوقف. */
  r: number;
};

type Bar = { high: number; low: number; close: number };

/**
 * نتيجة الصفقة المرسومة على الشموع كما يفعل TradingView: الصفقة تُنفَّذ حين يبلغ السعر الدخول — بشمعة
 * الدخول إن كان سعره داخل مداها (الرسم عند السعر الجاري، الحالة الغالبة)، وإلا بأوّل شمعة بعدها تبلغه
 * (أمر معلّق: شراء عند دعم تحت السعر، بيع عند مقاومة فوقه). ثم أوّل شمعة **بعد التنفيذ** داخل الصندوق
 * تلمس الهدف أو الوقف. شمعة تلمسهما معاً ⇒ الوقف (لا يُعرف الأسبق داخل الشمعة، والافتراض المتفائل يعِد
 * بربح لم يحدث)؛ وشمعة التنفيذ نفسها تُحسب وقفاً إن لمسته (السعر الهابط لدخول شراء معلّق قد يكمل للوقف)،
 * لا هدفاً. لم يُلمس شيء ⇒ إغلاق آخر شمعة داخل الصندوق.
 *
 * قبل ذلك كانت كل صفقة تُعدّ منفَّذة عند رسمها: شراء معلّق مرسوم 30 pip تحت السعر يُقرأ فوراً «+30 pip ·
 * +1.2R» ربحاً لصفقة لم تُفتح، وقد «يصيب الهدف» دون أن يبلغ السعر دخولها أصلاً.
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
  // الرسوم مشتركة بين الفريمات وتُرسى بفهرس كسري (M15 10:15 على H1 ⇒ k+0.25): `bars[k.25]` غير معرَّف فكانت
  // كل الشموع تُتخطّى ⇒ «مفتوحة» بإغلاق آخر شمعة رغم ضرب الوقف قبل ساعات. الشمعة الحاوية = الجزء الصحيح.
  const entryInside = entryIndex !== Math.floor(entryIndex);
  entryIndex = Math.floor(entryIndex);
  if (!(entryIndex >= 0) || entryIndex > last) return null;
  const risk = Math.abs(levels.entry - levels.stop);
  if (!(risk > 0)) return null;
  // صندوق أضيق من شمعة هذا الفريم (دخول 10:15 ونهاية 10:45 رُسما على M15، معروضان على H1): لا شمعة بعد التنفيذ
  // تُفحص، فكان «انتهى» بإغلاق H1 (بعد نهاية الصندوق) ولو ضُرب الوقف أو الهدف على M15 ⇒ ربحٌ مخترع. لا يُعرف ⇒ بلا حكم.
  if (endIndex > entryIndex && Math.floor(endIndex) === entryIndex) return null;
  const boxEnd = endIndex > entryIndex ? endIndex : Infinity;
  const to = Math.floor(Math.min(boxEnd, last));
  const long = levels.side === 'long';
  const rOf = (exit: number) => ((long ? exit - levels.entry : levels.entry - exit) / risk);
  const hitsStop = (b: Bar) => (long ? b.low <= levels.stop : b.high >= levels.stop);
  const hitsTarget = (b: Bar) => (long ? b.high >= levels.target : b.low <= levels.target);
  // طرفٌ داخل شمعة هذا الفريم (صفقة H1 معروضة على D1): الشمعة الحاوية تجمع ما قبل الدخول وما بعده، أو ما قبل
  // نهاية الصندوق وما بعدها — لمسٌ فيها لا يُعرف أكان داخل الصندوق. كانت بقيّة يوم الدخول تُتخطّى (وقفٌ ضُرب بعد
  // 4 ساعات لا يُرى) وشمعة النهاية تُفحص كلّها (هدفٌ بعد نهاية الصندوق بـ14 ساعة) ⇒ «TP +2R» لصفقة خاسرة على H1.
  const endInside = boxEnd !== Infinity && boxEnd !== Math.floor(boxEnd) && Math.floor(boxEnd) <= last;
  // جهة الدخول من شمعة الرسم: تحت مداها ⇒ يُنفَّذ حين ينزل القاع إليه، فوقه ⇒ حين تبلغه القمّة. عبورٌ
  // لا احتواء، فالفجوة التي تقفز فوق الدخول (افتتاح الأسبوع) تنفّذه كما تنفّذ الوسيط الأمر المعلّق.
  const first = bars[entryIndex];
  const below = first != null && levels.entry < first.low;
  const above = first != null && levels.entry > first.high;
  let fill = below || above ? -1 : entryIndex;
  if (entryInside && fill === entryIndex && first && (hitsStop(first) || hitsTarget(first))) return null;
  for (let i = entryIndex + 1; i <= to; i++) {
    const b = bars[i];
    if (!b) continue;
    if (fill < 0) {
      if (below ? b.low > levels.entry : b.high < levels.entry) continue;
      if (endInside && i === to) return null;
      fill = i;
      if (hitsStop(b)) return { state: 'stop', exit: levels.stop, exitIndex: i, fillIndex: i, r: -1 };
      continue;
    }
    if (endInside && i === to && (hitsStop(b) || hitsTarget(b))) return null;
    if (hitsStop(b)) return { state: 'stop', exit: levels.stop, exitIndex: i, fillIndex: fill, r: -1 };
    if (hitsTarget(b)) return { state: 'target', exit: levels.target, exitIndex: i, fillIndex: fill, r: levels.rr };
  }
  const exit = bars[to]?.close;
  if (exit == null || !Number.isFinite(exit)) return null;
  const running = to >= last && boxEnd >= last;
  if (fill < 0) return { state: running ? 'pending' : 'missed', exit, exitIndex: to, fillIndex: to, r: 0 };
  return { state: running ? 'open' : 'ended', exit, exitIndex: to, fillIndex: fill, r: rOf(exit) };
}

/**
 * وسم خطّ الدخول: «+12.3 pip · +0.49R» مفتوحة، «TP ✓ +50.0 pip · +2R» عند الهدف، «SL ✕ −25.0 pip · −1R»
 * عند الوقف. الإشارة دائماً ظاهرة (+/−) لأن اللون وحده لا يكفي لمن لا يميّز الأحمر من الأخضر.
 */
export function positionOutcomeText(
  levels: PositionLevels,
  outcome: PositionOutcome,
  symbol: string,
  entryWord = 'Entry',
  lang?: string,
  priceRef?: number | null
): string {
  // لم يُنفَّذ: كم يبعد السعر عن الدخول («Entry ⌛ 12.3 pip»)، أو «Entry ✕» إن انتهى الصندوق قبل بلوغه.
  // `entryWord` كلمة «دخول» بلغة الواجهة (`tr.entryLabel`) — كانت «Entry» إنجليزية ثابتة بالعربية والكردية.
  if (outcome.state === 'missed') return `${entryWord} ✕`;
  if (outcome.state === 'pending') return `${entryWord} ⌛ ${distanceText(symbol, outcome.exit, levels.entry, lang, priceRef)}`;
  const up = outcome.r >= 0;
  // الإشارة من الرقم المطبوع (كـ`measureReadout`): خروج عند الدخول تماماً كان «+0.0 pip · +0R»، و−0.4 نقطة
  // عشرية «−0.0 pip · −0R» — اتجاه لصفقة متعادلة. صفر مطبوع ⇒ بلا إشارة، لكلٍّ من المسافة وR على حدة.
  const signed = (txt: string) => (/[1-9]/.test(txt) ? `${up ? '+' : '−'}${txt}` : txt);
  const spec = chartPipSpec(symbol);
  const pips = spec ? pipsBetween(spec, levels.entry, outcome.exit) : null;
  const dist =
    pips != null
      ? `${signed(pipsNumber(pips))} ${pipUnit(lang)}`
      : signed(formatPriceDiff(outcome.exit - levels.entry, levels.entry, symbol, priceRef));
  const r = `${signed(rrText(Math.abs(outcome.r)))}R`;
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
