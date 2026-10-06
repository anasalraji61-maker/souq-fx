/**
 * Client identity for the MATRIX backend.
 *  - Install id: random per-device id sent as X-Install-Id. The backend uses it as the owner of
 *    personal rows (journal, alerts, drawings, layouts) for users who are not signed in, and moves
 *    those rows to the account automatically after sign-in.
 *  - Session token: Bearer token from /api/auth/login|register, kept in localStorage.
 * Every read/write is wrapped in try/catch: storage can be blocked (private mode) and the app must still work.
 */

const INSTALL_KEY = 'matrix.install.v1';
const TOKEN_KEY = 'matrix.session.token';
const USER_KEY = 'matrix.session.user';

export interface SessionUser {
  user_id: number;
  username: string;
  email: string | null;
}

let memoryInstallId: string | null = null;
let memoryToken: string | null = null;

function randomId(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.padEnd(24, '0').slice(0, 32);
  }
}

export function getInstallId(): string {
  if (memoryInstallId) return memoryInstallId;
  try {
    const saved = localStorage.getItem(INSTALL_KEY);
    if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) {
      memoryInstallId = saved;
      return saved;
    }
  } catch {
    // storage unavailable — keep an in-memory id for this tab
  }
  const id = randomId();
  memoryInstallId = id;
  try {
    localStorage.setItem(INSTALL_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('matrix:session-changed', { detail: { user: getSessionUser() } }));
  }
}

export function saveSession(token: string, user: SessionUser) {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // token stays in memory for this tab
  }
  emitChange();
}

export function clearSession() {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  emitChange();
}

/** Subscribe to sign-in / sign-out changes (this tab and other tabs). Returns an unsubscribe function. */
export function onSessionChange(listener: (user: SessionUser | null) => void): () => void {
  const local = () => listener(getSessionUser());
  const storage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY) {
      memoryToken = null;
      listener(getSessionUser());
    }
  };
  window.addEventListener('matrix:session-changed', local);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener('matrix:session-changed', local);
    window.removeEventListener('storage', storage);
  };
}

/**
 * Many screens call fetch('/api/...') directly instead of apiClient. Wrap window.fetch once so every
 * same-origin /api request carries the same identity headers (install id + Bearer token).
 * Requests to other hosts are untouched.
 */
let fetchPatched = false;
export function installIdentityFetch(apiBase = '') {
  if (fetchPatched || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  const base = apiBase.replace(/\/$/, '');
  const isApi = (url: string) => {
    if (url.startsWith('/api/')) return true;
    if (base && url.startsWith(`${base}/api/`)) return true;
    try {
      const u = new URL(url, window.location.href);
      return u.origin === window.location.origin && u.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  };
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!isApi(url)) return original(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('X-Install-Id')) headers.set('X-Install-Id', getInstallId());
    const token = getToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return original(input, { ...init, headers });
  };
}
