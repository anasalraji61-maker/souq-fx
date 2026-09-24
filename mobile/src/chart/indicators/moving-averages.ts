/** دوال المتوسطات المتحركة الداخلية المشتركة (SMA/WMA/EMA/DEMA/TEMA/HMA/SMMA) — كانت خاصة
 * (غير مُصدَّرة) داخل math.ts الأصلي، تستخدمها عدة عائلات مؤشرات؛ صُدِّرت هنا لأن الاستخدام صار عبر ملفات. */

/**
 * sma/wma/ema تقبل `null` (فراغ إحماء طبقة سابقة): نافذة فيها null ⇒ null، والـEMA تبدأ ببذرة SMA
 * لأول `period` قيمة **حقيقية**. كانت الطبقات تُعوَّض بصفر قبل التمرير (`v ?? 0`) فتبدأ الطبقة
 * الثانية من متوسط نافذة نصفها أصفار: DEMA20 على سعر ثابت 1.2345 تصل 2.41 وتسحق مقياس السعر،
 * وإشارة MACD تبدأ قرب الصفر فتصنع تقاطعاً وهمياً عند يسار الشارت. لقيم كلّها أرقام: النتيجة نفسها.
 */
export function sma(values: readonly (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  let gaps = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) gaps++;
    else sum += v;
    if (i >= period) {
      const old = values[i - period];
      if (old == null) gaps--;
      else sum -= old;
    }
    out.push(i >= period - 1 && gaps === 0 ? sum / period : null);
  }
  return out;
}

export function wma(values: readonly (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    let gap = false;
    for (let w = 0; w < period; w++) {
      const v = values[i - period + 1 + w];
      if (v == null) {
        gap = true;
        break;
      }
      sum += v * (w + 1);
    }
    out.push(gap ? null : sum / denom);
  }
  return out;
}

export function ema(values: readonly (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let seedSum = 0;
  let seedN = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      // فراغ قبل اكتمال البذرة يعيدها من الصفر؛ بعدها يُترك (null) ويستمرّ التنعيم من آخر قيمة.
      if (prev == null) {
        seedSum = 0;
        seedN = 0;
      }
      out.push(null);
      continue;
    }
    if (prev == null) {
      seedSum += v;
      seedN++;
      if (seedN < period) {
        out.push(null);
        continue;
      }
      prev = seedSum / period;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

/** DEMA — الطبقة الثانية تبدأ من أول قيمة حقيقية للأولى (ema تتخطّى فراغ الإحماء). */
export function dema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e2 = ema(e1, period);
  return values.map((_, i) => (e1[i] != null && e2[i] != null ? 2 * e1[i]! - e2[i]! : null));
}

/** TEMA — نفس مبدأ dema() بتكرار إضافي (طبقة ema ثالثة) لتقليل التأخر أكثر. */
export function tema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e2 = ema(e1, period);
  const e3 = ema(e2, period);
  return values.map((_, i) =>
    e1[i] != null && e2[i] != null && e3[i] != null ? 3 * e1[i]! - 3 * e2[i]! + e3[i]! : null
  );
}

/**
 * HMA (Hull Moving Average) — wma(2×wma(القيم، period/2) − wma(القيم، period)، sqrt(period))؛
 * نفس فكرة dema/tema (الطبقة التالية تتخطّى فراغ إحماء السابقة، ثم بوابة صلاحية بالقيمة الأصلية) لكن
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
  const hmaRaw = wma(raw, sqrtPeriod);
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
