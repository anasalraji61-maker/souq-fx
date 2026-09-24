/**
 * حاسبة حجم المركز (Position size) — رياضيات صرفة بلا React/شبكة، قابلة للاختبار بـ
 * `positionSize.selftest.ts`.
 *
 * المصطلحات (متداول تجزئة):
 * - pip: 0.0001 لأغلب الأزواج، 0.01 للأزواج المسعّرة بالين (JPY)، 0.1 للذهب XAUUSD، 0.01 للفضة XAGUSD.
 * - اللوت القياسي: 100,000 وحدة من العملة الأساس (الذهب 100 أونصة، الفضة 5,000 أونصة).
 * - قيمة الـpip للوت واحد = حجم العقد × حجم الـpip، بعملة التسعير (الثانية)، ثم تُحوَّل لعملة الحساب.
 *
 * تنبيه: مواصفات العقود تختلف بين الوسطاء (خصوصاً المعادن) — النتيجة تقدير تعليمي.
 */

/**
 * عملات الحساب الشائعة لدى وسطاء التجزئة: العملات الثماني الرئيسية كاملةً.
 *
 * النيوزيلندي كان الوحيد الغائب من الثماني رغم أن NZDUSD **أداةٌ يتداولها التطبيق أصلاً** (قائمة
 * المزوّد بـbackend/twelve_data.py): متداول بحساب نيوزيلندي لم يكن يجد عملته بالقائمة إطلاقاً،
 * فيحسب حجم مركزه بعملة ليست عملة حسابه — أي رقم مخاطرة بالدولار عن حسابٍ رصيدُه نيوزيلندي.
 * أُضيف بعد أن صار جسر الدولار (`usdBridge`) يضمن سعر تحويل تلقائياً لكل تركيباته، فلا تُضاف عملة
 * نصفُ أدواتها يطلب إدخال السعر يدوياً.
 */
export type AccountCcy = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'NZD' | 'CAD' | 'CHF' | 'JPY';
export const ACCOUNT_CCYS: AccountCcy[] = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'JPY'];

export type InstrumentSpec = {
  symbol: string;
  base: string;
  quote: string;
  pipSize: number;
  contractSize: number;
};

const METALS: Record<string, { pipSize: number; contractSize: number }> = {
  XAU: { pipSize: 0.1, contractSize: 100 },
  XAG: { pipSize: 0.01, contractSize: 5000 },
};

/** ترتيب التسعير المتعارف عليه بسوق الفوركس (العملة الأعلى أولوية تأتي أساساً بالزوج). */
const CCY_PRIORITY = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

/**
 * عملات ورقية معروفة (رموز ISO) — أي زوج من 6 أحرف خارجها (BTCUSD/ETHUSD…) ليس فوركس ولا يُحسب له
 * pip بـ0.0001؛ كان يُقبل خطأً سابقاً فتخرج حاسبة المخاطرة بحجم لوت لا معنى له للعملات الرقمية.
 */
const FIAT = new Set([
  ...CCY_PRIORITY,
  // عملات pip المعيارية لها 0.0001 لدى أغلب الوسطاء فقط؛ عملات بتسعير مختلف (HUF/CZK/KRW…) تُترك
  // مرفوضة عمداً بدل حساب pip خاطئ.
  'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'ZAR', 'MXN', 'SGD', 'HKD', 'CNH', 'ILS', 'SAR', 'AED',
]);

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

export function instrumentSpec(raw: string): InstrumentSpec | null {
  const symbol = normalizeSymbol(raw);
  if (!/^[A-Z]{6}$/.test(symbol)) return null;
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  if (base === quote) return null;
  const metal = METALS[base];
  if (metal) return { symbol, base, quote, ...metal };
  if (METALS[quote]) return null;
  if (!FIAT.has(base) || !FIAT.has(quote)) return null;
  return { symbol, base, quote, pipSize: quote === 'JPY' ? 0.01 : 0.0001, contractSize: 100_000 };
}

/**
 * الزوج اللازم لتحويل عملة التسعير إلى عملة الحساب. `invert=false` يعني أن سعر الزوج نفسه هو
 * "كم وحدة من عملة الحساب لكل وحدة من عملة التسعير"؛ `invert=true` يعني أخذ مقلوب السعر.
 * null = لا حاجة لتحويل (عملة التسعير = عملة الحساب).
 */
