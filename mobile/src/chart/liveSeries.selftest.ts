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
import { liveBarOpenSec, replayPrevClose, tickPredatesLastBar } from './liveSeries';

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
  // (بعد ثلاث شمعات أو أكثر من آخر شمعة — ضمن شمعتين يفتح الشارت الشمعة التالية، أدناه)
  const late = { ...tick(1.1709), source: { ...src, as_of: now + 3600 } };
  assert.equal(livePriceForChart(eur, late, { nowSec: now + 3600 }), null);
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

// إغلاق الشمعة الحيّة قبل الجلب التالي: التيك يفتح الشمعة التالية، والمغلقة تبقى على آخر تيكاتها
{
  let ext: LiveExtremes | null = null;
  const lastOpen = eur.candles[29]!.time; // now − 60
  const feed = (p: number, at: number) => {
    const r = withLiveExtremes(eur, withLivePrice(eur, p, src, { nowSec: at, tickAsOf: at }), ext);
    ext = r.ext;
    return r.series.candles;
  };
  let cs = feed(1.1712, now); // داخل الشمعة: أعلى جديد
  assert.equal(cs.length, 30);
  cs = feed(1.1709, now + 830); // آخر تيك قبل الإغلاق (lastOpen + 890)
  assert.equal(cs[29]!.close, 1.1709);
  cs = feed(1.1715, lastOpen + 900 + 5); // أوّل تيك بالشمعة التالية
  assert.equal(cs.length, 31, 'next bar opened');
  assert.equal(cs[30]!.time, lastOpen + 900);
  assert.deepEqual([cs[30]!.open, cs[30]!.high, cs[30]!.low, cs[30]!.close], [1.1715, 1.1715, 1.1715, 1.1715]);
  assert.equal(cs[29]!.close, 1.1709, 'closed bar keeps its last tick, not the fetched 1.1702');
  assert.equal(cs[29]!.high, 1.1712, 'closed bar keeps its ticked wick');
  cs = feed(1.1701, lastOpen + 960);
  assert.equal(cs[30]!.open, 1.1715, 'open = first tick of the bar, not the current one');
  assert.equal(cs[30]!.low, 1.1701);
  assert.equal(cs[30]!.high, 1.1715);
  assert.equal(cs[29]!.close, 1.1709, 'closed bar still held on the next tick');
  assert.equal(livePriceForChart(eur, { price: 1.1701, source: { ...src, as_of: lastOpen + 960 } }, { nowSec: lastOpen + 960 }), 1.1701);
  // الجلب يصل بالشمعة الجديدة: شموع المزوّد تغلب (افتتاحها وإغلاق المغلقة)
  const fetched = {
    ...eur,
    candles: [...eur.candles, { time: lastOpen + 900, open: 1.171, high: 1.1716, low: 1.17, close: 1.1703 }],
  };
  const r = withLiveExtremes(fetched, withLivePrice(fetched, 1.1704, src, { nowSec: lastOpen + 970, tickAsOf: lastOpen + 970 }), ext);
  const fl = r.series.candles;
  assert.equal(fl.length, 31);
  assert.equal(fl[30]!.open, 1.171, 'provider open wins once fetched');
  assert.equal(fl[30]!.close, 1.1704);
  assert.equal(fl[29]!.close, 1.1702, 'fetched closed bar is authoritative');
  // 4H: لا فتح محلي (محاذاة المزوّد غير معروفة) — كالسابق
  const h4 = { ...eur, timeframe: '4h' };
  assert.equal(withLivePrice(h4, 1.17, src, { nowSec: lastOpen + 4 * 3600 + 5, tickAsOf: lastOpen + 4 * 3600 + 5 }), h4);
}

