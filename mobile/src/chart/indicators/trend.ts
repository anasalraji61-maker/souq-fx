/** مؤشرات الاتجاه والمتوسطات المتحركة المتقدمة (Trend / Moving-Average family). */
import type { Candle } from '../../api';
import { dema, ema, hma, sma, smma, tema, wma } from './moving-averages';
import { computeCmo, computeMacd, computeRsi, computeSmi } from './momentum';
import { computeAtr, computeKeltner } from './volatility';
import { computeAccumDist, computeKlinger, computeVpt } from './volume';


export function computeOverlays(closes: number[]) {
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema21 = ema(closes, 21);
  const wma20 = wma(closes, 20);
  const dema20 = dema(closes, 20);
  const tema20 = tema(closes, 20);
  const hma20 = hma(closes, 20);
  const mid = sma(closes, 20);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < 19) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - 19, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / 20;
    const sd = Math.sqrt(variance);
    upper.push(mean + 2 * sd);
    lower.push(mean - 2 * sd);
  }
  return {
    sma20,
    sma50,
    ema21,
    wma20,
    dema20,
    tema20,
    hma20,
    bbMid: mid,
    bbUpper: upper,
    bbLower: lower,
  };
}

/** ‎±DI‎ من مجموعَي Wilder — محروسة عند ‎sTr = 0‎ (لا حركة) فتُرجع 0. مشتركة بين ADX وDMI. */
function diOf(s: number, sT: number): number {
  return sT === 0 ? 0 : (s / sT) * 100;
}

/**
 * ADX (Average Directional Index، طريقة Wilder القياسية) — يقيس *قوة* الاتجاه بلا تحديد اتجاهه
 * (0..100، فوق 25 عادة = اتجاه واضح). +DM/−DM لكل شمعة من حركة القمة/القاع (الأكبر والموجب فقط
 * يُحتسَب)، TR كما بـcomputeAtr تماماً. تمهيد Wilder (القيمة الأولى = مجموع أول period، ثم
 * smoothed = smoothed − smoothed/period + جديد — نفس أسلوب computeRsi الحالي لكن مطبَّق على
 * ثلاث سلاسل بدل سلسلتين). DX = |+DI−−DI|/(+DI+−DI)×100 لكل نقطة، وADX = متوسط Wilder لـDX
 * (بداية = متوسط بسيط لأول period قيمة DX صالحة، أول ظهور فعلي عند المؤشر period×2−1 لأن DX نفسها
 * تبدأ من period). يعيد مصفوفة null حتى تتوفر بيانات كافية (n > period×2).
 */
export function computeAdx(candles: Candle[], period = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n <= period * 2) return out;

  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    );
  }

  let sTr = 0;
  let sPlus = 0;
  let sMinus = 0;
  for (let i = 1; i <= period; i++) {
    sTr += tr[i];
    sPlus += plusDM[i];
    sMinus += minusDM[i];
  }

  const dx: (number | null)[] = new Array(n).fill(null);
  let plusDI = diOf(sPlus, sTr);
  let minusDI = diOf(sMinus, sTr);
  dx[period] = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;

  for (let i = period + 1; i < n; i++) {
    sTr = sTr - sTr / period + tr[i];
    sPlus = sPlus - sPlus / period + plusDM[i];
    sMinus = sMinus - sMinus / period + minusDM[i];
    plusDI = diOf(sPlus, sTr);
    minusDI = diOf(sMinus, sTr);
    dx[i] = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
  }

  let sumDx = 0;
  let count = 0;
  for (let i = period; i < Math.min(n, period * 2); i++) {
    if (dx[i] != null) {
      sumDx += dx[i]!;
      count++;
    }
  }
  if (count === 0) return out;
  let adx = sumDx / count;
  out[period * 2 - 1] = adx;
  for (let i = period * 2; i < n; i++) {
    if (dx[i] != null) adx = (adx * (period - 1) + dx[i]!) / period;
    out[i] = adx;
  }
  return out;
}

/**
 * ADXR (Average Directional Movement Index Rating، وايلدر) — ليس مؤشراً مستقلاً جديداً رياضياً بل
 * **تنعيم إضافي لـcomputeAdx نفسها**: ADXR[i] = (ADX[i] + ADX[i−period])/2 (متوسط قيمة ADX الحالية
 * وقيمتها قبل `period` شمعة بالضبط، نفس `period` المستخدَم أصلاً لحساب ADX — القيمة القياسية 14).
 * الهدف: تخفيف تذبذب ADX نفسها لتمييز تغيّر قوة الاتجاه الفعلي عن الضوضاء قصيرة المدى — **إعادة
 * استخدام كاملة لـcomputeAdx** (استدعاء مباشر بلا أي منطق DI/DX جديد)، صفر حساب اتجاهي مستقل. يُقرأ
 * بنفس عتبات ADX تماماً (فوق 25 عادة = اتجاه قوي، تحت 20 = بلا اتجاه واضح). **تحقّق حسابي فعلي
 * (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة) → `computeAdx` نفسها ترجع فارغة
 * (n≤period×2) فـADXR فارغة أيضاً بالضرورة (حارس `adx[i]==null`)؛ اتجاه صاعد ثابت الخطوة (60 شمعة) →
 * ADXR يقترب من 100 بذيل السلسلة (يطابق ADX نفسها بقوة اتجاه قصوى)، وكل القيم ضمن [0,100] بالضبط
 * (خاصية موروثة جبرياً من كون ADXR متوسطاً حسابياً لقيمتي ADX، وكلتاهما ضمن [0,100] أصلاً)؛ 300 شمعة
 * عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity، 259 نقطة صالحة، وإعادة حساب brute-force مستقلة
 * (استدعاء `computeAdx` مستقلاً ثم حساب المتوسط يدوياً) عند idx=200 طابقت الدالة الفعلية بالضبط
 * (فرق=0).
 */
export function computeAdxr(candles: Candle[], period = 14): (number | null)[] {
  const adx = computeAdx(candles, period);
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (adx[i] == null) continue;
    const prior = i - period;
    if (prior < 0 || adx[prior] == null) continue;
    out[i] = (adx[i]! + adx[prior]!) / 2;
  }
  return out;
}

/**
 * Parabolic SAR (Stop And Reverse) — بترتيب `ta.sar` في TradingView حرفياً: نقطة تتبع السعر من الأسفل
 * خلال اتجاه صاعد ومن الأعلى خلال اتجاه هابط، بتسارع AF يبدأ من step ويزيد بمقدار step عند كل قمة/قاع
 * جديد حتى maxStep. الترتيب هو ما كان يخالف TradingView حول كل انعكاس:
 * 1. SAR = SAR + AF×(EP − SAR).
 * 2. **اختبار الانعكاس على هذه القيمة قبل القصّ** بقاع/قمة الشمعتين السابقتين (كان القصّ أولاً، فشمعة
 *    يخترق قاعُها SAR الخام ولا يخترق المقصوصة لا تعكس — أو العكس — والانعكاس يتأخّر أو يسبق شمعة).
 * 3. عند الانعكاس: SAR = max(أعلى الشمعة، EP) للهابط (min(أدنى، EP) للصاعد) — كانت EP وحدها، فنقطة أول
 *    شمعة هابطة تقع **تحت** قمة الشمعة التي عكست.
 * 4. تحديث EP وAF إلا بأول شمعة من اتجاه جديد.
 * 5. القصّ بقاع/قمة الشمعتين السابقتين (بعد الانعكاس أيضاً).
 * البداية: الشمعة الثانية؛ صاعد إن أغلقت **فوق** الأولى (التعادل هابط)، EP = أعلى/أدنى الثانية وSAR =
 * أدنى/أعلى الأولى. الأولى بلا قيمة. step=0.02/maxStep=0.2 القيمتان القياسيتان.
 */
export function computePsar(candles: Candle[], step = 0.02, maxStep = 0.2): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2) return out;
  let uptrend = candles[1].close > candles[0].close;
  let sar = uptrend ? candles[0].low : candles[0].high;
  let ep = uptrend ? candles[1].high : candles[1].low;
  let af = step;
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    let firstTrendBar = i === 1;
    sar = sar + af * (ep - sar);
    if (uptrend) {
      if (sar > c.low) {
        firstTrendBar = true;
        uptrend = false;
        sar = Math.max(c.high, ep);
        ep = c.low;
        af = step;
      }
    } else if (sar < c.high) {
      firstTrendBar = true;
      uptrend = true;
      sar = Math.min(c.low, ep);
      ep = c.high;
      af = step;
    }
    if (!firstTrendBar) {
      if (uptrend && c.high > ep) {
        ep = c.high;
        af = Math.min(maxStep, af + step);
      } else if (!uptrend && c.low < ep) {
        ep = c.low;
        af = Math.min(maxStep, af + step);
      }
    }
    if (uptrend) {
      sar = Math.min(sar, candles[i - 1].low);
      if (i > 1) sar = Math.min(sar, candles[i - 2].low);
    } else {
      sar = Math.max(sar, candles[i - 1].high);
      if (i > 1) sar = Math.max(sar, candles[i - 2].high);
    }
    out[i] = sar;
  }
  return out;
}

/**
 * Aroon Oscillator (AroonUp − AroonDown) — يقيس عمر آخر أعلى/أدنى داخل نافذة period+1 شمعة
 * (period للخلف + الشمعة الحالية). لكل نقطة: AroonUp = (بُعد أعلى قمة عن بداية النافذة / period)×100
 * (100 لو القمة هي الشمعة الحالية نفسها، 0 لو القمة أقدم شمعة بالنافذة)، وAroonDown بنفس المنطق
 * للقاع. الأوسيليتر = AroonUp − AroonDown (مدى -100..100: قرب 100 = اتجاه صاعد قوي وحديث، قرب
 * -100 = هابط قوي وحديث). عند تعادل عدة شموع بنفس القمة/القاع تُختار الأحدث (الأكثر شيوعاً بالتطبيقات
 * المرجعية) — خيار موثَّق صراحة هنا.
 */
export function computeAroonOsc(candles: Candle[], period = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let hiIdx = 0;
    let hiVal = -Infinity;
    let loIdx = 0;
    let loVal = Infinity;
    for (let w = 0; w <= period; w++) {
      const c = candles[i - period + w];
      if (c.high >= hiVal) {
        hiVal = c.high;
        hiIdx = w;
      }
      if (c.low <= loVal) {
        loVal = c.low;
        loIdx = w;
      }
    }
    const up = (hiIdx / period) * 100;
    const down = (loIdx / period) * 100;
    out.push(up - down);
  }
  return out;
}

/**
 * SuperTrend (period=10 وmultiplier=3 القيمتان القياسيتان الشائعتان) — خط تتبّع اتجاه بنفس روح
 * Parabolic SAR أعلاه (نقطة توقف/انعكاس واحدة تتبع السعر) لكن مبني على ATR بدل تسارع AF تراكمي.
 * لكل شمعة: basicUpper = (أعلى+أدنى)/2 + multiplier×ATR، basicLower = (أعلى+أدنى)/2 −
 * multiplier×ATR. الحد النهائي "ينزلق" باتجاه السعر فقط ولا يتراجع أبداً ضد الاتجاه الحالي
 * (finalUpper يقل فقط ما لم يخترق الإغلاق السابق الحد العلوي السابق، والعكس لـfinalLower) — هذا
 * ما يمنحه طابع "خط دعم/مقاومة متحرك لا يتراجع" المميّز لـSuperTrend. الاتجاه ينعكس فقط عند
 * اختراق الإغلاق للحد النهائي المقابل. **تبسيط تنفيذي موثَّق**: بدل تتبّع "هل SuperTrend[i-1] يساوي
 * FinalUpperBand[i-1] أو FinalLowerBand[i-1]" حرفياً (الصياغة المرجعية الشائعة)، تُستخدَم علامة
 * اتجاه منطقية `trendUp` (صعودي = يتتبّع الحد السفلي) — مكافئة رياضياً تماماً للصياغة المرجعية
 * (تحقّقت بالتتبّع اليدوي: كل شرط انعكاس بالصياغتين يؤدي لنفس القرار بالضبط)، وهي الأسلوب الشائع
 * بمكتبات مفتوحة المصدر معروفة لنفس المؤشر. يعيد أيضاً `up: boolean` لكل نقطة لتلوين النقاط
 * bull/bear بنفس فكرة تلوين پينات CCI/ROC/Aroon/CMF أعلاه.
 */
export function computeSuperTrend(
  candles: Candle[],
  period = 10,
  multiplier = 3
): { value: (number | null)[]; up: (boolean | null)[] } {
  const n = candles.length;
  const atr = computeAtr(candles, period);
  const value: (number | null)[] = new Array(n).fill(null);
  const up: (boolean | null)[] = new Array(n).fill(null);
  let finalUpper = 0;
  let finalLower = 0;
  let trendUp = true;
  let started = false;
  for (let i = 0; i < n; i++) {
    if (atr[i] == null) continue;
    const mid = (candles[i].high + candles[i].low) / 2;
    const basicUpper = mid + multiplier * atr[i]!;
    const basicLower = mid - multiplier * atr[i]!;
    if (!started) {
      finalUpper = basicUpper;
      finalLower = basicLower;
      // TradingView (`ta.supertrend`) يبدأ هابطاً دائماً (`_direction := 1` حين `na(atr[1])`) ولا ينقلب إلا
      // بإغلاق فوق الحدّ العلوي. كان `close >= hl2` ⇒ صاعد: نصف البدايات بلون وخطّ معاكسَين حتى أوّل انعكاس،
      // ومع تاريخ قصير (رمز جديد، فريم أسبوعي) تظهر تلك الفترة كلّها بالشارت.
      trendUp = false;
      value[i] = trendUp ? finalLower : finalUpper;
      up[i] = trendUp;
      started = true;
      continue;
    }
    const prevClose = candles[i - 1].close;
    finalUpper = basicUpper < finalUpper || prevClose > finalUpper ? basicUpper : finalUpper;
    finalLower = basicLower > finalLower || prevClose < finalLower ? basicLower : finalLower;
    if (trendUp && candles[i].close < finalLower) {
      trendUp = false;
    } else if (!trendUp && candles[i].close > finalUpper) {
      trendUp = true;
    }
    value[i] = trendUp ? finalLower : finalUpper;
    up[i] = trendUp;
  }
  return { value, up };
}

/**
 * TRIX (period=18 كـTradingView) — تغيّر (×10000) متوسط EMA مُطبَّق ثلاث مرات متتالية على **لوغاريتم** الإغلاق (**تبني بالضبط على نفس طبقات ema() المستخدَمة بـdema()/
 * tema() أعلاه بهذا الملف، بما فيها أسلوب تعويض null بصفر لحساب الطبقة التالية ثم بوابة صلاحية
 * بالقيمة الأصلية — تحمل نفس تحفّظ الإحماء الأولي الموثَّق مسبقاً لتلك الدوال، وليس افتراضاً
 * جديداً**)، لكن الناتج هنا نسبة *تغيّر* الطبقة الثالثة من شمعة لأخرى، لا دمجاً خطياً للطبقات
 * كـTEMA: TRIX[i] = (tripleEma[i] − tripleEma[i-1]) × 10000 (فرق لوغاريتمين ≈ نسبة التغيّر). صفر = ثبات زخم الاتجاه طويل المدى، موجب/سالب = تسارع/تباطؤ الاتجاه —
 * أكثر "تصفية" من MACD العادي (ثلاث طبقات EMA بدل طبقتين). **تحقّق منطقي**: لو الإغلاق ثابت تماماً
 * بعد انتهاء الإحماء، tripleEma تستقر على نفس القيمة الثابتة فيصبح الفرق صفراً → TRIX=0 (يطابق
 * "لا تغيّر بالزخم" لسعر ثابت تماماً).
 */
export function computeTrix(closes: number[], period = 18): (number | null)[] {
  // TradingView: `10000 * ta.change(ema(ema(ema(math.log(close), 18), 18), 18))`. كان EMA الإغلاق الخام
  // بفترة 15 ونسبة ×100 — قيمة أصغر 100 مرّة من TradingView وتقاطعات صفر على شموع أخرى.
  const e1 = ema(
    closes.map((c) => (c > 0 ? Math.log(c) : null)),
    period
  );
  const e2 = ema(e1, period);
  const e3 = ema(e2, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0 || e3[i] == null || e3[i - 1] == null) {
      out.push(null);
      continue;
    }
    out.push((e3[i]! - e3[i - 1]!) * 10000);
  }
  return out;
}

