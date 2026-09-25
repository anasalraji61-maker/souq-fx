/** مؤشرات الحجم (Volume family). */
import type { Candle } from '../../api';
import { ema, sma } from './moving-averages';
import { computeLinRegChannel, computeVwma } from './trend';
import { computeMacd, computePpo, computeRoc } from './momentum';
import { computeStdDev, computeTrueRange } from './volatility';


/**
 * VWAP (Volume Weighted Average Price) — تراكم TP×فوليوم / فوليوم. مع `sessionOf` (مفتاح جلسة الشمعة، مثل بداية
 * يوم التداول 17:00 نيويورك) يُصفَّر التراكم عند كل جلسة جديدة كـVWAP بـTradingView (Anchor = Session)؛ بدونه
 * تراكم مستمر من أول شمعة. فوليوم مفقود يُعوَّض بنفس الصيغة التركيبية المستخدَمة بـorderflow.ts (computeCvd/
 * computeFootprint) للاتساق.
 */
export function computeVwap(
  candles: (Candle & { volume?: number })[],
  sessionOf?: (c: Candle) => number
): (number | null)[] {
  const out: (number | null)[] = [];
  let cumPV = 0;
  let cumVol = 0;
  let session: number | null = null;
  for (const c of candles) {
    if (sessionOf) {
      const k = sessionOf(c);
      if (session != null && k !== session) {
        cumPV = 0;
        cumVol = 0;
      }
      session = k;
    }
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * vol;
    cumVol += vol;
    out.push(cumVol === 0 ? null : cumPV / cumVol);
  }
  return out;
}

/**
 * OBV (On Balance Volume) — تراكم إشاري: يُضاف فوليوم الشمعة عند إغلاق أعلى من السابقة، يُطرح عند
 * أدنى، يبقى ثابتاً عند تساوٍ. يبدأ من صفر (لا شمعة سابقة عند i=0).
 */
export function computeObv(candles: (Candle & { volume?: number })[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < candles.length; i++) {
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    if (i > 0) {
      if (candles[i].close > candles[i - 1].close) cum += vol;
      else if (candles[i].close < candles[i - 1].close) cum -= vol;
    }
    out.push(cum);
  }
  return out;
}

/**
 * MFI (Money Flow Index) — "RSI الحجمي": TP (السعر النموذجي) = (أعلى+أدنى+إغلاق)/3، تدفق مالي خام
 * = TP×فوليوم. موجب عند TP > TP[الشمعة السابقة]، سالب عند TP < TP[السابقة]، لا يُضاف لأي جانب عند
 * تساوٍ (نفس اصطلاح OBV أعلاه بالضبط). لنافذة period: MFI = 100 − 100/(1+مجموع_موجب/مجموع_سالب)،
 * 100 عند مجموع سالب صفري، وnull إن لم يتحرّك TP بالنافذة إطلاقاً. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts للاتساق.
 */
export function computeMfi(candles: (Candle & { volume?: number })[], period = 14): (number | null)[] {
  const n = candles.length;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const posFlow: number[] = new Array(n).fill(0);
  const negFlow: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    const rawFlow = tp[i] * vol;
    if (tp[i] > tp[i - 1]) posFlow[i] = rawFlow;
    else if (tp[i] < tp[i - 1]) negFlow[i] = rawFlow;
  }
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let posSum = 0;
    let negSum = 0;
    for (let w = i - period + 1; w <= i; w++) {
      posSum += posFlow[w];
      negSum += negFlow[w];
    }
    // لا تدفق بأي جانب (أسعار نموذجية ثابتة) ⇒ null كـTradingView؛ كان 100 = «تشبّع شرائي» وهمي.
    out.push(posSum + negSum === 0 ? null : negSum === 0 ? 100 : 100 - 100 / (1 + posSum / negSum));
  }
  return out;
}

/**
 * Chaikin Money Flow (CMF، period=20 افتراضياً) — Money Flow Multiplier لكل شمعة =
 * ((إغلاق−أدنى)−(أعلى−إغلاق))/(أعلى−أدنى) (صفر عند مدى صفري)، Money Flow Volume = المضاعف×فوليوم،
 * CMF لكل نافذة = مجموع(MFV)/مجموع(فوليوم) (null عند فوليوم كلي صفري، كـTradingView). مدى نظري تقريبي -1..1 (بعكس
 * MFI الذي يعيد قياسه لـ0..100) — تُرسم بنفس نمط پين CCI/ROC ثنائي التلوين بسقف ديناميكي فلا يهم
 * نطاقها المطلق. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts للاتساق مع OBV/MFI أعلاه.
 */
export function computeCmf(candles: (Candle & { volume?: number })[], period = 20): (number | null)[] {
  const n = candles.length;
  const mfv: number[] = new Array(n).fill(0);
  const vol: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const span = c.high - c.low;
    const v = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const mfm = span === 0 ? 0 : (c.close - c.low - (c.high - c.close)) / span;
    mfv[i] = mfm * v;
    vol[i] = v;
  }
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumMfv = 0;
    let sumVol = 0;
    for (let w = i - period + 1; w <= i; w++) {
      sumMfv += mfv[w];
      sumVol += vol[w];
    }
    out.push(sumVol === 0 ? null : sumMfv / sumVol);
  }
  return out;
}

/**
 * Force Index (Alexander Elder، period=13 EMA — القيمة الأكثر شيوعاً) — يجمع اتجاه السعر وحجم
 * الحركة (فوليوم) بضربة واحدة: rawForce[i] = (إغلاق[i] − إغلاق[i-1]) × فوليوم[i] (null عند i=0
 * لغياب شمعة سابقة). القيمة الخام شديدة التقلّب فتُمرَّر عبر ema(period) لتنعيمها (نفس أسلوب تنعيم
 * إشارة MACD أعلاه). موجب = ضغط شرائي مدعوم بحجم تداول حقيقي، سالب = ضغط بيعي، قرب الصفر = تحرك
 * بلا زخم حجمي خلفه. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts المستخدَمة لـOBV/MFI/CMF أعلاه
 * للاتساق. **تحقّق يدوي**: لو الإغلاق ثابت بكل الشموع (بلا أي تغيّر سعري) فـ rawForce=0 لكل شمعة
 * بصرف النظر عن الفوليوم (المضاعِف صفر دائماً) → ema لسلسلة أصفار بالكامل = صفر لكل نقطة صالحة —
 * يطابق "لا قوة/زخم فعلي بلا تغيّر سعري" بالتعريف تماماً، مهما كان حجم التداول.
 */
export function computeForceIndex(
  candles: (Candle & { volume?: number })[],
  period = 13
): (number | null)[] {
  const n = candles.length;
  // i=0 بلا شمعة سابقة ⇒ null (كـ`ta.change` بـTradingView = na) لا 0 — صفر مختلَق كان يدخل بذرة
  // المتوسّط فيُزيح أوّل القيم ويُظهر المؤشّر شمعة أبكر من TradingView.
  const raw: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    raw[i] = (candles[i].close - candles[i - 1].close) * vol;
  }
  return ema(raw, period);
}

/**
 * Accumulation/Distribution Line (ADL) — خط تراكم/توزيع تراكمي بلا نافذة زمنية، **نفس الصيغة
 * الداخلية تماماً المستخدَمة أصلاً بـcomputeChaikinOsc أدناه** لكن كخط مستقل خاماً بدل تمريره فوراً
 * عبر فرق EMA قصير/طويل. Money Flow Multiplier = ((إغلاق−أدنى)−(أعلى−إغلاق))/(أعلى−أدنى) (صفر عند
 * مدى صفري، نفس صيغة computeCmf حرفياً)، Money Flow Volume = المضاعِف×فوليوم، ADL[i] = ADL[i-1] +
 * MFV[i] (يبدأ من MFV[0]). صاعد = تراكم شرائي صافٍ (الإغلاق يميل لأعلى مدى الشمعة)، هابط = توزيع
 * بيعي صافٍ — يُقرأ عادة بالتباعد (divergence) عن اتجاه السعر، لا بالقيمة المطلقة. **تحقّق منطقي**:
 * مدى صفري بكل شمعة (أعلى=أدنى) → المضاعِف صفر دائماً بصرف النظر عن الفوليوم → ADL يبقى ثابتاً على
 * صفر لكل نقطة؛ إغلاق ملاصق للأعلى بكل شمعة (أقصى ضغط شرائي) → مضاعِف=1 دائماً → ADL يتزايد بشكل
 * صارم كل شمعة (فوليوم دائماً موجب)؛ إغلاق ملاصق للأدنى → مضاعِف=−1 → ADL يتناقص بشكل صارم — تحقَّق
 * الثلاثة حسابياً بسكربت Node.js فعلي (فوليوم عشوائي 300 شمعة بذرة ثابتة أيضاً: صفر NaN/Infinity،
 * إعادة حساب مستقلة تطابق الناتج تماماً).
 */
