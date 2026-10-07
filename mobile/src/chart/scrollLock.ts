import { createContext } from 'react';

/**
 * A chart being dragged tells the page around it to stop scrolling until the finger lifts.
 * On iPhone (and some Android phones) the page's ScrollView otherwise takes over the touch after a few
 * pixels and the candles never move. Default: no page to lock.
 */
export const ChartScrollLockContext = createContext<(locked: boolean) => void>(() => {});
