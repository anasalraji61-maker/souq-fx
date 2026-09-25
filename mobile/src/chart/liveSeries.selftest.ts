/**
 * Self-test for the live-tick plausibility guard (pure).
 * Run: npx --yes tsx src/chart/liveSeries.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  headerChangePct,
  livePriceForChart,
  livePriceForHeader,
  tickPlausibleForSeries,
  withLiveExtremes,
  withLivePrice,
  type LiveExtremes,
} from './liveSeries';
import type { ChartSeries } from '../api';

const now = 1_760_000_000;
const src = { kind: 'provider' as const, as_of: now, channel: 'twelvedata' };
const eur: ChartSeries = {
  symbol: 'EURUSD',
  timeframe: '15m',
  candles: Array.from({ length: 30 }, (_, i) => ({
    time: now - (29 - i) * 900 - 60,
    open: 1.17,
    high: 1.1705,
    low: 1.1697,
    close: 1.1702,
  })),
  change_pct: 0,
  last: 1.1702,
  data_source: src,
};

// حركة عادية تُقبل
assert.equal(tickPlausibleForSeries(eur, 1.1712), true);
// تيك الذهب أو الباوند على شموع اليورو (تبديل الرمز قبل وصول الجلب) يُرفض
assert.equal(tickPlausibleForSeries(eur, 2650), false);
assert.equal(tickPlausibleForSeries(eur, 1.345), false);
// فريم يومي متقلّب: 20× وسيط المدى يوسّع الحدّ فوق 3%
const btc: ChartSeries = {
  ...eur,
  symbol: 'BTCUSD',
  timeframe: '1d',
  candles: eur.candles.map((c) => ({ ...c, open: 60000, high: 61500, low: 59000, close: 60000 })),
};
assert.equal(tickPlausibleForSeries(btc, 66000), true);
// بلا شموع ⇒ لا حكم
assert.equal(tickPlausibleForSeries({ ...eur, candles: [] }, 5), true);

// المسار الكامل: تيك مرفوض لا يُدمج ولا يُعاد سعراً للشارت
const tick = (price: number) => ({ price, source: src });
assert.equal(livePriceForChart(eur, tick(2650), { nowSec: now + 1 }), null);
assert.equal(livePriceForChart(eur, tick(1.1709), { nowSec: now + 1 }), 1.1709);
assert.equal(withLivePrice(eur, 2650, src, { nowSec: now + 1 }), eur);

// نسبة الرأس: التيك بعد إغلاق الشمعة الأخيرة (قبل الجلب التالي) لا يُدمج بها لكنه سعر الرأس
{
  const late = { ...tick(1.1709), source: { ...src, as_of: now + 1800 } };
  assert.equal(livePriceForChart(eur, late, { nowSec: now + 1800 }), null);
  assert.equal(livePriceForHeader(eur, late), 1.1709);
  assert.equal(livePriceForHeader(eur, tick(2650)), null); // تيك رمز آخر
  assert.equal(livePriceForHeader(eur, tick(0)), null);
  assert.equal(livePriceForHeader(eur, null), null);
  assert.equal(livePriceForHeader({ ...eur, candles: [] }, tick(1.17)), null);
}

// أعلى/أدنى الشمعة الحيّة يبقيان ما بلغته التيكات: 1.1712 ثم ارتداد 1.1706 — الأعلى يبقى 1.1712
{
  let ext: LiveExtremes | null = null;
  const feed = (p: number, base = eur) => {
    const r = withLiveExtremes(base, withLivePrice(base, p, src, { nowSec: now + 1 }), ext);
    ext = r.ext;
    return r.series.candles[r.series.candles.length - 1]!;
  };
  assert.equal(feed(1.1712).high, 1.1712);
  const back = feed(1.1706);
  assert.equal(back.high, 1.1712, 'high kept after pullback');
  assert.equal(back.close, 1.1706);
  assert.equal(feed(1.169).low, 1.169);
  const up = feed(1.1703);
  assert.equal(up.low, 1.169, 'low kept after bounce');
  assert.equal(up.high, 1.1712);
  // تيك مرفوض: لا دمج ولا تغيير بالتتبّع
  const before = ext;
  assert.equal(withLiveExtremes(eur, withLivePrice(eur, 2650, src, { nowSec: now + 1 }), ext).series, eur);
  assert.equal(ext, before);
  // شمعة جديدة (الجلب التالي): التتبّع يبدأ من جديد لا يحمل أعلى الشمعة السابقة
  const nextBar = { ...eur, candles: [...eur.candles, { ...eur.candles[29]!, time: eur.candles[29]!.time + 900 }] };
  const r = withLiveExtremes(nextBar, withLivePrice(nextBar, 1.1704, src, { nowSec: now + 901, tickAsOf: now + 901 }), ext);
  const nb = r.series.candles[r.series.candles.length - 1]!;
  assert.equal(nb.close, 1.1704, 'tick merged into the new bar');
  assert.equal(nb.high, 1.1705);
  assert.equal(nb.low, 1.1697);
  // رمز آخر بالزمن نفسه: لا يرث
  const gbp = { ...eur, symbol: 'GBPUSD' };
  const g = withLiveExtremes(gbp, withLivePrice(gbp, 1.1704, src, { nowSec: now + 1 }), ext).series;
  assert.equal(g.candles[29]!.high, 1.1705);
}

// نسبة الرأس = تغيّر اليوم من إغلاق الأمس، لا من أول شمعة محمّلة
{
  const s = { ...eur, candles: eur.candles.map((c, i) => (i === 0 ? { ...c, close: 1.16 } : c)) };
  assert.ok(Math.abs(headerChangePct(s, 1.1817, 1.17) - 1) < 1e-9);
  // بلا تيك ⇒ آخر إغلاق مقابل مرجع الأمس
  assert.ok(Math.abs(headerChangePct(s, null, 1.17) - ((1.1702 - 1.17) / 1.17) * 100) < 1e-9);
  // لا مرجع ⇒ من أول شمعة (السلوك السابق)
  assert.ok(Math.abs(headerChangePct(s, 1.1716, undefined) - 1) < 1e-9);
  // مرجع لا يعقل (>25%) أو شموع تجريبية ⇒ السلوك السابق
  assert.ok(Math.abs(headerChangePct(s, 1.1716, 150) - 1) < 1e-9);
  const demo = { ...s, data_source: { kind: 'demo' as const, as_of: now, channel: null } };
  assert.ok(Math.abs(headerChangePct(demo, 1.1716, 1.17) - 1) < 1e-9);
}

// رأس TerminalScreen العريض: سلسلة 4H صاعدة أسبوعاً (change_pct +3.33%) واليوم هابط ⇒ السالب لا نسبة السلسلة
{
  const up: ChartSeries = {
    ...eur,
    timeframe: '4h',
    candles: eur.candles.map((c, i) => ({ ...c, close: i === 0 ? 1.05 : 1.085 })),
    change_pct: 3.33,
    last: 1.085,
  };
  const pct = headerChangePct(up, 1.083, 1.084);
  assert.ok(pct < 0 && Math.abs(pct - ((1.083 - 1.084) / 1.084) * 100) < 1e-9, `daily −0.09%, got ${pct}`);
}

console.log('liveSeries selftest: OK');
