/**
 * نصّ أداة القياس على الشارت — **بالنقاط (pip) أولاً**.
 *
 * ما كان يُعرض: `12 شموع · +0.00240 (0.22%)`. وفيه عطلان:
 *
 * 1) **لا نقاط إطلاقاً.** متداول الفوركس يقيس المسافة بالـpip لا بفرق السعر الخام: وقفه
 *    وهدفه وحجم لوته كلّها بالنقاط (حاسبة حجم المركز تطلبها بالنقاط، ودفتر الصفقات
 *    يجمعها نقاطاً). فكان يقرأ «0.00240» من الشارت ثم يحوّلها بيده ليكتبها بالحاسبة.
 * 2) **الفرق كان يُصاغ بلا رمز**: `formatPrice(diff)` بلا `symbol` تُقدّر المنازل من
 *    **حجم الرقم** — وهو تقدير مصمَّم لأسعار لا لفروق. فرقُ 0.5 على زوج ين كان يخرج
 *    «0.50000» (والين ثلاث منازل)، وفرقُ 12.5 على الذهب «12.500» (والذهب منزلتان).
 *    الرقم الأصغر من 10 يأخذ خمس منازل مهما كانت الأداة، والفرق دائماً رقم صغير.
 *
 * حجم الـpip من `chartPipSpec` (`instrumentSpec` + رموز Exness Cent) (الين 0.01، الذهب 0.1، الفضة 0.01، والبقية 0.0001)،
 * والمسافة من `pipsBetween` — نفس الدالّة المبرهَنة التي تبني عليها الحاسبة والتنبيهات،
 * فالرقم الذي يقرؤه المتداول من الشارت هو الرقم الذي يكتبه بالحاسبة بالبناء لا بالمصادفة.
 * والإشارة من `b − a` لأن `pipsBetween` كمّية بلا اتجاه (والاتجاه هو نصف ما يقيسه).
 *
 * الوحدة لاتينية بالثلاث اللغات: «pip» بالعربية والكردية و«pips» بالإنجليزية (`pipUnit`) —
 * كنصوص `i18n/locales.ts` (ملك وكيل آخر) فلا مفتاح ترجمة جديداً.
 *
 * أداة خارج مواصفات الفوركس (DXY، مؤشر، عقد CFD) ⇒ `chartPipSpec` تعيد
 * `null`، فيبقى فرق السعر مكان النقاط — لكن مصاغاً بالرمز لا بحجم الرقم.
 */
import { formatPriceDiff } from './indicators/utils';
import { formatPct } from './dailyChange';
import { pipsBetween } from '../positionSize';
import { chartPipSpec } from './pipSpec';
import { projectBarTimeSec } from './marketHours';

export type MeasureStats = { bars: number; diff: number; pct: number };

/**
 * وحدة النقاط بلغة الواجهة: الإنجليزية «pips» بعد الرقم (كما يقولها المتداول، وكما صارت نصوص
 * `locales.ts` الإنجليزية: «Net: {pips} pips»)، والعربية والكردية «pip» كنصوصهما. كان الشارت يطبع
 * «+35.0 pip» بالإنجليزية بجوار «Net: 35.0 pips» بالدفتر (QA15). `lang` غائب ⇒ «pip» (السابق).
 */
export function pipUnit(lang?: string): string {
  return lang === 'en' ? 'pips' : 'pip';
}

/** «+24.0 pip» أو `null` لأداة بلا مواصفة pip معروفة. */
/**
 * عدد النقاط بمنزلة عشرية واحدة — إلا من 1000 فصاعداً: عُشر النقطة على مسافة 2000 pip
 * ضجيج، و«−20000.0 pip» (ذهب عند 4000 بشارت أسبوعي، أو تقاطع ين بعيد) 12 حرفاً لا يتّسعها
 * وسم محور السعر (68px) فيُقصّ بنقاط حذف.
 */
export function pipsNumber(pips: number): string {
  return Math.abs(pips) >= 1000 ? pips.toFixed(0) : pips.toFixed(1);
}

export function measurePipsText(symbol: string, a: number, b: number, lang?: string): string | null {
  const spec = chartPipSpec(symbol);
  if (!spec) return null;
  const pips = pipsBetween(spec, a, b);
  if (pips == null) return null;
  // الإشارة من الاتجاه لا من `pips` (كمّية دائماً). الصفر بلا إشارة: «0.0 pip» قياسٌ
  // صادق (طرفان على السعر نفسه) و«+0.0» توحي باتجاه لا وجود له.
  const sign = pips === 0 ? '' : b - a > 0 ? '+' : '−';
  return `${sign}${pipsNumber(pips)} ${pipUnit(lang)}`;
}

