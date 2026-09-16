import AsyncStorage from '@react-native-async-storage/async-storage';

/** يُعرض مرة واحدة فقط لأول متداول يفتح التطبيق — جولة قصيرة توضّح أهم أربع نقاط
 * (فريمات متعددة/أدوات الرسم/المؤشرات/التنبيهات) قبل أن يبدأ الاستكشاف بنفسه. */
const KEY = 'matrix.onboarding.v1';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === '1';
  } catch {
    // فشل القراءة لا يجوز أن يحظر التطبيق — تفويت الجولة أهون من تعطيل الإقلاع
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}
