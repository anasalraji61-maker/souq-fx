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

import { normalizeDigits, parseDecimal, stripUnitWord } from './parseDecimal';

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

/**
 * أطول رمزٍ تقبله الحاسبة كما يُكتب: زوجٌ بفاصل («EUR/USD»، 7) + لاحقة وسيط بفاصل حتى 5 («.micro»، «.cent»، «.pro12») = 13.
 * خانة الرمز كانت 10 أحرف فتنقطع «EURUSDmicro» عند «EURUSDmicr» (رمز مجهول) — حساب micro لا يُبلغ من الحاسبة أصلاً،
 * و«EURUSD-cent»/«XAUUSD_cent» كذلك.
 */
export const SYMBOL_INPUT_MAX_LEN = 13;

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * لاحقة الوسيط على رمز فوركس/معدن: «EURUSD.m»، «XAUUSD.pro»، «GBPJPY-ECN»، «USDJPY#»، و«EURUSDm»
 * (حرف m ملاصق — شائع جداً لدى وسطاء التجزئة بالمنطقة). الدفتر يقبل هذه الرموز عمداً (`journalSymbol`)
 * لأن المتداول ينسخ الرمز من منصّته، لكن `normalizeSymbol` كان يُخرج «EURUSDM» (7 أحرف) فتُرفض الأداة:
 * صفقة «XAUUSD.m» تُحفظ بلا نقاط ولا مخاطرة بالمال ولا شرائح هدف بالنسبة — بصمت، بينما «XAUUSD» بجانبها
 * تُحسب كاملة. اللاحقة **بفاصل** (`. - _ # +`) حتى 5 أحرف/أرقام، أو **M وحدها ملاصقة** لا غير: حرف آخر
 * ملاصق قد يكون جزءاً من رمز آخر («EURUSDT» زوج يورو/تيثر رقمي) فيُترك مرفوضاً بدل التخمين.
 * وكلمات نوع الحساب الملاصقة («EURUSDpro»، «GBPJPYecn»، «XAUUSDraw»، «USDJPYstd»، «EURUSDstp»، «EURUSDvip») — عقدٌ عادي،
 * والشارت يقرؤها (`chartPipSpec`) فكانت الحاسبة وحدها تقول «رمز غير معروف» والدفتر يحفظها بلا نقاط. كلماتٌ لا حروف:
 * الحاسبة والدفتر يكتبان بالأحرف الكبيرة فلا يُفرَّق «EURUSDt» عن «EURUSDT». «micro»/«c» الملاصقتان عقدٌ أصغر (`smallContractPair`).
 */
