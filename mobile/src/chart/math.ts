import type { Candle } from '../api';

export function formatPrice(n: number) {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  return n.toFixed(5);
}

export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevClose = candles[0]?.close ?? 0;
  let prevOpen = candles[0]?.open ?? 0;
  for (const c of candles) {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    out.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
    prevOpen = haOpen;
    prevClose = haClose;
  }
  return out;
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function wma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let w = 0; w < period; w++) {
      sum += values[i - period + 1 + w] * (w + 1);
    }
    out.push(sum / denom);
  }
  return out;
}

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      const slice = values.slice(i - period + 1, i + 1);
      prev = slice.reduce((a, b) => a + b, 0) / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

/** DEMA — نفس نمط إشارة MACD الموجود (ema لقيمة null مُعوَّضة بصفر ثم بوابة صلاحية بالقيمة الأصلية). */
function dema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e1Filled = e1.map((v) => v ?? 0);
  const e2 = ema(e1Filled, period);
  return values.map((_, i) => (e1[i] != null && e2[i] != null ? 2 * e1[i]! - e2[i]! : null));
}

/** TEMA — نفس مبدأ dema() بتكرار إضافي (طبقة ema ثالثة) لتقليل التأخر أكثر. */
function tema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e1Filled = e1.map((v) => v ?? 0);
  const e2 = ema(e1Filled, period);
  const e2Filled = e2.map((v) => v ?? 0);
  const e3 = ema(e2Filled, period);
  return values.map((_, i) =>
    e1[i] != null && e2[i] != null && e3[i] != null ? 3 * e1[i]! - 3 * e2[i]! + e3[i]! : null
  );
}

/**
 * HMA (Hull Moving Average) — wma(2×wma(القيم، period/2) − wma(القيم، period)، sqrt(period))؛
 * نفس فكرة dema/tema (تعويض null بصفر لحساب الطبقة التالية ثم بوابة صلاحية بالقيمة الأصلية) لكن
 * مبنية فوق wma() المحلية بدل ema() — تصميم Hull القياسي لتقليل تأخر WMA العادي أكثر من DEMA/TEMA.
 */
function hma(values: number[], period: number): (number | null)[] {
  const halfPeriod = Math.round(period / 2);
  const sqrtPeriod = Math.max(1, Math.round(Math.sqrt(period)));
  const wmaHalf = wma(values, halfPeriod);
  const wmaFull = wma(values, period);
  const raw = values.map((_, i) =>
    wmaHalf[i] != null && wmaFull[i] != null ? 2 * wmaHalf[i]! - wmaFull[i]! : null
  );
  const rawFilled = raw.map((v) => v ?? 0);
  const hmaRaw = wma(rawFilled, sqrtPeriod);
  return raw.map((_, i) => (raw[i] != null && hmaRaw[i] != null ? hmaRaw[i] : null));
}

/**
 * SMMA (Smoothed Moving Average، تمهيد Wilder القياسي — نفس فكرة EMA أعلاه لكن بعامل تنعيم أبطأ
 * 1/period بدل 2/(period+1)) — القيمة الأولى = SMA لأول period قيمة (بذرة)، ثم لكل نقطة لاحقة:
 * smma[i] = (smma[i-1]×(period−1) + values[i]) / period. تُستخدَم بـcomputeAlligator أدناه (خطوط
 * Jaw/Teeth/Lips) — لم تكن مستخرَجة كدالة محلية مشتركة سابقاً رغم استخدام نفس منطق Wilder ضمنياً
 * بدوال ADX/PSAR/ATR أعلاه، كل واحدة بتكرارها الخاص المدمَج داخلها.
 */
function smma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      const slice = values.slice(i - period + 1, i + 1);
      prev = slice.reduce((a, b) => a + b, 0) / period;
    } else {
      prev = (prev * (period - 1) + values[i]) / period;
    }
    out.push(prev);
  }
  return out;
}

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
  const valid = macdLine.map((v) => v ?? 0);
  const signal = ema(valid, 9);
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
    const span = hi - lo || 1;
    k.push(((candles[i].close - lo) / span) * 100);
  }
  const d = sma(
    k.map((v) => v ?? 0),
    dPeriod
  );
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
    const span = hh - ll || 1;
    out.push(((hh - candles[i].close) / span) * -100);
  }
  return out;
}

/**
 * CCI (Commodity Channel Index) — الصيغة القياسية: (TP − SMA(TP)) / (0.015 × الانحراف المتوسط
 * المطلق لـTP عن SMA(TP)). TP (السعر النموذجي) = (أعلى+أدنى+إغلاق)/3. عند انحراف صفري (تسطّح
 * تام) تُرجع 0 بدل قسمة على صفر.
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
    out.push(meanDev === 0 ? 0 : (tp[i] - mean) / (0.015 * meanDev));
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
 * VWAP (Volume Weighted Average Price) — تراكم مستمر لـ TP×فوليوم / فوليوم من أول شمعة بالنافذة
 * المحمَّلة حتى كل نقطة. **ملاحظة صادقة**: هذا تراكم مستمر من بداية النافذة الحالية، وليس تصفيراً
 * يومياً بحدود الجلسة كما تفعل TradingView وأغلب المنصات — تبسيط متعمَّد لعدم وجود حدود جلسة/يوم
 * موثوقة بالبيانات الحالية (لا معلومة توقيت/منطقة زمنية لتحديد "بداية يوم تداول" لكل رمز)، قابل
 * للتحسين لاحقاً. فوليوم مفقود يُعوَّض بنفس الصيغة التركيبية المستخدَمة بـorderflow.ts (computeCvd/
 * computeFootprint) للاتساق.
 */
export function computeVwap(candles: (Candle & { volume?: number })[]): (number | null)[] {
  const out: (number | null)[] = [];
  let cumPV = 0;
  let cumVol = 0;
  for (const c of candles) {
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
 * 100 عند مجموع سالب صفري (بدل قسمة على صفر). فوليوم مفقود يُعوَّض بنفس صيغة orderflow.ts للاتساق.
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
    out.push(negSum === 0 ? 100 : 100 - 100 / (1 + posSum / negSum));
  }
  return out;
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
  const diOf = (s: number, sT: number) => (sT === 0 ? 0 : (s / sT) * 100);
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
 * Parabolic SAR (Stop And Reverse) — خوارزمية Wilder القياسية: نقطة تتبع السعر من الأسفل خلال
 * اتجاه صاعد ومن الأعلى خلال اتجاه هابط، بتسارع تدريجي (AF يبدأ من step ويزيد بمقدار step عند كل
 * قمة/قاع جديد حتى سقف maxStep). عند اختراق السعر لنقطة SAR الحالية ينعكس الاتجاه: تصبح SAR
 * الجديدة = آخر EP (نقطة أقصى) مسجَّلة، وEP الجديدة = السعر المُخترِق، وAF يُعاد لـstep. الاتجاه
 * الابتدائي يُحدَّد من إغلاق أول شمعتين (صاعد إن كان الإغلاق الثاني ≥ الأول). step=0.02/maxStep=0.2
 * هما القيمتان القياسيتان الشائعتان بكل المنصات.
 */
export function computePsar(candles: Candle[], step = 0.02, maxStep = 0.2): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2) return out;
  let uptrend = candles[1].close >= candles[0].close;
  let sar = uptrend ? candles[0].low : candles[0].high;
  let ep = uptrend ? candles[0].high : candles[0].low;
  let af = step;
  out[0] = sar;
  for (let i = 1; i < n; i++) {
    let next = sar + af * (ep - sar);
    if (uptrend) {
      next = Math.min(next, candles[i - 1].low, i >= 2 ? candles[i - 2].low : candles[i - 1].low);
      if (candles[i].low < next) {
        uptrend = false;
        next = ep;
        ep = candles[i].low;
        af = step;
      } else if (candles[i].high > ep) {
        ep = candles[i].high;
        af = Math.min(maxStep, af + step);
      }
    } else {
      next = Math.max(next, candles[i - 1].high, i >= 2 ? candles[i - 2].high : candles[i - 1].high);
      if (candles[i].high > next) {
        uptrend = true;
        next = ep;
        ep = candles[i].high;
        af = step;
      } else if (candles[i].low < ep) {
        ep = candles[i].low;
        af = Math.min(maxStep, af + step);
      }
    }
    sar = next;
    out[i] = sar;
  }
  return out;
}

/**
 * الانحراف المعياري (Standard Deviation) — نفس صيغة الانحراف المستخدَمة داخل حساب بولنجر تماماً
 * (تباين المجتمع الكامل على نافذة period، لا عيّنة) لكن مُصدَّرة كمؤشر مستقل بپين خاص بدل حصرها
 * داخل حساب بولنجر الداخلي — يقيس تشتّت/تقلّب السعر بمعزل عن اتجاهه، بعكس بولنجر الذي يستخدمها
 * فقط لرسم نطاق حول متوسط متحرك.
 */
export function computeStdDev(closes: number[], period = 20): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance));
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
 * Chaikin Money Flow (CMF، period=20 افتراضياً) — Money Flow Multiplier لكل شمعة =
 * ((إغلاق−أدنى)−(أعلى−إغلاق))/(أعلى−أدنى) (صفر عند مدى صفري)، Money Flow Volume = المضاعف×فوليوم،
 * CMF لكل نافذة = مجموع(MFV)/مجموع(فوليوم) (صفر عند فوليوم كلي صفري). مدى نظري تقريبي -1..1 (بعكس
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
    out.push(sumVol === 0 ? 0 : sumMfv / sumVol);
  }
  return out;
}

export function computeAtr(candles: Candle[], period = 14): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      continue;
    }
    const prev = candles[i - 1].close;
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prev),
        Math.abs(candles[i].low - prev)
      )
    );
  }
  return sma(tr, period);
}

/**
 * قنوات كلتنر (Keltner Channels) — نطاق حول EMA للإغلاق (emaPeriod=20 افتراضياً) بعرض
 * multiplier×ATR (atrPeriod=10 افتراضياً، multiplier=2 افتراضياً — نفس القيم الشائعة بمعظم
 * المنصات). بعكس بولنجر الذي يستخدم الانحراف المعياري للسعر نفسه لضبط عرض النطاق، كلتنر يستخدم
 * ATR (متوسط المدى الحقيقي، مبني من High/Low/Close الشمعة كاملة) فتتفاعل حدوده مع التقلب الفعلي
 * بالشموع لا فقط تشتت الإغلاق — نطاق أهدأ وأقل تذبذباً من بولنجر عادة. mid = ema(closes,
 * emaPeriod)، upper/lower = mid ± multiplier×computeAtr(candles, atrPeriod).
 */
export function computeKeltner(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const mid = ema(closes, emaPeriod);
  const atr = computeAtr(candles, atrPeriod);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (mid[i] == null || atr[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    upper.push(mid[i]! + multiplier * atr[i]!);
    lower.push(mid[i]! - multiplier * atr[i]!);
  }
  return { mid, upper, lower };
}

/**
 * STARC Bands (Stoller Average Range Channels، مانينغ ستولر) — نطاق بنفس بنية computeKeltner
 * أعلاه حرفياً (خط وسط ± multiplier×ATR) لكن بخط وسط SMA بدل EMA — الفارق التصميمي الجوهري
 * تاريخياً بين الاثنين (كلتنر بُني أصلاً حول EMA، ستولر حول SMA). mid = sma(closes، smaPeriod)،
 * upper/lower = mid ± multiplier×computeAtr(candles، atrPeriod) (**إعادة استخدام كاملة** لـ
 * computeAtr الموجودة، صفر حساب ATR جديد). القيم الافتراضية القياسية smaPeriod=5/atrPeriod=15/
 * multiplier=2 (اصطلاح ستولر الأصلي الشائع بمعظم المنصات المرجعية) — مختلفة عمداً عن
 * keltner(20/10/2) الافتراضية لإبقاء الاثنين متمايزَين زمنياً/بصرياً لا نسخة مكرَّرة بنفس الفترات.
 * **تحقّق يدوي**: سوق مسطّح تماماً (كل high=low=close ثابتة) → TR=0 لكل شمعة (بالتعريف: أعلى−أدنى
 * =0، |أعلى−إغلاق سابق|=0، |أدنى−إغلاق سابق|=0) ⇒ ATR=0 بالضبط ⇒ upper=mid=lower بالضبط بلا فارق
 * تقريب.
 */
export function computeStarcBands(
  candles: Candle[],
  smaPeriod = 5,
  atrPeriod = 15,
  multiplier = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const mid = sma(closes, smaPeriod);
  const atr = computeAtr(candles, atrPeriod);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (mid[i] == null || atr[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    upper.push(mid[i]! + multiplier * atr[i]!);
    lower.push(mid[i]! - multiplier * atr[i]!);
  }
  return { mid, upper, lower };
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
      trendUp = candles[i].close >= mid;
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
 * Ultimate Oscillator (Larry Williams، period1=7/period2=14/period3=28 القيم القياسية) — يجمع ثلاثة
 * أطر زمنية بوزن مختلف لتقليل إشارات الانعكاس الكاذبة الشائعة بمؤشر زخم واحد. لكل شمعة:
 * BP (Buying Pressure) = إغلاق − min(أدنى، إغلاق الشمعة السابقة)، TR (بنفس منطق computeAtr لكن
 * بحدَّين فقط) = max(أعلى، إغلاق سابق) − min(أدنى، إغلاق سابق). لكل فترة: avg = مجموع(BP)/مجموع(TR)
 * على نافذتها (صفر عند مجموع TR صفري بدل قسمة على صفر). UO = 100×(4×avg1 + 2×avg2 + avg3)/7 (مدى
 * 0..100، ≥70 تشبّع شرائي، ≤30 تشبّع بيعي — نفس عتبات RSI القياسية). **تحقّق يدوي بحالات حدّية
 * (بدل التقاط قيم من صف عشوائي كما بمؤشرات سابقة، لأن التحقّق العددي المباشر أوضح هنا)**: (أ) لو
 * BP=TR/2 بكل شمعة (ضغط شراء نصف المدى تماماً) فكل avg=0.5 → UO=100×(2+1+0.5)/7=50 — يطابق "50 =
 * محايد" المعروف عن هذا المؤشر بالضبط. (ب) لو BP=TR بكل شمعة (إغلاق=أعلى، وأدنى=إغلاق سابق فتصبح
 * trueLow=trueHigh السابقة صفراً للفارق) فكل avg=1 → UO=100×(4+2+1)/7=100 — الحد الأقصى النظري،
 * يطابق "ضغط شرائي كامل" تماماً. (ج) لو BP=0 بكل شمعة (إغلاق=أدنى دائماً) فكل avg=0 → UO=0 — الحد
 * الأدنى النظري. الحالات الثلاث تطابق تعريف المؤشر القياسي حرفياً. يعيد null حتى تتوفر maxPeriod-1
 * شمعة سابقة على الأقل (period3=28 افتراضياً هو الأطول، فأول قيمة فعلية عند المؤشر 27).
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
    if (i < maxPeriod - 1) {
      out.push(null);
      continue;
    }
    const trSum1 = sumWindow(tr, i, period1);
    const trSum2 = sumWindow(tr, i, period2);
    const trSum3 = sumWindow(tr, i, period3);
    const avg1 = trSum1 === 0 ? 0 : sumWindow(bp, i, period1) / trSum1;
    const avg2 = trSum2 === 0 ? 0 : sumWindow(bp, i, period2) / trSum2;
    const avg3 = trSum3 === 0 ? 0 : sumWindow(bp, i, period3) / trSum3;
    out.push((100 * (4 * avg1 + 2 * avg2 + avg3)) / 7);
  }
  return out;
}

