import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL, type LiveTick } from '../api';
import { noteServerTime, parseWsDataSource } from '../chart/dataSource';
import { acceptTick } from './tickAge';
import { RECONNECT_BASE_MS, RECONNECT_MAX_MS, STALE_CHECK_MS, TICK_STALE_MS } from './useLiveTicks';

/**
 * Per-symbol live ticks with honest provenance (never assume provider from WS alone).
 *
 * قواعد `useLiveTicks` نفسها لكل رمز — كانت هذه النسخة بلا أيٍّ منها، فقائمة المتابعة والرباعي
 * يعرضان سعراً متجمّداً كأنه حيّ:
 * - سعر ≤0 أو غير منتهٍ (تيك مزوّد معطوب) يُرفض ولا يستبدل آخر سعر صالح.
 * - رمز أقدم عند الخادم من `TICK_STALE_MS` (`ticks_at`، الخادم يعيد بثّ المتجمّد حتى دقيقتين) يُرفض
 *   ولا يجدّد لحظته؛ `as_of` هو وقت استلامه هو لا أحدث رمز بالدفعة.
 * - كل رمز يحمل لحظة استلامه؛ غاب عن البثّ أكثر من `TICK_STALE_MS` ⇒ يُسقَط (يعود المستهلك لإغلاق
 *   آخر شمعة) ولو ظلّ البثّ يصل برموز أخرى.
 * - مقبس «مفتوح» صامت، أو عالق بالمصافحة، أكثر من `TICK_STALE_MS` يُترك ويُفتح غيره فوراً.
 * - العودة للواجهة تعيد الاتصال فوراً وتصفّر التضاعف.
 * - التعطيل يُنسي الأسعار: نافذة تُعاد بعد دقائق لا تعرض أسعار إغلاقها.
 */
export function useMultiLiveTicks(symbols: string[], enabled: boolean) {
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const atRef = useRef<Record<string, number>>({});
  const syms = symbols.map((s) => s.toUpperCase()).join(',');

  useEffect(() => {
    if (!enabled || !symbols.length) {
      atRef.current = {};
      setTicks((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    const base = API_URL.replace(/^http/, 'ws');
    let alive = true;
    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    /** آخر رسالة (أو لحظة المحاولة/الفتح) على المقبس الحالي — لكشف مقبس صامت أو عالق بالمصافحة. */
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
      // CONNECTING حتى مهلة TCP بالنظام بلا `onclose` ⇒ قائمة المتابعة بلا سعر حيّ ولا محاولة أخرى طوالها.
      lastHeardAt = Date.now();
      try {
        const sock = new WebSocket(`${base}/ws/ticks`);
        ws = sock;
        sock.onopen = () => {
          attempt = 0;
          lastHeardAt = Date.now();
        };
        sock.onmessage = (ev) => {
          // مقبس تُرك قد يُفرغ رسائل محجوزة متأخّرة: أسعار قديمة تُختم بـ«الآن».
          if (!alive || ws !== sock) return;
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
            // ساعة الخادم قبل قبول التيكات: بدونها جهاز متأخّر ≥3ث يرى كل تيك «من المستقبل» فيرفضه.
            noteServerTime(data.ts);
            const source = parseWsDataSource(data);
            const now = Date.now();
            setTicks((prev) => {
              let next: Record<string, LiveTick> | null = null;
              for (const [sym, price] of Object.entries(data.ticks!)) {
                const ok = acceptTick(data, sym, price, source, now, TICK_STALE_MS);
                if (!ok) continue;
                const key = sym.toUpperCase();
                next = next ?? { ...prev };
                next[key] = ok.tick;
                atRef.current[key] = ok.at;
              }
              return next ?? prev;
            });
          } catch {
            /* ignore */
          }
        };
        sock.onerror = () => {
          /* silent — onclose يتولى إعادة الاتصال */
        };
        sock.onclose = () => {
          // مقبس استُبدل (صامت أو عودة للواجهة) لا يجدول اتصالاً ثانياً.
          if (ws !== sock) return;
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    }

    connect();

    function sweep() {
      const now = Date.now();
      setTicks((prev) => {
        let next: Record<string, LiveTick> | null = null;
        for (const key of Object.keys(prev)) {
          if (now - (atRef.current[key] ?? 0) <= TICK_STALE_MS) continue;
          next = next ?? { ...prev };
          delete next[key];
          delete atRef.current[key];
        }
        return next ?? prev;
      });
      // مقبس «مفتوح» صامت، أو عالق بالمصافحة (CONNECTING)، أكثر من `TICK_STALE_MS` ⇒ يُترك ويُفتح غيره.
      const cur = ws;
      const pending = cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING);
      if (!cur || !pending || now - lastHeardAt <= TICK_STALE_MS) return;
      ws = null;
      try {
        cur.close();
      } catch {
        /* ignore */
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      attempt = 0;
      connect();
    }

    const staleTimer = setInterval(sweep, STALE_CHECK_MS);

    const appSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || !alive) return;
      // المؤقّتات متوقّفة بالخلفية: بلا كنسٍ فوري تبقى أسعار ما قبل الخلفية (ساعة ربما) معروضة
      // كحيّة حتى دورة `STALE_CHECK_MS` التالية، والمقبس «المفتوح» الميت (iOS) لا يُستبدل.
      sweep();
      const cur = ws;
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
      const cur = ws;
      ws = null;
      cur?.close();
    };
  }, [syms, enabled, symbols.length]);

  return ticks;
}
