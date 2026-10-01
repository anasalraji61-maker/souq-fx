import type { Candle } from '../api';

export type ShadowCandleDraw = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** مركز الشمعة أفقياً 0..1 داخل نافذة العرض */
  xRatio: number;
  /** عرض الشمعة كنسبة من عرض الشارت */
  widthRatio: number;
  layer: number;
};

function toSeconds(t: number): number {
  return t > 1e12 ? t / 1000 : t;
}

function pickNearest(
  secs: { c: Candle; t: number }[],
  pt: number,
  cursorRef: { i: number }
): { c: Candle; t: number } | null {
  if (!secs.length) return null;
  let cursor = cursorRef.i;
  while (cursor + 1 < secs.length && secs[cursor + 1]!.t <= pt) cursor += 1;
  cursorRef.i = cursor;
  let best = secs[cursor]!;
  if (best.t > pt && cursor > 0) {
    const prev = secs[cursor - 1]!;
    best = Math.abs(prev.t - pt) <= Math.abs(best.t - pt) ? prev : best;
  }
  return best;
}

function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  const step = (items.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(items[Math.round(i * step)]!);
  }
  return out;
}

/**
 * يربط شموع الظل بنافذة الأساسي:
 * - ظل أعلى إطاراً: شمعة واحدة لكل مجموعة مشتركة.
 * - ظل أدق (مثل 1H فوق D): عدة شموع داخل كل عمود يومي — فقط إن وُجدت بيانات في نفس الفترة.
 */
export function mapShadowCandles(
  primary: Candle[],
  secondary: Candle[],
  layer = 0
): ShadowCandleDraw[] {
  if (!primary.length || !secondary.length) return [];

  const secs = secondary
    .map((c) => ({ c, t: toSeconds(c.time) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);
  if (!secs.length) return [];

  const n = primary.length;
  const layerNudge = (layer - 1) * 0.01;
  const cursorRef = { i: 0 };
  const matched: ({ c: Candle; t: number } | null)[] = new Array(n);
  for (let i = 0; i < n; i++) {
    matched[i] = pickNearest(secs, toSeconds(primary[i].time), cursorRef);
  }
  let unique = 0;
  for (let i = 0; i < n; ) {
    const key = matched[i]?.t;
    let j = i + 1;
    while (j < n && matched[j]?.t === key) j += 1;
    unique += 1;
    i = j;
  }
  const avgSpan = n / Math.max(1, unique);
  const out: ShadowCandleDraw[] = [];

  // وضع HTF: شمعة ظل رفيعة في منتصف كل فترة (ليست مستطيلاً عريضاً)
  if (avgSpan >= 1.55) {
    const thinRatio = Math.max(0.004, (1 / n) * 0.55);
    let i = 0;
    while (i < n) {
      const key = matched[i]?.t;
      let j = i + 1;
      while (j < n && matched[j]?.t === key) j += 1;
      const hit = matched[i];
      if (!hit) {
        i = j;
        continue;
      }
      const centerIdx = (i + j - 1) / 2 + 0.5;
      const widthRatio = thinRatio;
      const xRatio = Math.max(
        widthRatio / 2,
        Math.min(1 - widthRatio / 2, centerIdx / n + layerNudge)
      );
      const c = hit.c;
      out.push({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        xRatio,
        widthRatio,
        layer,
      });
      i = j;
    }
    return out;
  }

  // وضع LTF: شموع الظل داخل نافذة كل أساسي (يومي ← ساعات)
  const maxPerBar = 6;
  const secLo = secs[0]!.t;
  const secHi = secs[secs.length - 1]!.t;

  for (let i = 0; i < n; i++) {
    const t0 = toSeconds(primary[i].time);
    const t1 =
      i + 1 < n
        ? toSeconds(primary[i + 1].time)
        : t0 + Math.max(60, Math.abs(t0 - (i > 0 ? toSeconds(primary[i - 1].time) : t0 - 60)));
    const lo = Math.min(t0, t1);
    const hi = Math.max(t0, t1);

    // لا ترسم ظلاً خارج تغطية السلسلة الثانوية
    if (hi < secLo || lo > secHi) continue;

    // نصف مفتوح [lo, hi): شمعة الثانوية عند `hi` هي أوّل شمعة الأساسي التالي — `< hi + 1` كان يرسمها في الاثنين
    // (خمس شموع 15m داخل كل ساعة، والخامسة مكرّرة في الساعة التالية).
    let inBar = secs.filter((s) => s.t >= lo && s.t < hi);
    if (!inBar.length) {
      // شمعة واحدة ممثلة إن وُجدت داخل تمديد بسيط
      const pad = Math.max(3600, (hi - lo) * 0.15);
      inBar = secs.filter((s) => s.t >= lo - pad && s.t <= hi + pad);
      if (inBar.length > 1) {
        // أقرب للمركز
        const mid = (lo + hi) / 2;
        inBar.sort((a, b) => Math.abs(a.t - mid) - Math.abs(b.t - mid));
        inBar = [inBar[0]!];
      }
    }
    if (!inBar.length) continue;

    inBar = downsample(inBar, maxPerBar);
    const slot = 1 / n;
    // اترك يسار العمود للظل بفجوة، ويمين العمود للأساسي
    const band = slot * 0.34;
    const each = band / inBar.length;
    const start = i / n + slot * 0.02;

    for (let k = 0; k < inBar.length; k++) {
      const c = inBar[k]!.c;
      const widthRatio = Math.max(0.007, each * 0.78);
      const xRatio = Math.max(
        widthRatio / 2,
        Math.min(1 - widthRatio / 2, start + (k + 0.5) * each + layerNudge)
      );
      out.push({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        xRatio,
        widthRatio,
        layer,
      });
    }
  }

  if (out.length > 1200) {
    const step = Math.ceil(out.length / 1200);
    return out.filter((_, idx) => idx % step === 0);
  }
  if (out.length > 0) return out;

  // احتياط: إن لم يتقاطع الزمن، صفّ نهاية السلاسل معاً حتى يبقى الظل مرئياً
  const pLast = toSeconds(primary[n - 1]!.time);
  const sLast = secs[secs.length - 1]!.t;
  const drift = pLast - sLast;
  const maxDraw = Math.min(n, 120);
  for (let k = 0; k < maxDraw; k++) {
    const pi = n - maxDraw + k;
    const target = toSeconds(primary[pi]!.time) - drift;
    const hit = pickNearest(secs, target, { i: 0 });
    if (!hit) continue;
    const widthRatio = Math.max(0.006, (1 / n) * 0.45);
    const xRatio = Math.max(
      widthRatio / 2,
      Math.min(1 - widthRatio / 2, (pi + 0.5) / n + layerNudge)
    );
    const c = hit.c;
    out.push({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      xRatio,
      widthRatio,
      layer,
    });
  }
  return out;
}