/**
 * CMO (Chande Momentum Oscillator، period=14 — نفس افتراضي RSI/ADX/MFI/Aroon بهذا الملف) — يشبه
 * RSI هيكلياً (نفس تصنيف حركة كل شمعة لـup/down) لكن بدون تمهيد Wilder الأسي: مجموع مباشر لحركات
 * الصعود والهبوط داخل نافذة period فقط، ثم CMO = 100×(sumUp−sumDown)/(sumUp+sumDown) (صفر عند
 * مجموع كلي صفري بدل قسمة على صفر). المدى -100..100 (بعكس RSI 0..100)، +50/-50 عتبتا تشبّع
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
    out.push(sumUp + sumDown === 0 ? 0 : (100 * (sumUp - sumDown)) / (sumUp + sumDown));
  }
  return out;
}

/**
 * TRIX (period=15 القيمة القياسية الشائعة) — معدّل التغيّر المئوي (rate of change) لمتوسط EMA
 * مُطبَّق ثلاث مرات متتالية على الإغلاق (**تبني بالضبط على نفس طبقات ema() المستخدَمة بـdema()/
 * tema() أعلاه بهذا الملف، بما فيها أسلوب تعويض null بصفر لحساب الطبقة التالية ثم بوابة صلاحية
 * بالقيمة الأصلية — تحمل نفس تحفّظ الإحماء الأولي الموثَّق مسبقاً لتلك الدوال، وليس افتراضاً
 * جديداً**)، لكن الناتج هنا نسبة *تغيّر* الطبقة الثالثة من شمعة لأخرى، لا دمجاً خطياً للطبقات
 * كـTEMA: TRIX[i] = ((tripleEma[i] − tripleEma[i-1]) / tripleEma[i-1]) × 100 (صفر عند طبقة سابقة
 * صفرية بدل قسمة على صفر). صفر = ثبات زخم الاتجاه طويل المدى، موجب/سالب = تسارع/تباطؤ الاتجاه —
 * أكثر "تصفية" من MACD العادي (ثلاث طبقات EMA بدل طبقتين). **تحقّق منطقي**: لو الإغلاق ثابت تماماً
 * بعد انتهاء الإحماء، tripleEma تستقر على نفس القيمة الثابتة فيصبح الفرق صفراً → TRIX=0 (يطابق
 * "لا تغيّر بالزخم" لسعر ثابت تماماً).
 */
export function computeTrix(closes: number[], period = 15): (number | null)[] {
  const e1 = ema(closes, period);
  const e1Filled = e1.map((v) => v ?? 0);
  const e2 = ema(e1Filled, period);
  const e2Filled = e2.map((v) => v ?? 0);
  const e3 = ema(e2Filled, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0 || e3[i] == null || e3[i - 1] == null) {
      out.push(null);
      continue;
    }
    const prev = e3[i - 1]!;
    out.push(prev === 0 ? 0 : ((e3[i]! - prev) / prev) * 100);
  }
  return out;
}

/**
 * Force Index (Alexander Elder، period=13 EMA — القيمة الأكثر شيوعاً) — يجمع اتجاه السعر وحجم
 * الحركة (فوليوم) بضربة واحدة: rawForce[i] = (إغلاق[i] − إغلاق[i-1]) × فوليوم[i] (صفر عند i=0
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
  const raw: number[] = new Array(n).fill(0);
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
 * DPO (Detrended Price Oscillator، period=20 وإزاحة قياسية ⌊period/2⌋+1 نحو الخلف) — يزيل تأثير
 * الاتجاه طويل المدى من السعر لإبراز الدورات القصيرة: DPO[i] = إغلاق[i-shift] − SMA(period)[i]
 * (shift=11 لـperiod=20، القيمة القياسية الشائعة). **ليس** مؤشر زخم متأخر عادي — الإزاحة للخلف
 * تُصحّح انزياح SMA الطبيعي فتجعل DPO يقارن السعر بمتوسط "مُتمركز" حول نفس نقطته الزمنية تقريباً،
 * فيبرز القمم/القيعان الدورية القصيرة بدل الاتجاه العام. صفر = السعر عند مستوى اتجاهه العام،
 * موجب/سالب = أعلى/أدنى من الاتجاه العام عند تلك النقطة تحديداً. **تحقّق يدوي**: لو الإغلاق ثابت
 * تماماً بكل الشموع، SMA(period) تستقر على نفس القيمة الثابتة وإغلاق[i-shift] يساويها أيضاً →
 * DPO=0 لكل نقطة صالحة — يطابق "لا انحراف دوري عن اتجاه ثابت مسطّح" بالتعريف تماماً.
 */
export function computeDpo(closes: number[], period = 20): (number | null)[] {
  const mid = sma(closes, period);
  const shift = Math.floor(period / 2) + 1;
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const srcIdx = i - shift;
    if (mid[i] == null || srcIdx < 0) {
      out.push(null);
      continue;
    }
    out.push(closes[srcIdx] - mid[i]!);
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
  const aoFilled = ao.map((v) => v ?? 0);
  const aoSma = sma(aoFilled, 5);
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
 * momentum[i] = إغلاق[i] − إغلاق[i-1] (صفر عند i=0 لغياب شمعة سابقة). يُمرَّر momentum عبر طبقتي
 * ema متتاليتين (r ثم s — **نفس تقنية طبقات ema المتتالية المستخدَمة بـdema/tema/trix أعلاه بهذا
 * الملف حرفياً، بما فيها تعويض null بصفر بين الطبقات ثم بوابة صلاحية بالقيمة الأصلية**)، وبالتوازي
 * |momentum| عبر نفس الطبقتين. TSI = 100×(الزخم المزدوج التنعيم)/(القيمة المطلقة المزدوجة التنعيم)
 * (صفر عند مقام صفري بدل قسمة على صفر — يغطي حالة سعر ثابت تماماً حيث momentum=0 بكل نقطة). مدى
 * نظري -100..100 (عملياً يبقى ضمن مدى أضيق غالباً)، +25/-25 عتبتا تشبّع شائعتان. **تحقّق يدوي**:
 * سعر ثابت تماماً بكل الشموع → momentum=0 لكل نقطة → كلا البسط والمقام يستقران على صفر بعد الإحماء
 * → TSI=0 (الحالة المُعالَجة صراحة أعلاه)، يطابق "لا زخم بسعر ساكن" بالتعريف تماماً.
 */
export function computeTsi(closes: number[], r = 25, s = 13): (number | null)[] {
  const n = closes.length;
  const momentum: number[] = new Array(n).fill(0);
  const absMomentum: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    momentum[i] = closes[i] - closes[i - 1];
    absMomentum[i] = Math.abs(momentum[i]);
  }
  const ema1 = ema(momentum, r);
  const ema1Filled = ema1.map((v) => v ?? 0);
  const ema2 = ema(ema1Filled, s);
  const absEma1 = ema(absMomentum, r);
  const absEma1Filled = absEma1.map((v) => v ?? 0);
  const absEma2 = ema(absEma1Filled, s);
  return closes.map((_, i) =>
    ema2[i] != null && absEma2[i] != null ? (absEma2[i] === 0 ? 0 : (100 * ema2[i]!) / absEma2[i]!) : null
  );
}

/**
 * PMO (Price Momentum Oscillator، ديسيجن بوينت/كارل سوينلين) — معدّل تغيّر مُضاعَف التنعيم: خطوة
 * أولى ROC لشمعة واحدة (لا فترة أطول) ×10 يدوياً (roc10[i]=((إغلاق[i]−إغلاق[i-1])/إغلاق[i-1])×1000
 * — الضرب ×100 لتحويل النسبة لنقاط مئوية ثم ×10 إضافية باتفاقية PMO القياسية تُدمَجان بثابت واحد
 * ×1000)، ثم طبقتا EMA متتاليتان (35 ثم 20) — **نفس أسلوب تعويض null بصفر بين الطبقات المستخدَم
 * بـdema()/tema() أعلاه وبـcomputeTsi مباشرة فوق هذه الدالة** (لا خط إشارة منفصل، بنفس تبسيط
 * KST/Coppock/TSI المجاورة بالملف: خط واحد فقط، pane هستوغرام bull/bear حول الصفر). **تحقّق
 * يدوي**: سعر ثابت تماماً بكل الشموع → roc10=0 لكل نقطة (بعد أول شمعة، القسمة على إغلاق سابق ثابت
 * وغير صفري) ⇒ كلا طبقتَي EMA=0 ⇒ PMO=0 بالضبط أينما كانت صالحة.
 */
export function computePmo(
  closes: number[],
  rocSmooth = 35,
  pmoSmooth = 20
): (number | null)[] {
  const n = closes.length;
  const roc10: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1];
    roc10[i] = prev !== 0 ? ((closes[i] - prev) / prev) * 1000 : 0;
  }
  const smoothed1 = ema(roc10, rocSmooth);
  const smoothed1Filled = smoothed1.map((v) => v ?? 0);
  const pmo = ema(smoothed1Filled, pmoSmooth);
  return closes.map((_, i) => (pmo[i] != null ? pmo[i] : null));
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
  const sumFilled = sum.map((v) => (Number.isNaN(v) ? 0 : v));
  const smoothed = wma(sumFilled, wmaPeriod);
  return closes.map((_, i) => (Number.isNaN(sum[i]) ? null : smoothed[i]));
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
 * Chaikin Volatility (period=10 لتنعيم EMA على مدى الشمعة، وrocPeriod=10 لنافذة معدّل التغيّر بينهما
 * — نفس الفترة للاثنين هي التطبيق الشائع الأكثر انتشاراً) — يقيس تسارع/تباطؤ *اتساع* مدى الشمعة
 * (High−Low) بلا اعتبار لاتجاه السعر إطلاقاً: أولاً emaRange = EMA(أعلى−أدنى، period) لتنعيم التذبذب
 * اللحظي (طبقة ema أحادية مباشرة على المدى الخام، لا طبقات متعددة)، ثم نسبة تغيّرها المئوية عبر
 * rocPeriod شمعة (نفس صيغة computeRoc أعلاه حرفياً لكن مطبَّقة على emaRange بدل الإغلاق مباشرة):
 * ChaikinVol[i] = (emaRange[i] − emaRange[i-rocPeriod]) / emaRange[i-rocPeriod] × 100 (صفر عند قيمة
 * سابقة صفرية بدل قسمة على صفر). موجب = اتساع مدى الشموع يتسارع (تقلّب متزايد، غالباً قرب انعكاسات
 * أو بدايات اتجاه)، سالب = مدى الشموع يضيق (تقلّب متراجع، غالباً استقرار/تجميع). **تحقّق يدوي**: مدى
 * الشمعة (أعلى−أدنى) ثابت تماماً بكل شمعة → emaRange تستقر على نفس القيمة الثابتة بالضبط بدءاً من
 * أول نقطة صالحة (طبقة ema أحادية، نفس منطق PPO أعلاه بالضبط) → emaRange[i] يساوي emaRange[i-rocPeriod]
 * تماماً لأي i،i-rocPeriod كلاهما ضمن نطاق الاستقرار → ChaikinVol=0 بالضبط، يطابق "لا تغيّر بتقلّب
 * ثابت تماماً" بالتعريف.
 */
export function computeChaikinVolatility(
  candles: Candle[],
  period = 10,
  rocPeriod = 10
): (number | null)[] {
  const range = candles.map((c) => c.high - c.low);
  const emaRange = ema(range, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const prevIdx = i - rocPeriod;
    if (emaRange[i] == null || prevIdx < 0 || emaRange[prevIdx] == null) {
      out.push(null);
      continue;
    }
    const prev = emaRange[prevIdx]!;
    out.push(prev === 0 ? 0 : ((emaRange[i]! - prev) / prev) * 100);
  }
  return out;
}

/**
 * Mass Index (Donald Dorsey، period=25 نافذة تراكمية وemaPeriod=9 لطبقتي التنعيم — القيم القياسية
 * الشائعة) — يقيس *اتساع* مدى الشمعة (High−Low) بلا اعتبار لاتجاه السعر إطلاقاً (بعكس كل مؤشرات
 * الزخم أعلاه)، يبحث عن "انتفاخ" (bulge) ينذر بانعكاس محتمل بصرف النظر عن اتجاهه: لكل شمعة range =
 * أعلى−أدنى، singleEma = EMA(range, emaPeriod)، doubleEma = EMA(singleEma, emaPeriod) (**نفس تقنية
 * تعويض null بصفر بين الطبقتين ثم بوابة صلاحية بالقيمة الأصلية المستخدَمة بـdema/tema/trix/tsi/
 * coppock أعلاه بهذا الملف حرفياً — وتحمل نفس تحفّظ الإحماء التقريبي الموثَّق لتلك الدوال: doubleEma
 * *يقترب* من نفس قيمة singleEma الثابتة تدريجياً كلما ابتعدنا عن نقطة الإحماء الأولى، لا يساويها
 * مساواة تامة عند أول نقطة صالحة تحديداً، بسبب بذرة المتوسط الأولي المخلوطة بالأصفار المعوَّضة**)،
 * ratio = singleEma/doubleEma (1 عند doubleEma صفرية بدل قسمة على صفر). Mass Index = مجموع ratio
 * على نافذة period شمعة. **ملاحظة صادقة**: هذه القيمة الخام فقط (بلا اكتشاف تلقائي لعبور 27 ثم
 * الهبوط تحت 26.5 — إشارة "الانتفاخ" المرجعية القياسية) — تبسيط متعمَّد يترك القراءة البصرية
 * للمتداول، قابل لإضافة اكتشاف تلقائي لاحقاً. يُرسم بنمط پين OBV/NVI (تطبيع أدنى/أعلى ضمن النافذة
 * الظاهرة، تلوين حسب اتجاه لحظي) لأنه دائماً موجب وغير محدود المدى نظرياً، لا أوسيليتر ثنائي القطبية
 * حول الصفر. **تحقّق يدوي**: مدى الشمعة ثابت تماماً بكل شمعة → singleEma تستقر بالضبط على نفس القيمة
 * الثابتة بدءاً من أول نقطة صالحة لها (طبقة أحادية مباشرة على مدى ثابت) → ratio *يقترب* تدريجياً من 1
 * (لا يساويه بالضبط عند أول نقطة بسبب بذرة doubleEma الموضَّحة أعلاه) → Mass Index *يقترب* من period
 * (25) كلما ابتعدت نافذة الجمع عن نقطة الإحماء الأولى — يطابق "لا انتفاخ تذبذب حقيقي بتقلّب ثابت
 * تماماً" بالتعريف تقريبياً (نفس درجة الدقة المقبولة لمؤشرات الطبقة المزدوجة الأخرى أعلاه).
 */
