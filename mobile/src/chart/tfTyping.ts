/**
 * تبديل الفريم بالكتابة على الويب: المتداول يكتب «15» أو «4h» أو «d» فوق الشارت ثم Enter. شريط الفريمات يعني
 * رحلة للفأرة إلى أعلى الإطار في كل تبديل — والتبديل بين 5m و1H و4H هو أكثر ما يفعله متداول الفوركس بالجلسة.
 * Alt+رقم لا يصلح (يبدّل تبويبات المتصفّح)، والكتابة المجرّدة لا تسرق شيئاً: لا اختصار آخر للشارت بلا Alt/Ctrl.
 *
 * الرقم المجرّد دقائق («60» ⇒ 1H، «240» ⇒ 4H)؛ اللاحقة m/h/d/w بالوحدة. ما لا يطابق فريماً مدعوماً ⇒ `null`
 * (يظهر الوسم ولا يتبدّل شيء) — لا تقريب لأقرب فريم، فـ«3» لا تصير 5m بصمت.
 */
import { TF_SECONDS, TIMEFRAMES, type Timeframe } from '../timeframes';

/** أقصى طول للمكتوب: «1440» أطول صيغة معقولة؛ ما بعدها ضغطات تائهة. */
export const TF_TYPING_MAX = 5;

/**
 * حرف الكتابة من المفتاح: رقم أو m/h/d/w، وإلا فارغ. من الموضع الفيزيائي (`event.code`) أولاً: لوحة عربية
 * على ماك تُخرج «١٥» ولوحة عربية/كردية تُخرج «ة»/«ا» لـm/h — المتداول يضغط المفتاح نفسه.
 */
export function tfTypingChar(key: string, code: string | undefined): string {
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code ?? '');
  if (digit) return digit[1]!;
  const letter = /^Key([MHDW])$/.exec(code ?? '');
  if (letter) return letter[1]!.toLowerCase();
  if (/^[0-9]$/.test(key)) return key;
  if (/^[mhdw]$/i.test(key)) return key.toLowerCase();
  return '';
}

/** هل يبدأ هذا الحرف كتابة فريم؟ رقم، أو d/w وحدهما (m/h بلا رقم قبلهما لا معنى لهما). */
export function tfTypingStarts(ch: string): boolean {
  return /^[1-9dw]$/.test(ch);
}

export function parseTypedTimeframe(typed: string): Timeframe | null {
  const m = /^(\d*)([mhdw]?)$/.exec(typed.trim().toLowerCase());
  if (!m || (!m[1] && !/^[dw]$/.test(m[2]!))) return null;
  const n = m[1] ? Number(m[1]) : 1;
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2] === 'h' ? 3600 : m[2] === 'd' ? 86400 : m[2] === 'w' ? 604800 : 60;
  const sec = n * unit;
  return TIMEFRAMES.find((tf) => TF_SECONDS[tf] === sec) ?? null;
}
