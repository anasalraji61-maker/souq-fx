/** مؤشرات الزخم والمذبذبات (Momentum / Oscillators family). */
import type { Candle } from '../../api';
import { dema, ema, hma, sma, tema, wma } from './moving-averages';
import { computeFractals, computeLsma, computeTsf } from './trend';
import { computeAtr, computeDonchianWidth } from './volatility';
import { computeAccumDist, computeChaikinOsc } from './volume';
import { computeMedianPrice, computeTwap, computeTypicalPrice } from './price-transform';


export function computeRsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function computeMacd(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine: (number | null)[] = closes.map((_, i) =>
    ema12[i] != null && ema26[i] != null ? ema12[i]! - ema26[i]! : null
  );
  const signal = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null));
  return { macdLine, signal, hist };
}

export function computeStoch(candles: Candle[], kPeriod = 14, dPeriod = 3) {
  const k: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      k.push(null);
      continue;
    }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const hi = Math.max(...slice.map((c) => c.high));
    const lo = Math.min(...slice.map((c) => c.low));
    // نافذة مسطّحة (أعلى = أدنى): TradingView ‏`ta.stoch` يعطي na. `|| 1` كان يرسم 0 = «تشبّع بيعي» وهمي.
    const span = hi - lo;
    k.push(span === 0 ? null : ((candles[i].close - lo) / span) * 100);
  }
  // `sma` لا تقبل null فيُعوَّض بصفر — وهذا يولّد قيم %D **وهمية** عند الشموع الأولى:
  // متوسط نافذة نصفها أصفار يهبط نحو الصفر، فيرى المتداول تقاطعاً صعودياً مفتعلاً لـ%K
  // فوق %D عند أقصى يسار الشارت. فأي نافذة تضمّ فهرساً بلا %K حقيقي قيمتها null لا رقم.
  const dRaw = sma(
    k.map((v) => v ?? 0),
    dPeriod
  );
  const d: (number | null)[] = dRaw.map((v, i) => {
    if (v == null) return null;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (k[j] == null) return null;
    }
    return v;
  });
  return { k, d };
}

/**
 * Williams %R — نفس منطق حساب %K بـcomputeStoch() حرفياً (أعلى/أدنى بنافذة period) لكن مقلوب
 * ومُعاد قياسه لمدى -100..0 بدل 0..100 (الصيغة القياسية: (أعلى_أعلى - إغلاق) / المدى × -100 —
 * صفر = إغلاق عند قمة المدى (تشبّع شرائي)، -100 = إغلاق عند قاع المدى (تشبّع بيعي)).
 */
export function computeWilliamsR(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    // نافذة مسطّحة ⇒ null كـTradingView (na)؛ `|| 1` كان يرسم 0 = «تشبّع شرائي» وهمي.
    const span = hh - ll;
    out.push(span === 0 ? null : ((hh - candles[i].close) / span) * -100);
  }
  return out;
}

/**
 * CCI (Commodity Channel Index) — الصيغة القياسية: (TP − SMA(TP)) / (0.015 × الانحراف المتوسط
 * المطلق لـTP عن SMA(TP)). TP (السعر النموذجي) = (أعلى+أدنى+إغلاق)/3. عند انحراف صفري (تسطّح
 * تام) تُرجع null كـTradingView (na) — 0 كان يُقرأ «حياد» على نافذة بلا حركة أصلاً.
 */
export function computeCci(candles: Candle[], period = 20): (number | null)[] {
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const smaTp = sma(tp, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (smaTp[i] == null) {
      out.push(null);
      continue;
    }
    const mean = smaTp[i]!;
    const slice = tp.slice(i - period + 1, i + 1);
    const meanDev = slice.reduce((a, v) => a + Math.abs(v - mean), 0) / period;
    // `sma` مجموع متدحرج: على نافذة مسطّحة يبقى انحراف ~1e-16 من تراكم الكسور فيخرج CCI −66 أو
    // +133 عشوائياً؛ انحراف أصغر من 1e-10 من السعر = لا حركة ⇒ null.
    out.push(meanDev <= Math.abs(mean) * 1e-10 ? null : (tp[i] - mean) / (0.015 * meanDev));
  }
  return out;
}

/**
 * ROC (Rate of Change / الزخم) — نسبة التغيّر المئوية بين الإغلاق الحالي والإغلاق قبل period
 * شمعة: ((close − close[period قبل]) / close[period قبل]) × 100. صفر عند قاعدة سعرية صفرية
 * (حالة نظرية) بدل قسمة على صفر.
 */
export function computeRoc(closes: number[], period = 10): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    const prev = closes[i - period];
    out.push(prev === 0 ? 0 : ((closes[i] - prev) / prev) * 100);
  }
  return out;
}

/**
 * Ultimate Oscillator (Larry Williams، period1=7/period2=14/period3=28 القيم القياسية) — يجمع ثلاثة
 * أطر زمنية بوزن مختلف لتقليل إشارات الانعكاس الكاذبة الشائعة بمؤشر زخم واحد. لكل شمعة:
 * BP (Buying Pressure) = إغلاق − min(أدنى، إغلاق الشمعة السابقة)، TR (بنفس منطق computeAtr لكن
 * بحدَّين فقط) = max(أعلى، إغلاق سابق) − min(أدنى، إغلاق سابق). لكل فترة: avg = مجموع(BP)/مجموع(TR)
 * على نافذتها (null عند مجموع TR صفري). UO = 100×(4×avg1 + 2×avg2 + avg3)/7 (مدى
 * 0..100، ≥70 تشبّع شرائي، ≤30 تشبّع بيعي — نفس عتبات RSI القياسية). **تحقّق يدوي بحالات حدّية
 * (بدل التقاط قيم من صف عشوائي كما بمؤشرات سابقة، لأن التحقّق العددي المباشر أوضح هنا)**: (أ) لو
 * BP=TR/2 بكل شمعة (ضغط شراء نصف المدى تماماً) فكل avg=0.5 → UO=100×(2+1+0.5)/7=50 — يطابق "50 =
 * محايد" المعروف عن هذا المؤشر بالضبط. (ب) لو BP=TR بكل شمعة (إغلاق=أعلى، وأدنى=إغلاق سابق فتصبح
 * trueLow=trueHigh السابقة صفراً للفارق) فكل avg=1 → UO=100×(4+2+1)/7=100 — الحد الأقصى النظري،
 * يطابق "ضغط شرائي كامل" تماماً. (ج) لو BP=0 بكل شمعة (إغلاق=أدنى دائماً) فكل avg=0 → UO=0 — الحد
 * الأدنى النظري. الحالات الثلاث تطابق تعريف المؤشر القياسي حرفياً. يعيد null حتى تتوفر maxPeriod
 * شمعة بإغلاق سابق (period3=28 افتراضياً هو الأطول، فأول قيمة فعلية عند المؤشر 28 كـTradingView).
 */
export function computeUltimateOsc(
  candles: Candle[],
  period1 = 7,
  period2 = 14,
  period3 = 28
): (number | null)[] {
  const n = candles.length;
  const bp: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;
    const trueLow = Math.min(candles[i].low, prevClose);
    const trueHigh = Math.max(candles[i].high, prevClose);
    bp[i] = candles[i].close - trueLow;
    tr[i] = trueHigh - trueLow;
  }
  const sumWindow = (arr: number[], end: number, period: number) => {
    let s = 0;
    for (let w = Math.max(0, end - period + 1); w <= end; w++) s += arr[w];
    return s;
  };
  const maxPeriod = Math.max(period1, period2, period3);
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    // الشمعة 0 بلا إغلاق سابق: BP/TR لها مختلَقان من إغلاقها نفسه (TradingView: `close[1]` na ⇒ na)،
    // فأوّل نافذة سليمة تبدأ بالشمعة 1 وأوّل قيمة بالفهرس maxPeriod لا maxPeriod−1.
    if (i < maxPeriod) {
      out.push(null);
      continue;
    }
    const trSum1 = sumWindow(tr, i, period1);
    const trSum2 = sumWindow(tr, i, period2);
    const trSum3 = sumWindow(tr, i, period3);
    // نافذة بلا مدى (سوق مغلق، شموع مسطّحة) ⇒ لا قيمة كـTradingView (قسمة على صفر = na)، لا 0 «تشبّع بيعي».
    if (trSum1 === 0 || trSum2 === 0 || trSum3 === 0) {
      out.push(null);
      continue;
    }
    const avg1 = sumWindow(bp, i, period1) / trSum1;
    const avg2 = sumWindow(bp, i, period2) / trSum2;
    const avg3 = sumWindow(bp, i, period3) / trSum3;
    out.push((100 * (4 * avg1 + 2 * avg2 + avg3)) / 7);
  }
  return out;
}

/**
 * CMO (Chande Momentum Oscillator، period=14 — نفس افتراضي RSI/ADX/MFI/Aroon بهذا الملف) — يشبه
 * RSI هيكلياً (نفس تصنيف حركة كل شمعة لـup/down) لكن بدون تمهيد Wilder الأسي: مجموع مباشر لحركات
 * الصعود والهبوط داخل نافذة period فقط، ثم CMO = 100×(sumUp−sumDown)/(sumUp+sumDown) (null عند
 * مجموع كلي صفري، كـ`ta.cmo`). المدى -100..100 (بعكس RSI 0..100)، +50/-50 عتبتا تشبّع
 * شرائي/بيعي شائعتان. **تحقّق يدوي بثلاث حالات حدّية**: صعود ثابت كل شمعة (كل الحركات موجبة) →
 * sumDown=0 → CMO=100×sumUp/sumUp=100 (الحد الأقصى، يطابق "زخم صاعد كامل")؛ هبوط ثابت كل شمعة →
 * sumUp=0 → CMO=100×(0−sumDown)/sumDown=-100 (الحد الأدنى)؛ تعادل تام بين مجموع الصعود والهبوط
 * بالنافذة → sumUp=sumDown → CMO=0 (محايد). الحالات الثلاث تطابق تعريف المؤشر القياسي حرفياً.
 */
export function computeCmo(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let sumUp = 0;
    let sumDown = 0;
    for (let w = i - period + 1; w <= i; w++) {
      const d = closes[w] - closes[w - 1];
      if (d > 0) sumUp += d;
      else if (d < 0) sumDown += -d;
    }
    // نافذة بلا حركة (سوق مغلق) ⇒ لا قيمة كـ`ta.cmo` (0/0 = na)، لا صفر يُقرأ «زخم محايد» على شموع لم تتداول.
    out.push(sumUp + sumDown === 0 ? null : (100 * (sumUp - sumDown)) / (sumUp + sumDown));
  }
  return out;
}

/**
 * DPO (Detrended Price Oscillator، period=21 كـTradingView وإزاحة قياسية ⌊period/2⌋+1 نحو الخلف) — يزيل تأثير
 * الاتجاه طويل المدى من السعر لإبراز الدورات القصيرة: DPO[i] = إغلاق[i] − SMA(period)[i-shift]
 * (shift=11 لـperiod=21). **ليس** مؤشر زخم متأخر عادي — الإزاحة للخلف
 * تُصحّح انزياح SMA الطبيعي فتجعل DPO يقارن السعر بمتوسط "مُتمركز" حول نفس نقطته الزمنية تقريباً،
 * فيبرز القمم/القيعان الدورية القصيرة بدل الاتجاه العام. صفر = السعر عند مستوى اتجاهه العام،
 * موجب/سالب = أعلى/أدنى من الاتجاه العام عند تلك النقطة تحديداً. **تحقّق يدوي**: لو الإغلاق ثابت
 * تماماً بكل الشموع، SMA(period) تستقر على نفس القيمة الثابتة وإغلاق[i-shift] يساويها أيضاً →
 * DPO=0 لكل نقطة صالحة — يطابق "لا انحراف دوري عن اتجاه ثابت مسطّح" بالتعريف تماماً.
 */