/**
 * مدى الشمعة (أعلى − أدنى) بالنقاط لسطر التقاطع: «↕ 16.2 pip». متداول الفوركس يقيس الشمعة
 * بالنقاط لا بالنسبة (شمعة خبر 40 pip مقابل شمعة آسيا 6 pip) — والنسبة وحدها كانت بالسطر.
 * `null` لأداة بلا مواصفة pip (DXY، مؤشرات) فلا يُكتب شيء بدل رقم بوحدة خاطئة.
 */
export function candleRangePipsText(symbol: string, high: number, low: number, lang?: string): string | null {
  if (!Number.isFinite(high) || !Number.isFinite(low) || high < low) return null;
  const spec = chartPipSpec(symbol);
  if (!spec) return null;
  const pips = pipsBetween(spec, low, high);
  if (pips == null) return null;
  return `↕ ${pipsNumber(pips)} ${pipUnit(lang)}`;
}

/**
 * مرجع تغيّر الشمعة بسطر التقاطع: **إغلاق الشمعة السابقة** كما TradingView (سطر OHLC هناك يقيس
 * «C − إغلاق السابقة»). كان السطر يقيس الجسم (فتح→إغلاق) فيُخفي فجوة الافتتاح: شمعة الإثنين تفتح
 * 40 pip فوق إغلاق الجمعة ثم تنزل 5 كانت «−0.05%» حمراء والأسبوع يبدأ صاعداً. وشمعة الخبر
 * تُقرأ «كم تحرّك السعر من الشمعة الماضية» لا «كم من افتتاحها».
 * بلا سابقة صالحة (أول شمعة بالتاريخ) ⇒ الافتتاح، أي السلوك القديم.
 */
export function barChangeRef(
  bar: { open: number },
  prev: { close: number } | null | undefined
): number | null {
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (prev && ok(prev.close)) return prev.close;
  return ok(bar.open) ? bar.open : null;
}

/**
 * «عدد + كلمة الشموع» بصيغة العدد الصحيحة. كان `{n} {mcMeasureBarsWord}` بصيغة واحدة:
 * «1 شموع» و«2 شموع» و«15 شموع» بالعربية، و«1 bars» بالإنجليزية — وقياس شمعة واحدة
 * أو اثنتين هو أكثر قياس يُجرى (طول ذيل، فجوة افتتاح).
 *
 * العربية: 1 شمعة، 2 شمعتان، 3–10 (وما ينتهي بها بعد المئة) بالجمع المترجَم نفسه،
 * والبقية بالمفرد «11 شمعة». الإنجليزية: «1 bar». الكردية: الاسم بعد العدد مفرد
 * أصلاً («12 مۆم»)، فالكلمة المترجَمة كما هي. `lang` غائب ⇒ الكلمة كما هي (السلوك السابق).
 * صيغ المفرد والمثنّى هنا لا بـ`i18n/locales.ts` لأنه ملك وكيل آخر (راجع «طلب تنسيق»
 * بـdocs/LOG-CHART.md).
 */
export function barsCountText(
  n: number,
  word: string,
  lang?: string,
  /** صيغتا المفرد والمثنّى من القاموس (`tr.mcMeasureBarOne/Two`)؛ غائبتان ⇒ الثابتتان هنا. */
  forms?: { one: string; two: string }
): string {
  if (lang === 'ar') {
    const one = forms?.one ?? 'شمعة';
    const tail = n % 100;
    if (n === 1) return `1 ${one}`;
    if (n === 2) return `2 ${forms?.two ?? 'شمعتان'}`;
    if (n === 0 || (tail >= 3 && tail <= 10)) return `${n} ${word}`;
    return `${n} ${one}`;
  }
  if (lang === 'en' && n === 1) return `1 ${forms?.one ?? 'bar'}`;
  return `${n} ${word}`;
}

/**
 * زمن القياس بين طرفيه (ثوانٍ) من زمنَيهما المختومين — الزمن الحقيقي حتى على Renko
 * (`srcTime`، راجع `drawingAnchors.ts`)، وطرف بالمستقبل بـ`ahead` شموعاً بعد زمنه. زمن تقويمي
 * كما بـTradingView: حركة من الجمعة للاثنين تُقرأ «3d». طرف بلا زمن ⇒ `null` (لا سطر زمن).
 */
