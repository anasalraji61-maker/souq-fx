/**
 * Browser error reporting → POST /api/client-errors (admin panel «الأعطال» tab).
 * Sends only the error type, message, stack and the page path (no query string, no user data).
 * Each distinct message is sent once per page load, at most 15 reports per page load.
 */

const API_BASE = ((import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE || '').replace(/\/$/, '');
const sent = new Set<string>();
let count = 0;
const MAX = 15;

// Noise from browser extensions, network blips and benign resize loops is not reported.
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /Failed to fetch/i, /NetworkError/i, /Load failed/i, /AbortError/i];

export function reportError(kind: string, message: string, stack?: string): void {
  try {
    const msg = (message || '').slice(0, 2000);
    if (!msg || IGNORE.some((r) => r.test(msg) || (stack ? r.test(stack) : false))) return;
    const key = `${kind}|${msg}`;
    if (sent.has(key) || count >= MAX) return;
    sent.add(key);
    count += 1;
    const body = JSON.stringify({
      kind: (kind || 'Error').slice(0, 80),
      message: msg,
      stack: (stack || '').slice(0, 8000),
      url: typeof location !== 'undefined' ? location.pathname : '',
    });
    const url = `${API_BASE}/api/client-errors`;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // reporting must never throw
  }
}

export function installErrorReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    const err = e.error as Error | undefined;
    reportError(err?.name || 'Error', err?.message || e.message || '', err?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as Error | string | undefined;
    if (r instanceof Error) reportError(r.name || 'UnhandledRejection', r.message, r.stack);
    else reportError('UnhandledRejection', String(r ?? ''));
  });
}
