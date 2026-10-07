/**
 * Central API Client for MATRIX Terminal
 * All network calls must pass through this client.
 * Features:
 * - Base URL from import.meta.env.VITE_API_BASE (defaults to same origin "")
 * - 10-second timeout with AbortController
 * - Unified return type: { ok, data, error, status, isOffline }
 * - Never throws, never crashes
 * - Dispatches 'matrix:offline-status' events for reactive UI badges
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T | null;
  error: string | null;
  status: number;
  isOffline: boolean;
}

import { getInstallId, getToken, clearSession } from './session';
import { tl } from '../i18n/locales';

export const API_BASE = ((import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE || '').replace(/\/$/, '');
const TIMEOUT_MS = 10000;

// Track global backend reachability
let isCurrentlyOffline = false;
const listeners = new Set<(offline: boolean) => void>();

export function subscribeBackendStatus(listener: (offline: boolean) => void) {
  listeners.add(listener);
  listener(isCurrentlyOffline);
  return () => {
    listeners.delete(listener);
  };
}

function updateBackendStatus(offline: boolean) {
  if (isCurrentlyOffline !== offline) {
    isCurrentlyOffline = offline;
    listeners.forEach((fn) => fn(offline));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('matrix:backend-status', { detail: { isOffline: offline } })
      );
    }
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  // Identity: per-device install id (owner of personal rows) + Bearer token when signed in.
  if (!headers.has('X-Install-Id')) {
    headers.set('X-Install-Id', getInstallId());
  }
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If server responded with 404 or 5xx, mark offline fallback
    if (!res.ok) {
      // Expired / revoked session: forget it so the app continues as a guest instead of failing every call.
      if (res.status === 401 && token && !endpoint.includes('/api/auth/login')) {
        clearSession();
      }
      if (res.status === 404 || res.status >= 500) {
        updateBackendStatus(true);
      }
      let errMessage = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error || errJson?.detail) {
          errMessage = errJson.error || errJson.detail;
        }
      } catch {
        // ignore non-json error responses
      }

      return {
        ok: false,
        data: null,
        error: errMessage,
        status: res.status,
        isOffline: res.status === 404 || res.status >= 500,
      };
    }

    // Success response
    updateBackendStatus(false);
    const contentType = res.headers.get('content-type') || '';
    let data: unknown = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      ok: true,
      data: data as T,
      error: null,
      status: res.status,
      isOffline: false,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    updateBackendStatus(true);

    const isTimeout =
      err instanceof Error && err.name === 'AbortError' ||
      (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') ||
      (err as { name?: string } | null)?.name === 'AbortError';
    const errorMsg = isTimeout
      ? tl().mx2_timeout
      : tl().mx2_offline;

    return {
      ok: false,
      data: null,
      error: errorMsg,
      status: 0,
      isOffline: true,
    };
  }
}

// Method helpers
apiClient.get = <T = unknown>(endpoint: string, headers?: HeadersInit) =>
  apiClient<T>(endpoint, { method: 'GET', headers });

apiClient.post = <T = unknown>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
  apiClient<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

apiClient.patch = <T = unknown>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
  apiClient<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

apiClient.delete = <T = unknown>(endpoint: string, headers?: HeadersInit) =>
  apiClient<T>(endpoint, { method: 'DELETE', headers });