const BROKER_SUFFIXED = /^([A-Z]{3})[/\s_-]?([A-Z]{3})(?:[.\-_#+][A-Z0-9]{0,5}|M|PRO|ECN|RAW|STD|STP|VIP)$/;

/**
 * اسما الذهب والفضة الفوريين بمنصّات وسطاء كثيرين («GOLD»، «SILVER»، «GOLD#»، «GOLD.m») — العقد نفسه
 * (الذهب 100 أونصة بالدولار، الفضة 5,000) باسمٍ آخر. كانا يُرفضان: صفقة «GOLD» بالدفتر تُحفظ بلا نقاط ولا
 * R ولا مال ولا نتيجة عائمة (المزوّد لا يعرف إلا XAU/USD)، والحاسبة تقول «رمز غير معروف». اللاحقة **بفاصل**
 * كقاعدة `BROKER_SUFFIXED`: بفاصل، أو M وكلمات نوع الحساب ملاصقةً («GOLDm»، «SILVERm»، «GOLDpro»، «GOLDecn»). «GOLDm» كانت
 * «رمز غير معروف» بالحاسبة والدفتر بينما الشارت يقرؤها ذهباً (`chartPipSpec`) — الرمز نفسه يعمل بشاشة ولا يعمل بأخرى،
 * وM ملاصقة مقبولة أصلاً على «XAUUSDm». حرفٌ آخر ملاصق («GOLDX»، «SILVERY») يبقى مرفوضاً؛ «GOLDc»/«GOLDmicro» عقدٌ أصغر.
 */
const METAL_NAMES = /^(GOLD|SILVER)(?:[.\-_#+][A-Z0-9]{0,5}|M|PRO|ECN|RAW|STD|STP|VIP)?$/;
const METAL_NAME_SYMBOL: Record<string, string> = { GOLD: 'XAUUSD', SILVER: 'XAGUSD' };

/**
 * لاحقة **عقدٍ أصغر بمئة مرّة** بفاصل: «EURUSD.c»، «EURUSD-cent»، «XAUUSD_cent»، «GOLD.c» (حساب سنت)، و«EURUSD.micro»
 * (حساب micro: اللوت 1,000 وحدة). كانت تمرّ بقاعدة `BROKER_SUFFIXED` كأي لاحقة («.pro»، «.m») فتحسب الحاسبة **لوت
 * الحساب العادي**: 1% من 1000 بوقف 25 pip = 0.04 لوت، بينما حساب السنت يحتاج 4.00 — مخاطرة أصغر بمئة مرّة مما قيل
 * (أو بالعكس لمن رصيده بالسنت: 100,000 سنت = 1,000 دولار تُحسب مئة ألف ⇒ لوت أكبر بمئة مرّة). والدفتر يحسب لها
 * مالاً خاطئاً بمئة ضعف. «c» الملاصقة مرفوضة أصلاً (`centAccountSymbol`)؛ بالفاصل صارت مثلها.
 */
const SMALL_CONTRACT_SUFFIX = /[.\-_#+](C|CENT|MICRO)$/;

/**
 * لاحقة **حساب mini** بفاصل («EURUSD.mini»، «GBPJPY-MINI»، «GOLD_mini»): كانت تمرّ بقاعدة `BROKER_SUFFIXED` (حتى 5 أحرف
 * بعد الفاصل) كعقدٍ عادي 100,000 ⇒ الحاسبة تقول 0.40 لوت حيث حساب mini (10,000 وحدة لدى وسطاء كُثر) يحتاج 4.00 — مخاطرة
 * أصغر بعشر مرّات مما قيل — والدفتر يكتب مالاً أكبر بعشر مرّات. وحجم لوت «mini» يختلف بين الوسطاء (10,000 عند أكثرهم،
 * وعقدٌ عادي باسمٍ تجاري عند غيرهم) فلا يُخمَّن: `instrumentSpec` يرفضه (لا لوت ولا مال)، والدفتر يحسب له النقاط والأسعار
 * بالزوج العادي (`miniAccountSymbol`). «EURUSDmini» الملاصقة مرفوضة أصلاً.
 */
const MINI_SUFFIX = /[.\-_#+]MINI$/;

export function instrumentSpec(raw: string): InstrumentSpec | null {
  if (SMALL_CONTRACT_SUFFIX.test(raw.trim().toUpperCase())) return null;
  if (MINI_SUFFIX.test(raw.trim().toUpperCase())) return null;
  let symbol = normalizeSymbol(raw);
  const named = METAL_NAMES.exec(raw.trim().toUpperCase());
  if (named) symbol = METAL_NAME_SYMBOL[named[1]];
  if (!/^[A-Z]{6}$/.test(symbol)) {
    const m = BROKER_SUFFIXED.exec(raw.trim().toUpperCase());
    if (!m) return null;
    symbol = m[1] + m[2];
  }
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  if (base === quote) return null;
  const metal = METALS[base];
  // المعدن يُسعَّر بعملة ورقية فقط: «XAUXAG» أو «XAUBTC» كانا يُقبلان فتطلب الحاسبة زوج تحويل لا
  // وجود له («USDXAG»، «USDBTC») وتحسب قيمة pip بعملة ليست عملة.
  if (metal) return FIAT.has(quote) ? { symbol, base, quote, ...metal } : null;
  if (METALS[quote]) return null;
  if (!FIAT.has(base) || !FIAT.has(quote)) return null;
  return { symbol, base, quote, pipSize: quote === 'JPY' ? 0.01 : 0.0001, contractSize: 100_000 };
}

/**
 * رمز **حساب سنت** (Exness Cent: «EURUSDc»، «USDJPYc»، «XAUUSDc»، «GOLDc») ⇒ الزوج العادي («EURUSD»)؛ null = ليس كذلك.
 * `instrumentSpec` لا يقبله (لوت السنت أصغر بمئة مرّة — عقد الحساب العادي يُعطي لوتاً خاطئاً بمئة ضعف)؛ الحاسبة تحسبه بعقد
 * الزوج ÷ 100 ورصيد بالـUSC (`smallContractSpec`)، والدفتر نقاطاً بلا مال. «c» أو «C» ملاصقة لزوج صالح أو اسم معدن فقط، كالشارت
 * (`chartPipSpec`)؛ رمزٌ تقبله الحاسبة أصلاً ليس سنتاً، ولاحقة فوق لاحقة («EURUSDmc») لا تُخمَّن.
 */
export function centAccountSymbol(raw: string): string | null {
  const s = raw.trim();
  if (instrumentSpec(s)) return null;
  const m =
    /^([A-Za-z]{3}[/\s_-]?[A-Za-z]{3}|GOLD|SILVER|gold|silver|Gold|Silver)[cC]$/.exec(s) ??
    /^([A-Za-z]{3}[/\s_-]?[A-Za-z]{3}|GOLD|SILVER)[.\-_#+](?:C|CENT)$/i.exec(s);
  if (!m) return null;
  return instrumentSpec(m[1])?.symbol ?? null;
}

/**
 * رمز حساب **بعقدٍ أصغر بمئة مرّة** — سنت (`centAccountSymbol`) أو micro («EURUSD.micro»، ومُلاصقةً «EURUSDmicro» كما
 * يسمّيها XM بحساب Micro) ⇒ الزوج العادي. السعر والـpip كالزوج العادي تماماً (لنقاط الدفتر وسعر السوق)، والمال وحده
 * مجهول. «micro» الملاصقة كلمةٌ لا عملة، فلا تُخلط بأداة أخرى كـ«c»/«T» الملاصقتين. null = ليس كذلك.
 */
export function smallContractPair(raw: string): string | null {
  const cent = centAccountSymbol(raw);
  if (cent) return cent;
  const m = /^([A-Za-z]{3}[/\s_-]?[A-Za-z]{3}|GOLD|SILVER)[.\-_#+]?MICRO$/i.exec(raw.trim());
  return m ? instrumentSpec(m[1])?.symbol ?? null : null;
}

/**
 * رمز **حساب micro** («EURUSDmicro»، «EURUSD.micro»، «GOLD_micro») ⇒ الزوج العادي؛ null = ليس كذلك (والسنت ليس micro:
 * له `centAccountSymbol`). لسطر `journalMicroNoMoney` بالدفتر؛ الحاسبة تحسبه بلوت micro (`smallContractSpec`).
 */
export function microAccountSymbol(raw: string): string | null {
  if (centAccountSymbol(raw)) return null;
  return smallContractPair(raw);
}

/**
 * رمز **حساب mini** («EURUSDmini»، «EURUSD.mini»، «GOLD_MINI») ⇒ الزوج العادي؛ null = ليس كذلك. السعر والـpip كالزوج العادي
 * (نقاط الدفتر وسعر السوق)، والمال **مجهول**: حجم لوت mini يختلف بين الوسطاء — راجع `MINI_SUFFIX`.
 */
export function miniAccountSymbol(raw: string): string | null {
  const m = /^([A-Za-z]{3}[/\s_-]?[A-Za-z]{3}|GOLD|SILVER)[.\-_#+]?MINI$/i.exec(raw.trim());
  return m ? instrumentSpec(m[1])?.symbol ?? null : null;
}

/** السنت بالدولار: 100 USC = 1 USD. عملة حساب السنت (`smallContractSpec`) = الدولار ÷ 100. */
export const CENTS_PER_USD = 100;

/**
 * مواصفات **الحاسبة** لرمز حساب سنت/micro: الزوج العادي بعقدٍ أصغر بمئة مرّة (EURUSD 1,000 وحدة، الذهب أونصة، الفضة
 * 50) — فتخرج اللوتات بلوت السنت/micro الذي يكتبه المتداول بمنصّته، والوحدات والهامش والربح من العقد الحقيقي.
 * `kind` = `'cent'` ⇒ عملة المال USC (رصيد وعمولة ومخاطرة بالسنت كما تعرضها المنصّة): سعر التحويل يُحسب لحساب دولار
 * ثم × `CENTS_PER_USD` (`centQuoteToAccount`). `'micro'` ⇒ عملة الحساب كما هي.
 *
 * لماذا: الحاسبة كانت ترفض «EURUSDc»/«EURUSDmicro» (رسالة «استخدم الزوج العادي») — والمتداول بحساب سنت لا يستطيع
 * حساب لوته إلا بقسمة رصيده على مئة ثم ضرب اللوت بمئة بيده: الخطوتان اللتان تنزلق فيهما منزلتان ⇒ مركزٌ بمئة ضعف.
 * null = رمز عادي (`instrumentSpec`) أو مجهول.
 */
export function smallContractSpec(raw: string): { kind: 'cent' | 'micro'; spec: InstrumentSpec } | null {
  if (instrumentSpec(raw)) return null;
  const pair = smallContractPair(raw);
  const std = pair ? instrumentSpec(pair) : null;
  if (!std) return null;
  const kind = centAccountSymbol(raw) ? 'cent' : 'micro';
  return { kind, spec: { ...std, contractSize: std.contractSize / 100 } };
}

/**
 * لاحقة السنت/micro كما كتبها المتداول («c»، «.c»، «-cent»، «micro»، «_MICRO») — لتُعاد على زوجٍ آخر بنقرة
 * (`withSmallSuffix`): حساب السنت يكتب «c» على كل رموزه، فشرائح الأزواج الجاهزة بلا لاحقته كانت تُخرجه من وضع السنت
 * برصيدٍ آخر. null = ليس رمز سنت/micro.
 */
export function smallContractSuffix(raw: string): string | null {
  const s = raw.trim();
  if (!smallContractSpec(s)) return null;
  const m = /[.\-_#+]?(?:micro|cent|c)$/i.exec(s);
  return m ? m[0] : null;
}

/**
 * الزوج العادي («GBPUSD») بلاحقة سنت/micro (`smallContractSuffix`) ⇒ «GBPUSDc» — فقط حين يبقى الناتج رمز سنت/micro
 * **للزوج نفسه** (`smallContractSpec`). null لزوج مجهول أو لاحقة لا تصلح.
 */
export function withSmallSuffix(pair: string, suffix: string): string | null {
  const std = instrumentSpec(pair);
  if (!std || !suffix) return null;
  const s = pair.trim() + suffix;
  const small = smallContractSpec(s);
  return small && small.spec.symbol === std.symbol && smallContractSuffix(s) === suffix ? s : null;
}

/** سعر التحويل (عملة التسعير ⇒ USD) لحساب سنت: × 100 ⇒ عملة التسعير ⇒ USC. null يبقى null. */
export function centQuoteToAccount(usdRate: number | null): number | null {
  return usdRate != null && Number.isFinite(usdRate) && usdRate > 0 ? usdRate * CENTS_PER_USD : null;
}

/**
 * لوت سنت/micro بلوت الحساب العادي (÷ 100) للسطر `riskCalcSmallLotsStdEquiv` — «4.00 = 0.04 لوت بالحساب العادي» كي
 * يطابقه المتداول مع ما يعرفه. بلا أصفار زائدة («0.004» لا «0.0040»)، وحتى أربع منازل (خطوة 0.01 ÷ 100).
 */
export function smallLotsStdEquiv(lots: number): string {
  if (!Number.isFinite(lots) || lots <= 0) return '—';
  return String(Number((lots / 100).toFixed(4)));
}

/**
 * سعرٌ مكتوب بخانة أداةٍ معروفة: `parseDecimal`، مع رفض النقطة الوحيدة المتبوعة بثلاثة أرقام بالضبط («3.450»)
 * حين لا يُسعَّر المعروض بثلاث منازل أصلاً (الذهب بمنزلتين).
 *
 * لماذا: «3.450» بالكتابة الأوروبية/التركية = ثلاثة آلاف وأربعمئة وخمسون — سعر ذهب — و`parseDecimal` يقرؤها
 * 3.45 لأن الأسعار تحتاج «1.085» عشرية. بالدفتر: دخول ذهب «3.450» وخروج 3460 كان يُحفظ «+34,565.5 pip · +100,190%»
 * بلا أي اعتراض (بلا وقف لا يُكشف بالجهة الخطأ) ويُفسد الإحصاءات. ذهبٌ بثلاث منازل لا وجود له، فالنصّ مبهمٌ
 * لا عشري ⇒ `null` («رقم غير مفهوم») كالفاصلة المبهمة «3,450» تماماً. «0.450» ليست مبهمة وتبقى. الين
 * (157.250) والفضة (31.450) بثلاث منازل فعلاً فلا يتغيّر لهما شيء، ولا لرمزٍ غير معروف.
 */
export function parsePriceFor(raw: string, symbol: string | null | undefined): number | null {
  const v = parseDecimal(raw);
  if (v == null) return null;
  return ambiguousThousandsPrice(raw, symbol) ? null : v;
}

/**
 * لماذا رفض `parsePriceFor` النصّ — والقراءتان الممكنتان لرسالة `priceAmbiguousThousandsHint` («اكتب 3450 أو 3.45»).
 * رسالة «رقم غير مفهوم — اكتبه بلا فواصل آلاف، مثل 10000 أو 1.0850» تحت «3.450» محيّرة: المتداول لم يكتب فاصلاً
 * (بظنّه)، ومثالها «1.0850» يشبه ما كتبه تماماً. `null` = ليس مبهماً (مقبول، أو مرفوض لسبب آخر).
 * `value` كما كُتب (مقصوص الأطراف)، `whole` بلا النقطة، `small` كسراً بلا أصفار زائدة — أرقام لاتينية دائماً.
 */
/** عملات تسعيرٍ الدولارُ فيها ≥ 3.5 وحداتٍ — الفضة بها فوق العشرة دائماً (`ambiguousThousandsPrice`). */
const SILVER_ABOVE_TEN_QUOTES = new Set(['SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'MXN', 'HKD', 'CNH', 'ILS', 'SAR', 'AED']);

/**
 * مؤشرات وعملات رقمية سعرها **فوق الألف دائماً** — بأسماء وسطاء التجزئة (كجدول `SINGLE_CCY` بـ`chart/newsRisk.ts`، لا استيراد:
 * `newsRisk` يستورد هذا الملف). لا أداة لها بـ`instrumentSpec` فكان `ambiguousThousandsPrice` يعود `null` مبكراً: دخول داكس «18.500»
 * (= 18,500 بالكتابة الأوروبية/التركية) يُقرأ 18.5، وإغلاقه بسعر السوق 18,520 ⇒ «+100,008%» يُحفظ بالدفتر ويُفسد نسبة الفوز وأفضل
 * صفقة ومجموع النسب — الخطأ الذي أُصلح للذهب. خارج القائمة عمداً: ما قد يكون دون الألف أو بثلاث منازل فعلاً (النفط 78.456، DXY،
 * VIX، العوائد، AEX ≈900، والعملات الرقمية الصغيرة — SOL 150.250 سعرٌ حقيقي).
 */
const BIG_INDEX =
  /^(US30|DJ30|DJI|WS30|USA30|NAS100|US100|USTEC|NDX|NQ100|USTECH|USTECH100|USA100|SPX500|US500|SPX|SP500|USA500|US2000|GER40|DE40|GER30|DE30|DAX40|DAX|FRA40|FR40|F40|CAC40|EU50|STOXX50|STOXX50E|EUSTX50|ESTX50|ESP35|SPA35|ES35|SPAIN35|IBEX35|IT40|ITA40|UK100|FTSE100|FTSE|SWI20|SMI20|SUI20|CH20|SWISS20|JP225|JPN225|NIKKEI|N225|NI225|NIK225|AUS200|ASX200|AU200|HK50|HK33|HKG33|HSI|CN50|CHN50|CHINA50|CHI50|CHINAA50|CAN60|CA60|SA40|SWE30)$/;
const BIG_CRYPTO = /^(BTC|XBT|ETH)(USDT|USDC|USD|EUR|GBP|JPY|AUD|CAD|CHF)$/;

/** الرمز مؤشرٌ أو عملة رقمية سعرها فوق الألف دائماً («GER40.cash»، «US30Cash»، «#NAS100»، «DE30_EUR»، «BTCUSDm»، «ETH/USD»). */
export function priceAlwaysOverThousand(symbol: string): boolean {
  const u = symbol.trim().toUpperCase().replace(/^[#.]+/, '');
  const bare = u.replace(/[.\-_#+][A-Z0-9]{0,5}$/, '').replace(/(.)CASH$/, '$1').replace(/[\s/]/g, '');
  if (BIG_INDEX.test(bare) || BIG_INDEX.test(bare.replace(/M$/, ''))) return true;
  return BIG_CRYPTO.test(bare) || BIG_CRYPTO.test(bare.replace(/M$/, ''));
}

export function ambiguousThousandsPrice(
  raw: string,
  symbol: string | null | undefined,
): { value: string; whole: string; small: string } | null {
  // ذهب حساب سنت/micro («XAUUSDC»، «GOLDMICRO») بسعر الذهب نفسه: «3.450» بخانته كانت تُقرأ 3.45 بالدفتر
  const spec = symbol ? instrumentSpec(symbol) ?? instrumentSpec(smallContractPair(symbol) ?? '') : null;
  if (!spec) {
    if (!symbol || !priceAlwaysOverThousand(symbol)) return null;
    const s = normalizeDigits(raw).replace(/[\s\u00a0\u202f\u2009٬']/g, '').replace(/[٫．]/g, '.');
    if (!/^[1-9]\d{0,2}\.\d{3}$/.test(s)) return null;
    return { value: raw.trim(), whole: s.replace('.', ''), small: String(Number(s)) };
  }
  const decimals = Math.round(-Math.log10(spec.pipSize)) + 1;
  // الفضة بالين (≈4,500–6,000) والليرة (≈1,300+) بثلاث منازل **وفوق الألف**: «5.123» = 5,123 ين لا 5.123 — كانت
  // تُقرأ 5.123 ⇒ وقف 10 pip بدل 10,000 ⇒ 30 لوتاً بدل 0.03 وخسارة ≈100,000$ بحساب 10,000 «يخاطر بـ100»
  const silverOverThousand = spec.base === 'XAG' && (spec.quote === 'JPY' || spec.quote === 'TRY');
  /**
   * والفضة بعملةٍ الدولار فيها ≥ 3.5 (البيزو ≈18، الراند ≈17، الكرونة، اليوان، الشيكل، الريال…): سعرها الحقيقي
   * لا يكون **دون العشرة** أبداً (فضة دون 3$)، أما فوق الألف فقريب — XAGMXN/XAGZAR ≈ 900–1,100 عند فضة 50–60$. «1.050»
   * (= 1,050 بالكتابة الأوروبية) كانت تُقرأ 1.05 ⇒ وقف «1.030» = 2 pip ⇒ لوت أكبر بألف مرّة. رقمٌ واحد قبل النقطة فقط:
   * «950.250» سعرٌ حقيقي بثلاث منازل يبقى مقبولاً.
   */
  const silverOverTen = spec.base === 'XAG' && SILVER_ABOVE_TEN_QUOTES.has(spec.quote);
  if (decimals >= 3 && !silverOverThousand && !silverOverTen) return null;
  const s = normalizeDigits(raw).replace(/[\s\u00a0\u202f\u2009٬']/g, '').replace(/[٫．]/g, '.');
  if (!(silverOverTen && !silverOverThousand ? /^[1-9]\.\d{3}$/ : /^[1-9]\d{0,2}\.\d{3}$/).test(s)) return null;
  return { value: raw.trim(), whole: s.replace('.', ''), small: String(Number(s)) };
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

/**
 * مفتاح سعر التحويل المحفوظ: الزوج **واتجاهه**. بالزوج وحده كان سعر «GBPUSD معكوساً» (0.787: USD ⇒ GBP لـGBPUSD بحساب
 * إسترليني) يُقرأ لأداةٍ تحتاج «GBPUSD مباشراً» (1.27: GBP ⇒ USD لـEURGBPc بحساب سنت دولار) إطاراً واحداً قبل مسحه —
 * قيمة pip ولوت وهامش أبعد بـ38%. null = لا تحويل.
 */
export function conversionKey(conv: { symbol: string; invert: boolean } | null): string | null {
  return conv ? `${conv.symbol}|${conv.invert ? 'inv' : 'dir'}` : null;
}

/** كم وحدة من عملة الحساب تساوي وحدة واحدة من عملة التسعير، من سعر زوج التحويل. */
export function quoteToAccountRate(conv: { invert: boolean } | null, pairPrice: number | null): number | null {
  if (!conv) return 1;
  if (pairPrice == null || !Number.isFinite(pairPrice) || pairPrice <= 0) return null;
  return conv.invert ? 1 / pairPrice : pairPrice;
}

/**
 * سعر التحويل **عند سعر الخروج** حين العملة الأساس = عملة حساب التحويل (USDJPY/USDCHF/USDCAD بحساب دولار، GBPUSD
 * بحساب إسترليني، EURGBP بحساب يورو): الخسارة تُدفع بعملة التسعير وتُحوَّل عند إغلاق المركز بسعره هو ⇒ 1 ÷ سعر الخروج.
 *
 * كانت الحاسبة تحوّل بالسعر **الحيّ**: أمرٌ معلّق USDJPY دخول 140 ووقف 138.50 والسوق 150 ⇒ «0.10 لوت = 100.00 USD»
 * بينما الخسارة الحقيقية 15,000 JPY ÷ 138.50 = 108.30 USD (1.08% لا 1%) — تجاوزٌ للمخاطرة المختارة. (الهامش أُصلح
 * للسبب نفسه: `marginBaseToAccount`.) بالسعر نفسه يُحسب الربح عند الهدف.
 *
 * `liveRate` = سعر التحويل الحيّ لهذا الزوج (1 ÷ الحيّ). حارس خطأ الكتابة: سعر خروج يبعد عن الحيّ أكثر من 20% («1500»
 * بدل «150.0») كان سيقسم قيمة النقطة على 10 فيضرب اللوت ×10 ⇒ `null` ويبقى الحيّ. `null` كذلك لأداةٍ عملتها الأساس
 * ليست عملة الحساب (سعر التحويل عند الخروج مجهول — الحيّ أفضل تقدير) أو لمدخل غير صالح.
 *
 * `forLoss` (الوقف): خارج النطاق **الأغلى** من الاثنين لا `null` — الحارس كان يصيب الوقف البعيد الحقيقي أيضاً (USDTRY/
 * USDZAR، متداول مراكز): USDJPY حيّ 150 ووقف 119 ⇒ الحيّ ⇒ «9,920 USD» والخسارة الحقيقية عند 119 = **12,504** (+25%) واللوت
 * أكبر من وقف 121 الأقرب. الأغلى: وقفٌ بعيد تحت (أو «15» بدل «150») ⇒ سعر الوقف ⇒ لوت أصغر؛ «1500» بدل «150» ⇒ الحيّ
 * كما كان. للربح عند الهدف يبقى `null` (الأغلى هناك يضخّم الربح).
 */
export function exitQuoteToAccount(
  spec: InstrumentSpec | null,
  convAccount: string,
  exitPrice: number,
  liveRate: number | null,
  forLoss = false
): number | null {
  if (!spec || spec.base !== convAccount) return null;
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) return null;
  if (liveRate == null || !Number.isFinite(liveRate) || liveRate <= 0) return null;
  const r = 1 / exitPrice;
  const ratio = r / liveRate;
  if (ratio >= 0.8 && ratio <= 1.25) return r;
  return forLoss ? Math.max(r, liveRate) : null;
}

/**
 * مثل `exitQuoteToAccount` لكن **بلا سعر وقف مكتوب** (النقاط وحدها): الاتجاه مجهول فسعر الخروج مجهول، فيُفترض
 * الأسوأ — الخروج **تحت** السعر (الدخول المكتوب، وإلا الحيّ = 1 ÷ `liveRate`) بمسافة الوقف. أدنى سعر = أعلى 1 ÷ السعر
 * = أغلى نقطة بعملة الحساب ⇒ الخسارة عند الوقف لا تتجاوز المخاطرة المختارة **أيّاً كان الاتجاه**: الشراء يخرج هناك
 * تماماً، والبيع يخرج فوق فيخسر أقل بقليل. كان الحيّ يُستعمل: USDJPY عند 150 ووقف 150 pip شراءً ⇒ خسارة 101.01 USD
 * لمخاطرة 100 (1.01%).
 *
 * `null` حين `exitQuoteToAccount` يرفض (الأساس ليس عملة الحساب، خروج ≤ 0) أو نقاط غير صالحة؛ خروج يبعد > 20% عن
 * الحيّ ⇒ الأغلى من الاثنين (`forLoss`).
 */
export function pipsOnlyExitQuoteToAccount(
  spec: InstrumentSpec | null,
  convAccount: string,
  slPips: number,
  entryPrice: number,
  liveRate: number | null
): number | null {
  const exit = pipsOnlyExitPrice(spec, slPips, entryPrice, liveRate);
  return exit == null ? null : exitQuoteToAccount(spec, convAccount, exit, liveRate, true);
}

/**
 * سعر الخروج الذي تحسب به `pipsOnlyExitQuoteToAccount` (الدخول أو الحيّ − النقاط) — لسطر «قيمة الـpip عند {price}»:
 * بالنقاط وحدها كان السطر يقول «قيمة الـpip» بلا سعر وهي محسوبة بسعرٍ أبعد (USDJPY 150، وقف 150 pip ⇒ 6.73 لا 6.67
 * التي تعرضها المنصّة) فلا يطابق المتداول رقمه بلا تفسير. `null` بالشروط نفسها.
 */
export function pipsOnlyExitPrice(
  spec: InstrumentSpec | null,
  slPips: number,
  entryPrice: number,
  liveRate: number | null
): number | null {
  if (!spec || !Number.isFinite(slPips) || slPips <= 0) return null;
  if (liveRate == null || !Number.isFinite(liveRate) || liveRate <= 0) return null;
  const from = Number.isFinite(entryPrice) && entryPrice > 0 ? entryPrice : 1 / liveRate;
  return from - slPips * spec.pipSize;
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
 * سبريد تسعيرةٍ حيّة **بالـpip** (Ask − Bid ÷ حجم pip الأداة، لأقرب عُشر) — ما يقارنه المتداول بسبريد وسيطه.
 * رأس الطرفية كان يطبع الفرق سعراً خاماً «0.00009» بينما لوح العمق يقول «0.9 pip» للتسعيرة نفسها.
 * `null` لرمزٍ بلا مواصفات (يعرض المستدعي الفرق سعراً)، أو تسعيرة غير صالحة: سعرٌ ≤ 0 أو دفترٌ مقلوب (Ask < Bid)
 * — لا يُطبع سبريد سالب.
 */
export function quoteSpreadPips(symbol: string, bid: number | null | undefined, ask: number | null | undefined): number | null {
  const spec = instrumentSpec(symbol);
  if (!spec || bid == null || ask == null) return null;
  if (!(ask >= bid)) return null;
  return pipsBetween(spec, ask, bid);
}

/**
 * مسافة وقف الخسارة بالنقاط من سعرَي الدخول والوقف (المتداول يفكّر غالباً بالسعر على الشارت لا بالـpip).
 * مقرَّبة لعُشر pip (النقاط الكسرية pipette) **للأعلى**. null إن كان أحدهما غير صالح أو تساويا — وقفٌ
 * عند الدخول ليس وقفاً، خلافاً لتنبيهٍ عند السوق.
 *
 * لماذا للأعلى لا لأقرب قيمة (`pipsBetween`): هذه المسافة **يُقسَم عليها** حجم اللوت، فوقفٌ أقصر
 * من الحقيقي = مركزٌ أكبر من المخاطرة المختارة. سعر وقف بمنزلة دون الـpipette (1.085 − 1.082549 =
 * 24.51 pip، أو ذهب 2400 − 2398.004 = 19.96 pip) كان يُحسب 24.5 و20.0 فيُفتح لوت يخاطر بأكثر مما
 * قيل — ووعدُ التقريب للأسفل بحجم اللوت (`positionSize`) «لا يتجاوز المخاطرة أبداً» يُنقض من الخانة
 * التي قبله. ضجيج الفاصلة العائمة يُنظَّف قبل `ceil` كي لا
 * تصير 25.2 الدقيقة (1.08503 − 1.08251) «25.3».
 */
export function slPipsFromPrices(spec: InstrumentSpec, entry: number, stop: number): number | null {
  if (![entry, stop].every((v) => Number.isFinite(v) && v > 0)) return null;
  const tenths = Math.round((Math.abs(entry - stop) / spec.pipSize) * 10 * 1e6) / 1e6;
  const pips = Math.ceil(tenths) / 10;
  return pips > 0 ? pips : null;
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

/**
 * خانة **وقف الخسارة بالنقاط**: مسافة موجبة بقاعدة المبالغ (`parseDecimal` `amount`) — «1.500» مبهمة (1,500 بكتابة
 * أوروبية) فتُرفض كـ«1,500» بجانبها. كانت تُقرأ 1.5 pip: ذهبٌ بوقف 1,500 pip (150$) بحساب 10,000 و1% = **6.66 لوت**
 * بدل 0.06، بلا أي تحذير (تحت حدّ 50 لوت). مسافة الوقف لا تحمل ثلاث منازل أصلاً (`slPipsFromPrices` لعُشر pip)،
 * و«0.500» تبقى 0.5 (الصفر بالمقدّمة ليس مبهماً). `null` = فارغ أو غير مفهوم أو مبهم.
 */
export function parseSlPips(raw: string): number | null {
  const v = parseDecimal(raw, { amount: true, unit: 'pip' });
  return v != null && pipsHaveMoreThanTwoDecimals(v) ? null : v;
}

/** أكثر من منزلتين عشريتين ذواتَي قيمة («1.082»، لا «1.0800» ولا «12.25») — مسافة بالـpip لا تحملها، السعر يحملها. */
function pipsHaveMoreThanTwoDecimals(v: number): boolean {
  return Math.abs(v * 100 - Math.round(v * 100)) > 1e-6;
}

/**
 * **سعرٌ بخانة النقاط**: «1.0820» (سعر الوقف من رسالة توصية «SL 1.0820») كانت تُقرأ وقفاً **1.08 pip** — فوق حدّ «أضيق من
 * 1 pip» (`slTooClose`) فتمرّ: 1% من 10,000 على 1.08 pip = **9.24 لوت** بدل 0.40 لوقف 25 pip، رقمٌ أنيق يبدو محسوباً.
 * مسافة الوقف لا تحمل أكثر من عُشر pip (`slPipsFromPrices`)؛ ثلاث منازل ذوات قيمة فأكثر = سعر (يورو/إسترليني/فرنك
 * 0.6–2 بأربع أو خمس منازل). `parseSlPips` يرفضها، وهذه تقول لماذا (اسم خانة سعر الوقف). «157.42» (ين) أو «2650.5» (ذهب)
 * منزلتان أو أقل فتبقى نقاطاً — خطؤهما يُصغّر اللوت لا يكبّره. `false` لغير المفهوم أو المقبول.
 */
export function slPipsLooksLikePrice(raw: string): boolean {
  const v = parseDecimal(raw, { amount: true, unit: 'pip' });
  return v != null && v > 0 && pipsHaveMoreThanTwoDecimals(v);
}

/**
 * نقاط وقف مرفوضة **لأنها مبهمة** (`parseSlPips`): «1.500» أو «1,500» — 1,500 pip أم 1.5؟ للرسالة `riskCalcSlPipsAmbiguous`
 * التي تعرض القراءتين؛ الرسالة العامة «اكتبه بلا فواصل آلاف، مثل 1.0850» كانت تدعوه لكتابة ما كتبه. `value` كما كُتب
 * (مقصوص)، `whole` بلا الفاصل، `small` كسراً بلا أصفار زائدة — أرقام لاتينية. `null` = مقبول أو مرفوض لسبب آخر.
 */
export function ambiguousSlPips(raw: string): { value: string; whole: string; small: string } | null {
  const s = normalizeDigits(stripUnitWord(raw, 'pip')).replace(/[\s\u00a0\u202f\u2009']/g, '').replace(/[٫．٬，]/g, (c) => (c === '٬' || c === '，' ? ',' : '.'));
  const m = /^([1-9]\d{0,2})[.,](\d{3})$/.exec(s);
  if (!m) return null;
  return { value: raw.trim(), whole: m[1] + m[2], small: String(Number(`${m[1]}.${m[2]}`)) };
}

/**
 * وقفٌ مكتوب **بالنقاط (points)**: «250 points»، «250 pts»، «250 نقطة/نقاط»، «250 خاڵ» — مرفوض عمداً (`stripUnitWord`): النقطة
 * بمنصّة MT4/MT5 عُشر pip بأسعار الخمس خانات، وقراءتها pip = لوت أصغر بعشر مرّات. يُرجع الرقم كما كُتب و`pips` = ÷10 لرسالة
 * `riskCalcSlPointsHint` («اكتب 25 pip») بدل «رقم غير مفهوم» — **تلميح لا تحويل**: بعض الوسطاء يسمّون الـpip «نقطة»، فلا نخمّن.
 * `null` = لا كلمة نقاط، أو الرقم قبلها غير مفهوم/مبهم/صفر.
 */
const POINT_WORDS = /^(.+?)\s*(?:points?|pts?|نقطة|نقاط|نقطه|خاڵ|خال)\.?$/i;
export function slPipsInPoints(raw: string): { value: string; pips: string } | null {
  const m = POINT_WORDS.exec(raw.replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, '').trim());
  if (!m) return null;
  const n = parseDecimal(m[1], { amount: true });
  if (n == null || !(n > 0)) return null;
  return { value: raw.trim(), pips: String(Number((n / 10).toFixed(4))) };
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

/** رمز العملة كما يُكتب بجانب المبلغ → عملات الحساب التي قد يعنيها ($ يُكتب للدولار والأسترالي والنيوزيلندي والكندي). */
const MONEY_SIGNS: Record<string, readonly string[]> = {
  $: ['USD', 'AUD', 'NZD', 'CAD'],
  '€': ['EUR'],
  '£': ['GBP'],
  '¥': ['JPY'],
  // العريضة من لوحة المفاتيح اليابانية («￥5000»): العلامة نفسها
  '＄': ['USD', 'AUD', 'NZD', 'CAD'],
  '￥': ['JPY'],
  '￡': ['GBP'],
};

/**
 * نصّ المبلغ بلا علامته حين كُتب بعلامة/كود/اسم **عملة `ccy` وحدها** («$50»، «50 USD»، «٥٠ دولار»، «7 USC») — علامة واحدة
 * بأحد الطرفين؛ `null` = بلا علامة، أو علامتان، أو عملة أخرى («€40» بحساب دولار: 40 يورو ليست 40 دولاراً). لا يقرأ الرقم.
 * قاعدة واحدة لكل خانة مال بعملة الحساب (المخاطرة `parseRiskInput`، العمولة `parseCommission`).
 */
function moneyTextFor(raw: string, ccy: string): string | null {
  const mm = moneyMark(raw);
  return mm && markFits(mm.mark, ccy) ? mm.text : null;
}

/** العلامة الوحيدة بأحد طرفَي المبلغ (بعد تحويل الأسماء العربية) ونصّ الرقم بلاها؛ `null` = بلا علامة أو أكثر من واحدة. */
function moneyMark(raw: string): { mark: string; text: string } | null {
  const m = /^\s*(?:([$€£¥＄￥￡])|([A-Za-z]{3}))?\s*([^$€£¥＄￥￡A-Za-z]+?)\s*(?:([$€£¥＄￥￡])|([A-Za-z]{3}))?\s*$/.exec(
    moneyWordsToMarks(raw)
  );
  if (!m) return null;
  const markers = [m[1], m[2], m[4], m[5]].filter((x): x is string => x != null);
  return markers.length === 1 ? { mark: markers[0], text: m[3] } : null;
}

function markFits(mark: string, ccy: string): boolean {
  const acc = ccy.toUpperCase();
  return /^[A-Za-z]{3}$/.test(mark) ? mark.toUpperCase() === acc : (MONEY_SIGNS[mark] ?? []).includes(acc);
}

/**
 * مبلغٌ مفهوم **بعملة غير عملة الخانة** («€40» أو «40 يورو» بحساب دولار، «$7» بعمولة حساب سنت) — مرفوض عمداً (40 يورو ليست
 * 40 دولاراً)، لكن الرسالة العامة «رقم غير مفهوم» كانت تحيّر عن رقمٍ مفهوم تماماً (launch84). true ⇒ تقول اللوحة عملة الحساب.
 * العلامة علامة عملة أو كود عملة ورقية معروف (أو USC) فقط: «abc 40» تبقى نصّاً غير مفهوم. مقبولٌ أو رقمٌ غير صالح ⇒ false.
 */
export function moneyInOtherCurrency(raw: string, ccy: string): boolean {
  const mm = moneyMark(raw);
  if (!mm || markFits(mm.mark, ccy)) return false;
  if (/^[A-Za-z]{3}$/.test(mm.mark) && !FIAT.has(mm.mark.toUpperCase()) && mm.mark.toUpperCase() !== 'USC') return false;
  const v = parseDecimal(mm.text, { amount: true });
  return v != null && v > 0;
}

/**
 * خانة المخاطرة: **نسبة** («1»، «0.5%») كما كانت، أو **مبلغ** بعملة الحساب حين يُكتب برمزها أو كودها
 * («$50»، «50$»، «50 USD»، «eur 40») — فتُحسب النسبة منه: 50 من رصيد 10,000 = 0.5%.
 *
 * لماذا: كثير من المتداولين يقرّر مخاطرته بالمال لا بالنسبة («لا أخسر أكثر من 50$ بالصفقة»)، فكان يقسم
 * على الرصيد بيده ثم يكتب «0.5» — وهي بالضبط الخطوة التي تنزلق فيها منزلة («5» بدل «0.5» = مركز عشرة
 * أضعاف). والمبلغ **لا يُفهم إلا بعلامة**: «50» وحدها تبقى 50% كما كانت (فيحذّر `riskHigh`/`riskImpossible`
 * كما يفعلان)، لأن تخمين «50 تعني مالاً» يغيّر معنى خانة كتبها المتداول طوال عمره نسبةً.
 *
 * رمزٌ لعملة غير عملة الحساب («€40» بحساب دولار) يُرفض (`null`) بدل أن يُعدّ دولاراً: 40 يورو ليست 40
 * دولاراً. المبلغ بقاعدة الرصيد (`amount`: «1.000$» مبهمة تُرفض). `pct` null حين لا رصيد صالح بعد —
 * المبلغ مفهوم لكن لا نسبة منه (ليست خانة غير مفهومة). `amount` null = كُتبت نسبة.
 */
export function parseRiskInput(
  raw: string,
  balance: number,
  account: string
): { pct: number | null; amount: number | null } | null {
  const pct = parseDecimal(raw, { percent: true });
  if (pct != null) return { pct, amount: null };
  const text = moneyTextFor(raw, account);
  if (text == null) return null;
  const amount = parseDecimal(text, { amount: true });
  if (amount == null || !(amount > 0)) return null;
  const ok = Number.isFinite(balance) && balance > 0;
  return { pct: ok ? (amount / balance) * 100 : null, amount };
}

/** حرف عربي/كردي (مع التشكيل) — حدّ الكلمة لـ`moneyWordsToMarks`؛ الأرقام العربية ليست منه فـ«٥٠دولار» تُقرأ */
const AR_LETTER = '[\\u0621-\\u063A\\u0640-\\u065F\\u0670-\\u06D3\\u06D5\\u06EE\\u06EF\\u06FA-\\u06FF]';
/**
 * اسم العملة بالعربية/الكردية ⇒ علامتها أو كودها. «دولار» وحدها كـ«$» (الأمريكي والأسترالي والكندي والنيوزيلندي)،
 * وبصفتها كالكود. «جنيه» = الإسترليني: لا حساب بالجنيه المصري بين عملات الحساب، والعلامة لا تُقبل إلا لعملة الحساب.
 */
const MONEY_WORDS: [string, string][] = [
  ['(?:دولار|دۆلار)(?:ات|اً|ا)?\\s*(?:أمريكي|امريكي|أميركي|اميركي|أمريكية|ئەمریکی)', 'USD'],
  ['(?:دولار|دۆلار)(?:ات|اً|ا)?\\s*(?:أسترالي|استرالي|ئوسترالی)', 'AUD'],
  ['(?:دولار|دۆلار)(?:ات|اً|ا)?\\s*(?:كندي|کەنەدی)', 'CAD'],
  ['(?:دولار|دۆلار)(?:ات|اً|ا)?\\s*(?:نيوزيلندي|نيوزلندي)', 'NZD'],
  ['(?:دولار|دۆلار)(?:ات|اً|ا)?', '$'],
  ['(?:يورو|یۆرۆ|یورۆ)', 'EUR'],
  ['(?:(?:جنيه|جنيهات)\\s*(?:إسترليني|استرليني)|جنيه|جنيهات|إسترليني|استرليني|باوند|پاوەند)', 'GBP'],
  ['(?:ين|ین)\\s*(?:ياباني|یابانی)?', 'JPY'],
  ['(?:فرنك|فرنكات)\\s*(?:سويسري)?', 'CHF'],
  ['(?:سنت|سنتات)', 'USC'],
];
const MONEY_WORD_RE = MONEY_WORDS.map(
  ([w, mark]) => [new RegExp(`(?<!${AR_LETTER})${w}(?!${AR_LETTER})`), mark] as const
);

/**
 * «50 دولار»، «٥٠ يورو»، «100 جنيه» بخانة المخاطرة: المتداول العربي يكتب المبلغ باسم عملته، وكانت الخانة «رقم غير مفهوم»
 * — والحرف اللاتيني («USD») يحتاج تبديل لوحة المفاتيح. يُستبدل الاسم بعلامته فتطبّق `parseRiskInput` قاعدتها نفسها:
 * علامةٌ واحدة، ولعملة الحساب وحدها («50 يورو» بحساب دولار مرفوضة).
 */
function moneyWordsToMarks(raw: string): string {
  let s = raw;
  for (const [re, mark] of MONEY_WORD_RE) s = s.replace(re, ` ${mark} `);
  return s;
}

/**
 * «٬» بدل «٫» بخانة المخاطرة **بمسارَيها**: النسبة («0٬5») والمبلغ بعلامة («$0٬5»، «USD 12٬5»). كان التلميح
 * (`misplacedArabicThousandsSign` بـ`percent`) يفحص النسبة وحدها، فـ«$0٬5» تُرفض بـ«رقم غير مفهوم» بلا سبب.
 * true فقط حين الخانة مرفوضة كما هي، واستبدال «٬» بـ«٫» يجعلها مفهومة بقاعدة `parseRiskInput` نفسها — لا
 * تُقرأ القيمة، تبقى مرفوضة. «USD 1٬000» (فاصل آلاف حقيقي) مقبولة أصلاً ⇒ false؛ «€0٬5» بحساب دولار تبقى
 * مرفوضة بعد الاستبدال (عملة أخرى) ⇒ false.
 */
export function misplacedArabicThousandsSignInRisk(raw: string, balance: number, account: string): boolean {
  if (!raw.includes('٬') || parseRiskInput(raw, balance, account) != null) return false;
  return parseRiskInput(raw.replace(/٬/g, '٫'), balance, account) != null;
}

/**
 * المخاطرة المكتوبة **أكبر من الرصيد** (نسبة فوق 100%، أو مبلغ فوق الرصيد): `positionSize` يرفضها فلا لوت،
 * وكان السطر الوحيد عند الخانة «أكثر من 2% مخاطرة عالية» — صحيح لكنه لا يقول إن الرقم مستحيل ولا لماذا
 * اختفت النتيجة. يعيد المبلغين لرسالة `riskCalcRiskOverBalance`: المبلغ المكتوب كما هو، أو المحسوب من
 * النسبة (200% من 5,000 = 10,000). المساواة (100%) ليست فوق الرصيد — يحسبها `positionSize`.
 * `null` لخانة غير مفهومة، أو بلا رصيد صالح، أو ضمن الرصيد.
 */
export function riskOverBalance(
  raw: string,
  balance: number,
  account: string
): { risk: number; balance: number } | null {
  const r = parseRiskInput(raw, balance, account);
  if (!r || r.pct == null || !(Number.isFinite(balance) && balance > 0)) return null;
  if (!(r.pct > 100)) return null;
  return { risk: r.amount ?? (balance * r.pct) / 100, balance };
}

/**
 * زرّ عملة الحساب بجانب نسب المخاطرة السريعة: يقلب الخانة بين **النسبة والمبلغ** بالمخاطرة نفسها — «1»
 * برصيد 10,000 ⇒ «USD 100»، و«USD 100» ⇒ «1». لوحة الأرقام بالهاتف بلا «$» ولا حروف، فبلا هذا الزرّ لا
 * يُكتب المبلغ إلا لصقاً. الكود **قبل** المبلغ عمداً: الكتابة تُضاف بآخر الخانة فتبقى «USD 150» مفهومة.
 *
 * **التقريب للأسفل بالاتجاهين** (للسنت، والين بلا كسور — `moneyDecimals`؛ وللنسبة لمنزلتين): القلب لا
 * يرفع المخاطرة ولو بسنت — 1% من 3,333.33 = 33.3333 ⇒ «USD 33.33»، و33 من 7,777 = 0.4243% ⇒ «0.42».
 *
 * `null` = لا قلب ممكن (بلا رصيد صالح لا تُعرف النسبة من المبلغ ولا العكس، أو الخانة غير مفهومة/فارغة/صفر).
 */
export function toggleRiskUnit(raw: string, balance: number, account: string): string | null {
  const r = parseRiskInput(raw, balance, account);
  if (!r || r.pct == null || !(r.pct > 0) || !(Number.isFinite(balance) && balance > 0)) return null;
  if (r.amount != null) {
    const pct = Math.floor(Math.round(r.pct * 100 * 1e6) / 1e6) / 100;
    return pct > 0 ? String(pct) : null;
  }
  const scale = 10 ** moneyDecimals(account);
  const amount = Math.floor(Math.round(((balance * r.pct) / 100) * scale * 1e6) / 1e6) / scale;
  return amount > 0 ? `${account.toUpperCase()} ${amount}` : null;
}

/**
 * عملة ورصيد **المبلغ** المحفوظ بخانة المخاطرة (`riskPct` = «USC 1000»/«USD 50»)، ليقلبه مؤثّر تبدّل العملة بالحاسبة
 * (`toggleRiskUnit`) نسبةً حين تفتح اللوحة بوضعٍ آخر. `null` = نسبة (معناها واحد بكل وضع) أو غير مفهومة.
 *
 * لماذا: الرمز لا يُحفظ، فـ«USC 1000» من «EURUSDc» تعود تحت «EURUSD» بحساب دولار — و`parseRiskInput` بالدولار يرفضها
 * فلا لوت و«رقم غير مفهوم» على ما كتبته الحاسبة نفسها (وشريحة العملة معطّلة). `riskCcy` يُحفظ معها منذ هذا الإصلاح.
 */
export function savedRiskMoney(saved: {
  riskPct?: unknown;
  riskCcy?: unknown;
  balance?: unknown;
  centBalance?: unknown;
  account?: unknown;
}): { ccy: string; balance: number } | null {
  if (typeof saved.riskPct !== 'string') return null;
  const bal = (v: unknown) => (typeof v === 'string' ? parseDecimal(v, { amount: true }) ?? NaN : NaN);
  const ctx = (ccy: string) => ({ ccy, balance: bal(ccy === 'USC' ? saved.centBalance : saved.balance) });
  const account = typeof saved.account === 'string' && (ACCOUNT_CCYS as string[]).includes(saved.account) ? saved.account : 'USD';
  // `riskCcy` أولاً؛ ثم السنت فعملة الحساب — نسخة أقدم بلا `riskCcy`، أو حفظٌ جرى قبل أن يُقلب المبلغ (بلا رصيد) بعملة الوضع الجديد
  const first =
    typeof saved.riskCcy === 'string' && (saved.riskCcy === 'USC' || (ACCOUNT_CCYS as string[]).includes(saved.riskCcy))
      ? [ctx(saved.riskCcy)]
      : [];
  const tries = [...first, ctx('USC'), ctx(account)];
  for (const c of tries) {
    if (parseRiskInput(saved.riskPct, c.balance, c.ccy)?.amount != null) return c;
  }
  return null;
}

/** أرصدة عملات الحساب **غير الظاهرة** (المكتوبة بخانة الرصيد وهي عملة الحساب) — `balanceOnAccountSwitch` */
export type AccountBalances = Partial<Record<AccountCcy, string>>;

/**
 * تبديل عملة الحساب بالحاسبة: رصيد العملة السابقة يُحفظ باسمها، والخانة تأخذ رصيد العملة الجديدة المحفوظ أو فارغة.
 *
 * لماذا: الخانة كانت تُبقي الرقم نفسه ⇒ «1500000» (حساب ين) تُقرأ 1,500,000 **دولار** بعد نقر «USD»: EURUSD بوقف 20
 * pip ومخاطرة 1% ⇒ **75 لوت** بدل 0.50 (×150)، يُحفظ ويعود بالجلسة التالية ويُرسل للدفتر. خانة السنت منفصلة لهذا السبب
 * نفسه (`centBalance`). لا تحويل بسعر الصرف: الرصيد رقمٌ بحساب المتداول لا تقدير — التخمين أسوأ من خانة فارغة.
 * الرصيد نفسه للعملة نفسها (نقرة على الشريحة المفعّلة) يبقى كما هو.
 */
export function balanceOnAccountSwitch(
  balances: AccountBalances,
  from: AccountCcy,
  to: AccountCcy,
  current: string
): { balances: AccountBalances; balance: string } {
  if (from === to) return { balances, balance: current };
  const next: AccountBalances = { ...balances };
  if (current.trim() !== '') next[from] = current;
  else delete next[from];
  const balance = next[to] ?? '';
  delete next[to];
  return { balances: next, balance };
}

/**
 * الأرصدة المحفوظة للعملات الأخرى (`balances` بالتخزين)، بلا عملة الحساب الظاهرة (رصيدها بـ`balance`). قيمٌ غير نصّية
 * أو عملات لا تدعمها الحاسبة تُسقط. نسخة أقدم بلا `balances` ⇒ `{}` — رصيدها الوحيد لعملة حسابها المحفوظة كما كان.
 */
export function savedAccountBalances(raw: unknown, account: AccountCcy): AccountBalances {
  const out: AccountBalances = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const c of ACCOUNT_CCYS) {
    const v = (raw as Record<string, unknown>)[c];
    if (c !== account && typeof v === 'string' && v.trim() !== '') out[c] = v;
  }
  return out;
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

/**
 * المال المُعرَّض بين الدخول والوقف لحجم لوت معيّن، **بعملة التسعير** (الثانية بالزوج): EURUSD/الذهب
 * بالدولار، USDJPY بالين، EURGBP بالإسترليني.
 *
 * لماذا بعملة التسعير لا بعملة الحساب: الدفتر لا يعرف عملة حساب المتداول ولا يملك سعر تحويل، لكن
 * المسافة × حجم العقد × اللوت **رقمٌ دقيق بلا أي سعر خارجي** بعملة التسعير — فيُكتب كما هو مع رمز
 * عملته صراحةً بدل تقديرٍ بعملة مفترضة. وهو لأزواج الدولار الثانية (أغلب ما يُتداول، والذهب) عملةُ
 * الحساب نفسها لأغلب المتداولين. الدفتر كان يعرف الدخول والوقف والحجم ويسكت عن «كم خاطرتُ بهذه
 * الصفقة» — السؤال الذي يُكتب الدفتر أصلاً ليجيب عنه.
 *
 * مقرَّب لمنزلتين (سنتات). `null` لأداة بلا مواصفات، أو مدخل غير صالح، أو دخول = وقف.
 */
export function riskInQuoteCcy(input: {
  symbol: string;
  entry: number;
  sl: number;
  lots: number;
}): { amount: number; ccy: string } | null {
  const spec = instrumentSpec(input.symbol);
  const { entry, sl, lots } = input;
  if (!spec || ![entry, sl, lots].every((v) => Number.isFinite(v) && v > 0) || entry === sl) return null;
  const amount = Math.abs(entry - sl) * spec.contractSize * lots;
  return { amount: Math.round(amount * 100 + 1e-7) / 100, ccy: spec.quote };
}

/**
 * نتيجة صفقة بالمال **بعملة التسعير**، بإشارتها (ربح موجب، خسارة سالبة): (الخروج − الدخول) × حجم العقد
 * × اللوت، معكوسةً للبيع. `exit` سعر خروج نُفِّذ أو سعر السوق الآن للصفقة المفتوحة — المسطرة واحدة.
 *
 * لماذا: سطر الصفقة بالدفتر يقول «+25 pip · +0.23%» ويسكت عن «كم ربحتُ» — والنسبة هناك نسبة حركة
 * السعر لا نسبة الحساب، فـ+0.23% على لوتين هي 500$ لا «ربع بالمئة». المال بعملة التسعير رقمٌ دقيق
 * بلا سعر تحويل (الدفتر لا يعرف عملة الحساب)، ويُكتب برمز عملته صراحةً — كـ`riskInQuoteCcy` تماماً،
 * فمخاطرة الصفقة ونتيجتها بعملة واحدة تُقرآن معاً.
 *
 * مقرَّب لمنزلتين متماثلاً حول الصفر (الخسارة لا تُكتب أصغر من الربح المماثل)، وبلا «−0». `null`
 * لأداة بلا مواصفات أو مدخل غير صالح.
 */
export function pnlInQuoteCcy(input: {
  symbol: string;
  side: 'buy' | 'sell';
  entry: number;
  exit: number;
  lots: number;
}): { amount: number; ccy: string } | null {
  const spec = instrumentSpec(input.symbol);
  const { side, entry, exit, lots } = input;
  if (!spec || ![entry, exit, lots].every((v) => Number.isFinite(v) && v > 0)) return null;
  const raw = (side === 'sell' ? entry - exit : exit - entry) * spec.contractSize * lots;
  const abs = Math.round(Math.round(Math.abs(raw) * 100 * 1e6) / 1e6) / 100;
  return { amount: raw < 0 ? -abs || 0 : abs, ccy: spec.quote };
}

/**
 * الربح المحتمل بعملة **الحساب** لحجم لوت عند هدف: |الهدف − الدخول| × حجم العقد × اللوت × سعر التحويل.
 *
 * لماذا لا «نقاط الهدف × قيمة النقطة × اللوت»: نقاط الهدف (`analyzePlan().rewardPips`) مقرَّبة لأقرب
 * عُشر pip **للعرض**، فهدفٌ بمنزلة دون الـpipette (1.085 → 1.087549 = 25.49 pip) كان يُحسب ربحه من
 * 25.5 pip — 102.00 USD على 0.4 لوت بدل 101.96، رقمٌ أكبر من الحقيقة بجانب «المخاطرة الفعلية» التي
 * تُحسب من وقفٍ مقرَّب **للأعلى**. المسافة الخام لا تُقرَّب إلا مرّة واحدة عند العرض (`formatMoney`).
 *
 * `null` لمدخل غير صالح أو هدف = دخول.
 */
export function profitAtTarget(input: {
  spec: InstrumentSpec;
  entry: number;
  target: number;
  lots: number;
  quoteToAccount: number;
}): number | null {
  const { spec, entry, target, lots, quoteToAccount } = input;
  if (![entry, target, lots, quoteToAccount].every((v) => Number.isFinite(v) && v > 0) || entry === target) return null;
  return Math.abs(target - entry) * spec.contractSize * lots * quoteToAccount;
}

/**
 * منازل المبلغ العشرية لعملة: الين بلا كسور (لا «سِن» يُتداول به)، وبقية عملات الحساب والتسعير
 * المدعومة منزلتان.
 */
export function moneyDecimals(ccy: string): 0 | 2 {
  return ccy.toUpperCase() === 'JPY' ? 0 : 2;
}

/**
 * مبلغ بعملته للعرض: «1,234.50 USD»، «15,000 JPY». فاصل آلاف «,» وكسر «.» ثابتان (لا لغة الجهاز —
 * راجع التعليق عند `money` بالحاسبة).
 *
 * لماذا: الحاسبة والدفتر كانا يكتبان كل مبلغ بمنزلتين، فحسابٌ بالين يقرأ «المخاطرة الفعلية
 * 1,500.00 JPY» و«قيمة النقطة للوت 1,572.40 JPY» — كسورٌ لعملة لا كسور لها، تُقرأ بلمحة كأنها
 * «1.5 ين» أو تُطيل السطر بلا معنى. والتقريب متماثل بعد تنظيف ضجيج الفاصلة العائمة: `toFixed(2)`
 * وحده يكتب 1.005 «1.00» (قيمتها الثنائية 1.00499…).
 */
export function formatMoney(v: number, ccy: string): string {
  if (!Number.isFinite(v)) return '—';
  const d = moneyDecimals(ccy);
  const scale = 10 ** d;
  const r = Math.round(Math.round(Math.abs(v) * scale * 1e6) / 1e6) / scale;
  const text = r.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${v < 0 && r > 0 ? '−' : ''}${text} ${ccy}`;
}

/**
 * قيمة الـpip **لمركزٍ صغير** للعرض: كـ`formatMoney` لكن بمنازل إضافية (حتى 4) حين تُضيّع المنازل العادية الرقم —
 * رقمان معنويان على الأقل، والأصفار الزائدة عن منازل العملة تُحذف. «0.04 lot = 0.00 USD» (EURUSDmicro: 0.004$ للنقطة)
 * كان يُطبع تحت «المخاطرة الفعلية 0.20 USD» فيبدو المركز بلا خطر؛ و«0.10 lot = 2 JPY» (الحقيقة 1.5) × 20 نقطة = 40
 * بجانب مخاطرة 30. مبلغٌ ≥ 10 وحدات عرض (0.10 دولار، 10 ين) يُكتب كـ`formatMoney` حرفياً.
 */
export function formatPipValue(v: number, ccy: string): string {
  if (!Number.isFinite(v) || v <= 0) return formatMoney(v, ccy);
  const base = moneyDecimals(ccy);
  let d = base;
  while (d < base + 4 && Math.round(v * 10 ** d * 1e6) / 1e6 < 10) d++;
  if (d === base) return formatMoney(v, ccy);
  const text = v.toFixed(d).replace(/0+$/, '');
  const [int, frac = ''] = text.split('.');
  const padded = frac.padEnd(base, '0');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${padded ? `.${padded}` : ''} ${ccy}`;
}

/**
 * الرافعة كما يكتبها المتداول: «100»، «1:100»، «1/500»، بأرقام عربية أيضاً («١:٢٠٠») وعريضة («１：５００»). الرقم المعتمد هو
 * المقام وحده — «1:100» تعني 100.
 *
 * لماذا دالّة لا `parseDecimal` مباشرة: المنصّات وصفحات الوسطاء تكتب الرافعة «1:100» دائماً، فينسخها
 * المتداول كما هي — و`parseDecimal` يرفض النقطتين فتقف الخانة عند «رقم غير مفهوم» بلا خطأ فيها.
 * والحدّ 1..3000: رافعة أقل من 1 ليست رافعة، وفوق 3000 لا يعرضها وسيط تجزئة — خطأ كتابة («10000»
 * بدل «100») يُصغّر الهامش المعروض مئة ضعف فيطمئن المتداول لمركز لا يتّسع له حسابه.
 *
 * `null` لفارغ أو غير صالح أو خارج الحدّ.
 */
export function parseLeverage(raw: string): number | null {
  const v = readLeverage(raw);
  return v != null && v >= 1 && v <= MAX_LEVERAGE ? v : null;
}

/** أعلى رافعة تقبلها `parseLeverage` — تُعرض بالرسالة حين تُكتب أعلى منها */
export const MAX_LEVERAGE = 3000;

/** الرقم كما كُتب بصيغة رافعة مفهومة («1:5000» ⇒ 5000)، بلا فحص الحدّ. `null` = ليست صيغة رافعة. */
function readLeverage(raw: string): number | null {
  const s = normalizeDigits(raw)
    .replace(/[：]/g, ':')
    .replace(/[／]/g, '/')
    .replace(/\s/g, '');
  const m = /^(?:1[:/])?(\d+(?:\.\d+)?)$/.exec(s);
  if (!m) return null;
  // «1.000»/«1:1.000» = 1:1000 بكتابة أوروبية (لوحة الأرقام العشرية بلا «:») — كانت تُقرأ رافعة 1 بلا تحذير
  // فيُعرض هامشٌ أكبر ألف مرة و«أقصى لوت» أصغر ألف مرة. نقطة يتبعها ثلاث خانات بالضبط مبهمة كـ«1,000» ⇒ مرفوضة.
  if (/^\d{1,3}\.\d{3}$/.test(m[1])) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

/**
 * «1.000»/«1:1.000»/«٢٫٠٠٠» — رافعة مرفوضة لأنها مبهمة (`readLeverage`: 1:1000 بكتابة أوروبية أم 1:1؟) — بقراءة الآلاف
 * لرسالة `riskCalcLeverageAmbiguous` («هل تقصد 1:1000؟») بدل «رقم غير مفهوم… مثل 1.0850» التي لا تقول ما المبهم.
 * `value` كما كُتبت (مشذّبة)، `big` قراءة الآلاف. `null` = ليست هذه الحالة، أو قراءة الآلاف فوق `MAX_LEVERAGE`
 * («500.000» ⇒ 1:500000 ليست اقتراحاً — تبقى الرسالة العامة). عرضٌ فقط: الخانة تبقى مرفوضة.
 */
export function leverageAmbiguousThousands(raw: string): { value: string; big: number } | null {
  const s = normalizeDigits(raw)
    .replace(/[：]/g, ':')
    .replace(/[／]/g, '/')
    .replace(/٫/g, '.') // الفاصلة العشرية العربية: «٢٫٠٠٠» على اللوحة العربية
    .replace(/\s/g, '');
  const m = /^(?:1[:/])?(\d{1,3})\.(\d{3})$/.exec(s);
  if (!m) return null;
  const big = Number(m[1] + m[2]);
  return big >= 1 && big <= MAX_LEVERAGE ? { value: raw.trim(), big } : null;
}

/**
 * رافعة **مفهومة الصيغة لكنها خارج الحدّ** («1:5000»، «10000»، «0.5»): كانت ترفضها `parseLeverage` فتظهر
 * رسالة «رقم غير مفهوم — اكتبه بلا فواصل آلاف» — والرقم مفهوم وبلا فواصل، فيعيد المتداول كتابته كما هو.
 * true ⇒ رسالة `riskCalcLeverageOutOfRange` بالحدّ. الخانة تبقى مرفوضة (لا تغيير بالحساب).
 * false لفارغ، ومقبول، وصيغة غير مفهومة («100:1» مرفوضة عمداً — راجع `parseLeverage`).
 */
export function leverageOutOfRange(raw: string): boolean {
  const v = readLeverage(raw);
  return v != null && parseLeverage(raw) == null;
}

/**
 * الهامش الذي يحجزه الوسيط لمركز، **بعملة الحساب**: اللوت × حجم العقد × السعر × سعر التحويل ÷ الرافعة.
 *
 * اللوت × حجم العقد × السعر = القيمة الاسمية بعملة **التسعير** (0.5 لوت EURUSD عند 1.0850 = 54,250 USD؛
 * 0.1 لوت ذهب عند 2400 = 24,000 USD؛ 1 لوت USDJPY عند 150 = 15,000,000 JPY)، ثم تُحوَّل لعملة الحساب
 * بسعر التحويل نفسه الذي تُحسب به قيمة النقطة، ثم تُقسم على الرافعة. لـUSDJPY بحساب دولار يخرج
 * 100,000 USD ÷ الرافعة — أي أن السعر يُلغي نفسه كما يجب حين تكون العملة الأساس عملةَ الحساب.
 *
 * لماذا بالحاسبة: متداول برصيد 500$ ورافعة 1:30 يُخرج له حساب المخاطرة «0.50 لوت» على وقف ضيّق —
 * رقمٌ صحيح للمخاطرة لكنه يحجز ~1,800$ هامشاً فلا تُفتح الصفقة أصلاً، أو تُفتح بهامش حرّ صفريّ
 * فيُغلقها الوسيط عند أول تذبذب قبل الوقف. الرقمان معاً قبل النقر لا بعده.
 *
 * تقديرٌ: الوسيط قد يحسب بسعر مختلف (Ask/Bid أو سعر اللحظة) ومتطلّبات هامش المعادن/التقاطعات تختلف.
 * `null` لأي مدخل غير صالح أو غير موجب.
 *
 * `baseToAccount` (`marginBaseToAccount`): العملة الأساس **هي** عملة الحساب ⇒ الهامش = اللوت × العقد ÷ الرافعة بلا سعر.
 * «السعر يُلغي نفسه» أعلاه صحيحٌ فقط حين الدخول = السعر الحيّ: `quoteToAccount` = 1 ÷ **الحيّ**، والسعر = **الدخول المكتوب**،
 * فأمرٌ معلّق USDJPY عند 140 والسوق 150 كان يُخرج 933.33 USD لا 1,000 (والتقاطع EURGBP بحساب يورو كذلك بنسبة الدخول/الحيّ).
 */
export function requiredMargin(input: {
  spec: InstrumentSpec;
  lots: number;
  price: number;
  quoteToAccount: number;
  leverage: number;
  baseToAccount?: number | null;
}): number | null {
  const { spec, lots, price, quoteToAccount, leverage } = input;
  if (![lots, price, quoteToAccount, leverage].every((v) => Number.isFinite(v) && v > 0)) return null;
  return (lots * spec.contractSize * marginUnitValue(input)) / leverage;
}

/** قيمة وحدة واحدة من العقد بعملة الحساب للهامش: `baseToAccount` حين العملة الأساس = الحساب، وإلا السعر × التحويل. */
function marginUnitValue(input: { price: number; quoteToAccount: number; baseToAccount?: number | null }): number {
  const b = input.baseToAccount;
  return b != null && Number.isFinite(b) && b > 0 ? b : input.price * input.quoteToAccount;
}

/**
 * العملة الأساس = عملة حساب التحويل (`convAccount`: حساب السنت بالدولار) ⇒ قيمة الوحدة بعملة المال: 1، أو `CENTS_PER_USD`
 * بالسنت (USDJPYc: الوحدة دولار = 100 USC). `null` = ليست كذلك (الهامش من السعر × التحويل). راجع `requiredMargin`.
 */
export function marginBaseToAccount(spec: InstrumentSpec | null, convAccount: string, cent = false): number | null {
  if (!spec || spec.base !== convAccount) return null;
  return cent ? CENTS_PER_USD : 1;
}

/**
 * أكبر لوت يتّسع له هامش `available` (بعملة الحساب) عند هذه الرافعة، مقرَّباً **للأسفل** لخطوة اللوت —
 * عكس `requiredMargin` حرفياً: `requiredMargin(maxLotsForMargin(x)) ≤ x` دائماً.
 *
 * لماذا: حين يتجاوز الهامش الرصيد تقول الحاسبة «لا يتّسع» وتسكت عن السؤال التالي مباشرةً: «فكم أفتح؟»
 * — فيجرّب المتداول أرقاماً بيده. `0` حين لا يتّسع حتى أصغر لوت؛ `null` لمدخل غير صالح.
 */
export function maxLotsForMargin(input: {
  spec: InstrumentSpec;
  available: number;
  price: number;
  quoteToAccount: number;
  leverage: number;
  baseToAccount?: number | null;
}): number | null {
  const { spec, available, price, quoteToAccount, leverage } = input;
  if (![available, price, quoteToAccount, leverage].every((v) => Number.isFinite(v) && v > 0)) return null;
  const raw = (available * leverage) / (spec.contractSize * marginUnitValue(input));
  return Math.round(Math.floor(raw / LOT_STEP + 1e-9) * LOT_STEP * 100) / 100;
}

/**
 * خانة النقاط تخالف مسافة سعرَي الدخول والوقف؟ `typed` ما بخانة النقاط، `derived` = `slPipsFromPrices`.
 *
 * **غير متماثل عمداً.** نقاطٌ أضيق من السعرين = لوتٌ أكبر مما يحتمله الوقف المحفوظ، فأيّ فرقٍ للأسفل
 * تعارض — كان هامش ±0.05 يمرّر «24.96» على وقفٍ مسافته 25.0: لوتٌ من 24.96 ووقفٌ محفوظ على 25، أي
 * مخاطرة فوق المكتوبة بلا إشارة، و`slPipsFromPrices` تقرّب **للأعلى** أصلاً كي لا يحدث هذا بالضبط.
 * ونقاطٌ أوسع = لوتٌ أصغر (أأمن) فيُسمح بهامش نصف pipette لما يكتبه المتداول بيده («25.04»).
 *
 * `narrower`: أيّ الحالتين — الأضيق تقول خطرها (لوت أكبر من وقفه)، والأوسع تصف الحساب فقط.
 * `null` = لا تعارض (أو لا شيء يُقارن).
 */
export function stopPipsMismatch(
  typed: number,
  derived: number | null
): { typed: number; derived: number; narrower: boolean } | null {
  if (derived == null || !Number.isFinite(typed) || !Number.isFinite(derived)) return null;
  const narrower = typed < derived - 1e-9;
  const wider = typed - derived > 0.05 + 1e-9;
  return narrower || wider ? { typed, derived, narrower } : null;
}

/**
 * السعر الذي يُحسب عليه الهامش: الدخول المكتوب إن صلح، وإلا سعر السوق الحيّ بجهة الصفقة (Ask للشراء،
 * Bid للبيع — ما يُنفَّذ عليه فعلاً) ثم الوسطي. سطر الهامش كان يختفي بلا دخول مكتوب، ومن يحسب من
 * النقاط وحدها — أغلب الاستعمال — لا يعرف أبداً أن 0.50 لوت تحجز 1,800$ من حسابه ذي الخمسمئة.
 * `live` = true حين جاء السعر من السوق (يُعرض «@ السعر» كي لا يُظنّ مكتوباً). `null` بلا سعر صالح.
 */
export function marginPrice(input: {
  entry: number;
  quote: { price: number; bid?: number | null; ask?: number | null } | null;
  side: 'buy' | 'sell' | null;
}): { price: number; live: boolean } | null {
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (ok(input.entry)) return { price: input.entry, live: false };
  const q = input.quote;
  if (!q) return null;
  const sided = input.side === 'buy' ? q.ask : input.side === 'sell' ? q.bid : null;
  if (ok(sided)) return { price: sided, live: true };
  return ok(q.price) ? { price: q.price, live: true } : null;
}

/**
 * أوسع سبريد يُقبل بخانته (بالنقاط). الغريبة (USDTRY/USDZAR) تتّسع لمئات النقاط عند الأخبار، وفوق 500
 * خطأ كتابة شبه مؤكّد: سعرٌ مكتوب بدل نقاط («1.0851»؟ لا — «10851») يُضخّم المخاطرة المعروضة ويُصغّر اللوت.
 */
export const MAX_SPREAD_PIPS = 500;

/**
 * خانة السبريد: فارغة = 0 (اختيارية)، وإلا نقاط ≥ 0 حتى `MAX_SPREAD_PIPS`. أرقام عربية وفاصلة عشرية
 * كبقية الخانات (`parseDecimal`). `null` = نصّ غير مفهوم أو سالب أو خارج الحدّ.
 */
export function parseSpreadPips(raw: string): number | null {
  if (raw.trim() === '') return 0;
  const v = parseDecimal(raw, { unit: 'pip' });
  return v != null && v >= 0 && v <= MAX_SPREAD_PIPS ? v : null;
}

/**
 * السبريد المكتوب **رقمٌ مفهوم لكنه فوق `MAX_SPREAD_PIPS`** — غالباً سعرٌ مكتوب بدل نقاط («10851»). يُرجع
 * الرقم لتقول اللوحة «سبريد 10851 نقطة غير واقعي» بدل «رقم غير مفهوم» عن رقمٍ مفهوم تماماً؛ `null`
 * لكل ما عداه (فارغ، مقبول، سالب، نصّ غير مفهوم — لهذه رسائلها).
 */
export function spreadTooWide(raw: string): number | null {
  if (raw.trim() === '') return null;
  const v = parseDecimal(raw, { unit: 'pip' });
  return v != null && v > MAX_SPREAD_PIPS ? v : null;
}

/**
 * **الوقف ليس أبعد من السبريد** (`slPips ≤ spreadPips`، كلاهما موجب). الشراء يُفتح على Ask ووقفه يُضرب على Bid:
 * وقف 1 pip بسبريد 1.5 تحت Bid لحظة الفتح — يُضرب فوراً، والحاسبة كانت تعطيه لوتاً كبيراً (1% على 1 pip = 10 لوت
 * لـ10,000) بلا كلمة، وسطر «شاملة السبريد» يقول 2.5% فقط كأنها كلفةٌ لا خسارةٌ مؤكّدة. يقارن بالسبريد **المكتوب
 * كاملاً** لا بالباقي بعد `spreadBeyondLiveEntry`: الضرب الفوري يحدّده عرض السبريد نفسه مهما كان سعر الدخول.
 * السبريد الفارغ (0) أو غير المفهوم، أو وقفٌ غير صالح ⇒ false.
 */
export function stopInsideSpread(slPips: number, spreadPips: number | null): boolean {
  if (spreadPips == null || !Number.isFinite(spreadPips) || !(spreadPips > 0)) return false;
  if (!Number.isFinite(slPips) || !(slPips > 0)) return false;
  // تقريب الكتابة («1.5» مقابل 1.5000000001 من طرح سعرين) لا يقلب المساواة
  return Math.round(slPips * 1e6) <= Math.round(spreadPips * 1e6);
}

/**
 * **المخاطرة شاملة السبريد.** الشراء يُفتح على Ask ويُغلق وقفه على Bid (والبيع عكسه)، فوقفٌ 20 نقطة
 * بسبريد 1.5 يخسر قرابة 21.5 نقطة حين يُضرب — والحاسبة كانت تحسب اللوت والمخاطرة على الـ20 وحدها،
 * فـ«1%» المكتوبة تصير 1.08% فعلاً، وأكثر بكثير على وقف ضيّق (وقف 5 بسبريد 2 = 1.4%).
 *
 * `risk`/`pct`: لـ`lots` المحسوب نفسه على (الوقف + السبريد). `lotsWithin`: أكبر لوت يُبقي المخاطرة
 * شاملة السبريد ضمن النسبة المطلوبة (`positionSize` على الوقف الموسَّع، مقرَّباً للأسفل)؛ `null` حين
 * يخرج دون أصغر لوت. `null` كلّه بلا سبريد (0) أو بمدخل غير صالح — لا سطر يكرّر المخاطرة نفسها.
 *
 * `commissionPerLot`: حسابات Raw/ECN تأخذ عمولة عند الفتح وعند الإغلاق (7 USD للوت شائعة) — على 0.50
 * لوت ووقف 20 هي 3.50 فوق الـ100، أي 1.035% لا 1%. تُضاف × اللوت إلى المخاطرة، و`lotsWithin` يقسم
 * المخاطرة المطلوبة على كلفة اللوت كاملةً. عمولة وحدها بلا سبريد تكفي لإظهار السطر.
 */
export function spreadRisk(input: {
  lots: number;
  slPips: number;
  spreadPips: number;
  pipValuePerLot: number;
  balance: number;
  riskPct: number;
  contractSize: number;
  /** العمولة لكل لوت فتحاً وإغلاقاً **بعملة الحساب** — راجع `parseCommission`. غائبة/0 = بلا عمولة. */
  commissionPerLot?: number;
}): { risk: number; pct: number; lotsWithin: number | null } | null {
  const { lots, slPips, pipValuePerLot, balance, riskPct, contractSize } = input;
  const spreadPips = Number.isFinite(input.spreadPips) && input.spreadPips > 0 ? input.spreadPips : 0;
  const comm =
    input.commissionPerLot != null && Number.isFinite(input.commissionPerLot) && input.commissionPerLot > 0
      ? input.commissionPerLot
      : 0;
  if (spreadPips === 0 && comm === 0) return null;
  const effSl = slPips + spreadPips;
  const r = riskForLots({ lots, slPips: effSl, pipValuePerLot, balance });
  if (!r) return null;
  if (comm === 0) {
    const within = positionSize({ balance, riskPct, slPips: effSl, pipValuePerLot, contractSize });
    return { ...r, lotsWithin: within && !within.belowMinLot ? within.lots : null };
  }
  // العمولة تُدفع على كل لوت مهما كان الوقف: كلفة اللوت الواحد = (الوقف + السبريد) × قيمة النقطة + العمولة
  const risk = r.risk + lots * comm;
  let lotsWithin: number | null = null;
  if (Number.isFinite(riskPct) && riskPct > 0 && riskPct <= 100) {
    const want = (balance * riskPct) / 100;
    const steps = Math.floor(want / (effSl * pipValuePerLot + comm) / LOT_STEP + 1e-9);
    const l = Math.round(steps * LOT_STEP * 100) / 100;
    lotsWithin = l >= LOT_STEP ? l : null;
  }
  return { risk, pct: (risk / balance) * 100, lotsWithin };
}

/**
 * السبريد الذي **بقي** ليُضاف للمخاطرة والربح حين يكون الدخول هو Ask الشراء/Bid البيع من لقطة حيّة.
 *
 * لماذا: `spreadRisk`/`profitAfterCosts` تفترضان دخولاً مكتوباً من الشارت، فالسبريد خارج المسافة. لكن «الدخول =
 * السعر الحالي» وشرائح الوقف تكتب **Ask** الشراء (Bid البيع): الشراء على Ask 1.08515 ووقفه يُضرب حين يبلغ Bid
 * 1.08315 = 20 pip خسارة بالضبط — السبريد داخل المسافة أصلاً. كانت الحاسبة تضيفه مرّة ثانية: «المخاطرة شاملة
 * السبريد 107.50 (1.08%)» عن صفقة تخاطر بـ100 بالضبط، ونصيحة «0.46 lot» بدل 0.50، وR:R صافية 1:1.8 بدل 1:2
 * تُحفظ بملاحظة الدفتر؛ وعلى حساب 100 بوقف 10: «حتى 0.01 تتجاوز 1%» عن لوتٍ يخاطر بـ1.00 تماماً.
 *
 * يُطرح سبريد اللقطة (مقرَّباً لعُشر pip **للأسفل**، فالباقي لا يُصغَّر) من السبريد المكتوب: وسيطٌ أوسع من
 * اللقطة ما زال يُحسب فرقه. بشرط أن يكون الدخول على سعر **جهة الوقف** (Ask ووقفٌ تحته، أو Bid ووقفٌ فوقه) —
 * غير ذلك (دخولٌ بالوسطي، Bid/Ask غائب، جهة معاكسة) ⇒ السبريد المكتوب كاملاً كما كان.
 */
export function spreadBeyondLiveEntry(input: {
  spreadPips: number;
  spec: InstrumentSpec;
  entry: number;
  stop: number;
  q: { bid?: number | null; ask?: number | null } | null;
}): number {
  const { spreadPips, spec, entry, stop, q } = input;
  if (!Number.isFinite(spreadPips) || spreadPips <= 0) return 0;
  if (!q || ![entry, stop].every((v) => Number.isFinite(v) && v > 0) || entry === stop) return spreadPips;
  const { bid, ask } = q;
  if (typeof bid !== 'number' || typeof ask !== 'number' || !(bid > 0) || !(ask > bid)) return spreadPips;
  const tol = spec.pipSize / 20; // نصف pipette: الدخول نصٌّ منسَّق من السعر نفسه
  const atSide = stop < entry ? Math.abs(entry - ask) < tol : Math.abs(entry - bid) < tol;
  if (!atSide) return spreadPips;
  const inside = Math.floor(Math.round(((ask - bid) / spec.pipSize) * 10 * 1e6) / 1e6) / 10;
  const left = Math.round((spreadPips - inside) * 1e9) / 1e9;
  return left > 0 ? left : 0;
}

/**
 * ما يُقال تحت سطر «المخاطرة شاملة التكاليف»: `smaller` = لوت أصغر يُبقي النسبة المكتوبة، و`none` = حتى
 * أصغر لوت (0.01) يتجاوزها حين تُحسب التكاليف، و`null` = لا شيء يُقال (بلا تكاليف، أو اللوت المحسوب
 * يتّسع لها أصلاً).
 *
 * لماذا `none`: `spreadRisk().lotsWithin` يصير `null` حين تبتلع التكاليف المخاطرة كلّها (رصيد 100، 1%،
 * وقف 10، سبريد 1: 0.01 لوت = 1.10 من 1.00) — وكان السطر يسكت حينها، فيقرأ المتداول «0.01 lot» فوقه
 * كأنها ضمن نسبته. `withCosts` هو ناتج `spreadRisk` للّوت نفسه (لا يصير `null` لـ`lotsWithin` إلا لهذا
 * السبب ما دام اللوت محسوباً بنسبة صالحة).
 */
export function costsLotsAdvice(
  lots: number | null,
  withCosts: { lotsWithin: number | null } | null
): { kind: 'smaller'; lots: number } | { kind: 'none' } | null {
  if (withCosts == null || lots == null || !Number.isFinite(lots) || lots <= 0) return null;
  if (withCosts.lotsWithin == null) return { kind: 'none' };
  return withCosts.lotsWithin < lots - 1e-9 ? { kind: 'smaller', lots: withCosts.lotsWithin } : null;
}

/**
 * الربح عند الهدف **بعد التكاليف** وR:R الصافية: السبريد يُدفع مرّة بالرحلة (الشراء يُفتح على Ask ويُغلق
 * هدفه على Bid)، والعمولة فتحاً وإغلاقاً لكل لوت — فالصافي = الإجمالي − اللوت × (السبريد × قيمة النقطة
 * + العمولة)، وR:R الصافية = الصافي ÷ المخاطرة شاملة التكاليف (`spreadRisk().risk`، التي تُضيف السبريد
 * والعمولة نفسيهما للوقف).
 *
 * لماذا: «الربح المحتمل ≈ 200.00 USD · R:R 1:2.0» إجماليان والسطر تحتهما يقول «المخاطرة شاملة التكاليف
 * 111.00 USD» — فالخطة الحقيقية 189 مقابل 111، أي 1:1.7 لا 1:2. وعلى وقف وهدف ضيّقين (سكالبينغ 5/5،
 * سبريد 1، عمولة 7، لوت واحد EURUSD) الإجمالي 1:1 والصافي 33 مقابل 67، أي 1:0.5 — خطة تُعرض متعادلة
 * وهي تربح نصف ما تخاطر به.
 *
 * `net` قد يكون ≤ 0 (التكاليف تبتلع الهدف كلّه) — رقمٌ صادق يُعرض لا يُخفى؛ `rr` حينها `null`. `null`
 * كلّه بلا تكاليف (السطر يكرّر الإجمالي) أو بمدخل غير صالح.
 */
export function profitAfterCosts(input: {
  grossProfit: number;
  lots: number;
  spreadPips: number;
  pipValuePerLot: number;
  commissionPerLot?: number;
  /** `spreadRisk().risk` للّوت نفسه */
  riskWithCosts: number;
}): { net: number; costs: number; rr: number | null } | null {
  const { grossProfit, lots, pipValuePerLot: pv, riskWithCosts } = input;
  if (![grossProfit, lots, pv, riskWithCosts].every((v) => Number.isFinite(v) && v > 0)) return null;
  const spread = Number.isFinite(input.spreadPips) && input.spreadPips > 0 ? input.spreadPips : 0;
  const comm =
    input.commissionPerLot != null && Number.isFinite(input.commissionPerLot) && input.commissionPerLot > 0
      ? input.commissionPerLot
      : 0;
  if (spread === 0 && comm === 0) return null;
  const costs = lots * (spread * pv + comm);
  const net = grossProfit - costs;
  return { net, costs, rr: net > 0 ? Math.round((net / riskWithCosts) * 1e9) / 1e9 : null };
}

/**
 * تحذير «الربح المحتمل أقل من المخاطرة»: من R:R **بعد التكاليف** حين تُكتب (`net` من `profitAfterCosts`)،
 * وإلا من الإجمالية. 1:1.05 إجمالياً بسبريد 1.5 وعمولة 7 تصير 1:0.9 صافياً — كان التحذير يسكت لأنه يقرأ
 * الإجمالي وحده. صافٍ ≤ 0 = `false` (سطر «التكاليف تأكل الهدف» يقولها أقوى، ولا يتكرّر تحذيران).
 */
export function rewardBelowRisk(
  grossRR: number | null,
  net: { net: number; rr: number | null } | null,
): boolean {
  if (net) return net.net > 0 && net.rr != null && net.rr < 1;
  return grossRR != null && Number.isFinite(grossRR) && grossRR < 1;
}

/**
 * **أيّ** تحذير «الربح أقل من المخاطرة» يُقال: `gross` = الإجمالية نفسها تحت 1:1 (`planLowRR` — «الربح
 * المحتمل أقل من المخاطرة» يصف السطر الذي فوقه حرفياً)، `net` = الإجمالية ≥ 1:1 والتكاليف وحدها تُنزلها
 * تحتها (`riskCalcLowNetRR` — «بعد التكاليف…»)، `null` = لا تحذير (القرار نفسه: `rewardBelowRisk`).
 *
 * لماذا: حين تُقرأ الصافية كان التحذير الوحيد «الربح المحتمل أقل من المخاطرة» يقع تحت سطرٍ يقول
 * «R:R 1:1.1» — رقمٌ يقول ربحاً أكبر وتحذيرٌ يقول العكس، فيبدو أحدهما خطأً ويُتجاهل التحذير. السبب هو
 * التكاليف، والجملة الآن تسمّيه.
 */
export function lowRewardWarning(
  grossRR: number | null,
  net: { net: number; rr: number | null } | null,
): 'gross' | 'net' | null {
  if (!rewardBelowRisk(grossRR, net)) return null;
  return grossRR != null && Number.isFinite(grossRR) && grossRR < 1 ? 'gross' : 'net';
}

/**
 * خانة العمولة (لكل لوت، فتحاً وإغلاقاً، بعملة الحساب): فارغة = 0 (حسابات Standard بلا عمولة)، وإلا
 * مبلغ ≥ 0 بقاعدة الرصيد (`amount`: «7.000» مبهمة تُرفض بدل أن تُقرأ 7). `null` = غير مفهوم أو سالب.
 *
 * `ccy` = عملة الخانة (عملة الحساب، أو USC لحساب السنت): «$7»، «7 USD»، «7 دولار» — كما يكتبها الوسيط بجدول عمولاته
 * («$7 per lot») — تُقبل **لعملة الخانة وحدها** بقاعدة خانة المخاطرة (`moneyTextFor`). كانت «رقم غير مفهوم» بينما
 * «$50» بخانة المخاطرة فوقها مقبولة. «€7» بحساب دولار و«$7» بحساب سنت (سبعة دولارات = 700 سنت؟) تبقى مرفوضة.
 */
export function parseCommission(raw: string, ccy?: string): number | null {
  if (raw.trim() === '') return 0;
  let v = parseDecimal(raw, { amount: true });
  if (v == null && ccy) {
    const text = moneyTextFor(raw, ccy);
    if (text != null) v = parseDecimal(text, { amount: true });
  }
  return v != null && v >= 0 ? v : null;
}


/** وضع الحساب الذي تُقرأ به خانة العمولة: `std` (عقد عادي)، `cent` (لوت سنت بالـUSC)، `micro` (لوت micro بعملة الحساب). */
export type CommissionMode = { kind: 'std' | 'cent' | 'micro'; account: string };
/** عملة خانة العمولة بوضعها: السنت بالـUSC، والعادي/micro بعملة الحساب. */
const commissionCcy = (m: CommissionMode) => (m.kind === 'cent' ? 'USC' : m.account);

/**
 * نصّ خانة العمولة بعد تبدّل وضع الحساب («EURUSD» ⇄ «EURUSDc» ⇄ «EURUSDmicro») — العمولة «لكل لوت» واللوت تغيّر.
 * بمكافئها للوت العادي: 7 USD/لوت عادي = 7 USC/لوت سنت (عقدٌ ÷ 100 بعملةٍ ÷ 100 — الرقم نفسه) = 0.07 USD/لوت micro.
 *
 * لماذا: الخانة واحدة وتُحفظ، فـ«7» المكتوبة للحساب العادي كانت تُقرأ 7 USD **لكل لوت micro** (مئة ضعف) بعد «EURUSDmicro»،
 * فتُضخَّم التكاليف ويُصغَّر اللوت «الشامل للتكاليف» وسطر الدفتر يكتب «commission 7.00 USD/lot». عملةٌ أساس مختلفة (حساب
 * يورو ⇄ سنت دولار) ⇒ `''` كشريحة عملة الحساب (7 EUR ليست 7 USC). فارغة أو غير مفهومة أو الوضع نفسه ⇒ النصّ كما هو.
 */
export function commissionAcrossModes(raw: string, from: CommissionMode, to: CommissionMode): string {
  if (from.kind === to.kind && from.account === to.account) return raw;
  const v = parseCommission(raw, commissionCcy(from));
  if (raw.trim() === '' || v == null) return raw;
  const base = (m: CommissionMode) => (m.kind === 'cent' ? 'USD' : m.account);
  if (base(from) !== base(to)) return '';
  const perStdLot = (m: CommissionMode) => (m.kind === 'micro' ? 100 : 1);
  // «$7» بعلامة: العلامة تخصّ الوضع القديم («$7» بوضع السنت مرفوضة) ⇒ الرقم وحده
  if (v === 0 || perStdLot(from) === perStdLot(to)) return parseCommission(raw) != null ? raw : String(v);
  return String(Number(((v * perStdLot(from)) / perStdLot(to)).toFixed(6)));
}

/**
 * أرقام ملاحظة العمولة بوضع micro/السنت (`riskCalcCommissionNoteMicro` `{std}`/`{micro}`، `riskCalcCommissionNoteCent` `{usc}`).
 * من خانة العمولة حين فيها مبلغ موجب مفهوم — فيرى المتداول ما تعنيه «0.05» التي كتبها (= 5 للوت العادي) — وإلا المثال 7 / 0.07.
 * `std` = null (عقد عادي أو رمز مجهول) ⇒ `null`: الملاحظة العادية.
 */
export function commissionNoteExample(
  raw: string,
  kind: CommissionMode['kind'] | null,
  ccy?: string,
): { std: string; micro: string; usc: string } | null {
  if (kind !== 'micro' && kind !== 'cent') return null;
  const v = parseCommission(raw, ccy);
  const typed = v != null && v > 0 ? v : null;
  const fmt = (x: number) => String(Number(x.toFixed(6)));
  if (kind === 'cent') {
    const usc = fmt(typed ?? 7);
    return { std: usc, micro: fmt((typed ?? 7) / 100), usc };
  }
  const micro = typed ?? 0.07;
  return { std: fmt(micro * 100), micro: fmt(micro), usc: fmt(micro * 100) };
}

/**
 * سقف المخاطرة للصفقة الواحدة الذي تحذّر الحاسبة **فوقه** (`riskCalcHighRisk`: «أكثر من 2%… مخاطرة عالية»).
 * الحدّ المعلَن بالتطبيق: **1% افتراضي موصى به** (الخانة تبدأ «1»، النصائح «≤1%») و**2% سقف** (الأكاديمية «1-2%»).
 * التحذير على السقف لا على الموصى به: 1.5% اختيارٌ مشروع ضمن ما تعلّمه الأكاديمية، و⚠ عليه يُعلّم تجاهل التحذير.
 */
export const RISK_HIGH_PCT = 2;

/** نسبة مخاطرة فوق `RISK_HIGH_PCT` (بلا سقف علوي: 200% بضغطة زائدة أخطر من 20%). غير رقم ⇒ false. */
export function riskIsHigh(pct: number | null | undefined): boolean {
  return pct != null && Number.isFinite(pct) && pct > RISK_HIGH_PCT;
}

/** أكبر حجم باللوت يُعقل بخانة «الحجم لوت»: وسطاء التجزئة يحدّون الأمر الواحد بـ50–100 لوت عادةً. */
export const MAX_SANE_LOTS = 100;
/**
 * الحدّ نفسه للوت **السنت/micro** (`smallContractSpec`، عقدٌ ÷ 100): ضعف العادي. 125 لوت سنت = 1.25 لوت عادي كانت تحذّر
 * «أكبر من أقصى أمر» بالحاسبة (حدّ العادي 100)، ولوت السنت بطبيعته أرقامٌ أكبر. 200 = أقصى أمر سنت شائع (Exness Cent)،
 * وهو الحدّ الذي يعدّ به الدفتر حجم السنت مريباً (`journalSizeLooksLikeUnits`) — فلا تُسجَّل خطةٌ يرفضها الدفتر.
 */
export const MAX_SMALL_LOTS = 2 * MAX_SANE_LOTS;

/**
 * حدّ **تحذير** الحاسبة للّوت العادي: الطرف الأدنى من «50–100 lot» الذي يذكره نصّ التحذير (`riskCalcOverOrderMax`).
 * كان التحذير على `MAX_SANE_LOTS` (100) فيخرج 75 لوتاً بلا إشارة، والوسيط الذي يحدّ بـ50 يرفض الأمر.
 * منفصلٌ عن `MAX_SANE_LOTS` عمداً: ذاك حدّ «الرقم وحداتٌ لا لوتات» بالدفتر، و60 لوتاً هناك حجمٌ حقيقي لا يُشكّ فيه.
 */
export const ORDER_WARN_LOTS = 50;

/**
 * الحجم المحسوب **فوق أكبر أمر** يقبله بعض الوسطاء (`ORDER_WARN_LOTS`): رصيد 100,000 بمخاطرة 2% ووقف
 * 1 pip يُخرج 200 لوت — رقمٌ صحيح حسابياً لكن الأمر يُرفض عند الوسيط (أو الوقف نفسه خطأ كتابة: «1»
 * بدل «10»). يُرجع اللوت المقرَّب ليُذكر بالتحذير، أو `null` (ضمن الحدّ، أو دون أصغر لوت، أو لا نتيجة).
 * الحدّ بالضبط مقبول. السنت/micro: `MAX_SMALL_LOTS` (200) كالدفتر.
 */
export function lotsOverOrderMax(result: SizeResult | null, small = false): number | null {
  if (!result || result.belowMinLot || !Number.isFinite(result.lots)) return null;
  return result.lots > (small ? MAX_SMALL_LOTS : ORDER_WARN_LOTS) ? result.lots : null;
}

/**
 * حجمٌ مكتوب بالدفتر يبدو **وحداتٍ لا لوتات**: cTrader وكثير من المنصّات تعرض الحجم «10,000» (وحدة)
 * لا «0.10» — فينسخه المتداول كما هو، فتُحفظ صفقة بعشرة آلاف لوت وتخرج مخاطرتها «125,000,000 USD»
 * ويُلوَّث صافي الأداة بالدفتر كلّه. فوق `MAX_SANE_LOTS` يُعدّ الرقم مريباً؛ و`lots` = الرقم ÷ حجم
 * العقد حين يقع على خطوة اللوت (10,000 على EURUSD = 0.10، و1,000 أونصة ذهب = 10) ليُقترح بنقرة،
 * وإلا `null` (مريب بلا تحويل واضح). `null` كلّه = الحجم معقول (أو الأداة مجهولة فلا حجم عقد).
 */
export function sizeLooksLikeUnits(size: number, spec: InstrumentSpec | null): { lots: number | null } | null {
  if (!spec || !Number.isFinite(size) || size <= MAX_SANE_LOTS) return null;
  const raw = size / spec.contractSize;
  const steps = Math.round(raw / LOT_STEP);
  const aligned = steps >= 1 && Math.abs(raw / LOT_STEP - steps) < 1e-6 && raw <= MAX_SANE_LOTS;
  return { lots: aligned ? Math.round(steps * LOT_STEP * 100) / 100 : null };
}

/**
 * ملاحظة الصفقة حين تُسجَّل الخطة بالدفتر من الحاسبة — نصّ محايد اللغة (الأرقام هي المقصودة):
 * «0.50 lot · risk 100.00 USD · R:R 1:2 · spread 1.5 pip».
 *
 * السبريد كان يُسقط: الحاسبة تقول «المخاطرة شاملة السبريد 1.08%» ثم تُحفظ الصفقة بلا أثر له، فحين
 * يراجع المتداول لماذا خسر 21.5 نقطة على وقف 20 لا يجد بالدفتر السبريد الذي خطّط به. يُضاف حين يكون
 * موجباً فقط (0/فارغ/غير صالح = لم يُكتب)، بلا أصفار زائدة («1.5» لا «1.50»). `risk` null = لا مبلغ
 * (يُكتب رمز العملة وحده، كما كان).
 */
export function planJournalNote(input: {
  lots: number;
  risk: number | null;
  ccy: string;
  rr: string;
  spreadPips?: number | null;
  /** لكل لوت فتحاً وإغلاقاً بعملة الحساب — يُكتب «commission 7.00 USD/lot» حين يكون موجباً */
  commissionPerLot?: number | null;
  /**
   * R:R بعد التكاليف (`formatRR(profitAfterCosts().rr)`) — «net R:R 1:1.7» بعد السبريد والعمولة، فلا
   * يراجع المتداول صفقته بـ1:2 خطّط لها وهي 1:1.7. يُكتب حين يُعطى نصّاً غير فارغ فقط.
   */
  netRR?: string | null;
  /**
   * كلمات الملاحظة بلغة الواجهة (`planRiskWord`، `termSpreadWord`…) — كانت إنجليزية دائماً («risk · spread · commission»)
   * فيقرأ المتداول العربي/الكردي دفتره بلغتين. فارغة/غائبة ⇒ الإنجليزية كما كانت. «lot» و«R:R» و«pip» تبقى كما هي:
   * «1.00 lot» أول الملاحظة علامةٌ يقرؤها الدفتر (`knownLots`) ليعرف أن الحجم 1 كُتب لا افتُرض.
   */
  words?: { risk?: string | null; spread?: string | null; commission?: string | null; netRR?: string | null };
}): string {
  const { lots, risk, ccy, rr, spreadPips, commissionPerLot, netRR, words } = input;
  const w = (v: string | null | undefined, en: string) => (v && v.trim() ? v.trim() : en);
  const riskText = risk != null && Number.isFinite(risk) ? formatMoney(risk, ccy) : ccy;
  const parts = [`${lots.toFixed(2)} lot`, `${w(words?.risk, 'risk')} ${riskText}`, `R:R ${rr}`];
  if (spreadPips != null && Number.isFinite(spreadPips) && spreadPips > 0) {
    parts.push(`${w(words?.spread, 'spread')} ${Number(spreadPips.toFixed(2))} pip`);
  }
  if (commissionPerLot != null && Number.isFinite(commissionPerLot) && commissionPerLot > 0) {
    parts.push(`${w(words?.commission, 'commission')} ${formatMoney(commissionPerLot, ccy)}/lot`);
  }
  if (netRR) parts.push(`${w(words?.netRR, 'net R:R')} ${netRR}`);
  return parts.join(' · ');
}

/**
 * «الدخول = السعر الحالي» يُكتب عند وصول السعر **فقط** إن بقيت خانة الدخول كما كانت لحظة النقرة (مسافاتٌ
 * حولها لا تُحسب). رقمٌ كتبه المتداول باليد أثناء الطلب (1.0850) كان يُستبدل بـAsk الحيّ (1.0863) فيتغيّر
 * الوقف بالنقاط واللوت بصمت — والحاسبة تُقرأ على أنها خطّته هو.
 */
export function liveEntryFillAllowed(atTap: string, now: string): boolean {
  return atTap.trim() === now.trim();
}

/** سعر تحويل لم يتجدّد منذ هذه المدّة يُوسَم «قديماً» — التجديد كل 60 ث، فخمس دقائق = أربعة تجديدات فاشلة متتالية */
export const CONV_STALE_AFTER_MS = 5 * 60_000;

/**
 * دقائق عمر سعر التحويل المجلوب إن صار قديماً، وإلا null. فشل التجديد الصامت يُبقي آخر سعر (إسقاطه يُعطّل الحاسبة
 * بلا اتصال) — لكن بلا إشارة كان يبقى ساعاتٍ واللوت محسوب عليه. الدقائق مقرّبة للأسفل (لا تقول «6» بعد 5:10).
 * `fetchedAt` غير صالح أو في المستقبل (ساعة الجهاز عادت للخلف) ⇒ null: لا تحذير برقم سالب أو مختلَق.
 */
export function convStaleMinutes(fetchedAt: number, now: number): number | null {
  if (!Number.isFinite(fetchedAt) || !Number.isFinite(now)) return null;
  const age = now - fetchedAt;
  if (age < CONV_STALE_AFTER_MS) return null;
  return Math.floor(age / 60_000);
}