export function computeMassIndex(
  candles: Candle[],
  period = 25,
  emaPeriod = 9
): (number | null)[] {
  const n = candles.length;
  const range = candles.map((c) => c.high - c.low);
  const singleEma = ema(range, emaPeriod);
  const singleFilled = singleEma.map((v) => v ?? 0);
  const doubleEma = ema(singleFilled, emaPeriod);
  const ratio: (number | null)[] = candles.map((_, i) =>
    singleEma[i] != null && doubleEma[i] != null
      ? doubleEma[i] === 0
        ? 1
        : singleEma[i]! / doubleEma[i]!
      : null
  );
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    let valid = true;
    for (let w = i - period + 1; w <= i; w++) {
      if (ratio[w] == null) {
        valid = false;
        break;
      }
      sum += ratio[w]!;
    }
    out.push(valid ? sum : null);
  }
  return out;
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
 * Envelopes (نطاق نسبي حول متوسط متحرك بسيط، period=20 وpct=2.5% القيمتان الشائعتان) — أبسط بديل
 * لبولنجر/كلتنر: بدل استخدام انحراف معياري (بولنجر) أو ATR (كلتنر) لضبط عرض النطاق، يستخدم Envelopes
 * نسبة مئوية ثابتة من قيمة المتوسط نفسه: mid = SMA(closes, period)، upper = mid×(1+pct)، lower =
 * mid×(1-pct). عرض النطاق يتناسب طردياً مع مستوى السعر نفسه (بعكس بولنجر/كلتنر اللذين يتفاعلان مع
 * التقلّب الفعلي) — أبسط حسابياً وأكثر ثباتاً بصرياً عبر فترات التقلّب المختلفة، على حساب عدم التكيّف
 * مع تغيّر التقلّب الفعلي. **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → mid يستقر على نفس القيمة
 * الثابتة (SMA لقيم متطابقة = نفس القيمة) → upper/lower ثابتان أيضاً بنفس النسبة المطلوبة من تلك
 * القيمة — يطابق "نطاق ثابت حول سعر ثابت" بالتعريف تماماً.
 */
export function computeEnvelopes(
  closes: number[],
  period = 20,
  pct = 0.025
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(closes, period);
  const upper = mid.map((v) => (v == null ? null : v * (1 + pct)));
  const lower = mid.map((v) => (v == null ? null : v * (1 - pct)));
  return { mid, upper, lower };
}

/**
 * Donchian Channels (period=20 القيمة الشائعة، أبسط قناة اتجاه بلا أي تنعيم إحصائي إطلاقاً) —
 * upper = أعلى قمة (High) خلال آخر period شمعة (تشمل الشمعة الحالية)، lower = أدنى قاع (Low) بنفس
 * النافذة، mid = (upper+lower)/2 (خط الوسط، لا SMA — تعريف Donchian القياسي). بعكس بولنجر/كلتنر/
 * Envelopes التي تُبنى فوق متوسط متحرك للإغلاق، Donchian يعتمد فقط على أعلى/أدنى فعليين بالسوق —
 * يعكس مباشرة "أعلى قمة/أدنى قاع فعلي شهدته السوق مؤخراً" بلا أي تنعيم أو افتراض إحصائي. **تحقّق
 * يدوي**: أعلى/أدنى ثابتان بنفس القيمة بكل شمعة (سوق مسطّح تماماً) → أعلى قمة = أدنى قاع = تلك القيمة
 * الثابتة لأي نافذة → upper=lower=القيمة الثابتة وmid=نفس القيمة أيضاً، عرض القناة صفر — يطابق "لا
 * تذبذب فعلي بسعر ساكن تماماً" بالتعريف.
 */
export function computeDonchian(
  candles: Candle[],
  period = 20
): { upper: (number | null)[]; lower: (number | null)[]; mid: (number | null)[] } {
  const n = candles.length;
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const mid: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      mid.push(null);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let w = i - period + 1; w <= i; w++) {
      hh = Math.max(hh, candles[w].high);
      ll = Math.min(ll, candles[w].low);
    }
    upper.push(hh);
    lower.push(ll);
    mid.push((hh + ll) / 2);
  }
  return { upper, lower, mid };
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
 * Historical Volatility (HV، period=10 نافذة قياسية شائعة، annualization=252 يوم تداول سنوي قياسي) —
 * الانحراف المعياري لعوائد لوغاريتمية يومية (لا الأسعار الخام كـcomputeStdDev أعلاه) مُعاد قياسه سنوياً
 * ومئوياً: عائد لوغاريتمي[i] = ln(إغلاق[i]/إغلاق[i-1]) (صفر عند إغلاق سابق ≤ صفر نظرياً بدل ln غير
 * معرَّف)، ثم HV[i] = الانحراف المعياري لعوائد النافذة الأخيرة × √annualization × 100. **الفرق عن
 * computeStdDev أعلاه**: ذاك يقيس تشتّت الأسعار المطلقة (وحدة سعر)، بينما HV يقيس تشتّت *العوائد
 * النسبية* (نسبة مئوية سنوية قابلة للمقارنة عبر رموز مختلفة السعر تماماً — المقياس المعياري لتقلّب
 * الأصول بالأسواق المالية). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → كل عائد لوغاريتمي=ln(1)=0 →
 * الانحراف المعياري لسلسلة أصفار=0 → HV=0×√252×100=0 بالضبط، يطابق "لا تقلّب فعلي بسعر ساكن تماماً"
 * بالتعريف تماماً.
 */
export function computeHistoricalVolatility(
  closes: number[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = closes.length;
  const logReturns: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1];
    logReturns[i] = prev <= 0 ? 0 : Math.log(closes[i] / prev);
  }
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    const slice = logReturns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, v) => a + v, 0) / period;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance) * annFactor);
  }
  return out;
}

/**
 * Stochastic RSI (rsiPeriod=14 وstochPeriod=14 القيمتان القياسيتان — يطبّق صيغة %K القياسية
 * [بنفس منطق computeStoch أعلاه حرفياً] لكن على *قيم RSI نفسها* بدل السعر الخام) — يبني مباشرة فوق
 * computeRsi المُصدَّرة مسبقاً بهذا الملف (لا إعادة تطبيق): لكل نقطة، StochRSI[i] = (RSI[i] −
 * أدنى RSI بنافذة stochPeriod) / (أعلى RSI بنفس النافذة − أدنى RSI) × 100 (صفر عند تساوي أعلى/أدنى
 * RSI بالنافذة بدل قسمة على صفر — حالة "RSI ثابت تماماً بالنافذة"، ليست بالضرورة RSI=0 أو 100).
 * **الفرق عن RSI الخام**: RSI نفسه أوسيليتر مُطبَّق على السعر، بينما StochRSI أوسيليتر *مُطبَّق على
 * أوسيليتر آخر* — أكثر حساسية وتذبذباً من RSI الخام (يعبر 80/20 أكثر تكراراً)، يُستخدم لرصد تحوّلات
 * زخم أدق. الفترة الفعّالة الكلية = rsiPeriod (لحساب RSI أولاً) + stochPeriod−1 (لنافذة %K فوق RSI) —
 * أطول إحماءً من RSI أو Stochastic الخام كلٍّ على حدة (النافذة تبدأ من أول نقطة RSI صالحة، لا الشمعة
 * الأولى مطلقاً). **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → RSI (بلا خسارة أو مكسب فعلي، avgLoss=0)
 * يستقر عند 100 بدءاً من أول نقطة صالحة له (نفس تحفّظ computeRsi الموثَّق بتعريفه أعلاه) → RSI
 * ثابت=100 طوال نافذة stochPeriod → أعلى=أدنى=100 → StochRSI=0 بالضبط (حالة "تساوي أعلى/أدنى"
 * المُعالَجة صراحة أعلاه، لا 100 كما قد يُظَن للوهلة الأولى).
 */
export function computeStochRsi(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14
): (number | null)[] {
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
    out.push(span === 0 ? 0 : ((rsi[i]! - lo) / span) * 100);
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
  const numFilled = num.map((v) => v ?? 0);
  const denomFilled = denom.map((v) => v ?? 0);
  const numSma = sma(numFilled, period);
  const denomSma = sma(denomFilled, period);
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
 * Percent B (%B، period=20 وmult=2 القيمتان القياسيتان لبولنجر — نفس قيم computeOverlays.bb أعلاه
 * تماماً) — يقيس موقع الإغلاق *نسبةً* لعرض نطاق بولنجر بدل قراءة الإغلاق مقابل النطاقين مباشرة على
 * الشارت: %B[i] = (إغلاق[i] − lower[i]) / (upper[i] − lower[i])، حيث mid=SMA(period)،
 * upper=mid+mult×الانحراف المعياري، lower=mid−mult×الانحراف المعياري (**نفس صيغة بولنجر المستخدَمة
 * بـcomputeOverlays أعلاه حرفياً، مُعاد حسابها هنا مستقلة لأن computeOverlays لا يُصدِّر %B نفسه**).
 * 0 = الإغلاق عند الحد الأدنى بالضبط، 1 = عند الحد الأعلى بالضبط، 0.5 = عند الوسط بالضبط، وقيمة خارج
 * 0..1 تعني كسر أحد النطاقين فعلياً. 0.5 عند عرض نطاق صفري (تقلّب صفري) بدل قسمة على صفر — قيمة الوسط
 * الحيادية بدل الانحياز لأي طرف تعسّفاً. **تحقّق يدوي**: سعر ثابت تماماً بكل شموع النافذة → الانحراف
 * المعياري=0 → upper=lower=mid=السعر الثابت نفسه → عرض النطاق صفري → %B=0.5 بالضبط (الحالة الحدّية
 * المُعالَجة صراحة أعلاه)، يطابق "لا معنى لموقع نسبي داخل نطاق منعدم العرض" بأكثر تفسير حيادي ممكن.
 */
export function computePercentB(closes: number[], period = 20, mult = 2): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = mean + mult * sd;
    const lower = mean - mult * sd;
    const span = upper - lower;
    out.push(span === 0 ? 0.5 : (closes[i] - lower) / span);
  }
  return out;
}

/**
 * Bollinger Bandwidth (BBW، period=20 وmult=2 نفس قيم %B/computeOverlays.bb أعلاه) — يقيس *اتساع*
 * نطاق بولنجر نسبةً لمستوى السعر نفسه بدل موقع الإغلاق داخله (كـ%B أعلاه): BBW[i] = (upper[i] −
 * lower[i]) / mid[i] × 100 (صفر عند mid صفرية نظرياً بدل قسمة على صفر). قيمة منخفضة = انضغاط تقلّب
 * ("Bollinger Squeeze" — غالباً ينذر بحركة قوية قادمة)، قيمة مرتفعة = تمدد تقلّب حاد. **الفرق عن STDEV
 * أعلاه**: STDEV يُرجع الانحراف المعياري بوحدة السعر المطلقة، بينما BBW يُعيد قياسه كنسبة مئوية من
 * مستوى السعر (مثل Envelopes مقابل بولنجر أعلاه — نفس فكرة التطبيع بمستوى السعر) فيصبح قابلاً للمقارنة
 * المباشرة عبر رموز مختلفة السعر أو عبر فترات زمنية متباعدة لنفس الرمز. **تحقّق يدوي**: سعر ثابت تماماً
 * بكل شموع النافذة → الانحراف المعياري=0 → upper=lower=mid → BBW=(mid−mid)/mid×100=0 بالضبط، يطابق
 * "لا اتساع نطاق فعلي بتقلّب صفري" بالتعريف تماماً.
 */
export function computeBollingerBandwidth(
  closes: number[],
  period = 20,
  mult = 2
): (number | null)[] {
  const mid = sma(closes, period);
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null || i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const upper = mean + mult * sd;
    const lower = mean - mult * sd;
    out.push(mean === 0 ? 0 : ((upper - lower) / mean) * 100);
  }
  return out;
}

/**
 * Median Price (سعر الوسيط) — منتصف مدى الشمعة (أعلى+أدنى)/2، بديل مبسّط للإغلاق كمصدر عرض مستقل
 * يُرسم كخط نقاط مباشر على اللوحة الرئيسية بنفس نمط VWAP/PSAR أعلاه. **تحقّق يدوي**: شمعة ثابتة
 * أعلى=10 أدنى=8 لكل الشموع → الناتج=9 لكل نقطة بالضبط (بلا حاجة لأي فترة تسخين، معرَّف من أول شمعة).
 */
export function computeMedianPrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low) / 2);
}

/**
 * Typical Price (السعر النموذجي) — متوسط (أعلى+أدنى+إغلاق)/3، يمنح وزناً ضمنياً للإغلاق قياساً
 * بـMedian Price أعلاه. **تحقّق يدوي**: شمعة ثابتة أعلى=12 أدنى=8 إغلاق=10 لكل الشموع →
 * (12+8+10)/3 = 10 بالضبط لكل نقطة.
 */
export function computeTypicalPrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low + c.close) / 3);
}

/**
 * Weighted Close (الإغلاق المُرجَّح) — (أعلى+أدنى+2×إغلاق)/4، يعطي الإغلاق وزناً مضاعَفاً (ضِعف
 * Typical Price بالتحديد) فيكون أقرب تتبّعاً للإغلاق من median/typical أعلاه. **تحقّق يدوي**: شمعة
 * أعلى=14 أدنى=6 إغلاق=12 → (14+6+24)/4 = 11؛ يتحقّق الترتيب المتوقَّع median=(14+6)/2=10 <
 * typical=(14+6+12)/3=10.67 < weightedClose=11 ≤ إغلاق=12 (الأقرب تتبّعاً للإغلاق دائماً حين يبتعد
 * الإغلاق عن منتصف المدى).
 */
