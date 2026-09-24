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
import { instrumentSpec, pnlInQuoteCcy } from './positionSize';

export type TradeSide = 'buy' | 'sell';

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
  const pip = instrumentSpec(input.symbol)?.pipSize ?? null;
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
 * "1:2.0" — منزلة عشرية واحدة تكفي للقرار، ونقرّب لا نقصّ من 1 فما فوق.
 *
 * **تحت 1 نقصّ**: 0.96 كانت تُطبع «1:1.0» وتحتها «⚠ الربح أقل من المخاطرة» — رقمٌ يقول تعادلاً وتحذيرٌ
 * يقول خسارة. والصغيرة جداً (R:R بعد التكاليف حين تكاد تبتلع الهدف) كانت «1:0.0» كأن لا ربح أصلاً:
 * تحت 0.1 منزلتان («1:0.04»)، وتحت 0.01 «1:<0.01».
 */
export function formatRR(rr: number | null): string {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return '—';
  if (rr >= 1) return `1:${(Math.round(rr * 10) / 10).toFixed(1)}`;
  // هامش الفاصلة العائمة (0.3 × 10 = 2.999…) لا يرفع ما دون 1 إلى «1:1.0»
  const tenths = Math.min(0.9, Math.floor(rr * 10 + 1e-9) / 10);
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
 * النتيجة بوحدات المخاطرة (R): +2 = ربحت ضعف ما خاطرت به، −1 = ضُرب الوقف كاملاً.
 * يحتاج وقفاً صالحاً بالجهة الصحيحة؛ وإلا null. تقريب لمنزلة عشرية واحدة.
 */
export function realizedR(input: {
  side: TradeSide;
  entry: number;
  sl?: number | null;
  exit?: number | null;
}): number | null {
  const { side, entry, sl, exit } = input;
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(exit)) return null;
  const buy = side === 'buy';
  const risk = buy ? entry - sl : sl - entry;
  if (risk <= 0) return null;
  const move = buy ? exit - entry : entry - exit;
  return roundR(move / risk);
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
  const pip = instrumentSpec(input.symbol)?.pipSize ?? null;
  // تقريب متماثل (`roundAway`) لا `Math.round`: هذا يرفع النصف نحو +∞ فتُكتب الخسارة أصغر من الربح
  // المماثل — ذهب 2000 → 1997.5 كان «−0.12%» ومقابله 2000 → 2002.5 «+0.13%»، ونصف pipette خاسر
  // (1.08500 → 1.084995) كان «−0» pip بينما الرابح المماثل «+0.1». وإحصاءات الدفتر تجمع هذه الأرقام.
  return {
    pips: pip ? roundAway(move / pip, 1) : null,
    pct: roundAway((move / entry) * 100, 2),
  };
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
}): { pips: number | null; pct: number; r: number | null } | null {
  const { symbol, side, entry, sl, current } = input;
  const mv = realizedMove({ symbol, side, entry, exit: current });
  if (!mv) return null;
  return { ...mv, r: realizedR({ side, entry, sl, exit: current }) };
}

/** نسب الهدف السريعة بالحاسبة والدفتر: ما يخطّط عليه متداول التجزئة فعلاً (1:1 تعادل، 1:2 القاعدة الشائعة). */
export const QUICK_RR = [1, 1.5, 2, 3] as const;

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
  const spec = instrumentSpec(input.symbol);
  if (!spec) return Number(raw.toPrecision(10));
  const decimals = Math.round(-Math.log10(spec.pipSize)) + 1;
  const scale = 10 ** decimals;
  const scaled = Math.round(raw * scale * 1e6) / 1e6;
  const away = buy ? Math.ceil(scaled) : Math.floor(scaled);
  const out = Number((away / scale).toFixed(decimals));
  return out > 0 ? out : null;
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
 */
export function journalSymbol(raw: string): string | null {
  const up = raw.trim().toUpperCase();
  const spec = instrumentSpec(up);
  const pair = /^([A-Z]{3})[\s/_-]*([A-Z]{3})(.*)$/.exec(up);
  if (spec && pair && pair[1] + pair[2] === spec.symbol) return spec.symbol + pair[3];
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
  return quoteSymbol(up) ?? up;
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
        ? pnlInQuoteCcy({ symbol: tr.symbol, side, entry: tr.entry, exit: tr.exit, lots })
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