export function conversionPair(quote: string, account: string): { symbol: string; invert: boolean } | null {
  if (quote === account) return null;
  const qi = CCY_PRIORITY.indexOf(quote);
  const ai = CCY_PRIORITY.indexOf(account);
  // عملة غير مدرجة بالترتيب: نفترض عملة الحساب أساساً (USDXXX، EURXXX…) وهو الشائع للعملات الناشئة —
  // عدا الين: يبقى عملة تسعير دائماً بالسوق (ZARJPY/TRYJPY/MXNJPY/NOKJPY…)، فحساب بالين مع عملة
  // ناشئة كان يطلب زوجاً غير متداول «JPYZAR» فتتوقف الحاسبة عند «تعذّر سعر التحويل».
  const quoteFirst = qi !== -1 ? ai === -1 || qi < ai : account === 'JPY';
  return quoteFirst
    ? { symbol: `${quote}${account}`, invert: false }
    : { symbol: `${account}${quote}`, invert: true };
}

/**
 * الزوج المعكوس لزوج التحويل (ZARCHF ↔ CHFZAR) — محاولة ثانية تلقائية إن لم يجد المزوّد سعر الترتيب
 * المتوقَّع (ترتيب التسعير للعملات الناشئة يختلف بين المزوّدين)، قبل طلب إدخال السعر يدوياً.
 */
export function reversedConversion(conv: { symbol: string; invert: boolean }): { symbol: string; invert: boolean } {
  return { symbol: `${conv.symbol.slice(3, 6)}${conv.symbol.slice(0, 3)}`, invert: !conv.invert };
}

/**
 * **جسر الدولار**: عملة التسعير → USD → عملة الحساب، حين لا يعرف المزوّد زوج التحويل المباشر ولا
 * معكوسه.
 *
 * مزوّد الأسعار يعرف قائمة أزواج محدودة، وأزواج الدولار كلها فيها بينما كثير من التقاطعات ليست:
 * فحسابٌ بالفرنك على USDJPY يطلب `CHFJPY`، وحسابٌ بالكندي على USDCAD يطلب `AUDCAD`، وحسابٌ باليورو
 * على USDCAD يطلب `EURCAD` — وهذه كلها تقاطعات قد لا يجدها المزوّد، فتقف الحاسبة عند «أدخل سعر
 * التحويل يدوياً» بتركيبات **عادية تماماً** لمتداول تجزئة، لا بحالات نادرة. وكل عملة حساب مدعومة
 * لها زوج دولار متداول (EURUSD/GBPUSD/AUDUSD/USDCAD/USDCHF/USDJPY)، فالجسر يُغلق الفجوة بطلبين
 * معروفَي التوفّر بدل طلب واحد قد لا يوجد.
 *
 * `null` حين لا معنى للجسر: عملة التسعير أو عملة الحساب دولارٌ أصلاً (الجسر حينها **هو** الزوج
 * المباشر نفسه، فطلبه ثانيةً لا يضيف شيئاً)، أو العملتان واحدة (لا تحويل).
 */
export function usdBridge(
  quote: string,
  account: string
): { first: { symbol: string; invert: boolean }; second: { symbol: string; invert: boolean } } | null {
  if (quote === account || quote === 'USD' || account === 'USD') return null;
  const first = conversionPair(quote, 'USD');
  const second = conversionPair('USD', account);
  if (!first || !second) return null;
  return { first, second };
}

/**
 * سعر التحويل عبر الجسر: (وحدات دولار لكل وحدة تسعير) × (وحدات حساب لكل دولار). `null` إن تعذّر
 * أحد السعرين — لا يُحسب حجم مركز من ساقٍ واحدة.
 */
export function bridgedRate(
  bridge: { first: { invert: boolean }; second: { invert: boolean } },
  firstPrice: number | null,
  secondPrice: number | null
): number | null {
  const a = quoteToAccountRate(bridge.first, firstPrice);
  const b = quoteToAccountRate(bridge.second, secondPrice);
  return a != null && b != null ? a * b : null;
}

