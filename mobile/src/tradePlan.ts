/**
 * وضوح خطة الصفقة (دخول/وقف/هدف) — رياضيات صرفة قابلة للاختبار بـtsx.
 *
 * - يتحقق أن المستويات منسجمة مع الاتجاه: شراء ⇒ وقف < دخول < هدف؛ بيع ⇒ هدف < دخول < وقف.
 *   خطة معكوسة (وقف فوق الدخول بصفقة شراء) خطأ شائع لدى المبتدئ ويجب أن يُمنع قبل النشر.
 * - مسافات بالـpip حين يُعرف حجم الـpip (فوركس/ذهب/فضة عبر instrumentSpec)، وإلا بفرق السعر فقط.
 * - R:R = المكسب المحتمل ÷ المخاطرة.
 * - وقف أقرب من 1 pip للدخول (أضيق من أي سبريد تجزئة) خطأ كتابة شبه مؤكد: كان يُعرض «0 pip · R:R 1:5000».
 */
import { cryptoPairOf, knownSingleName } from './chart/newsRisk';
import { normalizeDigits, parseDecimal, stripUnitWord } from './parseDecimal';
import { computeAtr } from './chart/indicators/volatility';
import type { Candle } from './api';
import {
  centAccountSymbol,
  microAccountSymbol,
  miniAccountSymbol,
  instrumentSpec,
  type InstrumentSpec,
  smallContractPair,
  LOT_STEP,
  MAX_SANE_LOTS,
  pairBallpark,
  JOURNAL_MAX_SMALL_LOTS,
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
  // mini («EURUSD.MINI») بأسعار الزوج العادي ونقاطه؛ ومالها null (`journalPnl`/`journalRisk` لا يعرفانها) — راجع `MINI_SUFFIX`
  return (
    instrumentSpec(symbol) ??
    instrumentSpec(smallContractPair(symbol) ?? '') ??
    instrumentSpec(miniAccountSymbol(symbol) ?? '')
  );
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

/** رمز **حساب mini** بالدفتر («EURUSD.MINI»، «EURUSDMINI»)؟ نقاطٌ بلا مال، ولوتها لا يُخلط بلوت العادي (`recentLotSizes`). */
export function isMiniJournalSymbol(symbol: string | null | undefined): boolean {
  const up = (symbol || '').trim().toUpperCase();
  return !!up && !instrumentSpec(up) && miniAccountSymbol(up) != null;
}

/**
 * حجمٌ بخانة الدفتر يبدو **وحداتٍ لا لوتات** (`sizeLooksLikeUnits`) — وبرمز حساب سنت أيضاً.
 *
 * التحذير كان على `instrumentSpec` وحده، فـ«EURUSDC» بحجم «10000» لا يُنبَّه عليها ولا يُمنع حفظها: صفقة بعشرة
 * آلاف لوت بالدفتر. السنت يُكشف بـ`JOURNAL_MAX_SMALL_LOTS` (1000، قرار أنس ١٥ — كان 200: لوت السنت أصغر بمئة مرّة فأرقامه أكبر بطبيعتها،
 * ومنع حفظ صفقة حقيقية أسوأ من تركها)، و**بلا اقتراح تحويل** (`lots: null`): حجم عقد
 * السنت بالوحدات يختلف بين الوسطاء، و«0.10» مقترحة خطأً بمئة ضعف أسوأ من سطرٍ يقول «تحقّق من الحجم».
 */
export function journalSizeLooksLikeUnits(size: number, symbol: string | null | undefined): { lots: number | null } | null {
  const up = (symbol || '').trim().toUpperCase();
  const spec = instrumentSpec(up);
  if (spec) return sizeLooksLikeUnits(size, spec);
  // mini («EURUSD.MINI»): لوتها عُشر العادي ⇒ الحدّ نفسه بلوت العادي (`MAX_SANE_LOTS` = 1,000 mini). كانت بلا فحص فتُحفظ «10000» (وحدات)
  // عشرة آلاف لوت بلا سؤال، بينما السنت وmicro يُنبَّه عليهما. بلا اقتراح تحويل كالسنت.
  if (miniAccountSymbol(up) && !smallContractPair(up)) {
    return Number.isFinite(size) && size > MAX_SANE_LOTS * 10 ? { lots: null } : null;
  }
  // micro («EURUSDMICRO») كالسنت: لوتها أصغر بمئة مرّة فأرقامها أكبر، وعشرة آلاف لوت خطأ كتابة بها أيضاً
  if (!smallContractPair(up)) return null;
  return Number.isFinite(size) && size > JOURNAL_MAX_SMALL_LOTS ? { lots: null } : null;
}

/** فوقه يُسأل عن حجم ذهب/فضة «أونصات أم لوتات؟» (`journalSizeMaybeMetalUnits`): 10 لوت ذهب = 1,000 أونصة ≈ 3 ملايين دولار. */
export const JOURNAL_METAL_UNITS_HINT_LOTS = 10;

/**
 * حجم ذهب/فضة **قد يكون أونصات** (cTrader وبعض المنصّات تعرض حجم المعدن بالأونصة: 0.50 لوت ذهب = «50 Oz»). `sizeLooksLikeUnits`
 * لا يسأل تحت 100 ⇒ «50» على XAUUSD تُحفظ 50 لوتاً بلا إشارة ومخاطرة وقف 5$ تُكتب 25,000 USD بدل 250. فوق
 * `JOURNAL_METAL_UNITS_HINT_LOTS` وحتى 100 وحين تقع القسمة على حجم العقد على خطوة اللوت ⇒ `{ lots }` لشريحة «حوّل إلى 0.50 lot»
 * **لا تمنع الحفظ**: 20 لوت ذهب صفقةٌ حقيقية عند متداولٍ كبير، ومنع حفظها أسوأ من سؤالٍ يتجاهله. `null` = لا سؤال.
 */
export function journalSizeMaybeMetalUnits(size: number, symbol: string | null | undefined): { lots: number } | null {
  const spec = instrumentSpec((symbol || '').trim().toUpperCase());
  if (!spec || (spec.base !== 'XAU' && spec.base !== 'XAG')) return null;
  if (!Number.isFinite(size) || size <= JOURNAL_METAL_UNITS_HINT_LOTS || size > MAX_SANE_LOTS) return null;
  const raw = size / spec.contractSize;
  const steps = Math.round(raw / LOT_STEP);
  if (steps < 1 || Math.abs(raw / LOT_STEP - steps) > 1e-6) return null;
  return { lots: Math.round(steps * LOT_STEP * 100) / 100 };
}

const OUNCE_WORD = /^(.+?)\s*(?:oz|ounces?|أونصات|أونصة|اونصات|اونصة|ئۆنسە|ئۆنس)\.?$/i;

/**
 * حجم ذهب/فضة **مكتوب بالأونصة صراحةً** («50 Oz» كما يعرضه cTrader، «50 أونصة»): كان «رقم غير مفهوم» بلا طريق للحفظ.
 * لا يُحفظ كما هو (الخانة باللوت) — يُقترح مكافئه `{ lots }` بشريحة (0.50 lot للذهب، عقد 100 أونصة). غير معدن، أو أونصات
 * لا تقع على خطوة اللوت (0.01)، أو فوق `MAX_SANE_LOTS` ⇒ `null` (يبقى «غير مفهوم» كما كان — لا تقريب صامت لحجم).
 */
export function journalSizeOunces(raw: string, symbol: string | null | undefined): { oz: number; lots: number } | null {
  const spec = instrumentSpec((symbol || '').trim().toUpperCase());
  if (!spec || (spec.base !== 'XAU' && spec.base !== 'XAG')) return null;
  const m = OUNCE_WORD.exec(normalizeDigits(raw).trim());
  if (!m) return null;
  const oz = parseDecimal(m[1]);
  if (oz == null || !(oz > 0)) return null;
  const lotsRaw = oz / spec.contractSize;
  const steps = Math.round(lotsRaw / LOT_STEP);
  if (steps < 1 || Math.abs(lotsRaw / LOT_STEP - steps) > 1e-6) return null;
  const lots = Math.round(steps * LOT_STEP * 100) / 100;
  return lots <= MAX_SANE_LOTS ? { oz, lots } : null;
}

/**
 * الحجم الذي **يُحسب به مال** سطور مسودّة الدفتر (المخاطرة، الربح المحتمل، معاينة الخروج) من نصّ الخانة كما كُتب:
 * `null` حين لا حجم، أو يبدو وحدات (`journalSizeLooksLikeUnits`)، أو «10.000» المبهم (`journalSizeDottedThousands`).
 *
 * كان المبهم يُسأل عنه بسطر تحذير ويُمنع حفظه، لكن السطور الثلاثة تحت الخانة تفحص «يبدو وحدات» وحدها (10 لا تبدو)
 * فتحسب **10 لوتات**: «المخاطرة 20 pip (2,000.00 USD)» بجانب سؤال «0.10 لوت أم 10؟» — مئة ضعف لمن قصد 0.10.
 */
export function journalMoneyLots(raw: string, symbol: string | null | undefined): number | null {
  const l = parseJournalSize(raw);
  if (l == null || !(l > 0)) return null;
  if (journalSizeDottedThousands(raw, symbol) || journalSizeLooksLikeUnits(l, symbol)) return null;
  return l;
}

/**
 * خانة **الحجم** بالدفتر (لوت): «0.10 lots» منسوخة من تأكيد الصفقة («Buy 0.10 lots EURUSD») أو «١٫٥ لوت» كانت «رقم غير مفهوم»
 * فيُمنع الحفظ. كلمة اللوت وحدها بالآخر مقبولة (`stripUnitWord`)، والباقي بقاعدة `parseDecimal` نفسها. `null` = فارغ/غير مفهوم/≤ 0.
 */
export function parseJournalSize(raw: string): number | null {
  const n = parseDecimal(raw, { unit: 'lot' });
  return n != null && n > 0 ? n : null;
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
  // «١٫٠٠٠» بلوحة عربية/كردية: `normalizeDigits` لا يمسّ الفاصلة العشرية العربية ٫ — كانت تُقرأ 1 لوت بلا تحذير
  const m = /^(\d{1,3})[.．٫]000$/.exec(normalizeDigits(stripUnitWord(raw, 'lot')).trim());
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
  // «+» فقط لرقمٍ يُكتب غير صفر: `formatMoney` يُسقط «−» لما يُقرَّب صفراً، فكان ربح USDJPY.micro الصغير
  // يُكتب «+0 JPY» والبيع المقابل «0 JPY»؛ وسنت 0.04 USC «(≈ +0.00 USD)» — الإشارة لكل رقمٍ بما يُعرض منه
  const plus = (v: number, ccy: string) => (signed && v > 0 && /[1-9]/.test(formatMoney(v, ccy)) ? '+' : '');
  if (cash.ccy !== 'USC') return `${plus(cash.amount, cash.ccy)}${formatMoney(cash.amount, cash.ccy)}`;
  const num = (v: number, ccy: string) => formatMoney(v, ccy).slice(0, -(ccy.length + 1));
  const usd = cash.amount / 100;
  return uscTemplate
    .replace('{usc}', `${plus(cash.amount, 'USC')}${num(cash.amount, 'USC')}`)
    .replace('{usd}', `${plus(usd, 'USD')}${num(usd, 'USD')}`);
}

/**
 * حجم الصفقة بسطر الدفتر: «0.015 lot» لا «0.01» — المال بالسطر نفسه محسوبٌ من الحجم الكامل، والخادم والنموذج يقبلان أي
 * حجم > 0 (وسطاء عقود الكريبتو يسمحون بـ0.001). كان `toFixed(2)` ⇒ «0 lot» لـ0.004. ستّ منازل معنوية تُسقط ضجيج العائم.
 */
export function formatJournalLots(size: number): string {
  return String(Number(size.toPrecision(6)));
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
  // mini («EURUSD.MINI»): نقاط الزوج العادي **بلا مال** (لوت mini يختلف بين الوسطاء) — كان null فيختفي سطر المخاطرة كلّه
  // مع أن نقاط الوقف معروفة؛ سطر `journalMiniNoMoney` بالدفتر يقول لماذا لا مبلغ
  const mini = std || small ? null : miniAccountSymbol(sym);
  const spec = std ?? (small ? instrumentSpec(small) : mini ? instrumentSpec(mini) : null);
  if (!spec) return null;
  // مالٌ من حجمٍ يبدو وحداتٍ («125,000,000 USD») أسوأ من لا شيء — سطر التحذير يقول ما الخطأ
  if (journalSizeLooksLikeUnits(lots, sym)) return null;
  if (mini) return { pips: pipsBetween(spec, entry, sl), cash: null, cent: false, micro: false };
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
 * فرق سعرٍ بلا pip معروف لسطر الخطة: خمس منازل كما كان، و**أربعة أرقام معنوية** دون 0.001 — SHIB 0.00001234 بوقف
 * 0.00001200 (مسافة 0.00000034) كانت «المخاطرة 0 · الربح المحتمل 0» فتبدو الخطة بلا وقف. بلا صيغة أُسّية («3.4e-7»).
 */
export function priceDistanceText(d: number): string {
  if (!Number.isFinite(d)) return '';
  const a = Math.abs(d);
  const decimals = a >= 1e-3 || a === 0 ? 5 : Math.min(20, Math.ceil(-Math.log10(a)) + 3);
  const fixed = d.toFixed(decimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/**
 * سطر الخطة: «المخاطرة 25 pip (125.00 USD) · الربح المحتمل 50 pip (250.00 USD) · R:R 1:2» — بفرق السعر حين لا يُعرف الـpip
 * (منظَّفاً لخمس منازل). كان منسوخاً بالدفتر ولوحة الأفكار (`VotePanel`) — نسختان تتباعدان. `riskMoney`/`gainMoney` نصّ
 * المال جاهزاً (أو null ⇒ بلا قوسين).
 */
export function planSummaryText(
  plan: TradePlan,
  /** `unit`: وحدة الـpip باللغة (`pipUnit(lang)` — «pips» بالإنجليزية، QA75)؛ غائبة ⇒ «pip» كما كانت. */
  words: { risk: string; reward: string; unit?: string },
  riskMoney?: string | null,
  gainMoney?: string | null
): string {
  const unit = words.unit ?? 'pip';
  const dist = (pips: number | null, d: number) => {
    const p = formatPips(pips);
    return p != null ? `${p} ${unit}` : priceDistanceText(d);
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
  // 1 pip، أو 0.002% من الدخول بلا pip معروف (`minRiskForR`) — الحدّ الذي يُسقط R الصفقة بعد إغلاقها
  if (riskDist < minRiskForR(input.symbol, entry)) return { ...base, ok: false, issue: 'slTooClose', rr: null };
  /**
   * **بالنقاط حين يُعرف الـpip**: ضجيج طرح سعرين يكبر مع السعر لا مع المسافة — XAUJPY على 337,255.84 بوقف 1 pip وهدف 1:1
   * (`targetAtRR`) يعطي 0.999999999 فيُطبع «1:0.9» وتحته «الربح أقل من المخاطرة». المسافة بالنقاط مقرّبةً لجزء من مليون pip
   * (أدقّ بكثير من أي سعرٍ يُكتب) تُسقط الضجيج أيّاً كان السعر.
   */
  const inPips = (d: number) => Math.round((d / (pip as number)) * 1e6) / 1e6;
  const rr = pip ? cleanRatio(inPips(rewardDist), inPips(riskDist)) : cleanRatio(rewardDist, riskDist);
  return { ...base, ok: true, issue: null, rr };
}

/**
 * الوقف بالجهة الصحيحة لكنه **أقرب من 1 pip** للدخول — حدّ `analyzePlan` (`slTooClose`) نفسه بلا حاجة لهدف.
 * الدفتر كان يحذّر منه فقط حين يُكتب الهدف أيضاً؛ بوقفٍ وحده كان يعرض «المخاطرة 0.1 pip (1.00 USD)» كخطة
 * عادية، ثم لا R للصفقة بعد إغلاقها (`realizedR`) بلا سبب مرئي. رمزٌ مجهول الـpip (BTC، US30): أضيق من 0.002% من
 * الدخول (`minRiskForR`) — الحدّ نفسه الذي يُسقط R. false لوقفٍ بالجهة الخطأ (لذاك تحذيره) أو أسعار غير صالحة.
 */
export function stopTooClose(input: { symbol: string; side: TradeSide; entry: number | null; sl: number | null }): boolean {
  const { side, entry, sl } = input;
  if (!finitePos(entry) || !finitePos(sl)) return false;
  const risk = side === 'buy' ? entry - sl : sl - entry;
  return risk > 0 && risk < minRiskForR(input.symbol, entry);
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

/**
 * **نسبة النجاح اللازمة للتعادل** بعائد:مخاطرة `rr` (بلا تكاليف): 1 ÷ (1 + rr). بـ1:2 يكفي أن تنجح 33.4% من الصفقات؛ بـ1:0.5
 * تحتاج 66.7%. يُقرن الهدف بما يطلبه من دقّة: هدفٌ بعيد يبدو «أفضل» لكنه يطلب نسبة نجاح لا يملكها المتداول.
 *
 * منزلة واحدة مقرَّبة **للأعلى** (33.33…% ⇒ 33.4%: الحدّ الأدنى الذي يكفي فعلاً). `null` لـrr غير موجب أو غير منتهٍ.
 */
export function breakevenWinRatePct(rr: number | null | undefined): number | null {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return null;
  const pct = 100 / (1 + rr);
  // 1:1 ⇒ 50.000…01 من الفاصلة العائمة لا يصير 50.1
  return Math.ceil(Math.round(pct * 10 * 1e6) / 1e6) / 10;
}

/**
 * 25 → "25"، 12.5 → "12.5" (pip واحد عشري كحد أقصى). QA105a: يُقرَّب لمنزلة **قبل** فحص الصحيح — 0.04 ⇒ «0» لا «0.0»،
 * ‏999.95 ⇒ «1000» لا «1000.0»، و−0.04 ⇒ «0» بلا إشارة سالبة.
 */
export function formatPips(p: number | null): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  const r = Number(p.toFixed(1));
  if (r === 0) return '0';
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
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

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** «YYYY-MM-DD HH:MM» بتوقيت الجهاز للحظة `ms` — صيغة حقل «وقت الإغلاق». */
export function journalLocalFieldAt(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * وقت دفتر من الخادم (`opened_at_iso`/`closed_at_iso`، backend-r93: ISO **بإزاحة الخادم لذلك التاريخ**) ⇒ نصّ الحقل بتوقيت
 * الجهاز. كان الحقل مستحيلاً: `closed_at` نصّ بتوقيت الخادم بلا منطقة، فمتداول ببغداد وخادم بفرانكفورت يرى الوقت مزاحاً ساعة
 * أو ساعتين. بلا إزاحة صريحة (صفّ قديم/نصّ حرّ) ⇒ null — لا منطقة تُخمَّن.
 */
export function journalIsoToLocalField(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/.test(iso)) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? journalLocalFieldAt(ms) : null;
}

/**
 * وقت صفّ الدفتر بتوقيت الجهاز: المغلقة ⇒ وقت إغلاقها، المفتوحة ⇒ وقت فتحها (`*_iso`، backend-r93). كان الصفّ بلا أيّ تاريخ —
 * صفقتان بالرمز والدخول نفسيهما لا تُميَّزان، ولا يُعرف أيّ خسارةٍ كانت أمس. صيغة حقل «وقت الإغلاق» نفسها **بالسنة دائماً**
 * (launch191a): «09-10» بلا سنة يقرؤها القارئ العربي والكردي يوماً-شهراً (9 أكتوبر بدل 10 سبتمبر)؛ «2026-09-10» ISO لا يُقرأ
 * بترتيبين ولا يحتاج ترجمة. مغلقة بلا `closed_at_iso` ⇒ null — وقت الفتح تحت كلمة «مغلقة» يُقرأ وقتَ إغلاق.
 */
export function journalRowWhen(row: { status?: string | null; opened_at_iso?: string | null; closed_at_iso?: string | null }): string | null {
  return journalIsoToLocalField(row.status === 'closed' ? row.closed_at_iso : row.opened_at_iso);
}

/**
 * نصّ حقل «وقت الإغلاق» (بتوقيت الجهاز) ⇒ ISO **بإزاحة الجهاز لذلك التاريخ** (صحيح عبر التوقيت الصيفي) كما يقبله الخادم
 * (`_journal_time` يحوّله لتوقيته). يقبل «2026-08-12 14:30» (والثواني «:30» تسقط) و«T» بدل المسافة و«/» أو «.» بالتاريخ والأرقام العربية
 * الهندية. تاريخ غير موجود (31 أبريل، 29 فبراير بسنة عادية) أو ساعة سقطت بقفزة الصيف ⇒ null: `Date` كان سيزيحها بصمت
 * لليوم/الساعة التالية فيُحفظ وقتٌ لم يكتبه المتداول.
 */
export function journalLocalFieldToIso(text: string): { iso: string; ms: number } | null {
  const norm = text
    .trim()
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  // الثواني اختيارية وتسقط (QA120a: سجلّ MT5 يُنسخ «2026.09.26 14:05:30»؛ الخادم يحفظ بالدقيقة)
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+|T)(\d{1,2})[:\u066b.](\d{2})(?:[:\u066b.](\d{2}))?$/.exec(norm);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1, 6).map(Number);
  if (y < 1970 || h > 23 || mi > 59 || (m[6] != null && Number(m[6]) > 59)) return null;
  const dt = new Date(y, mo - 1, d, h, mi);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt.getHours() !== h || dt.getMinutes() !== mi) {
    return null;
  }
  const off = -dt.getTimezoneOffset();
  const sign = off < 0 ? '-' : '+';
  const a = Math.abs(off);
  return {
    iso: `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:00${sign}${pad2(Math.floor(a / 60))}:${pad2(a % 60)}`,
    ms: dt.getTime(),
  };
}

/** سماح الخادم لساعة جهازٍ متقدّمة (`_journal_time`: «بالمستقبل» = أبعد من الآن + 5 دقائق ⇒ 422). */
export const CLOSE_TIME_FUTURE_SLACK_MS = 5 * 60_000;

export type EditClosedAt =
  | { send: string | null | undefined }
  | { error: 'invalid' }
  | { error: 'beforeOpen'; opened: string }
  | { error: 'future' };

/**
 * `closed_at` المُرسل بحفظ التعديل من حقل «وقت الإغلاق» (backend-r91a/r93). `initial` = نصّ الحقل كما مُلئ (من `closed_at_iso`،
 * أو من وقتٍ حفظه هذا الجهاز قبل أن يعيد فتح الصفقة = `initialIso`، أو «الآن» عند كتابة الخروج لصفقة مفتوحة، أو فارغ).
 *
 * - الخروج لا يُرسل رقماً ⇒ `undefined` (مسح الخروج يمسح الوقت بالخادم؛ الحقل مخفيّ).
 * - الحقل **كما مُلئ**: بدأ مغلقاً ⇒ `undefined` (الخادم يُبقيه)؛ مُلئ من وقتٍ محفوظ لصفقة أُعيد فتحها ⇒ ذلك الـISO حرفياً (لا
 *   «الآن» المختلَق — صفقة أغسطس لا تُعدّ من هذا الأسبوع)؛ غيره («الآن» أو فارغ) ⇒ `undefined` فيختم الخادم «الآن».
 * - مُسح ⇒ `null` صريح = «غير معروف» (نصّ التلميح: «اتركه فارغاً إن كنت لا تعرفه»).
 * - مكتوب ⇒ ISO بإزاحة الجهاز؛ غير مقروء، أو يسبق الفتح، أو بالمستقبل (> الآن + 5 د) ⇒ خطأ يمنع الحفظ بسببه — كان 422 عامّاً.
 */
export function editClosedAtSend(a: {
  exitSent: number | null | undefined;
  startedClosed: boolean;
  text: string;
  initial: string;
  initialIso: string | null;
  openedIso: string | null | undefined;
  nowMs: number;
}): EditClosedAt {
  if (typeof a.exitSent !== 'number') return { send: undefined };
  const text = a.text.trim();
  if (text === a.initial.trim()) {
    if (a.startedClosed) return { send: undefined };
    return { send: text && a.initialIso ? a.initialIso : undefined };
  }
  if (!text) return { send: null };
  const p = journalLocalFieldToIso(text);
  if (!p) return { error: 'invalid' };
  if (p.ms > a.nowMs + CLOSE_TIME_FUTURE_SLACK_MS) return { error: 'future' };
  const openedMs = typeof a.openedIso === 'string' && journalIsoToLocalField(a.openedIso) != null ? Date.parse(a.openedIso) : NaN;
  // الخادم يقارن بدقّة الدقيقة (`closed_at < opened_at` نصّاً) ⇒ الدقيقة نفسها مقبولة
  if (Number.isFinite(openedMs) && p.ms < Math.floor(openedMs / 60_000) * 60_000) {
    return { error: 'beforeOpen', opened: journalIsoToLocalField(a.openedIso) as string };
  }
  return { send: p.iso };
}

/**
 * `closed_at` لإغلاق صفقة من خانة الخروج (`POST /api/trades/{id}/close`، backend-r93 (2)): صفقة أعاد هذا الجهاز فتحها بالتعديل
 * ⇒ وقت إغلاقها المحفوظ (`remembered`، ISO من `closed_at_iso`) لا «الآن». الإغلاق **بالسعر الحالي** يبقى «الآن» (سعر الآن =
 * وقت الآن) ⇒ `undefined`، وكذا بلا وقت محفوظ أو بغير صيغة ISO أو يسبق الفتح (422 يمنع الإغلاق).
 */
export function reopenedCloseAt(
  row: { status?: string | null; opened_at_iso?: string | null },
  source: 'market' | 'field',
  remembered: string | null | undefined
): string | undefined {
  if (source !== 'field' || row.status !== 'open' || journalIsoToLocalField(remembered) == null) return undefined;
  const opened = journalIsoToLocalField(row.opened_at_iso) != null ? Date.parse(row.opened_at_iso as string) : NaN;
  const ms = Date.parse(remembered as string);
  if (Number.isFinite(opened) && Math.floor(ms / 60_000) < Math.floor(opened / 60_000)) return undefined;
  return remembered as string;
}

/**
 * قيمة `size` المُرسلة بحفظ التعديل: حجمٌ مكتوب يُرسل كما هو. خانةٌ فارغة ⇒ `null` («حجم غير معروف»، الخادم يمسح القيمة
 * منذ backend-r17 (b)) **فقط** إن كان الحجم معروفاً قبل التعديل (`knownLots` — الخانة فُتحت مملوءة فمسحها المتداول).
 * كان مجهولاً (1 افتراض الخادم بلا علامة) ⇒ `undefined` (بلا تغيير): الخانة فُتحت فارغة، فلا قصد يُرسل.
 *
 * لماذا: كان الفارغ «بلا تغيير» دائماً — صفقة سُجّلت 1.00 خطأً ومُسح حجمها بالتعديل تبقى 1 لوت، فمالُها وخطر المفتوحة
 * يُحسبان بحجمٍ قال المتداول إنه لا يعرفه. الوقف والهدف يُمسحان بالطريقة نفسها.
 */
export function editSizeValue(
  before: { size: number | null | undefined; note?: string | null },
  typed: number | null
): number | null | undefined {
  if (typed != null) return typed;
  return knownLots(before.size, before.note) != null ? null : undefined;
}

/**
 * الصفّ **كما رآه النموذج** عند فتح التعديل، يُرسل مع `PATCH /api/trades/{id}` (backend-r78b الحالة والخروج، backend-r80a كل
 * حقل يعيد النموذج إرساله): مختلفٌ عن المخزَّن ⇒ 409 `trade_changed_concurrently` بدل الكتابة. بلا الحالة/الخروج كان حفظ نموذجٍ
 * فُتح على صفقة مغلقة يعيد خروجها القديم فوق إغلاقٍ أحدث من جهاز آخر (+9% ⇒ −4.5%)؛ وبلا البقيّة كان تصحيح دخول/اتجاه/وقف من
 * جهاز آخر يُمحى بحفظ ملاحظة من نموذج قديم (والنتيجة تُحسب من الدخول القديم).
 * حالةٌ غير معروفة (صفّ نسخة قديمة) ⇒ `null`: لا يُرسل شيء، كما كان. الأسعار والحجم: موجب منتهٍ وإلا `null` صريح («رأيته فارغاً»؛
 * الخادم يقارن 0 القديم كفارغ). الرمز/الاتجاه/الدخول بلا قيمة صالحة ⇒ `null` = بلا فحص (أعمدة لا تكون فارغة بالخادم)؛ ورمز
 * > 12 حرفاً أو ملاحظة > 500 كذلك بلا فحص (`seen_symbol`/`seen_note` بحدّ طول ⇒ 422 يمنع الحفظ للأبد). الملاحظة الغائبة = ''.
 */
export type JournalEditSeen = {
  seen_status: 'open' | 'closed';
  seen_exit: number | null;
  seen_symbol?: string | null;
  seen_side?: 'buy' | 'sell' | null;
  seen_entry?: number | null;
  seen_size?: number | null;
  seen_sl?: number | null;
  seen_tp?: number | null;
  seen_note?: string;
};

export function journalEditSeen(row: {
  status?: string | null;
  exit?: number | null;
  symbol?: string | null;
  side?: string | null;
  entry?: number | null;
  size?: number | null;
  sl?: number | null;
  tp?: number | null;
  note?: string | null;
}): JournalEditSeen | null {
  if (row.status !== 'open' && row.status !== 'closed') return null;
  const px = (x: number | null | undefined) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null);
  const out: JournalEditSeen = { seen_status: row.status, seen_exit: px(row.exit) };
  // الأعمدة تُضاف فقط حين يحملها الصفّ: صفّ بلا الحقل أصلاً (نسخة/اختبار قديم) لا يُفحص بما لم يُرَ
  if ('symbol' in row) {
    const sym = typeof row.symbol === 'string' ? row.symbol.trim() : '';
    out.seen_symbol = sym && sym.length <= 12 ? sym : null;
  }
  if ('side' in row) out.seen_side = row.side === 'buy' || row.side === 'sell' ? row.side : null;
  if ('entry' in row) out.seen_entry = px(row.entry);
  if ('size' in row) out.seen_size = px(row.size);
  if ('sl' in row) out.seen_sl = px(row.sl);
  if ('tp' in row) out.seen_tp = px(row.tp);
  if ('note' in row) {
    const n = typeof row.note === 'string' ? row.note : '';
    if (n.length <= 500) out.seen_note = n;
  }
  return out;
}

/** خانات نموذج تعديل الدفتر كنصوص — كما يملؤها «تعديل» (`journalEditForm`) */
export type JournalEditForm = {
  symbol: string;
  side: 'buy' | 'sell';
  entry: string;
  exit: string;
  size: string;
  sl: string;
  tp: string;
  note: string;
};

/**
 * نموذج التعديل من صفّ الدفتر: الأسعار كما سُجّلت بلا تقريب ولا صيغة أُسّية (`plainStopText` — «1.2e-9» لا يقرؤه `parseDecimal`
 * فلا يُحفظ تعديل PEPE أبداً)، والحجم 1 الذي افترضه الخادم لصفقة بلا حجم فارغٌ (`knownLots`)، والغائب ''.
 */
export function journalEditForm(tr: {
  symbol: string;
  side: string;
  entry: number;
  exit?: number | null;
  size?: number | null;
  sl?: number | null;
  tp?: number | null;
  note?: string | null;
}): JournalEditForm {
  const px = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? plainStopText(v) : '');
  const kl = knownLots(tr.size, tr.note);
  return {
    symbol: tr.symbol,
    side: tr.side === 'sell' ? 'sell' : 'buy',
    entry: px(tr.entry),
    exit: px(tr.exit),
    size: kl != null ? String(kl) : '',
    sl: px(tr.sl),
    tp: px(tr.tp),
    note: tr.note || '',
  };
}

/**
 * بعد 409 (`trade_changed_concurrently`، backend-r78b/r80a): النموذج يُبنى على الصفّ المحدَّث **خانةً خانة** — ما غيّره الجهاز
 * الآخر (`fresh` ≠ `base` = الصفّ الذي فُتح عليه النموذج) يُعرض بقيمته الجديدة، وما لم يغيّره يبقى كما كتبه المتداول (`mine`).
 * كان الخروج وحده يُحدَّث ⇒ دخولٌ صُحّح بجهاز آخر يبقى بالخانة بقيمته القديمة، والحفظ الثاني (بـ`seen_*` المحدَّثة، فلا 409) يكتبه
 * فوق التصحيح بصمت — ما وُضع الفحص لمنعه. خانةٌ غيّرها الاثنان ⇒ قيمة الجهاز الآخر (كالخروج من قبل): لا يُكتب فوق ما لم يُرَ؛
 * الرسالة تطلب المراجعة ثم الحفظ.
 */
export function journalConflictForm(base: JournalEditForm, mine: JournalEditForm, fresh: JournalEditForm): JournalEditForm {
  const pick = <K extends keyof JournalEditForm>(k: K): JournalEditForm[K] => (fresh[k] !== base[k] ? fresh[k] : mine[k]);
  return {
    symbol: pick('symbol'),
    side: pick('side'),
    entry: pick('entry'),
    exit: pick('exit'),
    size: pick('size'),
    sl: pick('sl'),
    tp: pick('tp'),
    note: pick('note'),
  };
}

/**
 * النتيجة بوحدات المخاطرة (R): +2 = ربحت ضعف ما خاطرت به، −1 = ضُرب الوقف كاملاً.
 * يحتاج وقفاً صالحاً بالجهة الصحيحة؛ وإلا null. تقريب لمنزلة عشرية واحدة.
 *
 * مع `symbol` معروف الـpip: وقفٌ **أضيق من 1 pip** ⇒ null، بحدّ `analyzePlan` نفسه (`slTooClose`). شراء
 * 1.0850 بوقف 1.08499 (خطأ منزلة عن 1.0849) وخروج 1.0870 كان «+200R» بسطر الصفقة، ويرفع «متوسط R» لثلاث
 * صفقات إلى +66R — الرقم الذي يقرّر به المتداول أيستمرّ على نظامه. الدفتر يحذّر من هذا الوقف أصلاً
 * (`planSlTooClose`)، فلا يُبنى عليه R. بلا pip معروف: الحدّ 0.002% من الدخول (`minRiskForR`).
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

/**
 * أضيق مسافة وقف يُبنى عليها R: 1 pip حين يُعرف، وإلا **0.002% من الدخول** (`R_MIN_RISK_FRACTION`). الكريبتو والمؤشرات
 * والأسهم بلا pip بالدفتر (`journalPipSize` null) فلم يكن لها حدّ: BTC 60000 بوقف 59999.99 (خطأ كتابة 59999) وخروج 61000
 * كانت «+100000R» تبتلع «متوسط R» كلّه. 0.002% = BTC 1.2$، US30 0.9 نقطة، SPX 0.12 — دون سبريد أيّ منها؛ وأضيق pip
 * فوركس نسبياً (الذهب 0.1 عند 3500 = 0.0029%) فوقه، فلا وقف حقيقي يسقط.
 */
const R_MIN_RISK_FRACTION = 2e-5;
/**
 * ومع pip معروف: **الأكبر** من 1 pip و0.002% من الدخول. pip المعدن 0.1 بأي عملة تسعير، فعلى XAUJPY (~525,000 ين)
 * كان «1 pip» = 0.1 ين = 0.00002% — وقف 0.5 ين يمرّ فتقول الحاسبة **300 لوت** لـ1% من 10,000$. 0.002% = 10.5 ين هناك
 * (≈ 1 pip الذهب بالدولار). على الأزواج المعتادة 1 pip أكبر أصلاً (EURUSD 0.0000216، USDJPY 0.003، XAUUSD 0.07)؛
 * وعلى الغريبة (USDTRY ~41 ⇒ 8.2 pip، USDZAR ~18.5 ⇒ 3.7) يبقى دون سبريدها بكثير.
 */
function minRiskForR(symbol: string | undefined, entry: number): number {
  const pip = journalPipSize(symbol);
  // هامش نسبي صغير: 1.0851 − 1.0850 بالفاصلة العائمة = 0.0000999… ويجب أن يُعدّ 1 pip كاملاً
  return pip ? Math.max(pip, entry * R_MIN_RISK_FRACTION) * (1 - 1e-6) : entry * R_MIN_RISK_FRACTION;
}

/**
 * أضيق وقف **بالنقاط** للحاسبة (`slTooClose` بـPositionSizePanel) — حدّ `analyzePlan` نفسه: 1 pip، أو 0.002% من `price`
 * إن كان أكبر (XAUJPY). `price` غير معروف (النقاط وحدها بلا دخول ولا وقف) ⇒ 1 pip. null = رمز بلا pip.
 * يُقرَّب لعُشر pip **للأعلى** (بعد تنظيف ضجيج الفاصلة كـ`slPipsFromPrices`): للأسفل كان USDZAR 18.49 (الحدّ الحقيقي 3.698 pip)
 * يقبل وقف 3.6 بالحاسبة ويُحسب له لوت، ثم الدفتر يقول «الوقف قريب جداً» ولا R للصفقة أبداً (USDTRY 8.218⇒8.2، XAUJPY 70.005⇒70).
 * الوقف عند الحدّ تماماً يبقى مقبولاً: 8.2 pip على USDTRY 41 = 0.00082 = الحدّ نفسه.
 */
export function minStopPips(symbol: string | null | undefined, price?: number | null): number | null {
  const pip = journalPipSize(symbol);
  if (!pip) return null;
  if (price == null || !Number.isFinite(price) || price <= 0) return 1;
  return Math.max(1, Math.ceil(Math.round(((price * R_MIN_RISK_FRACTION) / pip) * 10 * 1e6) / 1e6) / 10);
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
  if (risk <= 0 || risk < minRiskForR(input.symbol, entry)) return null;
  const move = buy ? exit - entry : entry - exit;
  return move / risk;
}

/**
 * علامة الوقف الأصلي بالملاحظة: «1R @ 1.083» — تُلحق بآخر الملاحظة (`noteWithInitialStop`) فما يكتبه المتداول بعدها
 * يلتصق بها. كانت تُشترط « · » أو نهاية النص بعد الرقم: «1R @ 1.083 moved to BE» أو «1R @ 1.083، NFP» ⇒ لا علامة ⇒
 * الـR من الوقف المشدود (+8R بدل +2R) ولا تُعاد العلامة بالحفظ التالي (الوقف القديم صار المشدود) — تضيع للأبد.
 * الآن ينتهي الرقم عند مسافة/فاصل/نقطة جملة (لا حرفٌ ولا رقمٌ ملتصق ولا «.رقم»)، ويبدأ بعد بداية النص أو فاصل.
 * «,رقم»/«٫رقم» ملتصقة تُسقط العلامة: «1R @ 1,0950» كانت تُقرأ وقفاً **1** ⇒ 0.1R بدل 2R وتُطفئ فحص جهة الوقف.
 * «e-7» تُقبل لملاحظات قديمة فقط: الكتابة صارت بلا صيغة أُسّية (`plainStopText`).
 */
const INITIAL_STOP_RE = /(?:^|[\s·,،;])1R @ (\d+(?:\.\d+)?(?:e-\d+)?)(?![0-9A-Za-z_\u0620-\u064A\u0660-\u0669]|[.,٫]\d)/;

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
  if (typeof input.note !== 'string' || !finitePos(input.entry)) return null;
  const minRisk = minRiskForR(input.symbol, input.entry);
  // آخر علامة **صالحة** لا الأولى: علامةٌ بطلت بتصحيح الدخول ثم شدٌّ جديد ⇒ «1R @ 1.095 · 1R @ 1.09» — كانت الأولى
  // وحدها تُفحص ⇒ لا وقف أصلي ⇒ R من المشدود (5R بدل 1.25R) ونقل الوقف للتعادل يُرفض «بالجهة الخطأ»
  let found: number | null = null;
  const note = input.note.trim();
  const re = new RegExp(INITIAL_STOP_RE.source, 'g');
  for (let m = re.exec(note); m; m = re.exec(note)) {
    const v = Number(m[1]);
    if (!finitePos(v)) continue;
    const risk = input.side === 'buy' ? input.entry - v : v - input.entry;
    if (!(risk > 0) || risk < minRisk) continue;
    found = v;
  }
  return found;
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
 * وكذلك حين يُوسَّع الوقف أو يُمسح: المخاطرة التي دخل بها تبقى 1R، فالخسارة بعدها تُقاس بها (−2R لا −1R، ولا تختفي).
 *
 * لا علامة حين: الصفقة مغلقة (تعديلها تصحيحٌ لا تحريك)، أو الاتجاه/الدخول تغيّرا (تصحيح خطأ كتابة)، أو الوقف القديم
 * غير صالح أو غائب (لا مخاطرة أصلية معروفة)، أو الجديد مساوٍ، أو بالملاحظة علامة صالحة أصلاً.
 */
export function noteWithInitialStop(input: {
  symbol: string;
  note: string;
  before: { side: string; entry: number; sl?: number | null; status: string };
  after: { side: TradeSide; entry: number; sl: number | null };
  /** حدّ الطول — `Infinity` لقياس العلامة وحدها (`journalNoteRoom`) */
  max?: number;
  /**
   * «تصحيح خطأ كتابة لا تحريك»: الوقف القديم كان خطأً (1.0380 بدل 1.0830) فلا يصير مسطرة الـR — وإلا ضُرب الـR بمسافةٍ
   * لم يخاطر بها المتداول قطّ (+0.1R بدل +2R). الأرقام وحدها لا تفرّق التصحيح عن الشدّ (كلاهما تغيير خانة واحدة)، فالمتداول يقول.
   */
  typoFix?: boolean;
}): string {
  const { note, before, after } = input;
  if (input.typoFix) return note;
  if (before.status !== 'open' || before.side !== after.side) return note;
  if (!finitePos(before.entry) || Math.abs(before.entry - after.entry) > 1e-12 * Math.max(1, before.entry)) return note;
  if (initialStop({ symbol: input.symbol, side: after.side, entry: after.entry, note }) != null) return note;
  const old = before.sl;
  if (!finitePos(old)) return note;
  const risk = after.side === 'buy' ? after.entry - old : old - after.entry;
  // حدّ `initialStop` نفسه (`minRiskForR`: 1 pip أو 0.002% من الدخول): كان 1 pip وحده ⇒ على XAUJPY (حدّ ~10.5 ين) أو رمز
  // بلا pip تُكتب علامةٌ يتجاهلها القارئ — أحرفٌ من حدّ الـ500 بلا أثر، ولا تُكتب علامة صالحة بعدها (القارئ لا يراها)
  if (!(risk > 0) || risk < minRiskForR(input.symbol, after.entry)) return note;
  // الوقف لم يتغيّر ⇒ لا علامة. **مُسح أو وُسِّع** ⇒ علامة كالشدّ: خسارةٌ بعد مسح الوقف كانت تسقط من «متوسط R»
  // (R = null)، وتوسيع 1.0830 ⇒ 1.0810 ثم ضربه كان يُسجَّل −1R نظيفاً بدل −2R — أسوأ صفقات النظام تختفي من رقمه.
  if (finitePos(after.sl) && Math.abs(after.sl - old) <= 1e-12 * Math.max(1, old)) return note;
  const n = note.trim();
  const mark = `1R @ ${plainStopText(old)}`;
  const out = n ? `${n} · ${mark}` : mark;
  // ملاحظةٌ تتجاوز حدّ الخادم (`note` ≤ 500) تُفشل الحفظ كلّه — الـR بالوقف الحالي أهون من تعديلٍ لا يُحفظ
  return out.length > (input.max ?? JOURNAL_NOTE_MAX) ? note : out;
}

/**
 * السعر كما يُكتب بعلامة «1R @» بلا صيغة أُسّية: `String(8e-7)` = «8e-7» (جافاسكربت تكتب ما دون 0.000001 أُسّياً) فكانت
 * العلامة لا تُقرأ (`INITIAL_STOP_RE`) لعملات رقمية دون 0.000001 (PEPE/BABYDOGE…) ⇒ الـR من الوقف المشدود (+10R بدل +1R).
 * الأرقام المعنوية نفسها التي تكتبها `String` — لا ضجيج فاصلة عائمة من `toFixed(20)`.
 */
export function plainStopText(v: number): string {
  const str = String(v);
  const m = /^(\d)(?:\.(\d+))?e-(\d+)$/.exec(str);
  if (!m) return str;
  return `0.${'0'.repeat(Number(m[3]) - 1)}${m[1]}${m[2] ?? ''}`;
}

/**
 * نصّ سعرٍ **محسوب** لأداة بلا مواصفات (عملة رقمية صغيرة غير معروفة): 10 أرقام معنوية تُسقط ضجيج الفاصلة العائمة
 * (1.2e-9 + 2×0.2e-9 = 1.6000000000000003e-9) ثم بلا صيغة أُسّية (`plainStopText`). كانت شريحة «1:2» تكتب «1.6e-9»
 * بخانة الهدف فيرفضه `parsePriceFor` ⇒ «رقم غير صالح» ولا حفظ.
 */
export function computedPriceText(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  return plainStopText(Number(v.toPrecision(10)));
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
}): { pips: number | null; pct: number; dir: -1 | 0 | 1 } | null {
  const { side, entry, exit } = input;
  if (!finitePos(entry) || !finitePos(exit)) return null;
  const move = side === 'buy' ? exit - entry : entry - exit;
  /**
   * جهة النتيجة من الحركة **قبل التقريب** — للون (أخضر/أحمر). `pct` مقرَّبة لمنزلتين: ذهب 5 لوت 4000.0 → 4000.1 بيعاً
   * = −50$ و«0.00%»، ولون السطر كان يُؤخذ منها فيُطبع الخسارة رمادية كالتعادل. ضجيج الفاصلة العائمة (≤ 1e-10 من الدخول) صفر.
   */
  const dir = Math.abs(move) <= entry * 1e-10 ? 0 : move > 0 ? 1 : -1;
  const pip = journalPipSize(input.symbol);
  // تقريب متماثل (`roundAway`) لا `Math.round`: هذا يرفع النصف نحو +∞ فتُكتب الخسارة أصغر من الربح
  // المماثل — ذهب 2000 → 1997.5 كان «−0.12%» ومقابله 2000 → 2002.5 «+0.13%»، ونصف pipette خاسر
  // (1.08500 → 1.084995) كان «−0» pip بينما الرابح المماثل «+0.1». وإحصاءات الدفتر تجمع هذه الأرقام.
  // النسبة بـ`roundHalfEven` (متماثل كذلك) على الحساب نفسه بالترتيب نفسه كـ`_pnl_pct` بالخادم: `roundAway` كتب ذهب
  // 2000 → 2002.5 «+0.13%» بالصفّ و«أفضل صفقة 0.12%» بالإحصاء للصفقة نفسها (الخادم `round(0.125, 2)` = 0.12).
  return {
    pips: pip ? roundAway(move / pip, 1) : null,
    pct: roundHalfEven((move / entry) * 100, 2) || 0,
    dir,
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
}): { pips: number | null; pct: number; dir: -1 | 0 | 1; r: number | null; cash: { amount: number; ccy: string } | null } | null {
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
  /** backend-r6 (5): بلا صفقة حاسمة (دفتر فارغ أو كلّه تعادل) `null` كالخادم — اعرضه بـ`journalWinRateLine`. */
  win_rate: number | null;
  total_pnl_pct: number;
  /** `null` بلا رابحة/خاسرة (QA74، كالخادم منذ de91b88): «متوسّط الربح 0%» يُقرأ «ربحت صفقات بلا شيء». */
  avg_win: number | null;
  avg_loss: number | null;
  /** `null` بدفتر فارغ فقط. */
  best: number | null;
  worst: number | null;
  /** backend-r1: التعادل عدّادٌ مستقلّ لا خسارة. خادمٌ أقدم لا يرسل الثلاثة ⇒ اختيارية بالقراءة من الخادم. */
  win_count: number;
  loss_count: number;
  breakeven_count: number;
};