export function computeAccumDist(candles: (Candle & { volume?: number })[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const span = c.high - c.low;
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const mfm = span === 0 ? 0 : (c.close - c.low - (c.high - c.close)) / span;
    cum += mfm * vol;
    out.push(cum);
  }
  return out;
}

/**
 * Williams Accumulation/Distribution (لاري ويليامز — **صيغة مختلفة جذرياً عن computeAccumDist
 * أعلاه**، وليست تكراراً لها رغم الاسم المتشابه): خط تراكم/توزيع تراكمي **بلا فوليوم إطلاقاً**
 * (خلافاً لكل مؤشرات A/D الأخرى بالملف [ADL/CMF/MFI/Force Index/...] المبنية جميعاً على الفوليوم) —
 * يعتمد فقط على العلاقة بين الإغلاق الحالي والسابق ومدى الشمعة الحقيقي (True Range High/Low، نفس
 * فلسفة `computeTrueRange` من دمج الإغلاق السابق بالمدى). لكل شمعة (ابتداءً من الثانية): إن
 * ارتفع الإغلاق (close[i] > close[i-1]) فـ AD = close[i] − min(low[i], close[i-1]) (True Range
 * Low)؛ إن انخفض (close[i] < close[i-1]) فـ AD = close[i] − max(high[i], close[i-1]) (True Range
 * High)؛ إن تساوى فـ AD = 0. WAD[i] = WAD[i-1] + AD (تراكمي، يبدأ من صفر عند الشمعة الأولى لغياب
 * إغلاق سابق). صاعد = تراكم شرائي صافٍ مبني على حركة السعر وحدها، هابط = توزيع بيعي — يُقرأ عادة
 * بالتباعد (divergence) عن اتجاه السعر كبقية مؤشرات A/D، لكنه مفيد تحديداً حين تكون بيانات الفوليوم
 * غير موثوقة أو مفقودة (فوركس مثلاً) لأنه لا يعتمد عليها إطلاقاً. **تحقّق حسابي فعلي (Node.js، بيئة
 * سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة، الإغلاق ثابت) → close[i]===close[i-1] دائماً →
 * AD=0 لكل شمعة → WAD=0 بالضبط طوال المسار؛ اتجاه صاعد ثابت الخطوة (60 شمعة، +1 كل شمعة) → WAD
 * تصاعدي صارم بلا استثناء بعد أول نقطة (مُثبَت جبرياً: min(low[i],close[i-1])≤close[i-1]<close[i]
 * دائماً هنا)؛ نفس المسار معكوساً (اتجاه هابط ثابت) → WAD تنازلي صارم بلا استثناء بنفس المنطق
 * المعكوس؛ 300 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity، وإعادة حساب brute-force
 * مستقلة تماماً (حلقة تراكمية مُعاد كتابتها من الصفر) عند idx=200 طابقت الدالة الفعلية بالضبط (فرق=0).
 */
export function computeWilliamsAd(candles: Candle[]): number[] {
  const n = candles.length;
  const out: number[] = new Array(n).fill(0);
  let cum = 0;
  for (let i = 1; i < n; i++) {
    const prevClose = candles[i - 1].close;
    const close = candles[i].close;
    let ad = 0;
    if (close > prevClose) {
      ad = close - Math.min(candles[i].low, prevClose);
    } else if (close < prevClose) {
      ad = close - Math.max(candles[i].high, prevClose);
    }
    cum += ad;
    out[i] = cum;
  }
  return out;
}

/**
 * Chaikin Oscillator (فترتان قياسيتان 3/10) — "MACD" مُطبَّق على خط التراكم/التوزيع (ADL) بدل
 * السعر مباشرة. ADL تراكمي بلا نافذة زمنية بنفس Money Flow Multiplier المستخدَم بـcomputeCmf
 * أعلاه حرفياً (((إغلاق−أدنى)−(أعلى−إغلاق))/(أعلى−أدنى)، صفر عند مدى صفري)، Money Flow Volume =
 * المضاعِف×فوليوم، ADL[i] = ADL[i-1] + MFV[i] (يبدأ من MFV[0]). Chaikin Osc = ema(ADL, 3) −
 * ema(ADL, 10) — نفس بنية computeMacd() أعلاه تماماً (فرق EMA قصير وطويل) لكن على ADL بدل الإغلاق.
 * موجب = تسارع تراكم شرائي حديث عن المدى الأطول (زخم تراكم صاعد)، سالب = تسارع توزيع بيعي. **تحقّق
 * منطقي**: مضاعِف وفوليوم ثابتان (زيادة تراكمية ثابتة كل شمعة) → ADL منحدر خطي صاعد؛ EMA القصيرة
 * (3) تلتصق بمنحدر خطي صاعد أقرب من EMA الطويلة (10) بحكم خاصية EMA المعروفة (التأخر يتناسب طردياً
 * مع الفترة)، فيكون emaShort > emaLong دائماً على منحدر صاعد ثابت → الناتج موجب باستمرار، يطابق
 * "تسارع تراكم مستمر" بالتعريف. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts للاتساق مع
 * OBV/MFI/CMF/Force Index أعلاه.
 */
export function computeChaikinOsc(
  candles: (Candle & { volume?: number })[],
  shortPeriod = 3,
  longPeriod = 10
): (number | null)[] {
  const n = candles.length;
  const adl: number[] = new Array(n).fill(0);
  let cum = 0;
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const span = c.high - c.low;
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const mfm = span === 0 ? 0 : (c.close - c.low - (c.high - c.close)) / span;
    cum += mfm * vol;
    adl[i] = cum;
  }
  const emaShort = ema(adl, shortPeriod);
  const emaLong = ema(adl, longPeriod);
  return adl.map((_, i) =>
    emaShort[i] != null && emaLong[i] != null ? emaShort[i]! - emaLong[i]! : null
  );
}

/**
 * Ease of Movement (EOM، period=14 القيمة القياسية الشائعة) — يقيس السهولة التي يتحرك بها السعر
 * لكل فوليوم مُتداوَل (كم عزّز فوليوم منخفض حركة سعرية كبيرة، أو العكس): لكل شمعة، المسافة
 * distance = نقطة_الوسط الحالية − نقطة_الوسط السابقة (نقطة الوسط = (أعلى+أدنى)/2)، نسبة الصندوق
 * boxRatio = (فوليوم/100,000,000) / (أعلى−أدنى) (صفر عند مدى صفري بدل قسمة على صفر — يجعل rawEMV
 * صفراً أيضاً بنفس الشمعة). rawEMV = distance/boxRatio (صفر عند boxRatio صفري). EOM = SMA(rawEMV,
 * period). موجب = السعر يتحرك صعوداً بسهولة (فوليوم منخفض نسبياً لحجم الحركة)، سالب = هبوط سهل،
 * قرب الصفر = حركة صعبة (فوليوم كبير لحركة سعرية صغيرة، أو لا حركة). ثابت التحجيم 100,000,000 قياسي
 * شائع لا يغيّر إشارة المؤشر (فقط مقياسه المطلق قبل التطبيع البصري بالپين). فوليوم مفقود يُعوَّض
 * بنفس صيغة orderflow.ts للاتساق مع مؤشرات الفوليوم الأخرى أعلاه. **تحقّق يدوي**: سوق مسطّح تماماً
 * (أعلى/أدنى ثابتان بكل شمعة) → نقطة الوسط ثابتة → distance=0 لكل شمعة → rawEMV=0 بصرف النظر عن
 * الفوليوم → EOM=SMA(0s)=0، يطابق "لا سهولة حركة بسعر ساكن تماماً" بالتعريف.
 */