/**
 * Choppiness Index (CHOP، period=14 القيمة الشائعة) — يقيس "تذبذب بلا اتجاه" مقابل "اتجاه واضح" بمدى
 * ثابت 0..100 (بعكس أغلب مؤشرات هذا الملف غير المحدودة أو ثنائية القطبية): CHOP = 100×log10(مجموع
 * True Range على النافذة / (أعلى قمة−أدنى قاع بنفس النافذة)) ÷ log10(period). TR بنفس صيغة computeAtr/
 * computeAdx أعلاه حرفياً (High−Low، |High−إغلاق سابق|، |Low−إغلاق سابق|، الأكبر من الثلاثة). قرب 100
 * = تذبذب عالٍ بلا اتساع فعلي بالمدى الكلي (سوق "متعرّج" بلا اتجاه)، قرب 0 = اتجاه قوي وواضح (المدى
 * الكلي يتسع بسرعة نسبةً لمجموع التذبذب اليومي). صفر عند مدى كلي صفري بدل قسمة على صفر (حالة نظرية:
 * سعر ساكن تماماً بكل الشموع). **تحقّق يدوي**: لو كل شمعة تكرر نفس المدى الثابت R (أعلى=H وأدنى=L
 * ثابتان بكل شمعة، R=H−L) بلا أي اتساع أو تقدّم بالمدى الكلي عبر النافذة (كل الشموع متطابقة) — بما أن
 * الإغلاق السابق يقع دوماً ضمن [L,H] فإن TR لكل شمعة = R بالضبط (نفس منطق قناة كلتنر أعلاه)، فمجموع
 * TR على النافذة = period×R، وأعلى قمة−أدنى قاع بالنافذة كلها = R أيضاً (كل الشموع متطابقة) → النسبة =
 * period×R/R = period → CHOP = 100×log10(period)/log10(period) = 100 بالضبط — يطابق "أقصى تذبذب بلا
 * اتجاه فعلي" بتعريف المؤشر تماماً (100 = سوق متعرّج تماماً بلا أي اتساع صافٍ بالمدى).
 */
export function computeChoppiness(candles: Candle[], period = 14): (number | null)[] {
  const n = candles.length;
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tr[i] = candles[i].high - candles[i].low;
      continue;
    }
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    );
  }
  const logPeriod = Math.log10(period);
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumTr = 0;
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - period + 1; w <= i; w++) {
      sumTr += tr[w];
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    const span = hh - ll;
    out.push(span === 0 || logPeriod === 0 ? 0 : (100 * Math.log10(sumTr / span)) / logPeriod);
  }
  return out;
}

/**
 * Linear Regression Slope (LRS، period=14 نافذة شائعة) — انحدار خطي بسيط (Least Squares) لآخر period
 * سعر إغلاق، يُرجع *الميل* (Slope) فقط بلا نقطة تقاطع أو خط توقّع: يعامل كل نافذة كمحاور x=0..period-1
 * (0 لأقدم شمعة بالنافذة، period-1 للشمعة الحالية) وy=الإغلاق المقابل، ثم الميل القياسي = (n×Σxy −
 * Σx×Σy) / (n×Σx² − (Σx)²) حيث n=period وΣx/Σx² ثابتتان حسابياً لكل نافذة بنفس الحجم (لا تعتمدان على
 * قيم y إطلاقاً). ميل موجب = اتجاه صاعد بالنافذة الأخيرة (بمعدل سعر/شمعة)، سالب = هابط، قرب الصفر =
 * تسطّح. بعكس SMA/EMA (متوسطات تصف *المستوى*)، LRS يصف *معدل التغيّر الخطي* مباشرة — أقرب لصيغة ROC
 * لكن مبني على أفضل خط ملائم للنافذة كاملة بدل نقطتين طرفيتين فقط. **تحقّق يدوي**: سعر ثابت تماماً بكل
 * شموع النافذة (Σy=n×C لقيمة ثابتة C) → Σxy=C×Σx بالضبط (كل حد بالمجموع = x×C) → البسط = n×C×Σx −
 * Σx×n×C = 0 بالضبط بصرف النظر عن قيمة C → LRS=0، يطابق "لا اتجاه خطي فعلي بسعر ساكن تماماً" بالتعريف
 * تماماً.
 */
export function computeLinRegSlope(closes: number[], period = 14): (number | null)[] {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    out.push(denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom);
  }
  return out;
}

/**
 * Linear Regression R² (معامل التحديد، period=14 نفس نافذة LRS أعلاه) — يقيس *جودة* ملاءمة نفس خط
 * الانحدار الخطي لـLRS أعلاه لآخر period سعر إغلاق، بمدى 0..1 (1 = كل نقاط النافذة تقع تماماً على خط
 * مستقيم واحد، 0 = لا علاقة خطية إطلاقاً): يُحسَب الميل والتقاطع كما بـLRS تماماً (نفس محاور x=0..
 * period-1)، ثم SStot = Σ(y−ȳ)² (مجموع مربعات الانحراف عن المتوسط) وSSres = Σ(y−ŷ)² (مجموع مربعات
 * الخطأ عن خط الانحدار المتوقَّع ŷ=ميل×x+تقاطع)، وR² = 1 − SSres/SStot. **حالة حدّية موثَّقة صراحة**:
 * عند SStot=0 (كل قيم y بالنافذة متطابقة تماماً — سعر ساكن) تُرجَع 1 بدل 0/0 غير المعرَّفة، لأن خطاً
 * أفقياً ثابتاً يُفسِّر تلك النقاط المتطابقة *تماماً* بلا أي خطأ متبقٍّ (SSres=0 أيضاً بهذه الحالة) —
 * قرار توثيقي صريح يماثل أسلوب هذا الملف بمعالجة قسمة 0/0 بقيمة "الحالة المثالية" حيثما كان ذلك
 * التفسير الأدق (نفس روح إرجاع 100 لـRSI عند avgLoss=0 أعلاه). **تحقّق يدوي**: سعر ثابت تماماً بكل
 * شموع النافذة → ȳ=C، كل y=C → SStot=Σ(C−C)²=0 → (باستخدام نفس نتيجة LRS: ميل=0 وبالتالي ŷ=تقاطع=C
 * لكل x) → SSres=Σ(C−C)²=0 أيضاً → الحالة الحدّية أعلاه تُطبَّق: R²=1 بالضبط، يطابق "ملاءمة تامة لخط
 * أفقي مسطّح" بالتعريف تماماً.
 */
export function computeLinRegR2(closes: number[], period = 14): (number | null)[] {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const meanY = sumY / n;
    const meanX = sumX / n;
    const intercept = meanY - slope * meanX;
    let ssTot = 0;
    let ssRes = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      const yHat = slope * x + intercept;
      ssTot += (y - meanY) ** 2;
      ssRes += (y - yHat) ** 2;
    }
    out.push(ssTot === 0 ? 1 : 1 - ssRes / ssTot);
  }
  return out;
}

/**
 * LSMA (Least Squares Moving Average، period=25 نافذة قياسية) — overlay فوق اللوحة الرئيسية، يعيد
 * استخدام *نفس* صيغة الانحدار الخطي (sumX/sumX2/denom بالمحاور x=0..period-1 الثابتة حسابياً، وSumY/
 * sumXY لكل نافذة) المستخدَمة حرفياً بـcomputeLinRegSlope/computeLinRegR2 أعلاه، لكن بدل إرجاع الميل
 * أو R² فقط، LSMA يحسب أيضاً نقطة التقاطع (intercept = meanY − slope×meanX) ثم يُرجع القيمة *المتوقَّعة
 * عند نهاية النافذة* (ŷ عند x=period-1 = slope×(period-1) + intercept) — أي نقطة خط الانحدار المقابلة
 * لآخر شمعة بالنافذة تحديداً، لا الميل نفسه. بعكس SMA (متوسط بسيط لكل النافذة بلا وزن اتجاهي)، LSMA
 * "يتنبأ" بموقع آخر نقطة وفق أفضل خط مستقيم ملائم للنافذة كاملة، فيتبع الاتجاه بتأخر أقل من SMA بنفس
 * الفترة مع بقائه أنعم من الإغلاق الخام. **تحقّق يدوي**: سعر ثابت تماماً بكل شموع النافذة (C) → Σy=n×C،
 * سعر ثابت ⇒ Σxy=C×Σx (كما بـLinRegSlope) ⇒ slope=0 بالضبط ⇒ meanY=C، meanX=Σx/n ⇒ intercept=C−0×meanX=C
 * ⇒ ŷ=0×(period-1)+C=C بالضبط — يطابق SMA تماماً بهذه الحالة الخاصة فقط (سعر ساكن)، وهو السلوك الصحيح
 * المتوقَّع نظرياً (بلا اتجاه خطي، أفضل تنبؤ هو القيمة الثابتة نفسها).
 */
export function computeLsma(closes: number[], period = 25): (number | null)[] {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const meanY = sumY / n;
    const meanX = sumX / n;
    const intercept = meanY - slope * meanX;
    out.push(slope * (n - 1) + intercept);
  }
  return out;
}

/**
 * Time Series Forecast (TSF، مؤشر TradingView قياسي مباشر) — **إعادة استخدام حرفية كاملة لنفس بنية
 * الانحدار الخطي لـcomputeLsma أعلاه مباشرة** (نفس sumX/sumX2/denom/meanY/meanX/intercept، نفس نافذة
 * period=25 القياسية، نفس حارس الإحماء `i < period-1`) — **الفارق الوحيد**: LSMA يُقيِّم خط الانحدار
 * عند x=n-1 (آخر نقطة فعلية بالنافذة، أي الشمعة الحالية نفسها — "أين يقع الإغلاق الحالي على خط
 * الاتجاه")، بينما TSF يُقيِّمه عند x=n (نقطة واحدة *بعد* نهاية النافذة — "أين سيقع الإغلاق التالي لو
 * استمر الاتجاه الخطي الحالي بالضبط"، توقّع استقرائي حرفي لا قراءة للحالة الراهنة). **تحقّق حسابي فعلي
 * (Node.js، بيئة سحابية، قبل الكتابة)**: سعر ثابت تماماً → TSF=LSMA=السعر الثابت بكل نقطة (ميل=0، لا
 * فارق بين "الآن" و"القادم" على خط أفقي)؛ مسار صاعد خطي بحت (خطوة ثابتة 0.01، 60 نقطة، period=20) →
 * TSF[i] يطابق **القيمة الفعلية الحقيقية للشمعة التالية** closes[i+1] تماماً (فرق<10⁻⁹، استقراء مثالي
 * على بيانات خطية مثالية) لكل i صالح، وTSF عند آخر نقطة بالسلسلة يطابق الامتداد الخطي المتوقَّع رياضياً
 * (1.6 بالضبط)؛ 300 شمعة عشوائية بذرة ثابتة (period=25 الفعلية) → صفر NaN/Infinity، و**هوية جبرية
 * تحقَّقت مستقلة عن الدالتين معاً**: الفارق TSF[i]−LSMA[i] يطابق تماماً قيمة `slope` المُعاد حسابها
 * بشكل مستقل لنفس النافذة (فرق<10⁻¹⁵) — يؤكّد جبرياً أن TSF=LSMA+slope بالضبط، نتيجة مباشرة لتقييم
 * نفس الخط عند نقطة أبعد بمقدار وحدة x واحدة بالضبط. **قرار تكامل مهم**: خلافاً لـFractals/Pivot
 * Points High-Low/Net Volume أعلاه (قيمها دوماً ضمن مدى الشموع الفعلي)، TSF *يمتد فعلياً خارج* مدى
 * الأسعار المعروض بسوق قوي الاتجاه (توقّع مستقبلي حقيقي قد يتجاوز أعلى/أدنى قمة حالية) — يجب دفعه
 * لحساب autoscale السعري صراحةً (`range.forEach(push)` بـMatrixChart.tsx، بنفس أسلوب `lsma`/`vwma`
 * أعلاه بالضبط) وإلا يُقَصّ بصرياً عند حواف الشارت.
 */
export function computeTsf(closes: number[], period = 25): (number | null)[] {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const meanY = sumY / n;
    const meanX = sumX / n;
    const intercept = meanY - slope * meanX;
    out.push(slope * n + intercept);
  }
  return out;
}

/**
 * McGinley Dynamic (period=14 الافتراضي القياسي) — متوسط متكيّف يُسرِّع تلقائياً مع تسارع السعر
 * ويتباطأ مع تذبذبه بلا اتجاه، بعكس EMA/SMA ذات المعامل الثابت. الصيغة القياسية المنشورة:
 * MD[i] = MD[i-1] + (إغلاق[i]−MD[i-1]) / (period × (إغلاق[i]/MD[i-1])⁴). البذرة (seed) = SMA لأول
 * `period` إغلاق (نفس أسلوب تسخين ema() أعلاه)، ثم تكرار الصيغة اعتباراً من الفترة التالية.
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع (بما فيها فترة التسخين) → البذرة = السعر الثابت نفسه
 * (SMA لقيم متطابقة) → بكل تكرار لاحق: النسبة=1، المقام=period×1⁴=period، والبسط (إغلاق[i]−MD[i-1])
 * =0 → MD[i]=MD[i-1]+0=نفس السعر الثابت — يطابق "لا تكيّف مطلوب حين السعر ثابت" بالتعريف. حارس
 * دفاعي: لو المقام صفر (نادر جداً، يتطلب MD السابقة=0) يُستخدَم period مباشرة بدل القسمة على صفر.
 */
export function computeMcGinleyDynamic(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  const seed = sma(closes, period);
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (i === period - 1) {
      out.push(seed[i]);
      continue;
    }
    const prevMd = out[i - 1]!;
    const ratio = prevMd === 0 ? 0 : closes[i] / prevMd;
    const denom = period * ratio ** 4 || period;
    out.push(prevMd + (closes[i] - prevMd) / denom);
  }
  return out;
}

/**
 * Vertical Horizontal Filter (VHF، period=28 الافتراضي القياسي لصيغة Adam White الأصلية) — يقيس
 * "اتجاهية" السوق بمقارنة أقصى تحرّك صافٍ (HCP−LCP: أعلى/أدنى إغلاق بالنافذة) بأقصى مسار قطعته
 * الأسعار (مجموع القيم المطلقة لفروقات الإغلاق المتتالية بنفس النافذة) — النسبة محصورة رياضياً بين
 * 0 و1 دائماً (متباينة المثلث: التحرّك الصافي لا يتجاوز أبداً مجموع الخطوات المطلقة)، فتُرسم بنمط
 * پين محصور 0..100 بعد ضرب×100 (نفس نمط Choppiness Index أعلاه لكن بدلالة معكوسة — VHF مرتفع يعني
 * اتجاهاً قوياً، بعكس Choppiness المرتفع الذي يعني تذبذباً بلا اتجاه). **تحقّق يدوي**: سعر ثابت
 * تماماً بكل الشموع (بما فيها فترة التسخين) → HCP=LCP والمقام=0 أيضاً (كل الفروقات صفر) → حالة 0/0
 * مُعرَّفة صراحةً بالكود = صفر (لا اتجاه ولا تقلّب أصلاً)؛ سعر يزيد بمقدار ثابت d>0 كل شمعة بالنافذة
 * → HCP−LCP=(period−1)×d ومقام=period×d (كل فرق=d بالضبط) → VHF=(period−1)/period (أقرب لـ1 كلما
 * زاد period، يعكس اتجاهاً خطياً صافياً بالكامل بلا أي تراجع — أقصى قيمة ممكنة عملياً لهذا النمط).
 */
export function computeVhf(closes: number[], period = 28): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    const windowSlice = closes.slice(i - period + 1, i + 1);
    const hcp = Math.max(...windowSlice);
    const lcp = Math.min(...windowSlice);
    let denom = 0;
    for (let j = i - period + 1; j <= i; j++) {
      denom += Math.abs(closes[j] - closes[j - 1]);
    }
    out.push(denom === 0 ? 0 : (hcp - lcp) / denom);
  }
  return out;
}

/**
 * RAVI (Range Action Verification Index، Tushar Chande — فترتان قياسيتان شائعتان short=7/long=65)
 * — نسخة SMA من فكرة APO/PPO أعلاه (بدل طبقتي EMA): RAVI[i] = (SMA(short)[i] − SMA(long)[i]) /
 * SMA(long)[i] × 100 (صفر عند SMA(long) صفرية بدل قسمة على صفر). يقيس قوة الاتجاه الحالي نسبةً
 * لمتوسط أطول مدى — قيمة مطلقة كبيرة (عادة >3 كعتبة شائعة) تدل على اتجاه واضح، قرب الصفر يدل على
 * سوق عرضي (range-bound). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع (بما فيها فترة التسخين) →
 * SMA(short) وSMA(long) تستقران كلتاهما على نفس القيمة الثابتة بالضبط بعد كل فترة تسخين على حدة →
 * RAVI=(c−c)/c×100=0 بالضبط بمجرد توفّر كلا المتوسطين، يطابق "لا تباعد اتجاهي بسعر ساكن" بالتعريف.
 */
export function computeRavi(closes: number[], shortPeriod = 7, longPeriod = 65): (number | null)[] {
  const smaShort = sma(closes, shortPeriod);
  const smaLong = sma(closes, longPeriod);
  return closes.map((_, i) =>
    smaShort[i] != null && smaLong[i] != null
      ? smaLong[i] === 0
        ? 0
        : ((smaShort[i]! - smaLong[i]!) / smaLong[i]!) * 100
      : null
  );
}

