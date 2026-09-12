import { useEffect, useRef, useState } from 'react';
import { API_URL, type LiveTick } from '../api';
import { parseWsDataSource } from '../chart/dataSource';

/** إعادة اتصال تدريجية (exponential backoff) عند انقطاع WS — 1s..30s */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/** Live tick for one symbol with provenance. */
export function useLiveTicks(symbol: string, enabled: boolean): LiveTick | null {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const sym = symbol.toUpperCase();
  const wsRef = useRef<WebSocket | null>(null);

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
            const p = data.ticks?.[sym];
            if (typeof p === 'number') {
              setTick({ price: p, source: parseWsDataSource(data) });
            }
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
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sym, enabled]);

  return tick;
}
