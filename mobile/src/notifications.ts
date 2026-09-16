import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

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

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  const ok = await ensureAlertNotifications();
  if (!ok) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { projectId?: string })?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await api.registerPush(tokenData.data, Platform.OS);
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
