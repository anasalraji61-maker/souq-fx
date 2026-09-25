/**
 * وضوح خطة الصفقة (دخول/وقف/هدف) — رياضيات صرفة قابلة للاختبار بـtsx.
 *
 * - يتحقق أن المستويات منسجمة مع الاتجاه: شراء ⇒ وقف < دخول < هدف؛ بيع ⇒ هدف < دخول < وقف.
 *   خطة معكوسة (وقف فوق الدخول بصفقة شراء) خطأ شائع لدى المبتدئ ويجب أن يُمنع قبل النشر.
 * - مسافات بالـpip حين يُعرف حجم الـpip (فوركس/ذهب/فضة عبر instrumentSpec)، وإلا بفرق السعر فقط.
 * - R:R = المكسب المحتمل ÷ المخاطرة.
 * - وقف أقرب من 1 pip للدخول (أضيق من أي سبريد تجزئة) خطأ كتابة شبه مؤكد: كان يُعرض «0 pip · R:R 1:5000».
 */
import { knownSingleName } from './chart/newsRisk';
import { normalizeDigits } from './parseDecimal';
import {
  centAccountSymbol,
  microAccountSymbol,
  instrumentSpec,
  type InstrumentSpec,
  smallContractPair,
  LOT_STEP,
  MAX_SANE_LOTS,
  MAX_SMALL_LOTS,
  formatMoney,
  pipsBetween,
  pnlInQuoteCcy,
  priceAtPipOffset,
  riskInQuoteCcy,
  sizeLooksLikeUnits,
  smallLotsStdEquiv,
} from './positionSize';

export type TradeSide = 'buy' | 'sell';

/**
 * حجم الـpip لمسافات الدفتر (نقاط، R، حدّ «أقرب من 1 pip») — مواصفات الأداة، **ورمز حساب سنت** بحجم pip زوجه
 * العادي («EURUSDC» ⇒ 0.0001، «USDJPYC» ⇒ 0.01). الدفتر يحفظ «EURUSDc» كما نسخها المتداول من Exness Cent
 * («EURUSDC»)، و`instrumentSpec` يرفضها عمداً (العقد أصغر بمئة مرّة ⇒ لا مال منها) — فكانت صفقاته **بلا نقاط
 * أصلاً**: لا «المخاطرة 25 pip»، ولا نتيجة «+32 pip» بعد الإغلاق، ولا تحذير وقفٍ أضيق من pip. السعر والـpip
 * بالسنت كالعادي تماماً؛ المال وحده يختلف، فهو يبقى على `instrumentSpec` (مجهولاً للسنت) لا على هذه.
 */
export function journalPipSize(symbol: string | null | undefined): number | null {
  return journalSpec(symbol)?.pipSize ?? null;
}

/**
 * مواصفات **الأسعار والنقاط** لرمز بالدفتر: `instrumentSpec`، أو الزوج العادي لحساب سنت/micro (`smallContractPair`).
 * للمسافات والأسعار وحدها (نقاط، شرائح الوقف والهدف، منازل السعر) — **لا للمال**: عقد السنت/micro أصغر بمئة مرّة.
 */
export function journalSpec(symbol: string | null | undefined): InstrumentSpec | null {
  if (!symbol) return null;
  return instrumentSpec(symbol) ?? instrumentSpec(smallContractPair(symbol) ?? '');
}

/**
 * رمز **حساب سنت** بالدفتر («EURUSDC»، «GOLDC»)؟ — لسطر `journalCentNoMoney`: النقاط تُحسب له (`journalPipSize`)
 * والمال لا، فبلا سطرٍ يقول لماذا يبدو غياب المبلغ عطلاً.
 */
export function isCentJournalSymbol(symbol: string | null | undefined): boolean {
  const up = (symbol || '').trim().toUpperCase();
  return !!up && !instrumentSpec(up) && centAccountSymbol(up) != null;
}

/**
 * رمز **حساب micro** بالدفتر («EURUSDMICRO»، «EURUSD.MICRO»)؟ — لسطر `journalMicroNoMoney`: كالسنت نقاطٌ بلا مال،
 * لكن نصّ `journalCentNoMoney` يقول «حساب سنت» فلا يصلح لمتداول XM Micro.
 */
export function isMicroJournalSymbol(symbol: string | null | undefined): boolean {
  const up = (symbol || '').trim().toUpperCase();
  return !!up && !instrumentSpec(up) && microAccountSymbol(up) != null;
}

/**
 * حجمٌ بخانة الدفتر يبدو **وحداتٍ لا لوتات** (`sizeLooksLikeUnits`) — وبرمز حساب سنت أيضاً.
 *
 * التحذير كان على `instrumentSpec` وحده، فـ«EURUSDC» بحجم «10000» لا يُنبَّه عليها ولا يُمنع حفظها: صفقة بعشرة
 * آلاف لوت بالدفتر. السنت يُكشف بضعف الحدّ (`MAX_SANE_LOTS` × 2: لوت السنت أصغر بمئة مرّة فأرقامه أكبر بطبيعتها،
 * ومنع حفظ صفقة حقيقية أسوأ من تركها)، و**بلا اقتراح تحويل** (`lots: null`): حجم عقد
 * السنت بالوحدات يختلف بين الوسطاء، و«0.10» مقترحة خطأً بمئة ضعف أسوأ من سطرٍ يقول «تحقّق من الحجم».
 */
export function journalSizeLooksLikeUnits(size: number, symbol: string | null | undefined): { lots: number | null } | null {
  const up = (symbol || '').trim().toUpperCase();
  const spec = instrumentSpec(up);
  if (spec) return sizeLooksLikeUnits(size, spec);
  // micro («EURUSDMICRO») كالسنت: لوتها أصغر بمئة مرّة فأرقامها أكبر، وعشرة آلاف لوت خطأ كتابة بها أيضاً
  if (!smallContractPair(up)) return null;
  return Number.isFinite(size) && size > MAX_SMALL_LOTS ? { lots: null } : null;
}

/**
 * حجمٌ بخانة الدفتر مكتوبٌ «10.000» — **آلافٌ بنقطة** (cTrader بلغة ألمانية/تركية/إندونيسية ينسخ حجم 10,000 وحدة هكذا)
 * أم 10 لوتات؟ `parseDecimal` يقرؤه 10 (الخانة تقبل «1.500» = 1.5 لوت)، و`sizeLooksLikeUnits` لا ينبّه تحت 100 — فصفقة
 * 0.10 لوت تُحفظ **10 لوتات**: مخاطرة وقف 20 pip تُكتب 2,000.00 USD بدل 20.00، والمال بالدفتر أكبر بمئة مرّة بلا إشارة.
 *
 * المبهم **«N.000» وحده**: ذيلٌ آخر («1.500» = 1,500 وحدة = 0.015 لوت) ليس خطوة لوت صحيحة بقراءة الوحدات فلا لبس فيه.
 * يُعاد `{ units, lots }` حين تكون قراءة الوحدات لوتاً صالحاً (خطوة 0.01) **أصغر** من قراءة اللوت لأداةٍ معروفة العقد — فيقول سطر
 * التحذير بنقرة تحويل (كالوحدات «10000») ولا يُحفظ حتى يختار المتداول: «0.10» أو «10». `null` = لا لبس.
 */
export function journalSizeDottedThousands(raw: string, symbol: string | null | undefined): { units: number; lots: number } | null {
  const m = /^(\d{1,3})[.．]000$/.exec(normalizeDigits(raw).trim());
  if (!m || Number(m[1]) < 1) return null;
  const spec = instrumentSpec((symbol || '').trim().toUpperCase());
  if (!spec) return null;
  const units = Number(m[1]) * 1000;
  const raw2 = units / spec.contractSize;
  const steps = Math.round(raw2 / LOT_STEP);
  // قراءة الوحدات **أصغر** من قراءة اللوت وإلا فلا خطر يُنبَّه عليه: ذهب «1.000» = 1,000 أونصة = 10 لوتات — اقتراحٌ أسوأ
  if (steps < 1 || Math.abs(raw2 / LOT_STEP - steps) > 1e-6 || raw2 >= Number(m[1])) return null;
  return { units, lots: Math.round(steps * LOT_STEP * 100) / 100 };
}

/**
 * مال صفقة بالدفتر (نتيجة بين دخول وخروج، بإشارتها) — `pnlInQuoteCcy` للرمز العادي، **وعقد السنت/micro** بدل «لا مال».
 *
 * لماذا: صفقات «EURUSDC»/«EURUSDMICRO» كانت نقاطاً فقط وسطر `journalCentNoMoney` يعتذر، مع أن العقد معروف (الزوج العادي ÷ 100،
 * `smallContractSpec` — الحاسبة تحسب به منذ مدّة). المتداول بحساب سنت يرى رصيده بالسنت الأمريكي، فـ«EURUSDc» 4 لوت و+25 pip
 * = **+1,000 USC** (= 10 USD) كما تكتبه منصّته، لا «+10.00 USD» يقارنه برصيدٍ مكتوب بالسنت فيقرؤه أصغر بمئة مرّة.
 * - عادي ⇒ بعملة التسعير كما كان حرفياً.
 * - سنت **مسعَّر بالدولار** (EURUSDC، GOLDC) ⇒ `USC`: عقد ÷100 × 100 سنت = اللوت نفسه على الزوج العادي ⇒ `pnlInQuoteCcy(الزوج، اللوت)` بالضبط.
 * - سنت بعملة تسعير أخرى (USDJPYC) أو micro ⇒ بعملة التسعير بعقد ÷ 100 (لا نعرف سعر التحويل هنا — كالعادي تماماً).
 * `null` = أداة مجهولة أو أرقام غير صالحة.
 */
export function journalPnl(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  exit: number;
  lots: number;
}): { amount: number; ccy: string } | null {
  const sym = input.symbol.trim().toUpperCase();
  if (instrumentSpec(sym)) return pnlInQuoteCcy({ ...input, symbol: sym });
  const small = smallContractPair(sym);
  const pair = small ? instrumentSpec(small) : null;
  if (!pair || !finitePos(input.lots)) return null;
  if (centAccountSymbol(sym) && pair.quote === 'USD') {
    const c = pnlInQuoteCcy({ ...input, symbol: pair.symbol });
    return c ? { amount: c.amount, ccy: 'USC' } : null;
  }
  return pnlInQuoteCcy({ ...input, symbol: pair.symbol, lots: input.lots / 100 });
}

/**
 * المال المعرَّض بين الدخول والوقف لصفقة بالدفتر — كـ`journalPnl` (USC لسنت مسعَّر بالدولار، عقد ÷100 لغيره)، موجباً.
 */
export function journalRisk(input: {
  symbol: string;
  entry: number;
  sl: number;
  lots: number;
}): { amount: number; ccy: string } | null {
  const sym = input.symbol.trim().toUpperCase();
  if (instrumentSpec(sym)) return riskInQuoteCcy({ ...input, symbol: sym });
  const small = smallContractPair(sym);
  const pair = small ? instrumentSpec(small) : null;
  if (!pair || !finitePos(input.lots)) return null;
  if (centAccountSymbol(sym) && pair.quote === 'USD') {
    const c = riskInQuoteCcy({ ...input, symbol: pair.symbol });
    return c ? { amount: c.amount, ccy: 'USC' } : null;
  }
  return riskInQuoteCcy({ ...input, symbol: pair.symbol, lots: input.lots / 100 });
}

/**
 * مبلغ الدفتر للعرض: `formatMoney` كما كان، و**USC** بقالب `journalMoneyUsc` («{usc} USC (≈ {usd} USD)») — «+1,000.00 USC (≈ +10.00 USD)».
 * `signed` = «+» للموجب (سطور النتيجة)؛ السالب «−» دائماً وعلى الرقمين معاً.
 */
export function formatJournalMoney(
  cash: { amount: number; ccy: string },
  uscTemplate: string,
  signed = false
): string {
  const plus = signed && cash.amount > 0 ? '+' : '';
  if (cash.ccy !== 'USC') return `${plus}${formatMoney(cash.amount, cash.ccy)}`;
  const num = (v: number, ccy: string) => formatMoney(v, ccy).slice(0, -(ccy.length + 1));
  return uscTemplate
    .replace('{usc}', `${plus}${num(cash.amount, 'USC')}`)
    .replace('{usd}', `${plus}${num(cash.amount / 100, 'USD')}`);
}

/**
 * «كم أخاطر» لمسودّة الدفتر: نقاط الوقف والمال بعملة التسعير للحجم المكتوب. `null` = لا سطر (بلا حجم، وقف
 * بالجهة الخطأ أو على الدخول، حجمٌ يبدو وحدات، أداة مجهولة).
 *
 * **حساب السنت/micro**: النقاط بمواصفات الزوج العادي، والمال بعقده (`journalRisk`: USC لسنت الدولار، عقد ÷100 لغيره).
 */
export function draftRiskFigures(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl: number;
  lots: number;
}): { pips: number | null; cash: { amount: number; ccy: string } | null; cent: boolean; micro: boolean } | null {
  const { side, entry, sl, lots } = input;
  if (![entry, sl, lots].every((v) => Number.isFinite(v) && v > 0) || entry === sl) return null;
  if (levelSideIssue({ side, entry, sl })) return null;
  const sym = input.symbol.trim().toUpperCase();
  const std = instrumentSpec(sym);
  const cent = !std && isCentJournalSymbol(sym);
  // micro («EURUSD.MICRO») كالسنت: نقاط بلا مال — وسطرها `journalMicroNoMoney` (نصّ `journalCentNoMoney` عن السنت)
  const micro = !std && isMicroJournalSymbol(sym);
  const small = std ? null : smallContractPair(sym);
  const spec = std ?? (small ? instrumentSpec(small) : null);
  if (!spec) return null;
  // مالٌ من حجمٍ يبدو وحداتٍ («125,000,000 USD») أسوأ من لا شيء — سطر التحذير يقول ما الخطأ
  if (journalSizeLooksLikeUnits(lots, sym)) return null;
  const cash = journalRisk({ symbol: sym, entry, sl, lots });
  if (!cash) return null;
  return { pips: pipsBetween(spec, entry, sl), cash, cent, micro };
}

