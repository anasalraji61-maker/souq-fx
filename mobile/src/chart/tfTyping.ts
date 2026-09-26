/**
 * تبديل الفريم بالكتابة على الويب: المتداول يكتب «15» أو «4h» أو «d» فوق الشارت ثم Enter. شريط الفريمات يعني
 * رحلة للفأرة إلى أعلى الإطار في كل تبديل — والتبديل بين 5m و1H و4H هو أكثر ما يفعله متداول الفوركس بالجلسة.
 * Alt+رقم لا يصلح (يبدّل تبويبات المتصفّح)، والكتابة المجرّدة لا تسرق شيئاً: لا اختصار آخر للشارت بلا Alt/Ctrl.
 *
 * الرقم المجرّد دقائق («60» ⇒ 1H، «240» ⇒ 4H)؛ اللاحقة m/h/d/w بالوحدة. ما لا يطابق فريماً مدعوماً ⇒ `null`
 * (يظهر الوسم ولا يتبدّل شيء) — لا تقريب لأقرب فريم، فـ«3» لا تصير 5m بصمت.
 */
import { TF_SECONDS, TIMEFRAMES, type Timeframe } from '../timeframes';

/** أقصى طول للمكتوب: تاريخ «2026-09-01» أطول صيغة (الفريم «1440» خمسة)؛ ما بعدها ضغطات تائهة. */
export const TF_TYPING_MAX = 10;

/**
 * حرف الكتابة من المفتاح: رقم أو m/h/d/w، وإلا فارغ. من الموضع الفيزيائي (`event.code`) أولاً: لوحة عربية
 * على ماك تُخرج «١٥» ولوحة عربية/كردية تُخرج «ة»/«ا» لـm/h — المتداول يضغط المفتاح نفسه.
 */
export function tfTypingChar(key: string, code: string | undefined): string {
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code ?? '');
  if (digit) return digit[1]!;
  const letter = /^Key([MHDW])$/.exec(code ?? '');
  if (letter) return letter[1]!.toLowerCase();
  // «-» فاصل التاريخ (`parseTypedDate`) — من الموضع كذلك (Minus/NumpadSubtract) لا من الحرف.
  if (code === 'Minus' || code === 'NumpadSubtract' || key === '-') return '-';
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

/**
 * اختصار الرقم المنفرد (W4، قرار أنس ١٦): «1»…«8» = الفريم بموضعه بشريط الفريمات (1m 5m 15m 30m 1H 4H D W)
 * — يُطبَّق بعد توقّف قصير (`TF_SLOT_IDLE_MS`) بلا Enter، أو فوراً بـEnter. كان «5» ثم Enter = 5m، و«1» وحدها
 * لا شيء حتى Enter. ما زاد على رقم («15»، «4h»، «240»، تاريخ) يبقى بالكتابة كما كان.
 */
export const TF_SLOT_IDLE_MS = 600;

export function slotTimeframe(typed: string): Timeframe | null {
  const m = /^([1-9])$/.exec(typed.trim());
  if (!m) return null;
  return TIMEFRAMES[Number(m[1]) - 1] ?? null;
}

/** الفريم الذي سيُفتح بالمكتوب: الرقم المنفرد بموضعه، وإلا كتابة الفريم (`parseTypedTimeframe`). */
export function resolveTypedTimeframe(typed: string): Timeframe | null {
  return /^\d$/.test(typed.trim()) ? slotTimeframe(typed) : parseTypedTimeframe(typed);
}

/**
 * الانتقال إلى تاريخ بالكتابة نفسها: «2026-09-01» ثم Enter يضع شمعة ذلك اليوم وسط اللوح ويثبّت التقاطع عليها —
 * مراجعة إعداد سابق (قرار الفائدة، NFP الماضي) كانت سحباً طويلاً بالفأرة. ISO وحده (سنة-شهر-يوم): «09/01» يوم أم شهر؟
 * يختلف بين المتداولين، والتخمين الخاطئ يفتح شهراً آخر بصمت.
 */
export function parseTypedDate(typed: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(typed.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1970 || month < 1 || month > 12 || day < 1) return null;
  // 2026-02-30 لا يُقلب إلى 2 مارس بصمت.
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

/** بداية التاريخ المكتوب لم تكتمل بعد («2026»، «2026-09-») — الوسم يعرض «…» لا «✕». */
export function typedDatePending(typed: string): boolean {
  return /^\d{4}(?:-\d{0,2}(?:-\d?)?)?$/.test(typed) && !parseTypedDate(typed);
}

/**
 * الشمعة التي يفتحها التاريخ، والإزاحة التي تضعها وسط نافذة من `windowCount` شمعة. `dayStartSec`/`dayEndSec` حدّا
 * اليوم (UTC لشموع D/W كما يكتبها المحور، محلّي لما دونها). أوّل شمعة باليوم؛ بلا شمعة فيه (عطلة، أو شمعة أسبوع
 * بدأت قبله) ⇒ آخر شمعة قبله. قبل أوّل شمعة محمَّلة أو بعد `nowSec` ⇒ null: لا انتقال إلى «أقرب» تاريخ بصمت.
 */
export function dateJump(
  timesSec: readonly number[],
  dayStartSec: number,
  dayEndSec: number,
  nowSec: number,
  windowCount: number,
  minOffset = 0,
  keep = 10
): { index: number; offset: number } | null {
  const n = timesSec.length;
  if (n === 0 || !(dayEndSec > dayStartSec) || dayEndSec <= timesSec[0]! || dayStartSec > nowSec) return null;
  let i = 0;
  while (i < n && timesSec[i]! < dayStartSec) i++;
  const index = i < n && timesSec[i]! < dayEndSec ? i : i - 1;
  if (index < 0) return null;
  const right = index + Math.floor(Math.max(1, windowCount) / 2);
  const offset = Math.max(minOffset, Math.min(Math.max(0, n - keep), n - 1 - right));
  return { index, offset: Math.max(0, offset) };
}