/** `BREAKEVEN_EPS` بـ`backend/db.py`: |pnl| ≤ هذا = تعادل (ضجيج الفاصلة العائمة لا ربح ولا خسارة). */
export const JOURNAL_BREAKEVEN_EPS = 1e-9;

/**
 * إحصاءات الدفتر لقائمة صفقات (الدفتر مفلتراً على أداة) **بمعادلة الخادم نفسها** (`db.trade_stats`):
 * المغلقة ذات `pnl` منتهٍ فقط، الربح > ε والخسارة < −ε و**التعادل وحده** (backend-r1: كان `<= 0` خسارةً فمتداولٌ ينقل
 * وقفه للتعادل يرى نسبة فوزه تهبط)؛ نسبة النجاح = رابحة ÷ (رابحة + خاسرة) بخانة والبقيّة
 * بخانتين بتقريب بايثون (`roundHalfEven`). كانت محسوبة داخل اللوحة بلا اختبار — ورقمٌ يخالف ما يقوله
 * الخادم لنفس الصفقات (6.3% هنا و6.2% بلا فلتر) يجعل المتداول يشكّ بالدفتر كلّه.
 */
export function journalStats(
  trades: readonly { status: string; pnl?: number | string | null }[]
): JournalStats {
  const pnls = trades
    // نصّ فارغ/مسافات: `Number('')` = 0 ⇒ كان يُعدّ تعادلاً (الخادم `float('')` يرفضه) ⇒ يُستبعد كالقيمة المفقودة
    .filter((tr) => tr.status === 'closed' && tr.pnl != null && String(tr.pnl).trim() !== '' && Number.isFinite(Number(tr.pnl)))
    .map((tr) => Number(tr.pnl));
  if (pnls.length === 0) {
    return {
      trade_count: 0, win_rate: null, total_pnl_pct: 0, avg_win: null, avg_loss: null, best: null, worst: null,
      win_count: 0, loss_count: 0, breakeven_count: 0,
    };
  }
  const wins = pnls.filter((v) => v > JOURNAL_BREAKEVEN_EPS);
  const losses = pnls.filter((v) => v < -JOURNAL_BREAKEVEN_EPS);
  const decided = wins.length + losses.length;
  const r2 = (v: number) => roundHalfEven(v, 2);
  return {
    trade_count: pnls.length,
    // كلّها تعادل ⇒ null كالخادم (لا نسبة فوز ذات معنى)، و`breakeven_count` يوضّح
    win_rate: decided ? roundHalfEven((wins.length / decided) * 100, 1) : null,
    total_pnl_pct: r2(pySum(pnls)),
    avg_win: wins.length ? r2(pySum(wins) / wins.length) : null,
    avg_loss: losses.length ? r2(pySum(losses) / losses.length) : null,
    best: r2(Math.max(...pnls)),
    worst: r2(Math.min(...pnls)),
    win_count: wins.length,
    loss_count: losses.length,
    breakeven_count: pnls.length - decided,
  };
}