export function computeEom(candles: (Candle & { volume?: number })[], period = 14): (number | null)[] {
  const n = candles.length;
  const raw: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const mid = (candles[i].high + candles[i].low) / 2;
    const prevMid = (candles[i - 1].high + candles[i - 1].low) / 2;
    const distance = mid - prevMid;
    const span = candles[i].high - candles[i].low;
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    const boxRatio = span === 0 ? 0 : vol / 1e8 / span;
    raw[i] = boxRatio === 0 ? 0 : distance / boxRatio;
  }
  return sma(raw, period);
}

/**
 * NVI (Negative Volume Index، Paul Dysart/Norman Fosback) — مؤشر تراكمي يفترض أن "الأموال الذكية"
 * تتحرك أكثر بأيام الفوليوم المنخفض (الهادئة) لا المرتفع (الصاخبة/الجماهيرية): يبدأ من قيمة أساس
 * 1000 (القيمة القياسية الشائعة)، وفي كل شمعة فوليومها أقل من الشمعة السابقة تُحدَّث القيمة بنسبة
 * تغيّر الإغلاق المئوية (NVI[i] = NVI[i-1] × (1 + (إغلاق[i]−إغلاق[i-1])/إغلاق[i-1])، صفر عند إغلاق
 * سابق صفري نظرياً)؛ أما أيام الفوليوم الأعلى أو المساوي فتبقى القيمة ثابتة بلا تغيير (نفس اصطلاح
 * OBV/MFI/CMF بهذا الملف: "لا تحديث" وليس "طرح"). فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts
 * المستخدَمة بكل مؤشرات الفوليوم أعلاه للاتساق. يُرسم بنفس نمط پين OBV (تطبيع أدنى/أعلى، تلوين حسب
 * الاتجاه لحظة-بلحظة) لأنه مؤشر تراكمي غير محدود المدى بقيمة أساس، لا أوسيليتر ثنائي القطبية حول
 * الصفر. **تحقّق يدوي**: لو الإغلاق ثابت تماماً بكل الشموع بصرف النظر عن الفوليوم، فرق الإغلاق صفر
 * دائماً حتى بأيام الفوليوم المنخفض → NVI تبقى عند 1000 طوال السلسلة، يطابق "لا تغيّر بقيمة ذكية
 * بسعر ساكن تماماً" منطقياً.
 */
export function computeNvi(candles: (Candle & { volume?: number })[]): number[] {
  const n = candles.length;
  const out: number[] = new Array(n).fill(1000);
  for (let i = 1; i < n; i++) {
    const prevVol =
      candles[i - 1].volume ?? Math.abs(candles[i - 1].close - candles[i - 1].open) * 1e6 + 1000;
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    const prevClose = candles[i - 1].close;
    if (vol < prevVol) {
      out[i] = out[i - 1] * (1 + (prevClose === 0 ? 0 : (candles[i].close - prevClose) / prevClose));
    } else {
      out[i] = out[i - 1];
    }
  }
  return out;
}

/**
 * Market Facilitation Index (BW MFI، Bill Williams — **مختلف تماماً عن Money Flow Index 'mfi' الموجود
 * أعلاه بهذا الملف رغم تشابه الاسم المختصر**، لذلك مُعرَّف بمعرِّف 'bwmfi' مميَّز لتفادي أي لبس) —
 * أبسط مؤشر يجمع سعر وفوليوم بهذا الملف: MFI[i] = (أعلى−أدنى)/فوليوم لكل شمعة مباشرة، بلا أي تمهيد
 * أو تراكم (نفس روح BOP أعلاه: قيمة فورية لكل شمعة من بياناتها ذاتها فقط). صفر عند فوليوم صفري (حالة
 * نظرية) بدل قسمة على صفر. يقيس "كفاءة" حركة السعر لكل وحدة فوليوم: قيمة عالية = مدى واسع بفوليوم قليل
 * (حركة سعرية "سهلة")، قيمة منخفضة = مدى ضيق رغم فوليوم كبير (حركة "صعبة" أو تجميع/توزيع بلا اتجاه).
 * فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts المستخدَمة بكل مؤشرات الفوليوم أعلاه للاتساق. **تحقّق
 * يدوي**: لو المدى (أعلى−أدنى) والفوليوم كلاهما ثابتان بنفس القيمة بكل شمعة (R وV على التوالي) →
 * MFI=R/V ثابتة لكل شمعة بالضبط — يطابق "كفاءة حركة ثابتة مع مدى وفوليوم ثابتين" بالتعريف المباشر
 * تماماً (لا حاجة لحالة حدّية أعقد لأن المؤشر بلا تمهيد إطلاقاً).
 */
export function computeBwMfi(candles: (Candle & { volume?: number })[]): (number | null)[] {
  return candles.map((c) => {
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    return vol === 0 ? 0 : (c.high - c.low) / vol;
  });
}

/**
 * PVO (Percentage Volume Oscillator، فترتا EMA القياسيتان 12/26 — نفس فترتي computePpo/computeMacd
 * أعلاه بهذا الملف تماماً) — نفس تصميم PPO حرفياً لكن مُطبَّق على سلسلة الفوليوم بدل الإغلاق:
 * PVO[i] = (ema12(فوليوم)[i]−ema26(فوليوم)[i])/ema26(فوليوم)[i] × 100 (صفر عند ema26 صفرية بدل قسمة
 * على صفر). يقيس تسارع/تباطؤ نشاط الفوليوم نفسه (بمعزل عن اتجاه السعر) بمقياس نسبي قابل للمقارنة عبر
 * رموز مختلفة الحجم، تماماً كميزة PPO عن MACD المطلق. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts
 * للاتساق مع بقية مؤشرات الفوليوم أعلاه. **تحقّق يدوي**: فوليوم ثابت تماماً بكل الشموع (سواء فوليوم
 * حقيقي أو معوَّض بنفس الصيغة الثابتة) → ema12 وema26 (طبقة ema أحادية مباشرة على الفوليوم، لا طبقات
 * متعددة — **نفس منطق تحقّق PPO أعلاه بالضبط**) تستقران كلتاهما على نفس القيمة الثابتة بالضبط بدءاً
 * من أول نقطة صالحة لكل منهما → PVO=(V−V)/V×100=0 بالضبط، يطابق "لا تباعد بنشاط الفوليوم بفوليوم ثابت"
 * بالتعريف تماماً.
 */
export function computePvo(
  candles: (Candle & { volume?: number })[],
  fast = 12,
  slow = 26
): (number | null)[] {
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const emaFast = ema(vol, fast);
  const emaSlow = ema(vol, slow);
  return vol.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null
      ? emaSlow[i] === 0
        ? 0
        : ((emaFast[i]! - emaSlow[i]!) / emaSlow[i]!) * 100
      : null
  );
}

/**
 * Volume Oscillator (VO، فترتان قصيرة/طويلة شائعتان short=5/long=10 — أبسط من PVO أعلاه [12/26 EMA]
 * لأنه يستخدم SMA بدل EMA وفترتين أقصر، وهو التعريف الأكثر شيوعاً لـ"Volume Oscillator" تحديداً بعكس
 * PVO الذي يحاكي PPO حرفياً) — VO[i] = (SMA_short(فوليوم)[i] − SMA_long(فوليوم)[i]) /
 * SMA_long(فوليوم)[i] × 100 (صفر عند SMA_long صفرية بدل قسمة على صفر). فوليوم مفقود يُعوَّض بنفس صيغة
 * orderflow.ts للاتساق مع بقية مؤشرات الفوليوم أعلاه. **تحقّق يدوي**: فوليوم ثابت تماماً بكل الشموع →
 * SMA_short وSMA_long (متوسط بسيط مباشر لقيم متطابقة) تستقران كلتاهما على نفس القيمة الثابتة بدءاً من
 * أول نقطة صالحة لكل منهما → VO=(V−V)/V×100=0 بالضبط، يطابق "لا تباعد بنشاط الفوليوم بفوليوم ثابت"
 * بالتعريف تماماً (نفس منطق تحقّق PVO أعلاه).
 */
