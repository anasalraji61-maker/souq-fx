import type { LiveTick } from '../api';

/**
 * عمر كل رمز بدفعة `/ws/ticks` بساعة الخادم نفسها (`ts − ticks_at[sym]`، بالثواني) — لا فرق ساعة مع الجهاز.
 *
 * الخادم يعيد بثّ كل رمز وصل خلال دقيقتين من أحدث رمز (`recent_snapshot(120)`) كل ثانية، فرمزٌ تجمّد
 * عند المزوّد كان يصل «جديداً» كل ثانية ويُختم بلحظة الوصول ⇒ قائمة المتابعة تعرضه سعراً حيّاً حتى دقيقتين.
 * منذ backend `1f40c21` يُرسل `ticks_at` (وقت استلام كل رمز). غيابه (خادم أقدم) أو قيمة غير صالحة ⇒ null
 * (السلوك القديم: العمر من لحظة الوصول).
 */
export function tickServerAgeSec(
  payload: { ts?: unknown; ticks_at?: unknown },
  sym: string
): number | null {
  const ts = payload.ts;
  const map = payload.ticks_at;
  if (typeof ts !== 'number' || !Number.isFinite(ts) || !map || typeof map !== 'object') return null;
  const at = (map as Record<string, unknown>)[sym];
  if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) return null;
  return Math.max(0, ts - at);
}

/**
 * تيك صالح من الدفعة لرمز واحد، أو null: سعر ≤0/غير منتهٍ، أو أقدم عند الخادم من `staleMs`.
 * `at` = لحظة الاستلام الحقيقية بساعة الجهاز (الآن − عمره عند الخادم) فيُسقَط بموعده لا بعد 20ث أخرى؛
 * و`source.as_of` = `ticks_at` للرمز نفسه لا أحدث رمز بالدفعة (شارة «حي» بعمره هو).
 */
export function acceptTick(
  payload: { ts?: unknown; ticks_at?: unknown },
  sym: string,
  price: unknown,
  source: LiveTick['source'],
  nowMs: number,
  staleMs: number
): { tick: LiveTick; at: number } | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  const age = tickServerAgeSec(payload, sym);
  if (age == null) return { tick: { price, source }, at: nowMs };
  if (age * 1000 > staleMs) return null;
  const asOf = (payload.ticks_at as Record<string, number>)[sym];
  return { tick: { price, source: { ...source, as_of: asOf } }, at: nowMs - age * 1000 };
}
