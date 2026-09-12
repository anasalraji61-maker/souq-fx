import { useEffect, useState } from 'react';
import { FRESH_TICK_SEC, isFreshTick } from '../chart/dataSource';

/**
 * يعيد رسم الواجهة دورياً طالما التيك يُعتبر «حياً»،
 * حتى تزول الشارة بعد انتهاء الحداثة دون رسالة WS جديدة.
 */
export function useTickFreshnessClock(asOf: number | null | undefined): number {
  const [, setBeat] = useState(0);
  const fresh = isFreshTick(asOf);

  useEffect(() => {
    if (!fresh || asOf == null) return;
    const id = setInterval(() => setBeat((n) => n + 1), 1000);
    const remainMs = Math.max(0, (FRESH_TICK_SEC - (Date.now() / 1000 - asOf)) * 1000);
    const stop = setTimeout(() => setBeat((n) => n + 1), remainMs + 50);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [fresh, asOf]);

  return Date.now();
}