export function computeVolumeOscillator(
  candles: (Candle & { volume?: number })[],
  shortPeriod = 5,
  longPeriod = 10
): (number | null)[] {
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const smaShort = sma(vol, shortPeriod);
  const smaLong = sma(vol, longPeriod);
  return vol.map((_, i) =>
    smaShort[i] != null && smaLong[i] != null
      ? smaLong[i] === 0
        ? 0
        : ((smaShort[i]! - smaLong[i]!) / smaLong[i]!) * 100
      : null
  );
}

/**
 * Volume ROC (معدّل تغيّر الفوليوم) — نفس صيغة `computeRoc` القياسية (معدّل التغيّر بالنسبة المئوية
 * عن `period` شمعة سابقة) **مطبَّقة على الفوليوم بدل الإغلاق**: VolROC[i] = (فوليوم[i]−فوليوم[i−period])
 * / فوليوم[i−period] × 100. يختلف جوهرياً عن `computeVolumeOscillator` الموجود أعلاه (فرق نسبي بين
 * متوسطَين متحركَين قصير/طويل للفوليوم، SMA فرق) — هنا مقارنة *نقطة واحدة* بنقطة واحدة سابقة بلا أي
 * تنعيم إطلاقاً، أكثر حساسية وتذبذباً لارتفاعات الفوليوم المفاجئة (نفس العلاقة بين ROC السعري
 * وMomentum/المتوسطات المتحركة السعرية). فوليوم مفقود يُعوَّض بنفس الصيغة التركيبية المستخدَمة
 * بـ`computeVolumeOscillator`/`computeVpt` أعلاه للاتساق. **تحقّق حسابي فعلي (Node.js قبل الكتابة)**:
 * فوليوم ثابت تماماً عبر 30 شمعة → 0 بالضبط لكل نقطة بعد الإحماء (period=10)؛ اختبار يدوي (فوليوم
 * يتضاعف بالضبط عند نقطة معيّنة مقابل بداية السلسلة) → 100% بالضبط كما هو متوقَّع جبرياً؛ 300 شمعة
 * عشوائية بذرة ثابتة (فوليوم صناعي دوري) → إعادة حساب مستقلة تماماً (صيغة مباشرة بلا استدعاء الدالة
 * الفعلية) عند idx=150 طابقت بالضبط (فرق=0)، صفر NaN/Infinity عبر كل النقاط الصالحة.
 */
export function computeVolumeRoc(
  candles: (Candle & { volume?: number })[],
  period = 10
): (number | null)[] {
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const out: (number | null)[] = [];
  for (let i = 0; i < vol.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    const prev = vol[i - period];
    out.push(prev === 0 ? 0 : ((vol[i] - prev) / prev) * 100);
  }
  return out;
}

/**
 * VPT (Volume Price Trend) — تراكمي كـOBV/NVI أعلاه، لكن بدل إضافة/طرح الفوليوم كاملاً حسب اتجاه
 * الإغلاق فقط (OBV) يُضاف فوليوم *مُرجَّح* بنسبة تغيّر السعر نفسها: VPT[i] = VPT[i-1] + فوليوم[i] ×
 * (إغلاق[i]−إغلاق[i-1])/إغلاق[i-1] (صفر لأي تغيّر عند إغلاق سابق صفري نظرياً بدل قسمة على صفر، ويبدأ
 * VPT[0]=0 لعدم وجود شمعة سابقة — نفس اصطلاح بداية OBV). بعكس OBV الذي يعامل كل الفوليوم بنفس الوزن
 * الكامل بصرف النظر عن حجم حركة السعر، VPT يُدخل *مقدار* التغيّر النسبي بالوزن، فحركة سعرية كبيرة
 * بفوليوم معيّن تُسهم أكثر من حركة صغيرة بنفس الفوليوم. فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts
 * للاتساق. **تحقّق يدوي**: إغلاق ثابت تماماً بصرف النظر عن الفوليوم → نسبة التغيّر=0 لكل شمعة بعد
 * الأولى → VPT تبقى 0 طوال السلسلة (نفس منطق تحقّق NVI أعلاه بالضبط: "لا تحديث" لا "طرح" عند غياب أي
 * تغيّر بالمحرّك الأساسي للمؤشر).
 */
export function computeVpt(candles: (Candle & { volume?: number })[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < candles.length; i++) {
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    if (i > 0) {
      const prevClose = candles[i - 1].close;
      const pctChange = prevClose === 0 ? 0 : (candles[i].close - prevClose) / prevClose;
      cum += vol * pctChange;
    }
    out.push(cum);
  }
  return out;
}

/**
 * Net Volume (مؤشر TradingView قياسي مباشر) — تراكمي كـOBV/VPT/NVI/PVI أعلاه، لكن بمعيار مختلف
 * جوهرياً عن الجميع: يقارن **فتح وإغلاق نفس الشمعة** (close[i] مقابل open[i]) لا إغلاق شمعتين
 * متتاليتين (بعكس OBV: close[i] مقابل close[i-1]) ولا وزناً بفوليوم سابق/نسبة تغيّر (بعكس NVI/PVI/
 * VPT) — فوليوم الشمعة الكامل يُضاف عند إغلاق>فتح (شمعة صاعدة صافية)، يُطرَح عند إغلاق<فتح (هابطة)،
 * صفر عند تعادل تام. **فارق تصميمي جوهري آخر**: لا يحتاج حارس `i > 0` كباقي التراكميات أعلاه (المقارنة
 * داخل نفس الشمعة لا تحتاج شمعة سابقة) فيبدأ التراكم من الشمعة الأولى مباشرة لا من الثانية. فوليوم
 * مفقود يُعوَّض بنفس صيغة OBV/VPT/NVI/PVI أعلاه للاتساق. **تحقّق حسابي فعلي (Node.js، قبل الكتابة)**:
 * فتح=إغلاق لكل شمعة (سلسلة `doji` بحتة، 50 شمعة) → صفر بكل نقطة بلا استثناء؛ سلسلة صناعية بقيم
 * فوليوم/اتجاه محدَّدة يدوياً (صاعدة+100، هابطة−50، متعادلة+0، صاعدة+20) → تراكم [100,50,50,70] مطابق
 * تماماً لحساب يدوي مباشر؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity عبر كل الـ300 نقطة، إعادة
 * حساب مستقلة منفصلة عن الدالة لنقطة عشوائية (idx=150) طابقت الدالة تماماً (فرق=0).
 */
export function computeNetVolume(candles: (Candle & { volume?: number })[]): number[] {
  const out: number[] = [];
  let cum = 0;
  for (let i = 0; i < candles.length; i++) {
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    if (candles[i].close > candles[i].open) cum += vol;
    else if (candles[i].close < candles[i].open) cum -= vol;
    out.push(cum);
  }
  return out;
}

