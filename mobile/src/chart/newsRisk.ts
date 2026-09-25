/**
 * «خبر قوي قريب» للزوج المعروض — رياضيات صرفة قابلة للاختبار بـtsx.
 *
 * المتداول الفردي يُفاجأ غالباً بخبر عالي التأثير (NFP/قرار فائدة) يقفز فيه السعر وينزلق الوقف.
 * نربط عملتي الزوج بأحداث التقويم عالية التأثير خلال الساعات القليلة القادمة (أو الجارية الآن).
 *
 * - عملات الزوج: EURUSD → EUR,USD؛ XAUUSD → USD (لا أحداث للذهب نفسه)؛ DXY/النفط/NAS100 → USD،
 *   GER40 → EUR (`SINGLE_CCY`)؛ BTCUSD → USD كالذهب (`CRYPTO`). رموز غير معروفة (أسهم مفردة) → [] بدل ربط مخمَّن.
 * - أحداث المثال (`sample`) لا تُستخدم أبداً: تحذير من خبر وهمي أسوأ من غياب التحذير.
 * - أحداث بلا وقت دقيق (`ts`) تُتجاهَل: لا نعرض عدّاً تنازلياً لا نعرفه.
 */

import { instrumentSpec, smallContractPair } from '../positionSize';

export type NewsEvent = {
  id: string;
  title: string;
  currency: string;
  impact: string;
  ts?: number | null;
  sample?: boolean;
};

/**
 * كل عملة تقبلها حاسبة المخاطرة (`FIAT` بـpositionSize.ts) يجب أن تكون هنا: USDSAR/USDAED/USDILS كانت
 * تُرفض كـ«ليست فوركس» فيغيب تحذير الرواتب الأمريكية وقرار الفيدرالي كلياً عن زوجٍ تحسب له الحاسبة حجم
 * مركز — والمخاطرة هنا ساقُ الدولار لا الريال. عملةٌ لا يغطّيها التقويم لا تضرّ: لا أحداث لها فحسب.
 */
const FIAT = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY',
  'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'ZAR', 'MXN', 'SGD', 'HKD',
  'ILS', 'SAR', 'AED',
  // عملات تُكتب بالدفتر نصّاً حرّاً (USDHUF، USDTHB…) ولا تحسبها الحاسبة: كانت تُرجع [] فيغيب تحذير
  // الرواتب الأمريكية وقرار الفيدرالي عن ساق الدولار. عملات ورقية بأكواد ISO فقط — لا عملات رقمية.
  'HUF', 'CZK', 'RON', 'THB', 'KRW', 'INR', 'IDR', 'MYR', 'PHP', 'TWD', 'BRL', 'CLP', 'COP',
  'RUB', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'KZT',
]);
/**
 * معادن تُسعَّر عالمياً بالدولار: الذهب والفضة، و**البلاتين والبلاديوم والنحاس** بأسماء منصّات MT5
 * (XPTUSD، XPDUSD، XCUUSD). الثلاثة الأخيرة كانت تُرجع `[]` فيُسجَّل عقد بلاتين قبل الرواتب الأمريكية
 * بدقائق بلا تحذير — وهي تقفز بخبر الدولار كالذهب تماماً. للتحذير وحده: حاسبة المخاطرة لا تحسبها
 * (مواصفات عقودها تختلف بين الوسطاء أكثر من الذهب).
 */
const METALS = new Set(['XAU', 'XAG', 'XPT', 'XPD', 'XCU']);
/**
 * رموز ليست زوجاً من 6 أحرف ويحرّكها خبر عملةٍ واحدة أولاً — بأسمائها الشائعة لدى وسطاء التجزئة.
 *
 * الدفتر يقبل US30/NAS100/GER40 عمداً (`journalSymbol`)، ونموذج الصفقة يعرض تحذير الأخبار للرمز
 * المكتوب — لكن هذه الرموز كانت تُرجع `[]` فيسجّل متداول الناسداك صفقته **قبل الرواتب الأمريكية
 * بدقائق** بلا أي تحذير، وهي من أعنف ما يقفز على الخبر. والنفط والذهب بأسماء منصّات MT5 (XTIUSD،
 * XBRUSD، GOLD، SILVER) كانت كذلك. الربط ليس تخميناً: عملة تسعير المؤشر وبنكه المركزي هما خبره الأول
 * (الناسداك بالدولار، الداكس باليورو، الفوتسي بالإسترليني، النيكاي بالين، ASX بالأسترالي).
 * ما لا يُعرف (أسهم مفردة) يبقى `[]`؛ العملات الرقمية بقاعدتها (`CRYPTO`).
 */
