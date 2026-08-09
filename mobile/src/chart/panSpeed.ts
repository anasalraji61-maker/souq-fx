import AsyncStorage from '@react-native-async-storage/async-storage';

/** نسبة سرعة السحب 1–100 مثل مستوى الصوت/السطوع */
export type PanSpeedPercent = number;

export const PAN_SPEED_KEY = 'matrix.chart.panSpeed.v2';
const LEGACY_KEY = 'matrix.chart.panSpeed.v1';

/** افتراضي أقرب للبطء لأن السحب السابق كان سريعاً */
export const DEFAULT_PAN_SPEED = 35;

export function clampPanSpeed(value: number): PanSpeedPercent {
  if (!Number.isFinite(value)) return DEFAULT_PAN_SPEED;
  return Math.max(1, Math.min(100, Math.round(value)));
}

/** يحول النسبة إلى مضاعف سحب فعلي */
export function panSpeedMultiplier(percent: PanSpeedPercent): number {
  const p = clampPanSpeed(percent) / 100;
  return 0.12 + p * 1.18;
}

export async function loadPanSpeed(): Promise<PanSpeedPercent> {
  try {
    const raw = await AsyncStorage.getItem(PAN_SPEED_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return clampPanSpeed(n);
    }
    // ترحيل الدرجات القديمة 1–5
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    const level = Number(legacy);
    if (level >= 1 && level <= 5) {
      const mapped = clampPanSpeed([20, 35, 50, 70, 90][level - 1]!);
      await AsyncStorage.setItem(PAN_SPEED_KEY, String(mapped));
      return mapped;
    }
  } catch {
    /* defaults */
  }
  return DEFAULT_PAN_SPEED;
}

export async function savePanSpeed(percent: PanSpeedPercent): Promise<void> {
  try {
    await AsyncStorage.setItem(PAN_SPEED_KEY, String(clampPanSpeed(percent)));
  } catch {
    /* ignore */
  }
}
