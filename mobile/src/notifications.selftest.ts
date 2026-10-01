/**
 * Self-test for notifications.ts — دوالّ الإذن لا ترفض أبداً (زرّ «تفعيل الإشعارات» لا يعلق على «…»).
 * Run: npx --yes tsx src/notifications.selftest.ts
 *
 * notifications.ts يستورد expo-notifications/expo-constants/react-native/AsyncStorage/api/locales — يُستبدل كلٌّ ببديل
 * صغير قبل التحميل (كـ`moderation.selftest.ts`)، فالمختبَر منطق الإذن وحده.
 */
import assert from 'node:assert/strict';
import Module from 'node:module';
// القاعدة الحقيقية لا بديل: `notifLang` يجب أن يكون `resolveLang` نفسه (QA41)، فالبديل يُخفي أي انحراف.
import { resolveLang, deviceLocaleTag } from './i18n/locales';

type Perm = { status: string } | Error;
const state: {
  get: Perm;
  req: Perm;
  os: string;
  channels: number;
  requests: number;
  token: () => Promise<{ data: string }>;
} = {
  token: () => Promise.resolve({ data: 'ExponentPushToken[x]' }),
  get: { status: 'undetermined' },
  req: { status: 'granted' },
  os: 'android',
  channels: 0,
  requests: 0,
};
const settle = (p: Perm) => (p instanceof Error ? Promise.reject(p) : Promise.resolve(p));
const stubs: Record<string, unknown> = {
  'expo-notifications': {
    setNotificationHandler: () => undefined,
    getPermissionsAsync: () => settle(state.get),
    requestPermissionsAsync: () => {
      state.requests += 1;
      return settle(state.req);
    },
    getExpoPushTokenAsync: () => state.token(),
    setNotificationChannelAsync: () => {
      state.channels += 1;
      return Promise.resolve();
    },
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
    AndroidNotificationPriority: { HIGH: 'high' },
  },
  'expo-constants': { default: {} },
  'react-native': {
    Platform: {
      get OS() {
        return state.os;
      },
    },
  },
  '@react-native-async-storage/async-storage': { default: { getItem: () => Promise.resolve(null) } },
  './api': { api: {} },
  './i18n/locales': {
    DICTS: {
      ar: { notifChannelName: 'x', notifChannelDesc: 'y' },
      'en-US': { notifChannelName: 'Price alerts', notifChannelDesc: 'y' },
      'en-GB': { notifChannelName: 'Price alerts', notifChannelDesc: 'y' },
      ku: { notifChannelName: 'k', notifChannelDesc: 'y' },
    },
    resolveLang,
    deviceLocaleTag,
  },
};
const M = Module as unknown as { _load: (req: string, ...rest: unknown[]) => unknown };
const origLoad = M._load;
M._load = (req: string, ...rest: unknown[]) => (req in stubs ? stubs[req] : origLoad(req, ...rest));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getNotificationPermissionState, ensureAlertNotifications, notifLang, currentPushToken, PUSH_TOKEN_TIMEOUT_MS } =
  require('./notifications') as typeof import('./notifications');

// وعدٌ لا يعود يُفرغ حلقة الأحداث فيخرج Node بصمت ورمز 0 — الاختبار يفشل إن لم يبلغ نهايته
let finished = false;
process.on('exit', () => {
  if (!finished) {
    console.error('notifications selftest did not finish (a promise never settled)');
    process.exitCode = 1;
  }
});

