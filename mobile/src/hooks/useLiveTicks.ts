import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL, type LiveTick } from '../api';
import { parseWsDataSource } from '../chart/dataSource';

/** إعادة اتصال تدريجية (exponential backoff) عند انقطاع WS — 1s..30s */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/** لقطة البثّ الأخيرة أقدم من هذا ⇒ لا تُعرض فوراً عند تبديل الرمز (البثّ كل ثانية). */
const SNAPSHOT_FRESH_MS = 5000;

type Snapshot = { at: number; ticks: Record<string, number>; source: LiveTick['source'] };

function tickFromSnapshot(snap: Snapshot | null, sym: string): LiveTick | null {
  const p = snap?.ticks[sym];
  // `typeof === 'number'` يمرّر الصفر والسالب (تيك مزوّد معطوب): الرأس كان يطبع «0.00000» سعراً حيّاً.
  if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) return null;
  return { price: p, source: snap!.source };
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
  const [state, setState] = useState<{ sym: string; tick: LiveTick } | null>(null);
  const tick = state && state.sym === sym ? state.tick : null;
  const wsRef = useRef<WebSocket | null>(null);
  const symRef = useRef(sym);
  const snapRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    symRef.current = sym;
    const snap = snapRef.current;
    if (!enabled || !snap || Date.now() - snap.at > SNAPSHOT_FRESH_MS) return;
    const t = tickFromSnapshot(snap, sym);
    if (t) setState({ sym, tick: t });
  }, [sym, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const base = API_URL.replace(/^http/, 'ws');
    const url = `${base}/ws/ticks`;
    let alive = true;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (!alive) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (!alive) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          attempt = 0;
        };
        ws.onmessage = (ev) => {
          if (!alive) return;
          try {
            const data = JSON.parse(String(ev.data)) as {
              ticks?: Record<string, number>;
              source?: string;
              data_source?: { kind?: string; as_of?: number; channel?: string };
              ts?: number;
            };
            if (!data.ticks || typeof data.ticks !== 'object') return;
            const snap: Snapshot = { at: Date.now(), ticks: data.ticks, source: parseWsDataSource(data) };
            snapRef.current = snap;
            const cur = symRef.current;
            const t = tickFromSnapshot(snap, cur);
            if (t) setState({ sym: cur, tick: t });
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
      appSub.remove();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return tick;
}
