import type { DataProvenance, DataOriginKind } from '../api';
import { TF_SECONDS, type Timeframe, isTimeframe } from '../timeframes';

const KIND_LABEL_AR: Record<DataOriginKind, string> = {
  provider: 'مزود',
  demo: 'تجريبي',
  cache: 'مخزن',
  unknown: 'مصدر غير محدد',
};

/** حداثة شارة «حي» (ثوانٍ) */
export const FRESH_TICK_SEC = 15;
/** سماحية ساعة مستقبلية صغيرة (ثوانٍ) — موثّقة ضد انحراف الساعة */
export const CLOCK_SKEW_SEC = 2;

export type SourceFamily = 'twelvedata' | 'demo' | 'unknown';

export function normalizeProvenance(
  raw: Partial<DataProvenance> | null | undefined
): DataProvenance {
  const kind = raw?.kind;
  if (kind === 'provider' || kind === 'demo' || kind === 'cache' || kind === 'unknown') {
    return {
      kind,
      as_of: typeof raw?.as_of === 'number' ? raw.as_of : null,
      channel: raw?.channel ?? null,
    };
  }
  return { kind: 'unknown', as_of: null, channel: null };
}

export function provenanceLabel(src: DataProvenance | null | undefined): string {
  return KIND_LABEL_AR[normalizeProvenance(src).kind];
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
  nowSec = Date.now() / 1000
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
  nowSec = Date.now() / 1000
): boolean {
  if (!isValidAsOf(asOf, nowSec)) return false;
  const age = nowSec - asOf;
  return age >= -CLOCK_SKEW_SEC && age < FRESH_TICK_SEC;
}

/** «حي» فقط لتيك مزود حديث وصحيح التوقيت؛ وإلا وصف محايد. */
export function tickStatusLabel(
  tickSrc: DataProvenance | null | undefined,
  asOf: number | null | undefined,
  nowSec = Date.now() / 1000
): string | null {
  if (!tickSrc) return null;
  const kind = normalizeProvenance(tickSrc).kind;
  if (kind === 'provider' && isFreshTick(asOf, nowSec)) return 'حي';
  if (kind === 'demo') return 'تيك تجريبي';
  if (kind === 'cache') return 'آخر سعر';
  return 'آخر سعر';
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

/**
 * التيك ينتمي لحاوية الشمعة [open, open+step).
 * لا يسمح بتيك خارج الحاوية (تاريخية أو فجوة) — ولا نخترع شموعاً.
 */
export function tickBelongsToCandle(
  candleOpenTime: number,
  tickSec: number | null | undefined,
  stepSec: number,
  nowSec = Date.now() / 1000
): boolean {
  if (!isValidAsOf(tickSec, nowSec)) return false;
  if (!(stepSec > 0) || !Number.isFinite(stepSec)) return false;
  const open = candleTimeSec(candleOpenTime);
  if (!Number.isFinite(open)) return false;
  return tickSec >= open && tickSec < open + stepSec;
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
