/**
 * علامة الخلفية: الزوج والفريم بخطّ كبير خافت وسط لوح السعر — لقطة الشاشة المشتركة وخلايا الرباعي
 * الصغيرة تقول «أيّ زوج هذا؟» دون قراءة الرأس. صياغة MATRIX: الزوج بشرطة («EUR/USD») والفريم بسطر تحته.
 */
import { isFiatCurrency } from './newsRisk';
import { chartPipSpec } from './pipSpec';

/** «EURUSD» ⇒ «EUR/USD»؛ لواحق الحساب («EURUSDc»، «USDJPY.pro») تبقى كما هي — الوسيط يسمّيها كذلك. */
export function watermarkSymbol(symbol: string): string {
  const s = symbol.trim();
  if (!/^[A-Z]{6}$/.test(s)) return s;
  // الغريبة بلا مواصفة pip («USDTHB»، «EURHUF») زوجٌ أيضاً ما دام شطراها عملتين ورقيتين.
  if (chartPipSpec(s) || (isFiatCurrency(s.slice(0, 3)) && isFiatCurrency(s.slice(3)))) {
    return `${s.slice(0, 3)}/${s.slice(3)}`;
  }
  return s;
}

/**
 * حجم الخطّ بعرض اللوح وارتفاعه: لا يطغى على الشموع بالهاتف العريض، ولا يُرسم إطلاقاً (null) بلوح أضيق من أن
 * يحمله دون أن يزاحم الأسعار (خلية رباعي على هاتف صغير).
 */
export function watermarkFontSize(plotW: number, plotH: number, text: string): number | null {
  if (!(plotW >= 150 && plotH >= 90)) return null;
  const byWidth = (plotW * 0.7) / Math.max(4, text.length * 0.62);
  const size = Math.min(byWidth, plotH * 0.22, 46);
  return size >= 14 ? Math.round(size) : null;
}
