import type { DataProvenance, DataOriginKind } from '../api';
import { TF_SECONDS, type Timeframe, isTimeframe } from '../timeframes';

/** تسميات افتراضية بالعربية — تُستخدَم إن لم يُمرَّر كائن ترجمة من واجهة i18n (توافق خلفي مع dataSource.selftest.ts). */
/** `'unavailable'` (backend-r2) صار ضمن `DataOriginKind` (`api.ts`) — الاسم باقٍ للمستدعين. */
export type ProvenanceKind = DataOriginKind;
/** تسميات جزئية: نوع بلا تسمية ⇒ تسمية `unknown` الممرَّرة ثم العربية الافتراضية. */
export type ProvenanceKindLabels = Partial<Record<ProvenanceKind, string>>;

const KIND_LABEL_AR: Record<ProvenanceKind, string> = {
  provider: 'مزود',
  demo: 'تجريبي',
  cache: 'مخزن',
  unknown: 'مصدر غير محدد',
  unavailable: 'غير متاح من المزوّد',
};

export type TickStatusLabels = {
  live: string;
  demoTick: string;
  lastPrice: string;
};

const TICK_STATUS_LABELS_AR: TickStatusLabels = {
  live: 'حي',
  demoTick: 'تيك تجريبي',
  lastPrice: 'آخر سعر',
};

/** حداثة شارة «حي» (ثوانٍ) */
export const FRESH_TICK_SEC = 15;
/** سماحية ساعة مستقبلية صغيرة (ثوانٍ) — موثّقة ضد انحراف الساعة */
export const CLOCK_SKEW_SEC = 2;

/**
 * فرق ساعة الخادم عن ساعة الجهاز (ثوانٍ، موجب = الجهاز متأخّر)، من `ts` بكل دفعة `/ws/ticks`
 * (`noteServerTime`). أوقات التيكات بساعة الخادم: جهاز متأخّر 30ث كان يرى كل تيك «من المستقبل» فيرفضه
 * (`isValidAsOf`) ⇒ الشارت متجمّد والشمعة الحيّة لا تتحرّك بينما الرأس يتحرّك؛ ومتقدّم 30ث ⇒ شارة «حي» لا تظهر أبداً.
 */
let serverOffsetSec = 0;
/** فرق أكبر من يوم = `ts` معطوب لا ساعة منحرفة ⇒ يُتجاهل. */
const MAX_SERVER_OFFSET_SEC = 86400;

export function noteServerTime(serverSec: unknown, deviceMs = Date.now()): void {
  if (typeof serverSec !== 'number' || !Number.isFinite(serverSec) || serverSec <= 0) return;
  const off = serverSec - deviceMs / 1000;
  if (Math.abs(off) <= MAX_SERVER_OFFSET_SEC) serverOffsetSec = off;
}

/** «الآن» بساعة الخادم (ساعة الجهاز + الفرق المقدَّر؛ بلا بثّ بعد = ساعة الجهاز). */
export function serverNowSec(deviceMs = Date.now()): number {
  return deviceMs / 1000 + serverOffsetSec;
}

export type SourceFamily = 'twelvedata' | 'demo' | 'unknown';

export function normalizeProvenance(
  raw: Partial<DataProvenance> | null | undefined
): DataProvenance {
  const kind = raw?.kind;
  if (
    kind === 'provider' ||
    kind === 'demo' ||
    kind === 'cache' ||
    kind === 'unknown' ||
    kind === 'unavailable'
  ) {
    return {
      kind,
      as_of: typeof raw?.as_of === 'number' ? raw.as_of : null,
      channel: raw?.channel ?? null,
    };
  }
  return { kind: 'unknown', as_of: null, channel: null };
}

export function provenanceLabel(
  src: DataProvenance | null | undefined,
  kindLabels: ProvenanceKindLabels = KIND_LABEL_AR
): string {
  const kind = normalizeProvenance(src).kind;
  return kindLabels[kind] ?? kindLabels.unknown ?? KIND_LABEL_AR[kind];
}

