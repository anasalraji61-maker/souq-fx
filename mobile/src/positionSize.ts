/**
 * حاسبة حجم المركز (Position size) — رياضيات صرفة بلا React/شبكة، قابلة للاختبار بـ
 * `positionSize.selftest.ts`.
 *
 * المصطلحات (متداول تجزئة):
 * - pip: 0.0001 لأغلب الأزواج، 0.01 للأزواج المسعّرة بالين (JPY)، 0.1 للذهب XAUUSD، 0.01 للفضة XAGUSD.
 * - اللوت القياسي: 100,000 وحدة من العملة الأساس (الذهب 100 أونصة، الفضة 5,000 أونصة).
 * - قيمة الـpip للوت واحد = حجم العقد × حجم الـpip، بعملة التسعير (الثانية)، ثم تُحوَّل لعملة الحساب.
 *
 * تنبيه: مواصفات العقود تختلف بين الوسطاء (خصوصاً المعادن) — النتيجة تقدير تعليمي.
 */

export type AccountCcy = 'USD' | 'EUR' | 'GBP';
export const ACCOUNT_CCYS: AccountCcy[] = ['USD', 'EUR', 'GBP'];

export type InstrumentSpec = {
  symbol: string;
  base: string;
  quote: string;
  pipSize: number;
  contractSize: number;
};

const METALS: Record<string, { pipSize: number; contractSize: number }> = {
  XAU: { pipSize: 0.1, contractSize: 100 },
  XAG: { pipSize: 0.01, contractSize: 5000 },
};

/** ترتيب التسعير المتعارف عليه بسوق الفوركس (العملة الأعلى أولوية تأتي أساساً بالزوج). */
const CCY_PRIORITY = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

export function instrumentSpec(raw: string): InstrumentSpec | null {
  const symbol = normalizeSymbol(raw);
  if (!/^[A-Z]{6}$/.test(symbol)) return null;
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  if (base === quote) return null;
  const metal = METALS[base];
  if (metal) return { symbol, base, quote, ...metal };
  if (METALS[quote]) return null;
  return { symbol, base, quote, pipSize: quote === 'JPY' ? 0.01 : 0.0001, contractSize: 100_000 };
}

/**
 * الزوج اللازم لتحويل عملة التسعير إلى عملة الحساب. `invert=false` يعني أن سعر الزوج نفسه هو
 * "كم وحدة من عملة الحساب لكل وحدة من عملة التسعير"؛ `invert=true` يعني أخذ مقلوب السعر.
 * null = لا حاجة لتحويل (عملة التسعير = عملة الحساب).
 */
export function conversionPair(quote: string, account: string): { symbol: string; invert: boolean } | null {
  if (quote === account) return null;
  const qi = CCY_PRIORITY.indexOf(quote);
  const ai = CCY_PRIORITY.indexOf(account);
  // عملة غير مدرجة بالترتيب: نفترض عملة الحساب أساساً (USDXXX، EURXXX…) وهو الشائع للعملات الناشئة.
  const quoteFirst = qi !== -1 && (ai === -1 || qi < ai);
  return quoteFirst
    ? { symbol: `${quote}${account}`, invert: false }
    : { symbol: `${account}${quote}`, invert: true };
}

/** كم وحدة من عملة الحساب تساوي وحدة واحدة من عملة التسعير، من سعر زوج التحويل. */
export function quoteToAccountRate(conv: { invert: boolean } | null, pairPrice: number | null): number | null {
  if (!conv) return 1;
  if (pairPrice == null || !Number.isFinite(pairPrice) || pairPrice <= 0) return null;
  return conv.invert ? 1 / pairPrice : pairPrice;
}

/** قيمة الـpip للوت قياسي واحد، بعملة الحساب. */
export function pipValuePerLot(spec: InstrumentSpec, quoteToAccount: number): number {
  return spec.contractSize * spec.pipSize * quoteToAccount;
}

export const LOT_STEP = 0.01;

export type SizeResult = {
  riskAmount: number;
  rawLots: number;
  /** مقرَّب للأسفل لأقرب 0.01 — لا يتجاوز المخاطرة المطلوبة أبداً */
  lots: number;
  /** المخاطرة الفعلية بعد التقريب */
  actualRisk: number;
  units: number;
  belowMinLot: boolean;
};

export function positionSize(input: {
  balance: number;
  riskPct: number;
  slPips: number;
  pipValuePerLot: number;
  contractSize: number;
}): SizeResult | null {
  const { balance, riskPct, slPips, pipValuePerLot: pv, contractSize } = input;
  if (![balance, riskPct, slPips, pv].every((v) => Number.isFinite(v) && v > 0)) return null;
  if (riskPct > 100) return null;
  const riskAmount = (balance * riskPct) / 100;
  const rawLots = riskAmount / (slPips * pv);
  // إزاحة صغيرة تمنع أخطاء الفاصلة العائمة (0.29999999 → 0.29 خطأً) قبل التقريب للأسفل
  const lots = Math.floor(rawLots / LOT_STEP + 1e-9) * LOT_STEP;
  const roundedLots = Math.round(lots * 100) / 100;
  return {
    riskAmount,
    rawLots,
    lots: roundedLots,
    actualRisk: roundedLots * slPips * pv,
    units: Math.round(roundedLots * contractSize),
    belowMinLot: roundedLots < LOT_STEP,
  };
}
