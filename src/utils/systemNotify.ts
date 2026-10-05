/**
 * System-level notifications for triggered price alerts.
 *
 * Order of preference:
 *  1. MATRIX Desktop (Electron) bridge: window.matrixDesktop.notify — works while the window is hidden in the tray.
 *  2. Installed PWA / browser: service-worker showNotification (works on Android when the app is in background),
 *     falling back to the plain Notification API.
 * Nothing is shown if the user has not granted permission; the in-app banner + sound still work.
 */

type DesktopBridge = {
  isDesktop?: boolean;
  notify?: (title: string, body: string, opts?: { silent?: boolean }) => Promise<boolean>;
};

function desktopBridge(): DesktopBridge | null {
  const w = window as unknown as { matrixDesktop?: DesktopBridge };
  return w.matrixDesktop && typeof w.matrixDesktop.notify === 'function' ? w.matrixDesktop : null;
}

export function systemNotificationsSupported(): boolean {
  return Boolean(desktopBridge()) || (typeof window !== 'undefined' && 'Notification' in window);
}

export function systemNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (desktopBridge()) return 'granted';
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Ask once, from a user action (e.g. when the first alert is created). Never throws. */
export async function requestSystemNotifications(): Promise<boolean> {
  try {
    if (desktopBridge()) return true;
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Show a system notification. Safe to call anywhere; silently does nothing when not allowed. */
export async function showSystemNotification(title: string, body: string, tag?: string): Promise<void> {
  const t = String(title).slice(0, 120);
  const b = String(body).slice(0, 400);
  try {
    const bridge = desktopBridge();
    if (bridge && bridge.notify) {
      await bridge.notify(t, b);
      return;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options: NotificationOptions = { body: b, tag, icon: '/icon-192.png', badge: '/icon-192.png', lang: 'ar', dir: 'rtl' };
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(t, options);
        return;
      }
    }
    new Notification(t, options);
  } catch {
    // notifications are best-effort; the in-app banner already informed the user
  }
}

/** Arabic text for a triggered price alert. */
export function alertNotificationText(symbol: string, condition: string, target: number, price: number) {
  const dir: Record<string, string> = {
    above: 'تجاوز',
    greater_than: 'تجاوز',
    crosses_up: 'اخترق صعوداً',
    below: 'نزل تحت',
    less_than: 'نزل تحت',
    crosses_down: 'اخترق هبوطاً',
    crosses: 'لامس',
  };
  return {
    title: `تنبيه سعري: ${symbol}`,
    body: `${symbol} ${dir[condition] || 'وصل'} ${target} — السعر الآن ${price}`,
  };
}
