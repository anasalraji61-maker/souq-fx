import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  getNotificationPermissionState,
  registerPushToken,
  type NotificationPermissionState,
} from '../notifications';

/**
 * يعيد قراءة إذن الإشعارات كلما عاد التطبيق للواجهة. «افتح الإعدادات» يعود فوراً والإذن ما زال
 * مرفوضاً، فالقراءة بعده لا تكفي: من فعّل الإشعارات بالإعدادات ثم رجع كان يرى «مرفوضة» والتحذير
 * «لن يصلك إشعار» طوال الجلسة (الشاشات تبقى مركّبة). وإذنٌ صار ممنوحاً يسجّل رمز Push — التسجيل
 * عند التركيب فشل حينها لأن الإذن كان مرفوضاً، فلا تصل تنبيهات الخادم والهاتف مقفل.
 */
export function useNotificationPermissionOnResume(
  onState: (s: NotificationPermissionState) => void,
  enabled = true
): void {
  const lastRef = useRef<NotificationPermissionState | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      getNotificationPermissionState()
        .then((s) => {
          if (s === 'granted' && lastRef.current !== 'granted') void registerPushToken();
          lastRef.current = s;
          if (alive) onState(s);
        })
        .catch(() => {
          /* تعذّرت القراءة: تبقى الحالة المعروضة */
        });
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [onState, enabled]);
}
