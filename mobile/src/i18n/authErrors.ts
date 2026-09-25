import type { Dict } from './locales';

/**
 * نصّ رفض التسجيل من سببه الفعلي: الخادم يعيد 400 بـ`detail` نصّي (`db.register_user`/`_check_username`) و422 من
 * Pydantic بقائمة `{loc, msg}` (`AuthRegister` بـ`main.py`). كان كل رفض يُعرض كـ`registerError` الجامع — فمن اختار اسماً
 * محجوزاً أو إيميلاً مسجَّلاً يقرأ ستة أسباب محتملة ولا يعرف أيّها (backend-r47). سبب غير معروف أو بلا اتصال ⇒ الجامع.
 * `err` هو ما يرميه `postJson` (`api.ts`): `status` و`detail` على كائن الخطأ.
 */
export function registerErrorText(t: Dict, err: unknown): string {
  const e = (err ?? {}) as { status?: unknown; detail?: unknown };
  const fill = (s: string) => s.replace(/\{login\}/g, t.login).replace(/\{trader\}/g, t.trader);
  // `AccountScreen.submit` يرمي هذا قبل الطلب حين الاسم أو الإيميل فارغ — ليس انقطاعاً.
  if (err instanceof Error && err.message === 'missing fields') return t.regErrMissingFields;
  if (e.status === 400 && typeof e.detail === 'string') {
    const byDetail: Record<string, string> = {
      'username reserved': t.regErrReserved,
      'username has invisible or look-alike characters': t.regErrInvisible,
      'username has a link or @': t.regErrLink,
      'username or email taken': t.regErrUsernameTaken,
      'username taken': t.regErrUsernameTaken,
      'email taken': t.regErrEmailTaken,
      'invalid email': t.regErrInvalidEmail,
      'sponsor code not found': t.regErrSponsorNotFound,
    };
    const hit = byDetail[e.detail];
    if (hit) return fill(hit);
  }
  if (e.status === 422 && Array.isArray(e.detail)) {
    const loc = (e.detail[0] as { loc?: unknown } | undefined)?.loc;
    const field = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
    if (field === 'username') return t.regErrUsernameLength;
    if (field === 'password') return t.regErrPasswordLength;
    if (field === 'email') return t.regErrInvalidEmail;
    if (field === 'role') return fill(t.regErrRoleNotOpen);
  }
  return t.registerError;
}

/**
 * نصّ رفض الدخول: 401 `invalid credentials` (`db.login_user`) ⇒ بيانات خاطئة؛ حقل فارغ (`Error('missing identity')` من
 * `AccountScreen.submit` أو 400 `email or username required`) ⇒ اكتب الاسم؛ غير ذلك (شبكة، 5xx) ⇒ `loginError` «لم يصل الطلب».
 * كان كل رفض يقول «تحقّق من البيانات ومن اتصالك» فمن أخطأ كلمة المرور لا يعرف إن كان الخطأ منه أو من الشبكة.
 */
export function loginErrorText(t: Dict, err: unknown): string {
  if (err instanceof Error && err.message === 'missing identity') return t.loginErrMissing;
  const e = (err ?? {}) as { status?: unknown; detail?: unknown };
  if (e.status === 401) return t.loginErrCredentials;
  if (e.status === 400 && e.detail === 'email or username required') return t.loginErrMissing;
  return t.loginError;
}