/**
 * المغلقة **زمنياً** بوقت الإغلاق (`closed_at`، ثم `opened_at` إن غاب) — بصيغة الخادم `%Y-%m-%d %H:%M` فالمقارنة النصّية زمنية.
 * التساوي (الدقيقة نفسها) بترتيب الخادم العكسي (الأحدث أولاً ⇒ الأبعد بالمصفوفة أقدم).
 */
function closedChronological<T extends { status: string; closed_at?: string | null; opened_at?: string | null }>(
  trades: readonly T[]
): T[] {
  const at = (tr: T) =>
    typeof tr.closed_at === 'string' && tr.closed_at ? tr.closed_at : typeof tr.opened_at === 'string' ? tr.opened_at : '';
  return trades
    .map((tr, i) => ({ tr, i, at: at(tr) }))
    .filter(({ tr }) => tr.status === 'closed')
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : b.i - a.i))
    .map(({ tr }) => tr);
}

/**
 * **سلسلة الخسائر**: أطول عدد صفقات خاسرة متتالية (`longest`) والخاسرة المتتالية حتى آخر صفقة مغلقة (`current`) —
 * بتصنيف `journalStats` نفسه (المغلقة ذات `pnl` منتهٍ؛ خسارة < −ε، ربح > ε).
 *
 * لماذا: نسبة النجاح ومتوسط R لا يقولان للمتداول **كم خسارة تأتي متتالية** — وهو الرقم الذي يحدّد نسبة المخاطرة المحتملة
 * (6 خسائر متتالية بـ2% = −11.4% من الحساب) وقاعدة «أتوقّف بعد 3 خسائر اليوم». `current` يقول إنه **الآن** داخل سلسلة.
 *
 * الترتيب زمني (`closedChronological`). **التعادل لا يقطع السلسلة ولا يطيلها**:
 * نقل الوقف للتعادل بين خسارتين لا يعني أن النظام توقّف عن الخسارة. `null` بلا صفقة حاسمة.
 */