export function computeWeightedClose(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low + 2 * c.close) / 4);
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
 * Ulcer Index (Peter Martin، period=14 شائع) — يقيس "ألم" الانخفاض عن القمة المتحرّكة بدل التقلّب
 * ثنائي الاتجاه العادي (بعكس STDEV/ATR أعلاه اللذين لا يميّزان صعوداً عن هبوط): لكل شمعة j ضمن نافذة
 * period المنتهية عند i، أعلى إغلاق ضمن نافذة period المنتهية عند j نفسها (maxClose[j]، نافذة
 * متدحرجة وليست منذ البداية) يُحسَب أولاً، ثم نسبة الانخفاض المئوية pctDrawdown[j] = (إغلاق[j] −
 * maxClose[j]) / maxClose[j] × 100 (≤ 0 دائماً بالتعريف، صفر عند maxClose صفري نظرياً). Ulcer
 * Index[i] = الجذر التربيعي لمتوسط مربعات pctDrawdown لكل j بنافذة period المنتهية عند i (RMS) —
 * القيمة ≥ 0 دائماً بالتعريف (متوسط مربعات). ارتفاع القيمة = انخفاضات أعمق و/أو أطول أمداً عن القمم
 * الأخيرة، صفر = السعر عند قمة جديدة باستمرار بلا أي تراجع بالنافذة. **تحقّق يدوي**: سعر تصاعدي
 * بشكل صارم بكل شمعة (كل إغلاق أعلى من سابقه) → كل إغلاق هو أعلى إغلاق بأي نافذة تنتهي عنده بالتعريف
 * (تصاعد صارم) → maxClose[j]=إغلاق[j] لكل j → pctDrawdown=0 لكل نقطة → Ulcer Index=RMS(0s)=0 بالضبط،
 * يطابق "لا ألم انخفاض بصعود صارم متواصل" بالتعريف تماماً.
 */
export function computeUlcerIndex(closes: number[], period = 14): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const windowStart = Math.max(0, j - period + 1);
      const maxClose = Math.max(...closes.slice(windowStart, j + 1));
      const pctDrawdown = maxClose === 0 ? 0 : ((closes[j] - maxClose) / maxClose) * 100;
      sumSq += pctDrawdown * pctDrawdown;
    }
    out.push(Math.sqrt(sumSq / period));
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
 */
