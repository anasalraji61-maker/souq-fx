import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../api';

/** Live tick stream from MATRIX backend (Twelve Data WS when connected). */
export function useLiveTicks(symbol: string, enabled: boolean) {
  const [last, setLast] = useState<number | null>(null);
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
          const data = JSON.parse(String(ev.data)) as { ticks?: Record<string, number> };
          const p = data.ticks?.[sym];
          if (typeof p === 'number') setLast(p);
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        /* fallback silent */
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

  return last;
}