export function journalLossStreaks(
  trades: readonly { status: string; pnl?: number | string | null; closed_at?: string | null; opened_at?: string | null }[]
): { longest: number; current: number } | null {
  const rows = closedChronological(trades)
    .filter((tr) => tr.pnl != null && String(tr.pnl).trim() !== '' && Number.isFinite(Number(tr.pnl)))
    .map((tr) => Number(tr.pnl));
  let longest = 0;
  let run = 0;
  let decided = 0;
  for (const pnl of rows) {
    if (pnl < -JOURNAL_BREAKEVEN_EPS) {
      run += 1;
      decided += 1;
      if (run > longest) longest = run;
    } else if (pnl > JOURNAL_BREAKEVEN_EPS) {
      run = 0;
      decided += 1;
    }
  }
  return decided ? { longest, current: run } : null;
}

/**
 * **أقصى تراجع بالـR**: أكبر هبوط من قمّة إلى قاع في مجموع R التراكمي للمغلقة زمنياً (`closedChronological`)، والتراجع
 * **الحالي** عن آخر قمّة. R لكل صفقة بمسطرة «متوسط R» نفسها (`exactR`: الوقف الأصلي «1R @ …» ثم `sl`، ووقفٌ أضيق من
 * 1 pip لا يُحسب)؛ صفقة بلا R تُتخطّى — لا تُعدّ صفراً. القمّة تبدأ من 0 (قبل أوّل صفقة).
 *
 * لماذا: «متوسط +0.4R» يُخفي أن النظام مرّ بـ−7R قبل أن يتعافى. التراجع بالـR هو ما يُضرب بنسبة المخاطرة لتعرف ما كان
 * سيحدث للحساب (−7R بمخاطرة 2% ≈ −13%)، ويقول هل المخاطرة الحالية تحتمل النظام. بالـR لا بالمال: مستقلٌّ عن الحجم والعملة.
 *
 * `n` = الصفقات المحسوبة. `null` بلا صفقة ذات R.
 */
export function journalMaxDrawdownR(
  trades: readonly {
    symbol?: string;
    side: string;
    entry: number;
    sl?: number | null;
    exit?: number | null;
    note?: string | null;
    status: string;
    closed_at?: string | null;
    opened_at?: string | null;
  }[]
): { max: number; current: number; n: number } | null {
  let cum = 0;
  let peak = 0;
  let max = 0;
  let n = 0;
  for (const tr of closedChronological(trades)) {
    const r = exactR({ symbol: tr.symbol, side: tr.side === 'sell' ? 'sell' : 'buy', entry: tr.entry, sl: tr.sl, exit: tr.exit, note: tr.note });
    if (r == null) continue;
    n += 1;
    cum += r;
    if (cum > peak) peak = cum;
    if (peak - cum > max) max = peak - cum;
  }
  // `roundR` لمنزلة واحدة كسائر أرقام R؛ −0 من الطرح يُطبع 0
  return n ? { max: roundR(max) || 0, current: roundR(peak - cum) || 0, n } : null;
}

/**
 * **العائد الفعلي مقابل ما يتطلّبه**: متوسط الرابحة بالـR (`avgWin`) ومتوسط الخاسرة (`avgLoss`، موجب)، ونسبتهما (`payoff`)،
 * و**نسبة النجاح اللازمة للتعادل** بهذه النسبة المحقَّقة (`needPct`، `breakevenWinRatePct`) مقابل نسبة النجاح **الفعلية** على
 * الصفقات نفسها (`winPct`).
 *
 * لماذا: «نسبة نجاح 45%» وحدها لا تقول إن كانت تكفي. من يغلق رابحاته عند +0.8R وخاسراته عند −1R يحتاج 55.6% — فنظامه
 * خاسر بـ45% مهما كانت أهدافه المخطَّطة 1:2. `planBreakevenWinRate` بالحاسبة يقول ما يطلبه الهدف **المخطَّط**؛ هذا يقول ما
 * يطلبه ما **حدث فعلاً** (إغلاق مبكّر، انزلاق).
 *
 * R لكل صفقة بمسطرة «متوسط R» (`exactR`)؛ صفقة بلا R تُتخطّى. رابحة > ε وخاسرة < −ε والتعادل لا يُعدّ (كـ`journalStats`)،
 * و`winPct` = رابحة ÷ (رابحة + خاسرة) من **هذه** الصفقات لا من `win_rate` الخادم (مجموعة أخرى: كل المغلقة ذات `pnl`) — المقارنة
 * بين رقمين من العيّنة نفسها. `winPct` لمنزلة بالنصف إلى الزوجي (`roundHalfEven`، كـ`win_rate` — فوزٌ من 16 = 6.2 بالسطرين لا 6.2/6.3)، و`needPct` للأعلى. `null` ما لم توجد رابحة **و**خاسرة.
 */
export function journalPayoffR(
  trades: readonly {
    symbol?: string;
    side: string;
    entry: number;
    sl?: number | null;
    exit?: number | null;
    note?: string | null;
    status: string;
  }[]
): { avgWin: number; avgLoss: number; payoff: number; needPct: number; winPct: number; n: number } | null {
  let winSum = 0;
  let lossSum = 0;
  let wins = 0;
  let losses = 0;
  for (const tr of trades) {
    if (tr.status !== 'closed') continue;
    const r = exactR({ symbol: tr.symbol, side: tr.side === 'sell' ? 'sell' : 'buy', entry: tr.entry, sl: tr.sl, exit: tr.exit, note: tr.note });
    if (r == null) continue;
    if (r > JOURNAL_BREAKEVEN_EPS) {
      winSum += r;
      wins += 1;
    } else if (r < -JOURNAL_BREAKEVEN_EPS) {
      lossSum -= r;
      losses += 1;
    }
  }
  if (!wins || !losses) return null;
  // النسبة والتعادل من المتوسطين **الدقيقين** لا المقرَّبين (0.84/1.04 ≠ 0.8/1.0)
  const payoffExact = winSum / wins / (lossSum / losses);
  const needPct = breakevenWinRatePct(payoffExact);
  if (needPct == null) return null;
  return {
    avgWin: roundR(winSum / wins),
    avgLoss: roundR(lossSum / losses),
    payoff: roundAway(payoffExact, 2),
    needPct,
    winPct: roundHalfEven((wins / (wins + losses)) * 100, 1),
    n: wins + losses,
  };
}

