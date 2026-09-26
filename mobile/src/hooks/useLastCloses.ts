/**
 * آخر سعر محفوظ لرموز المتابعة **التي لا يصلها تيك حيّ** (السوق مغلق، أو البثّ لم يصل بعد).
 *
 * كانت القائمة تعرض «—» لكل صفّ بلا تيك، والشارت بجانبها يعرض السعر نفسه من `series.last` موسوماً
 * «مخزن · مغلق» — ستة عشر صفّاً فارغاً والرقم موجود (جولة أنس الثانية على الويب). المصدر هنا هو
 * **الحقل نفسه** الذي يقرؤه رأس الشارت (`ChartSeries.last` من `/api/charts`)، فلا يختلف السعر بين
 * القائمة والشارت.
 *
 * - السلاسل التجريبية لا تُعطي سعراً (قرار أنس ٢)؛ و`unavailable` بسبب `not_offered_by_provider` (DXY) تُعلَّم كذلك ليقول الصفّ «غير متاح»؛
 *   أمّا `provider_unavailable` (تعذّر مؤقّت) فكفشل الطلب: يبقى السعر السابق ويُعاد قريباً.
 * - طلبات متتالية لا متوازية (كـ`dailyRefStore`)، وD/50 هو طلبه نفسه ⇒ الخادم يخدمه من مخزنه.
 * - لا طلب لرمز يصله تيك: السوق المفتوح لا يكلّف شيئاً.
 */
import { useEffect, useState } from 'react';
import { api } from '../api';
import { normalizeProvenance, providerUnavailableReason, type ProvenanceKind } from '../chart/dataSource';
import { rememberChartSeries } from './chartSeriesCache';

const TTL_MS = 2 * 60 * 1000;
const FAIL_TTL_MS = 60 * 1000;

export type LastClose =
  | { state: 'price'; price: number; kind: ProvenanceKind; asOf: number | null }
  | { state: 'unavailable' };

type Entry = { value: LastClose | null; at: number };

const cache = new Map<string, Entry>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let queue: string[] = [];
let running = false;

function fresh(sym: string, now: number): boolean {
  const e = cache.get(sym);
  if (!e) return false;
  return now - e.at < (e.value ? TTL_MS : FAIL_TTL_MS);
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const sym = queue.shift()!;
      try {
        const s = rememberChartSeries(sym, 'D', await api.chart(sym, 'D', 50));
        const src = normalizeProvenance(s?.data_source);
        const last = s?.last;
        let value: LastClose | null = null;
        if (src.kind === 'unavailable') {
          // «غير متاح» للرمز الذي لا يقدّمه المزوّد (DXY) وحده. `provider_unavailable` = تعذّر الجلب الآن
          // (429 بلا مخزن، انقطاع) — لا يُوسَم الرمز غير متاح؛ يبقى السعر السابق أو «—» ويُعاد بعد `FAIL_TTL_MS`.
          if (providerUnavailableReason(s?.data_source) === 'not_offered_by_provider') value = { state: 'unavailable' };
          else throw new Error('provider_unavailable');
        } else if (src.kind !== 'demo' && typeof last === 'number' && Number.isFinite(last) && last > 0) {
          value = { state: 'price', price: last, kind: src.kind, asOf: src.as_of ?? null };
        }
        cache.set(sym, { value, at: Date.now() });
      } catch {
        // تعثّر تحديث لا يمحو سعراً معروضاً — يُعاد المحاولة بعد `FAIL_TTL_MS`.
        const old = cache.get(sym);
        cache.set(sym, old?.value ? { value: old.value, at: Date.now() - TTL_MS + FAIL_TTL_MS } : { value: null, at: Date.now() });
      } finally {
        inflight.delete(sym);
      }
      for (const l of listeners) l();
    }
  } finally {
    running = false;
  }
}

function request(symbols: readonly string[]) {
  const now = Date.now();
  for (const sym of symbols) {
    if (fresh(sym, now) || inflight.has(sym)) continue;
    inflight.add(sym);
    queue.push(sym);
  }
  void drain();
}

function snapshot(symbols: readonly string[]): Record<string, LastClose> {
  const out: Record<string, LastClose> = {};
  for (const sym of symbols) {
    const v = cache.get(sym)?.value;
    if (v) out[sym] = v;
  }
  return out;
}

/** `symbols` = الرموز بلا تيك حيّ الآن (بأحرف كبيرة). الرمز بلا قيمة معروفة غائب عن الكائن. */
export function useLastCloses(symbols: readonly string[]): Record<string, LastClose> {
  const key = symbols.join(',');
  const [out, setOut] = useState<Record<string, LastClose>>(() => snapshot(symbols));
  useEffect(() => {
    const list = key ? key.split(',') : [];
    const update = () =>
      setOut((prev) => {
        const next = snapshot(list);
        const keys = Object.keys(next);
        const same = keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
        return same ? prev : next;
      });
    listeners.add(update);
    update();
    request(list);
    const timer = setInterval(() => request(list), TTL_MS);
    return () => {
      listeners.delete(update);
      clearInterval(timer);
    };
  }, [key]);
  return out;
}