export function computeDpo(closes: number[], period = 21): (number | null)[] {
  // TradingView (غير مُتمركز، الافتراضي): `close − sma(close, 21)[barsback]`، barsback = 11. كان
  // `close[i−11] − sma[i]` — صيغة الوضع المُتمركز مرسومة على الشمعة الحالية لا قبلها بـ11، فلا تطابق
  // أيّاً من وضعَي TradingView: كل قمّة وقاع دوري متأخّر 11 شمعة عن السعر الذي صنعه.
  const mid = sma(closes, period);
  const shift = Math.floor(period / 2) + 1;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const maIdx = i - shift;
    if (maIdx < 0 || mid[maIdx] == null) {
      out.push(null);
      continue;
    }
    out.push(closes[i] - mid[maIdx]!);
  }
  return out;
}

/**
 * Awesome Oscillator (AO، Bill Williams، الفترتان القياسيتان 5/34) — الفرق بين متوسطين بسيطين
 * لسعر الوسط (median price = (أعلى+أدنى)/2، لا الإغلاق) بفترتين مختلفتين: AO = SMA(medianPrice, 5)
 * − SMA(medianPrice, 34). موجب = زخم السوق الحالي (نافذة قصيرة) أعلى من زخمه الأبعد (نافذة طويلة)
 * = تسارع صاعد، والعكس. **تبسيط تلوين موثَّق**: التلوين المرجعي القياسي لـAO يقارن كل عمود بالعمود
 * السابق (أخضر/أحمر حسب اتجاه العمود لا إشارته)؛ هنا يُستخدَم إشارة القيمة نفسها (موجب/سالب) تماشياً
 * مع كل پينات ثنائية القطبية الأخرى بهذا الملف (TRIX/Force/Chaikin/DPO) للاتساق البصري — القيمة
 * الحسابية نفسها معيارية 100%، فقط قاعدة التلوين مبسَّطة عمداً. **تحقّق يدوي**: سوق مسطّح تماماً
 * (أعلى=أدنى=قيمة ثابتة بكل شمعة) → السعر الوسط ثابت → fast=slow بعد الإحماء → AO=0، يطابق "لا
 * تباعد زخم" بالتعريف.
 */
export function computeAwesomeOsc(candles: Candle[]): (number | null)[] {
  const median = candles.map((c) => (c.high + c.low) / 2);
  const fast = sma(median, 5);
  const slow = sma(median, 34);
  return median.map((_, i) => (fast[i] != null && slow[i] != null ? fast[i]! - slow[i]! : null));
}

/**
 * Accelerator Oscillator (AC، Bill Williams) — يقيس تسارع/تباطؤ AO نفسه (زخم الزخم): AC = AO −
 * SMA(AO, 5). موجب = الزخم الحالي يتسارع فوق متوسطه القريب، سالب = يتباطأ. يُبنى مباشرة فوق
 * computeAwesomeOsc أعلاه (نفس فكرة computeChaikinOsc المبني فوق ADL الداخلي — طبقة ثانية فوق
 * مؤشر أول بنفس الملف). قيم null بـAO تُعوَّض بصفر مؤقتاً لحساب SMA(5) (نفس أسلوب dema/tema/hma
 * بهذا الملف) ثم بوابة صلاحية بقيمة AO الأصلية. **تحقّق يدوي**: لو AO ثابت عند صفر بعد الإحماء
 * (سوق مسطّح كما أعلاه)، SMA(AO,5)=0 أيضاً → AC=0−0=0، يطابق "لا تسارع بلا زخم أصلاً" منطقياً.
 */
export function computeAcceleratorOsc(candles: Candle[]): (number | null)[] {
  const ao = computeAwesomeOsc(candles);
  const aoSma = sma(ao, 5);
  return ao.map((v, i) => (v != null && aoSma[i] != null ? v - aoSma[i]! : null));
}

/**
 * Balance of Power (BOP) — يقيس ضغط المشترين مقابل البائعين ضمن مدى الشمعة نفسها فقط (بلا تراكم أو
 * تمهيد): BOP = (إغلاق−فتح)/(أعلى−أدنى) لكل شمعة (صفر عند مدى صفري بدل قسمة على صفر). مدى نظري
 * -1..1: قرب 1 = إغلاق قرب القمة بعد فتح قرب القاع (سيطرة شرائية كاملة داخل الشمعة)، قرب -1 = العكس.
 * بعكس كل المؤشرات الأخرى بالملف، BOP لا يحتاج فترة تمهيد إطلاقاً (قيمة فورية لكل شمعة من بياناتها
 * ذاتها) فلا قيم null إلا عند مدى صفري (مُعالَج بصفر بدل null هنا تحديداً لاتساقه الفوري). **تحقّق
 * يدوي بثلاث حالات حدّية**: شمعة صاعدة كاملة (فتح=أدنى، إغلاق=أعلى) → BOP=(أعلى−أدنى)/(أعلى−أدنى)=1؛
 * شمعة هابطة كاملة (فتح=أعلى، إغلاق=أدنى) → BOP=-1؛ دوجي (فتح=إغلاق) → BOP=0. الحالات الثلاث تطابق
 * تعريف المؤشر القياسي حرفياً.
 */
export function computeBop(candles: Candle[]): (number | null)[] {
  return candles.map((c) => {
    const span = c.high - c.low;
    return span === 0 ? 0 : (c.close - c.open) / span;
  });
}

/**
 * Elder Ray — Bull Power / Bear Power (Alexander Elder، period=13 EMA على الإغلاق، القيمة القياسية
 * الشائعة) — يقيسان قدرة المشترين/البائعين على دفع السعر أبعد من "القيمة العادلة" الحالية (ema13):
 * bullPower = أعلى − ema13، bearPower = أدنى − ema13. موجب bullPower يعني قمة الشمعة فوق الاتجاه
 * الحالي (ضغط شرائي)، وbearPower سالب طبيعي أثناء اتجاه صاعد سليم (قاع الشمعة عادة تحت المتوسط)
 * ويزداد سلبية مع ضعف الاتجاه. يُرسمان كمؤشرين منفصلين (بدل خطين بپين واحد) للاتساق مع نمط "قيمة
 * واحدة لكل پين" المتَّبع بكل مؤشرات هذا الملف حتى الآن. **تحقّق يدوي**: سوق مسطّح تماماً (إغلاق=
 * أعلى=أدنى=قيمة ثابتة بكل شمعة) → ema13 تستقر على نفس القيمة الثابتة بعد الإحماء → bullPower=0
 * وbearPower=0 معاً، يطابق "لا قوة شرائية/بيعية فوق/تحت القيمة العادلة بسوق ساكن تماماً" بالتعريف.
 */
export function computeBullPower(candles: Candle[], period = 13): (number | null)[] {
  const emaClose = ema(candles.map((c) => c.close), period);
  return candles.map((c, i) => (emaClose[i] != null ? c.high - emaClose[i]! : null));
}

export function computeBearPower(candles: Candle[], period = 13): (number | null)[] {
  const emaClose = ema(candles.map((c) => c.close), period);
  return candles.map((c, i) => (emaClose[i] != null ? c.low - emaClose[i]! : null));
}

/**
 * TSI (True Strength Index، فترتا القيمة القياسية r=25 (طويلة) وs=13 (قصيرة)) — زخم مزدوج التنعيم:
 * momentum[i] = إغلاق[i] − إغلاق[i-1] (null عند i=0 كـ`ta.change`). يُمرَّر momentum عبر طبقتي ema
 * متتاليتين (r ثم s)، وبالتوازي |momentum| عبر نفس الطبقتين. TSI = 100×(الزخم المزدوج التنعيم)/(القيمة
 * المطلقة المزدوجة التنعيم)؛ مقام صفري (سعر ثابت تماماً) ⇒ null كـTradingView. مدى نظري -100..100،
 * +25/-25 عتبتا تشبّع شائعتان. خطّ الإشارة ema(TSI, 13).
 */
export function computeTsi(
  closes: number[],
  r = 25,
  s = 13,
  signalLen = 13
): { tsi: (number | null)[]; signal: (number | null)[] } {
  const n = closes.length;
  // `ta.change(close)` na بالشمعة 0 كـTradingView: صفر مُختلَق هناك كان يدخل بذرة الـEMA الطويلة
  // فيظهر أوّل TSI قبل شمعة من موعده وبقيمة مختلفة.
  const momentum: (number | null)[] = new Array(n).fill(null);
  const absMomentum: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    momentum[i] = closes[i] - closes[i - 1];
    absMomentum[i] = Math.abs(momentum[i]!);
  }
  const ema1 = ema(momentum, r);
  const ema2 = ema(ema1, s);
  const absEma1 = ema(absMomentum, r);
  const absEma2 = ema(absEma1, s);
  // مقام صفري (لا حركة إطلاقاً) ⇒ na كـTradingView، لا 0 يُقرأ «زخم محايد» على سوق لم يتداول.
  const tsi = closes.map((_, i) =>
    ema2[i] != null && absEma2[i] != null && absEma2[i]! > 0 ? (100 * ema2[i]!) / absEma2[i]! : null
  );
  // خطّ الإشارة `ema(tsi, 13)` كـTradingView: تقاطع TSI معه هو قراءة المؤشّر المعتادة.
  return { tsi, signal: ema(tsi, signalLen) };
}

/**
 * PMO (Price Momentum Oscillator، DecisionPoint) كنصّ TradingView: ROC شمعة واحدة بالنسبة المئوية، ثم
 * تنعيمان «مخصّصان» بعامل `2/length` (لا `2/(length+1)` كالـEMA) يبدآن من صفر (`nz(csf[1])`) — 35 ثم
 * 20 على ×10 — وخطّ إشارة `ema(pmo, 10)`. الشموع الأولى (35+20−2) تُخفى: بدء التنعيم من صفر يجعلها
 * مُخمَدة، والتاريخ الإضافي قبل النافذة المرئية (`indicatorBase`) يستهلكها عادة. سعر ثابت ⇒ PMO = 0.
 */
export function computePmo(
  closes: number[],
  rocSmooth = 35,
  pmoSmooth = 20,
  signalLen = 10
): { pmo: (number | null)[]; signal: (number | null)[] } {
  const smA = 2 / rocSmooth;
  const smB = 2 / pmoSmooth;
  const warm = rocSmooth + pmoSmooth - 2;
  let csf1 = 0;
  let csf2 = 0;
  const pmo: (number | null)[] = closes.map((c, i) => {
    const prev = i > 0 ? closes[i - 1] : c;
    const roc = prev !== 0 ? (c / prev) * 100 - 100 : 0;
    csf1 += (roc - csf1) * smA;
    csf2 += (10 * csf1 - csf2) * smB;
    return i < warm ? null : csf2;
  });
  return { pmo, signal: ema(pmo, signalLen) };
}

/**
 * Coppock Curve (فترات قياسية شائعة: ROC 14 + ROC 11، مُنعَّمة بـWMA period=10) — مؤشر زخم طويل
 * المدى (صُمِّم أصلاً لرصد قيعان السوق الكبرى) يجمع معدّلي تغيّر بفترتين مختلفتين (**يبني مباشرة
 * فوق computeRoc المُصدَّرة أعلاه بهذا الملف — لا إعادة تطبيق لنفس المنطق**) ثم ينعّم مجموعهما
 * بمتوسط مرجَّح (wma() المحلية، نفس دالة hma20/wma20 أعلاه). Coppock[i] = wma(ROC(closes,14)[i] +
 * ROC(closes,11)[i]، period=10). عبور الخط من سالب لموجب تقليدياً إشارة اشتراء طويلة المدى. **تحقّق
 * يدوي**: سعر ثابت تماماً بكل الشموع → كلا ROC(14) وROC(11) يستقران على صفر بعد الإحماء (لا تغيّر
 * نسبي بسعر ثابت) → مجموعهما صفر بكل نقطة → wma لسلسلة أصفار = صفر، يطابق "لا زخم دوري بسعر ساكن
 * تماماً" بالتعريف.
 */