/**
 * سطر «نسبة نجاح: {pct}%» للدفتر. دفترٌ كل مغلقاته تعادل ⇒ لا صفقة حاسمة و`win_rate` null (خادمٌ أقدم: 0) ⇒ «0%» تُقرأ
 * «خسر كل صفقاته» (backend-r6 (5)). بلا حاسمة، أو `win_rate` غير رقم (null لاحقاً من الخادم) ⇒ «—» بلا علامة %.
 * خادمٌ أقدم بلا `win_count`/`loss_count` ⇒ النسبة كما أرسلها (لا نعرف إن كانت كلها تعادل).
 */
export function journalWinRateLine(
  template: string,
  stats: { win_rate?: number | null; win_count?: number | null; loss_count?: number | null }
): string {
  const rate = stats.win_rate;
  const w = stats.win_count;
  const l = stats.loss_count;
  const undecided = typeof w === 'number' && typeof l === 'number' && w + l === 0;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || undecided) {
    return template.includes('{pct}%') ? template.replace('{pct}%', '—') : template.replace('{pct}', '—');
  }
  return template.replace('{pct}', String(rate));
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
/**
 * نسبة موقَّعة لسطور إحصاءات الدفتر: «+1.50»، «−0.50»، «0.00» (بلا «%» — القالب يضعها). منزلتان كسطر الصفقة، و«−» (U+2212)
 * و«+» كـ`formatR`/`formatSignedPips` بالسطر المجاور؛ رقمٌ يُقرَّب صفراً بلا إشارة. غير منتهٍ ⇒ «—».
 *
 * لماذا: «مجموع حركة السعر» و«أفضل/أسوأ» كانت `String(v)`: «-0.5%» بشرطة ASCII و«0.23%» بلا «+» تحت «−25 pip» و«+1R»،
 * وأفضل صفقة 0.1 + 0.2 من خادمٍ لا يقرّب كانت «0.30000000000000004%».
 */
export function formatSignedPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = (Math.round(Math.abs(v) * 100 + 1e-9) / 100).toFixed(2);
  return `${abs === '0.00' ? '' : v > 0 ? '+' : '−'}${abs}`;
}

export function formatR(r: number | null): string | null {
  if (r == null || !Number.isFinite(r)) return null;
  const abs = formatRAbs(r);
  // كـ`formatPips` (QA105a): ما يُقرَّب صفراً بلا إشارة — لا «−0.0R»
  return `${abs === '0' ? '' : r > 0 ? '+' : '−'}${abs}R`;
}

/**
 * 3 ⇒ «3»، ‏−2.5 ⇒ «2.5»: مقدار R بلا إشارة، منزلة واحدة كحدّ أقصى. يُقرَّب **قبل** فحص الصحيح (QA105a):
 * ‏0.96 كان «1.0» و0.04 «0.0»؛ الآن «1» و«0».
 */
export function formatRAbs(r: number): string {
  const a = Number(Math.abs(r).toFixed(1));
  return Number.isInteger(a) ? String(a) : a.toFixed(1);
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
}): { pips: number | null; pct: number; dir: -1 | 0 | 1; r: number | null } | null {
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
 * نموذج الدفتر فيه مسودّة مكتوبة (دخول، خروج، حجم، وقف أو هدف) ⇒ تبديل زوج الشارت **لا** يبدّل رمز التسجيل.
 * كان يُفحص الدخول وحده: وقف 1.0820 وهدف 1.0900 وحجم 0.50 على EURUSD والدخول فارغ (سيُعبَّأ بـ«السعر الحالي»)،
 * ثم شريحة GBPUSD ⇒ الرمز صار GBPUSD والوقف والهدف باقيان ⇒ صفقة شراء GBPUSD بدخول 1.2650 ووقف **1,830 pip**
 * (جهة صحيحة فلا رفض) يلوّث R:R ومتوسّط R ومخاطرة الصفقات المفتوحة. الحاسبة تفعل هذا أصلاً (`planTypedRef`).
 */
export function journalDraftTyped(fields: readonly (string | null | undefined)[]): boolean {
  return fields.some((f) => typeof f === 'string' && f.trim() !== '');
}

/**
 * رمز النموذج بعد «أضف» ناجحة أفرغت الخانات: زوج الشارت الذي تبدّل **أثناء** الكتابة (`held` — لم يُطبَّق لأن المسودة مكتوبة،
 * `journalDraftTyped`) يُطبَّق الآن. كان النموذج يبقى على رمز الصفقة المحفوظة ⇒ الصفقة التالية على زوج الشارت الجديد تُسجَّل
 * تحت الرمز القديم إن لم ينتبه. `null` = لا تبديل: لا انتقال معلَّق، أو الشارت عاد/انتقل بعده لغيره (`chart` ≠ `held`)، أو
 * اختار المتداول رمزاً بيده بعد الانتقال (اللوحة تمسح `held` حينها).
 */
export function journalChartSymbolAfterSave(held: string | null, chart: string | null | undefined): string | null {
  return held != null && held !== '' && held === chart ? held : null;
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
  // و mini («GBPUSD.MINI») كذلك — `quoteSymbol` يطلب زوجها العادي، فدخول EURUSD كان يبقى تحت صفقة GBPUSD.MINI
  // والرقمية (`cryptoPairOf`، كـ`quoteSymbol`): كانت خارج السلسلة فدخول EURUSD 1.08515 يبقى تحت BTCUSD ⇒ إغلاق 65000 يُحفظ
  // «+5,989,855%»، ودخول BTCUSD 65000 تحت ETHUSD ⇒ −96%، ولا pip للرقمية يلتقط الخطأ بعدها
  const now =
    smallContractPair(symbol) ??
    miniAccountSymbol(symbol) ??
    instrumentSpec(symbol)?.symbol ??
    knownSingleName(symbol) ??
    cryptoPairOf(symbol);
  // BTCUSD ⇄ BTCUSDT/BTCUSDC السعر نفسه تقريباً — إكمال كتابة «T» لا يمسح الدخول
  const stable = (x: string) => (cryptoPairOf(x) ? x.replace(/USD[TC]$/, 'USD') : x);
  return now != null && stable(now) !== stable(filled.symbol);
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
 * نافذة «إغلاق» تؤكّد نتيجةً (نقاط، مال، R) محسوبة من الصفّ **كما حُمّل** — والخادم يُغلق بالمخزَّن. صُحّح دخولها أو اتجاهها أو
 * حجمها أو وقفها (أو ملاحظتها: «1R @ …» والحجم المُعلَّم يدخلان الـR والمال) بجهاز آخر بعد التحميل ⇒ يُسجَّل خروجٌ بنتيجة غير التي
 * وافق عليها المتداول (+25 pip المؤكَّدة تصير −10 على الدخول المصحَّح). `true` ⇒ لا إغلاق: القائمة تُحدَّث ويُقال السبب. غيابها أو
 * تعذّر الجلب ⇒ `false` كـ`closedElsewhere` (لا منع للأبد). الأسعار بالمساواة كما وصلت من الخادم؛ الفارغ = الفارغ (null/0/غائب).
 */
export function closeTermsChangedElsewhere(
  fresh: readonly JournalRowTerms[] | null,
  shown: JournalRowTerms
): boolean {
  const tr = fresh?.find((x) => x.id === shown.id);
  if (tr == null) return false;
  const lvl = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  return (
    String(tr.symbol).trim().toUpperCase() !== String(shown.symbol).trim().toUpperCase() ||
    tr.side !== shown.side ||
    lvl(tr.entry) !== lvl(shown.entry) ||
    lvl(tr.size) !== lvl(shown.size) ||
    lvl(tr.sl) !== lvl(shown.sl) ||
    (tr.note || '') !== (shown.note || '')
  );
}

/** حقول صفّ الدفتر التي تدخل نتيجة الإغلاق المؤكَّدة — `closeTermsChangedElsewhere` */
export type JournalRowTerms = {
  id: string;
  symbol: string;
  side: string;
  entry: number;
  size?: number | null;
  sl?: number | null;
  note?: string | null;
};

/** `seen_*` لـ`POST /api/trades/{id}/close` (tools122a، backend `a7cb64c`) — `journalCloseSeen` */
export type JournalCloseSeen = Omit<JournalEditSeen, 'seen_status' | 'seen_exit' | 'seen_tp'>;

/**
 * الصفّ الذي بُنيت عليه نافذة «إغلاق» يُرسل مع الإغلاق: الخادم يرفض (409 `trade_changed_concurrently`) إن خالف المخزَّن — يسدّ ما
 * لا يراه `closeTermsChangedElsewhere` (صفقةٌ خارج الصفحة الأولى، وتعديلٌ بين الجلب والإغلاق). الحقول نفسها التي يفحصها ذاك
 * (الرمز، الاتجاه، الدخول، الحجم، الوقف، الملاحظة) وبقواعد `journalEditSeen` نفسها. **بلا الهدف**: لا يدخل النتيجة المؤكَّدة (نقاط/
 * مال/R)، وإرساله يرفض إغلاقاً صحيحاً لأن الهدف حُرّك بجهاز آخر. الحالة والخروج كذلك (الخادم يفحص «مفتوحة» بنفسه ⇒ 409 آخر).
 */
export function journalCloseSeen(row: JournalRowTerms): JournalCloseSeen {
  const { seen_status: _s, seen_exit: _x, seen_tp: _t, ...seen } = journalEditSeen({ ...row, status: 'open' })!;
  return seen;
}

/** صفحة الدفتر الافتراضية بالخادم (`db.TRADES_PAGE`) وسقف `limit` (`db.TRADES_PAGE_MAX`) — أكبر منه يُرفض 422. */
export const JOURNAL_PAGE = 200;
export const JOURNAL_PAGE_MAX = 500;
/**
 * «تحميل الأقدم» يبدأ قبل آخر ما وصل بهذا العدد: الترتيب بالخادم إزاحةٌ (`OFFSET`)، فصفقةٌ حُذفت بجهاز آخر بعد تحميل
 * الصفحة تُزيح كل ما بعدها صفّاً للأعلى ⇒ `offset = المحمَّل` يتخطّى صفقةً لا تظهر أبداً (ولو مفتوحة). التداخل يغطّي حتى
 * هذا العدد من الحذف، والمكرَّر (إضافةٌ بجهاز آخر تُزيح للأسفل) يُسقط بالمعرّف (`mergeJournalPage`).
 */
export const JOURNAL_OLDER_OVERLAP = 5;

/** طلب «تحميل الأقدم» بعد `loaded` صفقة: صفحة كاملة جديدة + التداخل، ضمن سقف الخادم. */
export function journalOlderPage(loaded: number): { limit: number; offset: number } {
  const n = Number.isFinite(loaded) ? Math.max(0, Math.floor(loaded)) : 0;
  const offset = Math.max(0, n - JOURNAL_OLDER_OVERLAP);
  return { limit: Math.min(JOURNAL_PAGE_MAX, JOURNAL_PAGE + (n - offset)), offset };
}

/**
 * طلبات التحديث (بعد إضافة/إغلاق/حذف) حين حُمّل `loaded` صفقة: التحديث كان يطلب الصفحة الأولى وحدها فيُسقط كل ما
 * حُمّل بـ«الأقدم» — المتداول يضيف صفقة فتختفي 300 صفقة قديمة كان يراجعها. صفحاتٌ متتالية بسقف الخادم تغطّي
 * `max(صفحة، المحمَّل)`.
 */
export function journalRefreshPages(loaded: number, total?: number | null): { limit: number; offset: number }[] {
  let n = Number.isFinite(loaded) ? Math.max(JOURNAL_PAGE, Math.floor(loaded)) : JOURNAL_PAGE;
  /**
   * **الدفتر كلّه محمَّل** (`total` = المحمَّل) ⇒ صفقة واحدة زيادة: إضافة صفقة إلى دفترٍ من 350 محمَّل كلّه كانت تطلب 350
   * فتسقط أقدمها، ويصير «معروضة 350 من 351» وتختفي أسطر الصافي بالـpip ومتوسط R حتى «تحميل الأقدم» (وكذلك عند 200 بالضبط).
   */
  if (total != null && Number.isFinite(total) && n === Math.floor(loaded) && loaded >= total) n += 1;
  const out: { limit: number; offset: number }[] = [];
  for (let offset = 0; offset < n; offset += JOURNAL_PAGE_MAX) out.push({ limit: Math.min(JOURNAL_PAGE_MAX, n - offset), offset });
  return out;
}

/**
 * هل الصفقات **المفتوحة** كلها بين المحمَّلة؟ الخادم يرتّب بتاريخ الفتح (الأحدث أولاً) فصفقة مراكز مفتوحة منذ أسابيع تقع
 * خارج أحدث 200 — ومجموع «المخاطرة (مفتوحة): 250 USD» كان يُعرض تحت «معروضة 200 من 250 — الإحصاءات على الكل» بينما
 * مفتوحةٌ أقدم بمخاطرة 4,000 USD غائبة: مجموعٌ جزئي يطمئن كذباً. شرط سطر «أحدث N» نفسه (`total` إن أرسله الخادم، وإلا
 * صفحةٌ ممتلئة = ربما أكثر). false ⇒ لا مجموع حتى تُحمَّل الأقدم.
 */
export function journalOpenRiskComplete(
  loaded: number,
  total: number | null | undefined,
  /**
   * **tools103b** (backend `9012172`): الخادم يرتّب المفتوحة أولاً ويرسل `open_total` ⇒ المجموع كامل متى حُمّلت كل المفتوحة،
   * ولو كان الدفتر 250 والمحمَّل 200. `openLoaded` عدد المفتوحة بين المحمَّلة؛ `openTotal` من `journalOpenTotal` (null = خادمٌ أقدم).
   */
  openLoaded?: number,
  openTotal?: number | null
): boolean {
  if (openTotal != null && openLoaded != null) return openLoaded >= openTotal;
  return total != null ? loaded >= total : loaded < JOURNAL_PAGE;
}

/**
 * `open_total` من ردّ `GET /api/trades` — **فقط** مع `open_first: true` (الترتيب الذي يجعله ذا معنى). خادمٌ أقدم بلا
 * الترتيب قد يرسل عدداً والمفتوحة الأقدم خارج الصفحة ⇒ null فيعود الحكم إلى `total`. عددٌ غير صحيح/سالب ⇒ null.
 */
export function journalOpenTotal(res: unknown): number | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { open_first?: unknown; open_total?: unknown };
  const n = r.open_total;
  return r.open_first === true && typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null;
}

/** يُلحق صفحةً أقدم بالقائمة بلا تكرار (بالمعرّف، أول ظهور يبقى) — التداخل وإزاحة الإضافات يعيدان صفوفاً وصلت. */
export function mergeJournalPage<T extends { id: string }>(list: readonly T[], page: readonly T[]): T[] {
  const seen = new Set(list.map((x) => x.id));
  const out = list.slice();
  for (const x of page) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
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
 * **بالمال حين الأساس = عملة الحساب** (`stopQuoteToAccount` = سعر تحويل الخسارة عند الوقف، عادةً 1 ÷ الوقف): الربح
 * يُحوَّل بسعر الهدف 1 ÷ الهدف فالمسافة وحدها لا تعطي النسبة — USDJPY بحساب دولار، شراء 150.00 وقف 149.00 ⇒ «1:2» كانت
 * 152.00 = مالاً 184.21 ÷ 93.96 = **1:1.96** والسطر تحتها يقولها. الشرط: (الهدف − الدخول) ÷ الهدف = rr × الخسارة لكل وحدة
 * ⇒ شراء `entry ÷ (1 − k)`، بيع `entry ÷ (1 + k)`، `k = rr × |entry − sl| × stopQuoteToAccount`. k ≥ 1 بشراء = لا هدف يبلغها.
 * التقريب بعيداً عن الدخول يُبقيها ≥ المطلوبة هنا أيضاً (الربح المحوَّل يزيد مع البعد بالاتجاهين).
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
  stopQuoteToAccount?: number | null;
}): number | null {
  const { side, entry, sl, rr } = input;
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(rr)) return null;
  const buy = side === 'buy';
  const risk = buy ? entry - sl : sl - entry;
  if (!(risk > 0)) return null;
  const stopRate = input.stopQuoteToAccount;
  const k = stopRate != null && finitePos(stopRate) ? rr * risk * stopRate : null;
  if (k != null && buy && !(k < 1)) return null;
  const raw = k != null ? (buy ? entry / (1 - k) : entry / (1 + k)) : buy ? entry + rr * risk : entry - rr * risk;
  if (!(raw > 0)) return null;
  // سنت/micro («EURUSDC») بمنازل زوجه العادي — كانت شرائح 1:1…1:3 بالدفتر تُكتب بعشر خانات معنوية
  const spec = journalSpec(input.symbol);
  if (!spec) {
    // بعيداً عن الدخول هنا أيضاً: `toPrecision` لأقرب قيمة كان يُنزل الهدف دون النسبة — SOLUSDT بيع 216.4498972 وقف
    // 216.7327937 «1:1.5» ⇒ 216.0255525 ⇒ النسبة 1.4999998 تُعرض «1:1.4» تحت الشريحة نفسها.
    // ضرب بقوّة عشرة صحيحة لا قسمة على 1e-5: 62000 ÷ 1e-5 = 6200000000.000001 فيدفعه `ceil` إلى 62000.00001
    const scale = 10 ** (9 - Math.floor(Math.log10(raw)));
    const scaled = Math.round(raw * scale * 1e4) / 1e4;
    const away = buy ? Math.ceil(scaled) : Math.floor(scaled);
    const out = Number((away / scale).toPrecision(10));
    return out > 0 ? out : null;
  }
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

