/**
 * Position-size maths (pure functions, account currency USD).
 *
 *  pip value per standard lot (USD) =
 *    quote = USD            → pipSize × contract                    (EURUSD: 0.0001 × 100 000 = $10)
 *    base  = USD            → pipSize × contract ÷ price             (USDJPY @150: 0.01 × 100 000 ÷ 150 = $6.67)
 *    cross (no USD)         → pipSize × contract × (quote→USD rate)  (EURGBP with GBPUSD 1.27: £10 × 1.27 = $12.70)
 *    metals                 → XAUUSD: 0.10 × 100 oz = $10 · XAGUSD: 0.01 × 5 000 oz = $50
 *  risk amount  = balance × risk% ÷ 100
 *  lots         = risk amount ÷ (stop pips × pip value per lot), rounded DOWN to the 0.01 lot step
 */

export interface InstrumentSpec {
  symbol: string;
  kind: 'forex' | 'metal';
  base: string;
  quote: string;
  pipSize: number;
  contract: number;
}

export const CALC_SYMBOLS: InstrumentSpec[] = [
  ...[
    'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD',
    'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'EURGBP', 'EURAUD', 'EURCHF',
  ].map((s) => ({
    symbol: s,
    kind: 'forex' as const,
    base: s.slice(0, 3),
    quote: s.slice(3, 6),
    pipSize: s.endsWith('JPY') ? 0.01 : 0.0001,
    contract: 100000,
  })),
  { symbol: 'XAUUSD', kind: 'metal', base: 'XAU', quote: 'USD', pipSize: 0.1, contract: 100 },
  { symbol: 'XAGUSD', kind: 'metal', base: 'XAG', quote: 'USD', pipSize: 0.01, contract: 5000 },
];

export function specFor(symbol: string): InstrumentSpec | undefined {
  return CALC_SYMBOLS.find((s) => s.symbol === symbol);
}

export type PipValueMode = 'quote_usd' | 'base_usd' | 'cross';

export function pipValueMode(spec: InstrumentSpec): PipValueMode {
  if (spec.quote === 'USD') return 'quote_usd';
  if (spec.base === 'USD') return 'base_usd';
  return 'cross';
}

/**
 * Pair whose price converts the quote currency to USD for a cross, and whether to divide by it.
 * GBP → GBPUSD (multiply) · JPY → USDJPY (divide) · CHF → USDCHF (divide) · AUD → AUDUSD (multiply).
 */
export function conversionPair(quote: string): { pair: string; invert: boolean } {
  if (['EUR', 'GBP', 'AUD', 'NZD'].includes(quote)) return { pair: `${quote}USD`, invert: false };
  return { pair: `USD${quote}`, invert: true };
}

/** USD value of one pip for one standard lot. `price` is the pair's own price (needed for USD/xxx);
 * `conversion` is the price of the conversion pair (needed for crosses). Returns null when unknown. */
export function pipValuePerLot(
  spec: InstrumentSpec,
  opts: { price?: number | null; conversion?: number | null; contract?: number | null }
): number | null {
  const contract = opts.contract && opts.contract > 0 ? opts.contract : spec.contract;
  const raw = spec.pipSize * contract;
  const mode = pipValueMode(spec);
  if (mode === 'quote_usd') return raw;
  if (mode === 'base_usd') {
    const p = opts.price;
    return p && p > 0 ? raw / p : null;
  }
  const c = opts.conversion;
  if (!c || !(c > 0)) return null;
  return conversionPair(spec.quote).invert ? raw / c : raw * c;
}

export interface SizeInput {
  balance: number;
  riskPct: number;
  stopPips: number;
  pipValue: number;
  tpPips?: number | null;
  lotStep?: number;
}

export interface SizeResult {
  riskAmount: number;
  rawLots: number;
  lots: number;
  actualRisk: number;
  actualRiskPct: number;
  rr: number | null;
  rewardAmount: number | null;
}

export function positionSize(i: SizeInput): SizeResult {
  const step = i.lotStep && i.lotStep > 0 ? i.lotStep : 0.01;
  const riskAmount = (i.balance * i.riskPct) / 100;
  const perLotRisk = i.stopPips * i.pipValue;
  const rawLots = perLotRisk > 0 ? riskAmount / perLotRisk : 0;
  // floor to the lot step (tiny epsilon so 0.29999999 → 0.30 is not lost to float error)
  const lots = Math.floor(rawLots / step + 1e-9) * step;
  const actualRisk = lots * perLotRisk;
  const rr = i.tpPips && i.tpPips > 0 && i.stopPips > 0 ? i.tpPips / i.stopPips : null;
  return {
    riskAmount,
    rawLots,
    lots: Number(lots.toFixed(2)),
    actualRisk,
    actualRiskPct: i.balance > 0 ? (actualRisk / i.balance) * 100 : 0,
    rr,
    rewardAmount: rr !== null ? lots * (i.tpPips as number) * i.pipValue : null,
  };
}

/** Distance between two prices in pips. */
export function priceToPips(spec: InstrumentSpec, a: number, b: number): number {
  return Math.abs(a - b) / spec.pipSize;
}
