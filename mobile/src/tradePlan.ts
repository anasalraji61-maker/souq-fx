/**
 * وضوح خطة الصفقة (دخول/وقف/هدف) — رياضيات صرفة قابلة للاختبار بـtsx.
 *
 * - يتحقق أن المستويات منسجمة مع الاتجاه: شراء ⇒ وقف < دخول < هدف؛ بيع ⇒ هدف < دخول < وقف.
 *   خطة معكوسة (وقف فوق الدخول بصفقة شراء) خطأ شائع لدى المبتدئ ويجب أن يُمنع قبل النشر.
 * - مسافات بالـpip حين يُعرف حجم الـpip (فوركس/ذهب/فضة عبر instrumentSpec)، وإلا بفرق السعر فقط.
 * - R:R = المكسب المحتمل ÷ المخاطرة.
 * - وقف أقرب من 1 pip للدخول (أضيق من أي سبريد تجزئة) خطأ كتابة شبه مؤكد: كان يُعرض «0 pip · R:R 1:5000».
 */
import { instrumentSpec } from './positionSize';

export type TradeSide = 'buy' | 'sell';

export type PlanIssue = 'invalid' | 'slWrongSide' | 'tpWrongSide' | 'slTooClose';

export type TradePlan = {
  ok: boolean;
  issue: PlanIssue | null;
  riskDist: number;
  rewardDist: number;
  /** null حين لا يُعرف حجم الـpip للرمز (مؤشرات/عملات رقمية…). */
  riskPips: number | null;
  rewardPips: number | null;
  /** المكسب ÷ المخاطرة؛ null إن لم تكن الخطة صالحة. */
  rr: number | null;
};

const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * نسبة مسافتين سعريتين **منظَّفةً من ضجيج الفاصلة العائمة** (دقّة 1e-9، أدقّ بكثير من أي نسبة
 * تعني شيئاً). طرح الأسعار لا يُنتج المسافة الدقيقة: وقف 20 pip وهدف 20 pip على USDJPY
 * (157.40/157.20/157.60) يعطي R:R = 0.99999999999986 — فتقول اللوحة «⚠ الربح المحتمل أقل من
 * المخاطرة» عن خطة 1:1 تماماً. وهدف 45 pip لوقف 20 (2.25 بالضبط) كان يخرج «1:2.2» على EURUSD
 * و«1:2.3» على الذهب: الضجيج هو الذي يختار جهة التقريب لا الرقم.
 */
const cleanRatio = (num: number, den: number): number => Math.round((num / den) * 1e9) / 1e9;

/**
 * تقريب لمنزلة واحدة **متماثل حول الصفر** (النصف يبتعد عن الصفر بالإشارتين). `Math.round` يرفع
 * النصف نحو +∞: ‎+1.25R‎ تصير +1.3R و‎−1.25R‎ تصير −1.2R — فالخسارة تُكتب أصغر من الربح المماثل
 * بالحجم، ويميل متوسط الـR بالدفتر لصالح المتداول بلا حق. ولا «−0» (يُطبع صفراً بلا إشارة).
 */
const round1Sym = (v: number): number => {
  const r = Math.round(Math.abs(v) * 10) / 10;
  return v < 0 ? -r || 0 : r;
};

export function analyzePlan(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl: number;
  tp: number;
}): TradePlan {
  const { side, entry, sl, tp } = input;
  const bad: TradePlan = {
    ok: false,
    issue: 'invalid',
    riskDist: 0,
    rewardDist: 0,
    riskPips: null,
    rewardPips: null,
    rr: null,
  };
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(tp)) return bad;
  const buy = side === 'buy';
  const riskDist = buy ? entry - sl : sl - entry;
  const rewardDist = buy ? tp - entry : entry - tp;
  const pip = instrumentSpec(input.symbol)?.pipSize ?? null;
  const toPips = (d: number) => (pip ? Math.round((d / pip) * 10) / 10 : null);
  const base = {
    riskDist,
    rewardDist,
    riskPips: toPips(riskDist),
    rewardPips: toPips(rewardDist),
  };
  if (riskDist <= 0) return { ...base, ok: false, issue: 'slWrongSide', rr: null };
  if (rewardDist <= 0) return { ...base, ok: false, issue: 'tpWrongSide', rr: null };
  // هامش نسبي صغير: 1.0851 − 1.0850 بالفاصلة العائمة = 0.0000999… ويجب أن يُعدّ 1 pip كاملاً
  if (pip && riskDist < pip * (1 - 1e-6)) return { ...base, ok: false, issue: 'slTooClose', rr: null };
  return { ...base, ok: true, issue: null, rr: cleanRatio(rewardDist, riskDist) };
}

/** "1:2.0" — منزلة عشرية واحدة تكفي للقرار، ونقرّب لا نقصّ. */
export function formatRR(rr: number | null): string {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return '—';
  return `1:${(Math.round(rr * 10) / 10).toFixed(1)}`;
}