export function computeCoppock(closes: number[], roc1 = 14, roc2 = 11, wmaPeriod = 10): (number | null)[] {
  const rocA = computeRoc(closes, roc1);
  const rocB = computeRoc(closes, roc2);
  const sum: number[] = closes.map((_, i) =>
    rocA[i] != null && rocB[i] != null ? rocA[i]! + rocB[i]! : NaN
  );
  // `wma` تُسقط أي نافذة فيها null: تعويض الإحماء بأصفار كان يرسم 9 قيم وهمية (منحنى يصعد من الصفر)
  // قبل أول نافذة كاملة، وTradingView يعطي na حتى الشمعة 14 + 10 − 1.
  return wma(
    sum.map((v) => (Number.isNaN(v) ? null : v)),
    wmaPeriod
  );
}

/**
 * PPO (Percentage Price Oscillator، فترتا EMA القياسيتان 12/26 — نفس فترتي computeMacd() أعلاه
 * تماماً) — نسخة نسبية (%) من MACD بدل الفرق المطلق: PPO[i] = (ema12[i]−ema26[i])/ema26[i] × 100
 * (صفر عند ema26 صفرية بدل قسمة على صفر). ميزته عن MACD المطلق: قابل للمقارنة عبر رموز/أسعار
 * مختلفة المقياس (فرق MACD المطلق يتأثر بحجم السعر نفسه، PPO النسبي لا يتأثر). **تحقّق يدوي**: سعر
 * ثابت تماماً بكل الشموع → ema12 وema26 (طبقة ema أحادية مباشرة على الإغلاق، لا طبقات متعددة) تستقران
 * كلتاهما على نفس القيمة الثابتة بالضبط بدءاً من أول نقطة صالحة لكل منهما (بعكس مؤشرات الطبقات
 * المزدوجة كـdema/tema/trix أعلاه) → PPO=(c−c)/c×100=0 بالضبط، يطابق "لا تباعد زخم بسعر ساكن"
 * بالتعريف تماماً (نفس منطق تحقّق MACD الأصلي بالضبط).
 */
export function computePpo(closes: number[], fast = 12, slow = 26): (number | null)[] {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  return closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null
      ? emaSlow[i] === 0
        ? 0
        : ((emaFast[i]! - emaSlow[i]!) / emaSlow[i]!) * 100
      : null
  );
}

/**
 * Qstick (Tushar Chande، period=10 القيمة القياسية الشائعة) — أبسط مؤشر بهذا الملف حسابياً: يقيس
 * غلبة شموع الصعود (إغلاق > فتح) أو الهبوط (إغلاق < فتح) على مدى نافذة زمنية بدل الاعتماد على شمعة
 * واحدة: Qstick[i] = SMA(إغلاق−فتح, period) — متوسط بسيط مباشر لفارق إغلاق/فتح كل شمعة (**يبني على
 * sma() المحلية المستخدَمة بكل الملف — لا إعادة تطبيق**). موجب مستمر = أغلب الشموع الأخيرة صاعدة
 * (جسم أخضر غالب)، سالب مستمر = أغلب الشموع هابطة، تذبذب حول الصفر = تنافس متكافئ بلا غلبة واضحة.
 * بعكس BOP أعلاه (قيمة فورية لكل شمعة بلا تمهيد)، Qstick مُنعَّم بنافذة period فيبرز الاتجاه المتوسط
 * لا الشمعة اللحظية. **تحقّق يدوي**: لو فتح=إغلاق بكل شمعة (سوق دوجي مستمر) → الفارق صفر لكل شمعة
 * بصرف النظر عن أي شيء آخر (أعلى/أدنى/فوليوم) → SMA لسلسلة أصفار = صفر لكل نقطة صالحة، يطابق "لا
 * غلبة صعود/هبوط بسوق دون أي جسم شمعة فعلي" بالتعريف تماماً.
 */
export function computeQstick(candles: Candle[], period = 10): (number | null)[] {
  const diff = candles.map((c) => c.close - c.open);
  return sma(diff, period);
}

/**
 * APO (Absolute Price Oscillator، فترتا EMA القياسيتان 12/26 — نفس فترتي computeMacd/computePpo
 * أعلاه بهذا الملف تماماً) — أبسط نسخة من عائلة MACD/PPO: الفرق المطلق (لا النسبي) بين طبقتي EMA
 * للإغلاق مباشرة بلا خط إشارة أو هيستوجرام: APO[i] = ema12(إغلاق)[i] − ema26(إغلاق)[i] (**نفس بسط
 * MACD [macdLine] حرفياً — فقط بلا خط إشارة**). بعكس PPO الذي يُعيد قياس نفس الفارق كنسبة مئوية من
 * ema26 (قابل للمقارنة عبر رموز مختلفة السعر)، APO يبقى بوحدة السعر المطلقة نفسها (أقرب لMACD، أبعد
 * عن PPO رغم الاسم المشابه لهما معاً). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → ema12 وema26 (طبقة
 * ema أحادية مباشرة على الإغلاق) تستقران كلتاهما على نفس القيمة الثابتة بدءاً من أول نقطة صالحة لكل
 * منهما → APO=ثابت−ثابت=0 بالضبط، يطابق "لا تباعد زخم بسعر ساكن تماماً" بالتعريف تماماً.
 */
export function computeApo(closes: number[], fast = 12, slow = 26): (number | null)[] {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  return closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null
  );
}

/**
 * Stochastic RSI (rsiPeriod=14 وstochPeriod=14 القيمتان القياسيتان — يطبّق صيغة %K القياسية
 * [بنفس منطق computeStoch أعلاه حرفياً] لكن على *قيم RSI نفسها* بدل السعر الخام) — يبني مباشرة فوق
 * computeRsi المُصدَّرة مسبقاً بهذا الملف (لا إعادة تطبيق): لكل نقطة، StochRSI[i] = (RSI[i] −
 * أدنى RSI بنافذة stochPeriod) / (أعلى RSI بنفس النافذة − أدنى RSI) × 100 (null عند تساوي أعلى/أدنى
 * RSI بالنافذة، كـna بـTradingView — حالة "RSI ثابت تماماً بالنافذة"، ليست بالضرورة RSI=0 أو 100).
 * **الفرق عن RSI الخام**: RSI نفسه أوسيليتر مُطبَّق على السعر، بينما StochRSI أوسيليتر *مُطبَّق على
 * أوسيليتر آخر* — أكثر حساسية وتذبذباً من RSI الخام (يعبر 80/20 أكثر تكراراً)، يُستخدم لرصد تحوّلات
 * زخم أدق. الفترة الفعّالة الكلية = rsiPeriod (لحساب RSI أولاً) + stochPeriod−1 (لنافذة %K فوق RSI) —
 * أطول إحماءً من RSI أو Stochastic الخام كلٍّ على حدة (النافذة تبدأ من أول نقطة RSI صالحة، لا الشمعة
 * الأولى مطلقاً). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → RSI (بلا خسارة أو مكسب فعلي، avgLoss=0)
 * يستقر عند 100 بدءاً من أول نقطة صالحة له (نفس تحفّظ computeRsi الموثَّق بتعريفه أعلاه) → RSI
 * ثابت=100 طوال نافذة stochPeriod → أعلى=أدنى=100 → StochRSI=null (كانت 0 فيُقرأ السعر الثابت «تشبّعاً بيعياً») (حالة "تساوي أعلى/أدنى"
 * المُعالَجة صراحة أعلاه، لا قيمة وهمية).
 */
export function computeStochRsi(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  smoothK = 3,
  smoothD = 3
): { k: (number | null)[]; d: (number | null)[] } {
  // TradingView (3,3,14,14): K = sma(الخام، 3) وD = sma(K، 3) — كان الخام وحده بلا D، أكثر تذبذباً بكثير
  // من خطّ TradingView (خام 0/100/0 ⇒ K عنده 33.3 وهنا 0) وبلا تقاطع K/D الذي يُتداول عليه.
  const raw = stochRsiRaw(closes, rsiPeriod, stochPeriod);
  const k = smoothK > 1 ? sma(raw, smoothK) : raw;
  return { k, d: sma(k, smoothD) };
}

function stochRsiRaw(closes: number[], rsiPeriod: number, stochPeriod: number): (number | null)[] {
  const rsi = computeRsi(closes, rsiPeriod);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < rsiPeriod + stochPeriod - 1) {
      out.push(null);
      continue;
    }
    let hi = -Infinity;
    let lo = Infinity;
    for (let w = i - stochPeriod + 1; w <= i; w++) {
      hi = Math.max(hi, rsi[w]!);
      lo = Math.min(lo, rsi[w]!);
    }
    const span = hi - lo;
    // RSI ثابت على النافذة ⇒ na بـ`ta.stoch` عند TradingView؛ 0 كان «تشبّع بيعي» وهمياً.
    out.push(span === 0 ? null : ((rsi[i]! - lo) / span) * 100);
  }
  return out;
}

/**
 * RVI (Relative Vigor Index، period=10 القيمة الشائعة لتنعيم SMA النهائي) — يقيس "قوة الاتجاه
 * الحقيقية" بمقارنة موقع الإغلاق من الفتح (اتجاه الزخم الفعلي) بمدى التداول الكلي (أعلى−أدنى)،
 * باستخدام تنعيم Simpson المتماثل [1,2,2,1]/6 على 4 شموع متتالية (نفس التقنية المرجعية القياسية
 * لـRVI) بدل قيمة شمعة واحدة فورية: لكل شمعة i (تحتاج 3 شموع سابقة على الأقل)، num[i] =
 * ((إغلاق[i]−فتح[i]) + 2×(إغلاق[i-1]−فتح[i-1]) + 2×(إغلاق[i-2]−فتح[i-2]) + (إغلاق[i-3]−فتح[i-3])) / 6،
 * denom[i] بنفس الصيغة على (أعلى−أدنى) بدل (إغلاق−فتح). ثم RVI = SMA(num, period) / SMA(denom, period)
 * (صفر عند SMA(denom) صفرية بدل قسمة على صفر؛ **نفس تقنية تعويض null بصفر قبل SMA ثم بوابة صلاحية
 * صريحة بفهرس `3 + period − 1` المستخدَمة بـdema/tema/massIndex أعلاه**، لتفادي تلويث النافذة الأولى
 * بقيم صفرية وهمية). **الفرق عن BOP أعلاه**: BOP فوري بلا أي تمهيد (شمعة واحدة فقط)، بينما RVI
 * يُنعِّم على 4 شموع أولاً (Simpson) ثم على period شمعة إضافية (SMA) — أكثر استقراراً وأقل ضوضاءً
 * بكثير من BOP، على حساب تأخّر أكبر. **تحقّق يدوي**: فتح=إغلاق بكل شمعة (سوق دوجي مستمر) → num[i]=0
 * لكل شمعة بصرف النظر عن denom → SMA(num,period)=0 → RVI=0/denom=0 بالضبط (بصرف النظر عن قيمة
 * أعلى/أدنى)، يطابق "لا زخم اتجاهي فعلي بلا أجسام شموع" بالتعريف تماماً.
 */