/**
 * Vortex Indicator (+VI/−VI، period=14 القياسي) — يقيس اتجاه الحركة عبر مقارنة حركة الأعلى/الأدنى
 * الحالية بحركة السعر بالشمعة السابقة، منسوبة لمجموع المدى الحقيقي (TR) بنفس فترة التنعيم. لكل نقطة
 * (i≥1): +VM[i]=|أعلى[i]−أدنى[i-1]| (حركة صعودية محتملة)، −VM[i]=|أدنى[i]−أعلى[i-1]| (حركة هبوطية
 * محتملة)، TR[i] بنفس صيغة Wilder القياسية (نفس المستخدَمة بـcomputeAdx أعلاه حرفياً). كل خط =
 * مجموع متدحرج (نافذة period) لـVM المقابل / مجموع متدحرج لـTR بنفس النافذة — مدى نظري بلا سقف صارم
 * لكن يتمركز عملياً حول 1 (فوق 1 = زخم اتجاهي بذلك الجانب أقوى من التقلّب العام، تحت 1 = أضعف).
 * تقاطع +VI فوق −VI يُقرأ عادة كإشارة صعودية والعكس هبوطية. **أول مؤشر بالمشروع يحتاج نمط رسم پين
 * بخطّين مستقلّين متراكبَين فعلياً بنفس اللوحة** (لا خط واحد ولا هستوغرام) — كان مؤجَّلاً سابقاً لهذا
 * السبب بالذات (راجع ROADMAP.md، صف "التالي المرجَّح" بعدة تشغيلات). **تحقّق يدوي**: سعر ثابت تماماً
 * (أعلى=أدنى=إغلاق ثابت لكل شمعة) → +VM=−VM=0 لكل i (أعلى[i]−أدنى[i-1]=ثابت−ثابت=0) وTR=0 أيضاً
 * (كل الفروق صفرية) → القسمة على مجموع TR الصفري محروسة بصفر صراحةً (بدل NaN) لكلا الخطين، يطابق
 * "لا اتجاه بسعر ساكن" بالتعريف تماماً.
 */
export function computeVortex(
  candles: Candle[],
  period = 14
): { plus: (number | null)[]; minus: (number | null)[] } {
  const n = candles.length;
  const plusOut: (number | null)[] = new Array(n).fill(null);
  const minusOut: (number | null)[] = new Array(n).fill(null);
  if (n <= period) return { plus: plusOut, minus: minusOut };

  const plusVm: number[] = new Array(n).fill(0);
  const minusVm: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    plusVm[i] = Math.abs(candles[i].high - candles[i - 1].low);
    minusVm[i] = Math.abs(candles[i].low - candles[i - 1].high);
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    );
  }

  for (let i = period; i < n; i++) {
    let sPlus = 0;
    let sMinus = 0;
    let sTr = 0;
    for (let w = i - period + 1; w <= i; w++) {
      sPlus += plusVm[w];
      sMinus += minusVm[w];
      sTr += tr[w];
    }
    plusOut[i] = sTr === 0 ? 0 : sPlus / sTr;
    minusOut[i] = sTr === 0 ? 0 : sMinus / sTr;
  }
  return { plus: plusOut, minus: minusOut };
}

/**
 * Ichimoku Kinko Hyo (سحابة إيشيموكو) — نظام ياباني متكامل (خمسة خطوط) يجمع دعم/مقاومة ديناميكي
 * واتجاه وزخم بنظرة واحدة، الفترات القياسية 9/26/52/إزاحة 26. Tenkan-sen (خط التحويل، الأسرع) =
 * (أعلى قمة+أدنى قاع)/2 خلال 9 شموع (نفس منطق midpoint قناة Donchian أعلاه حرفياً، بفترة أقصر).
 * Kijun-sen (خط الأساس) = نفس الصيغة بفترة 26. Senkou Span A (الحد المتحرك الأسرع للسحابة) =
 * (Tenkan+Kijun)/2. Senkou Span B (الحد الأبطأ) = midpoint بفترة 52. **قرار تصميم واعٍ بخصوص
 * الإزاحة الزمنية** (موثَّق صراحة هنا لا نقصاً تقنياً — راجع ROADMAP.md صف "التالي المرجَّح بعد
 * Klinger"): إيشيموكو الأصلي يرسم Senkou A/B **متقدّمَين displacement شمعة إلى الأمام** (إسقاط
 * مستقبلي فوق مساحة فارغة بعد آخر شمعة) — محرك هذا المخطط لا يحجز تلك المساحة المستقبلية فعلياً،
 * فالتصميم المعتمَد هنا يحافظ بدلاً من ذلك على **محاذاة السحابة الصحيحة فوق السعر التاريخي**: عند
 * كل نقطة i، تُحسَب Span A/B الخام من نافذة منتهية عند i−(displacement−1) (لا i نفسها؛ الشمعة الحالية أولى الـ26 كـTradingView) ثم تُرسَم عند i
 * — نفس الأثر البصري الذي يراه المتداول للسحابة الحالية فوق السعر الحالي فعلياً، فقط بلا امتداد
 * لمساحة مستقبلية غير موجودة أصلاً بهذا المخطط (صارت موجودة: `lead` أدناه يُرسم بمنطقة المستقبل). Chikou Span (الخط المتأخر) = الإغلاق نفسه *مُزاح
 * displacement شمعة للخلف* (Chikou[i]=إغلاق[i+displacement−1]، يبقى ضمن حدود المصفوفة الحالية بعكس
 * Span A/B، بلا حاجة لأي قرار تصميم خاص — غير معرَّف فقط لآخر displacement شمعة كما بالتعريف
 * الأصلي تماماً، لعدم وجود إغلاق مستقبلي بعد لتلك النقاط). **تحقّق يدوي**: سعر ثابت تماماً
 * (أعلى=أدنى=إغلاق=P لكل شمعة) → أعلى قمة=أدنى قاع=P لأي نافذة → Tenkan=Kijun=P دائماً بعد
 * التسخين → Span A الخام=(P+P)/2=P وSpan B الخام=P أيضاً → بعد الإزاحة كلاهما يبقى P (قيمة ثابتة
 * من أي نقطة سابقة صالحة) → ارتفاع السحابة=Span A−Span B=0 بالضبط، يطابق "لا اتجاه/لا سحابة فعلية
 * بسعر ساكن" بالتعريف؛ Chikou[i]=إغلاق[i+displacement]=P أيضاً لنفس السبب.
 */
export function computeIchimoku(
  candles: Candle[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanBPeriod = 52,
  displacement = 26
): {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  spanA: (number | null)[];
  spanB: (number | null)[];
  chikou: (number | null)[];
  /** السحابة المُسقَطة يمين آخر شمعة: `lead.spanA[k]` تُرسم عند الخانة ‎n+k‎ (k < displacement−1). */
  lead: { spanA: (number | null)[]; spanB: (number | null)[] };
} {
  const n = candles.length;
  const midpoint = (period: number): (number | null)[] => {
    const out: (number | null)[] = new Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
      let hh = -Infinity;
      let ll = Infinity;
      for (let w = i - period + 1; w <= i; w++) {
        hh = Math.max(hh, candles[w].high);
        ll = Math.min(ll, candles[w].low);
      }
      out[i] = (hh + ll) / 2;
    }
    return out;
  };
  const tenkan = midpoint(conversionPeriod);
  const kijun = midpoint(basePeriod);
  const spanBRaw = midpoint(spanBPeriod);
  const spanARaw: (number | null)[] = candles.map((_, i) =>
    tenkan[i] != null && kijun[i] != null ? (tenkan[i]! + kijun[i]!) / 2 : null
  );

  const spanA: (number | null)[] = new Array(n).fill(null);
  const spanB: (number | null)[] = new Array(n).fill(null);
  const chikou: (number | null)[] = new Array(n).fill(null);
  // الإزاحة الفعلية displacement−1 كـTradingView (`offset = displacement - 1` للسحابة و`-displacement + 1`
  // للمتأخر: الشمعة الحالية هي الأولى من الـ26) — بـdisplacement كاملاً كانت السحابة كلها متأخرة شمعة عن
  // TradingView والمتأخر متقدّماً شمعة، فكل التواء للسحابة وحافّتها على شمعة غير شمعته.
  const shift = Math.max(0, displacement - 1);
  for (let i = 0; i < n; i++) {
    if (i >= shift) {
      spanA[i] = spanARaw[i - shift];
      spanB[i] = spanBRaw[i - shift];
    }
    if (i + shift < n) {
      chikou[i] = candles[i + shift].close;
    }
  }
  // ما بعد آخر شمعة: الخام من آخر `shift` شموع — TradingView يرسمه فوق منطقة المستقبل (السحابة القادمة).
  const lead = { spanA: [] as (number | null)[], spanB: [] as (number | null)[] };
  for (let k = 0; k < shift; k++) {
    const src = n - shift + k;
    lead.spanA.push(src >= 0 ? spanARaw[src] : null);
    lead.spanB.push(src >= 0 ? spanBRaw[src] : null);
  }
  return { tenkan, kijun, spanA, spanB, chikou, lead };
}

/**
 * Alligator (بيل ويليامز) — ثلاثة خطوط SMMA فوق السعر الوسيط (أعلى+أدنى)/2، بفترات وإزاحات قياسية
 * تُحاكي "فك/أسنان/شفاه" تمساح: Jaw (الفك، الأبطأ) = SMMA(13) مُزاح 8 للأمام، Teeth (الأسنان) =
 * SMMA(8) مُزاحة 5 للأمام، Lips (الشفاه، الأسرع) = SMMA(5) مُزاحة 3 للأمام. **نفس قرار التصميم
 * الموثَّق لـcomputeIchimoku أعلاه بالضبط** (إزاحة بمحاذاة تاريخية بدل إسقاط مستقبلي فارغ — محرك
 * الرسم لا يحجز مساحة بعد آخر شمعة): كل خط يُحسَب خاماً من السعر الوسيط بكامل التاريخ ثم يُزاح
 * بعرض القيمة الخام عند i−displacement عند النقطة i، بلا أي امتداد للمصفوفة. تباعد الخطوط الثلاثة
 * (لا تقاطع) يُقرأ تقليدياً كـ"تمساح مستيقظ" (اتجاه قوي)، وتشابكها كـ"تمساح نائم" (تذبذب بلا اتجاه)
 * — إعادة استخدام كاملة لنمط overlay متعدد الخطوط الموجود مسبقاً (sma20/ema21/wma20/إلخ أعلاه) بلا
 * أي كود رسم جديد فعلياً. **تحقّق يدوي**: سعر ثابت تماماً (أعلى=أدنى=P لكل شمعة) → السعر الوسيط=P
 * لكل نقطة → SMMA لأي فترة على سلسلة ثابتة P تبقى P بالضبط (بذرة SMA=P، وكل خطوة لاحقة
 * (P×(period−1)+P)/period=P أيضاً) → الخطوط الثلاثة الخام=P دائماً بعد التسخين، وبعد الإزاحة تبقى P
 * أيضاً (قيمة ثابتة من أي نقطة سابقة صالحة) — تشابك تام (لا تباعد) يطابق "لا اتجاه بسعر ساكن"
 * بالتعريف تماماً.
 */
export function computeAlligator(
  candles: Candle[],
  jawPeriod = 13,
  teethPeriod = 8,
  lipsPeriod = 5,
  jawShift = 8,
  teethShift = 5,
  lipsShift = 3
): { jaw: (number | null)[]; teeth: (number | null)[]; lips: (number | null)[] } {
  const n = candles.length;
  const median = candles.map((c) => (c.high + c.low) / 2);
  const jawRaw = smma(median, jawPeriod);
  const teethRaw = smma(median, teethPeriod);
  const lipsRaw = smma(median, lipsPeriod);
  const shiftSeries = (raw: (number | null)[], shift: number): (number | null)[] => {
    const out: (number | null)[] = new Array(n).fill(null);
    for (let i = shift; i < n; i++) {
      out[i] = raw[i - shift];
    }
    return out;
  };
  return {
    jaw: shiftSeries(jawRaw, jawShift),
    teeth: shiftSeries(teethRaw, teethShift),
    lips: shiftSeries(lipsRaw, lipsShift),
  };
}

/**
 * Williams Fractals (بيل ويليامز) — نافذة خمس شموع مركزية: الشمعة الوسطى[i] تُصبح **قمة كسورية**
 * (top fractal) إن كانت قمتها (high) أعلى صراحةً من قمم الشمعتين على كل جانب (i−2،i−1،i+1،i+2)،
 * و**قاع كسورياً** (bottom fractal) إن كان قاعها (low) أدنى صراحةً من قيعان نفس الأربع شموع
 * المجاورة — تعريف قياسي شائع لتحديد نقاط تحوّل هيكلية محلية (swing highs/lows)، يُستخدَم عادة كمرجع
 * لرسم مستويات دعم/مقاومة أو لبناء مؤشرات لاحقة (مثل Alligator نفسه تاريخياً). القيمة المُعادة عند
 * نقطة الكسر هي السعر الفعلي (high أو low) لا مجرد علامة boolean، بنفس اصطلاح مصفوفات النقاط
 * الأخرى بالملف (psar/medianPrice ونحوها) — تسهيلاً لرسمها مباشرة كعلامة فوق/تحت الشمعة. أول/آخر
 * شمعتين دائماً null (لا نافذة كاملة كافية حولهما). **تحقّق يدوي**: قمة واحدة وسط تسلسل صاعد-هابط
 * متماثل (V مقلوبة) → قمة كسورية واحدة بالضبط عند نقطة الذروة، صفر قيعان؛ تسلسل صاعد بحت بالكامل
 * (كل شمعة أعلى من سابقتها) → صفر قمم/قيعان كسورية (لا شمعة أعلى فعلياً من الشمعتين اللاحقتين لها)؛
 * سلسلة مسطّحة تماماً → صفر (المقارنة صارمة `>`/`<` لا `>=`/`<=`، فالتعادل لا يُحتسَب كسوراً) — تحقَّق
 * الأربعة حسابياً بسكربت Node.js فعلي (300 شمعة عشوائية بذرة ثابتة أيضاً: صفر NaN/Infinity، كل قيمة
 * غير null تطابق high/low الفعلي لنفس الشمعة تماماً).
 */
export function computeFractals(
  candles: Pick<Candle, 'high' | 'low'>[]
): { top: (number | null)[]; bottom: (number | null)[] } {
  const n = candles.length;
  const top: (number | null)[] = new Array(n).fill(null);
  const bottom: (number | null)[] = new Array(n).fill(null);
  for (let i = 2; i < n - 2; i++) {
    const h = candles[i].high;
    if (
      h > candles[i - 2].high &&
      h > candles[i - 1].high &&
      h > candles[i + 1].high &&
      h > candles[i + 2].high
    ) {
      top[i] = h;
    }
    const l = candles[i].low;
    if (
      l < candles[i - 2].low &&
      l < candles[i - 1].low &&
      l < candles[i + 1].low &&
      l < candles[i + 2].low
    ) {
      bottom[i] = l;
    }
  }
  return { top, bottom };
}

/**
 * Gator Oscillator (بيل ويليامز) — مبني فوق خطوط Alligator (jaw/teeth/lips بعد إزاحتها الزمنية
 * القياسية، تُمرَّر جاهزة بدل إعادة حسابها). الهستوغرام العلوي = |Jaw−Teeth| (فوق الصفر دائماً)،
 * السفلي = −|Teeth−Lips| (تحت الصفر دائماً). اللون عند الرسم يعتمد على upperGrowing/lowerGrowing:
 * أخضر إن كانت القيمة المطلقة أكبر من الشمعة السابقة (الفارق يتّسع)، أحمر إن كانت أصغر أو مساوية
 * (الفارق ينكمش أو ثابت) — نفس منطق TradingView القياسي لـGator.
 * تحقّق يدوي: سعر ثابت تماماً → jaw=teeth=lips متطابقة (SMMA لسلسلة ثابتة = نفس الثابت) → upper=0
 * وlower=0 لكل نقطة صالحة، وgrowing=false دائماً (0 > 0 خطأ) — لا اتساع افتراضي بلا حركة سعر.
 */
export function computeGator(
  jaw: (number | null)[],
  teeth: (number | null)[],
  lips: (number | null)[]
): {
  upper: (number | null)[];
  lower: (number | null)[];
  upperGrowing: (boolean | null)[];
  lowerGrowing: (boolean | null)[];
} {
  const n = jaw.length;
  const upper: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    upper[i] = jaw[i] != null && teeth[i] != null ? Math.abs(jaw[i]! - teeth[i]!) : null;
    lower[i] = teeth[i] != null && lips[i] != null ? -Math.abs(teeth[i]! - lips[i]!) : null;
  }
  const upperGrowing: (boolean | null)[] = upper.map((v, i) => {
    if (v == null || i === 0 || upper[i - 1] == null) return null;
    return v > upper[i - 1]!;
  });
  const lowerGrowing: (boolean | null)[] = lower.map((v, i) => {
    if (v == null || i === 0 || lower[i - 1] == null) return null;
    return Math.abs(v) > Math.abs(lower[i - 1]!);
  });
  return { upper, lower, upperGrowing, lowerGrowing };
}

/**
 * VWMA (Volume Weighted Moving Average، period=20 افتراضياً) — نفس فكرة SMA العادية لكن كل إغلاق
 * ضمن النافذة يُرجَّح بحجمه الخاص بدل وزن متساوٍ للجميع: VWMA[i] = Σ(إغلاق×فوليوم)/Σ(فوليوم) على
 * آخر period شمعة. فوليوم مفقود يُعوَّض بنفس صيغة computeVpt/computeKlinger أعلاه للاتساق. يُرسَم
 * فوق اللوحة الرئيسية بنمط نقاط weightedClose/mcginley/lsma (overlay سعر بديل بلا pane خاص).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع (أي حجم) → Σ(P×فوليوم)=P×Σ(فوليوم) → VWMA=P بالضبط
 * لكل نقطة صالحة، بغضّ النظر عن توزيع الفوليوم — يطابق "متوسط مرجَّح لسعر ثابت هو نفسه" رياضياً.
 */