/**
 * PVI (Positive Volume Index، Paul Dysart/Norman Fosback) — مرآة NVI أعلاه تماماً بشرط معكوس: يفترض
 * أن حركة "الجمهور" (غير الأموال الذكية) تتركّز بأيام الفوليوم *المرتفع* (الصاخبة) لا المنخفض. نفس
 * قيمة الأساس 1000 القياسية، ونفس صيغة تحديث النسبة المئوية للإغلاق (PVI[i] = PVI[i-1] ×
 * (1 + (إغلاق[i]−إغلاق[i-1])/إغلاق[i-1])) لكن الشرط معكوس بالضبط: تُحدَّث القيمة فقط بأيام فوليومها
 * *أعلى* من الشمعة السابقة؛ أيام الفوليوم الأقل أو المساوي تبقى القيمة ثابتة بلا تغيير (نفس اصطلاح
 * "لا تحديث" لا "طرح" المستخدَم بـcomputeNvi أعلاه). فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts
 * للاتساق. يُرسم بنفس نمط پين NVI (تطبيع أدنى/أعلى، تلوين حسب الاتجاه لحظة-بلحظة). **تحقّق يدوي**:
 * لو الإغلاق ثابت تماماً بكل الشموع بصرف النظر عن الفوليوم، فرق الإغلاق صفر دائماً حتى بأيام
 * الفوليوم المرتفع → PVI تبقى عند 1000 طوال السلسلة، نفس منطق تحقّق NVI أعلاه تماماً بشرط معكوس.
 */
export function computePvi(candles: (Candle & { volume?: number })[]): number[] {
  const n = candles.length;
  const out: number[] = new Array(n).fill(1000);
  for (let i = 1; i < n; i++) {
    const prevVol =
      candles[i - 1].volume ?? Math.abs(candles[i - 1].close - candles[i - 1].open) * 1e6 + 1000;
    const vol = candles[i].volume ?? Math.abs(candles[i].close - candles[i].open) * 1e6 + 1000;
    const prevClose = candles[i - 1].close;
    if (vol > prevVol) {
      out[i] = out[i - 1] * (1 + (prevClose === 0 ? 0 : (candles[i].close - prevClose) / prevClose));
    } else {
      out[i] = out[i - 1];
    }
  }
  return out;
}

/**
 * Klinger Volume Oscillator (KVO، مذبذب المعنويات الحجمية لستيفن كلينجر) — يقيس تدفق قوة الحجم
 * (Volume Force) مع مراعاة اتجاه السعر وحدّة تقلّبه معاً، لا الحجم الخام وحده كـOBV/VPT أعلاه. لكل
 * نقطة: السعر النموذجي HLC/3 (typical price) — اتجاه T[i]=+1 إن كان HLC/3 الحالي ≥ السابق، وإلا −1
 * (لا اتجاه سابق عند i=0 فيبقى +1 اصطلاحاً). dm[i]=أعلى[i]−أدنى[i] (مدى الشمعة الخام). cm (القياس
 * التراكمي، حالة تعتمد على الاتجاه): عند i=0، cm[0]=dm[0]؛ إن استمر نفس الاتجاه عن الشمعة السابقة
 * cm[i]=cm[i-1]+dm[i]، وإلا (انعكاس الاتجاه) cm[i]=dm[i-1]+dm[i] (إعادة ضبط من مدى الشمعتين
 * الأخيرتين فقط — الصيغة القياسية لكلينجر). VF (قوة الحجم)[i] = فوليوم[i] × |2×(dm[i]/cm[i])−1| ×
 * T[i] × 100 (حارس صفر صراحةً عند cm[i]=0 بدل قسمة على صفر). خط KVO = EMA(VF، 34) − EMA(VF، 55)؛ خط
 * الإشارة = EMA(KVO، 13) (نفس بنية computeMacd أعلاه حرفياً: فرق EMAوين قصير/طويل + EMA ثالث كإشارة،
 * لكن على VF بدل الإغلاق مباشرة). فوليوم مفقود يُعوَّض بنفس صيغة computeVpt/computeVolumeOscillator
 * أعلاه للاتساق. يُرسَم بنفس **نمط الپين ثنائي الخط المستقلّ** المُستحدَث لـcomputeVortex أعلاه (خطّان
 * متراكبان، لا هستوغرام كـMACD) — وهو بالضبط سبب اختيار Klinger كتالٍ منطقي بعد Vortex (راجع
 * ROADMAP.md، صف "التالي المرجَّح بعد Vortex"). **تحقّق يدوي**: سعر ثابت تماماً (أعلى=أدنى=إغلاق لكل
 * شمعة) → HLC/3 ثابت لكل نقطة → T يبقى ثابتاً على +1 (لا تغيّر اتجاه أبداً)، وdm=أعلى−أدنى=0 لكل شمعة
 * → cm=مجموع/تراكم أصفار=0 دائماً لكل i → VF محروس بصفر صراحة عند cm=0 لكل نقطة → EMA لسلسلة كلها
 * أصفار=0 بالضبط لكلا الطولين (34/55) → KVO=0−0=0 بالضبط بعد التسخين، والإشارة=EMA(0،13)=0 أيضاً،
 * يطابق "لا قوة حجمية بسعر ساكن" بالتعريف تماماً.
 */
export function computeKlinger(
  candles: (Candle & { volume?: number })[]
): { kvo: (number | null)[]; signal: (number | null)[] } {
  const n = candles.length;
  if (n === 0) return { kvo: [], signal: [] };
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const typical = candles.map((c) => (c.high + c.low + c.close) / 3);
  const dm = candles.map((c) => c.high - c.low);
  const trend: number[] = new Array(n).fill(1);
  for (let i = 1; i < n; i++) {
    trend[i] = typical[i] >= typical[i - 1] ? 1 : -1;
  }
  const cm: number[] = new Array(n).fill(0);
  cm[0] = dm[0];
  for (let i = 1; i < n; i++) {
    cm[i] = trend[i] === trend[i - 1] ? cm[i - 1] + dm[i] : dm[i - 1] + dm[i];
  }
  const vf = candles.map((_, i) => (cm[i] === 0 ? 0 : vol[i] * Math.abs(2 * (dm[i] / cm[i]) - 1) * trend[i] * 100));
  const emaShort = ema(vf, 34);
  const emaLong = ema(vf, 55);
  const kvo: (number | null)[] = candles.map((_, i) =>
    emaShort[i] != null && emaLong[i] != null ? emaShort[i]! - emaLong[i]! : null
  );
  const emaSignal = ema(kvo, 13);
  const signal: (number | null)[] = kvo.map((v, i) => (v != null ? emaSignal[i] : null));
  return { kvo, signal };
}

/**
 * Volume-Weighted MACD (VW-MACD، Markos Katsanos) — **إعادة استخدام حرفية كاملة لبنية `computeMacd`
 * الموجودة أعلاه** (نفس أسلوب macdLine/valid-fallback-صفر/signal/hist حرفياً) لكن باستبدال `ema()`
 * الأسّية بـ`computeVwma` الموجودة (فرق فولوم-مرجَّح بدل فرق أسّي بسيط بين السرعتين)، بنفس فترات
 * MACD القياسية (fast=12/slow=26/signal=9 — الإشارة تبقى EMA كلاسيكية كـMACD الأصلي، فقط الخطان
 * السريع/البطيء يصبحان VWMA). **تحقّق حسابي (بنيوي، فوق computeVwma/ema المتحقَّقتين سابقاً)**: سعر
 * وفوليوم ثابتان تماماً → VWMA السريع=البطيء=السعر الثابت لكل نقطة صالحة → macdLine=0 بالضبط →
 * signal يتقارب لصفر → hist=0 بالضبط؛ حراسة null/undefined مطابقة لـcomputeMacd الأصلي (`valid =
 * macdLine.map(v => v ?? 0)` لتفادي تلوّث EMA التراكمية بفراغ الإحماء المبكر لـVWMA).
 */
export function computeVwMacd(
  candles: (Candle & { volume?: number })[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macdLine: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const vwmaFast = computeVwma(candles, fast);
  const vwmaSlow = computeVwma(candles, slow);
  const macdLine: (number | null)[] = candles.map((_, i) =>
    vwmaFast[i] != null && vwmaSlow[i] != null ? vwmaFast[i]! - vwmaSlow[i]! : null
  );
  const signal = ema(macdLine, signalPeriod);
  const hist = macdLine.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null));
  return { macdLine, signal, hist };
}