/** كم وحدة من عملة الحساب تساوي وحدة واحدة من عملة التسعير، من سعر زوج التحويل. */
export function quoteToAccountRate(conv: { invert: boolean } | null, pairPrice: number | null): number | null {
  if (!conv) return 1;
  if (pairPrice == null || !Number.isFinite(pairPrice) || pairPrice <= 0) return null;
  return conv.invert ? 1 / pairPrice : pairPrice;
}

/** قيمة الـpip للوت قياسي واحد، بعملة الحساب. */
export function pipValuePerLot(spec: InstrumentSpec, quoteToAccount: number): number {
  return spec.contractSize * spec.pipSize * quoteToAccount;
}

/**
 * المسافة بين سعرين بنقاط **الأداة** (الين 0.01، الذهب 0.1، الفضة 0.01، والبقية 0.0001)، مقرَّبة
 * لعُشر pip (النقطة الكسرية pipette). بلا إشارة: المسافة كمّية، ومن يريد الاتجاه يعرفه من السعرين.
 *
 * «كم يبعد هذا السعر عن السوق» سؤالٌ يتكرّر بكل أدوات المتداول — وقفٌ عن دخول، تنبيهٌ عن السوق،
 * هدفٌ عن سعرٍ حيّ — وكان يُكتب بكل موضع بيده (`Math.round(Math.abs(a-b)/pipSize*10)/10`). موضعٌ
 * واحد مبرهَن بحالات دائمة يمنع أن يُكتب أحدها بحجم pip عام فيخرج «12000 نقطة» على زوج ين.
 *
 * `null` لسعرٍ غير صالح أو غير موجب. **الصفر قيمة صادقة** (سعرٌ عند السوق تماماً) لا «لا شيء».
 */
export function pipsBetween(spec: InstrumentSpec, a: number, b: number): number | null {
  if (![a, b].every((v) => Number.isFinite(v) && v > 0)) return null;
  return Math.round((Math.abs(a - b) / spec.pipSize) * 10) / 10;
}

/**
 * مسافة وقف الخسارة بالنقاط من سعرَي الدخول والوقف (المتداول يفكّر غالباً بالسعر على الشارت لا بالـpip).
 * مقرَّبة لعُشر pip (النقاط الكسرية pipette). null إن كان أحدهما غير صالح أو تساويا — وقفٌ عند الدخول
 * ليس وقفاً، خلافاً لتنبيهٍ عند السوق.
 */
export function slPipsFromPrices(spec: InstrumentSpec, entry: number, stop: number): number | null {
  const pips = pipsBetween(spec, entry, stop);
  return pips != null && pips > 0 ? pips : null;
}

/**
 * السعر الواقع على بُعد `offsetPips` نقطة من `price` (موجب = فوقه، سالب = تحته) بحجم pip **الأداة**:
 * الين 0.01، الذهب 0.1، الفضة 0.01، والبقية 0.0001. المتداول يفكّر بالمسافة («عشرون نقطة فوق
 * السوق») لا بالرقم، فهذا التحويل يقع كلما تُرجمت مسافة إلى سعر يُعرض أو يُحفظ — وشرائح المسافات
 * بلوح التنبيهات أوّلها. null لمدخل غير صالح أو سعر ناتج ≤ 0 (لا سعر سالب بخانة تنبيه).
 *
 * يُقرَّب لمنزلة الأداة العشرية (`-log10(pipSize) + 1`، أي منزلة الـpipette) كي لا يخرج
 * «1.0860000000000003» من جمع الفاصلة العائمة إلى خانة يقرأها المتداول أو يُحفظ بها تنبيه. وهي
 * **نفس** معادلة `symbolPriceDecimals` التي يبني عليها `formatPrice` عرضَ الأسعار، فالقيمة
 * المحفوظة والنصّ المعروض متطابقان بالبناء لا بالمصادفة. (التقريب بـ`Math.round(x/step)*step`
 * لا يكفي: الضرب العكسي يعيد الخطأ العائم نفسه — 1.085 + 0 كان يخرج 1.0850000000000002.)
 */
export function priceAtPipOffset(spec: InstrumentSpec, price: number, offsetPips: number): number | null {
  if (![price, offsetPips].every((v) => Number.isFinite(v))) return null;
  if (price <= 0) return null;
  const raw = price + offsetPips * spec.pipSize;
  if (!(raw > 0)) return null;
  const decimals = Math.round(-Math.log10(spec.pipSize)) + 1;
  return Number(raw.toFixed(decimals));
}

