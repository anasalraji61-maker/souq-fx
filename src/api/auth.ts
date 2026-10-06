/**
 * MATRIX accounts — thin wrappers over /api/auth/* (backend/main.py).
 * Successful register/login store the session (src/api/session.ts); every later API call then sends
 * the Bearer token, and the backend moves this device's guest rows (journal, alerts, drawings) to the account.
 */
import { apiClient } from './client';
import { clearSession, saveSession, SessionUser, getSessionUser, getToken } from './session';
import { tl } from '../i18n/locales';

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; message: string };

/** Backend error codes → Arabic messages for the user. */
export function authErrorAr(raw: string | null | undefined): string {
  const e = String(raw || '').toLowerCase();
  if (e.includes('invalid credentials')) return tl().mx2_badCreds;
  if (e.includes('email taken')) return tl().mx2_emailTaken;
  if (e.includes('username or email taken') || e.includes('username taken')) return tl().mx2_userTaken;
  if (e.includes('invalid email')) return tl().mx2_badEmail;
  if (e.includes('reserved')) return tl().mx2_reserved;
  if (e.includes('link or @')) return tl().mx2_noLinks;
  if (e.includes('invisible') || e.includes('look-alike')) return tl().mx2_badChars;
  if (e.includes('too short')) return tl().mx2_tooShort;
  if (e.includes('invalid current password')) return tl().mx2_badCurPw;
  if (e.includes('too many') || e.includes('locked') || e.includes('429')) return tl().mx2_tooMany;
  if (e.includes('timeout') || e.includes('network') || e.includes('failed to fetch')) return tl().mx2_noServer;
  return tl().mx2_unexpected;
}

function toUser(d: any): SessionUser {
  return { user_id: Number(d.user_id), username: String(d.username || ''), email: d.email ? String(d.email) : null };
}

export async function register(username: string, email: string, password: string): Promise<AuthResult> {
  const res = await apiClient.post<any>('/api/auth/register', {
    username: username.trim(),
    email: email.trim(),
    password,
    role: 'trader',
  });
  if (res.ok && res.data && res.data.token) {
    const user = toUser(res.data);
    saveSession(String(res.data.token), user);
    return { ok: true, user };
  }
  return { ok: false, message: authErrorAr(res.error) };
}

export async function login(identifier: string, password: string): Promise<AuthResult> {
  const id = identifier.trim();
  const body = id.includes('@') ? { email: id, password } : { username: id, password };
  const res = await apiClient.post<any>('/api/auth/login', body);
  if (res.ok && res.data && res.data.token) {
    const user = toUser(res.data);
    saveSession(String(res.data.token), user);
    return { ok: true, user };
  }
  return { ok: false, message: authErrorAr(res.status === 429 ? 'too many' : res.error) };
}

export async function logout(): Promise<void> {
  if (getToken()) {
    await apiClient.post('/api/auth/logout', {});
  }
  clearSession();
}

/** Re-validate the stored token (e.g. on app start). Returns the user, or null if signed out / expired. */
export async function refreshMe(): Promise<SessionUser | null> {
  if (!getToken()) return null;
  const res = await apiClient.get<any>('/api/auth/me');
  if (res.ok && res.data) {
    const user = toUser(res.data);
    const token = getToken();
    if (token) saveSession(token, user);
    return user;
  }
  if (res.status === 401) clearSession();
  return getSessionUser();
}

export async function changePassword(current: string, next: string): Promise<{ ok: boolean; message: string }> {
  const res = await apiClient.post<any>('/api/auth/password', { current_password: current, new_password: next });
  if (res.ok) return { ok: true, message: tl().mx2_pwChanged };
  return { ok: false, message: authErrorAr(res.error) };
}

/** Permanently delete the account (required by app stores). */
export async function deleteAccount(): Promise<{ ok: boolean; message: string }> {
  const res = await apiClient.delete<any>('/api/auth/account');
  if (res.ok) {
    clearSession();
    return { ok: true, message: tl().mx2_accDeleted };
  }
  return { ok: false, message: authErrorAr(res.error) };
}

/** Can the server send e-mail (password reset links)? Cached for the session. */
let emailAvailableCache: boolean | null = null;
export async function emailAvailable(): Promise<boolean> {
  if (emailAvailableCache !== null) return emailAvailableCache;
  const res = await apiClient.get<{ email?: boolean }>('/api/auth/email-status');
  emailAvailableCache = Boolean(res.ok && res.data?.email);
  return emailAvailableCache;
}

/** Ask for a password reset link. The server answers the same for unknown addresses (no account probing). */
export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
  const res = await apiClient.post<{ ok: boolean }>('/api/auth/forgot', { email: email.trim() });
  if (res.ok) {
    return {
      ok: true,
      message: tl().mx2_resetSent,
    };
  }
  if (res.status === 503) return { ok: false, message: tl().mx2_mailOff };
  if (res.status === 429) return { ok: false, message: tl().mx2_tooManyReq };
  return { ok: false, message: tl().mx2_sendFail };
}
