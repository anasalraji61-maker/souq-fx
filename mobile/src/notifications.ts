import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { DICTS, LangId, resolveLang, deviceLocaleTag, LANG_STORAGE_KEY } from './i18n/locales';

/** مفتاح لغة الواجهة المحفوظ — الثابت نفسه الذي يكتبه `i18n/I18nContext.tsx` لا نسخة حرفية منه، فتغيير
 * المفتاح هناك لا يترك الإشعارات تقرأ مفتاحاً قديماً (لغة الجهاز بدل اختيار المتداول). */
const LANG_KEY = LANG_STORAGE_KEY;

/**
 * لغة الإشعارات = لغة الواجهة المعروضة: القاعدة نفسها `resolveLang` (`i18n/locales.ts`) لا نسخة منها —
 * المحفوظ إن كان مدعوماً وإلا لغة الجهاز. هاتف إنجليزي لم يفتح زرّ اللغة كان يستقبل التنبيهات بالعربية
 * (`_push_lang(None)` ⇒ ar) والواجهة إنجليزية؛ نسختان من القاعدة تعيدان هذا التناقض عند أول تعديل لإحداهما.
 */
export const notifLang: (saved: string | null | undefined, deviceTag: string | undefined) => LangId = resolveLang;

async function savedLang(): Promise<LangId> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(LANG_KEY);
  } catch {
    /* تخزين معطَّل: لغة الجهاز كما تفعل الواجهة */
  }
  return notifLang(saved, deviceLocaleTag());
}

/**
 * قناة إشعارات أندرويد لتنبيهات الأسعار والمؤشرات.
 *
 * **بلا قناة صريحة** كان كل إشعار تنبيه — المحلي (`pushPriceAlert`) والقادم من الخادم معاً — يسقط
 * بقناة `expo-notifications` الاحتياطية المسمّاة «Miscellaneous» بأهمية افتراضية: لا ظهور فوق
 * الشاشة (heads-up)، واسمٌ إنجليزي لا معنى له بإعدادات إشعارات النظام، فمن أراد ضبط صوت تنبيهات
 * الأسعار وحدها لا يجد لها مدخلاً. وتنبيه السعر بالذات لا قيمة له متأخراً: مستوى بلغه السوق ومرّ
 * ليس خبراً يُقرأ بعد ساعة من درج الإشعارات.
 *
 * القناة تُنشأ **بلا أي إذن** (إنشاء القناة لا يستلزم إذن الإشعارات بأندرويد) فتُنادى عند الإقلاع،
 * واسمها ووصفها بلغة الواجهة المحفوظة — ومناداتها ثانيةً بالمعرّف نفسه **تحدّث** الاسم والوصف، فتغيير
 * اللغة يظهر بإعدادات النظام فوراً: `setLang` (`I18nContext.tsx`) ينادي `ensureAlertChannel(true)` بعد حفظ
 * اللغة (ومعه `registerPushToken()` كي تتبعها لغة إشعارات الخادم أيضاً). الأهمية نفسها لا يخفضها إلا المتداول من النظام،
 * وهذا مقصود: قراره يبقى له.
 */
export const ALERT_CHANNEL_ID = 'matrix-alerts';

let channelPromise: Promise<void> | null = null;

async function createAlertChannel(): Promise<void> {
  try {
    const t = DICTS[await savedLang()] || DICTS.ar;
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
      name: t.notifChannelName,
      description: t.notifChannelDesc,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: '#2DD4BF',
      // السعر والرمز يظهران على شاشة القفل عمداً: تنبيه يُقرأ بنظرة هو كل غرضه، وليس ببياناته
      // شيء شخصي (رمز ومستوى سعر من سوق علني).
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    /* جهاز/بيئة بلا قنوات (أندرويد قديم، ويب) — الإشعار يبقى يعمل بالقناة الافتراضية */
  }
}

/** يضمن وجود القناة. `refresh` يعيد الإنشاء (تحديث الاسم بعد تغيّر اللغة) بدل النتيجة المخزَّنة. */
export function ensureAlertChannel(refresh = false): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelPromise || refresh) channelPromise = createAlertChannel();
  return channelPromise;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * **القناة قبل السؤال.** بأندرويد 13+ لا يعرض النظام نافذة إذن الإشعارات ما لم توجد قناة واحدة على
 * الأقل — و`App.tsx` ينشئ القناة عند الإقلاع **بلا انتظار** (يقرأ اللغة من التخزين أولاً)، بينما لوح
 * التنبيهات يسأل عن الإذن **عند تركيبه**. فمن يفتح التطبيق وتبويبه المحفوظ «التنبيهات» يقع السؤال
 * قبل القناة: لا نافذة، والإذن يبقى غير ممنوح، فلا يصله إشعار تنبيه واحد. انتظار الوعد نفسه
 * (`ensureAlertChannel` تخزّنه) لا يكلّف شيئاً حين تكون القناة جاهزة.
 */