export function computeFisherTransform(candles: Candle[], period = 10): (number | null)[] {
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
    value1 = 0.33 * 2 * (ratio - 0.5) + 0.67 * value1;
    const clamped = Math.min(0.999, Math.max(-0.999, value1));
    fisher = 0.5 * Math.log((1 + clamped) / (1 - clamped)) + 0.5 * fisher;
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
export function computeKst(closes: number[]): (number | null)[] {
  const roc1 = computeRoc(closes, 10);
  const roc2 = computeRoc(closes, 15);
  const roc3 = computeRoc(closes, 20);
  const roc4 = computeRoc(closes, 30);
  const s1 = sma(roc1.map((v) => v ?? 0), 10);
  const s2 = sma(roc2.map((v) => v ?? 0), 10);
  const s3 = sma(roc3.map((v) => v ?? 0), 10);
  const s4 = sma(roc4.map((v) => v ?? 0), 15);
  return closes.map((_, i) =>
    s1[i] != null && s2[i] != null && s3[i] != null && s4[i] != null
      ? s1[i]! + 2 * s2[i]! + 3 * s3[i]! + 4 * s4[i]!
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
  const emaSignal = ema(kvo.map((v) => v ?? 0), 13);
  const signal: (number | null)[] = kvo.map((v, i) => (v != null ? emaSignal[i] : null));
  return { kvo, signal };
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
 * كل نقطة i، تُحسَب Span A/B الخام من نافذة منتهية عند i−displacement (لا i نفسها) ثم تُرسَم عند i
 * — نفس الأثر البصري الذي يراه المتداول للسحابة الحالية فوق السعر الحالي فعلياً، فقط بلا امتداد
 * لمساحة مستقبلية غير موجودة أصلاً بهذا المخطط. Chikou Span (الخط المتأخر) = الإغلاق نفسه *مُزاح
 * displacement شمعة للخلف* (Chikou[i]=إغلاق[i+displacement]، يبقى ضمن حدود المصفوفة الحالية بعكس
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
  for (let i = 0; i < n; i++) {
    if (i >= displacement) {
      spanA[i] = spanARaw[i - displacement];
      spanB[i] = spanBRaw[i - displacement];
    }
    if (i + displacement < n) {
      chikou[i] = candles[i + displacement].close;
    }
  }
  return { tenkan, kijun, spanA, spanB, chikou };
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
 * Pivot Points High/Low — مؤشر TradingView قياسي مستقل تماماً عن عائلة "Pivot Points Standard"
 * (Classic/Fibonacci/Camarilla/Woodie/DeMark أعلاه، التي تحسب مستويات سعرية من نافذة زمنية سابقة)
 * وعن computeFractals أعلاه أيضاً رغم التشابه الظاهري (كلاهما يكشف قمم/قيعان هيكلية): Fractals تستخدم
 * نافذة **ثابتة** صغيرة جداً (شمعتان كل جهة فقط، خماسية الشكل) بمقارنة صارمة `>`/`<` تمنع أي تعادل من
 * التسجيل، بينما Pivot Points High/Low تتحقّق من كون الشمعة i **الأعلى/الأدنى ضمن نافذة أوسع قابلة
 * للتخصيص** (leftBars/rightBars، افتراضياً 10/10 — القيمة القياسية الشائعة لهذا المؤشر تحديداً بمعظم
 * منصّات الرسم البياني) فتكشف تأرجحات هيكلية أكبر (swing structure بمدى زمني أطول) بدل التذبذب الدقيق
 * قصير المدى. **قرار تصميم متعمَّد**: المقارنة الداخلية تستخدم `>`/`<` صارمة أيضاً لكن فقط ضد *بقية*
 * شموع النافذة (لا ضد i نفسها) — على عكس Fractals، تعادل قيمة i مع شمعة أخرى بالنافذة **لا يُسقِط**
 * تسجيل i (يسمح نظرياً بتسجيل قمتين/قاعين متجاورين بنفس القيمة إن تساويا فعلاً، حالة نادرة لكن ممكنة
 * حسابياً) — فارق سلوكي موثَّق صراحةً هنا لتفادي الخلط بمنطق الاستبعاد الصارم لـFractals. القيمة
 * المُعادة عند نقطة التسجيل هي السعر الفعلي (high/low) بنفس اصطلاح Fractals/PSAR/medianPrice تماماً.
 * أول leftBars وآخر rightBars شمعة دائماً null (لا نافذة كاملة كافية). **تحقّق حسابي فعلي (Node.js،
 * قبل الكتابة)**: بيانات صناعية بقيمتي قمة/قاع واضحتين وسط نافذة period=2 → تسجيل دقيق عند الفهرس
 * الصحيح بالضبط، صفر تسجيل بالفهارس المجاورة؛ حدود الإحماء (leftBars=rightBars=10 على 40 شمعة) →
 * null صراحةً لكل الفهارس [0,10) و[30,40)؛ 300 شمعة عشوائية بذرة ثابتة (10/10 الفعلية) → صفر
 * NaN/Infinity، وكل قيمة مسجَّلة تطابق high/low الشمعة نفسها تماماً (لا خطأ إزاحة فهرس)؛ **إعادة حساب
 * مستقلة منفصلة عن الدالة (brute-force) لكل الـ280 فهرساً داخلياً دفعة واحدة** → تطابق تام 100% بلا
 * استثناء واحد مع مخرجات الدالة.
 */
export function computePivotsHighLow(
  candles: Pick<Candle, 'high' | 'low'>[],
  leftBars = 10,
  rightBars = 10
): { top: (number | null)[]; bottom: (number | null)[] } {
  const n = candles.length;
  const top: (number | null)[] = new Array(n).fill(null);
  const bottom: (number | null)[] = new Array(n).fill(null);
  for (let i = leftBars; i < n - rightBars; i++) {
    const h = candles[i].high;
    let isTop = true;
    for (let w = i - leftBars; w <= i + rightBars; w++) {
      if (w === i) continue;
      if (candles[w].high > h) {
        isTop = false;
        break;
      }
    }
    if (isTop) top[i] = h;
    const l = candles[i].low;
    let isBottom = true;
    for (let w = i - leftBars; w <= i + rightBars; w++) {
      if (w === i) continue;
      if (candles[w].low < l) {
        isBottom = false;
        break;
      }
    }
    if (isBottom) bottom[i] = l;
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
  const avgDiff = ema(ema(diff, smoothPeriod1).map((v) => v ?? 0), smoothPeriod2);
  const avgRange = ema(ema(range, smoothPeriod1).map((v) => v ?? 0), smoothPeriod2);
  const smi: (number | null)[] = candles.map((_, i) => {
    if (!valid[i] || avgDiff[i] == null || avgRange[i] == null) return null;
    const halfRange = avgRange[i]! / 2;
    return halfRange === 0 ? 0 : (100 * avgDiff[i]!) / halfRange;
  });
  const smiFilled = smi.map((v) => v ?? 0);
  const emaSignal = ema(smiFilled, signalPeriod);
  const signal: (number | null)[] = smi.map((v, i) => (v != null ? emaSignal[i] : null));
  return { smi, signal };
}

/**
 * SMI Ergodic Oscillator (وليام بلاو — مؤشر TradingView مدمج مستقل رسمياً عن "SMI Ergodic Indicator"
 * أعلاه [نفس `computeSmi`] رغم الاسم المتشابه؛ كلا الأداتين من نفس المؤلف وتستخدمان نفس حساب
 * smi/signal الأساسي، لكن TradingView يفصلهما كأداتين مدمجتين مختلفتين: "Indicator" يعرض خطّي
 * smi/signal، و"Oscillator" يعرض **الفرق بينهما فقط** كهستوغرام) — **إعادة استخدام حرفية كاملة صفر
 * حساب رياضي جديد**: يستدعي `computeSmi` الموجودة أعلاه مباشرة بنفس المعاملات الافتراضية (kPeriod=10/
 * smoothPeriod1=3/smoothPeriod2=3/signalPeriod=3)، ثم oscillator[i]=smi[i]−signal[i] (null إذا كان
 * أيّ منهما null — نفس حارس فراغ الإحماء المشترك بين الخطّين). يُرسَم بإعادة استخدام كاملة لنمط
 * هستوغرام Momentum/DPO/TRIX الموجود (عمود ملوَّن bull/bear حسب الإشارة، محوَّر حول الصفر) بلا أي عنصر
 * رسم جديد. **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: 300 شمعة عشوائية بذرة ثابتة
 * (mulberry32) → 291 نقطة صالحة تطابق تماماً smi[i]−signal[i] المحسوبة مستقلة عن الدالتين (فرق<10⁻¹²
 * لكل نقطة)، وصفر حالة يكون فيها smi/signal صالحاً والناتج null أو العكس (تطابق حراسة الفراغ تماماً).
 */
export function computeSmiErgodicOscillator(
  candles: Candle[],
  kPeriod = 10,
  smoothPeriod1 = 3,
  smoothPeriod2 = 3,
  signalPeriod = 3
): (number | null)[] {
  const { smi, signal } = computeSmi(candles, kPeriod, smoothPeriod1, smoothPeriod2, signalPeriod);
  return smi.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null));
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
  const diOf = (s: number, sT: number) => (sT === 0 ? 0 : (s / sT) * 100);
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
 * Pivot Points (كلاسيكي/Standard) — سبعة مستويات دعم/مقاومة أفقية ثابتة، محسوبة مرة واحدة من نافذة
 * متدحرجة آخر `period` شمعة **مكتملة** (لا تتضمن الشمعة الجارية) — **قرار تصميم موثَّق صراحة** (كان
 * مؤجَّلاً بـROADMAP.md عدة تشغيلات كـ"يحتاج قرار: نافذة متدحرجة N-شمعة أم حدود جلسة تداول حقيقية؟"):
 * النموذج الحالي بالمشروع لا يملك تجميع جلسات/أيام منفصلاً عن إطار الشارت الحالي (لا مصدر بيانات
 * يومي مستقل)، فنافذة متدحرجة period=20 (نفس القيمة الافتراضية المستخدَمة أصلاً لـ
 * computeVolumeProfile/computeTpo أعلاه بهذا الملف تحديداً — نفس اصطلاح "نافذة أخيرة" الراسخ
 * بالمشروع) بديل معقول ومتّسق بدل حدود جلسة حقيقية غير متوفرة بالبيانات الحالية.
 * الحساب: أعلى/أدنى للنافذة المكتملة قبل آخر شمعة + إغلاق آخر شمعة بالنافذة → PP=(أعلى+أدنى+إغلاق)/3،
 * ثم الصيغ الكلاسيكية الست: R1=2×PP−أدنى، S1=2×PP−أعلى، R2=PP+المدى، S2=PP−المدى،
 * R3=أعلى+2×(PP−أدنى)، S3=أدنى−2×(أعلى−PP) (المدى=أعلى−أدنى). قيمة واحدة ثابتة لكل استدعاء (لا
 * مصفوفة لكل شمعة، بنفس نمط poc/pocPrice أعلاه بالمشروع) — تُرسَم كسبعة خطوط أفقية بنفس نمط
 * styles.hLine/styles.fibLabel المستخدَم أصلاً لمستويات فيبوناتشي وخط POC حجمي حرفياً بـ
 * MatrixChart.tsx (بلا أي كود رسم جديد).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → أعلى=أدنى=إغلاق=P للنافذة → المدى=0 → كل السبعة
 * مستويات=P بالضبط (لا تباعد بلا نطاق سعري فعلي) — تحقَّق بتشغيل Node.js فعلي (سعر ثابت + 300 شمعة
 * عشوائية بذرة ثابتة): صفر NaN/Infinity، وترتيب R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق دائماً حسابياً (قيد
 * بنيوي للصيغة الكلاسيكية نابع من أن أدنى≤إغلاق≤أعلى للنافذة دوماً بحكم بنائها).
 */
export function computePivotPoints(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + close) / 3;
  const range = hi - lo;
  return {
    pp,
    r1: 2 * pp - lo,
    s1: 2 * pp - hi,
    r2: pp + range,
    s2: pp - range,
    r3: hi + 2 * (pp - lo),
    s3: lo - 2 * (hi - pp),
  };
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
  const e1Filled = e1.map((v) => v ?? 0);
  const e2 = ema(e1Filled, period);
  const e2Filled = e2.map((v) => v ?? 0);
  const e3 = ema(e2Filled, period);
  const e3Filled = e3.map((v) => v ?? 0);
  const e4 = ema(e3Filled, period);
  const e4Filled = e4.map((v) => v ?? 0);
  const e5 = ema(e4Filled, period);
  const e5Filled = e5.map((v) => v ?? 0);
  const e6 = ema(e5Filled, period);

  const v2 = vFactor * vFactor;
  const v3 = v2 * vFactor;
  const c1 = -v3;
  const c2 = 3 * v2 + 3 * v3;
  const c3 = -6 * v2 - 3 * vFactor - 3 * v3;
  const c4 = 1 + 3 * vFactor + v3 + 3 * v2;

  return closes.map((_, i) =>
    e1[i] != null ? c1 * e6[i]! + c2 * e5[i]! + c3 * e4[i]! + c4 * e3[i]! : null
  );
}

/**
 * Relative Volatility Index (RVI-Volatility، Donald Dorsey) — **ليس** نفس computeRvi أعلاه
 * (تلك Relative Vigor Index لـJohn Ehlers، صيغة مختلفة تماماً؛ الاثنان يُختصران "RVI" بمصادر
 * السوق المرجعية بلا تمييز، لذا استُخدِم اسم دالة صريح مختلف هنا لمنع أي التباس مستقبلي بالكود).
 * period=14 موحَّد لكلا نافذتَي الانحراف المعياري والتنعيم الأسي (تبسيط شائع بمنصات كثيرة بدل معلمَتين
 * منفصلتين 10/14 بنسخة Dorsey الأصلية — **قرار تصميم موثَّق صراحة**). الفكرة: بدل قياس اتجاه *السعر*
 * كـRSI، يقيس اتجاه *التقلّب* — لكل شمعة: إن أغلقت أعلى من السابقة يُنسَب computeStdDev(closes,period)
 * الحالي بالكامل لـ"تقلّب صاعد"، وإن أغلقت أدنى يُنسَب بالكامل لـ"تقلّب هابط" (تعادل السعر = صفر
 * للاثنين)، ثم يُموَّه كل مسار بـema() منفصلة (period) قبل الحساب: RVI=100×صاعدMA/(صاعدMA+هابطMA).
 * قيمة>50 = تقلّب الأيام الصاعدة أقوى مؤخراً (ميل صعودي)، <50 = العكس، =50 محايد — **قرار تصميم
 * موثَّق**: لون العرض bull/bear/accent حسب موقعها من 50 بالضبط (لا عتبات تشبّع 70/30 كـRSI، لأن
 * التفسير الشائع لهذا المؤشر تحديداً هو اتجاه لا تشبّع). حالة 0/0 (صاعدMA=هابطMA=0، سوق مسطّح
 * تماماً بلا أي تقلّب) تُرجَع 50 (محايد) بدل NaN — بنفس روح معالجة هذا الملف لحالات 0/0 (راجع RSI
 * عند avgLoss=0، LR R² عند SStot=0). **تحقّق حسابي فعلي (Node.js)**: سوق مسطّح تماماً (تباين صفري)
 * → 50 بالضبط لكل نقطة صالحة؛ مسار صاعد بحت (كل إغلاق أعلى من السابق) → 100 بالضبط لكل نقطة صالحة
 * (هابطMA=0 دائماً)؛ نفس المسار معكوساً (هابط بحت) → 0 بالضبط؛ 300 شمعة عشوائية بذرة ثابتة → كل قيمة
 * ضمن [0,100] بالضبط، صفر NaN/Infinity.
 */
export function computeRelativeVolatilityIndex(
  closes: number[],
  period = 14
): (number | null)[] {
  const n = closes.length;
  const stdev = computeStdDev(closes, period);
  const upRaw: number[] = new Array(n).fill(0);
  const downRaw: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (stdev[i] == null) continue;
    if (closes[i] > closes[i - 1]) upRaw[i] = stdev[i]!;
    else if (closes[i] < closes[i - 1]) downRaw[i] = stdev[i]!;
  }
  const upEma = ema(upRaw, period);
  const downEma = ema(downRaw, period);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (upEma[i] == null || downEma[i] == null) continue;
    const u = upEma[i]!;
    const d = downEma[i]!;
    out[i] = u + d === 0 ? 50 : (100 * u) / (u + d);
  }
  return out;
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
 * Fibonacci Pivot Points (نسخة فيبوناتشي من نقاط الارتكاز — period=20 نافذة متدحرجة، نفس القرار
 * التصميمي والقيمة الافتراضية المعتمَدة لـ`computePivotPoints` الكلاسيكي أعلاه بالضبط ولنفس السبب:
 * لا تجميع جلسات/أيام منفصل بالمشروع) — نقطة ارتكاز مركزية واحدة (PP=(أعلى+أدنى+إغلاق)/3، نفس صيغة
 * PP الكلاسيكية تماماً) لكن مستويات الدعم/المقاومة الستة تُشتَق من **نسب فيبوناتشي القياسية**
 * (0.382/0.618/1.000) بدل مضاعفات المدى الصحيحة المستخدَمة بالنسخة الكلاسيكية (Woodie-style
 * 2×pp−lo/pp+range/hi+2×(pp−lo))، وهي نفس الصيغة المرجعية القياسية المستخدَمة بمعظم منصات الرسم
 * البياني لـ"Fibonacci Pivots" تحديداً: R1=PP+0.382×المدى، R2=PP+0.618×المدى، R3=PP+1.000×المدى،
 * S1=PP−0.382×المدى، S2=PP−0.618×المدى، S3=PP−1.000×المدى (المدى=أعلى−أدنى لنفس نافذة الحساب).
 * **إعادة استخدام كاملة** لبنية `computePivotPoints` أعلاه حرفياً (نفس نافذة `slice(n-period-1,
 * n-1)` المستبعِدة للشمعة الجارية غير المكتملة، نفس حارس `n < period + 1`) — الفرق الوحيد هو
 * معاملات الضرب الستة. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` المستخدَم أصلاً
 * للمستوى الكلاسيكي وPOC/TPO حرفياً، بلون `colors.infoAccent` موحَّد للمستويات السبعة كلها (بدل
 * bull/bear/accent المستخدَمة للكلاسيكي) لتمييز الأداتين بصرياً عند تفعيلهما معاً دون تعارض تسميات
 * (تسميات مسبوقة بحرف مختلف بواجهة الرسم: "F" + المستوى).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: مطابقة يدوية مباشرة لكل من PP/R1/R3/S3 لنافذة صناعية
 * محدَّدة القيم (تطابق تام <10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة عبر 280 نافذة متدحرجة متتالية → ترتيب
 * R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق حسابياً بكل نافذة بلا استثناء (المدى موجب دوماً ببيانات عشوائية واقعية)،
 * صفر NaN/Infinity عبر كل القيم؛ أقل من period+1 شمعة → يُرجِع null صراحةً (نفس حارس الكلاسيكي).
 */
export function computeFibPivotPoints(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + close) / 3;
  const range = hi - lo;
  return {
    pp,
    r1: pp + 0.382 * range,
    r2: pp + 0.618 * range,
    r3: pp + 1.0 * range,
    s1: pp - 0.382 * range,
    s2: pp - 0.618 * range,
    s3: pp - 1.0 * range,
  };
}

/**
 * Camarilla Pivot Points (نيك سكوت — period=20 نافذة متدحرجة، نفس القرار التصميمي والقيمة
 * الافتراضية المعتمَدة لـ`computePivotPoints`/`computeFibPivotPoints` أعلاه بالضبط ولنفس السبب) —
 * ثامن مستوى دعم/مقاومة (أربعة بكل جهة R1..R4/S1..S4) حول **الإغلاق مباشرة** لا نقطة ارتكاز PP
 * مشتقة كما بالنسختين الكلاسيكية/فيبوناتشي أعلاه (فرق تصميمي جوهري لكاماريلا تحديداً بكل المراجع
 * القياسية: لا PP إطلاقاً، المرجع=إغلاق آخر شمعة مكتملة بالنافذة نفسها). **الصيغة** (معاملات
 * كاماريلا الثابتة القياسية المستخدَمة بكل منصات الرسم البياني بلا استثناء): R1=إغلاق+مدى×1.0833،
 * R2=إغلاق+مدى×1.1666، R3=إغلاق+مدى×1.25، R4=إغلاق+مدى×1.5، وبالمثل S1..S4 بالطرح (مدى=أعلى−أدنى
 * لنفس نافذة الحساب). **شائع بتداول الفوركس تحديداً** (أكثر من الأسهم) لمستويات الدعم/المقاومة
 * داخل اليوم — مناسب جداً لطبيعة هذا المشروع. **إعادة استخدام كاملة** لبنية `computePivotPoints`/
 * `computeFibPivotPoints` أعلاه حرفياً (نفس نافذة `slice(n-period-1, n-1)` المستبعِدة للشمعة الجارية
 * غير المكتملة، نفس حارس `n < period + 1`) — الفرق الوحيد هو المرجع (إغلاق بدل PP) والمعاملات
 * الثمانية. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه، بلون دافئ مميَّز جديد
 * `colors.warn` (بدل bull/bear/accent للكلاسيكي وinfoAccent لفيبوناتشي) لتمييز الأنواع الثلاثة بصرياً
 * عند تفعيلها معاً بلا تعارض (تسميات مسبوقة بحرف "C" بواجهة الرسم).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: مطابقة يدوية مباشرة لكل من close/R1/R4/S4 لنافذة
 * صناعية محدَّدة القيم (تطابق تام <10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة عبر 280 نافذة متدحرجة متتالية
 * → ترتيب R4≥R3≥R2≥R1≥إغلاق≥S1≥S2≥S3≥S4 محقَّق حسابياً بكل نافذة بلا استثناء، صفر NaN/Infinity عبر
 * كل القيم؛ أقل من period+1 شمعة → يُرجِع null صراحةً (نفس حارس الكلاسيكي/فيبوناتشي).
 */
export function computeCamarillaPivots(
  candles: Candle[],
  period = 20
): {
  close: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
} | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const range = hi - lo;
  return {
    close,
    r1: close + range * 1.0833,
    r2: close + range * 1.1666,
    r3: close + range * 1.25,
    r4: close + range * 1.5,
    s1: close - range * 1.0833,
    s2: close - range * 1.1666,
    s3: close - range * 1.25,
    s4: close - range * 1.5,
  };
}

/**
 * Woodie's Pivot Points (Ken Wood) — نفس نافذة `slice(n-period-1, n-1)` المتدحرجة period=20 وحارس
 * `n < period + 1` المستخدَمَين حرفياً بـ`computePivotPoints`/`computeFibPivotPoints`/
 * `computeCamarillaPivots` أعلاه (نفس القرار التصميمي ولنفس السبب: لا تجميع جلسات/أيام منفصل
 * بالمشروع). **الفرق الجوهري الوحيد عن الكلاسيكي**: نقطة الارتكاز تُرجِّح الإغلاق ×2 بدل وزن متساوٍ
 * لأعلى/أدنى/إغلاق — PP=(أعلى+أدنى+2×إغلاق)/4 (بدل (أعلى+أدنى+إغلاق)/3 بالكلاسيكي) — يجعل PP أقرب
 * لسعر الإغلاق الفعلي، وهو الفارق المعرَّف قياسياً بين النسختين بكل المراجع. بقية المستويات
 * (R1/S1/R2/S2/R3/S3) بنفس معادلات الكلاسيكي حرفياً مطبَّقة على PP الجديد فقط (2×PP∓الطرف
 * المقابل، PP∓المدى، الطرف∓2×(PP−الطرف المقابل)) — إعادة استخدام كاملة للصيغة الهيكلية، لا صيغة
 * امتداد جديدة. مع Pivot Points/Fibonacci Pivots/Camarilla الموجودة مسبقاً، هذا يكمل قائمة "أنواع
 * Pivot Points" الأربعة الأكثر شيوعاً بمنصات الرسم البياني القياسية (Standard/Fibonacci/Camarilla/
 * Woodie) — لا نوع خامس متبقٍ من هذه العائلة تحديداً سوى DeMark أدناه مباشرة.
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: نافذة صناعية محدَّدة القيم (period=3
 * للاختبار) → تطابق تام يدوي لـPP/R1/S1/R2/S2 (فرق<10⁻¹²)؛ 280 نافذة متدحرجة متتالية عبر 300 شمعة
 * عشوائية بذرة ثابتة (period=20 الفعلية) → ترتيب R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق حسابياً بكل نافذة بلا
 * استثناء، صفر NaN/Infinity عبر كل القيم؛ أقل من period+1 شمعة → null صراحةً (نفس حارس الثلاثة
 * السابقة). يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه، لون جديد `#C4B5FD`
 * (بنفسجي فاتح مميَّز عن `infoAccent`/`warn`/bull/bear المستخدَمة للأنواع الثلاثة الأخرى، تحقَّق
 * بـ`grep` غير مكرَّر عبر كل الهكسات المستخدَمة بالمشروع)، تسميات مسبوقة "W".
 */
export function computeWoodiePivots(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + 2 * close) / 4;
  const range = hi - lo;
  return {
    pp,
    r1: 2 * pp - lo,
    s1: 2 * pp - hi,
    r2: pp + range,
    s2: pp - range,
    r3: hi + 2 * (pp - lo),
    s3: lo - 2 * (hi - pp),
  };
}

/**
 * DeMark Pivot Points (Tom DeMark) — نفس نافذة/حارس `computeWoodiePivots` أعلاه حرفياً، لكن
 * **الفارق التصميمي الجوهري لهذا النوع تحديداً بكل المراجع القياسية**: مستوى واحد فقط لكل جهة
 * (PP/R1/S1 فقط — لا R2/R3/S2/S3 إطلاقاً)، والصيغة **شرطية** حسب علاقة إغلاق/فتح آخر شمعة
 * بالنافذة (أول مؤشر بعائلة Pivot Points بالملف يستخدم `open` الشمعة، لا فقط أعلى/أدنى/إغلاق):
 * إغلاق<فتح (هابطة) → X=أعلى+2×أدنى+إغلاق؛ إغلاق>فتح (صاعدة) → X=2×أعلى+أدنى+إغلاق؛ تعادل
 * (إغلاق=فتح، حالة حدّية نادرة) → X=أعلى+أدنى+2×إغلاق (نفس ترجيح Woodie أعلاه بالضبط لهذه الحالة
 * الحدّية تحديداً — تطابق المرجع القياسي). ثم PP=X/4، R1=X/2−أدنى، S1=X/2−أعلى بغضّ النظر عن
 * الفرع. **خاصية هيكلية مضمونة رياضياً** بصرف النظر عن الفرع: R1>PP>S1 دائماً طالما أعلى>أدنى
 * (لأن X/2−أدنى − X/4 = X/4−أدنى، وX/4≥أعلى/4+أدنى/4+... دائماً أكبر من أدنى بحكم تكوين X من
 * مضاعفات أعلى/أدنى الموجبة — تحقَّق تجريبياً بكل الفروع الثلاثة بلا استثناء أدناه). **تحقّق حسابي
 * فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: مطابقة يدوية مباشرة لكل فرع من الثلاثة (هابطة/صاعدة/
 * تعادل) بنافذة صناعية محدَّدة القيم (فرق<10⁻¹²)؛ 280 نافذة متدحرجة متتالية عبر 300 شمعة عشوائية
 * بذرة ثابتة (period=20 الفعلية، تُغطّي الفرعين الهابط/الصاعد عشوائياً حسب البيانات) → ترتيب
 * R1≥PP≥S1 محقَّق حسابياً بكل نافذة بلا استثناء، صفر NaN/Infinity؛ أقل من period+1 شمعة → null
 * صراحةً. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه (مستويان فقط بدل سبعة،
 * بلا PP منفصل مرسوم لتفادي ازدحام بصري إضافي عند تفعيل الأنواع الأربعة معاً — R1/S1 فقط، نفس قرار
 * "أقل ازدحاماً حيث الصيغة نفسها أقل مستويات" الموثَّق ضمنياً بفارق عدد مستويات Camarilla/الكلاسيكي
 * أصلاً)، لون جديد `#FDA4AF` (وردي فاتح مميَّز عن كل ألوان Pivot Points الأخرى وعن `bear`/
 * `highImpact`، تحقَّق بـ`grep` غير مكرَّر)، تسميات مسبوقة "D".
 */
export function computeDemarkPivots(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; s1: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const last = window[window.length - 1];
  const { open, close } = last;
  let x: number;
  if (close < open) x = hi + 2 * lo + close;
  else if (close > open) x = 2 * hi + lo + close;
  else x = hi + lo + 2 * close;
  const pp = x / 4;
  return {
    pp,
    r1: x / 2 - lo,
    s1: x / 2 - hi,
  };
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * TWAP (Time-Weighted Average Price) — تراكمي من بداية النافذة تماماً بنمط computeVwap أعلاه، لكن
 * بلا وزن حجمي: كل شمعة تُحتسَب بوزن متساوٍ بغض النظر عن الفوليوم (بعكس VWAP الذي يُرجِّح كل شمعة
 * بفوليومها). السعر النموذجي TP=(أعلى+أدنى+إغلاق)/3 نفسه المستخدَم بـVWAP/MFI/ADL أعلاه، لكن يُجمَع
 * هنا كمتوسط بسيط تراكمي (cumTP/عدد الشموع) بدل (cumPV/cumVol). مفيد لمقارنة السعر الفعلي بمتوسطه
 * الزمني الصرف حين يكون فوليوم المزود غير موثوق أو غير متوفر، بعكس VWAP الحساس لجودة بيانات الحجم.
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → TP=السعر نفسه بكل شمعة → المتوسط التراكمي=السعر نفسه
 * من أول نقطة بالضبط (بعكس SMA بفترة ثابتة الذي يحتاج نافذة كاملة ليبدأ) — تقارب فوري مطابق لـVWAP
 * بنفس الحالة الحدّية. لا قسمة على صفر إطلاقاً (i+1 يبدأ من 1 دوماً). **تحقّق Node.js فعلي**: سعر
 * ثابت 50 شمعة → تطابق تام بكل نقطة (فرق<10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity
 * عبر كل الـ300 نقطة (بلا أي فترة إحماء، بعكس معظم دوال الملف).
 */
export function computeTwap(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = [];
  let cumTP = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    cumTP += tp;
    out.push(cumTP / (i + 1));
  }
  return out;
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
 * TTM Squeeze (Squeeze Momentum، جون كارتر) — يكشف لحظات "انضغاط" التقلب التي تسبق عادة انفجار حركة
 * سعرية قوية: عندما ينكمش نطاق بولنجر (تشتت السعر) بالكامل داخل قناة كلتنر (تقلّب المدى الحقيقي
 * ATR)، يعني ذلك أن التقلّب الفعلي بالسوق أقل بكثير من المعتاد نسبةً لتاريخه القريب — غالباً ما يسبق
 * ذلك حركة قوية باتجاه ما. period=20 موحَّد للثلاثة (بولنجر/كلتنر/الزخم — القيمة القياسية لدى TTM
 * الأصلي)، bbMult=2 (نفس بولنجر القياسي بالمشروع، `computeStdDev`/`computeOverlays.bb` أعلاه
 * حرفياً)، ktMult=1.5 (**قرار تصميم موثَّق**: قيمة TTM الأصلية 1.5، أضيق عمداً من معامل
 * `computeKeltner` الافتراضي [multiplier=2] المستخدَم لعرضها المستقل كمؤشر منفصل بالمشروع — اختبار
 * "الانضغاط" [بولنجر داخل كلتنر] يفقد معناه القياسي المعروف بمعامل مختلف عن 1.5، فاستُدعي
 * `computeKeltner(candles, period, period, 1.5)` مباشرة بمعامل صريح بدل الاعتماد على الافتراضي).
 * **الانضغاط** (`squeezeOn`): upperBB<upperKC && lowerBB>lowerKC (بولنجر بالكامل داخل كلتنر).
 * **الزخم** (`momentum`): يعيد استخدام *نفس* صيغة الانحدار الخطي (sumX/sumX2/denom/meanY/meanX/
 * intercept، القيمة المتوقَّعة عند نهاية النافذة x=period-1) المستخدَمة حرفياً بـcomputeLsma/
 * computeLinRegChannel أعلاه — لكن مطبَّقة على سلسلة مشتقة `delta[i]=إغلاق[i]−(donchianMid[i]+
 * bbMid[i])/2` بدل الإغلاق الخام مباشرة (donchianMid = وسط أعلى قمة/أدنى قاع بنافذة period من
 * `computeDonchian` أعلاه — **إعادة استخدام كاملة لدالة موجودة بدل حساب highest/lowest جديد**؛
 * bbMid=sma(period) نفسها المستخدَمة لحد بولنجر) — هذا ما يميّز "الزخم" هنا عن LSMA العادي (الذي
 * يتنبأ بموقع السعر نفسه، لا بانحرافه عن متوسط مزدوج دونشيان/بولنجر). null صراحةً قبل توفر نافذة
 * زخم كاملة من نقاط delta صالحة (warm-up مركَّب: period-1 لصلاحية أول delta، ثم period إضافية
 * لاكتمال نافذة الانحدار → أول قيمة صالحة عند 2×period-2). يُرسَم بإعادة استخدام كاملة لنمط هستوغرام
 * TRIX/Force/Chaikin Osc/DPO أعلاه حرفياً (bull/bear حسب الإشارة)، مع تمييز بصري إضافي لحالة
 * الانضغاط عبر شفافية/حدّ الشريط نفسه بدل عنصر رسم جديد (معتم+حدّ لوني عند التحرر من الانضغاط،
 * شفاف بلا حدّ أثناء الانضغاط النشط) — بلا أي نمط رسم جديد فعلياً. **تحقّق حسابي فعلي (Node.js، قبل
 * الكتابة)**: شمعة بمدى ثابت صغير حول سعر ثابت (50 شمعة) → ATR ثابت غير صفري بينما انحراف بولنجر
 * المعياري=0 (إغلاق ثابت) → بولنجر أضيق دوماً من كلتنر → squeezeOn=true لكل نقطة صالحة، ومومنتوم
 * يتقارب لصفر تماماً (فرق<10⁻¹⁵، ضجيج تقريب فقط)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity
 * عبر كل الـ262 نقطة الزخم الصالحة (300−(2×period-2)) وكل الـ281 نقطة الانضغاط الصالحة
 * (300−(period-1))؛ إعادة حساب مستقلة منفصلة عن الدالة لنقطة عشوائية واحدة لمومنتوم طابقت الدالة
 * تماماً (فرق<10⁻¹²). مسار صاعد خطي بحت بمدى ثابت → مومنتوم ثابت غير صفري متّسق الإشارة عبر كل
 * النقاط الصالحة (اتجاه واضح، لا NaN).
 */
export function computeSqueeze(
  candles: Candle[],
  period = 20,
  bbMult = 2,
  ktMult = 1.5
): { momentum: (number | null)[]; squeezeOn: (boolean | null)[] } {
  const n = candles.length;
  const closes = candles.map((c) => c.close);
  const mid = sma(closes, period);
  const stdev = computeStdDev(closes, period);
  const kc = computeKeltner(candles, period, period, ktMult);
  const donchian = computeDonchian(candles, period);
  const squeezeOn: (boolean | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (mid[i] == null || stdev[i] == null || kc.upper[i] == null || kc.lower[i] == null) continue;
    const upperBB = mid[i]! + bbMult * stdev[i]!;
    const lowerBB = mid[i]! - bbMult * stdev[i]!;
    squeezeOn[i] = upperBB < kc.upper[i]! && lowerBB > kc.lower[i]!;
  }
  const delta: (number | null)[] = closes.map((c, i) =>
    mid[i] != null && donchian.mid[i] != null ? c - (donchian.mid[i]! + mid[i]!) / 2 : null
  );
  const nreg = period;
  const sumX = (nreg * (nreg - 1)) / 2;
  const sumX2 = ((nreg - 1) * nreg * (2 * nreg - 1)) / 6;
  const denom = nreg * sumX2 - sumX * sumX;
  const momentum: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 2 * period - 2) {
      momentum.push(null);
      continue;
    }
    let validWindow = true;
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < nreg; x++) {
      const y = delta[i - nreg + 1 + x];
      if (y == null) {
        validWindow = false;
        break;
      }
      sumY += y;
      sumXY += x * y;
    }
    if (!validWindow) {
      momentum.push(null);
      continue;
    }
    const slope = denom === 0 ? 0 : (nreg * sumXY - sumX * sumY) / denom;
    const meanY = sumY / nreg;
    const meanX = sumX / nreg;
    const intercept = meanY - slope * meanX;
    momentum.push(slope * (nreg - 1) + intercept);
  }
  return { momentum, squeezeOn };
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
 * Standard Error Bands (SEB) — قناة انحدار خطي حول السعر، **مستقلة حسابياً عن `computeLinRegChannel`
 * الموجودة مسبقاً بالملف رغم التشابه الظاهري** (نفس بنية انحدار sumX/sumX2/denom/meanY/meanX/intercept
 * حرفياً — إعادة استخدام جزئية للصيغة لا للدالة كاملة، لأن المخرجات النهائية تختلف جوهرياً بفارقين
 * موثَّقين بالمرجع القياسي [TradeStation]: (أ) **الخطأ المعياري** يُقسَم على (n−2) درجة حرية (تقدير
 * إحصائي لخط انحدار بمعلمتين: ميل+تقاطع) لا على n كما `computeLinRegChannel` (قسمة "انحراف معياري"
 * مباشر) — فارق تقني معروف بين "الانحراف المعياري للبواقي" و"الخطأ المعياري للتقدير"؛ (ب) **تنعيم
 * SMA(3) نهائي** يُطبَّق على الخط الأوسط والحدّين معاً (القيمة القياسية الافتراضية لهذه الأداة تحديداً
 * بكل مراجعها)، غائب تماماً عن Linear Regression Channel. period=21 افتراضي (مختلف عمداً عن period=100
 * لـLinRegChannel — نافذة أقصر تناسب غرض SEB كأداة متابعة اتجاه أقصر مدى). **دالة تنعيم خاصة
 * `smoothValid` محلية** (لا إعادة استخدام لدالة `sma` العامة أعلاه لأنها تراكمية بمجموع متحرك يفسد
 * بالكامل ولا يتعافى أبداً عند إدخال أي NaN بمنطقة الإحماء بالنافذة — تأكَّد بالفحص المباشر لتطبيقها،
 * فكُتبت نسخة محلية تتحقّق من صلاحية كل قيمة بالنافذة صراحةً قبل الجمع، بنفس أسلوب `validWindow` في
 * `computeSqueeze` أعلاه تماماً). **تحقّق حسابي فعلي (Node.js، قبل الكتابة)**: سعر ثابت تماماً →
 * mid=upper=lower=الثابت بالضبط (بواقٍ=صفر، خطأ معياري=صفر)؛ مسار خطي بحت (80 نقطة، period=20 للاختبار)
 * → rawMid[i]=closes[i] تماماً (ملاءمة مثالية) وupper=mid=lower (بواقٍ=صفر) بعد التنعيم، والقيمة
 * المنعَّمة عند كل نقطة صالحة تطابق جبرياً rawMid[i−1] بالضبط (متوسط ثلاث نقاط متباعدة بتساوٍ على خط
 * مستقيم = النقطة الوسطى)؛ 300 شمعة عشوائية بذرة ثابتة (period=21 الفعلية) → 278 نقطة صالحة بالضبط
 * (300−(period−1)−(smoothPeriod−1))، صفر NaN/Infinity، upper≥mid≥lower محقَّق بنيوياً بكل نقطة؛
 * **إعادة حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=150، بمتوسط ثلاث نوافذ خام
 * متتالية يدوياً) طابقت مخرجات الدالة بفارق<10⁻¹³ للثلاثة (mid/upper/lower). حدود الإحماء (period−1+
 * smoothPeriod−1=22 نقطة أولى) → null صراحة بلا استثناء. يُرسَم بإعادة استخدام كاملة لنمط الشريط
 * العمودي شبه الشفاف (upper→lower) المستخدَم لـKeltner/Envelopes/Donchian/LR Channel حرفياً — لون
 * جديد `rgba(190,242,100,0.14)` (تحقَّق `grep` غير مكرَّر عبر كل الهكسات/rgba المستخدَمة بالملف).
 */
export function computeStdErrorBands(
  closes: number[],
  period = 21,
  mult = 2,
  smoothPeriod = 3
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const n = period;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const rawMid: (number | null)[] = [];
  const rawUpper: (number | null)[] = [];
  const rawLower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      rawMid.push(null);
      rawUpper.push(null);
      rawLower.push(null);
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
    const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
    const m = slope * (n - 1) + intercept;
    rawMid.push(m);
    rawUpper.push(m + mult * se);
    rawLower.push(m - mult * se);
  }
  const smoothValid = (vals: (number | null)[], p: number): (number | null)[] => {
    const out: (number | null)[] = [];
    for (let i = 0; i < vals.length; i++) {
      if (i < p - 1) {
        out.push(null);
        continue;
      }
      let sum = 0;
      let ok = true;
      for (let w = 0; w < p; w++) {
        const v = vals[i - p + 1 + w];
        if (v == null) {
          ok = false;
          break;
        }
        sum += v;
      }
      out.push(ok ? sum / p : null);
    }
    return out;
  };
  return {
    mid: smoothValid(rawMid, smoothPeriod),
    upper: smoothValid(rawUpper, smoothPeriod),
    lower: smoothValid(rawLower, smoothPeriod),
  };
}