export function computeVwma(
  candles: (Candle & { volume?: number })[],
  period = 20
): (number | null)[] {
  const n = candles.length;
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let sumPv = 0;
    let sumV = 0;
    for (let w = i - period + 1; w <= i; w++) {
      sumPv += candles[w].close * vol[w];
      sumV += vol[w];
    }
    out[i] = sumV === 0 ? candles[i].close : sumPv / sumV;
  }
  return out;
}

/**
 * ALMA (Arnaud Legoux Moving Average، period=9/sigma=6/offset=0.85 القيم القياسية الشائعة بمعظم
 * المنصات) — متوسط متحرك مرجَّح بأوزان جرسية (Gaussian) بدل الأوزان الخطية لـwma() المحلية أعلاه:
 * لكل نافذة period، m=offset×(period−1) (موضع ذروة الجرس ضمن النافذة، قريب من النهاية الحديثة
 * بـoffset=0.85 لتقليل التأخر)، s=period/sigma (اتساع الجرس)، وزن[j]=exp(−(j−m)²/(2s²)) لكل موضع
 * j=0..period−1 ضمن النافذة، القيمة النهائية = Σ(وزن[j]×سعر[i−period+1+j])/Σ(وزن[j]). يجمع فعلياً
 * بين نعومة SMA واستجابة EMA بفضل توزيع الوزن الجرسي بدل الخطي أو الأسّي. يُرسَم بنمط نقاط overlay
 * كباقي المتوسطات أعلاه (sma20/ema21/wma20...). **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → كل
 * حد بالمجموع = وزن[j]×P → المجموع = P×Σ(وزن[j]) → ALMA = P×Σ(وزن[j])/Σ(وزن[j]) = P بالضبط لكل
 * نقطة صالحة، بغضّ النظر عن توزيع الأوزان الجرسي — يطابق "متوسط مرجَّح لسعر ثابت هو نفسه" رياضياً،
 * نفس منطق VWMA أعلاه تماماً.
 */
export function computeAlma(
  closes: number[],
  period = 9,
  sigma = 6,
  offset = 0.85
): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  const m = offset * (period - 1);
  const s = period / sigma;
  const weights: number[] = new Array(period);
  let wSum = 0;
  for (let j = 0; j < period; j++) {
    const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
    weights[j] = w;
    wSum += w;
  }
  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += weights[j] * closes[i - period + 1 + j];
    }
    out[i] = wSum === 0 ? closes[i] : sum / wSum;
  }
  return out;
}

/**
 * Chande Kroll Stop (period=10/atrMult=1/qPeriod=9 القيم القياسية) — نطاق وقف حماية ديناميكي
 * (بعكس Keltner/Donchian المصمَّمين كقنوات تداول لا مستويات وقف) يُبنى على مرحلتين: (1) أول حد
 * علوي=أعلى قمة خلال period شمعة + atrMult×computeAtr(candles, period) [إعادة استخدام مباشرة
 * لـcomputeAtr المُصدَّرة أعلاه]، أول حد سفلي=أدنى قاع خلال نفس النافذة − نفس المضاعف×ATR. (2) الحد
 * النهائي العلوي (shortStop، مقاومة لصفقات البيع)=أعلى قيمة لأول حد علوي خلال آخر qPeriod شمعة،
 * والحد النهائي السفلي (longStop، دعم لصفقات الشراء)=أدنى قيمة لأول حد سفلي خلال نفس qPeriod —
 * نفس منطق أعلى/أدنى قمة/قاع متدحرج المستخدَم بـcomputeDonchian أعلاه، مطبَّق هنا على سلسلة
 * "الحد الأول" بدل السعر الخام مباشرة. يُرسَم بنمط الشريط العمودي شبه الشفاف الموجود مسبقاً
 * لـkeltner/envelopes/donchian حرفياً (لون تيل الهوية `rgba(45,212,191,0.16)` لتمييزه كمستوى وقف).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع (أعلى=أدنى=إغلاق=P) → computeAtr يُرجع 0 بعد التسخين
 * (TR=0 لكل شمعة بسعر ساكن، نفس منطق التحقّق اليدوي لـcomputeKeltner/computeChoppiness أعلاه) → أول
 * حد علوي=P+1×0=P، أول حد سفلي=P−0=P لكل نقطة صالحة → أعلى/أدنى قيمة متدحرجة لسلسلة ثابتة P=P →
 * shortStop=longStop=P بالضبط، يطابق "لا اتساع لمستوى الوقف بلا أي تقلّب فعلي" بالتعريف.
 */
export function computeChandeKrollStop(
  candles: Candle[],
  period = 10,
  atrMult = 1,
  qPeriod = 9
): { longStop: (number | null)[]; shortStop: (number | null)[] } {
  const n = candles.length;
  const atr = computeAtr(candles, period);
  const firstHigh: (number | null)[] = new Array(n).fill(null);
  const firstLow: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    if (atr[i] == null) continue;
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - period + 1; w <= i; w++) {
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    firstHigh[i] = hh + atrMult * atr[i]!;
    firstLow[i] = ll - atrMult * atr[i]!;
  }
  const longStop: (number | null)[] = new Array(n).fill(null);
  const shortStop: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1 + qPeriod - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    let valid = true;
    for (let w = i - qPeriod + 1; w <= i; w++) {
      if (firstHigh[w] == null || firstLow[w] == null) {
        valid = false;
        break;
      }
      hh = Math.max(hh, firstHigh[w]!);
      ll = Math.min(ll, firstLow[w]!);
    }
    if (!valid) continue;
    shortStop[i] = hh;
    longStop[i] = ll;
  }
  return { longStop, shortStop };
}

/**
 * DMI (Directional Movement Index، +DI/−DI منفصلَين — period=14 القيمة القياسية) — computeAdx
 * أعلاه يحسب plusDI/minusDI داخلياً لكل شمعة (بتمهيد Wilder القياسي لـTR/+DM/−DM) لكن لا يُرجعهما،
 * فقط ADX النهائي (تمهيد إضافي لـDX=فرق DI المطلق/مجموعهما). هذه الدالة **مستقلة عمداً** تعيد نفس
 * حساب +DI/−DI بنفس صيغة computeAdx حرفياً (لا استدعاء له ولا تعديل عليه — نفس نمط ازدواجية منطق
 * TR/Wilder المقبول أصلاً بهذا الملف بين computeAtr/computeAdx/computePsar قبل استخراج smma()
 * كدالة مشتركة) لكن تكشف +DI/−DI الخام كخطّين مستقلّين — القراءة القياسية بمعظم المنصات لاتجاه
 * القوة الصاعدة/الهابطة قبل تلخيصها بخط ADX الواحد. يُرسَم بنفس **نمط الپين ثنائي الخط** المستخدَم
 * لـcomputeVortex أعلاه حرفياً (+DI بلون الصعود، −DI بلون الهبوط — نفس الدلالة الاتجاهية تماماً).
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع (أعلى=أدنى=إغلاق ثابت) → upMove=أعلى[i]−أعلى[i-1]=0
 * وdownMove=أدنى[i-1]−أدنى[i]=0 لكل i → plusDM=minusDM=0 دائماً (الشرط `>0` يرفض الصفر) وTR=0 أيضاً
 * (نفس منطق التحقّق اليدوي لـcomputeAtr/computeChoppiness أعلاه) → sPlus=sMinus=sTr=0 بعد التسخين →
 * diOf محروسة صراحةً عند sTr=0 فتُرجع 0 → plusDI=minusDI=0 بالضبط، يطابق "لا حركة اتجاهية بسعر
 * ساكن تماماً" بالتعريف.
 */
export function computeDmi(
  candles: Candle[],
  period = 14
): { plusDI: (number | null)[]; minusDI: (number | null)[] } {
  const n = candles.length;
  const plusDI: (number | null)[] = new Array(n).fill(null);
  const minusDI: (number | null)[] = new Array(n).fill(null);
  if (n <= period) return { plusDI, minusDI };

  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    );
  }

  let sTr = 0;
  let sPlus = 0;
  let sMinus = 0;
  for (let i = 1; i <= period; i++) {
    sTr += tr[i];
    sPlus += plusDM[i];
    sMinus += minusDM[i];
  }
  plusDI[period] = diOf(sPlus, sTr);
  minusDI[period] = diOf(sMinus, sTr);

  for (let i = period + 1; i < n; i++) {
    sTr = sTr - sTr / period + tr[i];
    sPlus = sPlus - sPlus / period + plusDM[i];
    sMinus = sMinus - sMinus / period + minusDM[i];
    plusDI[i] = diOf(sPlus, sTr);
    minusDI[i] = diOf(sMinus, sTr);
  }
  return { plusDI, minusDI };
}

/**
 * Chandelier Exit (تشاندلير إكزيت، period=22/atrMult=3 القيم القياسية الشائعة بمعظم المنصات) —
 * نطاق وقف تتبّعي مبني مباشرة فوق computeAtr المُصدَّرة أعلاه (إعادة استخدام مباشرة، بلا مرحلتين
 * كـcomputeChandeKrollStop أعلاه — صيغة مباشرة أحادية المرحلة): longStop=أعلى قمة خلال period شمعة
 * −atrMult×computeAtr(candles, period)، shortStop=أدنى قاع خلال نفس النافذة +atrMult×نفس الـATR.
 * يُرسَم بنفس نمط الشريط العمودي شبه الشفاف المستخدَم لـkeltner/envelopes/donchian/chandeKroll أعلاه
 * (لون برتقالي فاتح غير مستخدَم سابقاً `rgba(253,186,116,0.16)` لتمييزه عن تيل Chande Kroll، ونفس
 * حراسة الترتيب top/bottom المستخدَمة أصلاً لـichimoku spanA/spanB أدناه بالملف الآخر لأن shortStop
 * وlongStop غير مضمونَين بالترتيب رياضياً هنا خلافاً لـChande Kroll ذي المرحلتين).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → computeAtr=0 بعد التسخين (نفس منطق التحقّق اليدوي
 * لـcomputeChandeKrollStop/computeKeltner أعلاه) → أعلى قمة=أدنى قاع=P لأي نافذة → longStop=
 * P−atrMult×0=P، shortStop=P+0=P بالضبط لكل نقطة صالحة، يطابق "لا اتساع لوقف تتبّعي بلا أي تقلّب
 * فعلي" بالتعريف — تحقَّق بتشغيل Node.js فعلي (سعر ثابت + 300 شمعة عشوائية، صفر NaN/Infinity).
 */
export function computeChandelierExit(
  candles: Candle[],
  period = 22,
  atrMult = 3
): { longStop: (number | null)[]; shortStop: (number | null)[] } {
  const n = candles.length;
  const atr = computeAtr(candles, period);
  const longStop: (number | null)[] = new Array(n).fill(null);
  const shortStop: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    if (atr[i] == null) continue;
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - period + 1; w <= i; w++) {
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    longStop[i] = hh - atrMult * atr[i]!;
    shortStop[i] = ll + atrMult * atr[i]!;
  }
  return { longStop, shortStop };
}

/**
 * GMMA (Guppy Multiple Moving Average، دارِل غابي — مجموعتان قياسيتان: قصيرة [3,5,8,10,12,15]
 * تعكس نشاط المتداولين قصيري الأمد، طويلة [30,35,40,45,50,60] تعكس المستثمرين طويلي الأمد) — أول
 * overlay بالمشروع يعيد استخدام ema() المحلية 12 مرة دفعة واحدة بدل خط/زوج خطوط واحد (نفس الدالة
 * المستخدَمة أصلاً بـema21 والتنعيم المزدوج لـcomputeTsi/computeSmi أعلاه، بلا أي منطق جديد). تقارب/
 * تباعد المجموعتين (لا كل خط منفرد) هو ما يُقرَأ عادة: تشابك المجموعتين=تردّد/تجميع، تباعد واضح مع
 * ترتيب متّسق=اتجاه قوي. يُرسَم كل خط بنمط نقاط overlay كباقي المتوسطات (لون واحد موحَّد لكل
 * المجموعة القصيرة `#6EE7B7`، ولون آخر موحَّد لكل المجموعة الطويلة `#93C5FD` — لونان جديدان غير
 * مستخدَمين سابقاً، فرّقا بصرياً حتى مع 12 خطاً معاً). **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع
 * → ema لأي period تُرجع P بالضبط لكل نقطة صالحة (خاصية ema الأساسية، نفس التحقّق اليدوي المستخدَم
 * لكل مؤشر يعتمد عليها بالملف) → كل الاثني عشر خطاً=P بالضبط — تحقَّق بتشغيل Node.js فعلي (سعر ثابت
 * + 300 شمعة عشوائية، صفر NaN/Infinity، وقيمة EMA(3) القصيرة تختلف فعلياً عن EMA(60) الطويلة ببيانات
 * متغيّرة — سلوك غير متدهور).
 */
const GMMA_SHORT_PERIODS = [3, 5, 8, 10, 12, 15];
const GMMA_LONG_PERIODS = [30, 35, 40, 45, 50, 60];
export function computeGmma(
  closes: number[]
): { shortLines: (number | null)[][]; longLines: (number | null)[][] } {
  return {
    shortLines: GMMA_SHORT_PERIODS.map((p) => ema(closes, p)),
    longLines: GMMA_LONG_PERIODS.map((p) => ema(closes, p)),
  };
}

/**
 * RWI (Random Walk Index، مايكل بول — period=14 القيمة القياسية لكلا الطرفين High/Low) — يقيس هل
 * حركة السعر أقوى من "مسار عشوائي" بمقياس ATR (يعيد استخدام computeAtr المُصدَّرة أعلاه مباشرة، وهي
 * فعلياً sma() بسيطة للمدى الحقيقي بهذا الملف لا تمهيد Wilder — التوزيع الصحيح تماماً لصيغة RWI
 * القياسية). لكل نقطة i (تحتاج i−period موجودة ضمن المصفوفة): rwiHigh=(أعلى[i]−أدنى[i−period])/
 * (ATR(period)[i]×√period)، rwiLow=(أعلى[i−period]−أدنى[i])/(نفس المقام) — حارس صفر صراحةً عند
 * ATR=0 (نفس نمط الحراسة المستخدَم بـcomputeDmi/computeSmi أعلاه). يُرسَم بنفس **نمط الپين ثنائي
 * الخط** المستخدَم لـcomputeVortex/computeDmi أعلاه حرفياً (rwiHigh بلون الصعود، rwiLow بلون الهبوط).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → ATR=0 بعد التسخين وأعلى[i]=أدنى[i−period]=P لكل i
 * صالح → المقام محروس صراحةً عند صفر فيُرجع rwiHigh=rwiLow=0 بالضبط، يطابق "لا انحراف عن السعر
 * الثابت السابق" بالتعريف — تحقَّق بتشغيل Node.js فعلي (سعر ثابت + 300 شمعة عشوائية، صفر
 * NaN/Infinity).
 */
export function computeRwi(
  candles: Candle[],
  period = 14
): { rwiHigh: (number | null)[]; rwiLow: (number | null)[] } {
  const n = candles.length;
  const atr = computeAtr(candles, period);
  const sq = Math.sqrt(period);
  const rwiHigh: (number | null)[] = new Array(n).fill(null);
  const rwiLow: (number | null)[] = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    if (atr[i] == null) continue;
    const denom = atr[i]! * sq;
    if (denom === 0) {
      rwiHigh[i] = 0;
      rwiLow[i] = 0;
      continue;
    }
    rwiHigh[i] = (candles[i].high - candles[i - period].low) / denom;
    rwiLow[i] = (candles[i - period].high - candles[i].low) / denom;
  }
  return { rwiHigh, rwiLow };
}

/**
 * Aroon Up/Down (منفصلَين عن Aroon Oscillator — computeAroonOsc أعلاه بالملف، period=14 نفس القيمة
 * القياسية) — computeAroonOsc تحسب up/down داخلياً لكل شمعة (موضع آخر قمة/قاع ضمن النافذة كنسبة
 * مئوية 0..100) لكن ترجع الفرق up−down فقط كخط أوسيليتور واحد. هذه الدالة **مستقلة عمداً** (نفس حلقة
 * hiIdx/loIdx حرفياً، لا استدعاء لـcomputeAroonOsc ولا تعديل عليها — نفس نمط ازدواجية +DI/−DI
 * المستخدَم أعلاه بـcomputeDmi مقابل computeAdx حرفياً) تكشف up/down الخام كخطّين مستقلّين — القراءة
 * الأصلية لمؤشر Aroon قبل تلخيصه بخط أوسيليتور واحد. يُرسَم بنفس نمط الپين ثنائي الخط المستخدَم
 * لـcomputeVortex/computeDmi أعلاه حرفياً (Up بلون الصعود، Down بلون الهبوط).
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع (أعلى=أدنى ثابتان لكل الشموع) → شرط `>=`/`<=` بالحلقة
 * الداخلية يتحقّق عند كل w (تعادل تام لأن كل القيم متساوية) فيُحدَّث hiIdx/loIdx لآخر w في كل مرة →
 * ينتهي كلاهما عند hiIdx=loIdx=period بالضبط لكل نافذة صالحة → Up=Down=(period/period)×100=100
 * بالضبط لكل نقطة صالحة — يطابق تماماً سلوك computeAroonOsc الأصلي بنفس حالة التعادل (up−down=0
 * لأن up=down)، تحقَّق بتشغيل Node.js فعلي (سعر ثابت + 300 شمعة عشوائية، صفر NaN/Infinity، القيم
 * ضمن [0,100] دائماً كما يقتضي التعريف).
 */
