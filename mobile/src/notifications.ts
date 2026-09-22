import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { DICTS, LangId } from './i18n/locales';

/** مفتاح لغة الواجهة المحفوظ (نفس `KEY` بـ`i18n/I18nContext.tsx`) — يُرسل مع توكن الـPush ليصل
 * إشعار التنبيه من الخادم بلغة المتداول لا بنص إنجليزي خام. */
const LANG_KEY = 'matrix.lang.v1';

async function savedLang(): Promise<string | undefined> {
  try {
    return (await AsyncStorage.getItem(LANG_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
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
 * اللغة يظهر بإعدادات النظام عند الإقلاع التالي. الأهمية نفسها لا يخفضها إلا المتداول من النظام،
 * وهذا مقصود: قراره يبقى له.
 */
export const ALERT_CHANNEL_ID = 'matrix-alerts';

let channelPromise: Promise<void> | null = null;

async function createAlertChannel(): Promise<void> {
  try {
    const lang = (await savedLang()) as LangId | undefined;
    const t = (lang && DICTS[lang]) || DICTS.ar;
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

export async function ensureAlertNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** حالة إذن الإشعارات الحالية — لعرض زر تفعيل/تعطيل واضح بالإعدادات بدل الاعتماد
 * على نافذة نظام التشغيل الافتراضية فقط (بند 9 من قائمة الإطلاق، docs/ROADMAP.md). */
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
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
  if (Platform.OS === 'web') return;
  // `getPermissionsAsync` قد يرفض بحالات أندرويد/Expo Go — لا إذن معروف = لا تسجيل، بلا استثناء طائر
  let granted = false;
  try {
    granted = (await Notifications.getPermissionsAsync()).status === 'granted';
  } catch {
    return;
  }
  if (!granted) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { projectId?: string })?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await api.registerPush(tokenData.data, Platform.OS, await savedLang());
  } catch {
    /* Expo Go may lack projectId — local alerts still work */
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