export function computeRvi(candles: Candle[], period = 10): (number | null)[] {
  const n = candles.length;
  const num: (number | null)[] = new Array(n).fill(null);
  const denom: (number | null)[] = new Array(n).fill(null);
  for (let i = 3; i < n; i++) {
    const a = candles[i].close - candles[i].open;
    const b = candles[i - 1].close - candles[i - 1].open;
    const c = candles[i - 2].close - candles[i - 2].open;
    const d = candles[i - 3].close - candles[i - 3].open;
    num[i] = (a + 2 * b + 2 * c + d) / 6;
    const A = candles[i].high - candles[i].low;
    const B = candles[i - 1].high - candles[i - 1].low;
    const C = candles[i - 2].high - candles[i - 2].low;
    const D = candles[i - 3].high - candles[i - 3].low;
    denom[i] = (A + 2 * B + 2 * C + D) / 6;
  }
  const numSma = sma(num, period);
  const denomSma = sma(denom, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 3 + period - 1 || numSma[i] == null || denomSma[i] == null) {
      out.push(null);
      continue;
    }
    out.push(denomSma[i] === 0 ? 0 : numSma[i]! / denomSma[i]!);
  }
  return out;
}

/**
 * خطّ إشارة RVI كـTradingView: ‎ta.swma(rvi)‎ — تنعيم [1,2,2,1]/6 على آخر أربع قيم (null حتى تصلح الأربع).
 * تقاطع RVI وإشارته هو ما يُقرأ من المؤشّر؛ كانت اللوحة أعمدة RVI وحدها بلا إشارة.
 */
export function computeRviSignal(rvi: readonly (number | null)[]): (number | null)[] {
  return rvi.map((v, i) => {
    if (i < 3) return null;
    const a = rvi[i - 1];
    const b = rvi[i - 2];
    const c = rvi[i - 3];
    return v == null || a == null || b == null || c == null ? null : (v + 2 * a + 2 * b + c) / 6;
  });
}

/**
 * Momentum (MOM، period=10 الافتراضي القياسي) — أبسط أوسيليتر زخم مطلق: فرق إغلاق مباشر بلا أي
 * تسوية % كـROC أعلاه (MOM[i] = إغلاق[i] − إغلاق[i-period])، غير محدود المدى، يتذبذب حول الصفر بنفس
 * نمط پين TRIX/DPO/LR Slope أعلاه (عمود ملوَّن أعلى/أسفل خط الصفر). **تحقّق يدوي**: سعر ثابت تماماً
 * بكل الشموع → MOM=0 لكل نقطة صالحة؛ سعر يزيد بمقدار ثابت d كل شمعة → MOM=period×d بالضبط لكل نقطة
 * صالحة (فرق إغلاقين يفصل بينهما period خطوة، كل خطوة زيادتها d).
 */
export function computeMomentum(closes: number[], period = 10): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    out.push(closes[i] - closes[i - period]);
  }
  return out;
}

/**
 * Fisher Transform (John Ehlers، period=10 شائع) — يُطبّع السعر النموذجي (المنتصف = (أعلى+أدنى)/2)
 * إلى مدى -1..1 بالنسبة لأعلى/أدنى نافذة متدحرجة period (بأسلوب computeStoch/computeWilliamsR
 * أعلاه حرفياً — نافذة تنتهي عند كل نقطة)، بتنعيم تراكمي (وزن 0.33 للقيمة الجديدة + 0.67 للسابقة)
 * ثم تحويل عكسي (0.5×ln((1+x)/(1−x)) — مكافئ atanh) لتضخيم نقاط التحوّل الحادة وتقريب التوزيع من
 * الشكل الجرسي، بتنعيم تراكمي إضافي (نفس وزن 0.5/0.5) على الناتج النهائي. **حارسان دفاعيان قياسيان
 * لصيغة Ehlers الأصلية**: (أ) عند تساوي أعلى=أدنى بالنافذة (مدى صفري) تُستخدَم نقطة المنتصف المحايدة
 * 0.5 بدل قسمة على صفر (تصبح المساهمة الجديدة صفراً بعد التحويل 2×(نسبة−0.5))؛ (ب) القيمة المطبَّعة
 * تُحصَر ضمن ±0.999 قبل اللوغاريتم (تفادي ln(0) أو ln(سالب) عند اقتراب النسبة من الحدّين 0 أو 1
 * بالضبط). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع (أعلى=أدنى=إغلاق ثابت لكل شمعة، بما فيها فترة
 * التسخين) → المدى صفري بكل نافذة → الحارس (أ) يُفعَّل دائماً (نسبة=0.5 دائماً) → القيمة المطبَّعة
 * الجديدة كل مرة = 0.33×2×(0.5−0.5)+0.67×السابقة = 0.67×السابقة، تبدأ من القيمة الابتدائية 0 فتبقى
 * 0 بالضبط للأبد (0.67×0=0) → fisher[i]=0.5×ln((1+0)/(1−0))+0.5×fisher[i-1]=0.5×0+0.5×0=0 بالضبط
 * لكل نقطة بعد التسخين، يطابق "لا انحياز اتجاهي ولا إشارة بسعر ساكن تماماً" بالتعريف.
 *
 * **كنصّ TradingView** (`round_`): ما تجاوز ±0.99 يصير ±0.999 **ويُخزَّن** مقصوصاً فيدخل تنعيم الشمعة التالية؛
 * كان القصّ عند اللوغاريتم وحده فتبقى `value1` غير مقصوصة وتتراكم فوق 1 ⇒ القمم أقلّ بنحو 1 من TradingView
 * بموجة قوية. والطول الافتراضي 9 كـTradingView (كان 10).
 */
export function computeFisherTransform(candles: Candle[], period = 9): (number | null)[] {
  const n = candles.length;
  const mp = candles.map((c) => (c.high + c.low) / 2);
  const out: (number | null)[] = [];
  let value1 = 0;
  let fisher = 0;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = mp.slice(i - period + 1, i + 1);
    const hh = Math.max(...slice);
    const ll = Math.min(...slice);
    const span = hh - ll;
    const ratio = span === 0 ? 0.5 : (mp[i] - ll) / span;
    const raw = 0.33 * 2 * (ratio - 0.5) + 0.67 * value1;
    value1 = raw > 0.99 ? 0.999 : raw < -0.99 ? -0.999 : raw;
    fisher = 0.5 * Math.log((1 + value1) / (1 - value1)) + 0.5 * fisher;
    out.push(fisher);
  }
  return out;
}

/**
 * KST (Know Sure Thing، Martin Pring) — مجموع مرجَّح لأربع نسخ مُنعَّمة من ROC (نفس computeRoc()
 * المُصدَّرة أعلاه حرفياً) بفترات وأوزان تصاعدية قياسية شائعة بكل المنصات: ROC(10) مُنعَّم SMA(10)
 * بوزن ×1، ROC(15) مُنعَّم SMA(10) بوزن ×2، ROC(20) مُنعَّم SMA(10) بوزن ×3، ROC(30) مُنعَّم SMA(15)
 * بوزن ×4 — مجموع المركّبات الأربعة = KST[i]. يشبه فكرة Coppock الموجودة مسبقاً (مجموع ROC مُنعَّم)
 * لكن بأربع مركّبات مرجَّحة بدل مركّبتين متساويتي الوزن، لالتقاط زخم قصير/متوسط/طويل المدى معاً بنقطة
 * واحدة. قيم ROC غير الجاهزة (null بفترة التسخين) تُعامَل كصفر قبل التنعيم بـSMA (**نفس نمط معالجة
 * null بمعادلات MACD/DEMA/TEMA/HMA أعلاه حرفياً** — تعويض بصفر ثم بوابة صلاحية على الناتج النهائي
 * فقط). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → كل نسخ ROC الأربع = 0 بالضبط لكل نقطة بعد
 * تسخينها الخاص (فرق إغلاق صفري دائماً بصيغة ROC، والقيم المعوَّضة بصفر بفترة التسخين نفسها صفر أيضاً)
 * → تنعيم SMA لسلسلة كلها أصفار = صفر بالضبط → KST = 1×0+2×0+3×0+4×0 = 0 بالضبط، يطابق "لا زخم بسعر
 * ساكن على أي مدى زمني" بالتعريف.
 */
export function computeKst(closes: number[]): { kst: (number | null)[]; signal: (number | null)[] } {
  const roc1 = computeRoc(closes, 10);
  const roc2 = computeRoc(closes, 15);
  const roc3 = computeRoc(closes, 20);
  const roc4 = computeRoc(closes, 30);
  const s1 = sma(roc1, 10);
  const s2 = sma(roc2, 10);
  const s3 = sma(roc3, 10);
  const s4 = sma(roc4, 15);
  const kst = closes.map((_, i) =>
    s1[i] != null && s2[i] != null && s3[i] != null && s4[i] != null
      ? s1[i]! + 2 * s2[i]! + 3 * s3[i]! + 4 * s4[i]!
      : null
  );
  // خطّ الإشارة `sma(kst, 9)` كـTradingView: تقاطع KST معه هو إشارة Pring للدخول/الخروج، ولوحة بلا
  // إشارة لا تُقرأ إلا بعبور الصفر — متأخّر بأسابيع على الفريم اليومي.
  return { kst, signal: sma(kst, 9) };
}

/**
 * SMI (Stochastic Momentum Index، وليام بلاو — kPeriod=10/smoothPeriod1=3/smoothPeriod2=3/
 * signalPeriod=3 القيم القياسية الشائعة) — نسخة مُحسَّنة من Stochastic العادي (computeStoch
 * أعلاه) تقيس موضع الإغلاق نسبةً لمنتصف نطاق أعلى/أدنى قمة/قاع (لا الحد الأدنى وحده كـStochastic
 * التقليدي) ثم تُنعِّم الفرق والمدى كليهما بطبقتي EMA متتاليتين (نفس مبدأ التنعيم المزدوج
 * لـcomputeTsi أعلاه حرفياً، هنا على diff/range بدل momentum/absMomentum). لكل نقطة: منتصف=
 * (أعلى قمة+أدنى قاع)/2 خلال kPeriod، diff=إغلاق−منتصف، مدى=أعلى قمة−أدنى قاع؛ avgDiff=
 * ema(ema(diff، smoothPeriod1)، smoothPeriod2)، avgRange بنفس الطريقة تماماً؛ SMI=100×avgDiff/
 * (avgRange/2) (حارس صفر صراحةً عند avgRange=0)، خط الإشارة=ema(SMI، signalPeriod) — نفس بنية
 * kvo/signal لـcomputeKlinger أعلاه حرفياً (خط رئيسي + إشارة مُنعَّمة)، يُرسَم بنفس نمط الپين
 * ثنائي الخط. **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → أعلى قمة=أدنى قاع=P لأي نافذة →
 * منتصف=P → diff=P−P=0 ومدى=P−P=0 لكل نقطة صالحة → التنعيم المزدوج لسلسلة أصفار=0 لكليهما →
 * avgRange=0 محروس صراحةً → SMI=0 بالضبط، والإشارة=ema(0،signalPeriod)=0 أيضاً، يطابق "لا زخم/لا
 * مدى بسعر ساكن تماماً" بالتعريف.
 */
export function computeSmi(
  candles: Candle[],
  kPeriod = 10,
  smoothPeriod1 = 3,
  smoothPeriod2 = 3,
  signalPeriod = 3
): { smi: (number | null)[]; signal: (number | null)[] } {
  const n = candles.length;
  const diff: number[] = new Array(n).fill(0);
  const range: number[] = new Array(n).fill(0);
  const valid: boolean[] = new Array(n).fill(false);
  for (let i = kPeriod - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - kPeriod + 1; w <= i; w++) {
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    const center = (hh + ll) / 2;
    diff[i] = candles[i].close - center;
    range[i] = hh - ll;
    valid[i] = true;
  }
  const avgDiff = ema(ema(diff, smoothPeriod1), smoothPeriod2);
  const avgRange = ema(ema(range, smoothPeriod1), smoothPeriod2);
  const smi: (number | null)[] = candles.map((_, i) => {
    if (!valid[i] || avgDiff[i] == null || avgRange[i] == null) return null;
    const halfRange = avgRange[i]! / 2;
    return halfRange === 0 ? 0 : (100 * avgDiff[i]!) / halfRange;
  });
  const emaSignal = ema(smi, signalPeriod);
  const signal: (number | null)[] = smi.map((v, i) => (v != null ? emaSignal[i] : null));
  return { smi, signal };
}