export function computeAroonUpDown(
  candles: Candle[],
  period = 14
): { up: (number | null)[]; down: (number | null)[] } {
  const n = candles.length;
  const up: (number | null)[] = new Array(n).fill(null);
  const down: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i < period) continue;
    let hiIdx = 0;
    let hiVal = -Infinity;
    let loIdx = 0;
    let loVal = Infinity;
    for (let w = 0; w <= period; w++) {
      const c = candles[i - period + w];
      if (c.high >= hiVal) {
        hiVal = c.high;
        hiIdx = w;
      }
      if (c.low <= loVal) {
        loVal = c.low;
        loIdx = w;
      }
    }
    up[i] = (hiIdx / period) * 100;
    down[i] = (loIdx / period) * 100;
  }
  return { up, down };
}

/**
 * ZigZag — يفلتر تذبذب السعر الصغير ويُبقي فقط نقاط الانعطاف الحقيقية (قمة/قاع) التي تتجاوز نسبة
 * انحراف `deviationPct` (افتراضياً 5%، نفس القيمة الافتراضية الشائعة لهذا المؤشر بمنصات الرسم
 * البياني) — أداة قراءة هيكل السعر (Market Structure) الأساسية، غير موجودة إطلاقاً بالمشروع سابقاً
 * رغم شيوعها. **قرار تصميم**: يعمل على الإغلاق فقط (`closes: number[]`، بنفس نمط computeGmma/
 * computeAlma أعلاه بالملف) لا High/Low لكل شمعة — تبسيط متعمَّد يتفادى غموض "أيهما يُقاس، القمة
 * بالفتيل أم بالإغلاق؟" ويطابق نفس اصطلاح المشروع بمؤشرات overlay أخرى تعتمد الإغلاق فقط.
 * **الخوارزمية** (آلة حالات قياسية بثلاث حالات: 0 غير محدد/1 صاعد/−1 هابط): تتبّع "الطرف الحالي"
 * (extremePrice/extremeIndex) بنفس اتجاه الحركة الجارية؛ عند انعكاس السعر عن الطرف بنسبة ≥
 * deviationPct تُثبَّت نقطة انعطاف عند الطرف السابق (`result[extremeIndex] = extremePrice`) ويُعكَس
 * الاتجاه. النقطة الأولى (index 0) تُسجَّل دائماً كمرجع ابتدائي عند أول انعكاس (سلوك قياسي لهذا
 * المؤشر بكل التطبيقات المعروفة — ليس خطأً). آخر طرف غير مؤكَّد (لم ينعكس بعد) **لا يُسجَّل عمداً**
 * (تذبذب معلَّق حتى تأكيد لاحق، نفس مبدأ عدم إسقاط بيانات غير مؤكَّدة). تُرسَم النقاط المؤكَّدة فقط
 * (قيمة غير null) كخط متعرّج متّصل بنفس **نمط قطاعات الخط الدوّارة** المستخدَم أصلاً لـPine-lite
 * overlay أعلى هذا الملف بـMatrixChart.tsx حرفياً (لا كود رسم جديد، فقط تكرار للتقنية بين نقاط متفرّقة
 * بدل شمعة تلو شمعة).
 * **تحقّق يدوي**: مسار V-شكل صناعي (هبوط 20% ثم صعود متماثل) بعتبة 5% — يُسجَّل بالضبط نقطتان: المرجع
 * الابتدائي عند أول انعكاس، والقاع الحقيقي عند أدنى نقطة فعلية بالمسار (تحقَّق تطابق القيمة تماماً)؛
 * سعر مسطّح تماماً بلا أي تذبذب → صفر نقاط انعطاف (لا انعكاس يتجاوز العتبة إطلاقاً)؛ تراجع بسيط أثناء
 * اتجاه صاعد أقل من العتبة → صفر نقاط انعطاف وسيطة (لا يُخطئ بتسجيل تذبذب تافه) — تحقَّق الثلاثة
 * بتشغيل Node.js فعلي، بالإضافة لبيانات عشوائية 300 نقطة بذرة ثابتة (صفر NaN/Infinity بكل الحالات).
 */
export function computeZigZag(closes: number[], deviationPct = 5): (number | null)[] {
  const n = closes.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (n < 2) return result;

  let direction: 0 | 1 | -1 = 0;
  let extremeIndex = 0;
  let extremePrice = closes[0];

  for (let i = 1; i < n; i++) {
    const price = closes[i];
    if (direction === 0) {
      if (price > extremePrice) {
        extremePrice = price;
        extremeIndex = i;
        continue;
      }
      const dropPct = ((extremePrice - price) / extremePrice) * 100;
      if (dropPct >= deviationPct) {
        result[extremeIndex] = extremePrice;
        direction = -1;
        extremeIndex = i;
        extremePrice = price;
      }
    } else if (direction === 1) {
      if (price >= extremePrice) {
        extremePrice = price;
        extremeIndex = i;
        continue;
      }
      const dropPct = ((extremePrice - price) / extremePrice) * 100;
      if (dropPct >= deviationPct) {
        result[extremeIndex] = extremePrice;
        direction = -1;
        extremeIndex = i;
        extremePrice = price;
      }
    } else {
      if (price <= extremePrice) {
        extremePrice = price;
        extremeIndex = i;
        continue;
      }
      const risePct = ((price - extremePrice) / extremePrice) * 100;
      if (risePct >= deviationPct) {
        result[extremeIndex] = extremePrice;
        direction = 1;
        extremeIndex = i;
        extremePrice = price;
      }
    }
  }
  return result;
}

/**
 * T3 (Tillson، متوسط متحرك مموَّه سداسي المراحل) — period=5/vFactor=0.7 القيمتان الافتراضيتان
 * القياسيتان. يُبنى بتتابع ست طبقات ema() محلية متعاقبة (e1..e6، كل طبقة = ema() لناتج سابقتها
 * بعد تعويض null بصفر — **نفس نمط dema/tema/hma المحلي أعلاه بالضبط**، لا صيغة تنعيم جديدة)،
 * ثم دمج e3..e6 بمعاملات ثابتة مشتقة من vFactor: c1=−v³، c2=3v²+3v³، c3=−6v²−3v−3v³،
 * c4=1+3v+v³+3v²، T3=c1·e6+c2·e5+c3·e4+c4·e3. صلاحية النقطة تعتمد فقط على e1[i] (أي i≥period−1)
 * بنفس منطق بوابة tema (e2..e6 غير null دوماً بمجرد i≥period−1 بحكم تعويض الصفر بالطبقات السابقة).
 * **تحقّق جبري**: c1+c2+c3+c4 يُبسَّط جبرياً إلى 1 تماماً بصرف النظر عن قيمة v (تحقَّق حداً حداً:
 * حدود v³ تُلغي بعضها [−1+3−3+1=0]، حدود v² كذلك [3−6+3=0]، حدود v [−3+3=0]، يبقى الثابت=1 فقط) —
 * هذا يضمن أن T3 لسعر ثابت تماماً *يتقارب* للقيمة الثابتة نفسها (بعكس DEMA/TEMA اللذين يتأخران أطول
 * بسبب فترتهما الأطول 20 هنا مقابل 5 لـT3 — نفس ظاهرة "تقارب تدريجي لا فوري" الموثَّقة لـTEMA بهذا
 * الملف، لا خطأ حسابي). **تحقّق حسابي فعلي (Node.js)**: سعر ثابت 1.2345 عبر 80 شمعة period=5 →
 * القيم تتقارب لـ1.2345 بفارق <3×10⁻⁸ بحلول آخر 20 نقطة (يطابق التقارب الأسي المتوقَّع)؛ 300 شمعة
 * عشوائية بذرة ثابتة → صفر NaN/Infinity؛ مسار صاعد ثابت الخطوة → T3 يتبع الاتجاه صعوداً كما هو متوقَّع.
 */
export function computeT3(closes: number[], period = 5, vFactor = 0.7): (number | null)[] {
  const e1 = ema(closes, period);
  const e2 = ema(e1, period);
  const e3 = ema(e2, period);
  const e4 = ema(e3, period);
  const e5 = ema(e4, period);
  const e6 = ema(e5, period);

  const v2 = vFactor * vFactor;
  const v3 = v2 * vFactor;
  const c1 = -v3;
  const c2 = 3 * v2 + 3 * v3;
  const c3 = -6 * v2 - 3 * vFactor - 3 * v3;
  const c4 = 1 + 3 * vFactor + v3 + 3 * v2;

  return closes.map((_, i) =>
    e6[i] != null ? c1 * e6[i]! + c2 * e5[i]! + c3 * e4[i]! + c4 * e3[i]! : null
  );
}

/**
 * SMMA (Smoothed Moving Average، تمهيد Wilder القياسي) كمؤشر overlay مستقل — **استخراج دالة داخلية
 * موجودة ومُختبَرة فعلياً** (`smma()` أعلاه، مُستخدَمة منذ إضافة computeAlligator لخطوط Jaw/Teeth/Lips)
 * بنفس روح استخراج computeAccumDist من صيغة Chaikin Osc الداخلية سابقاً — صفر خطر رياضي إضافي، مجرد
 * غلاف export يعيد استخدام الصيغة المُتحقَّق منها بالفعل. كانت غائبة كخط MA مستقل رغم وجود الصيغة
 * ضمنياً (وبينما SMA/EMA/WMA/DEMA/TEMA/HMA كلها overlays مستقلة أعلاه، SMMA وحدها لم تكن مُصدَّرة).
 * period=20 افتراضي (نفس افتراضي SMA20/HMA20 وغيرهما بهذا الملف لتناسق القيم الافتراضية).
 * **تحقّق حسابي فعلي (Node.js) قبل الكتابة**: سعر ثابت 1.2345 عبر 80 شمعة period=20 → يتقارب *فوراً*
 * للقيمة الثابتة من أول نقطة صالحة (بعكس EMA المتتالية كـT3 التي تتأخر — لأن بذرة SMMA هنا SMA حقيقية
 * لأول period قيمة، وكلها متساوية بسعر ثابت)؛ مسار صاعد ثابت الخطوة 60 نقطة → قيم SMMA متصاعدة بثبات
 * بعد نافذة الإحماء؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity + أول 19 نقطة بالضبط null (period−1)؛
 * إعادة حساب مستقلة يدوية (تكرار منفصل عن الدالة) لأول 41 نقطة طابقت مكتبة smma() تماماً.
 */
export function computeSmma(closes: number[], period = 20): (number | null)[] {
  return smma(closes, period);
}

/**
 * KAMA (Kaufman Adaptive Moving Average، period=10 لنافذة كفاءة الاتجاه + fastPeriod=2/slowPeriod=30
 * لعاملَي التمهيد — القيم الافتراضية القياسية لبيرل كوفمان) — **أول متوسط متحرك متكيّف السرعة بالملف**
 * (يُسرّع تلقائياً باتجاه واضح ويُبطئ بتذبذب عشوائي، بعكس SMA/EMA/WMA/DEMA/TEMA/HMA/SMMA/T3/ALMA/VWMA/
 * LSMA/McGinley الثابتة السرعة أعلاه جميعها). نسبة الكفاءة (Efficiency Ratio) ER[i] = |إغلاق[i] −
 * إغلاق[i−period]| ÷ مجموع |إغلاق[j] − إغلاق[j−1]| لكل j بنافذة period (البسط = التقدّم الصافي
 * بالاتجاه، المقام = مجموع كل التذبذب الخام بصرف النظر عن الاتجاه — 1 = اتجاه خالص بلا أي تراجع
 * إطلاقاً، قرب صفر = تذبذب عشوائي بحت بلا تقدّم صافٍ، صفر عند مقام صفري [سعر ساكن تماماً] بدل قسمة
 * على صفر). عامل التمهيد SC[i] = (ER[i]×(fastSC−slowSC)+slowSC)²، حيث fastSC=2/(fastPeriod+1)≈0.667
 * وslowSC=2/(slowPeriod+1)≈0.0645 (نفس صيغة عامل ema() أعلاه لكن بحدّين متغيّرين بـER بدل ثابت واحد
 * لكل نقطة). التربيع يُقرِّب SC من slowSC² لأي ER متوسط أو منخفض (تحيّز افتراضي للاستقرار، تسريع فعلي
 * فقط عند اتجاه واضح جداً قرب ER=1). kama[i] = kama[i−1] + SC[i]×(إغلاق[i]−kama[i−1])، بذرة
 * kama[period] = SMA لأول period إغلاق (نفس أسلوب بذرة ema()/smma() أعلاه حرفياً — متوسط بسيط قبل
 * بدء التكرار المتكيّف). **تحقّق حسابي فعلي (Node.js) قبل الكتابة**: سعر ثابت 1.2345 عبر 50 شمعة
 * period=10 → يتقارب فوراً للقيمة الثابتة نفسها من أول نقطة صالحة (بذرة SMA لسعر ثابت = نفس القيمة
 * بالضبط، ثم فرق إغلاق[i]−kama[i−1]=0 يبقيها ثابتة)؛ مسار صاعد خطي بحت (خطوة 0.5 ثابتة) عبر 80 نقطة
 * → ER=1 بالضبط عند كل نقطة صالحة (تحقَّق بإعادة حساب مستقلة) → SC=fastSC²≈0.444 (أسرع من slowSC²≈
 * 0.0042 بأكثر من مئة ضعف) بلا أي null بعد الإحماء؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity،
 * 290 نقطة صالحة بالضبط (300−period)؛ حالة سعر ساكن تماماً (مقام صفري) → ER=0 صراحة بالحارس المذكور
 * أعلاه بدل NaN من قسمة 0/0.
 */
export function computeKama(
  closes: number[],
  period = 10,
  fastPeriod = 2,
  slowPeriod = 30
): (number | null)[] {
  const out: (number | null)[] = [];
  const fastSc = 2 / (fastPeriod + 1);
  const slowSc = 2 / (slowPeriod + 1);
  let prevKama: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    if (prevKama == null) {
      const slice = closes.slice(i - period, i);
      prevKama = slice.reduce((a, b) => a + b, 0) / period;
    }
    const change = Math.abs(closes[i] - closes[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(closes[j] - closes[j - 1]);
    }
    const er = volatility === 0 ? 0 : change / volatility;
    const sc = (er * (fastSc - slowSc) + slowSc) ** 2;
    prevKama = prevKama + sc * (closes[i] - prevKama);
    out.push(prevKama);
  }
  return out;
}

/**
 * Schaff Trend Cycle (STC، Doug Schaff — cyclePeriod=10/fastLength=23/slowLength=50 القيم القياسية
 * لنسخة TradingView المرجعية) — مذبذب 0..100 **مزدوج التمهيد العشوائي (stochastic) فوق MACD**، لا
 * تمهيد EMA بسيط: أولاً macd=ema(إغلاق,fastLength)−ema(إغلاق,slowLength) (نفس صيغة computeMacd
 * أعلاه حرفياً بفترتين مختلفتين)، ثم %K عشوائي أول (stochastic) لـmacd بنافذة cyclePeriod متدحرجة
 * (نفس صيغة %K بـcomputeStoch أعلاه لكن على قيمة macd بدل الإغلاق الخام)، يُمهَّد بعامل تمهيد ثابت
 * 0.5 (لا EMA قياسية — `d[i]=d[i-1]+0.5×(k[i]−d[i-1])`، نفس صيغة عامل التمهيد المستخدَم لإشارة SMI
 * أعلاه بالضبط)، ثم **يُعاد كل ذلك مرة ثانية على ناتج المرحلة الأولى بدل الإغلاق/macd**
 * (stochastic-of-stochastic-of-macd) — هذا التكرار المزدوج هو ما يميّز STC عن أي مذبذب آخر بالملف،
 * ويقلّل تأخره كثيراً مقارنة بـMACD الخام عبر دورتَي stochastic بدل تمهيد EMA فقط. **قرار موثَّق**:
 * عند مدى صفري بأي نافذة (سعر مسطّح تماماً) تُحمَل القيمة السابقة بدل صفر/NaN (`nz(f1[1])` بالمرجع
 * الأصلي Pine Script) بدل قيمة ثابتة، مطابقةً للمرجع الرسمي حرفياً؛ الناتج النهائي محصور صراحةً
 * [0,100] (`Math.max(0, Math.min(100, ...))`) لأن التمهيد المتكرر يمكن نظرياً أن يتجاوز الحدين
 * بكسور عائمة ضئيلة قبل التقريب. يُرسَم بإعادة استخدام كاملة لنمط لوحة RSI 0-100 حرفياً (عتبتا
 * تشبّع 75/25 بدل 70/30 — القيمتان القياسيتان لـSTC تحديداً بمعظم المصادر المرجعية، أوسع من RSI لأن
 * STC أصلاً أسرع استجابة فيحتاج عتبات أبعد لتقليل الإشارات الكاذبة).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سعر ثابت تماماً 150 شمعة → macd=0 ثابت بكل نافذة
 * (مدى صفري) → القيمة السابقة المحمولة تبقى 0 بذرتها الأولية بلا أي NaN عبر 83 نقطة صالحة؛ 300 شمعة
 * عشوائية بذرة ثابتة → صفر NaN/Infinity عبر 233 نقطة صالحة بالضبط (يطابق حساب warm-up يدوياً: أول
 * macd صالح عند الفهرس 49 [slowLength−1]، أول pf صالح عند 58 [49+cyclePeriod−1]، أول STC صالح عند
 * 67 [58+cyclePeriod−1] → 300−67=233 تماماً)، وكل قيمة صالحة ضمن [0,100] بالضبط بلا استثناء.
 */