const SINGLE_CCY: Record<string, string> = {
  DXY: 'USD', USDX: 'USD',
  USOIL: 'USD', UKOIL: 'USD', WTI: 'USD', BRENT: 'USD', XTIUSD: 'USD', XBRUSD: 'USD', XNGUSD: 'USD', NGAS: 'USD',
  XAUUSD: 'USD', XAGUSD: 'USD', GOLD: 'USD', SILVER: 'USD',
  PLATINUM: 'USD', PALLADIUM: 'USD', COPPER: 'USD', NATGAS: 'USD', OIL: 'USD',
  // أسماء OANDA: الأداة ثم عملة تسعيرها ملاصقةً
  WTICOUSD: 'USD', BCOUSD: 'USD', NATGASUSD: 'USD', SPX500USD: 'USD', NAS100USD: 'USD', US30USD: 'USD',
  DE30EUR: 'EUR', DE40EUR: 'EUR', EU50EUR: 'EUR', UK100GBP: 'GBP', AU200AUD: 'AUD',
  US30: 'USD', DJ30: 'USD', DJI: 'USD', WS30: 'USD',
  NAS100: 'USD', US100: 'USD', USTEC: 'USD', NDX: 'USD',
  SPX500: 'USD', US500: 'USD', SPX: 'USD', SP500: 'USD', US2000: 'USD',
  GER40: 'EUR', DE40: 'EUR', GER30: 'EUR', DE30: 'EUR', DAX40: 'EUR', DAX: 'EUR',
  FRA40: 'EUR', CAC40: 'EUR', EU50: 'EUR', STOXX50: 'EUR', EUSTX50: 'EUR', ESTX50: 'EUR',
  ESP35: 'EUR', SPA35: 'EUR', IBEX35: 'EUR', IT40: 'EUR', NETH25: 'EUR',
  UK100: 'GBP', FTSE100: 'GBP', FTSE: 'GBP',
  SWI20: 'CHF', SMI20: 'CHF',
  JP225: 'JPY', JPN225: 'JPY', NIKKEI: 'JPY',
  AUS200: 'AUD',
  HK50: 'HKD',
  /**
   * أسماء وسطاء المنطقة الأوسع انتشاراً كانت بلا تحذير: Exness «FR40»، IC Markets «F40»/«ES35»/«CHINA50»،
   * XM «SPAIN35Cash»/«CHI50Cash»، Pepperstone «CN50»/«SpotCrude»/«SpotBrent»، FXCM «HKG33»/«CHN50». مؤشر الصين
   * A50 يقفز ببيانات الصين (اليوان — `CNY` بالتقويم) قبل غيرها؛ و«VIX» بخبر الدولار.
   */
  FR40: 'EUR', F40: 'EUR', ES35: 'EUR', SPAIN35: 'EUR',
  CN50: 'CNY', CHN50: 'CNY', CHINA50: 'CNY', CHI50: 'CNY', CHINAA50: 'CNY',
  HKG33: 'HKD', HSI: 'HKD', ASX200: 'AUD', AU200: 'AUD',
  SPOTCRUDE: 'USD', SPOTBRENT: 'USD', VIX: 'USD',
  // وأسماء أخرى للناسداك/S&P/داو عند وسطاء المنطقة (Tickmill/FXTM/Admirals: «USTECH»، «NQ100»، «USA500»، «USA30») — كانت `[]`
  NQ100: 'USD', USTECH: 'USD', USTECH100: 'USD', USA100: 'USD', USA500: 'USD', USA30: 'USD', US2000USD: 'USD',
  /**
   * WTI باسم «CL-OIL» (وسطاء MT5 عدّة؛ `marketHours` يعرفه `CL[-_.]?OIL`): `suffixFree` تعدّ «-OIL» لاحقة فيبقى «CL»
   * ⇒ `[]` — لا تحذير قبل الرواتب/EIA ولا سطر «التقويم غير متاح». يُطابَق بالحروف كلها («CLOIL»).
   */
  CLOIL: 'USD',
  /**
   * أسماء مؤشرات أخرى شائعة لدى وسطاء التجزئة (IG/Pepperstone/FxPro/Admirals) كانت `[]` بلا تحذير: إيطاليا «ITA40»، يورو ستوكس
   * «STOXX50E»، هولندا «NL25»/«AEX»، سويسرا «SUI20»/«CH20»/«SWISS20»، النيكاي «N225»/«NI225»/«NIK225»، هونغ كونغ «HK33»،
   * كندا «CAN60»/«CA60»، جنوب أفريقيا «SA40»، السويد «SWE30»، النرويج «NOR25» — بعملة تسعير كلٍّ (قاعدة الجدول نفسها).
   */
  ITA40: 'EUR', STOXX50E: 'EUR', NL25: 'EUR', AEX: 'EUR',
  SUI20: 'CHF', CH20: 'CHF', SWISS20: 'CHF',
  N225: 'JPY', NI225: 'JPY', NIK225: 'JPY',
  HK33: 'HKD', CAN60: 'CAD', CA60: 'CAD', SA40: 'ZAR', SWE30: 'SEK', NOR25: 'NOK',
  /**
   * سلّة الدولار باسم FXCM «USDOLLAR»، والنفط «USOUSD»/«UKOUSD» (وسطاء MT5 آخرون)، والغاز «NATURALGAS»، وعوائد سندات الخزانة
   * («US10Y»، «UST10Y»، «US02Y»…) — أوّل ما يقفز على الرواتب والتضخّم الأمريكي. كانت كلها `[]`: لا تحذير ولا «التقويم غير متاح».
   */
  USDOLLAR: 'USD', USOUSD: 'USD', UKOUSD: 'USD', NATURALGAS: 'USD',
  US10Y: 'USD', UST10Y: 'USD', US10YR: 'USD', US02Y: 'USD', US2Y: 'USD', UST02Y: 'USD', US30Y: 'USD', UST30Y: 'USD',
  /**
   * مؤشر الدولار «USDINDEX» (XM/Exness) وبرنت «UKBRENT»: `marketHours` يعرفهما (`DXY_RE`/`BRENT_RE`) فالشارت يعرض جلستهما،
   * لكنهما كانا `[]` هنا ⇒ لا تحذير قبل الرواتب/CPI/الفدرالي ولا «التقويم غير متاح» — والدولار أول ما يقفز عليها.
   */
  USDINDEX: 'USD', UKBRENT: 'USD',
};

/**
 * يُسقط لاحقة الوسيط **بفاصل** («US30.cash»، «NAS100-ECN»، «USOIL.m»، «GOLD#») عن رمز غير فوركس. لا
 * حرف ملاصق بلا فاصل: «US30M» قد يكون اسماً آخر، فيُترك مرفوضاً بدل التخمين.
 *
 * **إلا «Cash» الملاصقة**: هكذا تسمّي XM — من أوسع الوسطاء انتشاراً بالمنطقة — عقودها الفورية
 * («US30Cash»، «US100Cash»، «GER40Cash»، «OILCash»)، فكانت كلها `[]` بلا تحذير. الكلمة لا تكون جزءاً من
 * اسم مؤشر، والنتيجة تُقبل فقط إن طابقت اسماً معروفاً بـ`SINGLE_CCY`.
 */