/**
 * SMI Ergodic Oscillator كنصّ TradingView المدمج: `erg = ta.tsi(close, 5, 20)` (نطاق ±1 لا ±100)،
 * `sig = ta.ema(erg, 5)`، والهستوغرام `erg − sig`. كان SMI بلاو الاستوكاستيكي (`computeSmi`، 10/3/3/3) ناقص
 * إشارته — مؤشّر آخر تماماً (عشرات لا أجزاء من الواحد، وتقاطعات صفر بغير توقيت TradingView). تنعيم `ta.tsi`
 * المزدوج: الطويل (20) أولاً ثم القصير (5) — كـ`computeTsi(closes, 20, 5)`، مقسوماً على 100.
 */
export function computeSmiErgodicOscillator(
  candles: Candle[],
  shortLen = 5,
  longLen = 20,
  signalLen = 5
): (number | null)[] {
  const { tsi } = computeTsi(
    candles.map((c) => c.close),
    longLen,
    shortLen,
    signalLen
  );
  const erg = tsi.map((v) => (v == null ? null : v / 100));
  const sig = ema(erg, signalLen);
  return erg.map((v, i) => (v != null && sig[i] != null ? v - sig[i]! : null));
}

/**
 * Center of Gravity (COG، جون إيلرز، period=10 القيمة القياسية لهذه الأداة تحديداً) — مذبذب متمركز
 * حول الصفر يرصد "ثِقل" السعر داخل نافذة متدحرجة عبر ترجيح كل نقطة بمسافتها الزمنية عن بداية
 * النافذة، على **السعر الوسيط** (`computeMedianPrice` أعلاه، (أعلى+أدنى)/2 — **إعادة استخدام كاملة
 * لدالة موجودة بدل حساب سعر جديد**، نفس السعر المستخدَم أصلاً لـMedian Price/Ichimoku/Alligator
 * حرفياً). لكل نافذة: Num=Σ(1+j)×سعر[i−j] وDenom=Σسعر[i−j] لـj=0..period-1 (j=0 = الشمعة الحالية)،
 * ثم COG=−Num/Denom+(period+1)/2 — **الإزاحة الجبرية (period+1)/2 قرار تصميم متعمَّد** (لا حساب
 * تعسّفي): تُصفّر المذبذب تماماً عند سعر ثابت (راجع التحقق الجبري أدناه)، بعكس الصيغة الخام
 * −Num/Denom التي كانت لتتمركز حول −(period+1)/2 دائماً بلا معنى مقارنة بصفر. صفر عند مجموع سعر
 * صفري بدل قسمة على صفر (حالة نظرية بحتة، السعر الوسيط للفوركس موجب دوماً). يُرسَم بإعادة استخدام
 * كاملة لنمط هستوغرام TRIX/Force/Chaikin Osc/DPO (شريط عمودي مطبَّع بأقصى قيمة مطلقة بالسلسلة كاملة،
 * bull فوق الصفر/bear تحته) — بلا أي نمط رسم جديد. **تحقّق جبري**: سعر ثابت تماماً C بكل نافذة →
 * Num=C×Σ(1+j)=C×period×(period+1)/2، Denom=C×period → Num/Denom=(period+1)/2 بالضبط (مستقل عن C
 * تماماً طالما C≠0) → COG=−(period+1)/2+(period+1)/2=0 بالضبط — **تحقَّق فعلياً بـNode.js** (سعر
 * ثابت 1.5 عبر 40 شمعة period=10 → 0 بالضبط بكل نقطة صالحة، بلا أي فرق تقريب). 300 شمعة عشوائية
 * بذرة ثابتة → صفر NaN/Infinity عبر كل الـ291 نقطة الصالحة (300−period+1)؛ إعادة حساب مستقلة منفصلة
 * عن الدالة لنقطة عشوائية واحدة طابقت الدالة تماماً (فرق<10⁻¹²).
 */
export function computeCog(candles: Candle[], period = 10): (number | null)[] {
  const price = computeMedianPrice(candles);
  const n = candles.length;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let num = 0;
    let denom = 0;
    for (let count = 0; count < period; count++) {
      const p = price[i - count];
      num += (1 + count) * p;
      denom += p;
    }
    out.push(denom === 0 ? 0 : -num / denom + (period + 1) / 2);
  }
  return out;
}

/**
 * Woodie's CCI (كين وودي) — **إعادة استخدام حرفية كاملة صفر حساب جديد**: يستدعي `computeCci` الموجودة
 * أعلاه مرتين بفترتين مختلفتين فقط — CCI البطيء (period=14، القيمة القياسية لهذه الأداة تحديداً،
 * الخط الرئيسي) وTurbo CCI السريع (period=6، خط الإشارة المرافق). مستقل تماماً عن `woodiePivots`
 * الموجود مسبقاً بالملف رغم مشاركة اسم "Woodie" (ذاك عائلة Pivot Points، هذا مذبذب CCI مركّب —
 * لا علاقة حسابية بينهما). **تحقّق فعلي (Node.js، قبل الكتابة)**: تطابق مطلق (===) بين
 * `computeWoodieCci(candles).cci` وaCCI(candles,14) المُستدعاة مباشرة، وبين `.turbo` وCCI(candles,6)،
 * عبر 300 شمعة عشوائية بذرة ثابتة بلا استثناء واحد — هوية رياضية بديهية بما أن الدالة استدعاء مباشر
 * بلا أي منطق إضافي. صفر NaN/Infinity (موروث من `computeCci` المتحقَّق مسبقاً). يُرسَم بإعادة استخدام
 * كاملة لنمط هستوغرام COG/TRIX/DPO (شريط عمودي مطبَّع بأقصى قيمة مطلقة لـCCI البطيء، bull/bear حسب
 * الإشارة)، مع تمييز بصري إضافي (حدّ لوني) حين يكون Turbo أعلى/أدنى من البطيء — نفس أسلوب تمييز حالة
 * squeezeOn أعلاه (شفافية/حدّ) بدل عنصر رسم جديد لخط ثانٍ منفصل.
 */
export function computeWoodieCci(
  candles: Candle[]
): { cci: (number | null)[]; turbo: (number | null)[] } {
  return { cci: computeCci(candles, 14), turbo: computeCci(candles, 6) };
}

/**
 * Connors RSI (CRSI(3,2,100)، لاري كونورز) — مؤشر شراء/بيع مفرط قصير المدى حديث نسبياً وشائع جداً
 * لدى المتداولين الفنيين المعاصرين (خلافاً لمعظم مؤشرات هذا الملف "الكلاسيكية")، مركَّب من متوسط
 * ثلاثة مكوّنات مستقلة كل منها على مدى 0..100 [المرجع: StockCharts ChartSchool + توثيق TradingView
 * الرسمي لـCRSI]:
 * 1. **RSI(3) قياسي على السعر** — **إعادة استخدام كاملة لـ`computeRsi` الموجودة مسبقاً** (period=3
 *    القيمة الافتراضية القياسية لهذا المكوّن تحديداً بكل المراجع).
 * 2. **RSI(2) مطبَّق على سلسلة "الاستمرارية" (streak) لا السعر نفسه** — الاستمرارية: عدّاد الأيام
 *    المتتالية صعوداً (قيمة موجبة تتزايد) أو هبوطاً (قيمة سالبة تتناقص)، ويُصفَّر تماماً عند تعادل
 *    الإغلاق مع السابق [قاعدة موثَّقة صراحة بمرجعَي TradingView وStockCharts]. **إعادة استخدام كاملة
 *    لـ`computeRsi` أيضاً** لكن مُطعَّمة بمصفوفة الاستمرارية بدل الإغلاق مباشرة (period=2 القياسي).
 * 3. **PercentRank(100) لتغيّر السعر اليومي (ROC نقطة واحدة)** — نسبة عدد قيم ROC بالنافذة السابقة
 *    (100 قيمة *قبل* النقطة الحالية مباشرة، لا تتضمّنها) الأقل صراحةً من ROC النقطة الحالية، ÷100×100.
 *    **قرار تصميم موثَّق بسبب غموض جزئي بالمصدر الأساسي**: عبارة StockCharts الحرفية "the percentage
 *    of PREVIOUS price changes that are lower than the most recent one" (نافذة *سابقة* منفصلة عن
 *    النقطة الحالية، لا نافذة تتضمّنها) — اختيار يسمح بمدى كامل 0..100 فعلياً (100% ممكنة حين تتجاوز
 *    النقطة الحالية كل الـ100 السابقة، بعكس بديل "نافذة تتضمّن ذاتها" الذي يحدّ الأقصى عملياً عند
 *    ((period−1)/period)×100=99%). حدود الإحماء: أول نقطة ROC صالحة index=1 (تحتاج إغلاقاً سابقاً)،
 *    فأول نافذة PercentRank كاملة عند index=rocPeriod+1=101.
 * النتيجة النهائية = متوسط المكوّنات الثلاثة، صالحة فقط حين تتوفر الثلاثة معاً (index≥101 بالقيم
 * الافتراضية — أعلى حدود إحماء من بين الثلاثة). عتبات تشبّع شرائي/بيعي معياريتان لهذا المؤشر تحديداً
 * (لا 70/30 كـRSI القياسي — نطاق أكثر تطرفاً لأن CRSI مصمَّم لعكس سريع قصير المدى): 90/10 [نفس القيم
 * المستخدَمة باستراتيجية كونورز الأصلية ومرجعَي التوثيق أعلاه]. **تحقّق حسابي فعلي (Node.js، قبل
 * الكتابة، للاثنين)**: سلسلة استمرارية مصنَّعة يدوياً (11 نقطة بأنماط صعود/هبوط/تعادل متعدّدة) →
 * تطابق تام حرفي مع القيم المتوقَّعة يدوياً لكل نقطة بلا استثناء واحد (صعود متتالٍ يتراكم +1/+2/+3،
 * هبوط يتراكم −1/−2، تعادل يصفّر فوراً)؛ نافذة PercentRank مصنَّعة (نقطة تتجاوز كل النافذة السابقة) →
 * 100 بالضبط؛ نقطة تقل عن كل النافذة → 0 بالضبط؛ 300 شمعة عشوائية بذرة ثابتة (rocPeriod=100 الفعلي)
 * → 199 نقطة صالحة بالضبط (300−101)، صفر NaN/Infinity، **صفر نقطة خارج المدى [0,100] عبر الجميع**
 * (محقَّق بنيوياً: كل مكوّن ثلاثي ضمن [0,100] فمتوسطها كذلك)؛ **إعادة حساب brute-force مستقلة تماماً
 * عن الدالة بخوارزمية مُعاد كتابتها من الصفر** (RSI تراكمي مُعاد بناؤه لكل نقطة، استمرارية مُعاد بناؤها
 * من البداية، PercentRank بحلقة منفصلة) لنقطة عشوائية (idx=250) طابقت مخرجات الدالة تماماً (فرق=0).
 * **تحقّق AST رسمي** صفر أخطاء.
 */