export async function ensureAlertNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // **لا ترفض أبداً** (كـ`getNotificationPermissionState` أدناه): اللوحتان تناديانها بـ`.then` بلا `catch`،
  // ورفضٌ من `expo-notifications` (Expo Go، أندرويد بلا خدمات) كان يترك زرّ التفعيل على «…». رفضٌ = لا إذن.
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    await ensureAlertChannel();
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** حالة إذن الإشعارات الحالية — لعرض زر تفعيل/تعطيل واضح بالإعدادات بدل الاعتماد
 * على نافذة نظام التشغيل الافتراضية فقط (بند 9 من قائمة الإطلاق، docs/ROADMAP.md).
 *
 * **لا ترفض أبداً**: `AccountScreen` يناديها بـ`.then` بلا `catch` وداخل `finally` قبل `setNotifBusy(false)` — رفضٌ
 * من `getPermissionsAsync` (Expo Go، أندرويد بلا خدمات Google) كان يُبقي زرّ «تفعيل الإشعارات» على «…» للأبد.
 * حالةٌ لا تُقرأ = `'unsupported'`: الواجهة تقول إن الإشعارات غير متاحة هنا وتُخفي زرّاً لن يعمل. */
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

/**
 * تسجيل توكن الدفع بالخادم — **بلا استدراج نافذة الإذن**. كانت الدالة تنادي
 * `ensureAlertNotifications()` بنفسها، وهي تنادي `requestPermissionsAsync`؛ ومناداتها من
 * `App.tsx` عند الإقلاع كانت تعني أن **أول ما يراه المتداول بأول فتح للتطبيق نافذةُ نظامٍ تطلب
 * إذن الإشعارات** — فوق الجولة الترحيبية التي تُركَّب باللحظة نفسها، وقبل أن يعرف أن بالتطبيق
 * تنبيهات أسعار أصلاً. وiOS يسأل **مرة واحدة بالعمر**: رفضٌ هنا يعني أن كل تنبيه سعر يضعه
 * المتداول لاحقاً لن يصله إشعار، ولا سبيل لإعادة السؤال إلا بإرساله لإعدادات النظام.
 * السؤال يقع الآن حيث يعني شيئاً وحسب: لوح التنبيهات عند فتحه، وزرّ «تفعيل الإشعارات» بالحساب —
 * وكلاهما ينادي `ensureAlertNotifications()` صراحةً قبل التسجيل. وما عداهما (الإقلاع، وتسجيل
 * الدخول/إنشاء الحساب) يسجّل التوكن إن كان الإذن ممنوحاً من قبل، وإلا لا يفعل شيئاً.
 */
export async function registerPushToken(): Promise<void> {
  const token = await currentPushToken();
  if (!token) return;
  try {
    await api.registerPush(token, Platform.OS, await savedLang());
  } catch {
    /* الخادم غير متاح — التنبيهات المحلية تعمل */
  }
}

/** أقصى انتظار لـ`getExpoPushTokenAsync`: رحلة لخادم Expo ثم FCM، وقد **لا تعود أبداً** (شبكة متقطّعة،
 * أندرويد بلا خدمات Google). بلا حدّ كان `registerPushToken` معلّقاً للأبد، ومعه زرّ «تفعيل الإشعارات»
 * على «…» وسطر حالة الإذن بلوحة التنبيهات (كلاهما ينتظر التسجيل قبل قراءة الحالة). */
export const PUSH_TOKEN_TIMEOUT_MS = 10_000;

/**
 * رمز Push لهذا الجهاز إن كان الإذن ممنوحاً سلفاً (لا يسأل عنه)، وإلا `null`. يُستعمل للتسجيل وللخروج
 * (`api.logout` يفكّه من الحساب). `getPermissionsAsync` قد يرفض بحالات أندرويد/Expo Go، وExpo Go قد
 * يفتقد `projectId` — كلاهما `null` بلا استثناء طائر. وجلبٌ لا يعود خلال `PUSH_TOKEN_TIMEOUT_MS` ⇒ `null`.
 */
export async function currentPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return null;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { projectId?: string })?.projectId;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tokenData = await Promise.race([
      Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), PUSH_TOKEN_TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));
    return tokenData?.data || null;
  } catch {
    return null;
  }
}

export async function pushPriceAlert(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ensureAlertChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        // أندرويد 7 وما دونه لا يعرف القنوات — الأولوية هناك هي ما يصنع الظهور فوق الشاشة
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#2DD4BF',
      },
      // `{ channelId }` هو مشغّل «فوري على هذه القناة» بأندرويد، وبـiOS يترجمه
      // `expo-notifications` إلى `null` أي فوري كما كان بالضبط (`parseTrigger`).
      trigger: { channelId: ALERT_CHANNEL_ID },
    });
  } catch {
    /* ignore */
  }
}
