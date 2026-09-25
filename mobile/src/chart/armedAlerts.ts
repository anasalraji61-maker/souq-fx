/**
 * التنبيهات السعرية **المُسلَّحة** على الشارت نفسه: خطّ متقطّع كهرماني عند سعر كل تنبيه لرمز الشارت.
 * كان المتداول يضع التنبيه من الشارت ثم لا يراه عليه — لا يعرف أين ينتظر ولا كم يبعد عن السعر، ويضع
 * ثانياً فوق الأول. المُطلَق وغير الفعّال لا يُرسم (مستوىً مضى).
 *
 * طلب واحد مشترك لكل الشارتات المفتوحة (الرباعي أربعة شارتات): `/api/alerts` قراءة قاعدة بيانات بالخادم
 * لا نداء مزوّد، والدقيقة إيقاع لوح التنبيهات وقائمة المتابعة نفسه. الدورة تعمل ما دام شارت واحد مشترك،
 * وتقف مع آخر مشترك. إنشاء تنبيه من الشارت يطلب قراءة فورية (`refreshArmedAlertsSoon` بـ`useArmedAlerts.ts`) فيظهر خطّه حالاً.
 */
import type { PriceAlert } from '../api';

export type ArmedAlert = { id: string; price: number; condition: 'above' | 'below' };

/** تنبيهات الرمز المُسلَّحة بسعر صالح، مرتّبة تنازلياً بالسعر؛ التكرار بالسعر والاتجاه نفسيهما يُرسم مرّة. */
export function armedAlertsFor(alerts: readonly PriceAlert[], symbol: string): ArmedAlert[] {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return [];
  const seen = new Set<string>();
  const out: ArmedAlert[] = [];
  for (const a of alerts) {
    if (!a || a.triggered || !a.active) continue;
    if (typeof a.price !== 'number' || !Number.isFinite(a.price) || a.price <= 0) continue;
    if ((a.symbol || '').trim().toUpperCase() !== sym) continue;
    const condition = a.condition === 'below' ? 'below' : 'above';
    const key = `${a.price}|${condition}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: a.id, price: a.price, condition });
  }
  return out.sort((x, y) => y.price - x.price);
}
