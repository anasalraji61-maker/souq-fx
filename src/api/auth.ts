/**
 * MATRIX accounts — thin wrappers over /api/auth/* (backend/main.py).
 * Successful register/login store the session (src/api/session.ts); every later API call then sends
 * the Bearer token, and the backend moves this device's guest rows (journal, alerts, drawings) to the account.
 */
import { apiClient } from './client';
import { clearSession, saveSession, SessionUser, getSessionUser, getToken } from './session';

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; message: string };

/** Backend error codes → Arabic messages for the user. */
export function authErrorAr(raw: string | null | undefined): string {
  const e = String(raw || '').toLowerCase();
  if (e.includes('invalid credentials')) return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  if (e.includes('email taken')) return 'هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.';
  if (e.includes('username or email taken') || e.includes('username taken')) return 'اسم المستخدم أو البريد مستخدم مسبقاً.';
  if (e.includes('invalid email')) return 'البريد الإلكتروني غير صالح.';
  if (e.includes('reserved')) return 'اسم المستخدم هذا محجوز، اختر اسماً آخر.';
  if (e.includes('link or @')) return 'اسم المستخدم لا يقبل روابط أو الرمز @.';
  if (e.includes('invisible') || e.includes('look-alike')) return 'اسم المستخدم يحتوي أحرفاً غير مسموحة.';
  if (e.includes('too short')) return 'اسم المستخدم 3 أحرف على الأقل، وكلمة المرور 8 أحرف على الأقل.';
  if (e.includes('invalid current password')) return 'كلمة المرور الحالية غير صحيحة.';
  if (e.includes('too many') || e.includes('locked') || e.includes('429')) return 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.';
  if (e.includes('timeout') || e.includes('network') || e.includes('failed to fetch')) return 'تعذّر الاتصال بالخادم. تحقّق من الإنترنت.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
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
  if (res.ok) return { ok: true, message: 'تم تغيير كلمة المرور. خرجت الأجهزة الأخرى من حسابك.' };
  return { ok: false, message: authErrorAr(res.error) };
}

/** Permanently delete the account (required by app stores). */
export async function deleteAccount(): Promise<{ ok: boolean; message: string }> {
  const res = await apiClient.delete<any>('/api/auth/account');
  if (res.ok) {
    clearSession();
    return { ok: true, message: 'تم حذف الحساب وكل بياناته نهائياً.' };
  }
  return { ok: false, message: authErrorAr(res.error) };
}