export function computeStc(
  closes: number[],
  cyclePeriod = 10,
  fastLength = 23,
  slowLength = 50
): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  const emaFast = ema(closes, fastLength);
  const emaSlow = ema(closes, slowLength);
  const macd: (number | null)[] = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null
  );

  const pf: (number | null)[] = new Array(n).fill(null);
  let f1Prev = 0;
  let pfPrev = 0;
  let havePf = false;
  for (let i = 0; i < n; i++) {
    if (i < cyclePeriod - 1) continue;
    let lo = Infinity;
    let hi = -Infinity;
    let windowOk = true;
    for (let w = i - cyclePeriod + 1; w <= i; w++) {
      if (macd[w] == null) {
        windowOk = false;
        break;
      }
      lo = Math.min(lo, macd[w]!);
      hi = Math.max(hi, macd[w]!);
    }
    if (!windowOk) continue;
    const range = hi - lo;
    const f1 = range > 0 ? ((macd[i]! - lo) / range) * 100 : f1Prev;
    f1Prev = f1;
    const p = havePf ? pfPrev + 0.5 * (f1 - pfPrev) : f1;
    pfPrev = p;
    havePf = true;
    pf[i] = p;
  }

  let f2Prev = 0;
  let pffPrev = 0;
  let havePff = false;
  for (let i = 0; i < n; i++) {
    if (pf[i] == null) continue;
    let lo = Infinity;
    let hi = -Infinity;
    let count = 0;
    for (let w = i; w >= 0 && count < cyclePeriod; w--) {
      if (pf[w] == null) break;
      lo = Math.min(lo, pf[w]!);
      hi = Math.max(hi, pf[w]!);
      count++;
    }
    if (count < cyclePeriod) continue;
    const range = hi - lo;
    const f2 = range > 0 ? ((pf[i]! - lo) / range) * 100 : f2Prev;
    f2Prev = f2;
    const p2 = havePff ? pffPrev + 0.5 * (f2 - pffPrev) : f2;
    pffPrev = p2;
    havePff = true;
    out[i] = Math.max(0, Math.min(100, p2));
  }
  return out;
}

/**
 * ZLEMA (Zero-Lag Exponential Moving Average، جون إيلرز/ريكي هارت — period=20 القيمة الافتراضية
 * الشائعة) — متوسط EMA قياسي (نفس `ema()` المحلية أعلاه بالضبط) لكن مطبَّق على سلسلة سعر "منزوعة
 * التأخير" مسبقاً بدل الإغلاق الخام مباشرة، بهدف تقليل تأخر EMA التقليدي المعروف (لا صيغة تنعيم
 * جديدة، فقط معالجة مسبقة للمدخل). **الصيغة**: lag=⌊(period−1)/2⌋ (10 لـperiod=20)،
 * السعر المُعدَّل[i]=2×إغلاق[i]−إغلاق[i−lag] (يُبالِغ فرق الاتجاه الأخير ليعوّض تأخر EMA لاحقاً)،
 * ZLEMA=ema(السعر المُعدَّل، period) — نفس استدعاء `ema()` المحلية المستخدَمة بكل مكان بالملف حرفياً.
 * **قرار تصميم**: للنقاط i<lag يُستخدَم إغلاق[i] كما هو بدل رمي خطأ أو NaN — لا يؤثر على النتيجة
 * النهائية لأن `ema()` أصلاً تُخفي أول period−1 نقطة كـnull وlag=⌊(period−1)/2⌋ أصغر من period−1
 * دائماً لأي period>1، فكل نقطة تُستخدَم فيها هذه القيمة التقريبية تكون أصلاً مغطّاة ضمن فترة
 * الإحماء المُقنَّعة. يُرسَم بإعادة استخدام كاملة لنمط نقاط overlay المستخدَم لبقية المتوسطات
 * المتحركة (EMA/WMA/DEMA/TEMA/HMA/KAMA...) حرفياً، لون جديد `#FDBA74` (تحقَّق بـ`grep` شامل لكل
 * ألوان hex المستخدَمة بـMatrixChart.tsx أنه غير مكرَّر).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سعر ثابت 1.2345 عبر 50 شمعة → تقارب فوري تام للقيمة
 * الثابتة نفسها من أول نقطة صالحة (فرق صفري بكل الحالات، بلا خطأ تقريب يتجاوز 10⁻⁹)؛ مسار صاعد خطي
 * بحت (خطوة 0.01 ثابتة) عبر 100 نقطة، period=20 → ZLEMA أقرب للسعر الفعلي من EMA القياسي بنفس الفترة
 * بكل نقطة صالحة بلا استثناء (70/70 نقطة، يطابق الغرض التصميمي المعلَن لهذا المؤشر: تقليل التأخر)؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity عبر 281 نقطة صالحة بالضبط (300−period+1، يطابق بوابة
 * `ema()` القياسية).
 */
export function computeZlema(closes: number[], period = 20): (number | null)[] {
  const lag = Math.floor((period - 1) / 2);
  const deLagged = closes.map((c, i) => (i >= lag ? 2 * c - closes[i - lag] : c));
  return ema(deLagged, period);
}

/**
 * Linear Regression Channel (period=100 القيمة القياسية الشائعة لهذه الأداة تحديداً — أطول من نافذة
 * LSMA/LinRegSlope/LinRegR2 أعلاه [period=25/14/14] لأن الغرض هنا قناة اتجاه بعيدة المدى لا مؤشر
 * زخم قصير) — يعيد استخدام *نفس* صيغة الانحدار الخطي (sumX/sumX2/denom الثابتة حسابياً بمحاور
 * x=0..period-1، meanY/meanX/intercept) المستخدَمة حرفياً بـcomputeLsma أعلاه لحساب خط الوسط (mid،
 * القيمة المتوقَّعة عند نهاية النافذة x=period-1 — مطابقة لـLSMA تماماً لو استُدعيت بنفس period)، ثم
 * يضيف حدّين علوي/سفلي بعرض mult×الانحراف المعياري *لبواقي الانحدار* (residuals، الفرق بين كل سعر
 * فعلي بالنافذة وقيمته المتوقَّعة على خط الانحدار عند نفس x — بعكس بولنجر الذي يقيس انحراف السعر عن
 * SMA أفقي، هنا القياس عن الخط المائل نفسه). نفس روح Keltner (قناة حول خط مركزي بعرض متغيّر) لكن
 * الخط المركزي هنا مائل لا أفقي، والعرض من تشتت البواقي لا من ATR. mult=2 (نفس القيمة القياسية
 * الشائعة لبولنجر/كلتنر أعلاه). يُرسَم بإعادة استخدام كاملة لنمط الشريط العمودي شبه الشفاف
 * (upper→lower) المستخدَم أصلاً لـKeltner/Envelopes/Donchian حرفياً — بلا أي نمط رسم جديد.
 * **تحقّق يدوي**: سعر ثابت تماماً بكل شموع النافذة → ميل=0 (كما بـLSMA)، كل بقايا=صفر (السعر الثابت
 * يقع تماماً على الخط الأفقي المتوقَّع) → الانحراف المعياري=0 → upper=lower=mid=السعر الثابت بالضبط؛
 * مسار خطي بحت (ميل ثابت تماماً) → كل نقطة تقع تماماً على خط الانحدار المُقدَّر (ملاءمة مثالية لأن
 * البيانات خطية فعلاً) → بواقٍ=صفر لكل نقطة → upper=lower=mid=قيمة الخط الفعلية بالضبط (نفس حالة
 * R²=1 الحدّية بـcomputeLinRegR2 أعلاه). **تحقّق Node.js فعلي (قبل الكتابة)**: سعر ثابت/مسار خطي بحت
 * (كلاهما period=20 صغير للاختبار) → upper=lower=mid مطابق تماماً كما بالتحليل اليدوي أعلاه؛ 300
 * نقطة عشوائية بذرة ثابتة (period=100 القيمة الفعلية) → 201 نقطة صالحة بالضبط (300−period+1)، صفر
 * NaN/Infinity، upper≥mid≥lower محقَّق بنيوياً بكل نقطة صالحة؛ إعادة حساب مستقلة منفصلة عن الدالة
 * لنقطة عشوائية واحدة (period=20) طابقت الدالة تماماً (mid/upper/lower الثلاثة، فرق<10⁻⁹).
 */
export function computeLinRegChannel(
  closes: number[],
  period = 100,
  mult = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const mid: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      mid.push(null);
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const meanY = sumY / n;
    const meanX = sumX / n;
    const intercept = meanY - slope * meanX;
    let ssRes = 0;
    for (let x = 0; x < n; x++) {
      const y = closes[i - n + 1 + x];
      const yHat = slope * x + intercept;
      ssRes += (y - yHat) ** 2;
    }
    const sd = Math.sqrt(ssRes / n);
    const m = slope * (n - 1) + intercept;
    mid.push(m);
    upper.push(m + mult * sd);
    lower.push(m - mult * sd);
  }
  return { mid, upper, lower };
}

/**
 * Disparity Index (نسبة الإغلاق عن متوسطه المتحرك، مقياس شائع بمنصات مثل StockCharts/Investing) —
 * **إعادة استخدام حرفية كاملة لدالة `sma()` المحلية الموجودة** (لا حساب متوسط جديد): DI[i] =
 * (close[i]−SMA[i])/SMA[i]×100. period=14 (نفس القيمة القياسية المستخدَمة أصلاً لـRSI/CCI بالملف).
 * أوسيلاتور غير محدود المدى متمركز حول الصفر — موجب يعني الإغلاق أعلى من متوسطه (زخم صاعد نسبي)،
 * سالب يعني العكس؛ صفر بالضبط عند سعر ثابت تماماً (الإغلاق=المتوسط دوماً). **تحقّق حسابي فعلي
 * (Node.js، بيئة سحابية، قبل الكتابة)**: سعر ثابت (40 شمعة) → 0 بالضبط لكل نقطة صالحة (27 نقطة،
 * 40−13)؛ مسار صاعد خطي بحت → كل القيم موجبة (الإغلاق دوماً أعلى من متوسطه المتأخر بسوق صاعد ثابت)؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة**
 * لنقطة عشوائية (idx=150) طابقت تماماً (فرق<10⁻⁹).
 */
export function computeDisparityIndex(closes: number[], period = 14): (number | null)[] {
  const base = sma(closes, period);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    const b = base[i];
    if (b == null) continue;
    out[i] = b === 0 ? 0 : ((closes[i] - b) / b) * 100;
  }
  return out;
}

/**
 * Trend Intensity Index (TII، M.H. Pee) — يقيس "شدّة" الاتجاه الحالي بدل اتجاهه فقط: **إعادة استخدام
 * حرفية كاملة لـ`sma()` المحلية** كخط مرجعي (period=60، القيمة الشائعة لهذا المؤشر تحديداً)، ثم على
 * آخر نصف الفترة (half=30) فقط: مجموع الانحرافات الموجبة (إغلاق أعلى من المتوسط) SumUp، ومجموع
 * الانحرافات السالبة المطلقة SumDown، TII=100×SumUp/(SumUp+SumDown) — نطاق [0,100] محصور رياضياً
 * (كلا الحدّين ≥0). **قرار تصميم موثَّق**: عند denom=0 (سعر ثابت تماماً بكل نافذة النصف الأخيرة، صفر
 * انحراف بالاتجاهين معاً) تُرجَع 50 بالضبط (حياد صريح) بدل NaN — قرار مختلف عمداً عن قناع avgLoss=0
 * لـcomputeRsi أعلاه (الذي يرجع 100 لعدم تناظر الحالة هناك) لأن حالة TII هنا متناظرة فعلاً (صفر=صفر).
 * فترة الإحماء = period−1+half−1 (يحتاج أول نافذة SMA كاملة، ثم نافذة "نصف" كاملة إضافية بعدها).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سعر ثابت تماماً (120 شمعة) → 50 بالضبط
 * لكل نقطة صالحة بلا استثناء؛ مسار صاعد خطي بحت → يتقارب فوق 90 (شدّة اتجاه صاعد قوي)؛ مسار هابط خطي
 * بحت → يتقارب تحت 10 (بالتناظر التام)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، وكل قيمة ضمن
 * [0,100] محقَّق بنيوياً؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=200)
 * طابقت تماماً (فرق<10⁻⁹).
 */
export function computeTrendIntensityIndex(closes: number[], period = 60): (number | null)[] {
  const base = sma(closes, period);
  const half = Math.floor(period / 2);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 + half - 1) continue;
    let sumUp = 0;
    let sumDown = 0;
    for (let j = i - half + 1; j <= i; j++) {
      const b = base[j]!;
      const dev = closes[j] - b;
      if (dev >= 0) sumUp += dev;
      else sumDown += -dev;
    }
    const denom = sumUp + sumDown;
    out[i] = denom === 0 ? 50 : (100 * sumUp) / denom;
  }
  return out;
}

/**
 * VIDYA (Variable Index Dynamic Average، تشاند تشاندي 1992 — نفس مبتكر CMO/QStick/RAVI بالملف —
 * period=14) — ثاني متوسط متحرك متكيّف السرعة بالملف بعد KAMA أعلاه، لكن بمقياس تكيّف مختلف جذرياً:
 * KAMA يستخدم نسبة كفاءة الاتجاه (Efficiency Ratio)، VIDYA يستخدم **قيمة CMO المطلقة نفسها** (يعيد
 * استخدام computeCmo المُصدَّرة أعلاه بالملف مباشرة بلا أي حساب زخم مستقل) كمقياس "شدة الاتجاه" مباشرة:
 * k[i] = |CMO(period)[i]| ÷ 100 (0 عند تذبذب متوازن تماماً، 1 عند اتجاه خالص بلا أي تراجع). عامل
 * التمهيد الفعلي = alpha×k[i] حيث alpha=2/(period+1) (نفس عامل ema() القياسي)، فيتباطأ VIDYA تلقائياً
 * قرب الصفر بتذبذب عشوائي (k→0) ويتسارع نحو alpha الكامل باتجاه خالص (k→1) — نفس فكرة "تسريع/تبطئة
 * حسب وضوح الاتجاه" لـKAMA لكن بصيغة أبسط بخطوة تكيّف واحدة بدل تربيع عاملَي fastSC/slowSC. بذرة
 * vidya[period] = SMA لأول period إغلاق **قبل** الفهرس الحالي (`closes.slice(i-period, i)`، نفس
 * أسلوب بذرة computeKama أعلاه حرفياً بما فيه تطبيق خطوة التحديث على نفس النقطة مباشرة بعد البذرة لا
 * تجاوزها)، ثم تكرار vidya[i]=vidya[i−1]+alpha×k[i]×(إغلاق[i]−vidya[i−1]). يُرسَم بنفس نمط النقاط
 * overlay المستخدَم لـT3/KAMA/ZLEMA أعلاه، لون جديد `#FDA4AF` غير مستخدَم سابقاً.
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سعر ثابت تماماً 1.2345 عبر 60 شمعة period=14 → CMO=0
 * بالضبط بكل نقطة (فرق متتالٍ صفري) فـk=0 دائماً → القيمة تبقى ثابتة عند بذرتها (SMA لسعر ثابت = نفس
 * القيمة، بفارق تقريب عائم ضئيل جداً <10⁻⁹ فقط)؛ مسار صاعد خطي بحت (خطوة ثابتة) → CMO=100 بالضبط
 * بكل نقطة صالحة (تحقَّق بإعادة حساب مستقلة) → الناتج تصاعدي رتيب بلا أي تراجع؛ 300 شمعة عشوائية بذرة
 * ثابتة → صفر NaN/Infinity، 286 نقطة صالحة بالضبط (300−period)؛ إعادة حساب brute-force مستقلة تماماً
 * (حلقات CMO/VIDYA مُعاد كتابتها من الصفر بمعزل عن الدالة الفعلية) لنقطة عشوائية (idx=250) طابقت
 * تماماً (فرق<10⁻⁹).
 */
export function computeVidya(closes: number[], period = 14): (number | null)[] {
  const cmo = computeCmo(closes, period);
  const alpha = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      const slice = closes.slice(i - period, i);
      prev = slice.reduce((a, b) => a + b, 0) / period;
    }
    const k = Math.abs(cmo[i]!) / 100;
    prev = prev + alpha * k * (closes[i] - prev);
    out.push(prev);
  }
  return out;
}