export function computeConnorsRsi(
  closes: number[],
  rsiPeriod = 3,
  streakPeriod = 2,
  rocPeriod = 100
): (number | null)[] {
  const n = closes.length;
  const rsiClose = computeRsi(closes, rsiPeriod);

  const streak: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (closes[i] > closes[i - 1]) {
      streak[i] = streak[i - 1] > 0 ? streak[i - 1] + 1 : 1;
    } else if (closes[i] < closes[i - 1]) {
      streak[i] = streak[i - 1] < 0 ? streak[i - 1] - 1 : -1;
    } else {
      streak[i] = 0;
    }
  }
  const rsiStreak = computeRsi(streak, streakPeriod);

  const roc: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1];
    roc[i] = prev === 0 ? 0 : ((closes[i] - prev) / prev) * 100;
  }

  const percentRank: (number | null)[] = new Array(n).fill(null);
  for (let i = rocPeriod + 1; i < n; i++) {
    const cur = roc[i];
    if (cur == null) continue;
    let below = 0;
    for (let w = i - rocPeriod; w <= i - 1; w++) {
      const v = roc[w];
      // `ta.percentrank` بـTradingView يعدّ ما هو ≤ الحالي: بفوركس هادئ كثير من ROC = 0 بالضبط، و`<` كان يُسقطها
      // فينزل CRSI حتى ~13 نقطة ويعبر 10/90 بغير توقيت المنصّة.
      if (v != null && v <= cur) below++;
    }
    percentRank[i] = (below / rocPeriod) * 100;
  }

  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const a = rsiClose[i];
    const b = rsiStreak[i];
    const c = percentRank[i];
    out[i] = a != null && b != null && c != null ? (a + b + c) / 3 : null;
  }
  return out;
}

/**
 * Chande Forecast Oscillator (CFO، Tushar Chande) — **إعادة استخدام حرفية كاملة لـ`computeLsma`
 * الموجودة أعلاه** (نفس تعريف "قيمة خط الانحدار الخطي عند الشمعة الحالية نفسها" — مطابق تماماً لتنفيذ
 * TradingView المدمج الرسمي لهذا المؤشر [`ta.linreg(close, length, 0)` بإزاحة صفر، أي القيمة عند x
 * الحالي لا توقّعاً للأمام، بعكس `computeTsf` أعلاه الذي يقيّم عند x=n أي نقطة واحدة بعد النافذة]،
 * period=14 (الافتراضي القياسي لهذا المؤشر تحديداً بمعظم المراجع بما فيها سكربت TradingView
 * المدمج). الصيغة: CFO[i] = (close[i] − lsma[i]) / close[i] × 100 — نسبة مئوية موقَّعة تقيس ابتعاد
 * السعر الفعلي عن خط اتجاهه الخطي القصير، بدون حدود تشبّع ثابتة (خلافاً لـRSI/CCI).
 * **تحقّق حسابي (بنيوي، فوق computeLsma المتحقَّقة سابقاً)**: سعر ثابت تماماً → lsma=السعر الثابت
 * لكل نقطة صالحة → CFO=0 بالضبط؛ مسار خطي بحت (period=14) → lsma[i] يطابق closes[i] تماماً (ملاءمة
 * مثالية على بيانات خطية) → CFO=0 بالضبط أيضاً لكل نقطة صالحة (تماماً كما هو متوقَّع رياضياً: انحراف
 * صفري عن خط اتجاه يطابقه السعر تماماً)؛ حراسة `close===0` صريحة لمنع القسمة على صفر.
 */
export function computeCfo(closes: number[], period = 14): (number | null)[] {
  const reg = computeLsma(closes, period);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    const r = reg[i];
    if (r == null) continue;
    const c = closes[i];
    out[i] = c === 0 ? 0 : ((c - r) / c) * 100;
  }
  return out;
}

/**
 * DeMarker (DeM، توم ديمارك) — مذبذب شائع بمنصات MT4/MT5 خصوصاً بالفوركس (مناسب مباشرة لتطبيق
 * souq-fx)، period=14 القيمة القياسية. يقارن أعلى/أدنى الشمعة الحالية بسابقتها مباشرة (لا الإغلاق
 * كـRSI): DeMax[i]=أعلى[i]>أعلى[i-1] ? الفرق : 0، DeMin[i]=أدنى[i-1]>أدنى[i] ? الفرق : 0 — **إعادة
 * استخدام حرفية كاملة لـ`sma()` المحلية** لتنعيم كلا المتسلسلتين (لا Wilder recursive كـRSI عمداً،
 * القيمة القياسية لهذا المؤشر تحديداً بكل مراجعه). DeM[i]=100×SMA(DeMax)/(SMA(DeMax)+SMA(DeMin)) —
 * نطاق [0,100] محصور رياضياً (كلا الحدّين ≥0)، مقياس على نفس مقياس RSI رغم اختلاف الصيغة جذرياً
 * (عتبتا تشبّع 70/30 القياسيتان لهذا المؤشر تطابقان عتبتَي RSI بالصدفة الرقمية لا بالقرابة الحسابية).
 * **قرار تصميم موثَّق**: denom=0 (لا حركة صاعدة ولا هابطة بأي شمعة بالنافذة) يُرجِع 50 بالضبط (حياد
 * متناظر، نفس منطق denom=0 بـTII أعلاه لا منطق avgLoss=0 بـRSI). DeMax[0]/DeMin[0]=0 صراحة (لا شمعة
 * سابقة للمقارنة، بنفس تعويض TR[0]=أعلى−أدنى المستخدَم أصلاً بـcomputeAtr أعلاه لمشكلة الحدّ الأول
 * المتماثلة). **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: أعلى/أدنى ثابتان تماماً (40
 * شمعة) → denom=0 → 50 بالضبط لكل نقطة صالحة (27 نقطة)؛ أعلى/أدنى صاعدان بثبات صارم → DeMin=0 دوماً
 * → 100 بالضبط لكل نقطة صالحة؛ نفس المسار معكوساً → DeMax=0 دوماً → 0 بالضبط؛ 300 شمعة عشوائية بذرة
 * ثابتة → صفر NaN/Infinity، كل قيمة ضمن [0,100] محقَّق بنيوياً؛ **إعادة حساب brute-force مستقلة
 * تماماً عن الدالة** لنقطة عشوائية (idx=150) طابقت تماماً (فرق<10⁻⁹).
 */
export function computeDemarker(candles: Candle[], period = 14): (number | null)[] {
  const n = candles.length;
  const demax: number[] = new Array(n).fill(0);
  const demin: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dHigh = candles[i].high - candles[i - 1].high;
    const dLow = candles[i - 1].low - candles[i].low;
    demax[i] = dHigh > 0 ? dHigh : 0;
    demin[i] = dLow > 0 ? dLow : 0;
  }
  const smaMax = sma(demax, period);
  const smaMin = sma(demin, period);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const mx = smaMax[i];
    const mn = smaMin[i];
    if (mx == null || mn == null) continue;
    const denom = mx + mn;
    out[i] = denom === 0 ? 50 : (100 * mx) / denom;
  }
  return out;
}

/**
 * Relative Momentum Index (RMI، روجر آلتمان) — امتداد لـRSI يستبدل فرق الإغلاق المتتالي (فارق يوم
 * واحد) بفارق زخم (momentum lookback) قابل للتخصيص، period=14/momentum=5 (القيمتان القياسيتان
 * الشائعتان لهذا المؤشر). **إعادة استخدام بنيوية كاملة حرفية لمنطق `computeRsi` أعلاه بالضبط** (نفس
 * تمهيد Wilder التراكمي avgGain/avgLoss، نفس قناع avgLoss=0→100) لكن على diff[i]=إغلاق[i]−إغلاق[i−
 * momentum] بدل إغلاق[i]−إغلاق[i−1] — **خاصية بنيوية مثبَتة**: RMI(period, momentum=1) يُطابق
 * RSI(period) تماماً (نفس الصيغة بالضبط عند momentum=1)، استُخدِمت هذه الخاصية كتحقّق أساسي. فترة
 * الإحماء = momentum+period−1 (بعكس period فقط لـRSI، لأن أول فارق زخم صالح يحتاج momentum شمعة
 * سابقة إضافية). **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: **تطابق مطلق (فرق<10⁻⁹)
 * بين computeRmi(closes,14,1) وcomputeRsi(closes,14) عبر 300 شمعة عشوائية بذرة ثابتة بكل نقطة بلا
 * استثناء واحد** (الاختبار الأقوى — يثبت صحة إعادة استخدام بنية RSI حرفياً)؛ سعر ثابت تماماً (60
 * نقطة، period=14/momentum=5) → avgLoss=0 دوماً → 100 بالضبط لكل نقطة صالحة (نفس قناع RSI)؛ 300
 * شمعة عشوائية (14/5 الفعليّين) → صفر NaN/Infinity، كل قيمة ضمن [0,100] محقَّق بنيوياً؛ **إعادة حساب
 * brute-force مستقلة تماماً عن الدالة** (حلقة تراكمية مُعاد كتابتها من الصفر) لنقطة عشوائية (idx=250)
 * طابقت تماماً (فرق<10⁻⁹).
 */
export function computeRmi(closes: number[], period = 14, momentum = 5): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  const firstIdx = momentum + period - 1;
  if (n <= firstIdx) return out;
  let gains = 0;
  let losses = 0;
  for (let i = momentum; i <= firstIdx; i++) {
    const d = closes[i] - closes[i - momentum];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[firstIdx] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = firstIdx + 1; i < n; i++) {
    const d = closes[i] - closes[i - momentum];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Pretty Good Oscillator (PGO، Mark Johnson) — مذبذب غير محدود المدى متمركز حول الصفر، period=14.
 * PGO[i]=(إغلاق[i]−SMA(إغلاق,period)[i])/ATR(period)[i] — **إعادة استخدام حرفية كاملة لـ`sma()`
 * المحلية و`computeAtr` الموجودة أعلاه بلا أي حساب مدى جديد** (نفس قرار إعادة الاستخدام المتبَع
 * لـcomputeKeltnerWidth/computeDonchianWidth أعلاه). **قرار موثَّق**: المرجع القياسي (Mark Johnson
 * الأصلي وTradeStation) يستخدم أحياناً EMA للمدى الحقيقي، لكن هذا الملف يعتمد `computeAtr` الموجودة
 * (تنعيم Wilder للمدى الحقيقي) حصراً لأنها نفس الأساس المستخدَم فعلاً بكل مؤشرات ATR الأخرى بالملف (Keltner،
 * SuperTrend، Chandelier Exit، Chande Kroll) — تناسق داخلي بدل تعريف ATR ثانٍ غير متوافق. عتبتا ±3
 * شائعتان بمراجع PGO لتشبّع شرائي/بيعي، لكن المدى نظرياً غير محدود. **قرار حارس**: ATR=0 (سوق مسطّح
 * تماماً) يُرجِع 0 بالضبط بدل Infinity/NaN. **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**:
 * شموع مسطّحة تماماً (أعلى=أدنى=إغلاق ثابت، 40 شمعة) → ATR=0 → 0 بالضبط لكل نقطة صالحة؛ مسار صاعد
 * بمدى يومي ثابت (60 شمعة) → كل القيم موجبة ومنتهية (الإغلاق فوق متوسطه المتأخر بسوق صاعد ثابت)؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة**
 * (SMA وATR مُعاد بناؤهما من الصفر بحلقتين منفصلتين) لنقطة عشوائية (idx=200) طابقت تماماً (فرق<10⁻⁹).
 */
export function computePgo(candles: Candle[], period = 14): (number | null)[] {
  const closes = candles.map((c) => c.close);
  const base = sma(closes, period);
  const atr = computeAtr(candles, period);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const b = base[i];
    const a = atr[i];
    if (b == null || a == null) continue;
    out[i] = a === 0 ? 0 : (closes[i] - b) / a;
  }
  return out;
}