/** شريحة وقف التقلّب: ATR(14) بتنعيم Wilder (نفس مؤشر ATR بالشارت) على شموع الساعة المغلقة × 1.5. */
export const ATR_STOP_TF = '1H' as const;
export const ATR_STOP_TF_SEC = 3600;
export const ATR_STOP_PERIOD = 14;
export const ATR_STOP_MULT = 1.5;
/** آخر شمعة مغلقة أقدم من هذا (بالثواني) ⇒ لا شريحة: ATR بيانات قديمة ليس تقلّب اليوم. 4 أيام تتّسع لعطلة نهاية الأسبوع. */
export const ATR_STOP_MAX_AGE_SEC = 4 * 86400;

/**
 * **مسافة وقف بالتقلّب** (بالـpip، مقرَّبة للأعلى لـpip كامل): `mult × ATR(period)` على شموع `tfSec` **المغلقة** فقط.
 *
 * لماذا: شرائح الوقف الثابتة (`quickStopPips`: 10/20/30/50) لا تعرف السوق — 20 pip على EURUSD بيومٍ هادئ وقفٌ مريح، وعلى GBPJPY
 * بعد خبرٍ داخل ضجيج الشمعة الواحدة (ATR الساعة وحده 25–40 pip). الوقف تحت ATR يُضرب بالتذبذب العادي لا بخطأ الفكرة، وهو
 * أشيع قاعدة وقف عند المتداولين. الشريحة تقيس السوق الآن.
 *
 * الشمعة الجارية تُسقط (`time + tfSec > nowSec`): مداها ناقص يُنزل ATR ويتغيّر مع كل تيك. شموع فاسدة (غير منتهية، ≤0، أعلى<أدنى)
 * تُسقط. `null`: رمز بلا pip (`journalSpec`)، أقلّ من `period + 1` شمعة مغلقة، آخرها أقدم من `ATR_STOP_MAX_AGE_SEC`، أو ATR ≤ 0.
 */