/**
 * GMMA Oscillator (Guppy، مُشتَق مباشرة من computeGmma أعلاه — نفس روح استخراج ADL من Chaikin Osc
 * وSMMA من Alligator سابقاً بالملف: **صفر حساب EMA جديد**، فقط دمج الست خطوط القصيرة [3,5,8,10,12,15]
 * والست الطويلة [30,35,40,45,50,60] الموجودة بالفعل) — يلخّص حالة "الانضغاط/التمدد" بين مجموعتَي
 * GMMA برقم واحد بدل قراءة اثني عشر خطاً بصرياً: shortAvg[i]=متوسط الخطوط القصيرة الست عند i،
 * longAvg[i]=متوسط الخطوط الطويلة الست عند i، الناتج=(shortAvg−longAvg)÷longAvg×100 (نسبة مئوية،
 * حارس صفر صريح عند longAvg=0). موجب=المجموعة القصيرة أعلى الطويلة (زخم صاعد قوي أو تمدد اتجاه)،
 * سالب=العكس، قرب الصفر=انضغاط/التقاء المجموعتين (غالباً ما يسبق تغيّر اتجاه بقراءة GMMA التقليدية).
 * **قرار تصميم**: النقطة صالحة فقط عندما تكون **كل** الخطوط الاثني عشر غير null عند نفس i (تحفّظ
 * الإحماء الأطول محكوم بأبطأ خط، period=60) — لا معنى لمتوسط جزئي بخطوط مفقودة. تأخذ الدالة `shortLines`/
 * `longLines` كمُدخَلين جاهزين (نفس نمط computeGator الذي يأخذ jaw/teeth/lips جاهزة بدل إعادة حساب
 * Alligator داخلياً) بدل استدعاء computeGmma من الصفر — يمنع حساب EMA مكرر لو gmma محسوبة أصلاً بنفس
 * الـuseMemo، مطابقاً تماماً لاستدعاء `computeGator(alli.jaw, alli.teeth, alli.lips)` الموجود.
 * يُرسَم بنمط هستوغرام حول الصفر بتطبيع ديناميكي بأقصى قيمة مطلقة محلية (نفس نمط PGO أعلاه حرفياً،
 * لأن المدى المئوي هنا غير ثابت الحدود كـVZO [±100] بل يتفاوت بحجم الفرق الفعلي بين المجموعتين).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سعر ثابت تماماً 120 شمعة → كل الاثني عشر EMA تتقارب لنفس
 * القيمة الثابتة → shortAvg=longAvg بالضبط (فارق<10⁻¹² فقط) → oscillator≈0؛ أول نقطة صالحة عند
 * الفهرس 59 بالضبط (period−1 لأطول EMA، 60)؛ مسار صاعد خطي بحت 200 نقطة → oscillator موجب بلا
 * استثناء واحد لكل النقاط الصالحة (الخطوط القصيرة الأسرع تتقدّم فوق الطويلة الأبطأ باستمرار في اتجاه
 * صاعد صارم)؛ نفس المسار معكوساً → سالب بلا استثناء؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity،
 * 241 نقطة صالحة بالضبط (300−59)؛ إعادة حساب brute-force مستقلة تماماً (حلقات EMA مُعاد كتابتها من
 * الصفر لكل الاثني عشر خطاً بمعزل عن computeGmma/computeGmmaOscillator الفعليتين) لنقطة عشوائية
 * (idx=250) طابقت تماماً (فرق<10⁻⁹).
 */
export function computeGmmaOscillator(
  shortLines: (number | null)[][],
  longLines: (number | null)[][]
): (number | null)[] {
  const n = shortLines[0]?.length ?? 0;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    let shortSum = 0;
    let anyShortNull = false;
    for (const line of shortLines) {
      const v = line[i];
      if (v == null) {
        anyShortNull = true;
        break;
      }
      shortSum += v;
    }
    if (anyShortNull) continue;
    let longSum = 0;
    let anyLongNull = false;
    for (const line of longLines) {
      const v = line[i];
      if (v == null) {
        anyLongNull = true;
        break;
      }
      longSum += v;
    }
    if (anyLongNull) continue;
    const shortAvg = shortSum / shortLines.length;
    const longAvg = longSum / longLines.length;
    out[i] = longAvg === 0 ? 0 : ((shortAvg - longAvg) / longAvg) * 100;
  }
  return out;
}

/**
 * FRAMA (Fractal Adaptive Moving Average) — جون إيلرز 2005. متوسط متكيّف ثالث بالملف بعد KAMA/VIDYA،
 * لكن مصدر تكيّفه **البعد الكسوري (fractal dimension) لسلسلة الأعلى/الأدنى** بدل نسبة الكفاءة (KAMA)
 * أو |CMO| (VIDYA) — مقياس نعومة/تشوّش مختلف جذرياً عن الاثنين. **صيغة إيلرز الأصلية القياسية**
 * (period يجب أن يكون زوجياً — الافتراضي=16 القيمة القياسية بورقة إيلرز نفسها، النصف الأقدم/الأحدث
 * منفصلان داخل كل نافذة): N1=(أعلى قمة−أدنى قاع) للنصف الأقدم÷(period/2)، N2 لنفس الحساب للنصف
 * الأحدث، N3=(أعلى قمة−أدنى قاع) لكامل النافذة÷period. البعد الكسوري D=(log(N1+N2)−log(N3))/log(2)
 * [**حارس صريح موثَّق**: N1+N2≤0 أو N3≤0 (سوق مسطّح تماماً، مدى صفري) ⇒ D=1 حياداً صريحاً بدل
 * log(0)/log(سالب) — يمنح alpha=1 (تتبّع فوري) وهو سلوك متّسق مع "لا تذبذب لتنعيمه"]. alpha=
 * exp(−4.6×(D−1)) محصور [0.01, 1] صراحة (الثابت −4.6 هو ثابت إيلرز القياسي المستخدَم بكل التطبيقات
 * المرجعية) — D=1 (اتجاه أملس) ⇒ alpha≈1 (بلا تأخير)، D=2 (فوضى كاملة) ⇒ alpha≈0.01 (تنعيم شديد).
 * FRAMA[i]=alpha×close[i]+(1−alpha)×FRAMA[i−1]، البذرة=SMA(period) لأول نافذة صالحة (نفس بذرة
 * KAMA/VIDYA المحليتين حرفياً). يُرسَم overlay بنمط نقاط ALMA/McGinley/LSMA/T3 حرفياً. **تحقّق حسابي
 * فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة) → alpha=1 بالضبط لكل نقطة
 * صالحة (D=1 الحيادي) والقيمة تساوي السعر الثابت؛ مسار صاعد خطي صارم (60 شمعة) → alpha محصورة
 * [0.01,1] بلا استثناء وFRAMA يتبع الاتجاه صعوداً (آخر قيمة > أول قيمة)؛ 300 شمعة عشوائية بذرة ثابتة
 * → صفر NaN/Infinity بالقيمة وD وalpha معاً، alpha محصورة [0.01,1] لكل الـ285 نقطة الصالحة؛ إعادة
 * حساب brute-force مستقلة تماماً عن الدالة (حلقات h1/l1/h2/l2/h3/l3 مُعاد كتابتها من الصفر بمعزل عن
 * التطبيق الفعلي) لنقطة عشوائية (idx=200) لكلا D وalpha طابقت تماماً (فرق<10⁻¹²).
 */
export function computeFrama(candles: Candle[], period = 16): (number | null)[] {
  const half = Math.floor(period / 2);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const start = i - period + 1;
    let h1 = -Infinity;
    let l1 = Infinity;
    for (let w = start; w < start + half; w++) {
      h1 = Math.max(h1, candles[w].high);
      l1 = Math.min(l1, candles[w].low);
    }
    let h2 = -Infinity;
    let l2 = Infinity;
    for (let w = start + half; w <= i; w++) {
      h2 = Math.max(h2, candles[w].high);
      l2 = Math.min(l2, candles[w].low);
    }
    let h3 = -Infinity;
    let l3 = Infinity;
    for (let w = start; w <= i; w++) {
      h3 = Math.max(h3, candles[w].high);
      l3 = Math.min(l3, candles[w].low);
    }
    const n1 = (h1 - l1) / half;
    const n2 = (h2 - l2) / half;
    const n3 = (h3 - l3) / period;
    let d = 1;
    if (n1 + n2 > 0 && n3 > 0) {
      d = (Math.log(n1 + n2) - Math.log(n3)) / Math.LN2;
    }
    let alpha = Math.exp(-4.6 * (d - 1));
    if (alpha < 0.01) alpha = 0.01;
    if (alpha > 1) alpha = 1;
    if (prev == null) {
      let sum = 0;
      for (let w = start; w <= i; w++) sum += candles[w].close;
      prev = sum / period;
    } else {
      prev = alpha * candles[i].close + (1 - alpha) * prev;
    }
    out.push(prev);
  }
  return out;
}

/**
 * Gann HiLo Activator (روبرت كراوز، تكييف مبادئ دبليو دي غان) — خط اتجاه تتبّعي واحد يتبدَّل بين
 * SMA(low, period) و SMA(high, period) حسب اتجاه الاختراق، بنفس فلسفة الانعكاس الثنائي الحالة
 * المستخدَمة أصلاً بـcomputePsar/computeSuperTrend/computeChandeKrollStop (لا حالة وسيطة، قرار
 * ثنائي فقط). المنطق القياسي: إن أغلقت الشمعة i أعلى من SMA(high, period) بالشمعة السابقة i−1 →
 * الاتجاه صاعد ويصبح الخط = SMA(low, period) الحالية (وقف تتبّعي أسفل السعر)؛ إن أغلقت أدنى من
 * SMA(low, period) السابقة → الاتجاه هابط والخط = SMA(high, period) الحالية (وقف أعلى السعر)؛ خلاف
 * ذلك يستمر الاتجاه السابق كما هو. **بذرة الاتجاه الأولى** (أول شمعة تتوفّر لها كلا المتوسطين)
 * تُحدَّد بمقارنة الإغلاق بمنتصف (SMA(high)+SMA(low))/2 بدل شرط الاختراق العادي (لا شمعة سابقة
 * صالحة للمقارنة معها بعد) — قرار تصميم صريح موثَّق هنا. period الافتراضي=3 (القيمة الشائعة بمعظم
 * تطبيقات هذا المؤشر). **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: سوق صاعد تماماً (فرق ثابت +1 كل
 * شمعة) → الاتجاه يُقفَل صاعداً فوراً بعد البذرة والخط يتبع SMA(low) صعوداً بالضبط بلا أي انعكاس
 * زائف؛ سوق مسطّح تماماً → الخط يستقر على قيمة السعر الثابتة نفسها (SMA(high)=SMA(low)=السعر)؛ 300
 * شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، 298/300 نقطة صالحة (فقط أول نقطتين null بانتظار
 * تشكّل SMA(period=3)).
 */
export function computeGannHiLo(candles: Candle[], period = 3): (number | null)[] {
  const n = candles.length;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const movingHigh = sma(highs, period);
  const movingLow = sma(lows, period);
  const activator: (number | null)[] = new Array(n).fill(null);
  let trend: 1 | -1 | null = null;
  for (let i = 0; i < n; i++) {
    const mh = movingHigh[i];
    const ml = movingLow[i];
    if (mh == null || ml == null) continue;
    if (trend == null) {
      trend = candles[i].close >= (mh + ml) / 2 ? 1 : -1;
    } else {
      const prevMh = movingHigh[i - 1];
      const prevMl = movingLow[i - 1];
      if (prevMh != null && candles[i].close > prevMh) trend = 1;
      else if (prevMl != null && candles[i].close < prevMl) trend = -1;
    }
    activator[i] = trend === 1 ? ml : mh;
  }
  return activator;
}

/**
 * Elder Impulse System (ألكسندر إلدر) — تصنيف كل شمعة إلى واحدة من ثلاث حالات زخم بمقارنة اتجاه
 * EMA 13 (نفس فترة ema13 القياسية للنظام، مستقلة عن overlay ema21 الموجود بالملف) مع اتجاه هستوغرام
 * MACD القياسي (12/26/9 — نفس `computeMacd` أعلاه حرفياً، بلا صيغة جديدة): **أخضر** إن كان كلاهما
 * صاعداً (EMA13[i] أعلى من EMA13[i−1] **و** hist[i] أعلى من hist[i−1]) — زخم شرائي متوافق بين
 * الاتجاه والزخم؛ **أحمر** إن كان كلاهما هابطاً (كلا الشرطين معكوسَين) — زخم بيعي متوافق؛ **أزرق**
 * (محايد) في أي حالة أخرى، بما فيها التعادل التام (EMA13 أو hist بلا تغيير عن الشمعة السابقة) — نفس
 * تعريف Elder القياسي الثلاثي الحالة بلا حالة رابعة. **قرار تصميم موثَّق (سبب التأجيل السابق بجدول
 * التكافؤ)**: النظام الأصلي يُلوّن **جسم الشمعة نفسها** بالكامل، لكن محرك الرسم هنا لا يملك مساراً
 * لتلوين جسم شمعة بلون مؤشر خارجي بمعزل عن لون bull/bear العادي (سيتعارض بصرياً مع تفويض لون
 * الشمعة نفسه) — بدلاً من إعادة هيكلة محرك الرسم، اعتُمدت **علامة نقطية أسفل كل شمعة** (بنفس نمط
 * `styles.dot` المستخدَم لعلامات fractals/pivotsHL) تحمل لون الحالة، وهي تسمح بنفس القراءة البصرية
 * (تتابع أخضر/أحمر/أزرق أسفل الشارت) بصفر تغيير على منطق تلوين الشموع القائم — نفس فلسفة "تبسيط
 * صادق موثَّق" المتّبعة بالملف (VWAP التراكمي، Baseline بمرجع ثابت، إلخ). **بوابة الإحماء**: يتطلب
 * توفّر EMA13 وmacdLine الحقيقي (لا هستوغرام المُعوَّض بصفر قبل اكتمال EMA26) لكل من الشمعة الحالية
 * والسابقة معاً — أول قيمة غير null تبدأ عملياً من الفهرس الذي يصبح فيه EMA26/macdLine حقيقياً (لا
 * فهرس EMA13/الإشارة الأبكر المُلوَّث بتعويض الأصفار). **تحقّق حسابي فعلي (Node.js، بيئة الجلسة
 * السحابية، قبل الكتابة)**: سعر ثابت تماماً (60 شمعة) → 34 نقطة صالحة كلها "أزرق" بالضبط (EMA13
 * وhist كلاهما مستويان، لا صعود ولا هبوط بأي منهما) وأول فهرس صالح=26 (مطابق تماماً لبدء macdLine
 * الحقيقي)؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر استثناء، توزيع الحالات الثلاث معقول
 * (83 أخضر/99 أحمر/92 أزرق/26 null بالإحماء بعيّنة الاختبار)؛ **إعادة حساب مستقلة منفصلة تماماً عن
 * الدالة** (تكرار الشرط يدوياً لكل فهرس من مصفوفتي EMA13/hist المُعادتين من computeMacd) لكل الـ300
 * نقطة → **صفر اختلاف واحد** مع مخرجات الدالة الفعلية.
 */
export function computeElderImpulse(
  candles: Pick<Candle, 'close'>[]
): ('green' | 'red' | 'blue' | null)[] {
  const closes = candles.map((c) => c.close);
  const ema13 = ema(closes, 13);
  const { macdLine, hist } = computeMacd(closes);
  const n = candles.length;
  const out: ('green' | 'red' | 'blue' | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (
      ema13[i] == null ||
      ema13[i - 1] == null ||
      macdLine[i] == null ||
      macdLine[i - 1] == null ||
      hist[i] == null ||
      hist[i - 1] == null
    ) {
      continue;
    }
    const emaRising = ema13[i]! > ema13[i - 1]!;
    const emaFalling = ema13[i]! < ema13[i - 1]!;
    const histRising = hist[i]! > hist[i - 1]!;
    const histFalling = hist[i]! < hist[i - 1]!;
    if (emaRising && histRising) out[i] = 'green';
    else if (emaFalling && histFalling) out[i] = 'red';
    else out[i] = 'blue';
  }
  return out;
}

/**
 * Polarized Fractal Efficiency (PFE، هانس هانّولا، 1994) — يقيس "كفاءة" مسار السعر بمقارنة الإزاحة
 * المستقيمة (خط مستقيم من إغلاق[i−period] إلى إغلاق[i]) بمجموع الإزاحات الفعلية شمعة-بشمعة على نفس
 * الفترة (متراكمة بصيغة إقليدية sqrt(فرق²+1) لكل خطوة، لا القيمة المطلقة وحدها) — كلما اقترب المسار
 * الفعلي من الخط المستقيم اقتربت الكفاءة من 100% (أو −100% بمسار هابط مستقيم). period=10
 * وsmoothing=5 هما الافتراضيان القياسيان بمعظم مراجع PFE. **الصيغة**: raw[i] = 100 ×
 * sign(إغلاق[i]−إغلاق[i−period]) × sqrt((إغلاق[i]−إغلاق[i−period])² + period²) / Σ
 * sqrt((إغلاق[j]−إغلاق[j−1])²+1) لـj من i−period+1 إلى i، ثم PFE[i]=EMA(raw,smoothing) — **إعادة
 * استخدام كاملة لدالة `ema()` المحلية بنفس اصطلاح المعالجة المتّبع حرفياً بـcomputeMacd أعلاه**
 * (raw المعوّضة بصفر عند null قبل الإحماء تُمرَّر لـema()، ثم يُبوَّب الناتج النهائي بشرط صلاحية raw
 * الحقيقية `raw[i] != null` لا صلاحية EMA وحدها — نفس فلسفة macdLine/signal/hist بالضبط، تفادياً
 * لتلوّث القيم المبكرة بالمخرج النهائي). **حارس القسمة**: المقام لا يساوي صفراً عملياً إلا بسعر ثابت
 * تماماً كل شمعة بالنافذة، والحارس موجود احتياطاً فقط. **حدود القيمة**: متباينة المثلث تضمن
 * |raw[i]|≤100 دائماً رياضياً (الخط المستقيم ≤ مجموع القطع)، وEMA (توليفة محدَّبة) تحافظ على نفس
 * الحد للناتج النهائي — **تحقّق حدّي صريح** أضيف بالاختبار أدناه لا افتراضاً نظرياً فقط. **تحقّق
 * حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (إغلاق ثابت) → raw=0
 * بالضبط بكل نقطة صالحة → PFE=0 بالضبط؛ مسار صاعد صارم (فرق ثابت +1/شمعة) → PFE يقترب من +100
 * بالضبط (كفاءة مثالية)؛ 300 نقطة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity وصفر تجاوز
 * لحدّي [−100,100]؛ **إعادة حساب مستقلة منفصلة تماماً عن الدالة** (حلقتا raw وema يدويتان بمعزل تام
 * عن الكود الفعلي) → صفر اختلاف واحد (فرق<10⁻⁹) عند مقارنة السلسلة الكاملة.
 */