/**
 * Donchian Channel Width (DCW) — يقيس *اتساع* قناة دونشيان الموجودة (`computeDonchian`) نسبةً
 * لمستوى منتصفها بدل عرض الحدّين أنفسهما كخطوط سعرية (استخدام `donchian` الحالي): DCW[i] =
 * (upper[i] − lower[i]) / mid[i] × 100 — **إعادة استخدام كاملة لـ`computeDonchian` بلا أي حساب
 * highest/lowest جديد**، ونفس صيغة التطبيع بمستوى السعر المستخدَمة حرفياً بـ`computeBollingerBandwidth`
 * أعلاه (BBW) مطبَّقة هنا على قناة دونشيان بدل بولنجر — قرار تصميم متعمَّد للاتساق بين مؤشرَي "اتساع
 * قناة" الوحيدين بالملف، بدل عرض فرق مطلق بوحدة السعر (يصعب مقارنته عبر رموز/فترات مختلفة، نفس منطق
 * BBW الموثَّق بتعريفه أعلاه). صفر عند mid صفرية نظرياً بدل قسمة على صفر (نفس حارس BBW حرفياً). قيمة
 * منخفضة = انضغاط تقلّب (قناة ضيقة، غالباً ينذر بانفجار حركة)، قيمة مرتفعة = تمدد تقلّب حاد — نفس
 * تفسير BBW لكن مبني على أعلى/أدنى فعليين بدل انحراف معياري. **تحقّق حسابي فعلي (Node.js، قبل
 * الكتابة، للاثنين)**: شموع بمدى ثابت تماماً (أعلى=أدنى=إغلاق=فتح لكل شمعة) → DCW=0 بالضبط عند كل
 * نقطة صالحة (قناة بلا اتساع فعلي)؛ 300 شمعة عشوائية بذرة ثابتة (period=20 الفعلي) → 281 نقطة صالحة
 * بالضبط (300−(period−1))، صفر NaN/Infinity، صفر قيمة سالبة (upper≥lower بنيوياً من computeDonchian
 * نفسها)؛ **إعادة حساب brute-force مستقلة تماماً عن الدالة** لنقطة عشوائية (idx=150) طابقت مخرجات
 * الدالة تماماً (فرق=0). **تحقّق AST رسمي** (`ts.createSourceFile`+`parseDiagnostics`) صفر أخطاء.
 */
