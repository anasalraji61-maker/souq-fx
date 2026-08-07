import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../api';

/** Live ticks for multiple symbols (terminal frames). */
export function useMultiLiveTicks(symbols: string[], enabled: boolean) {
  const [ticks, setTicks] = useState<Record<string, number>>({});
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
          const data = JSON.parse(String(ev.data)) as { ticks?: Record<string, number> };
          if (data.ticks) setTicks((prev) => ({ ...prev, ...data.ticks }));
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