export type PlanIssue = 'invalid' | 'slWrongSide' | 'tpWrongSide' | 'slTooClose';

export type TradePlan = {
  ok: boolean;
  issue: PlanIssue | null;
  riskDist: number;
  rewardDist: number;
  /** null حين لا يُعرف حجم الـpip للرمز (مؤشرات/عملات رقمية…). */
  riskPips: number | null;
  rewardPips: number | null;
  /** المكسب ÷ المخاطرة؛ null إن لم تكن الخطة صالحة. */
  rr: number | null;
};

const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * سطر الخطة: «المخاطرة 25 pip (125.00 USD) · الربح المحتمل 50 pip (250.00 USD) · R:R 1:2» — بفرق السعر حين لا يُعرف الـpip
 * (منظَّفاً لخمس منازل). كان منسوخاً بالدفتر ولوحة الأفكار (`VotePanel`) — نسختان تتباعدان. `riskMoney`/`gainMoney` نصّ
 * المال جاهزاً (أو null ⇒ بلا قوسين).
 */
export function planSummaryText(
  plan: TradePlan,
  words: { risk: string; reward: string },
  riskMoney?: string | null,
  gainMoney?: string | null
): string {
  const dist = (pips: number | null, d: number) => {
    const p = formatPips(pips);
    return p != null ? `${p} pip` : String(Math.round(d * 1e5) / 1e5);
  };
  const paren = (m: string | null | undefined) => (m ? ` (${m})` : '');
  return `${words.risk} ${dist(plan.riskPips, plan.riskDist)}${paren(riskMoney)} · ${words.reward} ${dist(plan.rewardPips, plan.rewardDist)}${paren(gainMoney)} · R:R ${formatRR(plan.rr)}`;
}

/**
 * نسبة مسافتين سعريتين **منظَّفةً من ضجيج الفاصلة العائمة** (دقّة 1e-9، أدقّ بكثير من أي نسبة
 * تعني شيئاً). طرح الأسعار لا يُنتج المسافة الدقيقة: وقف 20 pip وهدف 20 pip على USDJPY
 * (157.40/157.20/157.60) يعطي R:R = 0.99999999999986 — فتقول اللوحة «⚠ الربح المحتمل أقل من
 * المخاطرة» عن خطة 1:1 تماماً. وهدف 45 pip لوقف 20 (2.25 بالضبط) كان يخرج «1:2.2» على EURUSD
 * و«1:2.3» على الذهب: الضجيج هو الذي يختار جهة التقريب لا الرقم.
 */
const cleanRatio = (num: number, den: number): number => Math.round((num / den) * 1e9) / 1e9;

/**
 * تقريب نتيجةٍ بالـR لمنزلة واحدة **متماثلاً حول الصفر** (النصف يبتعد عن الصفر بالإشارتين)، بعد
 * تنظيف ضجيج الفاصلة العائمة. `Math.round` يرفع النصف نحو +∞: ‎+1.25R‎ تصير +1.3R و‎−1.25R‎ تصير
 * −1.2R — فالخسارة تُكتب أصغر من الربح المماثل بالحجم، ويميل متوسط الـR بالدفتر لصالح المتداول
 * بلا حق. ولا «−0» (يُطبع صفراً بلا إشارة). مُصدَّرة لمتوسط الـR بالدفتر: القاعدة نفسها للصفقة
 * ولمتوسّطها.
 */
export function roundR(v: number): number {
  return roundAway(v, 1);
}

/**
 * تقريب لـ`decimals` منزلة **متماثلاً حول الصفر** بعد تنظيف ضجيج الفاصلة العائمة مرّتين: بالقيمة
 * نفسها (‎−0.04999999…‎ pip = ‎−0.05‎)، وبعد الضرب بالمقياس (‎1.005 × 100 = 100.49999…‎). بلا «−0».
 * قاعدة `roundR` نفسها، معمَّمة لنقاط الصفقة ونسبتها بـ`realizedMove`.
 */
function roundAway(v: number, decimals: number): number {
  const scale = 10 ** decimals;
  const c = Math.round(v * 1e9) / 1e9;
  const r = Math.round(Math.round(Math.abs(c) * scale * 1e6) / 1e6) / scale;
  return c < 0 ? -r || 0 : r;
}

export function analyzePlan(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl: number;
  tp: number;
}): TradePlan {
  const { side, entry, sl, tp } = input;
  const bad: TradePlan = {
    ok: false,
    issue: 'invalid',
    riskDist: 0,
    rewardDist: 0,
    riskPips: null,
    rewardPips: null,
    rr: null,
  };
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(tp)) return bad;
  const buy = side === 'buy';
  const riskDist = buy ? entry - sl : sl - entry;
  const rewardDist = buy ? tp - entry : entry - tp;
  const pip = journalPipSize(input.symbol);
  const toPips = (d: number) => (pip ? Math.round((d / pip) * 10) / 10 : null);
  const base = {
    riskDist,
    rewardDist,
    riskPips: toPips(riskDist),
    rewardPips: toPips(rewardDist),
  };
  if (riskDist <= 0) return { ...base, ok: false, issue: 'slWrongSide', rr: null };
  if (rewardDist <= 0) return { ...base, ok: false, issue: 'tpWrongSide', rr: null };
  // هامش نسبي صغير: 1.0851 − 1.0850 بالفاصلة العائمة = 0.0000999… ويجب أن يُعدّ 1 pip كاملاً
  if (pip && riskDist < pip * (1 - 1e-6)) return { ...base, ok: false, issue: 'slTooClose', rr: null };
  return { ...base, ok: true, issue: null, rr: cleanRatio(rewardDist, riskDist) };
}

/**
 * الوقف بالجهة الصحيحة لكنه **أقرب من 1 pip** للدخول — حدّ `analyzePlan` (`slTooClose`) نفسه بلا حاجة لهدف.
 * الدفتر كان يحذّر منه فقط حين يُكتب الهدف أيضاً؛ بوقفٍ وحده كان يعرض «المخاطرة 0.1 pip (1.00 USD)» كخطة
 * عادية، ثم لا R للصفقة بعد إغلاقها (`realizedR`) بلا سبب مرئي. false لرمزٍ مجهول الـpip أو وقفٍ بالجهة الخطأ
 * (لذاك تحذيره) أو أسعار غير صالحة.
 */
export function stopTooClose(input: { symbol: string; side: TradeSide; entry: number | null; sl: number | null }): boolean {
  const { side, entry, sl } = input;
  if (!finitePos(entry) || !finitePos(sl)) return false;
  const risk = side === 'buy' ? entry - sl : sl - entry;
  const pip = journalPipSize(input.symbol);
  return pip != null && risk > 0 && risk < pip * (1 - 1e-6);
}

/**
 * "1:2.0" — منزلة عشرية واحدة تكفي للقرار، **مقصوصة للأسفل دائماً**.
 *
 * **فوق 1 نقصّ أيضاً**: كانت 1.95 تُقرَّب «1:2.0» — متداولٌ قاعدته «لا أدخل تحت 1:2» يأخذ صفقةً دون حدّه،
 * والنصّ نفسه يُحفظ بملاحظة الدفتر (`planJournalNote`). القصّ لا يعِد بأكثر من الخطة. شرائح «1:1.5»…
 * لا تتأثّر: `targetAtRR` يقرّب الهدف بعيداً عن الدخول فالنسبة ≥ المختارة دائماً.
 *
 * **تحت 1 نقصّ**: 0.96 كانت تُطبع «1:1.0» وتحتها «⚠ الربح أقل من المخاطرة» — رقمٌ يقول تعادلاً وتحذيرٌ
 * يقول خسارة. والصغيرة جداً (R:R بعد التكاليف حين تكاد تبتلع الهدف) كانت «1:0.0» كأن لا ربح أصلاً:
 * تحت 0.1 منزلتان («1:0.04»)، وتحت 0.01 «1:<0.01».
 */
export function formatRR(rr: number | null): string {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return '—';
  // هامش الفاصلة العائمة (0.3 × 10 = 2.999…، 1.1 × 10 = 11.000…1) لا يُسقط منزلة؛ وما دون 1 لا يصير «1:1.0»
  const tenths = Math.floor(Math.round(rr * 10 * 1e6) / 1e6) / 10;
  if (rr >= 1) return `1:${tenths.toFixed(1)}`;
  if (tenths >= 1) return '1:0.9';
  if (tenths > 0) return `1:${tenths.toFixed(1)}`;
  const hundredths = Math.floor(rr * 100 + 1e-9) / 100;
  return hundredths > 0 ? `1:${hundredths.toFixed(2)}` : '1:<0.01';
}

/** 25 → "25"، 12.5 → "12.5" (pip واحد عشري كحد أقصى). */
export function formatPips(p: number | null): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

/**
 * فحص جهة الوقف/الهدف حين يُعطى أحدهما فقط (دفتر الصفقات: كلاهما اختياري).
 * null = لا مشكلة (أو لا شيء لفحصه). الأولوية لخطأ الوقف لأنه الأخطر.
 */
export function levelSideIssue(input: {
  side: TradeSide;
  entry: number;
  sl?: number | null;
  tp?: number | null;
}): PlanIssue | null {
  const { side, entry, sl, tp } = input;
  if (!finitePos(entry)) return null;
  const buy = side === 'buy';
  if (finitePos(sl) && (buy ? sl >= entry : sl <= entry)) return 'slWrongSide';
  if (finitePos(tp) && (buy ? tp <= entry : tp >= entry)) return 'tpWrongSide';
  return null;
}

/**
 * قيمة `exit` المُرسلة بحفظ التعديل: خانةٌ فارغة تمسح الخروج (تعيد الصفقة مفتوحة) **فقط** حين بدأ التعديل على
 * صفقة مغلقة — إعادة الفتح المقصودة. بدأ على صفقة **مفتوحة** والخانة فارغة ⇒ `undefined` (بلا تغيير).
 *
 * لماذا: تعديل صفقة مفتوحة (لتحريك الوقف) ثم «إغلاق بالسوق» على السطر نفسه قبل الحفظ ثم «حفظ التعديل» كان يرسل
 * `exit: null` فيعيد الخادم الصفقة مفتوحة ويمسح ربحها ووقت إغلاقها — إغلاقٌ مؤكَّد يختفي من الإحصاءات بصمت. الأمر
 * نفسه لصفقة أُغلقت من جهاز آخر أثناء التعديل. `null` لصفقة مفتوحة أصلاً لم يكن يغيّر شيئاً، فلا يضيع قصدٌ.
 */
export function editExitValue(startedClosed: boolean, exit: number | null): number | null | undefined {
  if (exit != null) return exit;
  return startedClosed ? null : undefined;
}

/**
 * النتيجة بوحدات المخاطرة (R): +2 = ربحت ضعف ما خاطرت به، −1 = ضُرب الوقف كاملاً.
 * يحتاج وقفاً صالحاً بالجهة الصحيحة؛ وإلا null. تقريب لمنزلة عشرية واحدة.
 *
 * مع `symbol` معروف الـpip: وقفٌ **أضيق من 1 pip** ⇒ null، بحدّ `analyzePlan` نفسه (`slTooClose`). شراء
 * 1.0850 بوقف 1.08499 (خطأ منزلة عن 1.0849) وخروج 1.0870 كان «+200R» بسطر الصفقة، ويرفع «متوسط R» لثلاث
 * صفقات إلى +66R — الرقم الذي يقرّر به المتداول أيستمرّ على نظامه. الدفتر يحذّر من هذا الوقف أصلاً
 * (`planSlTooClose`)، فلا يُبنى عليه R. بلا `symbol` (أو رمز مجهول) السلوك كما كان.
 */
export function realizedR(input: {
  symbol?: string;
  side: TradeSide;
  entry: number;
  sl?: number | null;
  exit?: number | null;
  /** علامة الوقف الأصلي «1R @ …» (`noteWithInitialStop`) — حين تصلح، هي مسافة الـ1R لا `sl` الحالي */
  note?: string | null;
}): number | null {
  const r = exactR(input);
  return r == null ? null : roundR(r);
}

function exactR(input: {
  symbol?: string;
  side: TradeSide;
  entry: number;
  sl?: number | null;
  exit?: number | null;
  note?: string | null;
}): number | null {
  const { side, entry, exit } = input;
  if (!finitePos(entry) || !finitePos(exit)) return null;
  // الوقف الأصلي من الملاحظة (`noteWithInitialStop`) هو الـ1R حين يُعرف: وقفٌ حُرِّك بعد الدخول لا يغيّر المسطرة
  const sl = initialStop({ symbol: input.symbol, side, entry, note: input.note }) ?? input.sl;
  if (!finitePos(sl)) return null;
  const buy = side === 'buy';
  const risk = buy ? entry - sl : sl - entry;
  if (risk <= 0) return null;
  const pip = journalPipSize(input.symbol);
  if (pip && risk < pip * (1 - 1e-6)) return null;
  const move = buy ? exit - entry : entry - exit;
  return move / risk;
}