// شمعتان تُغلقان بين جلبَين (1m كل 90 ث): الشمعة المحلية الأولى تبقى بين الجلب والحيّة، بقمّتها وإغلاقها
{
  const m1: ChartSeries = { ...eur, timeframe: '1m', candles: eur.candles.map((c, i) => ({ ...c, time: now - (29 - i) * 60 })) };
  const t0 = m1.candles[29]!.time;
  let ext: LiveExtremes | null = null;
  const feed = (base: ChartSeries, p: number, at: number) => {
    const r = withLiveExtremes(base, withLivePrice(base, p, src, { nowSec: at, tickAsOf: at }), ext);
    ext = r.ext;
    return r.series.candles;
  };
  feed(m1, 1.1703, t0 + 30);
  feed(m1, 1.171, t0 + 70); // 10:01 تُفتح
  feed(m1, 1.1715, t0 + 100);
  feed(m1, 1.1708, t0 + 119);
  let cs = feed(m1, 1.1706, t0 + 125); // 10:02 تُفتح قبل الجلب
  assert.equal(cs.length, 32, 'the 10:01 bar survives the 10:02 roll');
  assert.equal(cs[30]!.time, t0 + 60);
  assert.deepEqual([cs[30]!.open, cs[30]!.high, cs[30]!.close], [1.171, 1.1715, 1.1708]);
  assert.equal(cs[31]!.time, t0 + 120);
  assert.equal(cs[31]!.open, 1.1706);
  assert.equal(cs[29]!.close, 1.1703, 'fetched-last bar keeps its ticks too');
  cs = feed(m1, 1.1709, t0 + 130);
  assert.equal(cs.length, 32, 'still held on the next tick');
  assert.equal(cs[30]!.high, 1.1715);
  // الجلب يحمل 10:01 ⇒ المزوّد يغلب، لا شمعة مكرّرة
  const fetched = { ...m1, candles: [...m1.candles, { time: t0 + 60, open: 1.1711, high: 1.1716, low: 1.1705, close: 1.1707 }] };
  cs = feed(fetched, 1.171, t0 + 140);
  assert.equal(cs.length, 32);
  assert.equal(cs[30]!.close, 1.1707, 'fetched 10:01 is authoritative');
  assert.equal(cs[31]!.open, 1.1706, 'live 10:02 keeps its first tick');
}

