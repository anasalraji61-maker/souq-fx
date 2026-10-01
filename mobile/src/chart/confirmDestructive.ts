import { Alert, Platform } from 'react-native';

/**
 * تأكيد فعل هدّام يعمل على الهاتف **والويب**. `Alert.alert` بـreact-native-web دالّة فارغة: كان
 * «مسح الكل» بالشارت وحذف التخطيط لا يفعلان شيئاً إطلاقاً على الويب/سطح المكتب (لا نافذة ولا حذف).
 * على الويب `window.confirm` (نافذة المتصفّح الأصلية)؛ غيابه ⇒ لا تنفيذ (الأسلم لفعل لا يُسترجع).
 */
export function confirmDestructive(opts: {
  title: string;
  body: string;
  cancelText: string;
  confirmText: string;
  onConfirm: () => void;
}): void {
  const { title, body, cancelText, confirmText, onConfirm } = opts;
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`${title}\n${body}`)
        : false;
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, body, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

/** رسالة إعلام بزرّ واحد (حفظ القالب، فشل اللقطة) — على الويب `window.alert` لأن `Alert.alert` صامتة هناك. */
export function notify(title: string, body: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(`${title}\n${body}`);
    return;
  }
  Alert.alert(title, body);
}
