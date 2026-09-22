import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

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
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    /* ignore */
  }
}
