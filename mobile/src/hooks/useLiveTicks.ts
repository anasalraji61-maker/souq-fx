import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL, type LiveTick } from '../api';
import { noteServerTime, parseWsDataSource } from '../chart/dataSource';
import { acceptTick } from './tickAge';

/** إعادة اتصال تدريجية (exponential backoff) عند انقطاع WS — 1s..30s */
export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;

/** لقطة البثّ الأخيرة أقدم من هذا ⇒ لا تُعرض فوراً عند تبديل الرمز (البثّ كل ثانية). */
const SNAPSHOT_FRESH_MS = 5000;

/**
 * بلا بثّ أطول من هذا ⇒ يُسقَط التيك: انقطاع الشبكة والتطبيق بالواجهة كان يُبقي آخر سعر
 * «حيّاً» بالرأس ووسم السعر (والتنبيهات تُقارن به) طوال محاولات إعادة الاتصال حتى 30s لكل
 * محاولة، وبلا حدّ إن بقي الخادم متوقّفاً. بعد الإسقاط يعود الشارت لإغلاق آخر شمعة.
 */
export const TICK_STALE_MS = 20000;
export const STALE_CHECK_MS = 5000;

type Snapshot = {
  at: number;
  ticks: Record<string, number>;
  ticks_at?: Record<string, number | null>;
  ts?: number;
  source: LiveTick['source'];
};

/** `at` لحظة استلام الرمز بساعة الجهاز: لقطة عمرها 3ث لرمز عمره 15ث عند الخادم ⇒ عمره 18ث لا 3. */
function tickFromSnapshot(snap: Snapshot | null, sym: string): { tick: LiveTick; at: number } | null {
  if (!snap) return null;
  // `typeof === 'number'` يمرّر الصفر والسالب (تيك مزوّد معطوب): الرأس كان يطبع «0.00000» سعراً حيّاً.
  // ورمز متجمّد يعيد الخادم بثّه حتى دقيقتين (`ticks_at` أقدم من `TICK_STALE_MS`) ⇒ لا تيك.
  return acceptTick(snap, sym, snap.ticks[sym], snap.source, snap.at, TICK_STALE_MS);
}

/** Live tick for one symbol with provenance.
 * التيك يُخزَّن مع رمزه ولا يُعاد إلا إن طابق الرمز الحالي: بعد التبديل XAUUSD → EURUSD كان يُعيد 2650 حتى
 * يصل أول تيك لليورو — فتنبيه من الشارت على 1.09 يُقارن بـ2650 ويصير «تحت» ويُطلق فوراً.
 *
 * المقبس واحد لكل الرموز (البثّ يحمل كل الأسعار بكل رسالة)، فلا يُعاد فتحه عند تبديل الرمز:
 * كان كل تبديل زوج يغلق المقبس ويفتح غيره، فيبقى رأس الزوج الجديد بلا سعر حيّ طوال المصافحة
 * ثم حتى البثّ التالي. الآن الرمز يُقرأ من ref، وسعر الزوج الجديد يظهر فوراً من آخر لقطة
 * (إن كانت حديثة) ثم يتبع البثّ. */