export function atrStopPips(input: {
  symbol: string;
  candles: readonly Candle[] | null | undefined;
  nowSec: number;
  tfSec?: number;
  period?: number;
  mult?: number;
}): number | null {
  const spec = journalSpec(input.symbol);
  const tfSec = input.tfSec ?? ATR_STOP_TF_SEC;
  const period = input.period ?? ATR_STOP_PERIOD;
  const mult = input.mult ?? ATR_STOP_MULT;
  if (!spec || !Array.isArray(input.candles) || !Number.isFinite(input.nowSec)) return null;
  const closed = input.candles
    .filter(
      (c) =>
        c != null &&
        [c.time, c.open, c.high, c.low, c.close].every((v) => typeof v === 'number' && Number.isFinite(v)) &&
        c.open > 0 && c.low > 0 && c.close > 0 && c.high >= c.low && c.high >= Math.max(c.open, c.close) &&
        c.low <= Math.min(c.open, c.close) &&
        c.time + tfSec <= input.nowSec
    )
    .slice()
    .sort((a, b) => a.time - b.time);
  if (closed.length < period + 1) return null;
  if (input.nowSec - closed[closed.length - 1].time > ATR_STOP_MAX_AGE_SEC) return null;
  const atr = computeAtr(closed as Candle[], period)[closed.length - 1];
  if (atr == null || !Number.isFinite(atr) || atr <= 0) return null;
  const pips = (atr * mult) / spec.pipSize;
  return Math.max(1, Math.ceil(pips - 1e-9));
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
 * **نقاطٌ بخانة سعر** بالدفتر: «50» بخانة الهدف لشراء EURUSD على 1.0850 (من رسالة «TP 50 pips») كانت تُحفظ هدفاً عند **50.00**
 * — بالجهة الصحيحة فلا تحذير، و«R:R 1:1960» بالملخّص، وبعد الإغلاق R لا يعني شيئاً. والوقف «25» لبيعٍ كذلك (فوق الدخول).
 * مستوى يبعد عن الدخول **أكثر من نصف السعر** ليس وقفاً ولا هدفاً لأداة لها pip معروف (فوركس/معادن، سنت/micro بزوجها)؛
 * يُقرأ الرقم نقاطاً فيُرجع **السعر المقصود** على تلك المسافة بجهة الخانة (الوقف: جهة الخسارة، الهدف: جهة الربح) لتقترحه
 * اللوحة. يُفحص **قبل** جهة الخطأ: «25» وقفاً لشراء تقول «25 pip؟» لا «الوقف فوق الدخول». `null` لما عداه: رقم دون 1 pip،
 * أو سعر مقترح لا يقع هو نفسه ضمن نصف السعر. الرمز بلا pip (مؤشر/BTC) بقاعدة الخُمس أدناه.
 */
export function levelLooksLikePips(input: {
  symbol: string;
  side: TradeSide;
  entry: number | null;
  level: number | null;
  kind: 'sl' | 'tp';
}): { pips: number; price: number } | null {
  const { side, entry, level, kind } = input;
  const spec = journalSpec(input.symbol);
  if (!finitePos(entry) || !finitePos(level) || level < 1) return null;
  /**
   * **مؤشر/عملة رقمية (بلا pip): نقطةٌ = 1.0 من السعر، والحدّ الخُمس لا النصف.** US30 على 42000 بوقف «50» (من «SL 50 نقطة»)
   * كان يُحفظ وقفاً عند 50.00 بالجهة الصحيحة ⇒ «R:R 1:<0.01» و0R بالمتوسّط؛ وBTCUSD على 65000 بهدف بيعٍ «500» ⇒ «1:129». مستوى
   * **تحت خُمس الدخول** ليس وقفاً ولا هدفاً (هبوط 80% بصفقة واحدة)، والنصف لا يصلح هنا (العملات الرقمية تتحرّك 50% فعلاً)؛ وفوق
   * الدخول لا يُفحص (صعود ×3 لعملة رقمية حقيقي، ونقاطٌ مكتوبة لسعرٍ فوق 1 تقع تحته دائماً). المقترح الدخول ∓ الرقم.
   */
  if (!spec) {
    if (level >= entry * 0.2) return null;
    const down = (side === 'buy') === (kind === 'sl');
    const price = Number((down ? entry - level : entry + level).toPrecision(12));
    return price >= entry * 0.2 ? { pips: level, price } : null;
  }
  /**
   * **المعدن فوق الدخول: الضعف لا النصف.** الذهب صعد من ~1900 إلى فوق 4000 والفضة من ~30 إلى فوق 50 (2023–2025): هدف شراء ذهب
   * على 2650 عند 4000، أو فضة على 30 عند 50، سعرٌ حقيقي لمتداول مراكز — وكان يُقرأ «4000 pip = 3050» ويُمنع الحفظ بالدفتر،
   * والمخرج الوحيد قبول سعرٍ خاطئ (هدفٌ أقصر بـ950$ للأونصة). تضاعف السعر بصفقة واحدة لا يحدث؛ ونقاطٌ بخانة سعر على المعدن
   * فوق ضعف السعر («500» على فضة 30) تبقى مقروءة نقاطاً. الفوركس بلا تغيير (عدد النقاط أكبر من السعر بعشرات المرّات).
   */
  const metal = /^X(AU|AG)/.test(spec.symbol);
  const far = (v: number) => (metal && v > entry ? v > entry * 2 : Math.abs(v - entry) > entry * 0.5);
  /**
   * **تحت الدخول بأكثر من الخُمس ورقمٌ صحيح** يكفي أيضاً: على الين والفضة تقع أعداد النقاط الشائعة داخل نصف السعر — بيع USDJPY
   * على 157.40 بهدف «100» كان يُحفظ هدفاً عند 100.00 (الجهة الصحيحة) و«R:R 1:287»، وGBPJPY «150»، والفضة على 45 بهدف «30».
   * سقوط الخُمس لوقفٍ أو هدف لا يحدث بزوج أو معدن، والرقم الصحيح شرطٌ ثانٍ: السعر الحقيقي يُكتب بكسوره («150.25»)، وعدد
   * النقاط من رسالة «TP 100» صحيح. فوق الدخول يبقى النصف (ذهب 2650 بهدف 3650 حقيقي).
   *
   * **وفوق الدخول بأكثر من الخُمس ورقمٌ صحيح** كذلك للفوركس (لا المعادن — صعودها أعلاه): شراء USDJPY على 157.40 بهدف «200»
   * (200 pip) كان يُحفظ هدفاً عند 200.00 و«R:R 1:142»، وبيعٌ بوقف «200» مخاطرةً بـ4260 pip. عدا الليرة التركية: USDTRY صعد
   * أكثر من الخُمس بسنة، وهدف مراكز «41» على 34 سعرٌ حقيقي.
   */
  const upOk = metal || spec.quote === 'TRY';
  /**
   * **ونصف pip أو عُشره على الفوركس** («100.5» وقفاً لـUSDJPY على 157.40، من «SL 100.5 pips»): كان «كسراً = سعرٌ حقيقي» فيُحفظ
   * وقفاً عند 100.50 ⇒ مخاطرة 5,690 pip. الخُمس نفسه لا يُعبر بزوج في صفقة، فالمنزلة الواحدة تكفي؛ السعر الحقيقي هناك يُكتب
   * بمنزلتين أو ثلاث. المعادن تبقى على الرقم الصحيح (الفضة هبطت ~30% بيوم — هدف «85.5» من 110 سعرٌ ممكن).
   */
  const countLike = (v: number) => (metal ? Number.isInteger(v) : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9);
  const looksPips = (v: number) =>
    far(v) ||
    (countLike(v) && Math.abs(v - entry) > entry * 0.2 && (v < entry || !upOk));
  if (!looksPips(level)) return null;
  const down = (side === 'buy') === (kind === 'sl');
  const price = priceAtPipOffset(spec, entry, down ? -level : level);
  return price != null && !looksPips(price) ? { pips: level, price } : null;
}

/**
 * **الدخول بلا فاصلة عشرية** بالدفتر (tools102a): شراء EURUSD بدخول «10850» ووقف 1.0820 — كان `levelLooksLikePips` يلوم الوقف
 * الصحيح («1.082 pip؟») ويقترح وقفاً عند 10849.99989، والضغطة الثانية تحفظ خسارة −99.99% «أسوأ صفقة» دائمة بالإحصاءات.
 * الدخول ÷ 10^k (k من 1 إلى 6) يقع ضمن **15%** من **كل** مستوى مكتوب (وقف/هدف/خروج) ⇒ `{ price }` المقصود؛ و`null` لما عداه.
 * شرطان يمنعان الإنذار الكاذب: (1) رمزٌ له pip معروف فقط — المؤشرات تُكتب مستوياتها نقاطاً («50» على US30) فتتشابه القراءتان؛
 * (2) المقترح أقرب لسعر الأداة من المكتوب (`pairBallpark`: EURUSD ~1.10، الذهب ~4,000، ZARJPY ~8): ذهب 2650 بوقف «260» (نقاط)
 * يعطي 26.50 رقمياً ضمن 15% لكنه أبعد عن سعر الذهب من 2650 ⇒ لا شيء (يبقى لحارس النقاط)، وذهب «265000» بوقف 2640 ⇒ 2650.
 * مستوى نقاطٍ بين المستويات («25» مع هدف 1.0900) يُفشل «كل مستوى» ⇒ لا تخمين.
 */
export function entryLooksLikeDecimalSlip(input: {
  symbol: string;
  entry: number | null;
  levels: readonly (number | null | undefined)[];
}): { price: number; k: number } | null {
  const { entry } = input;
  const spec = journalSpec(input.symbol);
  if (!spec || !finitePos(entry)) return null;
  const refs = input.levels.filter((v): v is number => finitePos(v));
  if (refs.length === 0) return null;
  const off = (px: number) => Math.abs(Math.log(px / pairBallpark(spec)));
  for (let k = 1; k <= 6; k++) {
    const price = Number((entry / 10 ** k).toPrecision(12));
    if (refs.every((v) => Math.abs(price - v) <= v * 0.15)) return off(price) < off(entry) ? { price, k } : null;
  }
  return null;
}

/**
 * نصّ `journalEntryDecimalSlip` («الدخول «{value}» يبدو بلا فاصلة عشرية — هل تقصد {price}؟»): القيم بدالّة لا نصّ بديل
 * (كـ`levelLooksLikePipsText`) — خانةٌ فيها «$&» لا تُفسَّر نمطاً.
 */
export function entryDecimalSlipText(template: string, value: string, price: string): string {
  const vals: Record<string, string> = { value: value.trim(), price };
  return template.replace(/\{(value|price)\}/g, (_, k: string) => vals[k]);
}

/**
 * **وقف/هدف/خروج بلا فاصلة عشرية** (tools104a، مرآة `entryLooksLikeDecimalSlip`): بيع EURUSD على 1.0850 بوقف «10880» — لا حارس
 * إطلاقاً (`levelLooksLikePips` يعيد null: قراءة النقاط تعطي 2.173، سعراً بعيداً هو نفسه) ⇒ يُحفظ وقفاً عند 10880 والـR ≈ 0
 * يسحب متوسط R للدفتر. المستوى ÷ 10^k (k من 1 إلى 6) ضمن **15%** من الدخول ⇒ `{ price }` المقصود؛ لرمزٍ له pip فقط. بلا شرط
 * «أقرب لسعر الأداة» الذي يحتاجه الدخول: المكتوب هنا ≥ 8.5× الدخول دائماً، ولا وقف ولا هدف حقيقي كذلك بزوج أو معدن — والشرط
 * كان يُسقط ZARJPY (8.5، بعيد عن مرجع EURUSD) بوقف «85». ذهب 2650 بهدف «4000» حقيقي: 400 ليس ضمن 15%. قد يكون للرقم قراءة نقاطٍ أيضاً
 * (USDJPY 157.40 بهدف «1590» ⇒ 159.00 أو 1590 pip = 173.30) — تعرض اللوحة الاقتراحين، والرقم المكتوب نفسه خاطئ بكلتيهما.
 */
export function levelLooksLikeDecimalSlip(input: {
  symbol: string;
  entry: number | null;
  level: number | null;
}): { price: number; k: number } | null {
  const { entry, level } = input;
  const spec = journalSpec(input.symbol);
  if (!spec || !finitePos(entry) || !finitePos(level)) return null;
  for (let k = 1; k <= 6; k++) {
    const price = Number((level / 10 ** k).toPrecision(12));
    if (Math.abs(price - entry) <= entry * 0.15) return { price, k };
  }
  return null;
}

/**
 * **نقاطٌ بخانة الخروج** بالدفتر: «25» (من «أغلقتُ +25») لشراء EURUSD على 1.0850 كانت تُحفظ خروجاً عند **25.00** بلا أي حارس
 * (الوقف والهدف لهما `levelLooksLikePips`) ⇒ «+239,150 pip · +2,204%» و+11,957R، ومتوسّط R للدفتر كلّه +3,986R. القاعدة نفسها،
 * لكن الخروج بأيّ جهة: `win` السعر على تلك المسافة بجهة الربح و`loss` بجهة الخسارة (`null` لما لا يقع ضمن القاعدة). `null` = ليس نقاطاً.
 */
export function exitLooksLikePips(input: {
  symbol: string;
  side: TradeSide;
  entry: number | null;
  exit: number | null;
}): { pips: number; win: number | null; loss: number | null } | null {
  const base = { symbol: input.symbol, side: input.side, entry: input.entry, level: input.exit };
  const win = levelLooksLikePips({ ...base, kind: 'tp' });
  const loss = levelLooksLikePips({ ...base, kind: 'sl' });
  if (!win && !loss) return null;
  return { pips: (win ?? loss)!.pips, win: win?.price ?? null, loss: loss?.price ?? null };
}

/**
 * نصّ سطر «نقاطٌ بخانة سعر» (`levelLooksLikePipsHint`، launch88) للحاسبة والدفتر معاً: `{price}` يتكرّر (الشرح والنقرة) ⇒ كل
 * المواضع؛ والقيم تُدرج بدالّة لا نصّ بديل (خانةٌ فيها «$$50» كانت ستُعرض «$50»). `{pips}` يُكتب كما قرأه `levelLooksLikePips`.
 */
export function levelLooksLikePipsText(
  template: string,
  field: string,
  value: string,
  /** نصّ بإشارة («+25»/«−25») لسطرَي الخروج — `exitLooksLikePips` */
  pips: number | string,
  price: string
): string {
  const vals: Record<string, string> = { field, value: value.trim(), pips: String(pips), price };
  return template.replace(/\{(field|value|pips|price)\}/g, (_, k: string) => vals[k]);
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
  // بادئة البورصة/المزوّد منسوخة من TradingView («OANDA:XAUUSD»، «FX:EURUSD») و«#» وسيطٍ بالأوّل («#US30») تسقط — كما يقشّرها
  // `pipSpec` و`newsRisk`: كان تحذير أخبار الذهب يظهر لـ«OANDA:XAUUSD» ثم يُرفض الحفظ برسالة «رمز غير صالح» العامّة
  raw = raw.trim().replace(/^[A-Z0-9_]+:\s*/i, '').replace(/^#+/, '');
  const up = raw.trim().toUpperCase();
  const spec = instrumentSpec(up);
  const pair = /^([A-Z]{3})[\s/_-]*([A-Z]{3})(.*)$/.exec(up);
  // «EURUSD pro» بمسافة ⇒ «EURUSDPRO» كما كانت تُحفظ قبل أن يعرفها `instrumentSpec` — لا مسافة داخل رمزٍ محفوظ
  if (spec && pair && pair[1] + pair[2] === spec.symbol) return spec.symbol + pair[3].replace(/^\s+/, '');
  // «EURUSD-cent»/«EURUSD_micro» تبقى بلاحقتها: حذف الفاصل كان يُخرج «EURUSDCENT» فتضيع النقاط وسعر السوق
  const small = smallContractPair(up) ?? miniAccountSymbol(up);
  // «EURUSD cent» بمسافة ⇒ «EURUSDCENT» كما كانت تُحفظ قبل أن تعرفها `smallContractPair` — لا مسافة داخل رمزٍ محفوظ
  const tail = pair ? pair[3].replace(/^\s+/, '') : '';
  if (small && pair && pair[1] + pair[2] === small && tail.length <= 6) return small + tail;
  // «BTCUSD#» كـ«GOLD#»: الزوج الرقمي بلاحقة وسيطه بفاصل يُحفظ كما كُتب — كانت «#» تُرفض فرسالة «دخول غير صالح» عامة
  const known = knownSingleName(up) ?? cryptoPairOf(up);
  const suffixed = known ? /^(.*?)([.\-_#+][A-Z0-9]{0,5})$/.exec(up.replace(/[\s/]/g, '')) : null;
  if (known && suffixed && suffixed[1].replace(/[-_]/g, '') === known && (known + suffixed[2]).length <= 12)
    return known + suffixed[2];
  const s = raw.toUpperCase().replace(/[\s/_-]/g, '');
  return /^[A-Z0-9.]{3,12}$/.test(s) ? s : null;
}

/**
 * رمزٌ **سيُحفظ بلا نقاط** (`journalSpec` لا تعرفه) ويبدأ بزوجٍ معروف أو اسم معدن ثم لاحقة («EURUSDi»، «XAUUSDx»، «GOLDi»)
 * ⇒ ذلك الزوج (للسطر `journalSymbolSuffixUnknown`)؛ null = لا سطر. launch184a: كانت الصفقة تُحفظ بلا نقاط ولا R ولا مال
 * **بصمت** — والمتداول لا يعرف أن اللاحقة الملاصقة (غير «m»/«pro»/…) هي السبب.
 * لا يُقترح الزوج وحده حين قد تكون اللاحقة **عقداً أصغر** («C1»، «CENTS»، «CNT»، «USC»، «MIC»، «MINI2»): الزوج العادي يحسب
 * مالها بمئة ضعف — رفضها مقصود (`AMBIGUOUS_SMALL_SUFFIX`). ولا لـ«T» («EURUSDT» يورو/تيثر رقمي)، ولا لـBTCUSD/US30 (بلا نقاط أصلاً).
 */
export function journalUnknownSuffixPair(symbol: string | null | undefined): string | null {
  const up = (symbol || '').trim().toUpperCase();
  if (!up || journalSpec(up) || cryptoPairOf(up) || knownSingleName(up)) return null;
  for (const re of [/^([A-Z]{6})[.#+]?([A-Z0-9.]+)$/, /^(GOLD|SILVER)[.#+]?([A-Z0-9.]+)$/]) {
    const m = re.exec(up);
    if (!m || !instrumentSpec(m[1])) continue;
    return /^(T|C|USC|MIC|MINI)/.test(m[2]) ? null : m[1];
  }
  return null;
}

/**
 * الرمز الذي **تفحص به خانات النموذج** (الحجم، الأسعار، أخطاء الكتابة) = ما سيُحفظ (`journalSymbol`)، وإلا النصّ كما كُتب.
 * «EURUSD m» يُحفظ «EURUSDM» (لوت عادي بلاحقة الوسيط) و«EURUSD c» «EURUSDC» (سنت)، لكن الفحوص كانت تقرأ النصّ الخام الذي
 * لا تعرفه المواصفات ⇒ «10000» (وحدات منسوخة) تُحفظ عشرة آلاف لوت بلا تحذير (+2,500,000 USD بالصفّ)، وحدّ السنت (قرار ١٥)
 * وفحوص «50 بخانة الهدف» و«10850 بلا فاصلة» تسقط بصمت. الفحص والحفظ على الرمز نفسه بالبناء.
 */
export function journalFormSymbol(raw: string): string {
  return journalSymbol(raw) ?? raw;
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
  const up = raw.trim().toUpperCase();
  return smallContractPair(up) ?? miniAccountSymbol(up) ?? instrumentSymbol(raw);
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
  // mini منفصلة عن الزوج العادي كالسنت/micro: مالها مجهول فلا يُخلط بصافي «EURUSD»
  const mini = miniAccountSymbol(raw);
  if (mini) return `${mini}MINI`;
  // «BTCUSDm»/«BTCUSD.m» ⇒ BTCUSD كـ«XAUUSDm» ⇒ XAUUSD: المزوّد يعرف الاسم القانوني وحده
  return instrumentSpec(raw)?.symbol ?? knownSingleName(raw) ?? cryptoPairOf(raw) ?? journalSymbol(raw);
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
 * رأس ملاحظة «سجّل الخطة» (`planJournalNote`): «0.50 lot · {كلمة المخاطرة} 100.00 USD · R:R …» — المبلغ غائب لخطةٍ بلا مخاطرة («risk USD»).
 * اللوت بأي عدد كسور: `planNoteWithSize` نفسه يكتب «0.015 lot» لحجمٍ دون السنت — وكان النمط `\d{2}` فلا يعرفها بعد ذلك:
 * تعديلٌ تالٍ إلى 0.02 أبقى «0.015 lot · Risk 0.75 USD» بجانب 0.02، وإلى 1 كتب «1.00 lot · 0.015 lot · …».
 */
const PLAN_NOTE_HEAD = /^(\d+(?:\.\d+)?) lot · ([^·]*?) (?:(\d[\d,]*(?:\.\d+)?) )?([A-Z]{3})( · R:R [\s\S]*)$/;

/**
 * ملاحظة «سجّل الخطة» بعد **تعديل الحجم** بالدفتر: اللوت بأولها يصير الحجم المكتوب، ومبلغ المخاطرة يُضرب بنسبة الحجمين
 * (المخاطرة = لوت × قيمة النقطة × الوقف، خطّية باللوت). `null` = ليست ملاحظة خطة، أو الحجم غير صالح/مطابق للعلامة.
 *
 * لماذا: الخطة تُسجَّل بـ0.50 والمتداول يُصحّح الحجم إلى 0.30 كما نُفّذ — كان الصف يقول «0.3 lot … 0.50 lot · المخاطرة
 * 100.00 USD» (والحقيقة 60)؛ ومن 0.50 إلى 1 «1.00 lot · 0.50 lot · …» (لوتان بسطر واحد)؛ ومن 1 إلى 0.5 تسقط العلامة ويبقى
 * «المخاطرة 100.00 USD» — ضعف الحقيقة. R:R والسبريد والعمولة للوت لا تتغيّر بالحجم فتبقى كما هي.
 */
function planNoteWithSize(size: number | null | undefined, note: string): string | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return null;
  const m = PLAN_NOTE_HEAD.exec(note);
  if (!m) return null;
  const was = Number(m[1]);
  const cents = Math.round(size * 100);
  const lotText = Math.abs(size * 100 - cents) < 1e-6 ? (cents / 100).toFixed(2) : String(size);
  if (!(was > 0) || lotText === m[1]) return null;
  const ccy = m[4]!;
  let risk = ccy;
  if (m[3] != null) {
    const amount = Number(m[3].replace(/,/g, ''));
    if (!Number.isFinite(amount)) return null;
    risk = formatMoney((amount * size) / was, ccy);
  }
  return `${lotText} lot · ${m[2]} ${risk}${m[5]}`;
}

/**
 * الملاحظة المحفوظة حين **كتب** المتداول الحجم 1 بيده: تُسبق بـ«1.00 lot» (العلامة التي يقرؤها `knownLots`) إن
 * لم تكن فيها. غير 1 (أو بلا حجم) ⇒ الملاحظة كما هي.
 *
 * لماذا: الخادم يحفظ 1 لصفقة بلا حجم، فالحجم 1 المكتوب باليد كان «مجهولاً»: EURUSD 1.0850 ⇒ 1.0875 بلوت واحد تُعرض
 * بلا «1 lot» ولا «+250.00 USD»، ويسقط صافي EURUSD بالمال كلّه، ولا تُقترح 1.00 شريحةً، وتفتح بالتعديل بخانة حجم فارغة.
 */
export function noteWithTypedSize(size: number | null | undefined, note: string, max: number = JOURNAL_NOTE_MAX): string {
  // ملاحظة خطة لا تتّسع بعد الإعادة (حدّ الخادم) ⇒ كما هي: إسقاط العلامة وحدها كان يُبقي مبلغ المخاطرة القديم بلا لوته
  const plan = planNoteWithSize(size, note);
  if (plan != null) return plan.length <= max ? plan : note;
  // حجمٌ آخر **مكتوب** (تعديل 1 ⇒ 0.5): العلامة القديمة تسقط — كان السطر يقول «0.5 lot … 1.00 lot · x» فيناقض نفسه،
  // ولو أُعيد الحجم 1 لاحقاً لقُرئ معروفاً من علامةٍ لم تعد صحيحة. بلا حجم ⇒ كما هي (الخادم يخزّن 1، والعلامة قد تكون صادقة)
  if (typeof size === 'number' && Number.isFinite(size) && size > 0 && size !== 1) {
    return knownLots(1, note) === 1 ? note.replace(/^1\.00 lot(?: · |$)/, '').trimStart() : note;
  }
  if (size !== 1 || knownLots(1, note) === 1) return note;
  const n = note.trim();
  const out = n ? `1.00 lot · ${n}` : '1.00 lot';
  // كـ`noteWithInitialStop`: ملاحظة 495 حرفاً + العلامة (11) تتجاوز حدّ الخادم فيُرفض الحفظ كلّه (422) — حجمٌ مجهول أهون
  return out.length > max ? note : out;
}

/**
 * الأحرف المتاحة للمتداول بخانة الملاحظة: حدّ الخادم ناقص ما ستُلحقه علامتا الحفظ («1.00 lot · » لحجمٍ 1 مكتوب،
 * « · 1R @ …» لوقفٍ مفتوح يُشدّ) بالملاحظة والخطة الحاليتين. لـ`maxLength` الخانة ولعدّاد `noteCharsLeft`.
 *
 * لماذا: العلامتان تسقطان بصمت إن لم تتّسعا (كي لا يُرفض الحفظ كلّه) — ملاحظة 495 حرفاً بحجم 1 تُحفظ بحجمٍ «مجهول»
 * (بلا مال ولا صافٍ للأداة)، وبوقفٍ مشدود يُحسب الـR بالوقف الجديد (+8R بدل +2R بمتوسط R). الخانة كانت تقبل 500 كاملة
 * والعدّاد يقول «0 باقٍ» بعد فوات الأوان. تُقاس العلامة بلا حدّ ثم يُطرح طولها. الحدّ لا يقلّ عن 0.
 */
export function journalNoteRoom(input: {
  symbol: string;
  note: string;
  size: number | null | undefined;
  edit?: {
    before: { side: string; entry: number; sl?: number | null; status: string };
    after: { side: TradeSide; entry: number; sl: number | null };
  } | null;
  /** `noteWithInitialStop` `typoFix` — لا علامة تُحجز لها أحرف */
  typoFix?: boolean;
}): number {
  const { note } = input;
  const typed = noteWithTypedSize(input.size, note, Infinity);
  const full = input.edit
    ? noteWithInitialStop({
        symbol: input.symbol,
        note: typed,
        before: input.edit.before,
        after: input.edit.after,
        max: Infinity,
        typoFix: input.typoFix,
      })
    : typed;
  return Math.max(0, JOURNAL_NOTE_MAX - (full.length - note.length));
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
 * (مئة ضعف) بلا ما يذكّر بمعناها. `null` = لا سطر: رمزٌ عادي/مجهول، حجمٌ غير صالح، أو فوق `JOURNAL_MAX_SMALL_LOTS` (يعرض
 * سطر الوحدات بدله، `journalSizeLooksLikeUnits`).
 */
export function journalSmallLotsStdEquiv(size: number | null | undefined, symbol: string | null | undefined): string | null {
  if (journalContractKind(symbol) !== 'small') return null;
  if (size == null || !Number.isFinite(size) || size <= 0 || size > JOURNAL_MAX_SMALL_LOTS) return null;
  return smallLotsStdEquiv(size);
}

/**
 * حجمٌ كُتب لرمز سنت/micro ثم تبدّل الرمز إلى عقدٍ عادي معروف (`journalSizeFromSmallFix`): «4» لـ«EURUSDC» = 0.04 لوت عادي،
 * وبعد شريحة «EURUSD» تبقى «4» بالخانة = **4 لوت عادي** — مئة ضعف، وسطر «= 0.04» يختفي مع الرمز فلا شيء يذكّر. `std` =
 * `smallLotsStdEquiv(size)` تُقترح بنقرة. `typedFor` = الرمز الذي كُتب له الحجم (آخر كتابة/شريحة/تعديل). `null` = لا سطر:
 * العقد لم يتبدّل من صغير إلى عادي، الرمز الحالي مجهول (وسط الكتابة «EURUS»)، أو الحجم غير صالح/فوق `JOURNAL_MAX_SMALL_LOTS`.
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
 * الصفقات **بترتيب التسجيل** (الأحدث `opened_at` أولاً) لشرائح الدفتر. الخادم يرتّب المفتوحة أولاً ثم الأحدث
 * (`db.list_trades`: `ORDER BY (status='open') DESC, opened_at DESC`) ⇒ صفقةٌ مفتوحة منذ شهر كانت تسبق صفقات أمس
 * المغلقة فتتصدّر شريحةُ حجمها ورمزها. ترتيبٌ ثابت (المتساوية كما جاءت)؛ وإن غاب `opened_at` عن أيّ صفقة
 * فالقائمة كما هي — لا يُخمَّن موضعها.
 */
export function newestRecordedFirst<T extends { opened_at?: string | null }>(trades: readonly T[]): readonly T[] {
  if (!trades.every((tr) => typeof tr.opened_at === 'string' && tr.opened_at)) return trades;
  return trades
    .map((tr, i) => ({ tr, i }))
    .sort((a, b) => {
      const x = a.tr.opened_at as string;
      const y = b.tr.opened_at as string;
      return x < y ? 1 : x > y ? -1 : a.i - b.i;
    })
    .map((x) => x.tr);
}

/**
 * آخر أحجام اللوت **المختلفة** التي سجّلها المتداول (الأحدث أولاً، `max` على الأكثر) — شرائح بخانة الحجم
 * بنموذج الدفتر.
 *
 * لماذا: أغلب متداولي التجزئة يكرّرون حجماً أو اثنين («0.10» و«0.50») بكل صفقة، وكانت الخانة تُكتب
 * بيدٍ كل مرّة — وهي خانة المال: «5» بدل «0.5» صفقةٌ بعشرة أضعاف حجمها تُحفظ بصمت. الأحجام من صفقات
 * المتداول نفسه، فالشريحة لا تقترح رقماً لم يكتبه قط.
 *
 * `trades` بأيّ ترتيب — يُعاد ترتيبها بالتسجيل (`newestRecordedFirst`). الحجم المعروف وحده (`knownLots`: الـ1 الافتراضي بالخادم
 * لا يُقترح)، على خطوة اللوت (0.01) بالضبط كي يطابق نصّ الشريحة «0.50» القيمة المحفوظة، ولا يتجاوز
 * `MAX_SANE_LOTS` (100000 كُتبت وحداتٍ لا لوتاً — لا تُقترح لتتكرّر).
 */
export function recentLotSizes(
  trades: readonly { size?: number | null; note?: string | null; symbol?: string | null; opened_at?: string | null }[],
  max = 3,
  forSymbol?: string | null
): number[] {
  /**
   * `forSymbol`: الشرائح من صفقات **العقد نفسه** فقط (`journalContractKind`). لوت السنت/micro أصغر بمئة مرّة: آخر صفقة
   * «EURUSDC» بـ4.00 كانت تُقترح «4.00» لصفقة «EURUSD» — مركزٌ بمئة ضعف بنقرة (مخاطرة 25 pip = 1,000 USD لا 10).
   * و**mini** («EURUSD.MINI») منفصلة عن العادي بالاتجاهين: لوتها 10,000 وحدة لدى أكثر الوسطاء، فـ«4.00» منها = 0.40 عادي.
   * غائب = كل الصفقات كما كان.
   */
  const want = forSymbol == null ? null : journalContractKind(forSymbol);
  const wantMini = forSymbol == null ? null : isMiniJournalSymbol(forSymbol);
  const cap = want === 'small' ? JOURNAL_MAX_SMALL_LOTS : MAX_SANE_LOTS;
  const out: number[] = [];
  for (const tr of newestRecordedFirst(trades)) {
    if (out.length >= max) break;
    if (want != null && journalContractKind(tr.symbol) !== want) continue;
    if (wantMini != null && isMiniJournalSymbol(tr.symbol) !== wantMini) continue;
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
 * بالكتابة **الأحدث** لها (`newestRecordedFirst`: بوقت التسجيل لا بترتيب الخادم) — لو غيّر وسيطه تتبعه الشريحة. آخر
 * `scan` صفقة فقط كي لا تحجز أداةٌ تُركت منذ شهور مكاناً. رمزٌ لا يصلح للحفظ (`journalSymbol`) يُتخطّى.
 */
export function quickJournalSymbols(
  trades: readonly { symbol?: string | null; opened_at?: string | null }[],
  defaults: readonly string[],
  max = 6,
  scan = 100
): string[] {
  const seen = new Map<string, { text: string; n: number; first: number }>();
  newestRecordedFirst(trades).slice(0, scan).forEach((tr, i) => {
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
 * عدد الصفقات **المفتوحة بوقفٍ صالح** التي لا يُعرف مالُ مخاطرتها (حجمٌ مجهول — الخادم يخزّن 1 بلا «1.00 lot» — أو أداةٌ بلا
 * عقد معروف: BTCUSD، US30، رمز mini) — لسطرٍ يقول لماذا غاب «المخاطرة (مفتوحة)» بدل الصمت. الشرط نفسه: الصفقة وحدها تُسقط
 * `openRiskTotals`. المفتوحة بلا وقف تُعدّ في `openTradesWithoutStop` لا هنا، فلا تُعدّ صفقةٌ مرّتين.
 */
export function openTradesUnknownRisk(trades: Parameters<typeof openRiskTotals>[0]): number {
  let n = 0;
  for (const tr of trades) {
    if (tr.status !== 'open') continue;
    const sl = tr.sl;
    if (typeof sl !== 'number' || !Number.isFinite(sl) || sl <= 0) continue;
    if (openRiskTotals([tr]) == null) n += 1;
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
 * عملاتٌ تراهن عليها **صفقتان مفتوحتان أو أكثر بالاتجاه نفسه** — لسطر `journalExposureStacked` بالدفتر.
 * شراء EURUSD + شراء GBPUSD + بيع USDJPY = ثلاث صفقات «مختلفة» كلّها بيعٌ للدولار: خبرٌ أمريكي واحد يضربها معاً.
 *
 * اتجاهٌ فقط لا حجم: الصفقة المسجَّلة بلا حجم (الخادم يخزّن 1) ما زالت تراهن
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

/**
 * **قبل الدخول**: هل تُضيف الصفقة التي تُكتب الآن رهاناً ثانياً (أو ثالثاً) بالاتجاه نفسه على عملةٍ تحملها صفقاتٌ مفتوحة؟ —
 * لسطر `journalExposureStackedDraft` تحت نموذج الدفتر. سطر التراكم (`stackedCurrencyExposure`) يظهر فوق
 * القائمة **بعد** الحفظ؛ من يحمل شراء EURUSD وGBPUSD ويكتب شراء AUDUSD يُقال له بعدها إنها ثلاث مرّات بيع الدولار — والسؤال
 * كان قبلها.
 *
 * القاعدة نفسها بالضبط (`stackedCurrencyExposure` على المفتوحة + المسودّة): عملةٌ من عملتَي المسودّة تتراكم بعد إضافتها ⇒
 * عنصر، و`before` = ما كان قبلها (≥1). تحوّطٌ (ساق معاكسة) لا يُذكر؛ المسودّة وحدها لا تراكم؛ رمزٌ بلا مواصفات ⇒ `[]`.
 */
export function draftStackedExposure(
  trades: readonly { id?: string | number; symbol: string; side: string; status: string }[],
  draft: { symbol: string; side: TradeSide }
): { ccy: string; before: number; after: number; dir: 'long' | 'short' }[] {
  const spec = journalSpec(draft.symbol?.trim().toUpperCase());
  if (!spec) return [];
  const open = trades.filter((tr) => tr.status === 'open');
  const buy = draft.side !== 'sell';
  const dirOf = (ccy: string): 'long' | 'short' => ((ccy === spec.base) === buy ? 'long' : 'short');
  return stackedCurrencyExposure([...open, { symbol: draft.symbol, side: draft.side, status: 'open' }])
    .filter((x) => (x.ccy === spec.base || x.ccy === spec.quote) && x.dir === dirOf(x.ccy))
    .map((x) => ({ ccy: x.ccy, before: x.n - 1, after: x.n, dir: x.dir }));
}

/**
 * نصّ سطر التراكم قبل الدخول (`journalExposureStackedDraft`، launch): «بهذه الصفقة يصير … {after} (المفتوحة الآن: {before})».
 * «3 (+1)» بالقالب القديم كان يسمّي الصفقة غير المحفوظة «مفتوحة». القيم بدالّة لا نصّ بديل (كـ`levelLooksLikePipsText`).
 */
export function draftStackedExposureText(
  template: string,
  x: { ccy: string; before: number; after: number }
): string {
  const vals: Record<string, string> = { ccy: x.ccy, before: String(x.before), after: String(x.after) };
  return template.replace(/\{(ccy|before|after)\}/g, (_, k: string) => vals[k]);
}

/** عمر لقطة أسعار الصفقات المفتوحة الذي تُجدَّد بعده عند عودة التطبيق للواجهة. */
export const OPEN_QUOTES_REFRESH_AFTER_MS = 60_000;

/**
 * هل تُجدَّد لقطة أسعار الصفقات المفتوحة عند عودة التطبيق للواجهة؟ اللقطة كانت تُؤخذ مع تحميل الدفتر فقط
 * فتبقى ساعاتٍ بعد الرجوع من الخلفية: EURUSD شراء 1.0850 يبقى «+10 pip» والسوق نزل إلى 1.0800.
 * لا لقطة سابقة (`lastAt` null) ⇒ لا — لا صفقات مفتوحة أو لم يكتمل التحميل الأول. ساعة رجعت للخلف ⇒ نعم.
 */
export function openQuotesRefreshDue(lastAt: number | null, now: number): boolean {
  if (lastAt == null || !Number.isFinite(lastAt) || !Number.isFinite(now)) return false;
  const age = now - lastAt;
  return age < 0 || age >= OPEN_QUOTES_REFRESH_AFTER_MS;
}

/** أقلّ مهلة بين ضغطة المنع والضغطة التي تقول «السعر كما كتبته» — دون ذلك نقرٌ مزدوج لم يُقرأ فيه التحذير */
export const SAVE_OVERRIDE_MIN_MS = 600;

/**
 * هل تُقبل ضغطة الحفظ هذه تأكيداً لـ«نقاط بخانة سعر»؟ نعم إن سبقتها ضغطةٌ مُنعت على **النموذج نفسه** (`key`) قبل
 * `SAVE_OVERRIDE_MIN_MS` على الأقل. كان يكفي أيّ ضغطة ثانية: نقرٌ مزدوج على «أضف» بهدف «50» على EURUSD يحفظ هدفاً عند
 * 50.00 قبل أن يظهر سطر التحذير. ساعة رجعت للخلف ⇒ لا تأكيد (يُعاد التسليح).
 */
export function saveOverrideAccepted(armed: { key: string; at: number } | null, key: string, now: number): boolean {
  if (armed == null || armed.key !== key) return false;
  const age = now - armed.at;
  return Number.isFinite(age) && age >= SAVE_OVERRIDE_MIN_MS;
}
