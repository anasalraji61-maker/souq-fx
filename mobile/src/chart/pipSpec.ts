/**
 * مواصفة الـpip **للشارت وحده** (منازل السعر وكل بُعد بالـpip): `instrumentSpec` + رموز حساب Exness Cent
 * بـ«c» ملاصقة («EURUSDc»، «USDJPYc»، «XAUUSDc»، «GOLDc»)، ولواحق الوسطاء الصغيرة («USDJPYmicro»، «GOLDm»).
 *
 * لماذا لا تكفي `instrumentSpec`: ترفض الحرف الملاصق عمداً (عقد الحاسبة يختلف بحساب السنت، وحرفٌ ملاصق قد
 * يكون أداةً أخرى)، فكان شارت «USDJPYc» يطبع 157.42 بدل 157.423 (التقدير من حجم الرقم)، ولا بُعد بالـpip
 * إطلاقاً: لا تحت التقاطع، ولا بأداة القياس، ولا بالسبريد، ولا بصندوق الشراء/البيع. حجم الـpip وتسعير الزوج
 * واحد بحساب السنت — ما يختلف حجم العقد، ولا يقرؤه الشارت. «BTCUSDC» (عملة مستقرّة) تبقى بلا مواصفة لأن
 * «BTCUSD» نفسها بلا مواصفة.
 */
import { instrumentSpec, miniAccountSymbol, smallContractPair, type InstrumentSpec } from '../positionSize';

export function chartPipSpec(symbol: string): InstrumentSpec | null {
  const direct = instrumentSpec(symbol);
  if (direct) return direct;
  const t = symbol.trim();
  const m = /^([A-Z]{6}|GOLD|SILVER)C$/i.exec(t);
  if (m) return instrumentSpec(m[1]!);
  // لاحقة وسيط **صغيرة الأحرف** ملاصقة («USDJPYmicro» XM، «EURUSDpro»، «EURUSDi»، «USDJPYm#»): كانت تُرفض
  // فيُقدَّر العدد من حجم الرقم (157.42 بدل 157.423، والتقاطع يلتصق بمنزلتين) ولا pip بأي قراءة. الصغيرة
  // وحدها: الملاصقة الكبيرة قد تكون أداةً أخرى («EURUSDT» يورو/تيثر). و«GOLDm»/«SILVERm» معها.
  const glued = /^([A-Z]{6}|GOLD|SILVER|Gold|Silver|gold|silver)[a-z]{1,5}[#+]?$/.exec(t);
  if (glued) return instrumentSpec(glued[1]!);
  // لاحقة بعد نقطة («EURUSD.c»، «XAUUSD.pro»، «GBPJPY.ECN»): النقطة لا تكون جزءاً من اسم أداة أبداً،
  // فأيّ حالة أحرف بعدها لاحقة حساب لا أداة أخرى.
  const dotted = /^([A-Za-z]{6}|GOLD|SILVER|Gold|Silver|gold|silver)\.[A-Za-z]{1,5}[#+]?$/.exec(t);
  if (dotted) return instrumentSpec(dotted[1]!.length === 6 ? dotted[1]!.toUpperCase() : dotted[1]!);
  // رموز الدفتر المحفوظة بالأحرف الكبيرة («USDJPYMICRO»، «USDJPY-CENT»، «GBPJPY_MICRO»): اللاحقة الكبيرة
  // تُرفض أعلاه، لكن «MICRO»/«CENT» بفاصل أو بلا فاصل لا تكون اسم أداة أخرى — الحاسبة والدفتر يقرآنها كذلك
  // (`smallContractPair`)، فكان صفّ الصفقة وتأكيد الإغلاق يطبعان 150.12 بدل 150.123.
  const small = smallContractPair(t);
  if (small) return instrumentSpec(small);
  // حساب mini بفاصل كبير («EURUSD-MINI»، «USDJPY_MINI»، «GOLD_MINI» كما يحفظها الدفتر): `instrumentSpec` يرفضها عمداً
  // (لوت mini يختلف بين الوسطاء) والنقطة وحدها كانت تُقبل أعلاه ⇒ «USDJPY-MINI» تُطبع 150.12 وبلا pip. السعر والـpip
  // كالزوج العادي، والمال لا يقرؤه الشارت.
  const mini = miniAccountSymbol(t);
  return mini ? instrumentSpec(mini) : null;
}