export function useLiveTicks(symbol: string, enabled: boolean): LiveTick | null {
  const sym = symbol.toUpperCase();
  // `at`: لحظة وصول هذا الرمز تحديداً — لا آخر رسالة: البثّ قد يستمرّ بأسعار الأزواج الأخرى
  // ويغيب عنه هذا الرمز (أو يصل صفراً)، فكان آخر سعر صالح له يبقى «حيّاً» بلا حدّ.
  const [state, setState] = useState<{ sym: string; tick: LiveTick; at: number } | null>(null);
  const tick = state && state.sym === sym ? state.tick : null;
  const wsRef = useRef<WebSocket | null>(null);
  const symRef = useRef(sym);
  const snapRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    symRef.current = sym;
    // معطَّل ⇒ يُنسى آخر تيك: نافذة تُعاد بعد دقائق كانت تعرض سعر إغلاقها حتى أوّل بثّ
    // بعد إعادة الاتصال (وبلا حدّ إن فشل الاتصال).
    if (!enabled) {
      setState(null);
      return;
    }
    const snap = snapRef.current;
    if (!snap || Date.now() - snap.at > SNAPSHOT_FRESH_MS) return;
    const t = tickFromSnapshot(snap, sym);
    if (t) setState({ sym, tick: t.tick, at: t.at });
  }, [sym, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const base = API_URL.replace(/^http/, 'ws');
    const url = `${base}/ws/ticks`;
    let alive = true;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    /** آخر رسالة (أو لحظة الفتح) على المقبس الحالي — لكشف مقبس «مفتوح» صامت. */
    let lastHeardAt = 0;

    const scheduleReconnect = () => {
      if (!alive) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (!alive) return;
      // يبدأ عدّاد الصمت من المحاولة لا من الفتح: مصافحة معلّقة (شبكة خلوية ضعيفة، بوّابة Wi-Fi) تبقى
      // CONNECTING حتى مهلة TCP بالنظام (دقيقة وأكثر) بلا `onclose` ⇒ لا سعر حيّ ولا محاولة أخرى طوالها.
      lastHeardAt = Date.now();
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          attempt = 0;
          lastHeardAt = Date.now();
        };
        ws.onmessage = (ev) => {
          // مقبس تُرك (نصف ميت بعد تبديل الشبكة) قد يُفرغ رسائله المحجوزة متأخّرة: أسعار قديمة تُختم بـ«الآن»
          // وتغلب أسعار المقبس الجديد لحظةً — الرأس ووسم السعر يقفزان للخلف ثم يعودان.
          if (!alive || wsRef.current !== ws) return;
          lastHeardAt = Date.now();
          try {
            const data = JSON.parse(String(ev.data)) as {
              ticks?: Record<string, number>;
              ticks_at?: Record<string, number | null>;
              source?: string;
              data_source?: { kind?: string; as_of?: number; channel?: string };
              ts?: number;
            };
            if (!data.ticks || typeof data.ticks !== 'object') return;
            // ساعة الخادم لقرارات التيك (دمج الشمعة الحيّة، «حي»، العدّاد) — انظر `serverNowSec`.
            noteServerTime(data.ts);
            const snap: Snapshot = {
              at: Date.now(),
              ticks: data.ticks,
              ticks_at: data.ticks_at,
              ts: data.ts,
              source: parseWsDataSource(data),
            };
            snapRef.current = snap;
            const cur = symRef.current;
            const t = tickFromSnapshot(snap, cur);
            if (t) setState({ sym: cur, tick: t.tick, at: t.at });
          } catch {
            /* ignore */
          }
        };
        ws.onerror = () => {
          /* silent — onclose يتولى إعادة الاتصال */
        };
        ws.onclose = () => {
          // مقبس استُبدل (إعادة اتصال عند العودة للواجهة) لا يجدول اتصالاً ثانياً.
          if (wsRef.current !== ws) return;
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    }

    connect();

    const staleTimer = setInterval(() => {
      // تيك الرمز نفسه أقدم من الحدّ ⇒ يُسقَط ولو ظلّ البثّ يصل برموز أخرى.
      setState((s) => (s && Date.now() - s.at > TICK_STALE_MS ? null : s));
      const snap = snapRef.current;
      if (snap && Date.now() - snap.at <= TICK_STALE_MS) return;
      // مقبس «مفتوح» بلا رسالة منذ 20s (والخادم يبثّ كل ثانية): اتصال نصف ميت بعد تبديل
      // Wi-Fi↔خلوي — لا `onclose` حتى مهلة النظام (دقائق)، فالسعر الحيّ يبقى غائباً طوالها.
      // يُترك ويُفتح غيره فوراً؛ وإن فشل الجديد تتولّى `onclose` التضاعف المعتاد. ومثله مقبس عالق بالمصافحة
      // (CONNECTING) منذ 20s.
      const cur = wsRef.current;
      const pending = cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING);
      if (!cur || !pending || Date.now() - lastHeardAt <= TICK_STALE_MS) return;
      wsRef.current = null;
      try {
        cur.close();
      } catch {
        /* ignore */
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      attempt = 0;
      connect();
    }, STALE_CHECK_MS);

    // بالخلفية يُغلق النظام المقبس وتفشل المحاولات فيتضاعف الانتظار حتى 30s: بعد العودة
    // للتطبيق كان السعر الحيّ يقف حتى نصف دقيقة كأنه حيّ. العودة للواجهة تعيد الاتصال فوراً
    // وتصفّر التضاعف، إلا إن كان المقبس مفتوحاً أو قيد الاتصال أصلاً.
    const appSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || !alive) return;
      const cur = wsRef.current;
      if (cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING)) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      attempt = 0;
      connect();
    });

    return () => {
      alive = false;
      clearInterval(staleTimer);
      appSub.remove();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return tick;
}
