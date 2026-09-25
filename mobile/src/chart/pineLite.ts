import type { Candle } from '../api';
import { ema, sma } from './indicators/moving-averages';

function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function atr(candles: Candle[], period: number): (number | null)[] {
  const tr: number[] = [candles[0]?.high - candles[0]?.low || 0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1].close;
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev)));
  }
  // Wilder (RMA) كمؤشر ATR بالشارت وكـta.atr — كانت SMA فـ`atr(14)` هنا تخالف لوحة ATR بجانبها
  const out: (number | null)[] = Array(tr.length).fill(null);
  if (period < 1 || tr.length < period) return out;
  let prevAtr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prevAtr;
  for (let i = period; i < tr.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    out[i] = prevAtr;
  }
  return out;
}

function stochK(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    out[i] = ((candles[i].close - lo) / (hi - lo || 1e-9)) * 100;
  }
  return out;
}

function macdLine(values: number[]): (number | null)[] {
  const e12 = ema(values, 12);
  const e26 = ema(values, 26);
  return e12.map((a, i) => (a != null && e26[i] != null ? a - e26[i]! : null));
}

function bb(
  values: number[],
  period: number,
  mult: number,
  which: 'mid' | 'upper' | 'lower'
): (number | null)[] {
  const mid = sma(values, period);
  return mid.map((m, i) => {
    if (m == null || i < period - 1) return null;
    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) varSum += (values[j] - m) ** 2;
    const std = Math.sqrt(varSum / period);
    if (which === 'mid') return m;
    if (which === 'upper') return m + mult * std;
    return m - mult * std;
  });
}

function highest(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let h = -Infinity;
    for (let j = i - period + 1; j <= i; j++) h = Math.max(h, values[j]);
    return h;
  });
}

function lowest(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let l = Infinity;
    for (let j = i - period + 1; j <= i; j++) l = Math.min(l, values[j]);
    return l;
  });
}

function change(values: number[], period = 1): (number | null)[] {
  return values.map((v, i) => (i < period ? null : v - values[i - period]));
}

function mom(values: number[], period: number): (number | null)[] {
  return change(values, period);
}

function crossover(a: (number | null)[], b: (number | null)[]): (number | null)[] {
  return a.map((v, i) => {
    if (i < 1 || v == null || b[i] == null || a[i - 1] == null || b[i - 1] == null) return null;
    return a[i - 1]! <= b[i - 1]! && v > b[i]! ? 1 : 0;
  });
}

function crossunder(a: (number | null)[], b: (number | null)[]): (number | null)[] {
  return a.map((v, i) => {
    if (i < 1 || v == null || b[i] == null || a[i - 1] == null || b[i - 1] == null) return null;
    return a[i - 1]! >= b[i - 1]! && v < b[i]! ? 1 : 0;
  });
}

function src(candles: Candle[], name: string): number[] {
  if (name === 'high') return candles.map((c) => c.high);
  if (name === 'low') return candles.map((c) => c.low);
  if (name === 'open') return candles.map((c) => c.open);
  if (name === 'hl2') return candles.map((c) => (c.high + c.low) / 2);
  if (name === 'hlc3') return candles.map((c) => (c.high + c.low + c.close) / 3);
  if (name === 'ohlc4') return candles.map((c) => (c.open + c.high + c.low + c.close) / 4);
  return candles.map((c) => c.close);
}

function resolveAtom(atom: string, candles: Candle[]): (number | null)[] {
  const f = atom.trim();
  const closes = candles.map((c) => c.close);

  const smaM = f.match(/^sma\((close|high|low|open|hl2|hlc3|ohlc4),(\d+)\)$/);
  if (smaM) return sma(src(candles, smaM[1]), parseInt(smaM[2], 10));
  const emaM = f.match(/^ema\((close|high|low|open|hl2|hlc3|ohlc4),(\d+)\)$/);
  if (emaM) return ema(src(candles, emaM[1]), parseInt(emaM[2], 10));
  const rsiM = f.match(/^rsi\((close|high|low|open),(\d+)\)$/);
  if (rsiM) return rsi(src(candles, rsiM[1]), parseInt(rsiM[2], 10));
  const atrM = f.match(/^atr\((\d+)\)$/);
  if (atrM) return atr(candles, parseInt(atrM[1], 10));
  const stochM = f.match(/^stoch\((\d+)\)$/);
  if (stochM) return stochK(candles, parseInt(stochM[1], 10));
  if (f === 'macd') return macdLine(closes);
  const bbMid = f.match(/^bbmid\((\d+)\)$/);
  if (bbMid) return bb(closes, parseInt(bbMid[1], 10), 2, 'mid');
  const bbUp = f.match(/^bbupper\((\d+)\)$/);
  if (bbUp) return bb(closes, parseInt(bbUp[1], 10), 2, 'upper');
  const bbLo = f.match(/^bblower\((\d+)\)$/);
  if (bbLo) return bb(closes, parseInt(bbLo[1], 10), 2, 'lower');
  const hiM = f.match(/^highest\((close|high|low|open),(\d+)\)$/);
  if (hiM) return highest(src(candles, hiM[1]), parseInt(hiM[2], 10));
  const loM = f.match(/^lowest\((close|high|low|open),(\d+)\)$/);
  if (loM) return lowest(src(candles, loM[1]), parseInt(loM[2], 10));
  const chM = f.match(/^change\((close|high|low|open)(?:,(\d+))?\)$/);
  if (chM) return change(src(candles, chM[1]), chM[2] ? parseInt(chM[2], 10) : 1);
  const momM = f.match(/^mom\((close|high|low|open),(\d+)\)$/);
  if (momM) return mom(src(candles, momM[1]), parseInt(momM[2], 10));

  if (f === 'close' || f === 'high' || f === 'low' || f === 'open' || f === 'hl2' || f === 'hlc3' || f === 'ohlc4') {
    return src(candles, f);
  }
  return closes.map(() => null);
}