/**
 * Inverse Fisher Transform لـRSI (IFT-RSI، جون إيلرز) — يعيد تشكيل RSI (مدى [0,100]، توزيع شبه
 * طبيعي حول 50 يجعل الانعكاسات تُقرأ متأخرة قرب المنتصف) لمخرج مضغوط بشدة قرب ±1 وممتد قرب 0،
 * فتصبح إشارات التشبّع/الانعكاس أوضح بصرياً (قفزة حادة بدل انزلاق تدريجي عبر خط الوسط). الصيغة
 * القياسية المبسَّطة الشائعة (إعادة استخدام كاملة لـcomputeRsi() المُصدَّرة أعلاه، بلا أي حساب RSI
 * جديد): v1 = 0.1×(RSI−50) [يُقلِّص RSI من [0,100] لمدى تقريبي [-5,5] حول الصفر]، ثم
 * IFT = (e^(2×v1)−1)/(e^(2×v1)+1) — هذه الصيغة مطابقة جبرياً لـtanh(v1) (نفس صيغة Fisher Transform
 * العامة المستخدَمة أعلاه بـcomputeFisherTransform لكن مُطبَّقة على RSI مباشرة بدل نسبة
 * أعلى-أدنى/مدى). محصورة نظرياً بصرامة داخل المجال المفتوح (−1,1) (خاصية tanh نفسها، لا تصل ±1 إلا
 * عند v1=±∞ نظرياً). **قرار تصميم موثَّق**: بعض المراجع (بناء إيلرز الأصلي) تُنعِّم RSI بـWMA(4) قبل
 * التحويل لتقليل الضوضاء؛ هنا استُخدِمت RSI الخام مباشرة (بلا تنعيم إضافي) لإبقاء التركيب بسيطاً
 * وقابلاً للتحقّق حتماً كتركيب مباشر فوق دالة موجودة مسبقاً بلا أي منطق تنعيم جديد. **تحقّق يدوي**:
 * سعر ثابت تماماً بكل الشموع → computeRsi يُعيد 100 بالضبط لكل نقطة صالحة (اتفاقية avgLoss=0⇒100
 * الموثَّقة أعلاه بـcomputeRsi نفسها، وليست قناعة جديدة هنا) → v1=0.1×(100−50)=5 → IFT=tanh(5)
 * ≈0.9999092 بالضبط (وليس 1 تماماً) لكل نقطة صالحة — يطابق كون IFT-RSI يرث قناعة RSI الخاصة بالسعر
 * الثابت حرفياً بدل إعادة تعريفها. مسار صاعد صارم بلا أي هبوطة واحدة → avgLoss=0 دائماً أيضاً بنفس
 * الاتفاقية → نفس القيمة الثابتة tanh(5) لكل نقطة (يطابق "قوة شرائية قصوى مستمرة" بالتعريف). تحقّق
 * حسابي فعلي (Node.js): 300 نقطة عشوائية بذرة ثابتة (صفر NaN/Infinity، كل قيمة صالحة ضمن (−1,1)
 * حصراً بلا استثناء) + مقارنة مباشرة بـMath.tanh() المدمَجة بلغة مختلفة تماماً عن صيغة الأُس المكتوبة
 * يدوياً هنا (فرق<10⁻⁹ لكل نقطة) — تحقّق هوية جبرية (e^(2x)-1)/(e^(2x)+1) ≡ tanh(x) بدل إعادة اشتقاق
 * RSI نفسها (موثوقة مسبقاً وغير مُعاد اختبارها هنا).
 */
export function computeInverseFisherRsi(closes: number[], period = 14): (number | null)[] {
  const rsi = computeRsi(closes, period);
  return closes.map((_, i) => {
    const r = rsi[i];
    if (r == null) return null;
    const v1 = 0.1 * (r - 50);
    const e = Math.exp(2 * v1);
    return (e - 1) / (e + 1);
  });
}

/**
 * WaveTrend Oscillator (WT1/WT2، شائع جداً بمجتمع TradingView تحت اسم "WaveTrend [LazyBear]") —
 * يقيس انحراف السعر النموذجي (typical price) عن نسخته المُنعَّمة EMA، مُطبَّعاً بمتوسط الانحراف
 * المطلق (مبدأ شبيه بـCCI لكن بتنعيم EMA متسلسل بدل SMA وحيدة). ap[i]=(أعلى+أدنى+إغلاق)/3 (نفس
 * صيغة computeTypicalPrice أعلاه حرفياً، محسوبة هنا محلياً لتفادي مصفوفة وسيطة). esa=EMA(ap,n1)
 * [n1=10 الافتراضي]. d=EMA(|ap−esa|,n1) (متوسط الانحراف المطلق عن esa، بنفس فترة esa). ci=(ap−esa)
 * /(0.015×d) [عامل 0.015 ثابت قياسي بالصيغة الأصلية، مطابق فعلياً لعامل تطبيع CCI 0.015 نفسه أعلاه
 * بـcomputeCci]. wt1=EMA(ci,n2) [n2=21 الافتراضي]. wt2=SMA(wt1,4) (خط إشارة أبطأ، بنفس فكرة
 * %D لـStochastic أو خط الإشارة بـMACD/PPO/APO أعلاه). **معالجة null كـPine**: |ap−esa| وci يبقيان null
 * ما دام esa أو d فارغين (ema تبذر من أوّل قيمة حقيقية) ⇒ wt1 يبدأ عند 2·n1+n2−3؛ ci=0 عند d=0 (حارس
 * قسمة على صفر صريح)؛ wt2 null إن كان wt1 نفسه null.
 * **تحقّق يدوي**: سعر/مدى ثابت تماماً (أعلى=أدنى=إغلاق ثابت لكل شمعة) → ap ثابت → esa=ap بالضبط بعد
 * التسخين (EMA لسلسلة ثابتة=نفس الثابت) → |ap−esa|=0 لكل نقطة صالحة
 * → d=EMA(أصفار,n1)=0 بعد تسخينه الخاص → ci محروس بصفر صراحة عند d=0 لكل نقطة (بلا
 * استثناء) → wt1=EMA(أصفار,n2)=0 بعد التسخين → wt2=SMA(أصفار,4)=0 — يطابق "لا انحراف زخمي بسعر
 * ساكن" بالتعريف تماماً لكلا الخطين معاً. تحقّق حسابي فعلي (Node.js): 300 شمعة عشوائية بذرة ثابتة
 * (صفر NaN/Infinity لكلا الخطين) + إعادة حساب brute-force مستقلة تماماً (حلقات EMA/SMA مُعاد كتابتها
 * من الصفر بمعزل عن ema()/sma() المحليتين الفعليتين) لكل نقطة صالحة طابقت تماماً (فرق<10⁻⁹) لكلا
 * الخطين معاً على كامل السلسلة، لا نقطة عشوائية واحدة فقط.
 */
export function computeWaveTrend(
  candles: Candle[],
  n1 = 10,
  n2 = 21
): { wt1: (number | null)[]; wt2: (number | null)[] } {
  const ap = candles.map((c) => (c.high + c.low + c.close) / 3);
  const esa = ema(ap, n1);
  // فراغ الإحماء يبقى null (لا أصفار) كـPine: ta.ema تبذر SMA من أوّل قيمة حقيقية ⇒ d وwt1 لا يبدآن
  // من صفر وهمي (كانت أوّل ~40 شمعة محمَّلة تنحرف بعيداً عن TradingView).
  const dRaw = ap.map((v, i) => (esa[i] == null ? null : Math.abs(v - esa[i]!)));
  const d = ema(dRaw, n1);
  const ciRaw = ap.map((v, i) => {
    const e = esa[i];
    const dv = d[i];
    if (e == null || dv == null) return null;
    if (dv === 0) return 0;
    return (v - e) / (0.015 * dv);
  });
  const wt1 = ema(ciRaw, n2);
  const wt2Raw = sma(wt1, 4);
  const wt2 = wt2Raw.map((v, i) => (wt1[i] == null || v == null ? null : v));
  return { wt1, wt2 };
}

/**
 * Cutler's RSI (نسخة توني كَتلر من RSI الأصلي لواطس وايلدر أعلاه بـcomputeRsi) — نفس صيغة RSI
 * تماماً (100−100/(1+avgGain/avgLoss)) لكن avgGain/avgLoss هنا **متوسط بسيط SMA لنافذة متدحرجة
 * ثابتة الطول** بدل تنعيم وايلدر التراكمي التكراري المستخدَم بـcomputeRsi (كل نقطة تُعاد حسابها من
 * الصفر لآخر period شمعة فقط، بلا أي "ذاكرة" لما قبل النافذة) — **نفس أسلوب النافذة المتدحرجة
 * المُعاد حسابها بالكامل لكل نقطة المستخدَم بـcomputeCmo أعلاه حرفياً** (حلقة w من i-period+1 إلى i)
 * بدل الصيغة التراكمية المستخدَمة بـRSI الأصلي. **الفرق العملي الموثَّق في الأدبيات**: RSI الأصلي
 * "يتذكّر" تأثير شموع قديمة جداً بوزن متضائل أُسّياً فلا يتلاشى أبداً بالكامل (تحيّز طفيف نحو تاريخ
 * السلسلة قبل أول نقطة حساب)، بينما نسخة Cutler متماثلة زمنياً تماماً (time-symmetric) — نفس النتيجة
 * بغضّ النظر عن نقطة بدء البيانات المتاحة، وهي بالضبط النقد الذي طرحه Cutler على الصيغة الأصلية.
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → كل الفروق صفرية بكل نافذة → avgGain=avgLoss=0 → محروس
 * بصفر صراحة (avgLoss=0⇒100)، **نفس اتفاقية RSI الأصلي بالضبط**، وليست قناعة جديدة هنا. مسار صاعد
 * صارم بلا أي هبوطة واحدة → avgLoss=0 دائماً بكل نافذة متدحرجة أيضاً → 100 بلا استثناء لكل نقطة
 * صالحة (يطابق سلوك RSI الأصلي لنفس المسار حرفياً، تحقّق تقاطع إضافي بين الصيغتين). تحقّق حسابي فعلي
 * (Node.js): 300 نقطة عشوائية بذرة ثابتة (صفر NaN/Infinity، كل قيمة ضمن [0,100] حصراً) + إعادة حساب
 * brute-force مستقلة تماماً (مصفوفتا gains/losses منفصلتان مبنيتان بحلقة مستقلة، لا حلقة النافذة
 * المتدحرجة المعاد حسابها بالتطبيق الفعلي) لكل نقطة صالحة على كامل السلسلة طابقت تماماً (فرق<10⁻⁹).
 */
export function computeCutlerRsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let sumGain = 0;
    let sumLoss = 0;
    for (let w = i - period + 1; w <= i; w++) {
      const d = closes[w] - closes[w - 1];
      if (d > 0) sumGain += d;
      else if (d < 0) sumLoss += -d;
    }
    const avgGain = sumGain / period;
    const avgLoss = sumLoss / period;
    out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

/**
 * Fractal Chaos Oscillator (بيل ويليامز) — إعادة تعبير كامل لمنطق computeFractals القائم بالأعلى
 * كأوسيليتور ثنائي القطبية منفصل بدل نقاط overlay: +1 عند تأكيد قمة كسورية بالفهرس نفسه (نفس شرط
 * `top[i] != null` الصارم بخماسية النافذة)، −1 عند تأكيد قاع كسوري (`bottom[i] != null`)، 0 خلاف
 * ذلك. **صفر منطق كشف جديد** — الدالة تستدعي computeFractals المتحقَّق منها سابقاً حرفياً وتعيد
 * تلوين نتيجتها فقط، بنفس روح استخراج computeAccumDist من صيغة computeChaikinOsc الداخلية سابقاً.
 * يُرسَم بنمط الهستوغرام ثنائي القطبية bull/bear الموجود أصلاً (نفس نمط bop/bullPower/bearPower
 * حرفياً) لأن المدى محصور رياضياً بـ{−1, 0, +1} بحكم البناء (لا يحتاج نمط رسم جديد). **تحقّق حسابي
 * فعلي (Node.js قبل الكتابة)**: نمط قمة-ثم-قاع صناعي (peak-then-valley) أعطى +1 بفهرس القمة
 * الكسورية بالضبط و−1 بفهرس القاع الكسوري بالضبط وصفر بكل مكان آخر؛ سوق مسطّح تماماً → صفر بكل
 * نقطة (لا فروق صارمة `>`/`<` ممكنة)؛ 300 شمعة عشوائية بذرة ثابتة → كل القيم ∈ {−1, 0, 1} بالضبط،
 * صفر NaN/Infinity.
 */