/** علامة الوقف الأصلي بالملاحظة: «1R @ 1.083» — مقطعٌ بين « · » كعلامة «1.00 lot» (`knownLots`). */
const INITIAL_STOP_RE = /(?:^| · )1R @ (\d+(?:\.\d+)?)(?= · |$)/;

/**
 * الوقف الأصلي (مسافة الـ1R) المحفوظ بملاحظة الصفقة، إن كان صالحاً لهذا الدخول والاتجاه (بالجهة الصحيحة وليس
 * أضيق من 1 pip). `null` بلا علامة أو بعلامة لا تصلح (الدخول/الاتجاه عُدِّلا بعدها) — فيُحسب من `sl` كما كان.
 */
export function initialStop(input: {
  symbol?: string;
  side: TradeSide;
  entry: number;
  note?: string | null;
}): number | null {
  const m = typeof input.note === 'string' ? INITIAL_STOP_RE.exec(input.note.trim()) : null;
  if (!m || !finitePos(input.entry)) return null;
  const v = Number(m[1]);
  if (!finitePos(v)) return null;
  const risk = input.side === 'buy' ? input.entry - v : v - input.entry;
  if (!(risk > 0)) return null;
  const pip = journalPipSize(input.symbol);
  return pip && risk < pip * (1 - 1e-6) ? null : v;
}

/**
 * الوقف الذي تُقاس به الخطة (R:R المخطَّطة بسطر الصفقة): الأصلي من الملاحظة إن صلح، وإلا `sl` الحالي. بعد نقل
 * الوقف للتعادل كان سطر الصفقة يُسقط «R:R 1:2.0» (الوقف الحالي على الدخول ⇒ `slWrongSide`)، وبعد شدّه يعرض
 * نسبةً أكبر لم تُخطَّط (وقف 5 pip بدل 20 ⇒ «1:8.0»).
 */
export function planStop(input: {
  symbol?: string;
  side: TradeSide;
  entry: number;
  sl?: number | null;
  note?: string | null;
}): number | null {
  return initialStop(input) ?? (finitePos(input.sl) ? input.sl : null);
}

/**
 * الملاحظة المحفوظة بتعديل صفقة **مفتوحة** يُحرَّك فيه الوقف نحو الدخول أو خلفه (وقف متحرّك، نقلٌ للتعادل، حجز ربح):
 * يُلحق بها «1R @ <الوقف القديم>» مرّة واحدة، فيبقى الـR محسوباً من المخاطرة **التي دخل بها** المتداول.
 *
 * لماذا: الخادم يحفظ `sl` واحداً. شراء EURUSD 1.0850 بوقف 1.0830 وخروج 1.0890 = +2R؛ حرّك الوقف إلى 1.0845 قبل
 * الإغلاق فصارت «+8R»، ومع صفقة −1R صار «متوسط R» +3.5R بدل +0.5R — الرقم الذي يقرّر به أيستمرّ على نظامه.
 *
 * لا علامة حين: الصفقة مغلقة (تعديلها تصحيحٌ لا تحريك)، أو الاتجاه/الدخول تغيّرا (تصحيح خطأ كتابة)، أو الوقف القديم
 * غير صالح أو غائب (لا مخاطرة أصلية معروفة)، أو الجديد أوسع/غائب/مساوٍ، أو بالملاحظة علامة صالحة أصلاً.
 */
export function noteWithInitialStop(input: {
  symbol: string;
  note: string;
  before: { side: string; entry: number; sl?: number | null; status: string };
  after: { side: TradeSide; entry: number; sl: number | null };
}): string {
  const { note, before, after } = input;
  if (before.status !== 'open' || before.side !== after.side) return note;
  if (!finitePos(before.entry) || Math.abs(before.entry - after.entry) > 1e-12 * Math.max(1, before.entry)) return note;
  if (initialStop({ symbol: input.symbol, side: after.side, entry: after.entry, note }) != null) return note;
  const old = before.sl;
  if (!finitePos(old) || !finitePos(after.sl)) return note;
  const risk = after.side === 'buy' ? after.entry - old : old - after.entry;
  const pip = journalPipSize(input.symbol);
  if (!(risk > 0) || (pip && risk < pip * (1 - 1e-6))) return note;
  const tighter = after.side === 'buy' ? after.sl > old : after.sl < old;
  if (!tighter) return note;
  const n = note.trim();
  const mark = `1R @ ${old}`;
  const out = n ? `${n} · ${mark}` : mark;
  // ملاحظةٌ تتجاوز حدّ الخادم (`note` ≤ 500) تُفشل الحفظ كلّه — الـR بالوقف الحالي أهون من تعديلٍ لا يُحفظ
  return out.length > JOURNAL_NOTE_MAX ? note : out;
}

/** حدّ طول الملاحظة بالخادم (`backend/main.py` `note: max_length=500`). */
export const JOURNAL_NOTE_MAX = 500;

/** يظهر عدّاد الأحرف الباقية حين يبقى هذا العدد أو أقلّ (`noteCharsLeft`). */
export const NOTE_COUNTER_FROM = 100;

/**
 * الأحرف الباقية بخانة ملاحظة لسطر `noteCharsLeft` تحتها، أو `null` = لا سطر (الملاحظة بعيدة عن حدّها).
 *
 * لماذا: الخانة بـ`maxLength={JOURNAL_NOTE_MAX}` (الخادم يرفض >500 بـ422 فيقول الدفتر «تحقق من الاتصال» — محاولةٌ لا
 * تنجح أبداً)، و`maxLength` وحده يوقف الكتابة/اللصق **بصمت** — المتداول يظنّ لوحة المفاتيح علقت. الطول بوحدات UTF-16
 * (ما يعدّه `maxLength`)، وهي ≥ ما يعدّه الخادم (نقاط يونيكود) فلا يمرّ من الخانة ما يرفضه.
 */
export function noteCharsLeft(note: string | null | undefined, max: number = JOURNAL_NOTE_MAX): number | null {
  const left = Math.max(0, max - (note || '').length);
  return left <= NOTE_COUNTER_FROM ? left : null;
}

/**
 * وقفٌ **على الدخول أو خلفه** مقبول (لا «الوقف بالجهة الخطأ») حين للصفقة وقفٌ أصلي معروف بالملاحظة — تعادلٌ أو ربحٌ
 * محجوز لصفقة مفتوحة، لا خطأ كتابة. `note` هي الملاحظة **بعد** `noteWithInitialStop`.
 */
export function trailedStopAllowed(input: { symbol: string; side: TradeSide; entry: number; note: string }): boolean {
  return initialStop(input) != null;
}

/**
 * متوسط النتيجة بالـR للصفقات المغلقة ذات الوقف الصالح (التوقّع لكل صفقة)، وعددها — لسطر «متوسط R»
 * بالدفتر. `null` بلا صفقة واحدة تُحسب.
 *
 * يُحسب من الـR **الدقيقة** ثم يُقرَّب مرّة واحدة: متوسط القيم المقرَّبة لكل صفقة (`realizedR`) كان
 * يُراكم خطأ التقريب — ثلاث صفقات +0.05R و+0.05R و+0.04R (متوسطها +0.047R ⇒ «0R») كانت تُقرأ «+0.1R»:
 * نظام بلا أفضلية يبدو رابحاً. وهذا السطر هو ما يقرّر به المتداول أيستمرّ على نظامه.
 */
export function averageR(
  trades: readonly {
    symbol?: string;
    side: string;
    entry: number;
    sl?: number | null;
    exit?: number | null;
    note?: string | null;
    status: string;
  }[]
): { r: number; n: number } | null {
  let sum = 0;
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'closed') continue;
    // وقفٌ أضيق من 1 pip لا يُحسب (راجع `realizedR`) — صفقة «+200R» واحدة كانت تبتلع المتوسط كلّه
    const r = exactR({ symbol: tr.symbol, side: tr.side === 'sell' ? 'sell' : 'buy', entry: tr.entry, sl: tr.sl, exit: tr.exit, note: tr.note });
    if (r == null) continue;
    sum += r;
    n += 1;
  }
  return n ? { r: roundR(sum / n), n } : null;
}

/**
 * نتيجة صفقة مغلقة بالـpip (الوحدة التي يفكّر بها متداول الفوركس) وبنسبة حركة السعر — من الدخول والخروج
 * مباشرة، لا من `pnl` المخزَّن (كان «% × الحجم» بالباك-إند القديم فيُعرض بوحدة مضلِّلة لحجم ≠ 1).
 * `pips` null حين لا يُعرف حجم الـpip للرمز.
 */
export function realizedMove(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  exit?: number | null;
}): { pips: number | null; pct: number } | null {
  const { side, entry, exit } = input;
  if (!finitePos(entry) || !finitePos(exit)) return null;
  const move = side === 'buy' ? exit - entry : entry - exit;
  const pip = journalPipSize(input.symbol);
  // تقريب متماثل (`roundAway`) لا `Math.round`: هذا يرفع النصف نحو +∞ فتُكتب الخسارة أصغر من الربح
  // المماثل — ذهب 2000 → 1997.5 كان «−0.12%» ومقابله 2000 → 2002.5 «+0.13%»، ونصف pipette خاسر
  // (1.08500 → 1.084995) كان «−0» pip بينما الرابح المماثل «+0.1». وإحصاءات الدفتر تجمع هذه الأرقام.
  return {
    pips: pip ? roundAway(move / pip, 1) : null,
    pct: roundAway((move / entry) * 100, 2),
  };
}

/**
 * شرائح «الخروج = الوقف» و«الخروج = الهدف» بخانة الخروج بالدفتر: أغلب الصفقات تُغلق **على** وقفها أو
 * هدفها بالضبط (أمرٌ معلّق نفّذه الوسيط)، والمتداول كان يعيد كتابة رقمٍ مكتوب أصلاً بخانة تحتها — وهي
 * بالضبط الخطوة التي تنقلب فيها منزلة (1.0852 بدل 1.0825) فتُحفظ خسارةٌ كاملة كـ«+0.1R».
 *
 * تُرجَع المستويات الصالحة وحدها: موجبة، وبالجهة الصحيحة من الدخول (`levelSideIssue`) — وقفٌ بالجهة
 * الخطأ يمنع الحفظ أصلاً فلا شريحة له، وبلا دخول صالح لا تُعرف الجهة فلا شيء. الوقف أولاً.
 * `price` هي قيمة الخانة نفسها (لا تقريب)، فنتيجة الصفقة بعدها −1R و+R:R الخطة **حرفياً**.
 *
 * و«= BE» (التعادل: الخروج = الدخول ⇒ 0 pip و0R) بين الوقف والهدف — ثالث أكثر إغلاق شيوعاً: وقفٌ نُقل
 * إلى الدخول ثم ضُرب. كانت تُكتب بيدٍ فتنزلق منزلة («1.0805» بدل «1.0850» ⇒ −4.5R تُحفظ خسارة لم تقع).
 * تظهر حين يكون للصفقة وقفٌ صالح فقط (التعادل معناه وقفٌ نُقل)، فتبقى الشرائح مرتّبة: خسارة، صفر، ربح.
 */
export function exitShortcuts(input: {
  side: TradeSide;
  entry: number | null;
  sl?: number | null;
  tp?: number | null;
  /**
   * وقفٌ نُقل إلى الدخول أو خلفه مقبول (`trailedStopAllowed` — للصفقة وقفٌ أصلي معروف بالملاحظة). كانت
   * «= SL»/«= BE» تختفي تماماً بعد نقل الوقف للتعادل أو حجز الربح — وهي الحالة التي وُجدت «= BE» لأجلها،
   * فيُكتب الخروج باليد وتنزلق منزلة. الترتيب يبقى من الأسوأ للأفضل: التعادل، ثم الوقف الرابح، ثم الهدف.
   */
  trailed?: boolean;
}): { kind: 'sl' | 'be' | 'tp'; price: number }[] {
  const { side, entry, sl, tp } = input;
  if (!finitePos(entry)) return [];
  const out: { kind: 'sl' | 'be' | 'tp'; price: number }[] = [];
  const tpOk = finitePos(tp) && levelSideIssue({ side, entry, tp }) == null;
  if (finitePos(sl) && levelSideIssue({ side, entry, sl }) == null) {
    out.push({ kind: 'sl', price: sl });
    out.push({ kind: 'be', price: entry });
  } else if (input.trailed && finitePos(sl)) {
    // الوقف على الدخول تماماً ⇒ «= BE» وحدها (الوقف هو التعادل)؛ في الربح ⇒ التعادل ثم الوقف — ما لم يتجاوز الهدف
    const beyondTp = tpOk && (side === 'buy' ? sl >= tp : sl <= tp);
    out.push({ kind: 'be', price: entry });
    if (sl !== entry && !beyondTp) out.push({ kind: 'sl', price: sl });
  }
  if (tpOk) out.push({ kind: 'tp', price: tp });
  return out;
}

/**
 * نتيجة صفقة **قبل حفظها** من خانات نموذج الدفتر: النقاط ونسبة الحركة (`realizedMove`)، والـR حين
 * يُكتب وقفٌ صالح (`realizedR`)، والمال بعملة التسعير حين يُكتب حجم (`pnlInQuoteCcy`).
 *
 * لماذا: الخروج يُكتب بالنموذج (أو يُنقر «= SL»/«= TP») ولا يرى المتداول ما سيُحفظ إلا بعد الحفظ بسطر
 * الصفقة — ومنزلةٌ منقلبة (1.0852 بدل 1.0825) تُحفظ خسارةٌ كاملة كـ«+0.1R» بلا إشارة قبلها. **الدوالّ
 * نفسها** التي يعرض بها سطر الصفقة المغلقة نتيجتها، فما يُرى هنا هو ما سيُرى بالقائمة حرفياً.
 *
 * `lots` null/غير موجب = بلا مال (لا حجم مفترض). `null` كلّه بلا دخول أو خروج صالحَين.
 */