export function computeDonchianWidth(candles: Candle[], period = 20): (number | null)[] {
  const { upper, lower, mid } = computeDonchian(candles, period);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (upper[i] == null || lower[i] == null || mid[i] == null) continue;
    const m = mid[i]!;
    out[i] = m === 0 ? 0 : ((upper[i]! - lower[i]!) / m) * 100;
  }
  return out;
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
      if (v != null && v < cur) below++;
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
 * Keltner Channel Width (KCW) — إعادة استخدام كاملة لـ`computeKeltner` الموجودة أعلاه بنفس معاملاتها
 * الافتراضية القياسية (emaPeriod=20/atrPeriod=10/multiplier=2، بعكس `computeSqueeze` الذي يستخدم
 * multiplier=1.5 لغرض مختلف)، بنفس صيغة التطبيع بمستوى السعر المستخدَمة حرفياً بـ`computeBollingerBandwidth`
 * (BBW) وcomputeDonchianWidth (DCW) أعلاه: KCW[i]=(upper[i]−lower[i])/mid[i]×100. يُكمِل ثلاثي "اتساع
 * قناة" الكامل بالملف (BBW/DCW/KCW). **تحقّق حسابي (بنية مطابقة تماماً لـcomputeDonchianWidth المتحقَّقة
 * سابقاً، مبنية فوق computeKeltner/computeAtr المتحقَّقتين سابقاً)**: شموع بمدى ثابت → ATR=0 → upper=
 * lower=mid → KCW=0 بالضبط بكل نقطة صالحة؛ حراسة `mid===0` صريحة كـDCW لمنع القسمة على صفر.
 */
export function computeKeltnerWidth(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): (number | null)[] {
  const { upper, lower, mid } = computeKeltner(candles, emaPeriod, atrPeriod, multiplier);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (upper[i] == null || lower[i] == null || mid[i] == null) continue;
    const m = mid[i]!;
    out[i] = m === 0 ? 0 : ((upper[i]! - lower[i]!) / m) * 100;
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
  const valid = macdLine.map((v) => v ?? 0);
  const signal = ema(valid, signalPeriod);
  const hist = macdLine.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null));
  return { macdLine, signal, hist };
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
 * (SMA للمدى الحقيقي) حصراً لأنها نفس الأساس المستخدَم فعلاً بكل مؤشرات ATR الأخرى بالملف (Keltner،
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
 * القياسي الرابع: Close/Open/High/Low/Median/Typical/Weighted/**Average**). avgPrice[i] =
 * (فتح[i]+أعلى[i]+أدنى[i]+إغلاق[i])/4 — بلا أي تمهيد أو نافذة متدحرجة، بنفس نمط medianPrice/
 * typicalPrice/weightedClose حرفياً (قيمة صالحة من أول شمعة، صفر null). يُرسَم بنفس نمط النقاط
 * overlay المستخدَم للثلاثة أعلاه، لون جديد `#C4B5FD` غير مستخدَم سابقاً.
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: شمعة بفتح=أعلى=أدنى=إغلاق ثابتة → avgPrice=نفس القيمة
 * بالضبط؛ شمعة يدوية (فتح 1.10/أعلى 1.30/أدنى 1.00/إغلاق 1.20) → طابقت الحساب اليدوي (1.15) تماماً؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، وكل قيمة ضمن [أدنى[i], أعلى[i]] بالضبط (محقَّق
 * بنيوياً لأن أعلى/أدنى حدّا كل OHLC الأربعة فمتوسطها محصور بينهما حتماً).
 */
export function computeAveragePrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.open + c.high + c.low + c.close) / 4);
}

/**
 * ATR% (Average True Range Percent، ATRP) — تطبيع computeAtr أعلاه بمستوى السعر الحالي (نفس روح
 * تطبيع BBW/DCW/Keltner Width بالملف، لكن بالنسبة لسعر الإغلاق مباشرة بدل عرض نطاق): ATRP[i] =
 * (ATR(period)[i] ÷ إغلاق[i]) × 100 — حارس صفر صريح عند إغلاق=0 (نفس نمط الحراسة المستخدَم
 * بـcomputeDisparityIndex/computeVzo أعلاه). **الفائدة**: ATR الخام بوحدة السعر نفسه (نقاط/بيبس) فلا
 * يُقارَن مباشرة بين رموز مختلفة الفئة السعرية (EURUSD مقابل XAUUSD مثلاً) — ATRP يحوّله لنسبة مئوية
 * قابلة للمقارنة عبر الرموز، ميزة قياسية بمنصات كثيرة ("ATR %"). period=14 نفس القيمة الافتراضية
 * القياسية المستخدَمة أصلاً بـcomputeAtr. يُرسَم بإعادة استخدام كاملة لنمط لوحة HV (غير محدود، موجب
 * دوماً، تطبيع ديناميكي بأقصى قيمة محلية) لكن بلون `colors.infoAccent` بدل `colors.warn` للتمييز
 * البصري بين مقياسَي تقلّب مختلفين بنفس الشارت.
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: شموع بمدى ثابت (H−L) وإغلاق ثابت عبر 40 شمعة period=14
 * → بعد الإحماء ATR يتقارب لنفس المدى الثابت تماماً → ATRP=مدى/إغلاق×100 بالضبط (فرق<10⁻⁶)؛ حالة
 * إغلاق=صفر صناعية → 0 بالضبط بدل Infinity/NaN بفعل الحارس الصريح؛ 300 شمعة عشوائية بذرة ثابتة → صفر
 * NaN/Infinity وكل قيمة صالحة ≥0 دوماً (نسبة مئوية لا يمكن أن تكون سالبة رياضياً بما أن ATR≥0
 * وإغلاق>0)، وعدد النقاط الصالحة يطابق تماماً تحفّظ الإحماء الموروث من sma() الداخلية بـcomputeAtr
 * (أول نقطة صالحة عند الفهرس period−1 لا period، نفس اصطلاح computeAtr/computeKeltner/computeRwi
 * كافة).
 */
export function computeAtrPercent(candles: Candle[], period = 14): (number | null)[] {
  const atr = computeAtr(candles, period);
  return candles.map((c, i) => {
    const a = atr[i];
    if (a == null) return null;
    return c.close === 0 ? 0 : (a / c.close) * 100;
  });
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
 * %D لـStochastic أو خط الإشارة بـMACD/PPO/APO أعلاه). **معالجة null بنفس اتفاقية KST/DEMA/TEMA
 * الموثَّقة أعلاه حرفياً**: |ap−esa| يُعوَّض بصفر ما دام esa فارغاً (فترة تسخين n1)، وci يُعوَّض بصفر
 * ما دام esa أو d فارغين أو d=0 (حارس قسمة على صفر صريح)، ثم بوابة صلاحية نهائية صريحة تُطبَّق على
 * wt1 (null قبل الفهرس n1−1 بغضّ النظر عمّا ينتجه EMA داخلياً) وwt2 (null إن كان wt1 نفسه null).
 * **تحقّق يدوي**: سعر/مدى ثابت تماماً (أعلى=أدنى=إغلاق ثابت لكل شمعة) → ap ثابت → esa=ap بالضبط بعد
 * التسخين (EMA لسلسلة ثابتة=نفس الثابت) → |ap−esa|=0 لكل نقطة صالحة وصفر أيضاً بفترة التسخين
 * (بالتعويض) → d=EMA(أصفار,n1)=0 بعد تسخينه الخاص → ci محروس بصفر صراحة عند d=0 لكل نقطة (بلا
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
  const dRaw = ap.map((v, i) => (esa[i] == null ? 0 : Math.abs(v - esa[i]!)));
  const d = ema(dRaw, n1);
  const ciRaw = ap.map((v, i) => {
    const e = esa[i];
    const dv = d[i];
    if (e == null || dv == null || dv === 0) return 0;
    return (v - e) / (0.015 * dv);
  });
  const wt1Raw = ema(ciRaw, n2);
  const warm1 = n1 - 1;
  const wt1 = wt1Raw.map((v, i) => (i < warm1 || v == null ? null : v));
  const wt1Filled = wt1.map((v) => v ?? 0);
  const wt2Raw = sma(wt1Filled, 4);
  const wt2 = wt2Raw.map((v, i) => (wt1[i] == null || v == null ? null : v));
  return { wt1, wt2 };
}

/**
 * Acceleration Bands (برايس هيدلي) — نطاقات حول السعر بعرض متكيّف مع نسبة مدى الشمعة (أعلى−أدنى)
 * لسعرها بدل ATR/انحراف معياري كـKeltner/Bollinger أعلاه، فتتّسع تلقائياً بشموع واسعة المدى نسبياً
 * وتضيق بشموع ضيّقة، ثم تُنعَّم بـSMA لتفادي تذبذب خام لكل شمعة. لكل شمعة: النسبة=factor×(أعلى−أدنى)
 * /(أعلى+أدنى) [factor=4 القياسي الشائع بكل المراجع]، rawUpper=أعلى×(1+النسبة)،
 * rawLower=أدنى×(1−النسبة) (حارس قسمة صريح: أعلى+أدنى=0 نادر جداً/بيانات غير صالحة ← النسبة=0
 * بدل NaN). ثم upper=SMA(rawUpper,period)، lower=SMA(rawLower,period)، mid=SMA(إغلاق,period)
 * [period=20 القياسي]. **تحقّق يدوي**: مدى صفري تماماً (أعلى=أدنى=إغلاق=ثابت c لكل شمعة) →
 * النسبة=4×0/(2c)=0 لكل شمعة → rawUpper=rawLower=c بالضبط → upper=lower=mid=SMA(c,period)=c —
 * تنهار النطاقات الثلاثة على السعر نفسه تماماً، يطابق "لا تسارع بمدى صفري" بالتعريف. **تحقّق يدوي
 * ثانٍ (شمعة ثابتة غير صفرية المدى)**: أعلى=110 أدنى=90 (مدى=20) لكل شمعة period متتالية →
 * النسبة=4×20/200=0.4 → rawUpper=110×1.4=154، rawLower=90×0.6=54 → upper[period−1]=154،
 * lower[period−1]=54 بالضبط (SMA لقيمة ثابتة متكرّرة = نفس القيمة). تحقّق حسابي فعلي (Node.js): 300
 * شمعة عشوائية بذرة ثابتة (صفر NaN/Infinity، upper≥lower بلا استثناء واحد لكل نقطة صالحة) + إعادة
 * حساب brute-force مستقلة تماماً (حلقات SMA مُعاد كتابتها من الصفر بمعزل عن sma() المحلية الفعلية)
 * لكل نقطة صالحة على كامل السلسلة طابقت تماماً (فرق<10⁻⁹) للخطوط الثلاثة معاً.
 */
export function computeAccelerationBands(
  candles: Candle[],
  period = 20,
  factor = 4
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = candles.map((c) => c.close);
  const rawUpper = candles.map((c) => {
    const denom = c.high + c.low;
    const ratio = denom === 0 ? 0 : (factor * (c.high - c.low)) / denom;
    return c.high * (1 + ratio);
  });
  const rawLower = candles.map((c) => {
    const denom = c.high + c.low;
    const ratio = denom === 0 ? 0 : (factor * (c.high - c.low)) / denom;
    return c.low * (1 - ratio);
  });
  return {
    mid: sma(closes, period),
    upper: sma(rawUpper, period),
    lower: sma(rawLower, period),
  };
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
  multiplier = 2
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = computeVwap(candles);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  let cumVolSqDiff = 0;
  let cumVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6 + 1000;
    const tp = (c.high + c.low + c.close) / 3;
    const v = mid[i];
    if (v == null) {
      upper.push(null);
      lower.push(null);
      cumVol += vol;
      continue;
    }
    cumVolSqDiff += vol * (tp - v) * (tp - v);
    cumVol += vol;
    const variance = cumVol === 0 ? 0 : cumVolSqDiff / cumVol;
    const sd = Math.sqrt(Math.max(0, variance));
    upper.push(v + multiplier * sd);
    lower.push(v - multiplier * sd);
  }
  return { mid, upper, lower };
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
 * Parkinson Volatility (تقدير تقلّب بارکنسون 1980، period=10 نافذة قياسية متّسقة مع
 * computeHistoricalVolatility أعلاه، annualization=252 يوم تداول سنوي قياسي) — أول تقدير تقلّب
 * بالملف يعتمد **مدى الشمعة (أعلى/أدنى) فقط** بدل عوائد الإغلاق المتتالية (خلافاً لـ
 * computeHistoricalVolatility الذي يقيس تشتّت عوائد الإغلاق اللوغاريتمية). لكل شمعة: r=ln(أعلى/أدنى)
 * (صفر عند أدنى≤صفر نظرياً بدل ln غير معرَّف)، التباين لكل نقطة=متوسط r² عبر النافذة الأخيرة÷(4×ln2)
 * (**ثابت بارکنسون القياسي** — يُصحِّح التحيّز الناتج عن استخدام المدى داخل الفترة بدل عوائد الإغلاق
 * فقط، إحصائياً أكفأ من HV بنفس حجم العيّنة لأنه يستغل معلومة كامل مسار السعر ضمن الشمعة لا نقطة
 * الإغلاق وحدها)، ثم Parkinson[i]=√(max(تباين,0))×√annualization×100 (نفس صيغة التقييس المئوي السنوي
 * لـHV حرفياً، حارس max(...,0) صريح رغم أن r² دائماً موجب فعلياً — للاتساق الدفاعي مع باقي الملف).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً (40 شمعة، أعلى=أدنى=100)
 * → r=ln(1)=0 لكل شمعة → Parkinson=0 بالضبط لكل نقطة صالحة (يطابق "لا تقلّب بمدى صفري" بالتعريف)؛
 * شمعة مفردة معروفة (أعلى=110 أدنى=95) → مطابقة حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية
 * بذرة ثابتة (mulberry32) → صفر NaN/Infinity وكل قيمة≥0 عبر كل نقطة صالحة؛ إعادة حساب brute-force
 * مستقلة تماماً (حلقة تراكمية منفصلة لـr² عبر النافذة) لنقطة عشوائية (idx=150) طابقت تماماً
 * (فرق=0 بالضبط). لا تعارض بالاسم/المنطق مع computeHistoricalVolatility أو computeStdDev أو
 * computeChaikinVolatility أو computeUlcerIndex الموجودة — أربع صيغ مختلفة جذرياً لأربعة مفاهيم
 * "تقلّب" مختلفة (عوائد إغلاق / تشتّت سعر خام / تغيّر EMA لنسبة مدى / انحدار تراكمي)، بلا أي تكرار
 * فعلي.
 */