export const LOT_STEP = 0.01;

export type SizeResult = {
  riskAmount: number;
  rawLots: number;
  /** مقرَّب للأسفل لأقرب 0.01 — لا يتجاوز المخاطرة المطلوبة أبداً */
  lots: number;
  /** المخاطرة الفعلية بعد التقريب */
  actualRisk: number;
  units: number;
  /**
   * قيمة الـpip **لهذا المركز** (اللوت المقرَّب × قيمة الـpip للوت)، بعملة الحساب. الحاسبة كانت تعرض
   * قيمة الـpip للوت القياسي وحده — «10 USD» — بينما ما يراقبه المتداول وهو بالصفقة هو «كل نقطة
   * عليّ 3.50»، وكان يُترك ليضرب بنفسه. محسوبةٌ من اللوت **المقرَّب** نفسه الذي تُحسب منه
   * `actualRisk`، فـ`pipValue × slPips = actualRisk` بالبناء.
   */
  pipValue: number;
  belowMinLot: boolean;
};

export function positionSize(input: {
  balance: number;
  riskPct: number;
  slPips: number;
  pipValuePerLot: number;
  contractSize: number;
}): SizeResult | null {
  const { balance, riskPct, slPips, pipValuePerLot: pv, contractSize } = input;
  if (![balance, riskPct, slPips, pv].every((v) => Number.isFinite(v) && v > 0)) return null;
  if (riskPct > 100) return null;
  const riskAmount = (balance * riskPct) / 100;
  const rawLots = riskAmount / (slPips * pv);
  // إزاحة صغيرة تمنع أخطاء الفاصلة العائمة (0.29999999 → 0.29 خطأً) قبل التقريب للأسفل
  const lots = Math.floor(rawLots / LOT_STEP + 1e-9) * LOT_STEP;
  const roundedLots = Math.round(lots * 100) / 100;
  return {
    riskAmount,
    rawLots,
    lots: roundedLots,
    actualRisk: roundedLots * slPips * pv,
    units: Math.round(roundedLots * contractSize),
    pipValue: roundedLots * pv,
    belowMinLot: roundedLots < LOT_STEP,
  };
}

/**
 * المخاطرة **الفعلية** لحجم لوت معيّن على وقفٍ معيّن: بعملة الحساب وبنسبةٍ من الرصيد.
 *
 * لماذا: حين تخرج الحاسبة «أقل من أصغر لوت» كانت تقول كم **أراد** المتداول أن يخاطر (0.50 USD)
 * وتسكت عن السؤال الذي يليه مباشرةً: «وإن فتحتُ أصغر لوت، كم أخاطر فعلاً؟» — 0.01 لوت على وقف 30
 * pip برصيد 50$ = 3.00 USD أي **6%** من الحساب، أي ستة أضعاف ما اختاره. رقمٌ يجب أن يُرى قبل أن
 * يفتح الصفقة بأصغر لوت ظنّاً أنه «الأقرب». وكذلك بالنتيجة العادية: التقريب للأسفل يجعل المخاطرة
 * الفعلية أقل من المطلوبة (0.87% بدل 1%)، والنسبة تقول ذلك بوحدة المتداول نفسها.
 *
 * `null` لأي مدخل غير صالح أو غير موجب (لا نسبة من رصيد صفر).
 */
export function riskForLots(input: {
  lots: number;
  slPips: number;
  pipValuePerLot: number;
  balance: number;
}): { risk: number; pct: number } | null {
  const { lots, slPips, pipValuePerLot: pv, balance } = input;
  if (![lots, slPips, pv, balance].every((v) => Number.isFinite(v) && v > 0)) return null;
  const risk = lots * slPips * pv;
  return { risk, pct: (risk / balance) * 100 };
}

/**
 * نسبة مخاطرة للعرض: منزلتان تحت 10% («0.87%»، «6.00%»)، ومنزلة واحدة فوقها («12.5%»). تقريبٌ لا
 * قصّ، وبلا إشارة (المخاطرة كمّية لا اتجاه).
 */
export function formatRiskPct(pct: number): string {
  if (!Number.isFinite(pct) || pct < 0) return '—';
  return `${pct.toFixed(pct < 10 ? 2 : 1)}%`;
}
