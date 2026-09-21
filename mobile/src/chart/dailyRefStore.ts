/**
 * مخزن "إغلاق الأمس" لكل رمز (مرجع تغيّر اليوم بقائمة المتابعة).
 *
 * - يجلب شموع D من `api.chart` مرة واحدة لكل رمز، ويخزّنها بالذاكرة 10 دقائق (المرجع لا يتغيّر
 *   خلال اليوم) — كل لوحات المتابعة المفتوحة تتشارك نفس المخزن فلا طلبات مكرّرة.
 * - طلبات متتالية (لا متوازية) كي لا تُغرق الباك-إند/حدود المزوّد عند فتح اللوحة.
 * - بيانات مصدرها `demo` لا تُستخدم مرجعاً: تغيّر محسوب من سلسلة وهمية مقابل سعر حيّ سيكون مضلِّلاً،
 *   فالأصدق ألا نعرض نسبة إطلاقاً.
 */
import { useEffect, useState } from 'react';
import { api } from '../api';
import { prevCloseFromDaily } from './dailyChange';

const TTL_MS = 10 * 60 * 1000;
const FAIL_TTL_MS = 2 * 60 * 1000;

type Entry = { prevClose: number | null; at: number; ok: boolean };

const cache = new Map<string, Entry>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let queue: string[] = [];
let running = false;

function fresh(sym: string, now: number): boolean {
  const e = cache.get(sym);
  if (!e) return false;
  return now - e.at < (e.ok ? TTL_MS : FAIL_TTL_MS);
}

function emit() {
  for (const l of listeners) l();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const sym = queue.shift()!;
      if (fresh(sym, Date.now())) {
        inflight.delete(sym);
        continue;
      }
      try {
        const s = await api.chart(sym, 'D', 50);
        const demo = s?.data_source?.kind === 'demo';
        const prev = demo ? null : prevCloseFromDaily(s?.candles ?? []);
        cache.set(sym, { prevClose: prev, at: Date.now(), ok: true });
      } catch {
        cache.set(sym, { prevClose: null, at: Date.now(), ok: false });
      } finally {
        inflight.delete(sym);
      }
      emit();
    }
  } finally {
    running = false;
  }
}

function request(symbols: readonly string[]) {
  const now = Date.now();
  for (const raw of symbols) {
    const sym = raw.toUpperCase();
    if (fresh(sym, now) || inflight.has(sym)) continue;
    inflight.add(sym);
    queue.push(sym);
  }
  void drain();
}

function snapshot(symbols: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const raw of symbols) {
    const sym = raw.toUpperCase();
    const p = cache.get(sym)?.prevClose;
    if (typeof p === 'number') out[sym] = p;
  }
  return out;
}

/** إغلاق الأمس لكل رمز معروف مرجعه؛ الرموز بلا مرجع (تحميل/فشل/بيانات تجريبية) غائبة عن الكائن. */
export function useDailyRefs(symbols: readonly string[]): Record<string, number> {
  const key = symbols.map((s) => s.toUpperCase()).join(',');
  const [refs, setRefs] = useState<Record<string, number>>(() => snapshot(symbols));

  useEffect(() => {
    const list = key ? key.split(',') : [];
    const update = () => setRefs(snapshot(list));
    listeners.add(update);
    update();
    request(list);
    // تجديد دوري (المرجع يتبدّل عند بدء يوم تداول جديد)
    const timer = setInterval(() => request(list), TTL_MS);
    return () => {
      listeners.delete(update);
      clearInterval(timer);
    };
  }, [key]);

  return refs;
}