/** 25 → "25"، 12.5 → "12.5" (pip واحد عشري كحد أقصى). */
export function formatPips(p: number | null): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

/**
 * فحص جهة الوقف/الهدف حين يُعطى أحدهما فقط (دفتر الصفقات: كلاهما اختياري).
 * null = لا مشكلة (أو لا شيء لفحصه). الأولوية لخطأ الوقف لأنه الأخطر.
 */
export function levelSideIssue(input: {
  side: TradeSide;
  entry: number;
  sl?: number | null;
  tp?: number | null;
}): PlanIssue | null {
  const { side, entry, sl, tp } = input;
  if (!finitePos(entry)) return null;
  const buy = side === 'buy';
  if (finitePos(sl) && (buy ? sl >= entry : sl <= entry)) return 'slWrongSide';
  if (finitePos(tp) && (buy ? tp <= entry : tp >= entry)) return 'tpWrongSide';
  return null;
}

/**
 * النتيجة بوحدات المخاطرة (R): +2 = ربحت ضعف ما خاطرت به، −1 = ضُرب الوقف كاملاً.
 * يحتاج وقفاً صالحاً بالجهة الصحيحة؛ وإلا null. تقريب لمنزلة عشرية واحدة.
 */
export function realizedR(input: {
  side: TradeSide;
  entry: number;
  sl?: number | null;
  exit?: number | null;
}): number | null {
  const { side, entry, sl, exit } = input;
  if (!finitePos(entry) || !finitePos(sl) || !finitePos(exit)) return null;
  const buy = side === 'buy';
  const risk = buy ? entry - sl : sl - entry;
  if (risk <= 0) return null;
  const move = buy ? exit - entry : entry - exit;
  return round1Sym(cleanRatio(move, risk));
}

/**
 * نتيجة صفقة مغلقة بالـpip (الوحدة التي يفكّر بها متداول الفوركس) وبنسبة حركة السعر — من الدخول والخروج
 * مباشرة، لا من `pnl` المخزَّن (كان «% × الحجم» بالباك-إند القديم فيُعرض بوحدة مضلِّلة لحجم ≠ 1).
 * `pips` null حين لا يُعرف حجم الـpip للرمز.
 */
export function realizedMove(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  exit?: number | null;
}): { pips: number | null; pct: number } | null {
  const { side, entry, exit } = input;
  if (!finitePos(entry) || !finitePos(exit)) return null;
  const move = side === 'buy' ? exit - entry : entry - exit;
  const pip = instrumentSpec(input.symbol)?.pipSize ?? null;
  return {
    pips: pip ? Math.round((move / pip) * 10) / 10 : null,
    pct: Math.round((move / entry) * 100 * 100) / 100,
  };
}

/** +1.8R / −1R / 0R */
export function formatR(r: number | null): string | null {
  if (r == null || !Number.isFinite(r)) return null;
  const abs = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${abs}R`;
}

/**
 * النتيجة **العائمة** لصفقة ما تزال مفتوحة، من سعر السوق الآن: بالـpip، وبنسبة حركة السعر، وبالـR
 * حين يكون للصفقة وقفٌ مسجَّل.
 *
 * لماذا: سطر الصفقة المفتوحة بالدفتر كان يقول «▲ شراء EURUSD · 1.0850 (مفتوحة)» وحسب — الصفقات
 * التي عليها مالٌ **الآن** هي وحدها التي لا يقول عنها الدفتر شيئاً، بينما المغلقة (وقد انتهى أمرها)
 * يعرض لكلٍّ منها نقاطها ونسبتها ونتيجتها بالـR. والمتداول الذي سجّل خطته من الحاسبة يجد صفقته
 * مفتوحة بلا أيّ خبر عنها.
 *
 * لا رياضيات جديدة: `realizedMove` و`realizedR` تقيسان المسافة من الدخول إلى سعرٍ يُمرَّر، ولا
 * يعنيهما أهو سعر خروجٍ نُفِّذ أم سعر السوق الآن. فالفارق الوحيد هو من أين يأتي الرقم — وهذا يضمن
 * أن الصفقة المفتوحة والمغلقة تُقاسان بالمسطرة نفسها حرفياً، فلا يقفز الرقم عند الإغلاق.
 *
 * `null` لسعرٍ غير صالح (لا نخترع نتيجة من سعرٍ لا نملكه)، و`r` وحدها `null` بصفقة بلا وقف.
 */
export function floatingResult(input: {
  symbol: string;
  side: TradeSide;
  entry: number;
  sl?: number | null;
  current?: number | null;
}): { pips: number | null; pct: number; r: number | null } | null {
  const { symbol, side, entry, sl, current } = input;
  const mv = realizedMove({ symbol, side, entry, exit: current });
  if (!mv) return null;
  return { ...mv, r: realizedR({ side, entry, sl, exit: current }) };
}
