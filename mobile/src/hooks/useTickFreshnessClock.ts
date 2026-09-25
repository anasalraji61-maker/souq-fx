import { useEffect, useState } from 'react';
import { FRESH_TICK_SEC, isFreshTick, serverNowSec } from '../chart/dataSource';

/**
 * يعيد رسم الواجهة دورياً طالما التيك يُعتبر «حياً»،
 * حتى تزول الشارة بعد انتهاء الحداثة دون رسالة WS جديدة.
 * الوقت بساعة الخادم (`serverNowSec`، chart-r46) لا الجهاز: `asOf` طابع الخادم، وجهاز متقدّم/متأخّر
 * كان يُخفي «حي» مبكراً أو يُبقيها بعد تجمّد التيك. الإرجاع أيضاً بالمللي ثانية بساعة الخادم.
 */
export function useTickFreshnessClock(asOf: number | null | undefined): number {
  const [, setBeat] = useState(0);
  const fresh = isFreshTick(asOf);

  useEffect(() => {
    if (!fresh || asOf == null) return;
    const id = setInterval(() => setBeat((n) => n + 1), 1000);
    const remainMs = Math.max(0, (FRESH_TICK_SEC - (serverNowSec() - asOf)) * 1000);
    const stop = setTimeout(() => setBeat((n) => n + 1), remainMs + 50);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [fresh, asOf]);

  return serverNowSec() * 1000;
}
