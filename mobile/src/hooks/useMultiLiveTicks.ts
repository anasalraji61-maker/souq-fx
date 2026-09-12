import { useEffect, useState } from 'react';
import { API_URL, type LiveTick } from '../api';
import { parseWsDataSource } from '../chart/dataSource';

/** إعادة اتصال تدريجية (exponential backoff) عند انقطاع WS — 1s..30s */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/** Per-symbol live ticks with honest provenance (never assume provider from WS alone). */
export function useMultiLiveTicks(symbols: string[], enabled: boolean) {
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const syms = symbols.map((s) => s.toUpperCase()).join(',');

  useEffect(() => {
    if (!enabled || !symbols.length) return;
    const base = API_URL.replace(/^http/, 'ws');
    let alive = true;
    let ws: WebSocket | null = null;
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
        ws = new WebSocket(`${base}/ws/ticks`);
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
            if (!data.ticks) return;
            const source = parseWsDataSource(data);
            setTicks((prev) => {
              const next = { ...prev };
              for (const [sym, price] of Object.entries(data.ticks!)) {
                if (typeof price === 'number') {
                  next[sym.toUpperCase()] = { price, source };
                }
              }
              return next;
            });
          } catch {
            /* ignore */
          }
        };
        ws.onerror = () => {
          /* silent — onclose يتولى إعادة الاتصال */
        };
        ws.onclose = () => {
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      alive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [syms, enabled, symbols.length]);

  return ticks;
}