export function exitPreview(input: {
  symbol: string;
  side: TradeSide;
  entry: number | null;
  sl?: number | null;
  exit: number | null;
  lots?: number | null;
  /** الملاحظة التي ستُحفظ — علامة «1R @ …» بعد تحريك الوقف تجعل الـR من الوقف الأصلي كسطر الصفقة بعد الحفظ */
  note?: string | null;
}): { pips: number | null; pct: number; r: number | null; cash: { amount: number; ccy: string } | null } | null {
  const { symbol, side, entry, sl, exit, lots, note } = input;
  if (!finitePos(entry) || !finitePos(exit)) return null;
  const mv = realizedMove({ symbol, side, entry, exit });
  if (!mv) return null;
  const cash = finitePos(lots) ? journalPnl({ symbol, side, entry, exit, lots }) : null;
  return { ...mv, r: realizedR({ symbol, side, entry, sl, exit, note }), cash };
}

/**
 * تقريبٌ مطابق لتقريب بايثون (`round`) الذي يحسب به الخادم إحصاءات الدفتر: **النصف إلى الزوجي**،
 * لا `Math.round` الذي يرفع النصف دائماً. ليس تدقيقاً نظرياً: نسبة النجاح بست عشرة صفقة مغلقة
 * وفوزٍ واحد هي 6.25 بالضبط (قيمة ثنائية تامّة، لا تقريب عائم) — الخادم يكتبها 6.2 و`Math.round`
 * يكتبها 6.3. ومجموع النتائج يقع على 0.125 و0.375 وأمثالها كثيراً. فالفارق يظهر بالشاشة رقماً
 * يخالف ما يعرضه الخادم لنفس الصفقات.
 */
export function roundHalfEven(v: number, d: 1 | 2): number {
  if (!Number.isFinite(v)) return v;
  /**
   * النصف التامّ لا يقع إلا على مضاعفٍ فرديّ لـ0.25 (خانة) أو 0.125 (خانتان) — وحدها الأنصافُ
   * الممثَّلة ثنائياً تماماً. و«19.925» المكتوبة ليست نصفاً: قيمتها الثنائية 19.92500000000000071
   * أي **فوق** النصف، فالخادم يرفعها لـ19.93. وضربها في 100 يُنتج 1992.5 بالضبط فيُخفي ذلك —
   * ولهذا لا يُستعمل الضرب إلا حيث ثبت أنه مضبوط.
   */
  const y = v * (d === 1 ? 4 : 8);
  if (Number.isInteger(y) && Math.abs(y % 2) === 1) {
    const p = d === 1 ? 10 : 100;
    const fl = Math.floor(v * p); // مضبوط هنا: القيمة ثنائية تامّة
    return (fl % 2 === 0 ? fl : fl + 1) / p; // النصف إلى الزوجي، بالإشارتين
  }
  // ما عدا ذلك: toFixed يُقرِّب من القيمة الثنائية **الدقيقة** لا من حاصل ضربٍ مُقرَّب، كبايثون.
  return Number(v.toFixed(d));
}

/**
 * `sum()` بايثون 3.12+ للأعداد العشرية حرفياً (جمع Neumaier المعوَّض، CPython `builtin_sum`): الخادم يجمع به
 * نسب `db.trade_stats`، والجمع المباشر هنا كان يقع على الجهة الأخرى من حدّ «.xx5» في ~3% من الدفاتر —
 * «2.89%» مفلتراً و«2.88%» بلا فلتر لنفس الصفقات.
 */
export function pySum(values: readonly number[]): number {
  let s = 0;
  let c = 0;
  for (const x of values) {
    const t = s + x;
    c += Math.abs(s) >= Math.abs(x) ? s - t + x : x - t + s;
    s = t;
  }
  return c !== 0 && Number.isFinite(c) ? s + c : s;
}

/** إحصاءات الدفتر بشكل ردّ الخادم (`db.trade_stats`) — نسبة النجاح وصافي/متوسط النتائج بالنسبة. */
export type JournalStats = {
  trade_count: number;
  win_rate: number;
  total_pnl_pct: number;
  avg_win: number;
  avg_loss: number;
  best: number;
  worst: number;
};

/**
 * إحصاءات الدفتر لقائمة صفقات (الدفتر مفلتراً على أداة) **بمعادلة الخادم نفسها** (`db.trade_stats`):
 * المغلقة ذات `pnl` منتهٍ فقط، الربح > 0 والتعادل يُعدّ خسارة (`<= 0`)، نسبة النجاح بخانة والبقيّة
 * بخانتين بتقريب بايثون (`roundHalfEven`). كانت محسوبة داخل اللوحة بلا اختبار — ورقمٌ يخالف ما يقوله
 * الخادم لنفس الصفقات (6.3% هنا و6.2% بلا فلتر) يجعل المتداول يشكّ بالدفتر كلّه.
 */
export function journalStats(
  trades: readonly { status: string; pnl?: number | string | null }[]
): JournalStats {
  const pnls = trades
    .filter((tr) => tr.status === 'closed' && tr.pnl != null && Number.isFinite(Number(tr.pnl)))
    .map((tr) => Number(tr.pnl));
  if (pnls.length === 0) {
    return { trade_count: 0, win_rate: 0, total_pnl_pct: 0, avg_win: 0, avg_loss: 0, best: 0, worst: 0 };
  }
  const wins = pnls.filter((v) => v > 0);
  const losses = pnls.filter((v) => v <= 0);
  const r2 = (v: number) => roundHalfEven(v, 2);
  return {
    trade_count: pnls.length,
    win_rate: roundHalfEven((wins.length / pnls.length) * 100, 1),
    total_pnl_pct: r2(pySum(pnls)),
    avg_win: wins.length ? r2(pySum(wins) / wins.length) : 0,
    avg_loss: losses.length ? r2(pySum(losses) / losses.length) : 0,
    best: r2(Math.max(...pnls)),
    worst: r2(Math.min(...pnls)),
  };
}

/**
 * سطر «إجمالي PnL: X%» **يعاكس المال** المعروف — فيُخفى. الخادم (`db.trade_stats`) يجمع نسب حركة السعر لكل صفقة
 * **بلا حجم**: صفقة 0.01 لوت +2% وصفقة 1 لوت −0.5% = «+1.5%» بينما المال −1,058 USD تقريباً؛ السطر يقول
 * ربحاً والحساب خاسر. true فقط حين يُعرف مال **كل** صفقة مغلقة (حجم معروف `knownLots` وأداة معروفة)، والمال
 * بكل عملة تسعير بالإشارة نفسها (صافٍ واضح الاتجاه بلا تحويل عملات)، وإشارة النسبة عكسها. غير ذلك false
 * والسطر كما كان — لا نخفي رقماً لا نملك ما يناقضه.
 */
export function pnlPctContradictsCash(
  trades: readonly {
    symbol: string;
    side: string;
    entry: number;
    exit?: number | null;
    size?: number | null;
    note?: string | null;
    status: string;
  }[],
  pct: number
): boolean {
  if (!Number.isFinite(pct) || pct === 0) return false;
  const byCcy = new Map<string, number>();
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'closed') continue;
    const lots = knownLots(tr.size, tr.note);
    if (lots == null || !finitePos(tr.exit)) return false;
    const side: TradeSide = tr.side === 'sell' ? 'sell' : 'buy';
    const cash = journalPnl({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit, lots });
    if (!cash) return false;
    // سنت الدولار دولارٌ ÷ 100: صفقة EURUSDC وصفقة EURUSD تُجمعان بعملة واحدة
    const usc = cash.ccy === 'USC';
    byCcy.set(usc ? 'USD' : cash.ccy, (byCcy.get(usc ? 'USD' : cash.ccy) ?? 0) + (usc ? cash.amount / 100 : cash.amount));
    n += 1;
  }
  if (n === 0) return false;
  // سنت واحد هامشاً: صافٍ 0.004 ليس «ربحاً» يُخفى لأجله شيء
  const sums = [...byCcy.values()].map((v) => (Math.abs(v) < 0.005 ? 0 : v));
  const cashSign = sums.every((v) => v >= 0) && sums.some((v) => v > 0)
    ? 1
    : sums.every((v) => v <= 0) && sums.some((v) => v < 0)
      ? -1
      : 0;
  return cashSign !== 0 && Math.sign(pct) !== cashSign;
}

