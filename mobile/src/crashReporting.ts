import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/**
 * قرار أنس ١٣: تبليغ الأعطال الآلي (Sentry، الطبقة المجانية). بدونه انهيار التطبيق عند متداول لا
 * يصل خبره إلى أحد.
 *
 * **شرطا القرار:** لا بيانات شخصية ولا محتوى الدفتر في التقرير. لذلك:
 * - `sendDefaultPii: false`، ولا لقطة شاشة ولا شجرة عناصر ولا تتبّع أداء ولا إعادة جلسة.
 * - `beforeSend` يحذف المستخدم والطلب (ترويسات/كوكيز/جسم) و`extra`، ويقصّ نصّ الخطأ.
 * - `beforeBreadcrumb` يُسقط سجلّ الكونسول واللمس والإدخال (قد يحمل وصف زرّ أو نصّاً كتبه
 *   المتداول)، ويُبقي من طلبات الشبكة الطريقة والمسار ورمز الحالة وحدها — بلا نطاق ولا استعلام.
 *
 * **بلا مفتاح لا شيء يحدث:** `EXPO_PUBLIC_SENTRY_DSN` من بيئة البناء (لا يُكتب بالمستودع). غيابه
 * = لا تهيئة ولا طلب شبكة. رفع خرائط المصدر (إضافة `@sentry/react-native` بـ`app.json` +
 * `SENTRY_AUTH_TOKEN`) يُضاف حين يُنشأ الحساب — بدون الرمز كانت ستُفشل بناء EAS.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** نصّ الخطأ يُقصّ هنا — سطر يدلّ على العطل، لا مساحة لنصّ طويل نسخه الخطأ من مدخلات المتداول. */
const MESSAGE_MAX = 200;

/** فئات الأثر التي قد تحمل نصّاً من المتداول (سجلّ، وصف زرّ، حقل إدخال) — تُسقط كلها. */
const DROPPED_BREADCRUMBS = new Set(['console', 'touch', 'ui.input', 'ui.click', 'ui.textinput']);

let started = false;

function clip(text: string | undefined): string | undefined {
  if (text == null) return text;
  return text.length > MESSAGE_MAX ? `${text.slice(0, MESSAGE_MAX - 1)}…` : text;
}

/** «https://host/api/trades/7?x=1» ⇒ «/api/trades/7». */
function pathOnly(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const noQuery = url.split(/[?#]/)[0];
  const m = noQuery.match(/^[a-z]+:\/\/[^/]+(\/.*)?$/i);
  return m ? m[1] || '/' : noQuery;
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category && DROPPED_BREADCRUMBS.has(crumb.category)) return null;
  if (crumb.type === 'http' || crumb.category === 'fetch' || crumb.category === 'xhr') {
    const d = crumb.data ?? {};
    return {
      ...crumb,
      message: undefined,
      data: { method: d.method, url: pathOnly(d.url), status_code: d.status_code },
    };
  }
  return { ...crumb, message: clip(crumb.message) };
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.server_name;
  event.message = clip(event.message);
  for (const ex of event.exception?.values ?? []) ex.value = clip(ex.value);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b != null);
  }
  return event;
}

/** يُستدعى مرة واحدة قبل تركيب التطبيق (`index.ts`). */
export function initCrashReporting(): void {
  if (started || !DSN) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 30,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
}

/** خطأ عرضٍ التقطه `AppErrorBoundary` (لا يصل إلى المعالج العام وحده). */
export function reportError(error: unknown): void {
  if (!started) return;
  Sentry.captureException(error);
}
