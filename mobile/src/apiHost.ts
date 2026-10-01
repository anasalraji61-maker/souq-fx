/**
 * عنوان خادم MATRIX — دالّة نقيّة (launch210a، قرار أنس «عنوان الخادم يُكتشف تلقائياً»).
 * عنوان اللابتوب يتغيّر مع كل انقطاع كهرباء (DHCP)، فالعنوان المكتوب بـ`app.json` كان يُفرغ الشارتات الأربعة.
 * الترتيب (`docs/RELEASE-MOBILE.md` §0):
 *   1. `EXPO_PUBLIC_API_URL` صراحةً — يتقدّم على كل ما بعده.
 *   2. الويب: مضيف الصفحة نفسه + `:8110` (`localhost` ⇒ `127.0.0.1`).
 *   3. الهاتف بالتطوير: مضيف Metro (`hostUri` = «192.168.8.102:8081») + `:8110`؛ غائب بالبناء المستقلّ.
 *   4. `extra.apiUrl` احتياطاً، ثم `http://127.0.0.1:8110`.
 */
export const API_PORT = 8110;
const FALLBACK = `http://127.0.0.1:${API_PORT}`;

export type ApiHostInputs = {
  envUrl?: string | null;
  /** `window.location.hostname` على الويب فقط؛ undefined على الهاتف. */
  webHostname?: string | null;
  /** `Constants.expoConfig?.hostUri` — مضيف Metro بالتطوير. */
  hostUri?: string | null;
  extraApiUrl?: string | null;
};

function withPort(host: string): string {
  const h = host === 'localhost' ? '127.0.0.1' : host;
  // IPv6 بلا أقواس («::1») يحتاجها داخل URL
  const bracketed = h.includes(':') && !h.startsWith('[') ? `[${h}]` : h;
  return `http://${bracketed}:${API_PORT}`;
}

/** «192.168.8.102:8081» أو «[fe80::1]:8081/--/x» ⇒ المضيف وحده؛ null إن لم يصلح. */
export function hostFromHostUri(hostUri: string): string | null {
  const s = hostUri.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0];
  if (!s) return null;
  if (s.startsWith('[')) {
    const end = s.indexOf(']');
    return end > 1 ? s.slice(0, end + 1) : null;
  }
  const host = s.split(':')[0];
  if (!host) return null;
  // نفق Expo (`--tunnel`: ‎*.exp.direct) يمرّر منفذ Metro وحده — :8110 على النفق لا يصل.
  if (/(^|\.)exp\.direct$|(^|\.)expo\.(dev|io)$/i.test(host)) return null;
  return host;
}

export function resolveApiHost({ envUrl, webHostname, hostUri, extraApiUrl }: ApiHostInputs): string {
  const env = (envUrl ?? '').trim().replace(/\/+$/, '');
  if (env) return env;
  const web = (webHostname ?? '').trim();
  if (web) return withPort(web);
  const metro = hostUri ? hostFromHostUri(hostUri) : null;
  if (metro) return withPort(metro);
  const extra = (extraApiUrl ?? '').trim().replace(/\/+$/, '');
  return extra || FALLBACK;
}
