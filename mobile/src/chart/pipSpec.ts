/**
 * مواصفة الـpip **للشارت وحده** (منازل السعر وكل بُعد بالـpip): `instrumentSpec` + رموز حساب Exness Cent
 * بـ«c» ملاصقة («EURUSDc»، «USDJPYc»، «XAUUSDc»، «GOLDc»).
 *
 * لماذا لا تكفي `instrumentSpec`: ترفض الحرف الملاصق عمداً (عقد الحاسبة يختلف بحساب السنت، وحرفٌ ملاصق قد
 * يكون أداةً أخرى)، فكان شارت «USDJPYc» يطبع 157.42 بدل 157.423 (التقدير من حجم الرقم)، ولا بُعد بالـpip
 * إطلاقاً: لا تحت التقاطع، ولا بأداة القياس، ولا بالسبريد، ولا بصندوق الشراء/البيع. حجم الـpip وتسعير الزوج
 * واحد بحساب السنت — ما يختلف حجم العقد، ولا يقرؤه الشارت. «BTCUSDC» (عملة مستقرّة) تبقى بلا مواصفة لأن
 * «BTCUSD» نفسها بلا مواصفة.
 */
import { instrumentSpec, type InstrumentSpec } from '../positionSize';

export function chartPipSpec(symbol: string): InstrumentSpec | null {
  const direct = instrumentSpec(symbol);
  if (direct) return direct;
  const m = /^([A-Z]{6}|GOLD|SILVER)C$/i.exec(symbol.trim());
  return m ? instrumentSpec(m[1]!) : null;
}