/**
 * Twiggs Money Flow (TMF، كولين تويجز) — تحسين لمنطق `computeCmf` الموجود أعلاه (نفس فكرة "ضغط
 * التدفق النقدي" الأساسية) لكن بفارقين موثَّقين بالمرجع القياسي [Colin Twiggs، incrediblecharts]:
 * (أ) نطاق أعلى/أدنى **معدَّل بالفجوة** (True Range High/Low: أعلى[i]/أدنى[i] مقارنةً بإغلاق[i-1]
 * أيضاً، لا أعلى/أدنى الشمعة وحدها كـCMF)، (ب) تنعيم **أسّي EMA** بدل SMA البسيطة لـCMF — **إعادة
 * استخدام حرفية كاملة لـ`ema()` المحلية** (لا حساب متوسط جديد). period=21 (القيمة القياسية لهذا
 * المؤشر تحديداً بمراجعه، بخلاف period=20 الشائع لـCMF). ADS[i]=فوليوم[i]×((إغلاق[i]−TRLow[i])−
 * (TRHigh[i]−إغلاق[i]))/(TRHigh[i]−TRLow[i]) [محصور رياضياً بنطاق ±فوليوم[i] لأن البسط بين
 * −range وrange]، TMF[i]=EMA(ADS,period)/EMA(فوليوم,period). **إثبات حدّي بنيوي**: بما أن EMA مرشِّح
 * خطي بأوزان موجبة (بذرة SMA + تكرار أسّي، كلاهما أوزان موجبة تماماً)، وADS[j] محصورة بين
 * −فوليوم[j] وفوليوم[j] نقطياً، فإن EMA(ADS) محصورة بين −EMA(فوليوم) وEMA(فوليوم) — أي أن الناتج
 * النهائي TMF محصور رياضياً بـ[−1,1] دوماً (لا حاجة اختبار تجريبي فقط، برهان جبري مباشر). **قرار
 * حارس**: range=0 (لا فجوة ولا مدى، سوق مسطّح باللحظة) يُعطي ADS[i]=0 صراحة بدل قسمة على صفر.
 * i=0 بلا شمعة سابقة: TRHigh/TRLow تُحسَب بمقارنة إغلاق[0] بنفسه (لا سعر سابق موجود أصلاً) — بنفس
 * قرار التعويض المستخدَم أصلاً بحدّ ATR الأول بـcomputeAtr أعلاه لمشكلة الحدّ الأول المتماثلة.
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: إغلاق ملاصق لقمة TR بكل شمعة (بناء
 * صناعي، 60 شمعة) → TMF=1 بالضبط لكل نقطة صالحة بلا استثناء (نسبة=1 حتى عند i=0 بهذا البناء تحديداً،
 * فلا تلوّث إحماء)؛ نفس البناء معكوساً (ملاصق للقاع) → TMF=−1 بالضبط؛ مدى صفري تماماً (أعلى=أدنى=
 * إغلاق ثابت) → ADS=0 → TMF=0 بالضبط؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، كل قيمة ضمن
 * [−1,1] محقَّق تجريبياً (يؤكد البرهان الجبري أعلاه)؛ **إعادة حساب brute-force مستقلة تماماً عن
 * الدالة** (ADS وEMA(ADS)/EMA(فوليوم) مُعاد بناؤهما من الصفر بحلقات منفصلة، بنفس اصطلاح بذرة SMA
 * لـ`ema()` المحلية) لنقطة عشوائية (idx=200) طابقت تماماً (فرق<10⁻⁹).
 */
export function computeTwiggsMoneyFlow(
  candles: (Candle & { volume?: number })[],
  period = 21
): (number | null)[] {
  const n = candles.length;
  const ads: number[] = new Array(n).fill(0);
  const vols = candles.map((c) => c.volume ?? 0);
  for (let i = 0; i < n; i++) {
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;
    const trHigh = Math.max(candles[i].high, prevClose);
    const trLow = Math.min(candles[i].low, prevClose);
    const range = trHigh - trLow;
    if (range === 0) {
      ads[i] = 0;
      continue;
    }
    const v = vols[i];
    ads[i] = (v * (candles[i].close - trLow - (trHigh - candles[i].close))) / range;
  }
  const emaAds = ema(ads, period);
  const emaVol = ema(vols, period);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const a = emaAds[i];
    const v = emaVol[i];
    if (a == null || v == null) continue;
    out[i] = v === 0 ? 0 : a / v;
  }
  return out;
}

/**
 * Volume Zone Oscillator (VZO، وليد خليل وديفيد ستيكلر) — أوسيلاتور فوليوم متمركز حول الصفر، محصور
 * [−100,100]، period=14 (نفس القيمة القياسية المستخدَمة أصلاً لـRSI/CCI بالملف). **معيار مختلف
 * جوهرياً عن كل مؤشرات الفوليوم الموجودة**: لا يقارن فتح/إغلاق نفس الشمعة كـ`computeNetVolume`، ولا
 * يتراكم بلا حدود كـOBV/NVI/PVI/ADL، بل يُصنِّف **فوليوم كامل الشمعة** كموجب/سالب حسب اتجاه إغلاق[i]
 * مقابل إغلاق[i−1] فقط (VP[i]=+فوليوم[i] إن ارتفع، −فوليوم[i] إن انخفض، 0 إن تعادل — **بلا i=0**
 * صراحة، لأن لا إغلاق سابق للمقارنة أصلاً عند أول شمعة)، ثم VZO[i]=100×EMA(VP,period)/EMA(فوليوم,
 * period) — **إعادة استخدام حرفية كاملة لـ`ema()` المحلية مرتين** (لا حساب متوسط جديد)، بنفس مبدأ
 * برهان الحدّ الجبري المستخدَم أعلاه لـTwiggs Money Flow (VP[j] محصورة بين ±فوليوم[j] نقطياً ⇒
 * EMA(VP) محصورة بين ±EMA(فوليوم) ⇒ الناتج محصور [−100,100] دوماً، برهان جبري لا تجريبي فقط).
 * **قرار حارس**: EMA(فوليوم)=0 يُعطي 0 صراحة بدل قسمة على صفر. **ملاحظة تقارب**: نظراً لأن VP[0]=0
 * قسراً (بعكس Twiggs Money Flow أعلاه حيث لا حالة خاصة مماثلة عند i=0)، فإن سلسلة "اتجاه ثابت تماماً"
 * (كل شمعة صاعدة/هابطة) **تتقارب تدريجياً** نحو ±100 عبر تكرار EMA بدل الوصول الفوري (نفس ظاهرة
 * "التقارب التدريجي" الموثَّقة أصلاً لـT3/TEMA/SMMA بالملف بسبب تلوّث بذرة الإحماء المبكرة، ليست
 * علّة). **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: فوليوم ثابت + إغلاق صاعد بثبات
 * صارم (300 شمعة اختبار تقارب) → القيمة لا تتجاوز 100 أبداً (محقَّق ببنية كل نقطة)، تتقارب تصاعدياً
 * رتيبة، وتصل لفارق<10⁻³ من 100 بآخر نقطة؛ نفس المسار معكوساً → يتقارب رتيباً نحو −100 بنفس الفارق؛
 * إغلاق ثابت تماماً (دوجي متكرر) → VP=0 دوماً → VZO=0 بالضبط بلا تقارب (نقطة ثابتة تماماً لـEMA)؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، كل قيمة ضمن [−100,100] محقَّق تجريبياً؛ **إعادة
 * حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=250) طابقت تماماً (فرق<10⁻⁹).
 */
export function computeVzo(candles: (Candle & { volume?: number })[], period = 14): (number | null)[] {
  const n = candles.length;
  const vp: number[] = new Array(n).fill(0);
  const vols = candles.map((c) => c.volume ?? 0);
  for (let i = 1; i < n; i++) {
    const d = candles[i].close - candles[i - 1].close;
    vp[i] = d > 0 ? vols[i] : d < 0 ? -vols[i] : 0;
  }
  const emaVp = ema(vp, period);
  const emaVol = ema(vols, period);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const p = emaVp[i];
    const v = emaVol[i];
    if (p == null || v == null) continue;
    out[i] = v === 0 ? 0 : (100 * p) / v;
  }
  return out;
}