/**
 * سلسلة/تيك ليست أسعار مزوّد: `demo` (بذرية) أو `unavailable` (لا مزوّد لهذا الرمز/الآن). كلاهما لا يُقابَل
 * بمراجع حقيقية (إغلاق أمس، نقاط الارتكاز) ولا يُخزَّن مكان سلسلة حقيقية.
 */
export function isSyntheticProvenance(src: Partial<DataProvenance> | null | undefined): boolean {
  const kind = normalizeProvenance(src).kind;
  return kind === 'demo' || kind === 'unavailable';
}

/**
 * اقتباس `/api/market/quote` سعر سوق حقيقي؟ عند تعذّر المزوّد (أو رمز لا يعرفه) يعيد الباك-إند سلسلة
 * بذرية تجريبية (`data_kind: 'demo'`، ~1.0 لزوج مجهول) — مقبولة للعرض بشارت عليه شارة «تجريبي»، لكن
 * لا تصلح رقماً يُبنى عليه قرار: سعر تحويل بحاسبة المخاطرة، أو اتجاه تنبيه «فوق/تحت». `ohlc_fallback`
 * بلا `data_kind` (باك-إند أقدم) لا يمكن تمييزه فيُرفض؛ provider/cache/unknown كلها شموع المزوّد.
 */
export function isRealQuote(q: { price?: unknown; source?: string | null; data_kind?: string | null }): boolean {
  if (typeof q.price !== 'number' || !Number.isFinite(q.price) || q.price <= 0) return false;
  // `unavailable` (backend-r2) يأتي بـ`price: null` — ويُرفض كذلك لو حمل سعراً يوماً.
  return q.data_kind != null ? q.data_kind !== 'demo' && q.data_kind !== 'unavailable' : q.source === 'twelvedata';
}

/**
 * سبب «لا بيانات حقيقية لهذا الرمز أصلاً» من مصدر السلسلة الخام (`data_source.unavailable_reason`، backend-r1)
 * — اليوم `not_offered_by_provider` لـDXY. `normalizeProvenance` يُسقط الحقل، فيُقرأ هنا من الكائن كما وصل.
 * شارة «تجريبي» العامة توحي بعطل مؤقّت سيعود؛ هذا يقول إن الرسم مولَّد للعرض دائماً. غير ذلك ⇒ null.
 */
export function providerUnavailableReason(src: unknown): string | null {
  if (!src || typeof src !== 'object') return null;
  const r = (src as { unavailable_reason?: unknown }).unavailable_reason;
  return typeof r === 'string' && r.trim() ? r.trim() : null;
}

/** عائلة القناة المعروفة — قنوات غير معروفة لا تندمج افتراضياً */
export function sourceFamily(channel: string | null | undefined): SourceFamily {
  const c = (channel || '').trim().toLowerCase();
  if (!c) return 'unknown';
  if (c === 'twelvedata' || c === 'twelvedata_ws' || c.startsWith('twelvedata')) {
    return 'twelvedata';
  }
  if (c === 'seed' || c === 'mock' || c === 'ws_seed' || c === 'demo') {
    return 'demo';
  }
  return 'unknown';
}

/**
 * دمج فقط عند توافق النوع + عائلة القناة.
 * REST twelvedata ↔ WS twelvedata_ws مسموح؛ مزودان/قنوات مجهولة لا.
 */
export function canMergeLiveIntoCandles(
  candleSrc: DataProvenance | null | undefined,
  tickSrc: DataProvenance | null | undefined
): boolean {
  const c = normalizeProvenance(candleSrc);
  const t = normalizeProvenance(tickSrc);
  if (c.kind === 'unknown' || t.kind === 'unknown') return false;

  const cf = sourceFamily(c.channel);
  const tf = sourceFamily(t.channel);
  if (cf === 'unknown' || tf === 'unknown') return false;
  if (cf !== tf) return false;

  if (c.kind === 'demo') return t.kind === 'demo' && cf === 'demo';
  if (t.kind === 'demo') return false;
  if (!(c.kind === 'provider' || c.kind === 'cache')) return false;
  if (!(t.kind === 'provider' || t.kind === 'cache')) return false;
  return cf === 'twelvedata';
}

