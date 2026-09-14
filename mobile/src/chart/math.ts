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

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