export function computePfe(closes: number[], period = 10, smoothing = 5): (number | null)[] {
  const n = closes.length;
  const raw: (number | null)[] = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    const diff = closes[i] - closes[i - period];
    let denom = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      denom += Math.sqrt(d * d + 1);
    }
    const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
    const numerator = Math.sqrt(diff * diff + period * period);
    raw[i] = denom === 0 ? 0 : (100 * sign * numerator) / denom;
  }
  const smoothed = ema(raw, smoothing);
  return raw.map((v, i) => (v != null && smoothed[i] != null ? smoothed[i] : null));
}

/**
 * Displaced Moving Average (DMA) — متوسط متحرك بسيط (SMA) يُعرَض مُزاحاً أفقياً بمقدار
 * `displacement` شمعة عن موضع حسابه الطبيعي — أداة كلاسيكية لمحاذاة سلوك متوسط تاريخي مع حركة
 * سعرية لاحقة (تُستخدم تقليدياً لمقارنة أنماط دورية/موسمية). **صفر منطق حساب جديد** — إعادة
 * استخدام كاملة لدالة `sma()` المحلية الموجودة أصلاً؛ التعديل الوحيد هو إزاحة فهرس *العرض* لا صيغة
 * الحساب. **قرار الاتجاه الموثَّق**: إزاحة موجبة (الافتراضي displacement=10) تعني أن القيمة
 * المعروضة عند الشمعة i هي SMA المحسوبة عند الشمعة (i−displacement) — بنفس اصطلاح "Shift" الموجب
 * بمنصّات التداول القياسية (يحرّك الخط يميناً/للمستقبل بصرياً). **هذا يضمن صفر نظرة-للمستقبل
 * (look-ahead bias)**: كل قيمة معروضة عند أي فهرس i مبنية حصراً على شموع بفهرس ≤ i (لأن
 * srcIdx=i−displacement≤i دائماً لـdisplacement≥0) — عكس ما لو استُخدم i+displacement (كان سيقرأ
 * بيانات مستقبلية غير متاحة فعلياً عند لحظة i). period=20/displacement=10 قيمتان قياسيتان شائعتان
 * بمعظم مراجع DMA. **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح
 * تماماً → DMA يساوي السعر الثابت نفسه بالضبط لكل نقطة صالحة بعد الإحماء؛ مسار خطي صارم (فرق ثابت
 * +1/شمعة) → DMA[i] يطابق بالضبط الصيغة التحليلية لمنتصف نافذة SMA متساوية التباعد
 * ((i−displacement)−(period−1)/2)؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity؛
 * **إعادة حساب brute-force مستقلة تماماً عن الدالة نفسها** (حلقة SMA منفصلة معزولة) عند خمسة فهارس
 * متفرقة (30/80/150/220/299) → صفر اختلاف واحد.
 */
export function computeDma(closes: number[], period = 20, displacement = 10): (number | null)[] {
  const base = sma(closes, period);
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const srcIdx = i - displacement;
    out[i] = srcIdx >= 0 ? base[srcIdx] : null;
  }
  return out;
}

/**
 * Rainbow Oscillator — يقيس "قوة الاتجاه" بمدى تباعد سلسلة من 10 مراحل تنعيم SMA متتالية (كل مرحلة
 * SMA(2) لناتج المرحلة السابقة، بدءاً من الإغلاق نفسه) كنسبة مئوية من السعر الحالي — كلما اتسع
 * التباعد بين أسرع/أبطأ مرحلة تنعيم زاد الاتجاه وضوحاً، وكلما تقاربت (سوق عرضي/مسطّح) اقترب
 * المذبذب من الصفر. **صيغة قياسية موثَّقة** (مرافقة "Rainbow Moving Averages" — ستيفن أشيليس،
 * "Technical Analysis from A to Z"): المرحلة k=1..10، stage[1]=SMA(إغلاق,2)،
 * stage[k]=SMA(stage[k−1],2) لـk>1؛ الناتج = 100×(أعلى قيمة بين المراحل العشر − أدنى قيمة بينها)
 * ÷الإغلاق الحالي. **قرار تصميم موثَّق**: انتشار null الدقيق (بلا أي تعويض/fill) عبر سلسلة SMA(2)
 * المتتالية بدل تعويض القيم المفقودة بالإغلاق الخام — يضمن أن أول نقطة صالحة فعلياً عند الفهرس 10
 * بالضبط (لا تلوّث أبكر) وأن كل قيمة نهائية مبنية حصراً على بيانات حقيقية. **صفر منطق حساب جديد
 * بمرحلة واحدة** — كل مرحلة إعادة استخدام حرفية لنفس صيغة SMA(فترة=2 ثابتة)، مطبَّقة تسلسلياً 10
 * مرات (نفس فلسفة إعادة استخدام `ema()` اثنتي عشرة مرة بـ`computeGmma` الموجودة أصلاً). **مدى
 * القيمة**: غير سالب دائماً رياضياً (أعلى≥أدنى بتعريف max/min) — لا حد أعلى نظري ثابت (يعتمد على
 * تقلّب السعر النسبي)، لذا يُرسَم بنمط تطبيع أدنى/أعلى للنطاق المرئي (كـPFE/PGO/GAPO) لا مدى ثابت
 * [0,100]. **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً →
 * كل المراحل العشر تساوي السعر الثابت نفسه بالضبط (SMA لقيمة ثابتة=نفس القيمة) →
 * أعلى=أدنى=المذبذب=صفر بالضبط لكل نقطة صالحة؛ مسار خطي صارم (فرق ثابت +1/شمعة) → تحقَّق تحليلياً
 * أن stage[k][i]=i−k/2 (سلسلة حسابية بميل ثابت)، فالفارق أعلى−أدنى=stage[1]−stage[10]=4.5 ثابت
 * تماماً بصرف النظر عن i، يطابق ناتج الدالة الفعلي تماماً بكل نقطة صالحة (فرق<10⁻⁹)؛ 300 شمعة
 * عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity وصفر قيمة سالبة واحدة؛ **إعادة حساب
 * brute-force مستقلة تماماً عن الدالة نفسها** (سلسلة المراحل العشر مُعاد بناؤها يدوياً بحلقات
 * منفصلة معزولة) عند خمسة فهارس متفرقة (30/80/150/220/299) → صفر اختلاف واحد.
 */
export function computeRainbowOscillator(closes: number[], levels = 10): (number | null)[] {
  const n = closes.length;
  let prevStage: (number | null)[] = closes.map((v) => v);
  const stages: (number | null)[][] = [];
  for (let k = 0; k < levels; k++) {
    const stage: (number | null)[] = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
      const a = prevStage[i - 1];
      const b = prevStage[i];
      stage[i] = a != null && b != null ? (a + b) / 2 : null;
    }
    stages.push(stage);
    prevStage = stage;
  }
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const vals: number[] = [];
    let anyNull = false;
    for (let k = 0; k < levels; k++) {
      const v = stages[k][i];
      if (v == null) {
        anyNull = true;
        break;
      }
      vals.push(v);
    }
    if (anyNull || closes[i] === 0) continue;
    const hi = Math.max(...vals);
    const lo = Math.min(...vals);
    out[i] = (100 * (hi - lo)) / closes[i];
  }
  return out;
}

/**
 * Kaufman's Efficiency Ratio (ER، بيري كوفمان 1995) — يقيس "كفاءة" حركة السعر: نسبة الإزاحة
 * الصافية على مدى `period` شمعة (المسافة المستقيمة بين البداية والنهاية) ÷ مجموع كل الحركات
 * المطلقة شمعة-بشمعة خلال نفس النافذة (المسافة الفعلية المقطوعة زيغاً وزوراً). قيمة قريبة من 1
 * تعني اتجاهاً نظيفاً وكفوءاً (كل الحركة صافية باتجاه واحد)، وقريبة من صفر تعني سوقاً عرضياً متذبذباً
 * (حركة كثيرة لكن صافيها شبه معدوم). **صفر منطق حساب جديد بمعزل عن الملف** — هذا حرفياً نفس حساب ER
 * الداخلي المستخدَم أصلاً بـ`computeKama` أعلاه (`change`/`volatility`/`er`) لكن مُستخرَجاً كدالة
 * مستقلة قابلة للعرض بمعزل عن KAMA — إعادة استخدام لصيغة مُختبَرة أصلاً بالمشروع، لا صيغة جديدة.
 * **حدود القيمة مضمونة رياضياً**: 0 ≤ ER ≤ 1 دائماً بمتباينة المثلث (مجموع القيم المطلقة لسلسلة
 * فروق ≥ القيمة المطلقة لمجموعها الجبري) — بنفس فلسفة إثبات حدود PFE أعلاه. حارس `volatility === 0`
 * (سوق مسطّح تماماً بكل النافذة) يُرجِع 0 بدل 0/0=NaN، بنفس اصطلاح KAMA الداخلي حرفياً.
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (60 شمعة) →
 * ER=0 بالضبط لكل نقطة صالحة (أول فهرس صالح=period=10، يطابق KAMA)؛ مسار خطي صارم (فرق ثابت
 * +1/شمعة، 100 شمعة) → ER=1 بالضبط (كفاءة مثالية، الحركة كلها صافية باتجاه واحد) لكل نقطة صالحة؛
 * 300 شمعة عشوائية بذرة ثابتة (mulberry32، seed=777) → صفر NaN/Infinity وصفر تجاوز لحدّي [0,1]؛
 * **إعادة حساب brute-force مستقلة تماماً عن الدالة نفسها** (حلقة change/volatility معزولة) عند 5
 * فهارس متفرقة (30/80/150/220/299) → صفر اختلاف واحد.
 */
export function computeEfficiencyRatio(closes: number[], period = 10): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    const change = Math.abs(closes[i] - closes[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(closes[j] - closes[j - 1]);
    }
    out[i] = volatility === 0 ? 0 : change / volatility;
  }
  return out;
}

/**
 * Triangular Moving Average (TRIMA) — متوسط متحرك بوزن مثلثي: القيم الوسطى بالنافذة تأخذ أعلى وزن،
 * ويتناقص الوزن تدريجياً نحو طرفي النافذة (بعكس SMA ذي الوزن المتساوي أو WMA ذي الوزن الخطي أحادي
 * الاتجاه). **التعريف القياسي المعتمَد** (نفس اصطلاح TA-Lib/Metastock): بدل حساب أوزان مثلثية
 * صريحة، يُطبَّق SMA مرتين متتاليتين بفترتين نصفيتين محسوبتين من `period` — الفترة الفردية:
 * half1=half2=(period+1)/2؛ الفترة الزوجية: half1=period/2، half2=period/2+1 (عدم تناظر متعمَّد
 * للفترة الزوجية بلا نقطة وسط صحيحة). **صفر منطق حساب جديد** — إعادة استخدام كاملة لدالة `sma()`
 * المحلية مرتين متتاليتين (SMA-of-SMA)، بنفس فلسفة إعادة استخدام `sma()`/`ema()` المتّبعة بالملف
 * لعشرات المؤشرات أعلاه (مثل DMA/GMMA/Rainbow Oscillator). طول الإحماء الكلي=period−1 بالضبط في
 * الحالتين الفردية والزوجية على حدّ سواء (half1+half2=period+1 دائماً جبرياً، فيُصبح أول فهرس صالح
 * =half1+half2−2=period−1) — مطابق تماماً لطول إحماء SMA(period) العادية رغم اختلاف توزيع الوزن.
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (60 شمعة،
 * period=20 وperiod=21) → TRIMA=السعر الثابت بالضبط لكل نقطة صالحة، وأول فهرس صالح=period−1 بالضبط
 * للحالتين؛ مسار خطي صارم (فرق ثابت +1/شمعة، 300 شمعة) → TRIMA[i] يطابق تحليلياً
 * i−(half1−1)/2−(half2−1)/2 (انزياح مزدوج التمركز المتوقَّع رياضياً من SMA-of-SMA لسلسلة خطية) بفرق
 * <10⁻⁹ لكلا الفترتين؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32، seed=12345) → صفر NaN/Infinity؛
 * **إعادة حساب brute-force مستقلة تماماً عن دالة `sma()` نفسها** (تكرار مجموع مثلثي متداخل يدوياً
 * بمعزل تام عن أي استدعاء لـ`sma()`) عند 5 فهارس متفرقة (30/80/150/220/299) لكلا الفترتين → صفر
 * اختلاف واحد.
 */
export function computeTrima(closes: number[], period = 20): (number | null)[] {
  const half1 = period % 2 === 0 ? period / 2 : (period + 1) / 2;
  const half2 = period % 2 === 0 ? period / 2 + 1 : (period + 1) / 2;
  const first = sma(closes, half1);
  const filledFirst = first.map((v) => v ?? 0);
  const second = sma(filledFirst, half2);
  const threshold = period - 1;
  return second.map((v, i) => (i >= threshold ? v : null));
}

/**
 * Trend Trigger Factor (TTF، إم. إتش. بي M.H. Pee، 2004) — يقارن "قوة الشراء" بـ"قوة البيع" عبر
 * نافذتين متتاليتين من القمم/القيعان (نافذة حديثة ونافذة أقدم مباشرة قبلها بنفس الطول)، بمنطق شبيه
 * بمفهوم CCI لكن بمقارنة نافذتين زمنيتين بدل انحراف عن متوسط. **الصيغة القياسية** (period=15
 * الافتراضي — تأكيد صيغة عبر WebFetch من مرجعين مستقلّين قبل الكتابة: traders.com الأصلي وتطبيق
 * ProRealCode): لنافذة حديثة=[i−period+1، i] ونافذة أقدم=[i−2×period+1، i−period] مباشرة قبلها:
 * - BP (Buying Power) = أعلى قمة بالنافذة الحديثة − أدنى قاع بالنافذة الأقدم
 * - SP (Selling Power) = أعلى قمة بالنافذة الأقدم − أدنى قاع بالنافذة الحديثة
 * - TTF = 100 × (BP − SP) / (0.5 × (BP + SP))
 * **بلا تنعيم T3 إضافي** (بعض تطبيقات MT4/MT5 اللاحقة تضيف تنعيم T3 اختيارياً فوق TTF الخام — غير
 * موجود بتعريف Pee الأصلي 2004، فاستُبعِد هنا حفاظاً على الصيغة القياسية الخام بنفس فلسفة باقي
 * المذبذبات الخام بالملف [BOP/CMO/MFI]). أول فهرس صالح = 2×period−1 (يحتاج نافذتين متتاليتين
 * كاملتين). **بلا حدّ نظري صارم** (بعكس RSI/CCI المحصورين) — القيمتان ±100 بمرجعه الأصلي مجرد
 * "مستويات إشارة" تقليدية شائعة إحصائياً لا حدّاً رياضياً مضموناً، مطابق لملاحظة كل مراجعه. **حارس
 * القسمة**: BP+SP=0 يقع فقط بسوق مسطّح تماماً بكلتا النافذتين (BP=SP=0 معاً) — يُرجِع 0 بدل 0/0=NaN،
 * بنفس اصطلاح حراس القسمة الأخرى بالملف. **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل
 * الكتابة)**: سوق مسطّح تماماً (60 شمعة) → TTF=0 بالضبط لكل نقطة صالحة، أول فهرس صالح=29 بالضبط
 * (2×15−1)؛ مسار صاعد صارم بلا أي تراجع (80 شمعة) → TTF موجب كبير ثابت (200 بالضبط بهذا الاختبار
 * الاصطناعي — تحقَّق يدوياً بإعادة حساب مستقلة)؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر
 * NaN/Infinity؛ **إعادة حساب brute-force مستقلة تماماً** (حلقتا أعلى/أدنى منفصلتان معزولتان تماماً
 * عن الدالة نفسها) عند 5 فهارس متفرقة (40/90/150/220/299) → صفر اختلاف واحد.
 */
export function computeTtf(candles: Pick<Candle, 'high' | 'low'>[], period = 15): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 2 * period - 1; i < n; i++) {
    let hhRecent = -Infinity;
    let llRecent = Infinity;
    let hhOlder = -Infinity;
    let llOlder = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > hhRecent) hhRecent = candles[j].high;
      if (candles[j].low < llRecent) llRecent = candles[j].low;
    }
    for (let j = i - 2 * period + 1; j <= i - period; j++) {
      if (candles[j].high > hhOlder) hhOlder = candles[j].high;
      if (candles[j].low < llOlder) llOlder = candles[j].low;
    }
    const bp = hhRecent - llOlder;
    const sp = hhOlder - llRecent;
    const denom = 0.5 * (bp + sp);
    out[i] = denom === 0 ? 0 : (100 * (bp - sp)) / denom;
  }
  return out;
}
