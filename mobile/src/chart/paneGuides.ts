/**
 * خطوط المرجع وقراءة القيمة الحالية للوحات المؤشّرات المحصورة المدى — دوال خالصة.
 *
 * السبب: بعد إصلاح محاذاة اللوحات صار الشريط يتحرّك فعلاً بقيمة المؤشّر، لكن المتداول
 * ما زال بلا مرجعَين أساسيَّين:
 * 1) **خطوط العتبات**: RSI بلا 30/70 ليس RSI — «تشبّع شرائي» بلا الخط الذي يُقاس عليه
 *    مجرّد تغيّر لون. وكذلك 20/80 للستوكاستيك وMFI، و25 لـADX، و‎−20/−80‎ لـ%R.
 * 2) **الرقم نفسه**: اللوحة لا تذكر قيمة الشمعة الأخيرة إطلاقاً، فلا يفرّق المتداول
 *    بين RSI عند 62 و68 وكلاهما «بين الخطين».
 *
 * كل اللوحات هنا محصورة بمدى ثابت معلوم (0..100 أو ‎−100..0‎)، وتستعمل جميعها نفس
 * تعيين المواضع الموجود بالرسم: `top = ((max − v) / (max − min)) × innerH`.
 * لوحات المقياس الديناميكي (CCI، ROC، ATR…) خارج هذا الملف عمداً: مقياسها يتغيّر مع
 * النافذة فلا يصحّ لها جدول عتبات ثابت.
 */

export type PaneGuideKind = 'extreme' | 'mid';

export interface PaneGuideLevel {
  v: number;
  kind: PaneGuideKind;
}

export interface PaneGuideSpec {
  min: number;
  max: number;
  levels: readonly PaneGuideLevel[];
}

/** أقلّ ارتفاع مساحة رسم تُرسم عنده خطوط أصلاً (أدنى منه واللوحة شريحة رفيعة). */
export const GUIDES_MIN_INNER_H = 18;
/** أقلّ ارتفاع تظهر عنده الخطوط الوسطى (RSI 50، ADX 25) دون ازدحام. */
export const GUIDES_MID_MIN_INNER_H = 44;
/** أقلّ ارتفاع تُكتب عنده أرقام العتبات بجانب الخطوط. */
export const GUIDES_LABEL_MIN_INNER_H = 34;

/** العتبات القياسية للوحات التي يستعملها المتداول الفردي فعلاً. */
export const PANE_GUIDES: Readonly<Record<string, PaneGuideSpec>> = {
  rsi: {
    min: 0,
    max: 100,
    levels: [
      { v: 70, kind: 'extreme' },
      { v: 50, kind: 'mid' },
      { v: 30, kind: 'extreme' },
    ],
  },
  stoch: {
    min: 0,
    max: 100,
    levels: [
      { v: 80, kind: 'extreme' },
      { v: 20, kind: 'extreme' },
    ],
  },
  mfi: {
    min: 0,
    max: 100,
    levels: [
      { v: 80, kind: 'extreme' },
      { v: 20, kind: 'extreme' },
    ],
  },
  /** ADX: 25 عتبة «سوق ذات اتجاه» — خطّ واحد لا حدّان. */
  adx: { min: 0, max: 100, levels: [{ v: 25, kind: 'mid' }] },
  /** ويليامز %R مدىً سالب: ‎−20‎ تشبّع شرائي و‎−80‎ تشبّع بيعي. */
  willr: {
    min: -100,
    max: 0,
    levels: [
      { v: -20, kind: 'extreme' },
      { v: -80, kind: 'extreme' },
    ],
  },
};

export interface PlacedGuide {
  v: number;
  kind: PaneGuideKind;
  /** موضع الخط (y) داخل مساحة الرسم. */
  top: number;
  /** رقم العتبة إن اتّسع الارتفاع لكتابته، وإلا null. */
  label: string | null;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * يحوّل عتبات لوحة إلى مواضع بكسل داخل مساحة رسم بارتفاع `innerH`.
 * يعيد [] للوحة بلا عتبات معروفة أو لارتفاع لا يتّسع.
 */
export function placeGuides(paneId: string, innerH: number): PlacedGuide[] {
  const spec = PANE_GUIDES[paneId];
  if (!spec) return [];
  if (!Number.isFinite(innerH) || innerH < GUIDES_MIN_INNER_H) return [];
  const span = spec.max - spec.min;
  if (!(span > 0)) return [];
  const withLabels = innerH >= GUIDES_LABEL_MIN_INNER_H;
  const withMid = innerH >= GUIDES_MID_MIN_INNER_H;
  const out: PlacedGuide[] = [];
  for (const lv of spec.levels) {
    if (lv.kind === 'mid' && !withMid) continue;
    out.push({
      v: lv.v,
      kind: lv.kind,
      top: clamp(((spec.max - lv.v) / span) * innerH, 0, Math.max(0, innerH - 1)),
      label: withLabels ? String(lv.v) : null,
    });
  }
  return out;
}

/** قيمة آخر شمعة صالحة بالسلسلة (وهي ما يقرأه المتداول)، أو null. */
export function latestPaneValue(values: readonly (number | null | undefined)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/** صياغة مختصرة تتّسع بعرض 36px: منزلة عشرية واحدة، وبلا عشرية عند ≥100. */
export function formatPaneValue(v: number | null): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(1);
}

/**
 * حالة القيمة مقابل عتبات اللوحة — لتلوين الرقم وحده (لا لتغيير الرسم):
 * 'high' فوق العتبة العليا، 'low' تحت السفلى، وإلا 'mid'.
 * لوحة بعتبة واحدة (ADX): فوقها 'high'، وإلا 'mid' — لا 'low' لأن ADX منخفض ليس إشارة عكسية.
 */
export function paneValueState(paneId: string, v: number | null): 'high' | 'low' | 'mid' {
  const spec = PANE_GUIDES[paneId];
  if (!spec || v == null || !Number.isFinite(v)) return 'mid';
  const ext = spec.levels.filter((l) => l.kind === 'extreme').map((l) => l.v);
  if (ext.length >= 2) {
    const hi = Math.max(...ext);
    const lo = Math.min(...ext);
    if (v > hi) return 'high';
    if (v < lo) return 'low';
    return 'mid';
  }
  const only = spec.levels[0];
  if (only && v > only.v) return 'high';
  return 'mid';
}
