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

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
