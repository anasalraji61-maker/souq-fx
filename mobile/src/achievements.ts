import AsyncStorage from '@react-native-async-storage/async-storage';

/** أعلام احتفال بصري لمرة واحدة فقط (matrix-tactile-feel.mdc — "لمسات تشجيعية ومرحة"):
 * تشجّع لحظة تعلّم/انضباط محدَّدة (هنا: ضبط أول تنبيه سعر) ولا تتكرر لاحقاً، ولا علاقة لها
 * بحجم/تكرار التداول أو التنبيهات إطلاقاً — نفس نمط `onboarding.ts` (AsyncStorage، فشل القراءة
 * لا يجوز أن يُعطّل الواجهة). */
const FIRST_ALERT_KEY = 'matrix.achievement.firstAlert.v1';

export async function hasCelebratedFirstAlert(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(FIRST_ALERT_KEY);
    return v === '1';
  } catch {
    // فشل القراءة يُعامَل كأنه احتُفل به مسبقاً — تفويت احتفال واحد أهون من تكراره خطأً
    return true;
  }
}

export async function markFirstAlertCelebrated(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_ALERT_KEY, '1');
  } catch {
    /* ignore */
  }
}
