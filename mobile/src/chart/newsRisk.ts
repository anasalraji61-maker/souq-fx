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

import { instrumentSpec } from '../positionSize';

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
const CRYPTO = /^(BTC|ETH|LTC|XRP|SOL|BCH|BNB|ADA|DOT|DOGE|AVAX|LINK|XLM|TRX)(USDT|USDC|[A-Z]{3})$/;

export function symbolCurrencies(symbol: string): string[] {
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
   */
  const glued = /^[A-Z0-9]{3,}M$/.test(bare) ? bare.slice(0, -1) : null;
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
  const s =
    instrumentSpec(symbol)?.symbol ??
    (letters.length === 6 ? letters : /^[A-Z]{6}$/.test(bare) ? bare : letters);
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
  const events = raw && typeof raw === 'object' ? (raw as { events?: unknown }).events : undefined;
  if (!Array.isArray(events)) return null;
  const list = events as NewsEvent[];
  if (list.length > 0 && list.every((e) => e && e.sample)) return null;
  return list.filter((e) => e && !e.sample);
}
