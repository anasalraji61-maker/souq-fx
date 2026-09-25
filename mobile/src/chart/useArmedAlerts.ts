/** الاشتراك المشترك بـ`/api/alerts` لخطوط التنبيهات على الشارت — راجع `armedAlerts.ts`. */
import { useEffect, useState } from 'react';
import { api, type PriceAlert } from '../api';
import { armedAlertsFor, type ArmedAlert } from './armedAlerts';

const REFRESH_MS = 60_000;

let latest: PriceAlert[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;
const soonTimers = new Set<ReturnType<typeof setTimeout>>();

function load() {
  if (inflight) return;
  inflight = true;
  api
    .alerts()
    .then((res) => {
      latest = Array.isArray(res?.alerts) ? res.alerts : [];
      for (const l of listeners) l();
    })
    .catch(() => {
      /* الخطوط إضافة على الشارت — فشل القراءة يُبقي ما هو مرسوم */
    })
    .finally(() => {
      inflight = false;
    });
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
          prev.every((p, i) => p.price === next[i]!.price && p.condition === next[i]!.condition);
        return same ? prev : next;
      });
    update();
    return subscribe(update);
  }, [symbol]);
  return list;
}
