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
 * حجم الـpip من `instrumentSpec` (الين 0.01، الذهب 0.1، الفضة 0.01، والبقية 0.0001)،
 * والمسافة من `pipsBetween` — نفس الدالّة المبرهَنة التي تبني عليها الحاسبة والتنبيهات،
 * فالرقم الذي يقرؤه المتداول من الشارت هو الرقم الذي يكتبه بالحاسبة بالبناء لا بالمصادفة.
 * والإشارة من `b − a` لأن `pipsBetween` كمّية بلا اتجاه (والاتجاه هو نصف ما يقيسه).
 *
 * `pip` تُكتب لاتينيةً بالثلاث اللغات — هكذا هي بكل نصوص التطبيق القائمة («{pips} pip»
 * بدفتر الصفقات والحاسبة ولوح الباك-تست، بالعربية والإنجليزية والكردية) — فلا مفتاح
 * ترجمة جديداً ولا مساس بـ`i18n/locales.ts` (ملك وكيل آخر).
 *
 * أداة خارج مواصفات الفوركس (DXY، مؤشر، رمز وسيط بلاحقة) ⇒ `instrumentSpec` تعيد
 * `null`، فيبقى فرق السعر مكان النقاط — لكن مصاغاً بالرمز لا بحجم الرقم.
 */
import { formatPrice } from './indicators/utils';
import { formatPct } from './dailyChange';
import { instrumentSpec, pipsBetween } from '../positionSize';

export type MeasureStats = { bars: number; diff: number; pct: number };

/** «+24.0 pip» أو `null` لأداة بلا مواصفة pip معروفة. */
export function measurePipsText(symbol: string, a: number, b: number): string | null {
  const spec = instrumentSpec(symbol);
  if (!spec) return null;
  const pips = pipsBetween(spec, a, b);
  if (pips == null) return null;
  // الإشارة من الاتجاه لا من `pips` (كمّية دائماً). الصفر بلا إشارة: «0.0 pip» قياسٌ
  // صادق (طرفان على السعر نفسه) و«+0.0» توحي باتجاه لا وجود له.
  const sign = pips === 0 ? '' : b - a > 0 ? '+' : '−';
  return `${sign}${pips.toFixed(1)} pip`;
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
export function barsCountText(n: number, word: string, lang?: string): string {
  if (lang === 'ar') {
    const tail = n % 100;
    if (n === 1) return '1 شمعة';
    if (n === 2) return '2 شمعتان';
    if (n === 0 || (tail >= 3 && tail <= 10)) return `${n} ${word}`;
    return `${n} شمعة`;
  }
  if (lang === 'en' && n === 1) return '1 bar';
  return `${n} ${word}`;
}

/**
 * سطر القياس كاملاً: `12 شمعة · +24.0 pip · +0.22%`.
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
}): string {
  const { symbol, a, b, stats, barsWord, lang } = input;
  const pips = measurePipsText(symbol, a.price, b.price);
  // الإشارة من الرقم **المطبوع** لا الخام (قاعدة `formatPct` برأس الإطار والتقاطع): قياس
  // 0.4 pip على اليورو نسبته 0.004% فكان يُكتب «+0.4 pip · +0.00%»، وقياس أفقيّ على DXY
  // «+0.00000 · +0.00%» — صفرٌ بإشارة يوحي باتجاه لا وجود له. الصفر المطبوع بلا إشارة.
  const diffText = formatPrice(Math.abs(stats.diff), symbol);
  const diffSign = Number(diffText) === 0 ? '' : stats.diff > 0 ? '+' : '−';
  const amount = pips ?? `${diffSign}${diffText}`;
  const pctText = formatPct(Number.isFinite(stats.pct) ? stats.pct : 0);
  return `${barsCountText(stats.bars, barsWord, lang)} · ${amount} · ${pctText}`;
}
