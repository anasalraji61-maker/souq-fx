import { useEffect, useState } from 'react';
import { API_URL, type LiveTick } from '../api';
import { parseWsDataSource } from '../chart/dataSource';

/** Per-symbol live ticks with honest provenance (never assume provider from WS alone). */
export function useMultiLiveTicks(symbols: string[], enabled: boolean) {
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const syms = symbols.map((s) => s.toUpperCase()).join(',');

  useEffect(() => {
    if (!enabled || !symbols.length) return;
    const base = API_URL.replace(/^http/, 'ws');
    let alive = true;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${base}/ws/ticks`);
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
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
      ws?.close();
    };
  }, [syms, enabled, symbols.length]);

  return ticks;
}