(async () => {
  // الحالات الثلاث كما هي
  for (const [s, want] of [
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['undetermined', 'undetermined'],
  ] as const) {
    state.get = { status: s };
    assert.equal(await getNotificationPermissionState(), want);
  }
  // رفضٌ من النظام ⇒ 'unsupported' لا استثناء (كان يُبقي الزرّ على «…»)
  state.get = new Error('no play services');
  assert.equal(await getNotificationPermissionState(), 'unsupported');
  // الويب ⇒ 'unsupported' بلا سؤال
  state.os = 'web';
  state.get = { status: 'granted' };
  assert.equal(await getNotificationPermissionState(), 'unsupported');
  assert.equal(await ensureAlertNotifications(), false);
  state.os = 'android';

  // ممنوح مسبقاً ⇒ true بلا سؤال ثانٍ
  state.requests = 0;
  state.get = { status: 'granted' };
  assert.equal(await ensureAlertNotifications(), true);
  assert.equal(state.requests, 0);
  // غير ممنوح ⇒ القناة قبل السؤال، والنتيجة نتيجة السؤال
  state.get = { status: 'undetermined' };
  state.req = { status: 'granted' };
  assert.equal(await ensureAlertNotifications(), true);
  assert.ok(state.channels >= 1, 'القناة تُنشأ قبل السؤال');
  assert.equal(state.requests, 1);
  state.req = { status: 'denied' };
  assert.equal(await ensureAlertNotifications(), false);
  // رفضٌ بقراءة الإذن أو بالسؤال ⇒ false لا استثناء
  state.get = new Error('boom');
  assert.equal(await ensureAlertNotifications(), false);
  state.get = { status: 'undetermined' };
  state.req = new Error('boom');
  assert.equal(await ensureAlertNotifications(), false);

  console.log('notifications permission never-rejects selftest OK');

  // رمز Push: يعود كما هو، ورفضٌ ⇒ null، و**جلبٌ لا يعود أبداً ⇒ null بعد الحدّ** (كان يعلّق زرّ «تفعيل الإشعارات» على «…» للأبد)
  state.get = { status: 'granted' };
  assert.equal(await currentPushToken(), 'ExponentPushToken[x]');
  state.token = () => Promise.reject(new Error('fcm'));
  assert.equal(await currentPushToken(), null);
  state.token = () => new Promise(() => undefined);
  const t0 = Date.now();
  assert.equal(await currentPushToken(), null);
  const waited = Date.now() - t0;
  assert.ok(waited >= PUSH_TOKEN_TIMEOUT_MS - 50 && waited < PUSH_TOKEN_TIMEOUT_MS + 2000, `waited ${waited}ms`);
  // إذن غير ممنوح ⇒ null بلا جلب
  state.get = { status: 'denied' };
  state.token = () => Promise.reject(new Error('must not fetch'));
  assert.equal(await currentPushToken(), null);
  state.token = () => Promise.resolve({ data: 'ExponentPushToken[x]' });
  console.log('notifications push-token timeout selftest OK');

  // notifLang — المحفوظ إن كان مدعوماً، وإلا لغة الجهاز بقاعدة deviceLang (هاتف إنجليزي بلا اختيار كان يستقبل التنبيهات بالعربية)
  assert.equal(notifLang(null, 'en-US'), 'en-US');
  assert.equal(notifLang(undefined, 'en-AU'), 'en-US');
  assert.equal(notifLang(null, 'en-GB'), 'en-GB');
  assert.equal(notifLang(null, 'ckb-IQ'), 'ku');
  assert.equal(notifLang(null, 'ku'), 'ku');
  assert.equal(notifLang(null, 'ar-IQ'), 'ar');
  assert.equal(notifLang(null, 'fr-FR'), 'ar');
  assert.equal(notifLang(null, undefined), 'ar');
  // الاختيار الصريح يغلب لغة الجهاز؛ قيمة تالفة لا تُرسل للخادم
  assert.equal(notifLang('ar', 'en-US'), 'ar');
  assert.equal(notifLang('en-GB', 'ar-IQ'), 'en-GB');
  assert.equal(notifLang('xx', 'en-US'), 'en-US');
  // QA41: لا نسخة ثانية من القاعدة — الدالّة نفسها التي تقرأ بها الواجهة (`I18nContext`) لغتها
  assert.equal(notifLang, resolveLang);
  console.log('notifications notifLang selftest OK');
  finished = true;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
