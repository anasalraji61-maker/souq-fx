/**
 * Self-test for notifications.ts — دوالّ الإذن لا ترفض أبداً (زرّ «تفعيل الإشعارات» لا يعلق على «…»).
 * Run: npx --yes tsx src/notifications.selftest.ts
 *
 * notifications.ts يستورد expo-notifications/expo-constants/react-native/AsyncStorage/api/locales — يُستبدل كلٌّ ببديل
 * صغير قبل التحميل (كـ`moderation.selftest.ts`)، فالمختبَر منطق الإذن وحده.
 */
import assert from 'node:assert/strict';
import Module from 'node:module';

type Perm = { status: string } | Error;
const state: { get: Perm; req: Perm; os: string; channels: number; requests: number } = {
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
  './i18n/locales': { DICTS: { ar: { notifChannelName: 'x', notifChannelDesc: 'y' } } },
};
const M = Module as unknown as { _load: (req: string, ...rest: unknown[]) => unknown };
const origLoad = M._load;
M._load = (req: string, ...rest: unknown[]) => (req in stubs ? stubs[req] : origLoad(req, ...rest));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getNotificationPermissionState, ensureAlertNotifications } = require('./notifications') as typeof import('./notifications');

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
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