export function computeFractalChaosOsc(
  candles: Pick<Candle, 'high' | 'low'>[]
): (number | null)[] {
  const { top, bottom } = computeFractals(candles);
  return candles.map((_, i) => (top[i] != null ? 1 : bottom[i] != null ? -1 : 0));
}

/**
 * Trend Detection Index (TDI، إم. إتش. بي M.H. Pee، 1999) — يقيس هل السوق "يتّجه" حالياً أم "يتماوج"
 * (consolidation) عبر مقارنة مجموع الزخم الموجَّه (n-day sum of n-day momentum) بالفرق بين مجموعَي
 * الزخم المطلق على نافذتين متتاليتين (n و2n). **الصيغة القياسية** (period=20، multiple=2 الافتراضيان
 * — تأكيد صيغة عبر WebFetch من مرجعين مستقلّين قبل الكتابة: linnsoft.com [توثيق رسمي لـLinn Software]
 * ورزمة R الإحصائية TTR [`TDI()`، تطبيق برمجي مرجعي مفتوح المصدر]، كلاهما يطابق الصيغة حرفياً):
 * - mom[i] = إغلاق[i] − إغلاق[i−period] (زخم بفترة period، بلا تنعيم)
 * - momSum[i] = مجموع mom على آخر period نقطة (نافذة حديثة) — هذا هو خطّ **DI** (Direction Indicator)
 *   مباشرة (اتجاه موجَّه: موجب=صعود صافٍ، سالب=هبوط صافٍ خلال النافذة)
 * - momAbsSumShort[i] = مجموع |mom| على نفس النافذة الحديثة (period نقطة)
 * - momAbsSumLong[i] = مجموع |mom| على نافذة أطول (multiple×period نقطة، تشمل النافذة الحديثة ذاتها
 *   لا نافذة سابقة منفصلة — فرق جوهري عن TTF أعلاه الذي يقارن نافذتين متتاليتين غير متداخلتين)
 * - **TDI[i] = |momSum[i]| − (momAbsSumLong[i] − momAbsSumShort[i])**
 * أول فهرس صالح = multiple×period + period − 1 (يحتاج mom صالحاً لآخر multiple×period نقطة، وmom
 * نفسه يحتاج period نقطة سابقة) = 3×period−1 = 59 بالإعدادات الافتراضية. **بلا حدّ نظري صارم** (مثل
 * TTF أعلاه) — القراءة تقليدية: TDI موجب=اتّجاه فعلي، TDI سالب=تماوج/تذبذب عرضي (بحسب توثيق Pee
 * الأصلي المُقتبَس بكلا المرجعين). **بلا قسمة إطلاقاً بالصيغة** فلا حاجة لحارس صفر.
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (80 شمعة) →
 * mom=0 لكل نقطة ⇒ TDI=0 وDI=0 بالضبط لكل نقطة صالحة، أول فهرس صالح=59 بالضبط؛ **اتجاه خطي صارم
 * الانحدار** (100 نقطة، إغلاق[i]=i) → mom ثابت=period=20 لكل نقطة ⇒ momSum=momAbsSumShort=400،
 * momAbsSumLong=800 ⇒ TDI=400−(800−400)=0 بالضبط (حالة حدّية متوقَّعة رياضياً: زخم *ثابت* غير متغيّر
 * لا "يتسارع"، فيقع تماماً على حدّ الصفر بين الاتجاه والتماوج — يطابق التعريف النظري بدقة)؛ **اتجاه
 * متسارع** (150 نقطة، إغلاق[i]=0.01×i²) → TDI موجب ثابت تقريباً (~160) عند i=100/120/140 (زخم متزايد
 * فعلياً ⇒ اتجاه حقيقي مؤكَّد، بعكس الحالة الخطية أعلاه)؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) →
 * صفر NaN/Infinity لكلا الخطّين؛ **إعادة حساب brute-force مستقلة تماماً** (دالة معزولة تحسب mom عند
 * الطلب بلا مصفوفة وسيطة مشتركة) عند 5 فهارس متفرقة (70/100/150/220/299) → صفر اختلاف واحد لكلا
 * الخطّين (فرق<10⁻⁹).
 */
export function computeTdi(
  closes: number[],
  period = 20,
  multiple = 2
): { tdi: (number | null)[]; di: (number | null)[] } {
  const n = closes.length;
  const tdiOut: (number | null)[] = new Array(n).fill(null);
  const diOut: (number | null)[] = new Array(n).fill(null);
  const mom: (number | null)[] = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    mom[i] = closes[i] - closes[i - period];
  }
  const longPeriod = multiple * period;
  const start = longPeriod + period - 1;
  for (let i = start; i < n; i++) {
    let momSum = 0;
    let momAbsShort = 0;
    for (let j = i - period + 1; j <= i; j++) {
      momSum += mom[j]!;
      momAbsShort += Math.abs(mom[j]!);
    }
    let momAbsLong = 0;
    for (let j = i - longPeriod + 1; j <= i; j++) {
      momAbsLong += Math.abs(mom[j]!);
    }
    diOut[i] = momSum;
    tdiOut[i] = Math.abs(momSum) - (momAbsLong - momAbsShort);
  }
  return { tdi: tdiOut, di: diOut };
}

/**
 * Laguerre RSI (جون إهلرز John Ehlers، "Time Warp – Without Space Travel"، 2004) — بديل لـRSI
 * التقليدي يستخدم مرشِّح لاغير (Laguerre filter) رباعي المراحل بدل نافذة تدحرج ثابتة، فيتفاعل أسرع
 * مع تحوّلات السعر بضجيج أقل من RSI الكلاسيكي بنفس الفترة القصيرة. **الصيغة القياسية** (تأكيد صيغة
 * عبر WebFetch من **ثلاثة** مراجع مستقلّة قبل الكتابة — backtrader [توثيق مكتبة برمجية مفتوحة
 * المصدر رسمية]، easylanguagemastery.com، وsupport.instaforex.eu، **الثلاثة متطابقة حرفياً على شكل
 * التكرار وصيغة CU/CD**؛ gamma الافتراضية مؤكَّدة=0.5 بمرجعين من الثلاثة [backtrader/
 * easylanguagemastery] بينما يستخدم المرجع الثالث [instaforex، تطبيق MT4/MT5 محدَّد] gamma=0.7
 * كافتراضي مختلف خاص بتلك المنصّة — تباين موثَّق صريحاً هنا، اعتُمدت **0.5** كإجماع الأغلبية
 * ومطابقة كتاب إهلرز الأصلي؛ السعر المستخدَم=**الإغلاق** فقط، مؤكَّد حرفياً بمرجعين من الثلاثة):
 * L0[i]=(1−γ)×إغلاق[i]+γ×L0[i−1]، L1[i]=−γ×L0[i]+L0[i−1]+γ×L1[i−1]،
 * L2[i]=−γ×L1[i]+L1[i−1]+γ×L2[i−1]، L3[i]=−γ×L2[i]+L2[i−1]+γ×L3[i−1]. ثم CU/CD (تراكم صعود/نزول
 * لحظي) بمقارنة كل مرحلة بالتالية لها: L0≥L1؟ CU+=L0−L1 وإلا CD+=L1−L0 (وبالمثل L1↔L2 وL2↔L3).
 * **RSI النهائي = CU/(CU+CD)**، أو **1 صراحةً** إن كان CU+CD=0 (تعريف موثَّق حرفياً بكل الثلاثة
 * مراجع لهذه الحالة الحدّية) — محصور [0,1] رياضياً دوماً بحكم CU,CD≥0 دائماً بالتعريف (لا حاجة لحدّ
 * تقريبي كما ببعض مؤشرات الملف الأخرى، الحدّ هنا مضمون تماماً من شكل الصيغة نفسها). **بذر ذاتي عند
 * الشمعة الأولى** (نفس فلسفة `ema()` المحلية بالملف: L0[−1]=L1[−1]=L2[−1]=L3[−1]=إغلاق[0] لغياب أي
 * شمعة سابقة فعلية) — يجعل L0=L1=L2=L3=إغلاق[0] بالضبط عند i=0 (تبسيط جبري مباشر)، فCU=CD=0 وRSI[0]=1
 * بلا حاجة لفترة إحماء إطلاقاً (**أول فهرس صالح=0** بعكس معظم مؤشرات الملف الأخرى، بنفس استثناء
 * computeTwap الموثَّق أعلاه لغياب فترة إحماء بنيوية).
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (60 شمعة) →
 * كل المراحل L0..L3 تتقارب فوراً للسعر الثابت نفسه من الشمعة الأولى (بذر ذاتي) ⇒ RSI=1 بالضبط لكل
 * نقطة بلا استثناء؛ مسار صاعد صارم (100 نقطة) → RSI يقترب من 1 (~0.999+، "اتجاه صاعد قوي" بالتعريف)؛
 * 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity وصفر تجاوز لحدّي [0,1] عبر كل الـ300
 * نقطة؛ **إعادة حساب brute-force مستقلة تماماً** (حلقة L0..L3 معزولة تماماً بمتغيّرات خاصة بها، بلا
 * أي مشاركة حالة مع الدالة نفسها) عند 5 فهارس متفرقة (10/60/150/220/299) → صفر اختلاف واحد؛ حساسية
 * gamma (0.1/0.2/0.5/0.8/0.9) على سلسلة جيبية اصطناعية → كل القيم محصورة [0,1] بلا استثناء لكل قيم
 * gamma الخمس، صفر NaN. يُرسَم كپين مفرد بنمط RSI الكلاسيكي حرفياً (مقياس ثابت [0,1] بدل [0,100]،
 * خطوط عتبة 0.15/0.85 بدل 30/70 القياسية لـRSI الكلاسيكي — نفس النسبة التقليدية 15%/85% الموثَّقة
 * بمرجعي easylanguagemastery/instaforex لهذا المؤشر تحديداً، لا 30/70 المستعارة من RSI الكلاسيكي
 * بالخطأ).
 */
export function computeLaguerreRsi(closes: number[], gamma = 0.5): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n === 0) return out;
  let l0p = closes[0];
  let l1p = l0p;
  let l2p = l0p;
  let l3p = l0p;
  for (let i = 0; i < n; i++) {
    const price = closes[i];
    const l0 = (1 - gamma) * price + gamma * l0p;
    const l1 = -gamma * l0 + l0p + gamma * l1p;
    const l2 = -gamma * l1 + l1p + gamma * l2p;
    const l3 = -gamma * l2 + l2p + gamma * l3p;
    let cu = 0;
    let cd = 0;
    if (l0 >= l1) cu += l0 - l1;
    else cd += l1 - l0;
    if (l1 >= l2) cu += l1 - l2;
    else cd += l2 - l1;
    if (l2 >= l3) cu += l2 - l3;
    else cd += l3 - l2;
    out[i] = cu + cd === 0 ? 1 : cu / (cu + cd);
    l0p = l0;
    l1p = l1;
    l2p = l2;
    l3p = l3;
  }
  return out;
}
