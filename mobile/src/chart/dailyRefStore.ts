/**
 * مخزن "إغلاق الأمس" لكل رمز (مرجع تغيّر اليوم بقائمة المتابعة).
 *
 * - يجلب شموع D من `api.chart` مرة واحدة لكل رمز، ويخزّنها بالذاكرة 10 دقائق (المرجع لا يتغيّر
 *   خلال اليوم) — كل لوحات المتابعة المفتوحة تتشارك نفس المخزن فلا طلبات مكرّرة.
 * - **إلا عند تبدّل الجلسة**: المخزَّن قبل منتصف ليل UTC (أو قبل افتتاح الأحد) يصير قديماً فوراً
 *   لا بعد انتهاء عمره — كان التغيّر اليومي يُحسب على إغلاق ما قبل الأمس حتى 10 دقائق بعد التدوير
 *   (يَظهر مثلاً +0.8% وهو فعلياً +0.1% اليوم). الفحص كل دقيقة، ولا جلب ما دامت الجلسة نفسها.
 * - طلبات متتالية (لا متوازية) كي لا تُغرق الباك-إند/حدود المزوّد عند فتح اللوحة.
 * - بيانات مصدرها `demo` لا تُستخدم مرجعاً: تغيّر محسوب من سلسلة وهمية مقابل سعر حيّ سيكون مضلِّلاً،
 *   فالأصدق ألا نعرض نسبة إطلاقاً.
 */
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Candle } from '../api';
import { prevSessionFromDaily, sessionKeyAt, validSessionBar, weekendMergeOf } from './dailyChange';
import { currentSessionOpenAfter } from './pivotBase';

const TTL_MS = 10 * 60 * 1000;
const FAIL_TTL_MS = 2 * 60 * 1000;
/** فحص تبدّل الجلسة — رخيص (`fresh` بلا شبكة)، فالتأخير بعد التدوير ≤ دقيقة لا ≤ 10. */
const CHECK_MS = 60 * 1000;

// `prevBar`: شمعة الجلسة السابقة كاملة — أساس نقاط الارتكاز بالشارت (`pivotBase.ts`).
// `currOpen`: افتتاح الجلسة الجارية (شمعة D1 التالية لـ`prevBar`) — محور Woodie على فريم D/W.
// `session`/`weekendMerge`: الجلسة الجارية وقت الجلب وقاعدة حسابها لهذا الرمز (`sessionKeyAt`).
type Entry = {
  prevClose: number | null;
  prevBar: Candle | null;
  currOpen: number | null;
  at: number;
  ok: boolean;
  session: number | null;
  weekendMerge: boolean;
};

const cache = new Map<string, Entry>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let queue: string[] = [];
let running = false;

function fresh(sym: string, now: number): boolean {
  const e = cache.get(sym);
  if (!e) return false;
  if (e.session != null && sessionKeyAt(now / 1000, e.weekendMerge, sym) !== e.session) return false;
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
        const candles = s?.candles ?? [];
        const now = Date.now();
        const bar = demo ? null : prevSessionFromDaily(candles, now / 1000, sym);
        const c = bar?.close;
        const prev = typeof c === 'number' && Number.isFinite(c) && c > 0 ? c : null;
        const weekendMerge = weekendMergeOf(candles);
        cache.set(sym, {
          prevClose: prev,
          prevBar: validSessionBar(bar),
          currOpen: demo ? null : currentSessionOpenAfter(candles, bar),
          at: now,
          ok: true,
          session: sessionKeyAt(now / 1000, weekendMerge, sym),
          weekendMerge,
        });
      } catch {
        // تعثّر تحديث واحد (429، انقطاع، إعادة تشغيل الخادم) لا يمحو مرجعاً صحيحاً للجلسة نفسها: كان يُستبدل بـnull
        // فتقفز نسبة الرأس دقيقتين إلى التغيّر من أول شمعة محمَّلة (+0.12% ⇒ −1.80% على 4H) وتختفي خطوط PDH/PDL
        // والارتكاز. المرجع لا يتغيّر داخل الجلسة، فيُبقى ويُعاد المحاولة بعد `FAIL_TTL_MS`.
        const now = Date.now();
        const old = cache.get(sym);
        if (old?.ok && old.session != null && sessionKeyAt(now / 1000, old.weekendMerge, sym) === old.session) {
          cache.set(sym, { ...old, at: now - TTL_MS + FAIL_TTL_MS });
        } else {
          cache.set(sym, { prevClose: null, prevBar: null, currOpen: null, at: now, ok: false, session: null, weekendMerge: true });
        }
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
    // تجديد دوري: `fresh` يُسقط المخزَّن عند بدء جلسة جديدة أو انتهاء عمره، وإلا لا طلب
    const timer = setInterval(() => request(list), CHECK_MS);
    return () => {
      listeners.delete(update);
      clearInterval(timer);
    };
  }, [key]);

  return refs;
}

/**
 * شمعة الجلسة السابقة لرمز واحد من شموع D1 (نفس المخزن والطلب المشترك مع قائمة المتابعة).
 * `null` رمز ⇒ لا جلب (المؤشّر مطفأ). `undefined` = لم يصل بعد أو فشل أو بيانات تجريبية.
 */
export function useDailyPrevBar(symbol: string | null): Candle | undefined {
  const sym = symbol ? symbol.toUpperCase() : '';
  const [bar, setBar] = useState<Candle | undefined>(() =>
    sym ? cache.get(sym)?.prevBar ?? undefined : undefined
  );

  useEffect(() => {
    if (!sym) {
      setBar(undefined);
      return;
    }
    const update = () => setBar(cache.get(sym)?.prevBar ?? undefined);
    listeners.add(update);
    update();
    request([sym]);
    const timer = setInterval(() => request([sym]), CHECK_MS);
    return () => {
      listeners.delete(update);
      clearInterval(timer);
    };
  }, [sym]);

  return bar;
}

/** افتتاح الجلسة الجارية من شموع D1 (نفس مخزن `useDailyPrevBar`)؛ null = غير معروف. */
export function useDailyCurrOpen(symbol: string | null): number | null {
  const sym = symbol ? symbol.toUpperCase() : '';
  const [open, setOpen] = useState<number | null>(() => (sym ? cache.get(sym)?.currOpen ?? null : null));
  useEffect(() => {
    if (!sym) {
      setOpen(null);
      return;
    }
    const update = () => setOpen(cache.get(sym)?.currOpen ?? null);
    listeners.add(update);
    update();
    request([sym]);
    return () => {
      listeners.delete(update);
    };
  }, [sym]);
  return open;
}
