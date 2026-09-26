/** الاشتراك المشترك بـ`/api/alerts` لخطوط التنبيهات على الشارت — راجع `armedAlerts.ts`. */
import { useEffect, useState } from 'react';
import { api, type PriceAlert } from '../api';
import { armedAlertsFor, type ArmedAlert } from './armedAlerts';

const REFRESH_MS = 60_000;

let latest: PriceAlert[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;
/** يزيد مع كل سحب خطّ: قراءة بدأت قبل التعديل تحمل السعر القديم فتُهمَل ولا تعيد الخطّ لمكانه لحظةً. */
let generation = 0;
/** سحوب لم يُجب خادمها بعد — كل قراءة تصل أثناءها قديمة. */
let pendingMoves = 0;
const soonTimers = new Set<ReturnType<typeof setTimeout>>();

function load() {
  if (inflight) return;
  inflight = true;
  const gen = generation;
  api
    .alerts()
    .then((res) => {
      if (gen !== generation || pendingMoves > 0) return;
      latest = Array.isArray(res?.alerts) ? res.alerts : [];
      for (const l of listeners) l();
    })
    .catch(() => {
      /* الخطوط إضافة على الشارت — فشل القراءة يُبقي ما هو مرسوم */
    })
    .finally(() => {
      inflight = false;
      if (gen !== generation && pendingMoves === 0 && listeners.size > 0) load();
    });
}

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    load();
    timer = setInterval(load, REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      for (const t of soonTimers) clearTimeout(t);
      soonTimers.clear();
    }
  };
}

/**
 * بعد إنشاء تنبيه من الشارت: المستدعي (الشاشة) ينشئه بطلب غير متزامن لا نعرف متى ينتهي — قراءتان
 * قريبتان تكفيان ليظهر الخطّ دون انتظار دقيقة.
 */
export function refreshArmedAlertsSoon(): void {
  if (listeners.size === 0) return;
  for (const ms of [1200, 4000]) {
    const t = setTimeout(() => {
      soonTimers.delete(t);
      load();
    }, ms);
    soonTimers.add(t);
  }
}

/**
 * سحب خطّ التنبيه على الشارت إلى `price` (`PATCH /api/alerts/{id}` — تعديل وإعادة تسليح ذرّيان). الخطّ ينتقل
 * فوراً (تفاؤلياً) لكل الشارتات المفتوحة، والاتجاه من المستدعي (السعر الجديد فوق السعر الحيّ ⇒ `above`).
 * الرمز والملاحظة من التنبيه نفسه: الخادم يستبدل الملاحظة بما يصله، فإغفالها كان يمسحها. الفشل (خادم أقدم
 * بلا PATCH، تنبيه حُذف) ⇒ قراءة الخادم تعيد الخطّ لمكانه، و`false`.
 */
export async function moveArmedAlert(id: string, price: number, condition: 'above' | 'below'): Promise<boolean> {
  const orig = latest.find((a) => a.id === id);
  if (!orig || !Number.isFinite(price) || price <= 0) return false;
  pendingMoves++;
  generation++;
  latest = latest.map((a) => (a.id === id ? { ...a, price, condition } : a));
  notify();
  let ok = false;
  try {
    const res = await api.updateAlert(id, { symbol: orig.symbol, condition, price, note: orig.note ?? '' });
    ok = !!res?.ok;
  } catch {
    ok = false;
  } finally {
    pendingMoves--;
  }
  generation++;
  load();
  return ok;
}

/** تنبيهات `symbol` المُسلَّحة؛ `null` ⇒ لا اشتراك (شارت تجريبي/درس/غير تفاعلي). */
export function useArmedAlerts(symbol: string | null): ArmedAlert[] {
  const [list, setList] = useState<ArmedAlert[]>(() => (symbol ? armedAlertsFor(latest, symbol) : []));
  useEffect(() => {
    if (!symbol) {
      setList([]);
      return;
    }
    const update = () =>
      setList((prev) => {
        const next = armedAlertsFor(latest, symbol);
        const same =
          prev.length === next.length &&
          prev.every((p, i) => p.id === next[i]!.id && p.price === next[i]!.price && p.condition === next[i]!.condition);
        return same ? prev : next;
      });
    update();
    return subscribe(update);
  }, [symbol]);
  return list;
}