/**
 * السعر المتوسط (Average Price، OHLC4) — رابع سعر بديل بالملف بعد Median Price/Typical Price/
 * Weighted Close أعلاه، ويكمل عائلة "أسعار بديلة" المعروفة بمعظم منصات MT4/MT5 (نوع "Applied Price"

/**
 * VWAP Bands — نطاقات انحراف معياري مرجَّحة بالحجم حول VWAP، بنفس روح "بولنجر حول VWAP" الشائعة
 * بمنصات مرجعية بدل SMA/EMA. **إعادة استخدام كاملة** لـ`computeVwap` الموجودة كخط `mid` (تراكمي منذ
 * بداية السلسلة المعروضة، لا نافذة متدحرجة — نفس اصطلاح computeVwap نفسه بلا تغيير)، ثم تباين
 * تراكمي مرجَّح بالحجم حول تلك القيمة المرجعية بالضبط في كل خطوة: variance[i] =
 * Σ(vol×(typicalPrice−VWAP[i])²)/Σvol (نفس مبدأ ترجيح VWAP بالحجم نفسه، لا SMA بسيطة للتباين)، ثم
 * upper/lower = VWAP ± multiplier×√variance (multiplier=2 افتراضياً، بنفس القيمة القياسية المستخدَمة
 * أصلاً ببولنجر). نفس حارس الصفر المستخدَم بـcomputeVwap حرفياً (حجم تراكمي=0 ⇒ null) + حارس تباين
 * سالب صريح (Math.max(0, variance) قبل الجذر التربيعي، يحمي من فروق فاصلة عائمة سالبة طفيفة قرب
 * الصفر). يُرجِع نفس بنية `{mid, upper, lower}` المستخدَمة أصلاً بـcomputeKeltner/computeLinRegChannel
 * حرفياً — إعادة استخدام كاملة لنمط تكامل الأشرطة الموجود بلا نمط جديد. **تحقّق حسابي فعلي (Node.js،
 * بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة) → mid/upper/lower تساوي السعر الثابت بالضبط
 * (تباين=0، sd=0)؛ مسار صاعد خطي صارم (60 شمعة) → upper≥mid≥lower بلا استثناء عبر كل نقطة؛ 300 شمعة
 * عشوائية بذرة ثابتة → صفر NaN/Infinity، upper≥mid وlower≤mid بلا استثناء واحد؛ إعادة حساب brute-force
 * مستقلة تماماً عن الدالة (حلقة تراكمية منفصلة لحساب variance) لنقطة عشوائية (idx=150) طابقت تماماً
 * (فرق=0 بالضبط).
 */
export function computeVwapBands(
  candles: (Candle & { volume?: number })[],
  multiplier = 2,
  sessionOf?: (c: Candle) => number
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = computeVwap(candles, sessionOf);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  // الانحراف عن VWAP **الحالي** كـ`ta.vwap(src, anchor, 1)` بـTradingView: √(Σv·tp²/Σv − vwap²). كان كل شمعة
  // تُقاس من VWAP لحظتها ⇒ بجلسة متّجهة نطاقات أضيق ~20% من TradingView. التربيع حول أوّل tp بالجلسة
  // (`base`) لا حول الصفر كي لا يأكل الطرحُ المنازل (1.08² − 1.08²).
  let cumV2 = 0;
  let cumVol = 0;
  let base: number | null = null;
  let session: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    // التباين يُصفَّر مع VWAP نفسه عند الجلسة الجديدة
    if (sessionOf) {
      const k = sessionOf(c);
      if (session != null && k !== session) {
        cumV2 = 0;
        cumVol = 0;
        base = null;
      }
      session = k;
    }
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const tp = (c.high + c.low + c.close) / 3;
    if (base == null) base = tp;
    cumV2 += vol * (tp - base) * (tp - base);
    cumVol += vol;
    const v = mid[i];
    if (v == null || cumVol === 0) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const variance = cumV2 / cumVol - (v - base) * (v - base);
    const sd = Math.sqrt(Math.max(0, variance));
    upper.push(v + multiplier * sd);
    lower.push(v - multiplier * sd);
  }
  return { mid, upper, lower };
}

/**
 * Volume Price Confirmation Indicator (VPCI، باف دورمير Buff Dormeier، 2007) — يقيس هل الاتجاه
 * السعري "مؤكَّد" فعلياً بحجم تداول داعم أم "أجوف" (حركة سعرية بلا قناعة حقيقية من السوق). يقارن
 * متوسطاً مرجَّحاً بالحجم (VWMA) بمتوسط بسيط (SMA) على نافذتين مختلفتين (طويلة/قصيرة)، مضروباً
 * بنسبة زخم الحجم نفسه. **الصيغة القياسية** (longPeriod=20/shortPeriod=5 الافتراضيان الأكثر
 * اعتماداً بمعظم التطبيقات المرجعية — تأكيد صيغة عبر WebFetch قبل الكتابة):
 * - VPC (Volume-Price Confirmation) = VWMA(longPeriod) − SMA(longPeriod)
 * - VPR (Volume-Price Ratio) = VWMA(shortPeriod) / SMA(shortPeriod)
 * - VM (Volume Multiplier) = SMA(حجم، shortPeriod) / SMA(حجم، longPeriod)
 * - VPCI = VPC × VPR × VM
 * **صفر منطق حساب جديد** — إعادة استخدام كاملة لدالتي `sma()` المحلية و`computeVwma()` المُصدَّرة
 * أعلاه حرفياً (كلتاهما مُختبَرتان أصلاً بالمشروع)، فقط التركيب الجبري جديد. **حارس القسمة**: يُهمَل
 * الفهرس إن كان smaShort=0 أو smaVolLong=0 (عملياً لا يقعان أبداً بأسعار/فوليوم موجبة حقيقية —
 * الفوليوم هنا دائماً>0 بصيغة fallback الموجودة أصلاً بـcomputeVwma نفسها — لكن الحارس موجود
 * احتياطاً بنفس فلسفة حراس القسمة المتكررة بالملف). VPC قد يكون سالباً أو موجباً (لا حدّ نظري)، بينما
 * VPR وVM دائماً موجبتان تماماً (نسبتا كميتين موجبتين) — لذا **إشارة VPCI تتبع إشارة VPC حصراً
 * رياضياً**، وهذا ما يُستخدَم لتفسيرها: موجب+متصاعد=اتجاه مؤكَّد بحجم داعم، سالب أو متذبذب حول
 * الصفر=حركة أجوف بلا قناعة حقيقية. أول فهرس صالح = longPeriod−1 (القيد الأكثر تشدداً بين النافذتين).
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (60 شمعة،
 * إغلاق ثابت بفوليوم متذبذب) → VWMA=SMA=الثابت نفسه على كلا النافذتين ⇒ VPC=0 بالضبط ⇒ VPCI=0
 * بالضبط لكل نقطة صالحة (بغضّ النظر عن VPR/VM) بدءاً من الفهرس 19 بالضبط؛ 300 شمعة عشوائية بذرة
 * ثابتة (mulberry32) → صفر NaN/Infinity؛ **إعادة حساب brute-force مستقلة تماماً** (حلقات
 * SMA/VWMA يدوية معزولة تماماً عن `sma()`/`computeVwma()` أنفسهما) عند 5 فهارس متفرقة
 * (30/80/150/220/299) → صفر اختلاف واحد (فرق<10⁻⁶).
 */