// نسبة الرأس = تغيّر اليوم من إغلاق الأمس، لا من أول شمعة محمّلة
{
  const s = { ...eur, candles: eur.candles.map((c, i) => (i === 0 ? { ...c, close: 1.16 } : c)) };
  assert.ok(Math.abs(headerChangePct(s, 1.1817, 1.17) - 1) < 1e-9);
  // بلا تيك ⇒ آخر إغلاق مقابل مرجع الأمس
  assert.ok(Math.abs(headerChangePct(s, null, 1.17) - ((1.1702 - 1.17) / 1.17) * 100) < 1e-9);
  // لا مرجع ⇒ من أول شمعة (السلوك السابق)
  assert.ok(Math.abs(headerChangePct(s, 1.1716, undefined) - 1) < 1e-9);
  // مرجع لا يعقل (>25%) ⇒ لا نسبة («—»)، لا نسبة أول شمعة بتعريف آخر (tools103a)
  assert.ok(Number.isNaN(headerChangePct(s, 1.1716, 150)));
  const pumped = { ...s, candles: s.candles.map((c, i) => (i === 0 ? { ...c, close: 0.5 } : c)) };
  assert.ok(Number.isNaN(headerChangePct(pumped, 1.3, 1.0)), 'no +160% from first loaded bar');
  // كريبتو الميم: +32% يوم عادي ⇒ يُعرض؛ مرجع أداة أخرى (−95%) ⇒ «—»
  const pepe = { ...s, symbol: 'PEPEUSD' };
  assert.ok(Math.abs(headerChangePct(pepe, 0.0000132, 0.00001) - 32) < 1e-6, 'crypto +32% shown');
  assert.ok(Number.isNaN(headerChangePct(pepe, 3000, 60000)), 'crypto wrong-instrument ref rejected');
  // شموع تجريبية ⇒ السلوك السابق
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

// الإعادة: إغلاق جلسة الأمس لشمعة الإعادة (17:00 نيويورك = 21:00 UTC صيفاً) لا أوّل شمعة محمّلة
{
  const t0 = Date.UTC(2026, 8, 21, 12) / 1000;
  const cs = Array.from({ length: 36 }, (_, i) => ({ time: t0 + i * 3600, open: 1, high: 1.2, low: 0.9, close: 1 + i / 1000 }));
  const h1 = { symbol: 'EURUSD', timeframe: '1h', candles: cs } as unknown as ChartSeries;
  assert.equal(replayPrevClose(h1, t0 + 20 * 3600), null, 'prev session cut off at series start');
  assert.equal(replayPrevClose(h1, t0 + 34 * 3600), 1.032, 'prev session close = Tue 20:00 bar');
  const d1 = { symbol: 'EURUSD', timeframe: '1d', candles: cs.slice(0, 5).map((c, i) => ({ ...c, time: i * 86400 })) } as unknown as ChartSeries;
  assert.equal(replayPrevClose(d1, 3 * 86400), 1.002, 'D1: previous bar close');
  assert.equal(replayPrevClose(h1, null), null);
}

// الأسبوعي مختوم الاثنين: تيك افتتاح الأحد لا يُدمج بشمعة الأسبوع الذي أُغلق الجمعة
{
  const mon = Date.UTC(2026, 8, 14) / 1000; // الاثنين 14 سبتمبر
  const sunOpen = Date.UTC(2026, 8, 20, 21, 30) / 1000;
  const wed = Date.UTC(2026, 8, 16, 12) / 1000;
  const W = 7 * 86400;
  assert.equal(liveBarOpenSec(mon, sunOpen, W, sunOpen + 1, 'EURUSD'), null, 'W: Sunday open not merged into last week');
  assert.equal(liveBarOpenSec(mon, wed, W, wed + 1, 'EURUSD'), mon, 'W: midweek tick merges');
  assert.equal(liveBarOpenSec(mon, sunOpen, W, sunOpen + 1, 'BTCUSD'), mon, 'W: crypto trades the weekend');
  assert.equal(liveBarOpenSec(mon, sunOpen, W, sunOpen + 1), mon, 'no symbol: unchanged behaviour');
  // شمعة الأسبوع الجديد (ختم الاثنين 21) موجودة عند افتتاح الأحد 20 ⇒ تيك الأحد 21:30 UTC لها لا يُهمل
  const nextMon = mon + W;
  assert.equal(liveBarOpenSec(nextMon, sunOpen, W, sunOpen + 1, 'EURUSD'), nextMon, 'W: Sunday tick merges into Monday-stamped bar');
  assert.equal(liveBarOpenSec(nextMon, sunOpen - 3 * 3600, W, sunOpen + 1, 'EURUSD'), null, 'W: Friday-before tick is not this week');
  // D: الختم X يغطّي X−1 ‏17:00 ⇒ X ‏17:00 نيويورك
  const wedD = Date.UTC(2026, 8, 23) / 1000;
  const wed22 = wedD + 22 * 3600;
  assert.equal(liveBarOpenSec(wedD, wed22, 86400, wed22 + 1, 'EURUSD'), null, 'D: post-17:00 NY tick not merged into closed bar');
  assert.equal(liveBarOpenSec(wedD + 86400, wed22, 86400, wed22 + 1, 'EURUSD'), wedD + 86400, 'D: tick merges into next-day stamp');
  assert.equal(liveBarOpenSec(wedD, wedD + 20 * 3600, 86400, wedD + 20 * 3600 + 1, 'EURUSD'), wedD, 'D: before 17:00 NY merges');
  assert.equal(liveBarOpenSec(wedD, wed22, 86400, wed22 + 1, 'BTCUSD'), wedD, 'D: crypto UTC day');
}

// الرأس: تيك بعد افتتاح اليومية الحقيقي (X−1 ‏17:00 نيويورك) وقبل ختمها ليس «أقدم من الشمعة»
{
  const wedD = Date.UTC(2026, 8, 23) / 1000;
  const bar = { time: wedD, open: 1, high: 1, low: 1, close: 1 };
  const d = { symbol: 'EURUSD', timeframe: 'D', candles: [bar] } as unknown as ChartSeries;
  const tue2215 = Date.UTC(2026, 8, 22, 22, 15) / 1000;
  assert.equal(tickPredatesLastBar(d, tue2215), false, 'D: Asian-open tick is live');
  assert.equal(tickPredatesLastBar(d, Date.UTC(2026, 8, 22, 20, 59) / 1000), true, 'D: before 17:00 NY is older');
  assert.equal(tickPredatesLastBar({ ...d, symbol: 'BTCUSD' } as ChartSeries, tue2215), true, 'D: crypto UTC day');
  const w = { symbol: 'EURUSD', timeframe: 'W', candles: [{ ...bar, time: Date.UTC(2026, 8, 28) / 1000 }] } as unknown as ChartSeries;
  assert.equal(tickPredatesLastBar(w, Date.UTC(2026, 8, 27, 21, 30) / 1000), false, 'W: Sunday-open tick is live');
  const h = { symbol: 'EURUSD', timeframe: '1H', candles: [{ ...bar, time: wedD }] } as unknown as ChartSeries;
  assert.equal(tickPredatesLastBar(h, wedD - 1), true, 'intraday: stamp is the open');
  assert.equal(tickPredatesLastBar(h, null), false);
}

console.log('liveSeries selftest: OK');