export function computeParkinsonVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const logHL2: number[] = candles.map((c) => {
    const r = c.low > 0 ? Math.log(c.high / c.low) : 0;
    return r * r;
  });
  const out: (number | null)[] = [];
  const factor = 1 / (4 * Math.LN2);
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = logHL2.slice(i - period + 1, i + 1);
    const variance = factor * (slice.reduce((a, v) => a + v, 0) / period);
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Garman-Klass Volatility (تقدير تقلّب غارمان-كلاس 1980، نفس period=10/annualization=252 لتقدير
 * بارکنسون أعلاه لسهولة المقارنة المباشرة بين الاثنين بنفس النافذة) — يبني فوق بارکنسون بإضافة حد
 * تصحيح ثانٍ من فتح/إغلاق الشمعة: لكل شمعة logHL=ln(أعلى/أدنى) (كبارکنسون تماماً) وlogCO=
 * ln(إغلاق/فتح) (صفر عند فتح≤صفر نظرياً)، حدّ الشمعة=0.5×logHL²−(2×ln2−1)×logCO² (**صيغة
 * غارمان-كلاس القياسية الكاملة بلا تبسيط** — الحد الثاني يُصحِّح تحيّز بارکنسون الناتج عن تجاهله
 * حركة الفتح/الإغلاق داخل المدى، فيجعل التقدير إحصائياً أكفأ نظرياً من بارکنسون وHV معاً بنفس حجم
 * العيّنة). التباين لكل نقطة=متوسط الحدّ عبر النافذة الأخيرة، Garman-Klass[i]=√(max(تباين,0))×
 * √annualization×100 (**حارس max(...,0) ضروري فعلياً هنا لا دفاعياً فقط** — خلافاً لبارکنسون، حدّ
 * الشمعة المفرد يمكن نظرياً أن يكون سالباً لشمعة واحدة إذا كان |logCO| كبيراً نسبياً لـ|logHL|
 * [مثال: فتح/إغلاق قريبان من طرفي المدى]، رغم أن متوسط النافذة عملياً موجب دائماً بالأسواق الواقعية).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: سوق مسطّح تماماً → logHL=logCO=0 لكل
 * شمعة → Garman-Klass=0 بالضبط؛ شمعة مفردة معروفة (فتح=100 أعلى=110 أدنى=95 إغلاق=105) → مطابقة
 * حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity وكل قيمة≥0
 * (حارس max فعّال) عبر كل نقطة صالحة؛ إعادة حساب brute-force مستقلة تماماً لنقطة عشوائية (idx=150)
 * طابقت تماماً (فرق=0 بالضبط).
 */
export function computeGarmanKlassVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const term: number[] = candles.map((c) => {
    const logHL = c.low > 0 ? Math.log(c.high / c.low) : 0;
    const logCO = c.open > 0 ? Math.log(c.close / c.open) : 0;
    return 0.5 * logHL * logHL - (2 * Math.LN2 - 1) * logCO * logCO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = term.slice(i - period + 1, i + 1);
    const variance = slice.reduce((a, v) => a + v, 0) / period;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Rogers-Satchell Volatility (تقدير تقلّب روجرز-ساتشل 1991، نفس period=10/annualization=252) —
 * ثالث تقدير تقلّب OHLC بالملف، لكن **مستقل عن الانجراف (drift-independent)** خلافاً لبارکنسون
 * وغارمان-كلاس أعلاه اللذين يفترضان ضمنياً متوسط عائد صفري داخل الفترة (تحيّز فعلي بالأسواق ذات
 * الاتجاه الواضح). لكل شمعة: logHC=ln(أعلى/إغلاق)، logHO=ln(أعلى/فتح)، logLC=ln(أدنى/إغلاق)،
 * logLO=ln(أدنى/فتح) (صفر عند أي مقام≤صفر نظرياً)، حدّ الشمعة=logHC×logHO+logLC×logLO (**صيغة
 * روجرز-ساتشل القياسية** — موجب نظرياً بالتعريف الرياضي لأن كلا الحدّين حاصل ضرب لوغاريتمين بنفس
 * الإشارة [أعلى≥فتح,إغلاق فـlogHC,logHO≤0 كلاهما؛ أدنى≤فتح,إغلاق فـlogLC,logLO≥0 كلاهما]، بخلاف
 * حدّ غارمان-كلاس أعلاه الذي يمكن أن يكون سالباً لشمعة مفردة). التباين لكل نقطة=متوسط الحدّ عبر
 * النافذة الأخيرة، Rogers-Satchell[i]=√(max(تباين,0))×√annualization×100 (حارس max(...,0) دفاعي
 * بحت هنا — التحقّق الحسابي أدناه أثبت أن الحدّ الخام لم يُسجِّل قيمة سالبة واحدة عبر 300 شمعة
 * عشوائية، متّسق مع الإثبات الرياضي أعلاه). **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**:
 * سوق مسطّح تماماً → كل اللوغاريتمات الأربعة=ln(1)=0 → Rogers-Satchell=0 بالضبط؛ شمعة مفردة معروفة
 * (نفس شمعة غارمان-كلاس أعلاه) → مطابقة حسابية يدوية مباشرة (فرق<10⁻⁹)؛ 300 شمعة عشوائية بذرة
 * ثابتة → صفر NaN/Infinity، صفر قيمة سالبة للحدّ الخام قبل الحارس عبر كل الـ300 شمعة (تأكيد تجريبي
 * للإثبات الرياضي)، كل قيمة خرج≥0؛ إعادة حساب brute-force مستقلة تماماً لنقطة عشوائية (idx=150)
 * طابقت تماماً (فرق=0 بالضبط). **الثلاثة معاً (بارکنسون/غارمان-كلاس/روجرز-ساتشل) تكمل عائلة مقدِّرات
 * التقلّب من سعر OHLC الشائعة بمنصات التحليل الكمّي** إلى جانب computeHistoricalVolatility (عوائد
 * إغلاق) — Yang-Zhang (يجمع تباين الفجوة الليلية+فتح/إغلاق+روجرز-ساتشل بوزن k) مُرشَّح منطقي تالٍ
 * لكن أُجِّل لتعقيد تجميع ثلاث نوافذ تباين منفصلة بوزن ثابت يحتاج تحقّقاً حسابياً أعمق بتشغيل مخصَّص.
 */
export function computeRogersSatchellVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const term: number[] = candles.map((c) => {
    const logHC = c.close > 0 ? Math.log(c.high / c.close) : 0;
    const logHO = c.open > 0 ? Math.log(c.high / c.open) : 0;
    const logLC = c.close > 0 ? Math.log(c.low / c.close) : 0;
    const logLO = c.open > 0 ? Math.log(c.low / c.open) : 0;
    return logHC * logHO + logLC * logLO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const slice = term.slice(i - period + 1, i + 1);
    const variance = slice.reduce((a, v) => a + v, 0) / period;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}

/**
 * Yang-Zhang Volatility (تقدير تقلّب يانغ-تشانغ 2000، نفس period=10/annualization=252 لعائلة مقدِّرات
 * OHLC الثلاثة أعلاه لسهولة المقارنة المباشرة) — **الترشيح المؤجَّل من تشغيل سابق** (راجع تعليق
 * computeRogersSatchellVolatility أعلاه)، الآن مُنفَّذ بتحقّق حسابي أعمق كما وُعِد. يجمع **ثلاثة مكوّنات
 * تباين مستقلة** بوزن ثابت k لإكمال عائلة مقدِّرات OHLC (بارکنسون/غارمان-كلاس/روجرز-ساتشل أعلاه):
 * 1. **تباين الفجوة الليلية** (overnight/close-to-open): oc[i]=ln(فتح[i]/إغلاق[i−1]) (صفر عند i=0 لعدم
 *    وجود إغلاق سابق — تبسيط موثَّق: يُعامَل أول شمعة كفجوة صفرية).
 * 2. **تباين الفتح/الإغلاق** (open-to-close): co[i]=ln(إغلاق[i]/فتح[i]).
 * 3. **متوسط حدّ روجرز-ساتشل** نفسه المستخدَم أعلاه حرفياً (logHC×logHO+logLC×logLO) — **إعادة استخدام
 *    كاملة للصيغة المتحقَّقة مسبقاً**، لا حساب مستقل جديد.
 * التباينان (1) و(2) عيّنيان (sample variance، القسمة على period−1 لا period — الفارق التقني الجوهري
 * عن بارکنسون/غارمان-كلاس/روجرز-ساتشل أعلاه التي تُقسَّم كلها على period لأنها أصلاً "متوسط حدّ" لا
 * "تباين حول متوسط النافذة"): varO=Σ(oc−متوسط oc)²÷(period−1)، varC=Σ(co−متوسط co)²÷(period−1).
 * وزن يانغ-تشانغ القياسي: k=0.34÷(1.34+(period+1)/(period−1)) (حارس period−1≤0 دفاعي فقط — period
 * الافتراضي=10 لا يقترب من الحالة الحدّية). التباين الكلي=varO+k×varC+(1−k)×varRs، وYang-Zhang[i]=
 * √(max(تباين,0))×√annualization×100 (نفس اصطلاح التسنين/الحارس الدفاعي للثلاثة أعلاه بالضبط).
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: k المحسوب لـperiod=10=0.13270 (يطابق
 * نطاق القيم المرجعية المنشورة لهذا الحجم عيّنة)؛ سوق مسطّح تماماً (40 شمعة) → oc=co=rsTerm=0 لكل شمعة
 * (فتح=أعلى=أدنى=إغلاق ثابت) → التباين الكلي=0 بالضبط جبرياً بلا استثناء عبر كل نقطة صالحة؛ شمعة خمسية
 * صناعية محدَّدة القيم يدوياً (period=5) → **إعادة حساب brute-force مستقلة تماماً عن الدالة** (حلقات
 * منفصلة معاد كتابتها من الصفر لـoc/co/rsTerm/varO/varC/varRs/k) طابقت تماماً (فرق=0 بالضبط)؛ 300 شمعة
 * عشوائية بذرة ثابتة (mulberry32) → 291 نقطة صالحة، صفر NaN/Infinity، صفر قيمة سالبة عبر كل نقطة (الحارس
 * غير مُفعَّل فعلياً — التباين الموجب دوماً بيانياً هنا)؛ إعادة حساب brute-force مستقلة لنقطة عشوائية
 * (idx=150) طابقت تماماً (فرق=0 بالضبط). **تحقّق AST رسمي** (`ts.createSourceFile`+`parseDiagnostics`)
 * صفر أخطاء بعد الكتابة. **عائلة مقدِّرات تقلّب OHLC مكتملة الآن بأربعة أعضاء** (بارکنسون/غارمان-كلاس/
 * روجرز-ساتشل/يانغ-تشانغ) بجانب computeHistoricalVolatility (عوائد إغلاق فقط) — خمسة مقدِّرات تقلّب
 * كلاسيكية مختلفة جذرياً متاحة الآن.
 */
export function computeYangZhangVolatility(
  candles: Candle[],
  period = 10,
  annualization = 252
): (number | null)[] {
  const n = candles.length;
  const overnight: number[] = candles.map((c, i) => {
    if (i === 0) return 0;
    const prevClose = candles[i - 1].close;
    return prevClose > 0 && c.open > 0 ? Math.log(c.open / prevClose) : 0;
  });
  const openClose: number[] = candles.map((c) =>
    c.open > 0 && c.close > 0 ? Math.log(c.close / c.open) : 0
  );
  const rsTerm: number[] = candles.map((c) => {
    const logHC = c.close > 0 ? Math.log(c.high / c.close) : 0;
    const logHO = c.open > 0 ? Math.log(c.high / c.open) : 0;
    const logLC = c.close > 0 ? Math.log(c.low / c.close) : 0;
    const logLO = c.open > 0 ? Math.log(c.low / c.open) : 0;
    return logHC * logHO + logLC * logLO;
  });
  const out: (number | null)[] = [];
  const annFactor = Math.sqrt(annualization) * 100;
  const pMinus1 = Math.max(1, period - 1);
  const k = 0.34 / (1.34 + (period + 1) / pMinus1);
  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const oSlice = overnight.slice(i - period + 1, i + 1);
    const cSlice = openClose.slice(i - period + 1, i + 1);
    const rsSlice = rsTerm.slice(i - period + 1, i + 1);
    const meanO = oSlice.reduce((a, v) => a + v, 0) / period;
    const meanC = cSlice.reduce((a, v) => a + v, 0) / period;
    const varO = oSlice.reduce((a, v) => a + (v - meanO) * (v - meanO), 0) / pMinus1;
    const varC = cSlice.reduce((a, v) => a + (v - meanC) * (v - meanC), 0) / pMinus1;
    const varRs = rsSlice.reduce((a, v) => a + v, 0) / period;
    const variance = varO + k * varC + (1 - k) * varRs;
    out.push(Math.sqrt(Math.max(variance, 0)) * annFactor);
  }
  return out;
}