const suffixFree = (raw: string): string =>
  raw
    .trim()
    .toUpperCase()
    .replace(/^[#.]+/, '')
    .replace(/[.\-_#+][A-Z0-9]{0,5}$/, '')
    .replace(/(.)CASH$/, '$1');

/**
 * الاسم المعروف لرمز غير فوركس بلا لاحقة وسيطه («US30.cash»، «US30Cash»، «GOLD#»، «usoil.m» ⇒ US30،
 * US30، GOLD، USOIL) — أو `null` إن لم يبقَ اسمٌ من `SINGLE_CCY`. لمفتاح الأداة بالدفتر: الإسقاط نفسه
 * الذي يقرّر تحذير الأخبار، فلا يُدمج اسمٌ مجهول («US30M»، «AAPL.US») على التخمين.
 */
export function knownSingleName(raw: string): string | null {
  const bare = suffixFree(raw).replace(/[\s/]/g, '');
  return SINGLE_CCY[bare] ? bare : null;
}

/**
 * العملات الرقمية الكبرى مقابل عملة ورقية («BTCUSD» — بقائمة المراقبة نفسها — «ETHUSD.m»، «BTCUSDT»،
 * «DOGEUSD»): كالذهب تماماً، أصلٌ مسعَّر بالدولار بلا تقويم أخبار خاص به، وأعنف ما يقفز عليه مجدولاً هو
 * التضخّم الأمريكي وقرار الفيدرالي والرواتب. كانت `[]` فيفتح متداول البيتكوين صفقته قبل CPI بدقائق بلا
 * تحذير. العملة المستقرّة (USDT/USDC) = الدولار؛ بعملة غير الدولار الساقان معاً (كـXAUEUR)؛ رقميّة مقابل
 * رقميّة («ETHBTC») أو اسم غير مدرج يبقى `[]`.
 */
/**
 * وعملات وسطاء التجزئة الأخرى (Exness/XM/IC Markets تدرج عشراتٍ منها: «SHIBUSD»، «PEPEUSD»، «TONUSD»، «NEARUSD»…): كانت خارج
 * القائمة ⇒ `[]` بلا تحذير قبل CPI، و`marketHours` يعدّها فوركس فيُغلقها السبت والأحد وهي تتداول. لا رمز منها عملة ورقية ISO.
 */
const CRYPTO =
  /^(BTC|XBT|ETH|LTC|XRP|SOL|BCH|BNB|ADA|DOT|DOGE|AVAX|LINK|XLM|TRX|SHIB|PEPE|MATIC|POL|TON|NEAR|UNI|ATOM|ETC|FIL|APT|ARB|OP|SUI|XMR|DASH|ZEC|EOS|AAVE|ALGO|HBAR|ICP|XTZ|SAND|MANA|AXS|CRV|MKR|INJ|WIF|BONK|FLOKI|TRUMP|KAS|SEI|TIA|RENDER|FET|GRT|STX|VET|THETA|EGLD|KSM|NEO|QTUM|ZIL|ENJ|BAT|COMP|SNX|YFI|SUSHI|1INCH|CHZ|GALA|APE|LDO|JUP|ENA|WLD|STRK|BABYDOGE)(USDT|USDC|[A-Z]{3})$/;

/**
 * زوج رقميّ معروف بأي كتابة وسيط («BTCUSD»، «SOLUSD»، «BTCUSDT»، «BTCUSDm»، «ETH/USD»، «XRPUSD.c») — لساعات السوق
 * (`marketHours`): الكريبتو يتداول 24/7. القاعدة نفسها التي تقرّر عملة التحذير أعلاه، فلا تنحرف القائمتان.
 */
export function isCryptoSymbol(symbol: string): boolean {
  const letters = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  const bare = suffixFree(symbol).replace(/[\s/_-]/g, '');
  const glued = /^[A-Z0-9]{3,}[MC]$/.test(bare) ? bare.slice(0, -1) : null;
  return CRYPTO.test(bare) || CRYPTO.test(letters) || (glued != null && CRYPTO.test(glued));
}

/**
 * الزوج الرقميّ القانوني بلا لاحقة الوسيط («BTCUSDm»، «BTCUSD.m»، «ETH/USD»، «BTCUSD#» ⇒ BTCUSD، ETHUSD) — لسعر السوق ومفتاح
 * الأداة بالدفتر: المزوّد يعرف «BTCUSD» وحده، فكانت «BTCUSDm» (تسمية Exness) بلا نتيجة عائمة و«أغلق بسعر السوق» يفشل دائماً.
 * القاعدة نفسها التي تقرّر `isCryptoSymbol` (إلا بديل «الحروف وحدها»: لا يُخترع زوجٌ من رمزٍ فيه أرقام).
 * «BTCUSDC»/«BTCUSDT» عملات مستقرّة تبقى كما هي (لا تُقرأ C لاحقة سنت). `null` = ليس زوجاً رقمياً معروفاً.
 */
export function cryptoPairOf(symbol: string): string | null {
  const bare = suffixFree(symbol).replace(/[\s/_-]/g, '');
  const glued = /^[A-Z0-9]{3,}[MC]$/.test(bare) ? bare.slice(0, -1) : null;
  const m = CRYPTO.exec(bare) ?? (glued != null ? CRYPTO.exec(glued) : null);
  return m ? m[1] + m[2] : null;
}

/**
 * كتابات الوسيط التي تبقى بعد القواعد أدناه بلا عملة — فلا تحذير، وسطر «التقويم غير متاح» لا يظهر أيضاً، فيُقرأ الصمت
 * «لا أخبار» قبل الرواتب. الدفتر يمرّر الرمز كما كُتب، فهذه تصل فعلاً:
 * - **لاحقتان بفاصل** («NAS100.cash.m»، «NAS100_USD.m»، «EURUSD.m.x»): `suffixFree` تُسقط واحدة، وقاعدة OANDA تريد
 *   `_XXX` آخر الرمز. تُقشَّر لاحقةٌ بفاصل وتُعاد المحاولة.
 * - **كلمة نوع حساب ملاصقة** («EURUSDmini»، «XAUUSDpro»، «GBPJPYecn»): كـ«micro» و«Cash» الملاصقتين.
 * - **بادئة** «#»/«.» («#US30»، «.US30»، «#NAS100.cash»): تُقشَّر وتُعاد المحاولة.
 * تُقبل النتيجة فقط إن لم تكن فارغة — التحذير الزائد لا يكلّف شيئاً، والغائب قد يكلّف.
 */
export function symbolCurrencies(symbol: string): string[] {
  const r = currenciesOnce(symbol);
  if (r.length) return r;
  const up = symbol.trim().toUpperCase();
  // بادئة وسيط («#US30»، «.NAS100»، «#GOLD»): `suffixFree` كانت تعدّ «#US30» كلّها لاحقة فتُسقطها ⇒ `[]` قبل الرواتب
  const unprefixed = up.replace(/^[#.]+/, '');
  if (unprefixed !== up && unprefixed.length >= 2) return symbolCurrencies(unprefixed);
  const peeled = up.replace(/[.\-_#+][A-Z0-9]{0,5}$/, '');
  if (peeled !== up && peeled.length >= 2) {
    const p = symbolCurrencies(peeled);
    if (p.length) return p;
  }
  const word = /^([A-Z0-9]{3,}?)[.\-_#+]?(MINI|PRO|ECN|RAW|STD|ZERO|PLUS|VIP)$/.exec(up);
  return word ? currenciesOnce(word[1]) : [];
}

function currenciesOnce(symbol: string): string[] {
  /**
   * حساب **micro** بلاحقة ملاصقة (XM: «EURUSDmicro»، «GOLDmicro»): الحروف كلها 11 والملاصقة حرفٌ واحد فقط، فكانت
   * `[]` — صفقة يورو/دولار بلا تحذير قبل الرواتب. الزوج العادي نفسه (`smallContractPair`) يُحذَّر له.
   */
  const small = smallContractPair(symbol);
  if (small) return symbolCurrencies(small);
  /**
   * **أسماء OANDA بشرطة سفلية** («JP225_USD»، «CN50_USD»، «HK33_HKD»، «USB10Y_USD»): المقطع الأخير عملة التسعير لا
   * لاحقة وسيط، لكن `suffixFree` كان يُسقطه — فالنيكاي بالدولار يصير الين وحده، وسند الخزانة الأمريكي `[]`: صفقة
   * قبل الرواتب الأمريكية بدقائق بلا تحذير. الآن: عملة الأداة نفسها (إن عُرفت) ثم عملة تسعيرها. الأزواج («EUR_USD»،
   * «XAU_USD»، «BTC_USD» — مقطعٌ أوّل من 3 حروف) تبقى على مسارها أدناه كما كانت.
   */
  const oanda = /^([A-Z0-9]{2,})_([A-Z]{3})$/.exec(symbol.trim().toUpperCase());
  if (oanda && !/^[A-Z]{3}$/.test(oanda[1])) {
    const q = oanda[2] === 'CNH' ? 'CNY' : oanda[2];
    if (FIAT.has(q)) {
      const own = symbolCurrencies(oanda[1]);
      return own.includes(q) ? own : [...own, q];
    }
  }
  /**
   * الرمز القانوني أولاً (`instrumentSpec` يُسقط لاحقة الوسيط): الدفتر يمرّر الرمز كما كتبه المتداول،
   * و«XAUUSD.m» كان يصير «XAUUSDM» (7 أحرف) فيغيب تحذير الرواتب الأمريكية عن نموذج الصفقة قبل الدخول.
   */
  const letters = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  const bare = suffixFree(symbol).replace(/[\s/]/g, '');
  /**
   * **«m» الملاصقة** (Exness — أوسع الوسطاء انتشاراً بالمنطقة — تُلصقها بكل رموز الحساب Standard: «US30m»،
   * «USTECm»، «USOILm»، «BTCUSDm»): كانت كلها `[]` بلا تحذير، بينما «EURUSDm» و«XAUUSDm» بجانبها تحذّر
   * (`instrumentSpec`). تُقبل هنا **فقط** إن بقي بعدها اسمٌ معروف أو زوج رقميّ معروف — للتحذير وحده:
   * عقدٌ آخر باسم «US30M» يقفز بخبر الدولار كذلك، أما دمج مفتاح الأداة بالدفتر (`knownSingleName`) فيبقى بلا تخمين.
   *
   * **و«c» الملاصقة** (حساب Exness Cent: «EURUSDc»، «XAUUSDc»، «US30c») — كانت كلها `[]` حتى الأزواج، إذ لا
   * تعرفها `instrumentSpec` (عمداً للحاسبة: حرفٌ ملاصق قد يكون أداةً أخرى). تحذيرٌ زائد لا يكلّف شيئاً، والغائب
   * قبل الرواتب قد يكلّف. «BTCUSDC» تُقرأ عملةً مستقرّة قبل هذا (`CRYPTO`) فلا تتغيّر.
   */
  const glued = /^[A-Z0-9]{3,}[MC]$/.test(bare) ? bare.slice(0, -1) : null;
  const single =
    SINGLE_CCY[instrumentSpec(symbol)?.symbol ?? letters] ?? SINGLE_CCY[bare] ?? (glued ? SINGLE_CCY[glued] : undefined);
  if (single) return [single];
  const coin =
    CRYPTO.exec(bare.replace(/[-_]/g, '')) ?? CRYPTO.exec(letters) ?? (glued ? CRYPTO.exec(glued.replace(/[-_]/g, '')) : null);
  if (coin) {
    const q = coin[2] === 'USDT' || coin[2] === 'USDC' ? 'USD' : coin[2] === 'CNH' ? 'CNY' : coin[2];
    return FIAT.has(q) ? (q === 'USD' ? ['USD'] : ['USD', q]) : [];
  }
  /**
   * زوجٌ لا تعرفه الحاسبة (معدن غير الذهب/الفضة، عملة ناشئة) بلاحقة وسيط بفاصل: «XPDUSD.m» كانت تصير
   * «XPDUSDM» (7 أحرف) فتُرفض. الحروف كلها أولاً («USD-HUF» ⇒ USDHUF — الشرطة هنا فاصل الزوج لا لاحقة)،
   * ثم الرمز بلا لاحقته.
   */
  /**
   * **وأيّ حرف ملاصق واحد بعد زوجٍ من 6** («EURUSDs»، «EURUSDb»، «EURUSDz»، «XAUUSDr» — لواحق حسابات Swap-free/Raw
   * لوسطاء آخرين): كانت `[]` فلا تحذير ولا سطر «التقويم غير متاح». للزوج وحده (ساقاه عملتان/معدن معروفة أدناه) —
   * لا لاسم مؤشر، حيث الحرف قد يغيّر الأداة.
   */
  const pair7 = /^[A-Z]{7}$/.test(bare) ? bare.slice(0, 6) : null;
  const s =
    instrumentSpec(symbol)?.symbol ??
    (letters.length === 6
      ? letters
      : /^[A-Z]{6}$/.test(bare)
        ? bare
        : glued && /^[A-Z]{6}$/.test(glued)
          ? glued
          : pair7 ?? letters);
  if (s.length !== 6) return [];
  // CNH (يوان خارجي) يظهر بالتقويم كـCNY.
  const norm = (c: string) => (c === 'CNH' ? 'CNY' : c);
  const base = norm(s.slice(0, 3));
  const quote = norm(s.slice(3));
  /**
   * المعدن بعملة غير الدولار (XAUEUR، XAUAUD، XAGEUR…): الذهب يُسعَّر عالمياً بالدولار فيقفز بخبر
   * الدولار أولاً، ثم بخبر عملة التسعير. كانا يُرفضان كـ«ليس فوركس» فيغيب التحذير كلياً عن زوجٍ تقبله
   * حاسبة المخاطرة (`instrumentSpec`) وتحسب له حجم مركز — أي قبل الرواتب الأمريكية بدقائق بالضبط.
   */
  if (METALS.has(base)) return FIAT.has(quote) ? (quote === 'USD' ? ['USD'] : ['USD', quote]) : [];
  if (!FIAT.has(base) || !FIAT.has(quote)) return [];
  return base === quote ? [base] : [base, quote];
}

export const NEWS_HORIZON_MS = 3 * 60 * 60 * 1000;
export const NEWS_GRACE_MS = 15 * 60 * 1000;

/**
 * أقرب حدث عالي التأثير لعملات الزوج ضمن [الآن − 15د، الآن + 3س]؛ null إن لا يوجد.
 *
 * «أقرب» = أصغر بُعدٍ عن اللحظة **بالاتجاهين** (`distance` أدناه)، والتعادل للقادم. كان الاختيار بأصغر
 * `deltaMs` بإشارتها، فالحدث الذي مضى أقدم يغلب دائماً: خبرٌ يوروبي صدر قبل 14 دقيقة كان يحجب
 * «الرواتب الأمريكية بعد دقيقتين» عن متداول EURUSD — فيقرأ «الآن» عن خبر انتهى، ولا يعرف أن
 * القفزة الحقيقية لم تقع بعد. وبين حدثين مضيا كان يُعرض الأقدم لا الأحدث.
 *
 * والحدث الذي **مضى** يُحسب أبعد بمهلة الـ15 دقيقة (`distance`): بالبُعد المجرّد كان «المركزي الأوروبي قبل 5د»
 * يحجب «الرواتب الأمريكية بعد 6د» عن EURUSD — السطر «الآن · ECB» فيظنّ المتداول أن القفزة وقعت ويدخل قبل
 * الرواتب بدقائق. الآن كل قادمٍ خلال 15د يغلب كل ماضٍ (هو القرار القابل للفعل: لا تدخل الآن)، وما صدر للتوّ
 * يبقى غالباً لقادمٍ بعيد (قبل 1د ⇒ 16د، يغلب «بعد ساعتين»)، وبين ماضيَين الأحدث كما كان.
 */
/** البُعد للمقارنة فقط: القادم بدقائقه، والماضي بدقائقه + مهلة ما بعد الصدور — راجع `nextHighImpact`. */
const distance = (deltaMs: number, graceMs: number) => (deltaMs < 0 ? -deltaMs + graceMs : deltaMs);

export function nextHighImpact(
  events: readonly NewsEvent[],
  currencies: readonly string[],
  nowMs: number,
  horizonMs: number = NEWS_HORIZON_MS,
  graceMs: number = NEWS_GRACE_MS
): { event: NewsEvent; deltaMs: number } | null {
  if (!currencies.length) return null;
  const want = new Set(currencies);
  let best: { event: NewsEvent; deltaMs: number } | null = null;
  for (const e of events) {
    if (e.sample) continue;
    if (String(e.impact).toLowerCase() !== 'high') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) continue;
    if (!want.has(String(e.currency).toUpperCase())) continue;
    const delta = e.ts * 1000 - nowMs;
    if (delta < -graceMs || delta > horizonMs) continue;
    const dist = distance(delta, graceMs);
    const bestDist = best ? distance(best.deltaMs, graceMs) : Infinity;
    if (dist < bestDist || (best && dist === bestDist && delta > best.deltaMs)) best = { event: e, deltaMs: delta };
  }
  return best;
}

/** مدّة «يوم العطلة» من وقت حدثها: ForexFactory يضع العطلة «طوال اليوم» عند منتصف ليل يومها. */
export const HOLIDAY_SPAN_MS = 24 * 60 * 60 * 1000;

/**
 * **عطلة بنوك اليوم** لعملات الزوج — للشريط حين لا خبر قوي. الخادم كان يسمّي عطلة ForexFactory «منخفض التأثير» (QA30) وصار
 * يرسلها `impact: "holiday"` (backend-r3): عطلة طوكيو أو عيد الشكر الأمريكي ليست خبراً ضعيفاً بل سيولة رقيقة — سبريد أوسع،
 * وقف ينزلق، فجوات — وهي لحظة يدخل فيها المتداول مطمئناً لأن «لا أخبار اليوم».
 *
 * ما يُعدّ: `impact` = `holiday`، لا أمثلة، وقت دقيق، عملة من عملات الزوج، و`ts ≤ الآن < ts + 24س`. العملات بترتيب الزوج
 * بلا تكرار، والعنوان الأول لكل عملة (عطلتان باليوم نفسه لعملة = سطرٌ واحد). `null` = لا عطلة اليوم.
 */
export function bankHolidayToday(
  events: readonly NewsEvent[],
  currencies: readonly string[],
  nowMs: number
): { currencies: string[]; titles: string[] } | null {
  const byCcy = new Map<string, string>();
  for (const e of events) {
    if (!e || e.sample) continue;
    if (String(e.impact).toLowerCase() !== 'holiday') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) continue;
    const c = String(e.currency).toUpperCase();
    if (!currencies.includes(c) || byCcy.has(c)) continue;
    const start = e.ts * 1000;
    if (nowMs < start || nowMs >= start + HOLIDAY_SPAN_MS) continue;
    byCcy.set(c, String(e.title ?? '').trim());
  }
  const ccys = currencies.filter((c) => byCcy.has(c));
  if (!ccys.length) return null;
  return { currencies: ccys, titles: ccys.map((c) => byCcy.get(c) as string).filter(Boolean) };
}

/**
 * **خبرٌ قوي قريب على صفقاتٍ مفتوحة** — لسطر فوق قائمة الدفتر. شريط الأخبار كان للرمز الذي يُكتب بالنموذج وحده: متداولٌ
 * يحمل شراء EURUSD وGBPUSD مفتوحتين ولا يكتب صفقة جديدة لا يرى أن الرواتب الأمريكية بعد 20 دقيقة — وهي لحظة نقل الوقف أو
 * تخفيف الحجم أو الإغلاق، لا لحظة الدخول.
 *
 * عملات كل الرموز معاً (`symbolCurrencies`)، وأقرب حدثٍ بها بقاعدة الشريط نفسها (`nextHighImpact`)، ثم **الرموز التي يمسّها**:
 * التي بين عملاتها عملة الحدث أو عملة خبرٍ قويّ آخر بالدقيقة نفسها (`sameMinuteCurrencyLabel`) — لا كل المفتوحة (USDJPY لا
 * تُذكر تحت خبر يورو). الرموز كما كُتبت (مقصوصة)، بلا تكرار بلا اعتبار لحالة الأحرف، بترتيبها. `null` = لا حدث.
 *
 * `shownSymbol` = رمز شريطٍ آخر ظاهر بالشاشة نفسها (نموذج الدفتر، أو الشارت بجانب الرصيف/اللوح): إن كان شريطه يعلن **اللحظة
 * نفسها** (حدثه بالدقيقة نفسها) وعملاته تشمل كل عملة تحرّك المفتوحة ⇒ `null` — لا تحذيران متطابقان، ولا يُعلَن الخبر مرّتين
 * لقارئ الشاشة (كلاهما `alert`). خبرٌ آخر، أو عملة تحرّك المفتوحة لا يذكرها ذلك الشريط (GDP إسترليني مع الرواتب ⇒ EURGBP) ⇒ يبقى.
 */
export function openPositionsNewsRisk(
  symbols: readonly string[],
  events: readonly NewsEvent[],
  nowMs: number,
  shownSymbol?: string
): { event: NewsEvent; deltaMs: number; currencies: string[]; symbols: string[] } | null {
  const seen = new Set<string>();
  const uniq: { sym: string; ccys: string[] }[] = [];
  for (const raw of symbols) {
    const sym = String(raw ?? '').trim();
    const key = sym.toUpperCase();
    if (!sym || seen.has(key)) continue;
    seen.add(key);
    const ccys = symbolCurrencies(sym);
    if (ccys.length) uniq.push({ sym, ccys });
  }
  const currencies = [...new Set(uniq.flatMap((u) => u.ccys))];
  const hit = nextHighImpact(events, currencies, nowMs);
  if (!hit) return null;
  const moving = new Set(sameMinuteCurrencyLabel(events, currencies, hit.event).split('/'));
  if (shownSymbol) {
    const shownCcys = symbolCurrencies(shownSymbol);
    const shown = nextHighImpact(events, shownCcys, nowMs);
    const sameMoment =
      shown != null && typeof shown.event.ts === 'number' && Math.abs(shown.event.ts - (hit.event.ts as number)) < 60;
    if (sameMoment && [...moving].every((c) => shownCcys.includes(c))) return null;
  }
  return {
    ...hit,
    currencies,
    symbols: uniq.filter((u) => u.ccys.some((c) => moving.has(c))).map((u) => u.sym),
  };
}

/**
 * أحداثٌ قوية **أخرى** لعملات الزوج بالدقيقة نفسها لحدث الشريط — «+2» بجانبه. الرواتب الأمريكية تصدر مع البطالة ومتوسط
 * الأجور بثانية واحدة (والفائدة مع البيان)، والشريط يعرض واحداً منها — فيظنّ المتداول خبراً واحداً بينما القفزة من ثلاثة.
 * نفس مرشّحات `nextHighImpact` (لا أمثلة، عالي التأثير، وقت دقيق)، ونسخةٌ مكرّرة بالتقويم (العنوان والعملة والوقت) لا تُعدّ.
 */
export function sameMinuteHighImpact(events: readonly NewsEvent[], currencies: readonly string[], event: NewsEvent): number {
  if (typeof event.ts !== 'number' || !Number.isFinite(event.ts)) return 0;
  const want = new Set(currencies);
  const key = (e: NewsEvent) => `${String(e.currency).toUpperCase()}|${e.title}|${e.ts}`;
  const seen = new Set([key(event)]);
  for (const e of events) {
    if (e === event || e.id === event.id || e.sample) continue;
    if (String(e.impact).toLowerCase() !== 'high') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts) || Math.abs(e.ts - event.ts) >= 60) continue;
    if (!want.has(String(e.currency).toUpperCase())) continue;
    seen.add(key(e));
  }
  return seen.size - 1;
}

/**
 * عملات الشريط: عملة حدثه، ثم عملات الأحداث القوية الأخرى **بالدقيقة نفسها** لعملات الزوج («USD/EUR»). كان السطر
 * «⚠ قوي · USD · بعد 30د · Non-Farm Employment Change +1» وقد يكون الـ+1 خطاب لاغارد (EUR) — فيُقرأ خبراً أمريكياً ثانياً،
 * ويغيب أن ساقَي EURUSD تتحرّكان معاً. نفس مرشّحات `sameMinuteHighImpact`، فالعدد والعملات من المجموعة نفسها.
 */
export function sameMinuteCurrencyLabel(events: readonly NewsEvent[], currencies: readonly string[], event: NewsEvent): string {
  const own = String(event.currency).toUpperCase();
  const out = [own];
  if (typeof event.ts !== 'number' || !Number.isFinite(event.ts)) return own;
  const want = new Set(currencies);
  for (const e of events) {
    if (e === event || e.id === event.id || e.sample) continue;
    if (String(e.impact).toLowerCase() !== 'high') continue;
    if (typeof e.ts !== 'number' || !Number.isFinite(e.ts) || Math.abs(e.ts - event.ts) >= 60) continue;
    const c = String(e.currency).toUpperCase();
    if (want.has(c) && !out.includes(c)) out.push(c);
  }
  return out.join('/');
}

/**
 * سطر الشريط الأول: **الموعد قبل العنوان**. السطر سطرٌ واحد (`numberOfLines={1}`)، وكان «⚠ خبر قوي · USD · Non-Farm
 * Employment Change · بعد 1س 12د» يُقصّ بنقاط عند العنوان الطويل — فيضيع الموعد، وهو ما يقرّر به المتداول الدخول. الآن
 * يُقصّ العنوان إن ضاق السطر. `more` = `sameMinuteHighImpact` («+2»؛ صفر لا يُكتب).
 */
export function newsBannerText(p: { head: string; currency: string; when: string; title: string; more: number }): string {
  const title = p.more > 0 ? `${p.title} +${p.more}` : p.title;
  return `⚠ ${p.head} · ${p.currency} · ${p.when} · ${title}`;
}

/**
 * العدّ التنازلي لسطر التحذير: «الآن» حين يكون الخبر جارياً (مضى ≤ 15د) أو باقٍ عليه دقيقة أو أقل،
 * وإلا ساعات ودقائق **مقرَّبة للأسفل**.
 *
 * كان `Math.round`: خبرٌ باقٍ عليه دقيقة و31 ثانية يُكتب «بعد 2د» — أي **أبعد** مما هو، والسطر لا
 * يتجدّد إلا كل دقيقة فيبقى الرقم مبالَغاً حتى يصدر الخبر. قبل الخبر القوي الخطأ الوحيد المقبول هو
 * جهة الحذر: «بعد 1د» لخبرٍ بعد 1:59 لا يضرّ، و«بعد 2د» لخبرٍ بعد 1:01 قد يُدخل صفقةً على القفزة.
 * و`m` صفرٌ مع ساعات لا يُكتب («بعد 2س» لا «بعد 2س 0د») — المكوّن يقرّر ذلك من `m === 0`.
 */
export function newsCountdown(deltaMs: number): { now: true } | { now: false; h: number; m: number } {
  if (!Number.isFinite(deltaMs) || (Math.abs(deltaMs) <= NEWS_GRACE_MS && deltaMs <= 60_000)) return { now: true };
  const mins = Math.max(1, Math.floor(deltaMs / 60_000));
  return { now: false, h: Math.floor(mins / 60), m: mins % 60 };
}

/**
 * بعد كم مللي ثانية يتغيّر نصّ العدّ التنازلي — ليُجدَّد الشريط **عند** تغيّره لا بساعة دقيقة من لحظة
 * التركيب.
 *
 * لماذا: التقريب للأسفل بـ`newsCountdown` وعدٌ بألّا يُكتب الخبر أبعد مما هو، لكن الشريط كان يُجدَّد كل
 * 60 ثانية **من لحظة ظهوره**: ظهر والخبر بعد 3:30 فكتب «بعد 3د»، ولم يُجدَّد إلا عند 2:30 — فبقي «بعد 3د»
 * والخبر بعد 2:50 (وكذلك «بعد 2د» والخبر بعد 1:05). المبالغة التي أُغلقت بالتقريب عادت من التوقيت.
 *
 * - عدٌّ بالدقائق: حتى ينزل `deltaMs` تحت مضاعف الدقيقة التالي (أو يبلغ الدقيقة الأخيرة فيصير «الآن»).
 * - «الآن»: لا يتغيّر النصّ حتى يخرج الخبر من مهلة الـ15د فيختفي الشريط — حتى تلك اللحظة.
 * - بلا خبر (`null`): دقيقة (خبرٌ يدخل الأفق يظهر خلالها كما كان).
 *
 * محصورة بين 250ms ودقيقة: لا حلقة ضيّقة عند الحدّ، ولا أطول من الساعة القديمة أبداً.
 */
export function newsTickDelayMs(deltaMs: number | null): number {
  const MAX = 60_000;
  const MIN = 250;
  if (deltaMs == null || !Number.isFinite(deltaMs)) return MAX;
  let wait: number;
  if (newsCountdown(deltaMs).now) {
    wait = deltaMs + NEWS_GRACE_MS + 1;
  } else {
    const k = Math.max(1, Math.floor(deltaMs / 60_000));
    // k = 1: «الآن» تبدأ عند 60,000 بالضبط؛ وما فوقها يتغيّر حين ينزل تحت k دقيقة
    wait = k === 1 ? deltaMs - 60_000 : deltaMs - k * 60_000 + 1;
  }
  return Math.min(MAX, Math.max(MIN, wait));
}

/** أقدم تقويم محفوظ يُستعمل بعد فشل التحديث: التقويم أسبوعي، لكن بعد يوم قد تُضاف أحداث أو تُعدَّل أوقاتها. */
export const NEWS_STALE_MAX_MS = 24 * 60 * 60 * 1000;

export type CalendarCache = {
  events: NewsEvent[];
  /** وقت آخر محاولة جلب (نجحت أو فشلت) — منه تُحسب مهلة إعادة المحاولة. */
  at: number;
  ok: boolean;
  /** وقت آخر جلب **ناجح** للأحداث المحفوظة؛ null = لم ينجح أي جلب بعد. */
  fetchedAt: number | null;
};

/**
 * المخزن بعد محاولة جلب التقويم. `events` = نتيجة ناجحة، و`null` = فشل.
 *
 * كان الفشل يستبدل المخزن بـ`[]`: تحديثٌ واحد تعثّر بعد عشر دقائق (شبكة الهاتف، الخادم يعيد التشغيل)
 * **يمحو** تحذير «الرواتب الأمريكية بعد 40د» الذي كان على الشاشة، فيختفي الشريط قبل الخبر بالضبط —
 * والمتداول يقرأ الغياب «لا خبر». أوقات الأحداث مطلقة (`ts`) فالتقويم المحفوظ يبقى صادقاً عن
 * الساعات القادمة؛ يُحتفظ به بعد الفشل (بعلَم `ok: false` لسطر «بيانات محفوظة») ما دام أحدث من
 * `NEWS_STALE_MAX_MS`، وبعدها يُسقط بدل عرض تقويمٍ قد تغيّر.
 */
export function calendarAfterFetch(
  prev: CalendarCache | null,
  events: readonly NewsEvent[] | null,
  nowMs: number
): CalendarCache {
  if (events) return { events: [...events], at: nowMs, ok: true, fetchedAt: nowMs };
  const keep = prev && prev.fetchedAt != null && nowMs - prev.fetchedAt <= NEWS_STALE_MAX_MS;
  return keep
    ? { events: prev.events, at: nowMs, ok: false, fetchedAt: prev.fetchedAt }
    : { events: [], at: nowMs, ok: false, fetchedAt: null };
}

/**
 * ردّ خادم التقويم كما يُمرَّر إلى `calendarAfterFetch`: الأحداث إن كان تقويماً حقيقياً، و`null` (فشل) إن
 * لم يكن.
 *
 * لماذا: حين يتعذّر على الخادم جلب التقويم من مصدره يجيب **HTTP 200** بأحداث المثال (`sample: true`،
 * بلا `ts`) لا بخطأ — فكان التطبيق يعدّها نجاحاً يستبدل التقويم المحفوظ، و`nextHighImpact` يتخطّى الأمثلة
 * بحقّ، فيختفي تحذير «الرواتب الأمريكية بعد 40د» بلا سطر «بيانات محفوظة» (العلَم `ok: true`). وهي بالضبط
 * الثغرة التي أُغلقت لفشل الشبكة. ردٌّ كلّه أمثلة، أو بلا مصفوفة أحداث، = فشل. مصفوفة فارغة تبقى نجاحاً
 * (أسبوع بلا خبر قوي بعد الفلتر حقيقةٌ لا عطل).
 */
export function calendarFetchEvents(raw: unknown): NewsEvent[] | null {
  /**
   * الخادم صار يقول الفشل صراحةً: `{ events: [], status: "unavailable" }` بدل أحداث المثال. المصفوفة
   * الفارغة وحدها كانت تُقرأ «أسبوع بلا خبر قوي» فيُمحى التقويم المحفوظ ويختفي التحذير — `status` يسبق كل شيء.
   */
  if (raw && typeof raw === 'object' && (raw as { status?: unknown }).status === 'unavailable') return null;
  const events = raw && typeof raw === 'object' ? (raw as { events?: unknown }).events : undefined;
  if (!Array.isArray(events)) return null;
  const list = events as NewsEvent[];
  if (list.length > 0 && list.every((e) => e && e.sample)) return null;
  const real = list.filter((e) => e && !e.sample);
  /**
   * **والتقويم بلا وقتٍ لأيّ حدث** فشلٌ كذلك: حين يتعذّر مصدر JSON يرجع الخادم إلى XML الأسبوعي
   * (`econ_calendar.py` — أحداث حقيقية لكن `ts: null` و`tz_unknown`، إذ لا منطقة زمنية للتوقيت). كانت تُعدّ
   * نجاحاً يستبدل المحفوظ و`nextHighImpact` يتخطّاها كلها بحقّ — فيختفي «الرواتب الأمريكية بعد 40د» بلا
   * سطر «بيانات محفوظة»، الثغرة نفسها من بابٍ آخر. للتحذير تقويمٌ بلا أوقات = لا تقويم. خليطٌ فيه حدثٌ موقوت
   * واحد يبقى نجاحاً (أحداث «طوال اليوم»/«مؤجّل» بلا وقت بجانب المواعيد عاديةٌ بالمصدر).
   */
  if (real.length > 0 && !real.some((e) => typeof e.ts === 'number' && Number.isFinite(e.ts))) return null;
  return real;
}

/**
 * هل يقول الشريط «تعذّر تحميل التقويم» لهذا الرمز؟
 *
 * كان فشل التقويم بلا بيانات محفوظة (أول فتح بلا شبكة، أو محفوظٌ أقدم من `NEWS_STALE_MAX_MS`) **لا يُظهر شيئاً** —
 * الصورة نفسها تماماً لـ«لا خبر قوي خلال 3 ساعات»، فيدخل المتداول قبل الرواتب الأمريكية مطمئناً. true فقط حين:
 * آخر جلب فشل، ولا تقويم محفوظ يُستعمل (`fetchedAt == null`)، وللرمز عملات يغطّيها التقويم (رمزٌ لا يحذّر
 * عنه الشريط أبداً لا يُقال له إن التحذير تعطّل). قبل أول ردّ (`cache == null`) لا شيء — تحميلٌ لا فشل.
 * فشلٌ مع محفوظ صالح يبقى على سطر «بيانات محفوظة» فوق التحذير كما كان.
 */
export function calendarUnavailable(cache: CalendarCache | null, symbol: string): boolean {
  if (!cache || cache.ok || cache.fetchedAt != null) return false;
  return symbolCurrencies(symbol).length > 0;
}

/**
 * شريط الصفقات المفتوحة والتقويم متعطّل: كان يُخفى دائماً (`openSymbols` ⇒ null) على افتراض أن شريط النموذج يقولها —
 * لكن شريط النموذج يغيب أثناء تعديل صفقة، أو يخصّ رمزاً بلا عملات (AAPL)، فتبدو الصفقات المفتوحة بلا خبر.
 * true حين يُغطّى رمزٌ مفتوح واحد على الأقل ولا شريط آخر ظاهر (`shownSymbol`) يقول الرسالة نفسها.
 */
export function openCalendarUnavailable(
  cache: CalendarCache | null,
  openSymbols: readonly string[],
  shownSymbol?: string
): boolean {
  if (shownSymbol && calendarUnavailable(cache, shownSymbol)) return false;
  return openSymbols.some((s) => calendarUnavailable(cache, s));
}
