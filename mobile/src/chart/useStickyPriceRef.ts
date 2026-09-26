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

/** `useStickyPriceRef` لقائمة رموز (خلايا الرباعي) — مرجع ثابت لكل رمز ما دام بالقائمة. */
export function useStickyPriceRefs(
  symbols: readonly string[],
  lasts: readonly (number | null | undefined)[]
): (number | null)[] {
  const state = useRef(new Map<string, number | null>());
  const next = new Map<string, number | null>();
  const refs = symbols.map((sym, i) => {
    const ref = stickyPriceRef(next.get(sym) ?? state.current.get(sym) ?? null, lasts[i]);
    next.set(sym, ref);
    return ref;
  });
  state.current = next;
  return refs;
}