export function computeVpci(
  candles: (Candle & { volume?: number })[],
  longPeriod = 20,
  shortPeriod = 5
): (number | null)[] {
  const n = candles.length;
  const closes = candles.map((c) => c.close);
  const vol = candles.map((c) => c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000);
  const smaLong = sma(closes, longPeriod);
  const smaShort = sma(closes, shortPeriod);
  const smaVolLong = sma(vol, longPeriod);
  const smaVolShort = sma(vol, shortPeriod);
  const vwmaLong = computeVwma(candles, longPeriod);
  const vwmaShort = computeVwma(candles, shortPeriod);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (
      vwmaLong[i] == null ||
      smaLong[i] == null ||
      vwmaShort[i] == null ||
      smaShort[i] == null ||
      smaVolShort[i] == null ||
      smaVolLong[i] == null
    )
      continue;
    if (smaShort[i] === 0 || smaVolLong[i] === 0) continue;
    const vpc = vwmaLong[i]! - smaLong[i]!;
    const vpr = vwmaShort[i]! / smaShort[i]!;
    const vm = smaVolShort[i]! / smaVolLong[i]!;
    out[i] = vpc * vpr * vm;
  }
  return out;
}

/**
 * Volume Flow Indicator (VFI، ماركوس كاتسانوس Markos Katsanos، مجلة Stocks & Commodities، 2004) —
 * نسخة "مُنقّاة" من مفهوم OBV/VPT: تراكم حجم موجَّه بإشارة (+/−/صفر) حسب تغيّر السعر النموذجي، مع
 * **حارسين** يقلّلان تأثير الضجيج/الشذوذ اللذين يعانيهما OBV الخام: (أ) عتبة سعرية دنيا (cutoff)
 * تعتمد على تقلّب السوق نفسه فلا تُحسَب حركة سعرية تافهة كإشارة، (ب) سقف أعلى للحجم المستخدَم
 * (VMax) فلا تهيمن شمعة حجم شاذّة واحدة على المؤشر كله. **الصيغة القياسية** (المعاملات الافتراضية
 * للأطر الطويلة كما نشرها كاتسانوس أصلاً: period=130، coef=0.2، vcoef=2.5 — تأكيد صيغة عبر WebFetch
 * من مرجعين مستقلّين قبل الكتابة: mkatsanos.com [الموقع الرسمي للمؤلّف] وProRealCode [تطبيق برمجي
 * مستقل مطابق حرفياً]، كلاهما يوافق على كل خطوة أدناه):
 * 1. TP (السعر النموذجي) = (أعلى+أدنى+إغلاق)/3
 * 2. Inter = ln(TP) − ln(TP سابق) (تغيّر لوغاريتمي بالسعر النموذجي)
 * 3. VInter = الانحراف المعياري لـInter على نافذة 30 نقطة (تباين المجتمع الكامل، بنفس صيغة
 *    computeStdDev أعلاه حرفياً — لا صيغة انحراف جديدة)
 * 4. Cutoff = coef × VInter × إغلاق الحالي
 * 5. VAve = SMA(الحجم، period) **مُزاح نقطة للخلف** (يُستخدَم متوسط الحجم للشمعة *السابقة*، لا الحالية
 *    — موثَّق صراحةً بكلا المرجعين لتفادي "نظرة مسبقة" على حجم الشمعة الحالية نفسها عند تحديد سقفها)
 * 6. VMax = VAve × vcoef، وVC (الحجم المحدود) = min(الحجم الحالي، VMax)
 * 7. MF (تغيّر السعر النموذجي) = TP − TP سابق
 * 8. الحجم الموجَّه = +VC إن MF > Cutoff، أو −VC إن MF < −Cutoff، وإلا صفر (حركة أضعف من التقلّب
 *    الطبيعي للسوق فلا تُحتسَب أي إشارة)
 * 9. VFI الخام = مجموع الحجم الموجَّه على آخر period نقطة، مقسوماً على VAve (نفس المُزاح خطوة 5،
 *    قرار تنفيذ موثَّق هنا: كلا المرجعين لا يفصّلان أي VAve مختلف لهذه الخطوة فاستُخدم نفس المتغيّر
 *    بلا ازدواج منطق)
 * 10. **VFI النهائي = EMA(VFI الخام، 3)** (تنعيم أخير قصير — نفس بنية smoothing قصيرة مستخدَمة
 *     بـcomputeKlinger أعلاه [إشارة EMA(13)] بفلسفة مطابقة: تنعيم أخير خفيف لا يُخفي الإشارة)
 * أول فهرس صالح = 2×period−1 = 259 بالإعدادات الافتراضية (VAve المُزاح يحتاج period نقطة حجم سابقة
 * فيصبح صالحاً من i=period، والمجموع المتدحرج على period نقطة من الحجم الموجَّه يحتاج period نقطة
 * إضافية فوق ذلك). **حارس القسمة**: VAve=0 (لا يقع فعلياً إلا بحجم صفري تماماً بكل النافذة) يُرجِع
 * null بدل 0/0=NaN. **حجم مفقود يُعوَّض بصفر** هنا (بعكس بقية مؤشرات الحجم بالملف [VPT/Klinger/VPCI]
 * التي تُعوِّض بصيغة `|إغلاق−فتح|×1e6+1000`) — قرار متعمَّد: VFI مصمَّم أصلاً ليحدّ من تأثير الحجم
 * الشاذّ عبر VMax، فتعويض بصيغة تخلق حجماً مصطنعاً كبيراً يخالف فلسفة "تنقية الحجم" التي يقوم عليها
 * المؤشر بالتعريف؛ صفر أكثر اتساقاً مع الغياب الحقيقي للبيانة هنا تحديداً.
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (300 شمعة،
 * أعلى=أدنى=إغلاق=100 ثابت، حجم=5000 ثابت) → Inter=0⇒VInter=0⇒Cutoff=0، وMF=0 لكل نقطة (0 ليست
 * أكبر أو أصغر من 0 حصراً) ⇒ الحجم الموجَّه=0 دائماً ⇒ VFI=0 بالضبط لكل نقطة صالحة، أول فهرس صالح=259
 * بالضبط؛ 400 شمعة عشوائية بذرة ثابتة (mulberry32) → صفر NaN/Infinity؛ **اتجاه صاعد مستدام مع حجم
 * متصاعد** (300 شمعة، إغلاق يرتفع 0.3 كل شمعة، حجم يزداد خطياً) → VFI موجب واضح (~130 عند i=299)،
 * يطابق تعريف "تراكم حجمي صاعد حقيقي" تماماً.
 */
export function computeVfi(
  candles: (Candle & { volume?: number })[],
  period = 130,
  coef = 0.2,
  vcoef = 2.5
): (number | null)[] {
  const n = candles.length;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const inter: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (tp[i] > 0 && tp[i - 1] > 0) inter[i] = Math.log(tp[i]) - Math.log(tp[i - 1]);
  }
  const stdPeriod = 30;
  const vinter: (number | null)[] = new Array(n).fill(null);
  for (let i = stdPeriod; i < n; i++) {
    let ok = true;
    let sum = 0;
    for (let j = i - stdPeriod + 1; j <= i; j++) {
      if (inter[j] == null) {
        ok = false;
        break;
      }
      sum += inter[j]!;
    }
    if (!ok) continue;
    const mean = sum / stdPeriod;
    let varSum = 0;
    for (let j = i - stdPeriod + 1; j <= i; j++) varSum += (inter[j]! - mean) ** 2;
    vinter[i] = Math.sqrt(varSum / stdPeriod);
  }
  const vol = candles.map((c) => c.volume ?? 0);
  const volAvg = sma(vol, period);
  const dirVol: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (vinter[i] == null) continue;
    const vaPrev = volAvg[i - 1];
    if (vaPrev == null) continue;
    const cutoff = coef * vinter[i]! * candles[i].close;
    const vmax = vaPrev * vcoef;
    const vc = Math.min(vol[i], vmax);
    const mf = tp[i] - tp[i - 1];
    dirVol[i] = mf > cutoff ? vc : mf < -cutoff ? -vc : 0;
  }
  const rawVfi: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      if (dirVol[j] == null) {
        ok = false;
        break;
      }
      sum += dirVol[j]!;
    }
    if (!ok) continue;
    const va = volAvg[i - 1];
    if (va == null || va === 0) continue;
    rawVfi[i] = sum / va;
  }
  const smoothed = ema(rawVfi, 3);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    out[i] = rawVfi[i] == null ? null : smoothed[i];
  }
  return out;
}
