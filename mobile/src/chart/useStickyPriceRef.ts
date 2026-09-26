import { useRef } from 'react';
import { stickyPriceRef } from './indicators/utils';

/**
 * مرجع منازل السعر لرمز بلا مواصفة، ثابت ما دام الرمز نفسه (`stickyPriceRef`). الشارت ورأس الإطار
 * يستعملانه معاً فلا يطبع الرأس «100.01» والمحور «99.980» على الرمز نفسه.
 */
export function useStickyPriceRef(symbol: string | null | undefined, last: number | null | undefined): number | null {
  const state = useRef<{ symbol: string | null | undefined; ref: number | null }>({ symbol: undefined, ref: null });
  const ref = stickyPriceRef(state.current.symbol === symbol ? state.current.ref : null, last);
  state.current = { symbol, ref };
  return ref;
}