export function measureDurationSec(
  a: { time?: number; ahead?: number; aheadStep?: number },
  b: { time?: number; ahead?: number; aheadStep?: number },
  stepSec: number,
  /** الرمز ⇒ طرف المستقبل يتخطّى عطلة نهاية الأسبوع كوسم التقاطع (`projectBarTimeSec`). */
  symbol?: string
): number | null {
  const at = (p: typeof a) => {
    if (p.time == null || !Number.isFinite(p.time)) return null;
    const ahead = p.ahead != null && Number.isFinite(p.ahead) ? p.ahead : 0;
    const step = p.aheadStep != null && p.aheadStep > 0 ? p.aheadStep : stepSec;
    return symbol && ahead > 0 ? projectBarTimeSec(symbol, p.time, step, ahead) : p.time + ahead * step;
  };
  const ta = at(a);
  const tb = at(b);
  return ta == null || tb == null ? null : Math.abs(tb - ta);
}

/**
 * «2d 4h» / «3h 15m» / «45m» — وحدتان على الأكثر (كقياس TradingView). بالعربية حروف أسماء
 * الفريمات بالتطبيق نفسها («5 د»، «4 س»، `timeframes.ts`) و«يوم» كاملة (لا حرف لها هناك).
 * صفر (طرفان على شمعة واحدة) ⇒ `null`: «0m» ضجيج.
 */
export function measureDurationText(
  sec: number | null,
  lang?: string,
  /** وحدات القاموس (`tr.mcMeasureDurUnits`) — الكردية لها وحداتها؛ غائبة ⇒ الثابتة هنا. */
  units?: { m: string; h: string; d: string }
): string | null {
  if (sec == null || !Number.isFinite(sec) || sec < 60) return null;
  const u = units ?? (lang === 'ar' ? { m: ' د', h: ' س', d: ' يوم' } : { m: 'm', h: 'h', d: 'd' });
  const mins = Math.round(sec / 60);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h > 0 ? `${d}${u.d} ${h}${u.h}` : `${d}${u.d}`;
  if (h > 0) return m > 0 ? `${h}${u.h} ${m}${u.m}` : `${h}${u.h}`;
  return `${m}${u.m}`;
}

/**
 * سطر القياس كاملاً: `12 شمعة · 2d 4h · +24.0 pip · +0.22%` (الزمن حين يُعرف).
 *
 * النسبة تبقى (تُقارن الحركة بين أدوات مختلفة الأسعار) وتُصاغ بإشارتها هي —
 * كانت بلا إشارة فيُقرأ هبوطٌ بنسبة صعود.
 */
export function measureReadoutText(input: {
  symbol: string;
  a: { price: number };
  b: { price: number };
  stats: MeasureStats;
  /** كلمة «شموع» المترجَمة (`tr.mcMeasureBarsWord`). */
  barsWord: string;
  /** لغة الواجهة لصيغة العدد (`barsCountText`). */
  lang?: string;
  /** زمن القياس (`measureDurationSec`)؛ غائب ⇒ لا خانة زمن. */
  durationSec?: number | null;
  /** وحدات الزمن من القاموس (`measureDurationText`). */
  durationUnits?: { m: string; h: string; d: string };
  /** صيغتا المفرد والمثنّى من القاموس (`barsCountText`). */
  barForms?: { one: string; two: string };
  /** مرجع منازل السعر لأداة بلا منازل معروفة (سعرها الجاري، كمحور الشارت)؛ غائب ⇒ الطرف الأول. */
  priceRef?: number | null;
}): string {
  const { symbol, a, b, stats, barsWord, lang } = input;
  const dur = measureDurationText(input.durationSec ?? null, lang, input.durationUnits);
  const pips = measurePipsText(symbol, a.price, b.price, lang);
  // الإشارة من الرقم **المطبوع** لا الخام (قاعدة `formatPct` برأس الإطار والتقاطع): قياس
  // 0.4 pip على اليورو نسبته 0.004% فكان يُكتب «+0.4 pip · +0.00%»، وقياس أفقيّ على DXY
  // «+0.00000 · +0.00%» — صفرٌ بإشارة يوحي باتجاه لا وجود له. الصفر المطبوع بلا إشارة.
  // منازل الفرق = منازل **السعر** لا حجم الفرق: لأداة بلا منازل معروفة (مؤشّر، عملة رقمية)
  // كان `formatPrice(diff)` يقدّرها من الفرق نفسه — والفرق رقم صغير دائماً — فقياس 5 دولارات
  // على BTCUSD يُكتب «+5.00000» بخمس منازل لا يحملها سعره (67420.00).
  const diffText = formatPriceDiff(stats.diff, a.price, symbol, input.priceRef);
  const diffSign = Number(diffText) === 0 ? '' : stats.diff > 0 ? '+' : '−';
  const amount = pips ?? `${diffSign}${diffText}`;
  const pctText = formatPct(Number.isFinite(stats.pct) ? stats.pct : 0);
  const bars = barsCountText(stats.bars, barsWord, lang, input.barForms);
  return dur ? `${bars} · ${dur} · ${amount} · ${pctText}` : `${bars} · ${amount} · ${pctText}`;
}