/** +1.8R / −1R / 0R */
export function formatR(r: number | null): string | null {
  if (r == null || !Number.isFinite(r)) return null;
  const abs = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${abs}R`;
}

/**
 * النتيجة **العائمة** لصفقة ما تزال مفتوحة، من سعر السوق الآن: بالـpip، وبنسبة حركة السعر، وبالـR
 * حين يكون للصفقة وقفٌ مسجَّل.
 *
 * لماذا: سطر الصفقة المفتوحة بالدفتر كان يقول «▲ شراء EURUSD · 1.0850 (مفتوحة)» وحسب — الصفقات
 * التي عليها مالٌ **الآن** هي وحدها التي لا يقول عنها الدفتر شيئاً، بينما المغلقة (وقد انتهى أمرها)
 * يعرض لكلٍّ منها نقاطها ونسبتها ونتيجتها بالـR. والمتداول الذي سجّل خطته من الحاسبة يجد صفقته
 * مفتوحة بلا أيّ خبر عنها.
 *
 * لا رياضيات جديدة: `realizedMove` و`realizedR` تقيسان المسافة من الدخول إلى سعرٍ يُمرَّر، ولا
 * يعنيهما أهو سعر خروجٍ نُفِّذ أم سعر السوق الآن. فالفارق الوحيد هو من أين يأتي الرقم — وهذا يضمن
 * أن الصفقة المفتوحة والمغلقة تُقاسان بالمسطرة نفسها حرفياً، فلا يقفز الرقم عند الإغلاق.
 *
 * `null` لسعرٍ غير صالح (لا نخترع نتيجة من سعرٍ لا نملكه)، و`r` وحدها `null` بصفقة بلا وقف.
 */
export function floatingResult(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl?: number | null;
  current?: number | null;
  /**
   * ملاحظة الصفقة: علامة الوقف الأصلي «1R @ …» (`noteWithInitialStop`). بدونها كان صفّ الصفقة المفتوحة بعد شدّ الوقف
   * يعرض «+8R» ثم «+2R» لحظة الإغلاق (والتعادل بلا R أصلاً) — القفزة التي يَعِد هذا التعليق بمنعها.
   */
  note?: string | null;
}): { pips: number | null; pct: number; r: number | null } | null {
  const { symbol, side, entry, sl, current, note } = input;
  const mv = realizedMove({ symbol, side, entry, exit: current });
  if (!mv) return null;
  return { ...mv, r: realizedR({ symbol, side, entry, sl, exit: current, note }) };
}

/**
 * السعر الذي تُنفَّذ عليه الصفقة فعلاً من لقطة Bid/Ask: الفتح شراءً والإغلاق بيعاً على Ask، والعكس على Bid.
 * Bid/Ask غائبٌ أو غير صالح ⇒ السعر المفرد (`price`)؛ و`null` إن لم يصلح هو أيضاً.
 */
export function executionPrice(
  q: { price: number; bid?: number | null; ask?: number | null },
  side: TradeSide,
  action: 'open' | 'close' = 'open',
): number | null {
  const useAsk = (side === 'buy') === (action === 'open');
  const px = useAsk ? q.ask : q.bid;
  if (typeof px === 'number' && Number.isFinite(px) && px > 0) return px;
  return Number.isFinite(q.price) && q.price > 0 ? q.price : null;
}

/**
 * السعر الذي **يُغلَق عليه** صفّ الصفقة المفتوحة الآن — ليطابق الرقمُ العائم ما يسجّله «أغلق بسعر السوق» (`executionPrice(…, 'close')`):
 * شراء الذهب 1 لوت كان يعرض +500 USD بالسعر الوسطي، والإغلاق على Bid يسجّل +480.
 *
 * `live` تيكٌ حيّ بسعرٍ مفرد (لا Bid/Ask)، و`snap` لقطة التحميل بـBid/Ask. الإزاحة من سعر اللقطة إلى جهة الإغلاق (نصف السبريد
 * تقريباً) تُطبَّق على التيك: السبريد أبطأ حركةً من السعر، فهو من اللقطة والسعر من التيك.
 * الإزاحة تُهمَل (0) إن كانت اللقطة بلا Bid/Ask، أو Bid فوق Ask، أو بعكس اتجاه الإغلاق (Bid فوق السعر)، أو أكبر من 1% من السعر
 * (اقتباسٌ فاسد لا سبريد) — فيبقى السعر المفرد كما كان. `null` بلا أيّ سعر صالح.
 */
export function floatingExitPrice(input: {
  side: TradeSide;
  live?: number | null;
  snap?: { price: number; bid?: number | null; ask?: number | null } | null;
}): number | null {
  const { side, live, snap } = input;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const base = ok(live) ? live : snap && ok(snap.price) ? snap.price : null;
  if (base == null) return null;
  if (!snap || !ok(snap.price)) return base;
  if (ok(snap.bid) && ok(snap.ask) && snap.bid > snap.ask) return base;
  const exec = executionPrice(snap, side, 'close');
  let off = exec == null ? 0 : exec - snap.price;
  const wrongWay = side === 'buy' ? off > 0 : off < 0;
  if (wrongWay || Math.abs(off) > snap.price * 0.01) off = 0;
  const px = base + off;
  return px > 0 ? px : base;
}

/**
 * تبديل شراء⇄بيع بالدفتر **بعد** تعبئة «السعر الحالي»: الخانة تحمل Ask الشراء، والبيع يُنفَّذ على Bid —
 * فرق السبريد كاملاً بالدخول (2–3 pip على الرئيسية، وأكثر بالذهب) يُحسب خطأً بالنقاط وR والمال.
 * يعيد سعر الجهة الجديدة **من اللقطة نفسها** إن كانت الخانة ما زالت بنصّ التعبئة حرفياً وللأداة نفسها؛
 * وإلا `null` (كتب المتداول سعره بنفسه، أو غيّر الأداة — لا نلمس ما كتب).
 */
export function entryAfterSideSwitch(input: {
  entryText: string;
  symbol: string | null;
  side: TradeSide;
  filled: { symbol: string; text: string; q: { price: number; bid?: number | null; ask?: number | null } } | null;
}): number | null {
  const { entryText, symbol, side, filled } = input;
  if (!filled || symbol == null || filled.symbol !== symbol) return null;
  if (entryText.trim() !== filled.text) return null;
  return executionPrice(filled.q, side, 'open');
}

/**
 * الدخول بالدفتر ما زال **سعر أداةٍ أخرى** عبّأه «السعر الحالي»: الخانة بنصّ التعبئة حرفياً، والرمز المكتوب الآن
 * أداةٌ معروفة (مواصفات أو اسم مؤشر/سلعة معروف) غيرُ أداة التعبئة. حينها يُمسح الدخول.
 *
 * لماذا: «السعر الحالي» على EURUSD (1.08515) ثم شريحة GBPUSD ⇒ صفقة GBPUSD بدخول 1.08515 — تُحفظ بخروج 1.2700
 * «+1,848.5 pip · +9,242.50 USD · +17%»، وبلا خروج نتيجةً عائمة مختلَقة. ما كتبه المتداول بيده **لا يُمسّ**
 * (الدفتر يسجّل صفقات سابقة غالباً، وقد يكتب السعر قبل الرمز)، ولا يُمسح أثناء كتابة الرمز («GBPUS» غير معروفة
 * بعد) ولا بلاحقة الوسيط أو الاسم البديل للأداة نفسها («EURUSD.m»، «GOLD» ⇒ XAUUSD).
 */
export function liveEntryOrphaned(input: {
  entryText: string;
  symbol: string;
  filled: { symbol: string; text: string } | null;
}): boolean {
  const { entryText, symbol, filled } = input;
  if (!filled || entryText.trim() !== filled.text) return false;
  // أداة **معروفة** فقط: `journalSymbol` يقبل «GBPUS» رمزاً حرّاً أثناء الكتابة
  // حساب سنت/micro («GBPUSDC») بسعر زوجه العادي كـ`quoteSymbol`: كان `null` فلا يُمسح دخول EURUSD تحت صفقة GBPUSDC
  const now = smallContractPair(symbol) ?? instrumentSpec(symbol)?.symbol ?? knownSingleName(symbol);
  return now != null && now !== filled.symbol;
}

/**
 * صفقةٌ أُغلقت **في مكانٍ آخر** (جهاز آخر، أو اللوحة بنسخة ثانية) وما زالت «مفتوحة» بقائمةٍ حُمّلت قبلها: «أغلق بالسوق»
 * كان يكتب خروجاً جديداً فوق خروجها المسجَّل — والخادم (`close_trade`) لا يشترط `status='open'` — فيُستبدل +25 pip
 * أُغلقت عليها فعلاً بسعر اللحظة، مع الربح ووقت الإغلاق. قبل الإغلاق تُجلب القائمة: `true` = مغلقة فعلاً ⇒ لا يُكتب شيء.
 *
 * **غيابها عن القائمة ليس «مغلقة»**: القائمة آخر 200 صفقة (`backend/db.py` `LIMIT 200`)، فصفقة مفتوحة قديمة قد لا تكون
 * فيها — منعُ إغلاقها للأبد أسوأ من الثغرة. ولا تُمنع كذلك إن تعذّر الجلب (`null`): الإغلاق نفسه يفشل حينها برسالته.
 */
export function closedElsewhere(fresh: readonly { id: string; status: string }[] | null, id: string): boolean {
  const tr = fresh?.find((x) => x.id === id);
  return tr != null && tr.status !== 'open';
}

/**
 * هل تُكتب تسعيرة «السعر الحالي» بخانة دخول الدفتر حين يصل الردّ؟ الطلب يستغرق ثوانيَ والنموذج حيّ تحته، فتُكتب
 * فقط إن بقي كل ما يحدّد معناها كما كان لحظة النقرة: الرمز والجهة (`key`)، **ونصّ الدخول نفسه، والصفقة المفتوحة
 * للتعديل** (`editId`، null = صفقة جديدة).
 *
 * كان الفحص على الرمز والجهة وحدهما: نقرة «السعر الحالي» ثم «تعديل» على صفقة EURUSD شراء قديمة دخولها 1.0820 قبل
 * وصول الردّ ⇒ يكتب Ask الحالي (1.08515) فوق دخولها المسجَّل، والحفظ يعيد كتابة التاريخ (النقاط والربح وR كلها)، ولا
 * تُلحق ملاحظة «1R @» لأن الدخول «تغيّر». وكذلك سعرٌ كتبه المتداول بيده أثناء الطلب — ما كُتب باليد لا يُمحى بنقرة سابقة.
 */
export function liveFillStillValid(
  atTap: { key: string; entryText: string; editId: number | string | null },
  now: { key: string; entryText: string; editId: number | string | null }
): boolean {
  return atTap.key === now.key && atTap.entryText === now.entryText && atTap.editId === now.editId;
}

/**
 * «الدخول = السعر الحالي» بالحاسبة، حيث لا زرّ جهة: الجهة من موضع الوقف بالنسبة للسعر (تحته = شراء ⇒ Ask،
 * فوقه = بيع ⇒ Bid). بلا وقف صالح، أو وقف عند السعر نفسه، ⇒ السعر المفرد (لا نخمّن جهة).
 */
export function liveEntryForStop(
  q: { price: number; bid?: number | null; ask?: number | null },
  stop: number | null | undefined,
): number | null {
  return liveEntryQuote(q, stop)?.price ?? null;
}

/**
 * `liveEntryForStop` مع **مصدر** السعر: `quote` = 'ask'/'bid' حين أُخذ فعلاً من Ask الشراء/Bid البيع، و`null` حين
 * بقي الوسطي (بلا وقف، أو وقف عند السعر، أو Bid/Ask الجهة غائب فرجعنا للوسطي). `side` هي الجهة المستنتجة من الوقف.
 *
 * لماذا: حين يكشف الوقف المكتوب **بعد** التعبئة الجهةَ، ينتقل رقم الدخول وحده (1.0851 ⇒ 1.0852) وسطر «✓ الدخول من
 * السعر الحالي» يبقى كما هو — فيرى المتداول رقماً تغيّر بيده بلا سبب. السطر يسمّي الآن ما حدث («نُقل الدخول إلى Ask
 * (سعر شراء)»)، ولا يقوله إلا إن كان الرقم فعلاً من Ask/Bid — لا حين رجعنا للوسطي لغياب اللقطة.
 */
export function liveEntryQuote(
  q: { price: number; bid?: number | null; ask?: number | null },
  stop: number | null | undefined,
): { price: number; quote: 'ask' | 'bid' | null; side: TradeSide | null } | null {
  if (!(Number.isFinite(q.price) && q.price > 0)) return null;
  if (stop == null || !Number.isFinite(stop) || stop <= 0 || stop === q.price) return { price: q.price, quote: null, side: null };
  const side: TradeSide = stop < q.price ? 'buy' : 'sell';
  const px = side === 'buy' ? q.ask : q.bid;
  if (typeof px === 'number' && Number.isFinite(px) && px > 0) return { price: px, quote: side === 'buy' ? 'ask' : 'bid', side };
  return { price: q.price, quote: null, side };
}

/** نسب الهدف السريعة بالحاسبة والدفتر: ما يخطّط عليه متداول التجزئة فعلاً (1:1 تعادل، 1:2 القاعدة الشائعة). */
export const QUICK_RR = [1, 1.5, 2, 3] as const;

/**
 * شرائح الرموز السريعة الافتراضية للحاسبة والدفتر والاختبار الخلفي وتنبيهات المؤشرات: أكثر ما يفتحه متداول
 * الفوركس بالتجزئة (الرئيسية + الذهب + تقاطعا الإسترليني). كانت منسوخة حرفياً بأربع لوحات (QA6) — نسخةٌ
 * تتغيّر وحدها تجعل الحاسبة تقترح زوجاً لا يقترحه الدفتر.
 */
export const QUICK_SYMBOLS: readonly string[] = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP'];

/**
 * سعر الهدف الذي يعطي نسبة R:R معيّنة من دخولٍ ووقفٍ مكتوبين: `entry ± rr × |entry − sl|`.
 *
 * لماذا: المتداول يقرّر هدفه غالباً **بالنسبة** («1:2») لا بالسعر، فكان يحسب الرقم بيده من مسافة
 * الوقف ثم يكتبه — وهي بالضبط الخطوة التي تُكتب فيها منزلةٌ خاطئة فتنقلب الخطة (هدف 1.0950 بدل
 * 1.0905). الآن نقرة على «1:2» تكتب السعر.
 *
 * **التقريب بعيداً عن الدخول** لمنزلة الأداة (منزلة الـpipette، نفس `formatPrice`): وقف 25.3 pip
 * بنسبة 1.5 يعطي 37.95 pip — التقريب العادي قد يُنزلها 37.9 فتصير النسبة 1:1.498 **أقل** مما اختاره.
 * بعيداً عن الدخول تبقى النسبة ≥ المطلوبة دائماً، والفارق أقل من عُشر pip. (1:1 و1:2 و1:3 على
 * أسعار بمنزلة الـpipette تقع على سعرٍ دقيق أصلاً فلا يتحرّك شيء.) ضجيج الفاصلة العائمة يُنظَّف
 * قبل ذلك كي لا يدفع `ceil` سعراً دقيقاً منزلةً كاملة.
 *
 * رمزٌ بلا مواصفات (مؤشر/عملة رقمية): السعر بعشر خانات معنوية بلا قصّ لمنزلة.
 * `null` لمدخل غير صالح، أو وقف بالجهة الخطأ للاتجاه، أو هدف ناتج ≤ 0 (بيع بعيد على سعر صغير).
 */
export function targetAtRR(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl: number;
  rr: number;
}): number | null {
  const { side, entry, sl, rr } = input;
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(rr)) return null;
  const buy = side === 'buy';
  const risk = buy ? entry - sl : sl - entry;
  if (!(risk > 0)) return null;
  const raw = buy ? entry + rr * risk : entry - rr * risk;
  if (!(raw > 0)) return null;
  // سنت/micro («EURUSDC») بمنازل زوجه العادي — كانت شرائح 1:1…1:3 بالدفتر تُكتب بعشر خانات معنوية
  const spec = journalSpec(input.symbol);
  if (!spec) return Number(raw.toPrecision(10));
  const decimals = Math.round(-Math.log10(spec.pipSize)) + 1;
  const scale = 10 ** decimals;
  const scaled = Math.round(raw * scale * 1e6) / 1e6;
  const away = buy ? Math.ceil(scaled) : Math.floor(scaled);
  const out = Number((away / scale).toFixed(decimals));
  return out > 0 ? out : null;
}

/** مضاعفات «مستديرة» لمسافات الوقف بأزواج سعرُها بعيد عن الرئيسية — راجع `quickStopPips` */
const STOP_SCALES = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

/**
 * مسافات الوقف السريعة بالـpip لشرائح خانة الوقف بالدفتر، بحسب الأداة: pip الذهب 0.1 (20 pip = دولاران
 * فقط، أضيق من ضجيج دقيقة واحدة) فمسافاته أكبر؛ الفوركس والفضة بالمسافات المعتادة لمتداول التجزئة.
 * `[]` لرمز بلا مواصفات (مؤشر/عملة رقمية) — لا pip يُقاس به.
 *
 * بسعر الدخول (`entry`) تُقاس المسافات **نسبةً للسعر** للأزواج البعيدة عن الرئيسية: pip الـ0.0001 على
 * USDZAR (18.2) أو EURTRY (38) عُشرُ ما هو على EURUSD نسبةً للسعر، فـ«50 pip» هناك 0.03% — داخل السبريد
 * نفسه، وقفٌ يُضرب لحظة الفتح؛ والعكس على ZARJPY/MXNJPY (8.5) حيث pip الـ0.01 أكبر بعشر مرات فـ«10 pip»
 * وقفٌ أوسع من EURUSD بـ50 pip. المرجع EURUSD عند 1.10: `f = entry / pipSize / 11000`؛ الرئيسية والين
 * (f بين 0.4 و2.5 — AUDUSD 0.59، GBPNZD 1.9، GBPJPY 1.7) كما كانت حرفياً، وخارجها تُضرب المسافات بأقرب
 * مضاعف مستدير (لوغاريتمياً): USDZAR ×20 ⇒ 200/400/600/1000، ZARJPY ×0.1 ⇒ 1/2/3/5. المعادن بمرجع
 * معدنها (XAUUSD بين 1,000 و6,250 كما كانت حرفياً)، فـXAUJPY/XAGJPY ×100: وقف الذهب بالين 300–2,000 ين لا 3–20.
 */
export function quickStopPips(symbol: string, entry?: number | null): readonly number[] {
  // سنت/micro بمسافات زوجه العادي: «EURUSDC» كانت بلا شرائح وقف إطلاقاً
  const spec = journalSpec(symbol);
  if (!spec) return [];
  const base = spec.base === 'XAU' ? [30, 50, 100, 200] : [10, 20, 30, 50];
  if (!finitePos(entry)) return base;
  // المعدن بمرجع معدنه (الذهب 2500 بـpip الـ0.1، الفضة 30 بـpip الـ0.01): pip الـ0.1 نفسه على XAUJPY (352,000)
  // جعل «30 pip» وقفاً بثلاثة ين على ذهبٍ بـ352 ألف — يُضرب بالسبريد، ونتيجته +166R تقلب متوسط R للدفتر كلّه
  const ref = spec.base === 'XAU' ? 25000 : spec.base === 'XAG' ? 3000 : 11000;
  const f = entry / spec.pipSize / ref;
  if (f > 0.4 && f < 2.5) return base;
  let m: number = STOP_SCALES[0];
  for (const c of STOP_SCALES) if (Math.abs(Math.log(c / f)) < Math.abs(Math.log(m / f))) m = c;
  return base.map((p) => Number((p * m).toFixed(1)));
}

/**
 * سعر الوقف على بُعد `pips` من الدخول **بجهة الخسارة**: تحته للشراء، فوقه للبيع — بمنزلة الأداة
 * (`priceAtPipOffset`، نفس منزلة `formatPrice`).
 *
 * لماذا: المتداول يقرّر وقفه بالمسافة («20 نقطة») لا بالسعر، فكان يطرح بيده من الدخول ثم يكتب — وهي
 * الخطوة التي يقع فيها الطرح بالجهة الخطأ (وقف شراء فوق الدخول) أو بحجم pip خاطئ (0.0020 على زوج ين).
 * والمسافة الناتجة تُقرأ بعدها `pips` بالضبط بكل مسطرة بالتطبيق (`analyzePlan`، `slPipsFromPrices`)،
 * فالنتيجة بالـR والمخاطرة بالمال تُحسب من المسافة التي نُقرت حرفياً.
 *
 * `null` لرمز بلا مواصفات، أو دخول/مسافة غير صالحة، أو وقف ناتج ≤ 0.
 */
export function stopAtPips(input: { symbol: string; side: TradeSide; entry: number; pips: number }): number | null {
  const { side, entry, pips } = input;
  const spec = journalSpec(input.symbol);
  if (!spec || !finitePos(entry) || !finitePos(pips)) return null;
  return priceAtPipOffset(spec, entry, side === 'buy' ? -pips : pips);
}

/**
 * سعرا الوقف **للاتجاهين** من دخولٍ ومسافةٍ بالنقاط: تحت الدخول للشراء، فوقه للبيع (`stopAtPips`).
 *
 * لماذا: بالحاسبة يكتب المتداول وقفه بالنقاط («20») والدخول، ثم يضع الأمر بمنصّته — وهي تطلب **سعر**
 * الوقف، فكان يطرح بيده (0.0020 على زوج ين، أو بالجهة الخطأ). والاتجاه لا تعرفه الحاسبة إلا من سعر الوقف
 * نفسه، فبلا سعرٍ لا شرائح هدف بالنسبة ولا «سجّل الخطة». شريحتان «▲ شراء 1.0830 · ▼ بيع 1.0870» تكتب
 * إحداهما خانة سعر الوقف فيتقرّر الاتجاه بنقرة **يختارها** المتداول لا بتخمين.
 *
 * المسافة المقروءة بعدها بمسطرة حجم اللوت (`slPipsFromPrices`، للأعلى) **لا تقلّ** عن المكتوبة أبداً — وتساويها
 * لمسافة بعُشر pip — فالنقرة لا تُكبّر اللوت. `[]` لرمز بلا مواصفات أو مدخل غير صالح؛ جهةٌ يخرج وقفها ≤ 0
 * تسقط وحدها.
 */
export function stopsForPips(input: { symbol: string; entry: number; pips: number }): { side: TradeSide; price: number }[] {
  const { entry, pips } = input;
  const spec = instrumentSpec(input.symbol);
  if (!spec || !finitePos(entry) || !finitePos(pips)) return [];
  // **بعيداً عن الدخول** لمنزلة الـpipette، لا لأقربها (`stopAtPips`): «33.33» كانت تصير وقفاً على 33.3 —
  // أضيق من المكتوب، فلوتٌ أكبر من المخاطرة المختارة بعد النقرة. ضجيج الفاصلة يُنظَّف قبل floor/ceil.
  const decimals = Math.round(-Math.log10(spec.pipSize)) + 1;
  const scale = 10 ** decimals;
  return (['buy', 'sell'] as const).flatMap((side) => {
    const raw = side === 'buy' ? entry - pips * spec.pipSize : entry + pips * spec.pipSize;
    const scaled = Math.round(raw * scale * 1e6) / 1e6;
    const price = Number(((side === 'buy' ? Math.floor(scaled) : Math.ceil(scaled)) / scale).toFixed(decimals));
    return price > 0 ? [{ side, price }] : [];
  });
}

/**
 * شريحة «▲ شراء: الوقف …» بالحاسبة والدخول ما زال «السعر الحالي» الوسطي كما عُبّئ: الدخول يصير سعر الجهة
 * (Ask للشراء، Bid للبيع — `executionPrice`) **والوقف يُقاس منه** بالنقاط المكتوبة. لو قيس من الوسطي ثم نُقل
 * الدخول لجهته (`liveEntryForStop`) لصارت «20 pip» المكتوبة 20.5 بخانة النقاط بلا سبب يراه المتداول.
 * `null` لمدخل غير صالح.
 */
export function liveStopChip(input: {
  symbol: string;
  side: TradeSide;
  pips: number;
  q: { price: number; bid?: number | null; ask?: number | null };
}): { entry: number; stop: number } | null {
  const entry = executionPrice(input.q, input.side, 'open');
  if (entry == null) return null;
  const stop = stopsForPips({ symbol: input.symbol, entry, pips: input.pips }).find((x) => x.side === input.side);
  return stop ? { entry, stop: stop.price } : null;
}

/**
 * رمز الصفقة كما يُحفظ بالدفتر: أحرف كبيرة بلا مسافات ولا فواصل (`/` `-` `_`)، ثم 3–12 حرفاً/رقماً/نقطة.
 *
 * لماذا: «EUR/USD» و«eur usd» كانا يُحفظان كما كُتبا، فتنقسم إحصاءات الدفتر وشرائح فلتره إلى أداتين
 * («EUR/USD 3 · EURUSD 5») ولا يطابق الرمز زوجَ الشارت ولا اقتباس السعر عند «أغلق بالسوق». وأقل من 3
 * أحرف («EU») أو أكثر من 12 يرفضه الخادم (`TradeCreate.symbol` بطول 3–12) برسالة «تعذّر الإضافة» العامة
 * بعد رحلة شبكة — الآن يُقال «أدخل رمزاً وسعر دخول» فوراً. الأرقام والنقطة مسموحة (US30، NAS100،
 * رموز وسطاء بلاحقة) — الدفتر يسجّل ما يتداوله المتداول لا ما يحسبه التطبيق فقط.
 *
 * `null` = رمز غير صالح للحفظ.
 *
 * **لاحقة الوسيط تُحفظ كما كُتبت** حين تُعرف الأداة (`instrumentSpec`): حذف `-`/`_` من الرمز كلّه كان
 * يحوّل «GBPJPY-ECN» إلى «GBPJPYECN» و«EURUSD_PRO» إلى «EURUSDPRO» — رمزٌ ملاصق لا تقبله
 * `instrumentSpec` (قد يكون أداة أخرى، كـ«EURUSDT»)، فتُحفظ الصفقة **بلا نقاط ولا R ولا مخاطرة بالمال**
 * بصمت. و«USDJPY#» كانت تُرفض كلياً («#» خارج الأحرف المسموحة). الزوج نفسه يُطبَّع («gbp/jpy-ecn» ⇒
 * «GBPJPY-ECN») والحدّ 12 مضمون: 6 + فاصل + 5 على الأكثر.
 *
 * **والمؤشرات/السلع بلاحقة وسيط** كذلك حين يبقى بعدها اسمٌ معروف (`knownSingleName`): «GOLD#» و«US30#»
 * كانت تُرفض («#» خارج الأحرف — والخادم يقبلها: `TradeCreate.symbol` طول فقط)، و«us30-ecn» كانت تُحفظ
 * «US30ECN» فتضيع اللاحقة ومعها سعر السوق (`quoteSymbol` لا يعرف «US30ECN»). الآن «GOLD#»، «US30-ECN».
 * الشرطة **داخل** الاسم («US-30») تبقى فاصلاً يُحذف ⇒ «US30»؛ الاسم المجهول («AAPL#») يُرفض كما كان.
 */
export function journalSymbol(raw: string): string | null {
  const up = raw.trim().toUpperCase();
  const spec = instrumentSpec(up);
  const pair = /^([A-Z]{3})[\s/_-]*([A-Z]{3})(.*)$/.exec(up);
  if (spec && pair && pair[1] + pair[2] === spec.symbol) return spec.symbol + pair[3];
  // «EURUSD-cent»/«EURUSD_micro» تبقى بلاحقتها: حذف الفاصل كان يُخرج «EURUSDCENT» فتضيع النقاط وسعر السوق
  const small = smallContractPair(up);
  if (small && pair && pair[1] + pair[2] === small && pair[3].length <= 6) return small + pair[3];
  const known = knownSingleName(up);
  const suffixed = known ? /^(.*?)([.\-_#+][A-Z0-9]{0,5})$/.exec(up.replace(/[\s/]/g, '')) : null;
  if (known && suffixed && suffixed[1].replace(/[-_]/g, '') === known && (known + suffixed[2]).length <= 12)
    return known + suffixed[2];
  const s = raw.toUpperCase().replace(/[\s/_-]/g, '');
  return /^[A-Z0-9.]{3,12}$/.test(s) ? s : null;
}

/**
 * الرمز الذي يُطلب به **سعر السوق** لصفقة بالدفتر: الأداة القانونية حين تُعرف مواصفاتها (لاحقة الوسيط
 * تسقط — `instrumentSpec`)، وإلا الرمز كما يُحفظ (`journalSymbol`: US30، NAS100…).
 *
 * لماذا: الدفتر يحفظ «XAUUSD.M» و«EURUSDM» كما نسخها المتداول من منصّته (عمداً)، لكن مزوّد الأسعار لا
 * يعرف إلا «XAUUSD» — فكانت الصفقة المفتوحة بلاحقة **بلا نتيجة عائمة**، و«أغلق بسعر السوق» يقول «لا
 * سعر حيّ» عنها، و«الدخول = السعر الحالي» كذلك، بينما الصفقة نفسها بلا لاحقة بجانبها تعمل كاملة.
 * وتيكات الشاشة مفتاحها الرمز القانوني أيضاً، فالمفتاح نفسه يخدم الطبقتين.
 *
 * والمؤشرات/السلع بلاحقة وسيط كذلك (`knownSingleName`): «USOIL.m» كانت تطلب «USOIL.M» فلا نتيجة عائمة
 * ولا «أغلق بسعر السوق»، والمزوّد يعرف «USOIL». الاسم المجهول («AAPL.US») يبقى كما يُحفظ.
 *
 * `null` = رمز لا يصلح للحفظ أصلاً.
 */
export function quoteSymbol(raw: string): string | null {
  return smallContractPair(raw.trim().toUpperCase()) ?? instrumentSymbol(raw);
}

/**
 * الأداة القانونية بلا باب السنت — أساس `quoteSymbol` و`journalInstrumentKey`.
 *
 * **حساب السنت** («EURUSDc» تُحفظ «EURUSDC») يُسعَّر كالزوج العادي تماماً، فـ`quoteSymbol` يطلب «EURUSD»: كان
 * يطلب «EURUSDC» التي لا يعرفها المزوّد فلا نتيجة عائمة ولا «أغلق بسعر السوق» ولا «الدخول = السعر الحالي» —
 * والنقاط تُحسب لها أصلاً (`journalPipSize`). لكن **مفتاح الأداة يبقى منفصلاً**: عقد السنت أصغر بمئة مرّة
 * ومالها غير معروف، فدمجها مع «EURUSD» كان سيُسقط صافي EURUSD بالمال (`netByInstrument`).
 */
function instrumentSymbol(raw: string): string | null {
  // «GOLD.c»/«XAUUSD_cent» كانت تُدمج مع «XAUUSD» عبر `knownSingleName` (اسمٌ معروف قبل اللاحقة) فتُسقط صافيه بالمال.
  // ومفتاحٌ واحد لكل كتابات السنت/micro للزوج نفسه: «EURUSD.c» و«EURUSDc» و«EURUSD-cent» كانت ثلاث شرائح وثلاثة صوافٍ
  // لأداة واحدة (كـ«XAUUSD.m»/«XAUUSD» قبل دمجهما) — النقاط بمواصفات الزوج العادي للكل، ولا مال يُخلط.
  const cent = centAccountSymbol(raw);
  if (cent) return `${cent}C`;
  const micro = smallContractPair(raw);
  if (micro) return `${micro}MICRO`;
  return instrumentSpec(raw)?.symbol ?? knownSingleName(raw) ?? journalSymbol(raw);
}

/**
 * مفتاح **الأداة** لصفقة بالدفتر — لشرائح الفلتر وصافي كل أداة: الرمز القانوني حين تُعرف مواصفاته
 * (`quoteSymbol`: «XAUUSD.m»، «xauusd»، «XAUUSDm» ⇒ «XAUUSD»)، وإلا الرمز كما يُحفظ بحروف كبيرة
 * (US30، NAS100)، و«» لرمز فارغ.
 *
 * لماذا: المفتاح كان الرمز كما يُحفظ، فمن ينسخ «XAUUSD.m» من منصّته مرّة ويكتب «XAUUSD» بيده مرّة يرى
 * **أداتين**: شريحتان، وصافيان منفصلان («XAUUSD +40 · XAUUSD.M −55») بدل صافٍ واحد «−15» هو ما يسأل عنه
 * — والفلتر على «XAUUSD» يُخفي نصف صفقات الذهب فتُحسب نسبة نجاحه ومتوسط R من نصفها. النقاط والمال
 * تُحسب أصلاً بمواصفات الرمز القانوني (`instrumentSpec` يُسقط اللاحقة)، فالجمع لا يخلط وحدتين.
 *
 * **المؤشرات والسلع بلاحقة وسيط** كذلك: «US30.cash» و«US30Cash» (XM) و«US30» كانت ثلاث شرائح لأداة
 * واحدة. تُدمج فقط إن بقي بعد اللاحقة اسمٌ معروف (`knownSingleName` — القاعدة نفسها لتحذير الأخبار)؛
 * «US30M» أو «AAPL.US» تبقى كما كُتبت. الأسماء البديلة (GER40/DE40) لا تُدمج: قد تكون عقدين مختلفين.
 */
export function journalInstrumentKey(raw: string | null | undefined): string {
  const up = (raw || '').trim().toUpperCase();
  if (!up) return '';
  return instrumentSymbol(up) ?? up;
}

/**
 * حجم صفقة الدفتر **المعروف** باللوت، أو `null` إن لم يُعرف.
 *
 * الخادم يضع 1 لصفقة سُجِّلت بلا حجم، فالدفتر يعامل 1 كـ«غير معروف» — لكن 1.00 لوت حجمٌ حقيقي شائع،
 * والحاسبة تُخرجه بالضبط (10,000 USD، 1%، وقف 10 pip على EURUSD) فتُسجَّل الخطة بـ1 ثم يخفي الدفتر حجمها
 * ونتيجتها بالمال، ويُسقط صافي الأداة كلّها بالمال. «سجّل الخطة» يكتب الحجم بالملاحظة أيضاً
 * (`planJournalNote`: «1.00 lot · risk …») — فملاحظةٌ تبدأ بـ«1.00 lot» بهذا الشكل حرفياً تشهد أن 1 رقمٌ
 * كُتب لا افتراض. غير ذلك 1 يبقى مجهولاً كما كان (لا تخمين من ملاحظة كتبها المتداول بيده).
 */
export function knownLots(size: number | null | undefined, note?: string | null): number | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return null;
  if (size !== 1) return size;
  return typeof note === 'string' && /^1\.00 lot( ·|$)/.test(note) ? 1 : null;
}

/**
 * الملاحظة المحفوظة حين **كتب** المتداول الحجم 1 بيده: تُسبق بـ«1.00 lot» (العلامة التي يقرؤها `knownLots`) إن
 * لم تكن فيها. غير 1 (أو بلا حجم) ⇒ الملاحظة كما هي.
 *
 * لماذا: الخادم يحفظ 1 لصفقة بلا حجم، فالحجم 1 المكتوب باليد كان «مجهولاً»: EURUSD 1.0850 ⇒ 1.0875 بلوت واحد تُعرض
 * بلا «1 lot» ولا «+250.00 USD»، ويسقط صافي EURUSD بالمال كلّه، ولا تُقترح 1.00 شريحةً، وتفتح بالتعديل بخانة حجم فارغة.
 */
export function noteWithTypedSize(size: number | null | undefined, note: string): string {
  if (size !== 1 || knownLots(1, note) === 1) return note;
  const n = note.trim();
  const out = n ? `1.00 lot · ${n}` : '1.00 lot';
  // كـ`noteWithInitialStop`: ملاحظة 495 حرفاً + العلامة (11) تتجاوز حدّ الخادم فيُرفض الحفظ كلّه (422) — حجمٌ مجهول أهون
  return out.length > JOURNAL_NOTE_MAX ? note : out;
}

/**
 * عقد اللوت لرمزٍ بالدفتر: `small` لحساب سنت/micro (لوتٌ = 1,000 وحدة، `smallContractPair`)، وإلا `std` — رمزٌ عادي أو
 * مجهول أو فارغ (لوت الحساب العادي هو الافتراض بكل الدفتر).
 */
export function journalContractKind(symbol: string | null | undefined): 'std' | 'small' {
  const up = (symbol || '').trim().toUpperCase();
  return up && !instrumentSpec(up) && smallContractPair(up) ? 'small' : 'std';
}

/**
 * حجم صفقة سنت/micro بلوت الحساب العادي لسطر `riskCalcSmallLotsStdEquiv` تحت خانة الحجم («4 = 0.04 لوت بالحساب
 * العادي») — الحاسبة تعرضه منذ حسبت لوت السنت، والدفتر لا: «4» لـ«EURUSDC» ثم نقرة على شريحة «EURUSD» تبقي «4»
 * (مئة ضعف) بلا ما يذكّر بمعناها. `null` = لا سطر: رمزٌ عادي/مجهول، حجمٌ غير صالح، أو فوق `MAX_SMALL_LOTS` (يعرض
 * سطر الوحدات بدله، `journalSizeLooksLikeUnits`).
 */
export function journalSmallLotsStdEquiv(size: number | null | undefined, symbol: string | null | undefined): string | null {
  if (journalContractKind(symbol) !== 'small') return null;
  if (size == null || !Number.isFinite(size) || size <= 0 || size > MAX_SMALL_LOTS) return null;
  return smallLotsStdEquiv(size);
}

/**
 * حجمٌ كُتب لرمز سنت/micro ثم تبدّل الرمز إلى عقدٍ عادي معروف (`journalSizeFromSmallFix`): «4» لـ«EURUSDC» = 0.04 لوت عادي،
 * وبعد شريحة «EURUSD» تبقى «4» بالخانة = **4 لوت عادي** — مئة ضعف، وسطر «= 0.04» يختفي مع الرمز فلا شيء يذكّر. `std` =
 * `smallLotsStdEquiv(size)` تُقترح بنقرة. `typedFor` = الرمز الذي كُتب له الحجم (آخر كتابة/شريحة/تعديل). `null` = لا سطر:
 * العقد لم يتبدّل من صغير إلى عادي، الرمز الحالي مجهول (وسط الكتابة «EURUS»)، أو الحجم غير صالح/فوق `MAX_SMALL_LOTS`.
 */
export function journalSizeFromSmall(
  size: number | null | undefined,
  typedFor: string | null | undefined,
  symbol: string | null | undefined,
): { std: string; prev: string } | null {
  if (journalSmallLotsStdEquiv(size, typedFor) == null) return null;
  const up = (symbol || '').trim().toUpperCase();
  if (!instrumentSpec(up)) return null;
  return { std: smallLotsStdEquiv(size!), prev: (typedFor || '').trim().toUpperCase() };
}

/**
 * آخر أحجام اللوت **المختلفة** التي سجّلها المتداول (الأحدث أولاً، `max` على الأكثر) — شرائح بخانة الحجم
 * بنموذج الدفتر.
 *
 * لماذا: أغلب متداولي التجزئة يكرّرون حجماً أو اثنين («0.10» و«0.50») بكل صفقة، وكانت الخانة تُكتب
 * بيدٍ كل مرّة — وهي خانة المال: «5» بدل «0.5» صفقةٌ بعشرة أضعاف حجمها تُحفظ بصمت. الأحجام من صفقات
 * المتداول نفسه، فالشريحة لا تقترح رقماً لم يكتبه قط.
 *
 * `trades` بترتيب الخادم (الأحدث تسجيلاً أولاً). الحجم المعروف وحده (`knownLots`: الـ1 الافتراضي بالخادم
 * لا يُقترح)، على خطوة اللوت (0.01) بالضبط كي يطابق نصّ الشريحة «0.50» القيمة المحفوظة، ولا يتجاوز
 * `MAX_SANE_LOTS` (100000 كُتبت وحداتٍ لا لوتاً — لا تُقترح لتتكرّر).
 */
export function recentLotSizes(
  trades: readonly { size?: number | null; note?: string | null; symbol?: string | null }[],
  max = 3,
  forSymbol?: string | null
): number[] {
  /**
   * `forSymbol`: الشرائح من صفقات **العقد نفسه** فقط (`journalContractKind`). لوت السنت/micro أصغر بمئة مرّة: آخر صفقة
   * «EURUSDC» بـ4.00 كانت تُقترح «4.00» لصفقة «EURUSD» — مركزٌ بمئة ضعف بنقرة (مخاطرة 25 pip = 1,000 USD لا 10).
   * غائب = كل الصفقات كما كان.
   */
  const want = forSymbol == null ? null : journalContractKind(forSymbol);
  const cap = want === 'small' ? MAX_SMALL_LOTS : MAX_SANE_LOTS;
  const out: number[] = [];
  for (const tr of trades) {
    if (out.length >= max) break;
    if (want != null && journalContractKind(tr.symbol) !== want) continue;
    const lots = knownLots(tr.size, tr.note);
    if (lots == null || lots > cap) continue;
    const steps = Math.round(lots / LOT_STEP);
    if (steps < 1 || Math.abs(lots / LOT_STEP - steps) > 1e-6) continue;
    const v = Math.round(steps * LOT_STEP * 100) / 100;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * شرائح الرمز بنموذج الدفتر: الأدوات التي يتداولها المتداول **فعلاً** أولاً (الأكثر صفقاتٍ، ثم الأحدث)
 * بالكتابة التي سجّلها آخر مرّة، ثم تكملة من `defaults` حتى `max`.
 *
 * لماذا: الشرائح كانت قائمة ثابتة (EURUSD، GBPUSD، USDJPY، XAUUSD…) — فمن يتداول «XAUUSD.m» أو «US30» أو
 * «AUDCAD» عند وسيطه يكتب الرمز بيده بكل صفقة، وهي الخانة التي تنقسم بها الأداة («XAUUSD» مرّة و«XAUUSD.m»
 * مرّة) أو يُكتب فيها زوجٌ آخر. الرمز من صفقاته هو، فالشريحة لا تقترح أداةً لم يكتبها قط.
 *
 * الأداة الواحدة شريحة واحدة (`journalInstrumentKey`: «XAUUSD.m» تحلّ محلّ «XAUUSD» الافتراضية لا بجانبها)،
 * بالكتابة **الأحدث** لها (`trades` بترتيب الخادم، الأحدث أولاً) — لو غيّر وسيطه تتبعه الشريحة. آخر
 * `scan` صفقة فقط كي لا تحجز أداةٌ تُركت منذ شهور مكاناً. رمزٌ لا يصلح للحفظ (`journalSymbol`) يُتخطّى.
 */
export function quickJournalSymbols(
  trades: readonly { symbol?: string | null }[],
  defaults: readonly string[],
  max = 6,
  scan = 100
): string[] {
  const seen = new Map<string, { text: string; n: number; first: number }>();
  trades.slice(0, scan).forEach((tr, i) => {
    const text = journalSymbol(tr.symbol ?? '');
    if (!text) return;
    const key = journalInstrumentKey(text);
    const cur = seen.get(key);
    if (cur) cur.n += 1;
    else seen.set(key, { text, n: 1, first: i });
  });
  const out = [...seen.values()]
    .sort((a, b) => b.n - a.n || a.first - b.first)
    .slice(0, max)
    .map((x) => x.text);
  const keys = new Set(out.map((x) => journalInstrumentKey(x)));
  for (const d of defaults) {
    if (out.length >= max) break;
    const text = journalSymbol(d);
    if (!text || keys.has(journalInstrumentKey(text))) continue;
    keys.add(journalInstrumentKey(text));
    out.push(text);
  }
  return out;
}

/**
 * صافي الصفقات المغلقة **لكل أداة**: النقاط، وعددها، والمال بعملة التسعير — لسطر «صافي النقاط» بالدفتر.
 *
 * النقاط تُجمع لكل أداة على حدة (pip الذهب ليس pip اليورو)، وكانت تُجمع داخل اللوحة بلا اختبار. والمال
 * كان غائباً: سطر الإحصاءات يقول «EURUSD +25» ويسكت عن «+125.00 USD» بينما كل صفّ بالقائمة يقوله
 * (`pnlInQuoteCcy`). بعملة التسعير لأنها واحدة للأداة الواحدة دائماً (EURUSD بالدولار، USDJPY بالين) فتُجمع
 * بلا سعر تحويل، ولا تُجمع أداتان بعملتين مختلفتين أبداً.
 *
 * **المال كلّه أو لا شيء**: إن كانت بين صفقات الأداة صفقةٌ بلا حجم معروف (الحجم 1 قيمة الخادم الافتراضية —
 * نفس قاعدة سطر الصفقة) فالمال `null` للأداة كلها — مجموعٌ جزئي يُقرأ كأنه الصافي كله فيضلّل أكثر من غيابه.
 * المفتوحة والمغلقة بلا خروج صالح لا تُحسب؛ ورمزٌ بلا مواصفات (US30…) بلا نقاط فلا يدخل.
 *
 * المفتاح `journalInstrumentKey` (كشرائح الفلتر نفسها — «XAUUSD.m» و«XAUUSD» أداة واحدة)، والترتيب: الأكثر صفقاتٍ أولاً ثم أبجدياً. المجاميع مقرَّبة
 * متماثلاً حول الصفر (النقاط لعُشر، والمال لسنت) بلا «−0».
 */
export function netByInstrument(
  trades: readonly {
    symbol: string;
    side: string;
    entry: number;
    exit?: number | null;
    size?: number | null;
    note?: string | null;
    status: string;
  }[]
): { symbol: string; n: number; pips: number; cash: { amount: number; ccy: string } | null }[] {
  const acc = new Map<string, { n: number; pips: number; cash: number; ccy: string | null; cashOk: boolean }>();
  for (const tr of trades) {
    if (tr.status !== 'closed') continue;
    const side: TradeSide = tr.side === 'sell' ? 'sell' : 'buy';
    const mv = realizedMove({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit });
    if (mv?.pips == null) continue;
    const key = journalInstrumentKey(tr.symbol) || '—';
    const cur = acc.get(key) ?? { n: 0, pips: 0, cash: 0, ccy: null, cashOk: true };
    cur.n += 1;
    cur.pips += mv.pips;
    const lots = knownLots(tr.size, tr.note);
    const cash =
      lots != null && tr.exit != null
        ? journalPnl({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit, lots })
        : null;
    if (cash && (cur.ccy == null || cur.ccy === cash.ccy)) {
      cur.cash += cash.amount;
      cur.ccy = cash.ccy;
    } else cur.cashOk = false;
    acc.set(key, cur);
  }
  return [...acc.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
    .map(([symbol, v]) => ({
      symbol,
      n: v.n,
      pips: roundAway(v.pips, 1),
      cash: v.cashOk && v.ccy ? { amount: roundAway(v.cash, 2), ccy: v.ccy } : null,
    }));
}

/**
 * سطر الصافي **بلا اسم أداة** («الصافي: +25 pip · +125.00 USD») صادقٌ فقط حين كل صفقة مغلقة معروضة داخلة فيه:
 * أداةٌ واحدة بـ`netByInstrument` **وعددها = كل المغلقة بخروج صالح**. غير ذلك يُكتب بالاسم («الصافي لكل أداة: EURUSD +25 …»).
 *
 * لماذا: دفترٌ بلا فلتر فيه EURUSD رابحة (+125 USD) وUS30 خاسرة (بلا مواصفات pip فلا تدخل الصافي) كان يقول
 * «الصافي: +25 pip · +125.00 USD» بلا رمز — يُقرأ صافي الدفتر كلّه والحساب خاسر.
 */
export function netLineIsWhole(
  trades: readonly { status: string; exit?: number | null }[],
  ranked: readonly { n: number }[]
): boolean {
  if (ranked.length !== 1) return false;
  const closed = trades.filter(
    (tr) => tr.status === 'closed' && typeof tr.exit === 'number' && Number.isFinite(tr.exit) && tr.exit > 0
  ).length;
  return ranked[0]!.n === closed;
}

/**
 * عدد الصفقات **المفتوحة** بلا وقفٍ صالح (غائب، صفر، سالب، غير رقم) — لسطر `journalOpenRiskNoStop` «صفقات مفتوحة بلا وقف: {n}»
 * الذي يقول لماذا غاب سطر «المخاطرة (مفتوحة)» بدل الصمت. الشرط نفسه الذي يُرجع به `openRiskTotals` ‏`null`، فلا يظهر
 * السطران معاً. المغلقة لا تُعدّ (وقفها لم يعد خطراً).
 */
export function openTradesWithoutStop(trades: readonly { sl?: number | null; status: string }[]): number {
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'open') continue;
    const sl = tr.sl;
    if (typeof sl !== 'number' || !Number.isFinite(sl) || sl <= 0) n += 1;
  }
  return n;
}

/**
 * **المخاطرة المفتوحة الآن**: مجموع المال بين الدخول والوقف لكل الصفقات المفتوحة المعروضة، لكل عملة تسعير — لسطر
 * «المخاطرة (مفتوحة): 150.00 USD · 12,000 JPY» بالدفتر. أربع صفقات بـ1% لكلٍّ هي 4% من الحساب معرَّضة معاً، والدفتر
 * كان يقول مخاطرة كل صفقة وحدها (`journalRisk`) ويسكت عن المجموع — الرقم الذي يُسأل قبل فتح الخامسة.
 *
 * - **وقفٌ بجهة الربح أو على الدخول** (شراء بوقف ≥ الدخول، بيع بوقف ≤ الدخول — وقفٌ نُقل للتعادل أو يحجز ربحاً):
 *   مخاطرته 0، لا `|الدخول − الوقف|` الذي يعدّ الربح المحجوز خسارةً محتملة.
 * - **الكلّ أو لا شيء** (كـ`netByInstrument`): صفقة مفتوحة بلا وقف (مخاطرتها بلا حدّ)، أو بحجم مجهول (`knownLots`)،
 *   أو أداة بلا مواصفات ⇒ `null` كلّه. مجموعٌ جزئي يُقرأ «هذا كل ما أخاطر به» وهو أقلّ من الحقيقة.
 * - عملاتٌ مختلفة لا تُجمع (الدفتر لا يعرف سعر التحويل) — عنصرٌ لكل عملة، الأكبر عدداً أولاً ثم أبجدياً.
 * - `null` أيضاً حين لا صفقة مفتوحة. المبالغ مقرَّبة لسنت.
 */
export function openRiskTotals(
  trades: readonly {
    symbol: string;
    side: string;
    entry: number;
    sl?: number | null;
    size?: number | null;
    note?: string | null;
    status: string;
  }[]
): { n: number; totals: { amount: number; ccy: string }[] } | null {
  const acc = new Map<string, { amount: number; n: number }>();
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'open') continue;
    n += 1;
    const lots = knownLots(tr.size, tr.note);
    const sl = tr.sl;
    if (lots == null || typeof sl !== 'number' || !Number.isFinite(sl) || sl <= 0) return null;
    if (!Number.isFinite(tr.entry) || tr.entry <= 0) return null;
    const side: TradeSide = tr.side === 'sell' ? 'sell' : 'buy';
    const locked = side === 'buy' ? sl >= tr.entry : sl <= tr.entry;
    // المحجوز: نتيجةٌ بخروجٍ على الدخول نفسه = 0 بعملة الأداة (وتُثبت أن الأداة معروفة)
    const r = locked
      ? journalPnl({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.entry, lots })
      : journalRisk({ symbol: tr.symbol, entry: tr.entry, sl, lots });
    if (!r) return null;
    const cur = acc.get(r.ccy) ?? { amount: 0, n: 0 };
    cur.amount += locked ? 0 : r.amount;
    cur.n += 1;
    acc.set(r.ccy, cur);
  }
  if (n === 0) return null;
  return {
    n,
    totals: [...acc.entries()]
      .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
      .map(([ccy, v]) => ({ amount: Math.round(v.amount * 100 + 1e-7) / 100, ccy })),
  };
}

/**
 * **تعرّض العملات** للصفقات المفتوحة: صافي كل عملة بوحداتها هي — لسؤال «هل صفقاتي الثلاث رهانٌ واحد؟».
 * شراء EURUSD + شراء GBPUSD + بيع USDJPY تبدو ثلاث أفكار، وهي ثلاث مرّات **بيع الدولار**: تقرير أمريكي واحد
 * يضرب الثلاث معاً، ومخاطرة 1% لكلٍّ هي عملياً 3% على خبرٍ واحد.
 *
 * كل صفقة ساقان: الأساس بـ`± lots × contractSize`، والتسعير بعكسه `∓ lots × contractSize × entry` (شراء EURUSD 1 لوت
 * على 1.1000 = +100,000 EUR و−110,000 USD). بوحدات العملة نفسها لأن جمع عملتين يحتاج سعر تحويل لا يملكه الدفتر.
 * الذهب/الفضة «عملة» XAU/XAG بالأونصة. سنت/micro بعقد ÷ 100 (`journalSpec` للزوج العادي).
 *
 * - `legs` عدد الصفقات التي تمسّ العملة، و`sameWay` = كلّها بالاتجاه نفسه (تراكم لا تحوّط) — ما يستحق التنبيه
 *   هو `legs ≥ 2 && sameWay`. صافٍ صفريّ تماماً (تحوّط كامل) يبقى عنصراً بـ`units: 0` و`sameWay: false`.
 * - **الكلّ أو لا شيء** (كـ`openRiskTotals`): مفتوحة بحجم مجهول أو أداة بلا مواصفات أو دخول غير صالح ⇒ `null`.
 *   تعرّضٌ جزئي يُقرأ «هذا كلّ ما عليّ من الدولار» وهو أقلّ منه.
 * - `null` حين لا صفقة مفتوحة. الترتيب: الأكثر سيقاناً أولاً ثم أبجدياً. الوحدات مقرَّبة لوحدة كاملة بلا «−0».
 */
export function openCurrencyExposure(
  trades: readonly {
    symbol: string;
    side: string;
    entry: number;
    size?: number | null;
    note?: string | null;
    status: string;
  }[]
): { ccy: string; units: number; legs: number; sameWay: boolean }[] | null {
  const acc = new Map<string, { units: number; legs: number; long: number; short: number }>();
  const add = (ccy: string, units: number) => {
    const cur = acc.get(ccy) ?? { units: 0, legs: 0, long: 0, short: 0 };
    cur.units += units;
    cur.legs += 1;
    if (units > 0) cur.long += 1;
    else cur.short += 1;
    acc.set(ccy, cur);
  };
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'open') continue;
    n += 1;
    const lots = knownLots(tr.size, tr.note);
    const spec = journalSpec(tr.symbol);
    if (lots == null || !spec || !finitePos(tr.entry)) return null;
    const small = !instrumentSpec(tr.symbol.trim().toUpperCase());
    const baseUnits = (lots * spec.contractSize) / (small ? 100 : 1);
    const sign = tr.side === 'sell' ? -1 : 1;
    add(spec.base, sign * baseUnits);
    add(spec.quote, -sign * baseUnits * tr.entry);
  }
  if (n === 0) return null;
  return [...acc.entries()]
    .sort((a, b) => b[1].legs - a[1].legs || a[0].localeCompare(b[0]))
    .map(([ccy, v]) => {
      const units = Math.round(v.units) || 0;
      return { ccy, units, legs: v.legs, sameWay: units !== 0 && (v.long === 0 || v.short === 0) };
    });
}

/**
 * عملاتٌ تراهن عليها **صفقتان مفتوحتان أو أكثر بالاتجاه نفسه** — لسطر `journalExposureStacked` بالدفتر.
 * شراء EURUSD + شراء GBPUSD + بيع USDJPY = ثلاث صفقات «مختلفة» كلّها بيعٌ للدولار: خبرٌ أمريكي واحد يضربها معاً.
 *
 * اتجاهٌ فقط لا حجم (بخلاف `openCurrencyExposure`): الصفقة المسجَّلة بلا حجم (الخادم يخزّن 1) ما زالت تراهن
 * بالاتجاه نفسه، فلا يُسكت حجمٌ مجهول التحذير. أداة بلا مواصفات (مؤشرات، نفط، كريبتو) تُتخطّى — لا ساق عملة
 * تُنسب لها، والعدّ «n صفقات بالاتجاه نفسه» يبقى صادقاً. أيّ ساقٍ معاكسة على العملة ⇒ تحوّط لا تراكم ⇒ لا سطر.
 * مجموعة الصفقات نفسها على عملتين (EURUSD ×2 ⇒ EUR وUSD) تُذكر مرّة واحدة — بالعملة التي هي أساسها.
 */
export function stackedCurrencyExposure(
  trades: readonly { id?: string | number; symbol: string; side: string; status: string }[]
): { ccy: string; n: number; dir: 'long' | 'short' }[] {
  const acc = new Map<string, { idx: number[]; long: number; short: number; asBase: number }>();
  trades.forEach((tr, i) => {
    if (tr.status !== 'open') return;
    const spec = journalSpec(tr.symbol?.trim().toUpperCase());
    if (!spec) return;
    const buy = tr.side !== 'sell';
    const leg = (ccy: string, long: boolean, base: boolean) => {
      const cur = acc.get(ccy) ?? { idx: [], long: 0, short: 0, asBase: 0 };
      cur.idx.push(i);
      if (long) cur.long += 1;
      else cur.short += 1;
      if (base) cur.asBase += 1;
      acc.set(ccy, cur);
    };
    leg(spec.base, buy, true);
    leg(spec.quote, !buy, false);
  });
  const seen = new Set<string>();
  return [...acc.entries()]
    .filter(([, v]) => v.idx.length >= 2 && (v.long === 0 || v.short === 0))
    .sort((a, b) => b[1].idx.length - a[1].idx.length || b[1].asBase - a[1].asBase || a[0].localeCompare(b[0]))
    .filter(([, v]) => {
      const key = v.idx.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([ccy, v]) => ({ ccy, n: v.idx.length, dir: v.long > 0 ? ('long' as const) : ('short' as const) }));
}
