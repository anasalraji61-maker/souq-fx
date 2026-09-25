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
  if (e.status === 400 && typeof e.detail === 'string') {
    const byDetail: Record<string, string> = {
      'username reserved': t.regErrReserved,
      'username has invisible or look-alike characters': t.regErrInvisible,
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