export function isValidAsOf(
  asOf: number | null | undefined,
  nowSec = serverNowSec()
): asOf is number {
  return (
    typeof asOf === 'number' &&
    Number.isFinite(asOf) &&
    asOf > 0 &&
    asOf <= nowSec + CLOCK_SKEW_SEC
  );
}

/** حديث ضمن النافذة، مع رفض المستقبل الكبير وNaN */
export function isFreshTick(
  asOf: number | null | undefined,
  nowSec = serverNowSec()
): boolean {
  if (!isValidAsOf(asOf, nowSec)) return false;
  const age = nowSec - asOf;
  return age >= -CLOCK_SKEW_SEC && age < FRESH_TICK_SEC;
}

export type TickStatusKind = 'live' | 'demo' | 'lastPrice';

/**
 * نوع حالة التيك بلا نص — لقرارات العرض (لون/نمط) بمعزل عن النص المترجَم المعروض،
 * لتفادي مقارنة الواجهة نصاً حرفياً (كانت مقارنة `tickTag === 'حي'` تفشل بصمت بأي لغة غير العربية).
 */
export function tickStatusKind(
  tickSrc: DataProvenance | null | undefined,
  asOf: number | null | undefined,
  nowSec = serverNowSec()
): TickStatusKind | null {
  if (!tickSrc) return null;
  const kind = normalizeProvenance(tickSrc).kind;
  // لا تيك أصلاً (backend-r2 `ticks: {}`) — لا وسم «آخر سعر» لسعر لم يصل.
  if (kind === 'unavailable') return null;
  if (kind === 'provider' && isFreshTick(asOf, nowSec)) return 'live';
  if (kind === 'demo') return 'demo';
  return 'lastPrice';
}

/** «حي» فقط لتيك مزود حديث وصحيح التوقيت؛ وإلا وصف محايد. */
export function tickStatusLabel(
  tickSrc: DataProvenance | null | undefined,
  asOf: number | null | undefined,
  nowSec = serverNowSec(),
  labels: TickStatusLabels = TICK_STATUS_LABELS_AR
): string | null {
  const kind = tickStatusKind(tickSrc, asOf, nowSec);
  if (!kind) return null;
  if (kind === 'live') return labels.live;
  if (kind === 'demo') return labels.demoTick;
  return labels.lastPrice;
}

export function candleTimeSec(t: number): number {
  return t > 1e12 ? t / 1000 : t;
}

export function timeframeStepSec(tf: string | null | undefined): number {
  if (tf && isTimeframe(tf)) return TF_SECONDS[tf as Timeframe];
  const map: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1H': 3600,
    '4H': 14400,
    D: 86400,
    W: 604800,
  };
  return map[tf || ''] ?? 900;
}

export function parseWsDataSource(payload: {
  source?: string;
  data_source?: { kind?: string; as_of?: number; channel?: string } | null;
  ts?: number;
}): DataProvenance {
  if (payload.data_source) {
    return normalizeProvenance({
      kind: payload.data_source.kind as DataProvenance['kind'] | undefined,
      as_of: payload.data_source.as_of ?? payload.ts ?? null,
      channel: payload.data_source.channel ?? null,
    });
  }
  if (payload.source === 'twelvedata_ws') {
    return { kind: 'provider', as_of: payload.ts ?? null, channel: 'twelvedata_ws' };
  }
  if (payload.source === 'fallback') {
    return { kind: 'demo', as_of: payload.ts ?? null, channel: 'ws_seed' };
  }
  return { kind: 'unknown', as_of: payload.ts ?? null, channel: null };
}