/**
 * Pine-lite interpreter:
 * - functions: sma/ema/rsi/atr/stoch/macd/bb/highest/lowest/change/mom
 * - crossover(a,b) / crossunder(a,b) where a,b are atoms
 * - a-b or a+b for two atoms (e.g. sma(close,9)-sma(close,21))
 */
export function evalPineLite(formula: string, candles: Candle[]): (number | null)[] {
  const f = formula.trim().toLowerCase().replace(/\s/g, '');
  if (!f) return candles.map(() => null);

  const crossUp = f.match(/^crossover\((.+),(.+)\)$/);
  if (crossUp) return crossover(resolveAtom(crossUp[1], candles), resolveAtom(crossUp[2], candles));
  const crossDn = f.match(/^crossunder\((.+),(.+)\)$/);
  if (crossDn) return crossunder(resolveAtom(crossDn[1], candles), resolveAtom(crossDn[2], candles));

  const partsSub = splitBinary(f, '-');
  if (partsSub) {
    const a = resolveAtom(partsSub[0], candles);
    const b = resolveAtom(partsSub[1], candles);
    return a.map((v, i) => (v != null && b[i] != null ? v - b[i]! : null));
  }
  const partsAdd = splitBinary(f, '+');
  if (partsAdd) {
    const a = resolveAtom(partsAdd[0], candles);
    const b = resolveAtom(partsAdd[1], candles);
    return a.map((v, i) => (v != null && b[i] != null ? v + b[i]! : null));
  }

  return resolveAtom(f, candles);
}

/**
 * هل ناتج المعادلة سعر (يُرسم على محور السعر)؟ المتوسطات وبولنجر والقمم/القيعان ومصادر السعر نعم؛
 * RSI/Stoch/MACD/ATR/mom/change والتقاطع (0/1) والفرق/المجموع لا — كان RSI 14 يُدفع لمدى السعر فيمطّه
 * من 1.08 إلى 70 وتنسحق الشموع خطّاً بالقاع.
 */
export function pineIsPriceScale(formula: string): boolean {
  const f = formula.trim().toLowerCase().replace(/\s/g, '');
  if (!f || /^cross(over|under)\(/.test(f) || splitBinary(f, '-') || splitBinary(f, '+')) return false;
  return /^(sma|ema|bbmid|bbupper|bblower|highest|lowest)\(|^(close|high|low|open|hl2|hlc3|ohlc4)$/.test(f);
}

function splitBinary(s: string, op: string): [string, string] | null {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === op && depth === 0 && i > 0) {
      return [s.slice(0, i), s.slice(i + 1)];
    }
  }
  return null;
}

export type PinePreset = { id: string; name: string; formula: string; group: string };

export const INDICATOR_LIBRARY: PinePreset[] = [
  { id: 'sma9', name: 'SMA 9', formula: 'sma(close,9)', group: 'MA' },
  { id: 'sma21', name: 'SMA 21', formula: 'sma(close,21)', group: 'MA' },
  { id: 'sma50', name: 'SMA 50', formula: 'sma(close,50)', group: 'MA' },
  { id: 'ema9', name: 'EMA 9', formula: 'ema(close,9)', group: 'MA' },
  { id: 'ema21', name: 'EMA 21', formula: 'ema(close,21)', group: 'MA' },
  { id: 'ema50', name: 'EMA 50', formula: 'ema(close,50)', group: 'MA' },
  { id: 'spread_ma', name: 'SMA9-SMA21', formula: 'sma(close,9)-sma(close,21)', group: 'MA' },
  { id: 'x_ma', name: 'Cross SMA', formula: 'crossover(sma(close,9),sma(close,21))', group: 'Signal' },
  { id: 'rsi14', name: 'RSI 14', formula: 'rsi(close,14)', group: 'Osc' },
  { id: 'stoch14', name: 'Stoch 14', formula: 'stoch(14)', group: 'Osc' },
  { id: 'macd', name: 'MACD', formula: 'macd', group: 'Osc' },
  { id: 'mom10', name: 'Mom 10', formula: 'mom(close,10)', group: 'Osc' },
  { id: 'atr14', name: 'ATR 14', formula: 'atr(14)', group: 'Vol' },
  { id: 'hh20', name: 'Highest H20', formula: 'highest(high,20)', group: 'Struct' },
  { id: 'll20', name: 'Lowest L20', formula: 'lowest(low,20)', group: 'Struct' },
  { id: 'bbmid', name: 'BB Mid', formula: 'bbmid(20)', group: 'BB' },
  { id: 'bbupper', name: 'BB Upper', formula: 'bbupper(20)', group: 'BB' },
  { id: 'bblower', name: 'BB Lower', formula: 'bblower(20)', group: 'BB' },
  { id: 'hlc3', name: 'HLC3', formula: 'hlc3', group: 'Price' },
  { id: 'close', name: 'Close', formula: 'close', group: 'Price' },
];
