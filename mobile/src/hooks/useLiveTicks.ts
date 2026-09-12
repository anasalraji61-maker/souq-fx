import { useEffect, useRef, useState } from 'react';
import { API_URL, type LiveTick } from '../api';
import { parseWsDataSource } from '../chart/dataSource';

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

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
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
        /* silent */
      };
    } catch {
      /* ignore */
    }

    return () => {
      alive = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sym, enabled]);

  return tick;
}
