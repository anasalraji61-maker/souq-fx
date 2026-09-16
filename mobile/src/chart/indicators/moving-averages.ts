/** دوال المتوسطات المتحركة الداخلية المشتركة (SMA/WMA/EMA/DEMA/TEMA/HMA/SMMA) — كانت خاصة
 * (غير مُصدَّرة) داخل math.ts الأصلي، تستخدمها عدة عائلات مؤشرات؛ صُدِّرت هنا لأن الاستخدام صار عبر ملفات. */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function wma(values: number[], period: number): (number | null)[] {
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

export function ema(values: number[], period: number): (number | null)[] {
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
export function dema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e1Filled = e1.map((v) => v ?? 0);
  const e2 = ema(e1Filled, period);
  return values.map((_, i) => (e1[i] != null && e2[i] != null ? 2 * e1[i]! - e2[i]! : null));
}

/** TEMA — نفس مبدأ dema() بتكرار إضافي (طبقة ema ثالثة) لتقليل التأخر أكثر. */
export function tema(values: number[], period: number): (number | null)[] {
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
export function hma(values: number[], period: number): (number | null)[] {
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
export function smma(values: number[], period: number): (number | null)[] {
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
