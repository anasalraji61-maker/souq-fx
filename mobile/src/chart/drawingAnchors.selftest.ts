/**
 * Self-test for drawing time anchors (pure).
 * Run: npx --yes tsx src/chart/drawingAnchors.selftest.ts
 */
import assert from 'node:assert/strict';
import { anchorDrawings, anchorPoint, drawSlotAt, indexAtTime, stampAtIndex, timeAtIndex } from './drawingAnchors';
import type { Drawing } from './types';

const H = 3600;
const bars = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ time: from + i * H }));

// timeAtIndex: داخل السلسلة، وبعدها وقبلها بخطوة الفريم
{
  const b = bars(1000 * H, 5);
  assert.equal(timeAtIndex(b, 2, H), 1002 * H);
  assert.equal(timeAtIndex(b, 7, H), 1007 * H);
  assert.equal(timeAtIndex(b, -3, H), 997 * H);
  assert.equal(timeAtIndex([], 0, H), null);
}

// indexAtTime: تطابق، فجوة (آخر شمعة قبله)، خارج السلسلة، وعكس timeAtIndex
{
  const b = [0, 1, 2, 5, 6].map((i) => ({ time: i * H })); // فجوة 3–4 (عطلة)
  assert.equal(indexAtTime(b, 2 * H, H), 2);
  assert.equal(indexAtTime(b, 4 * H, H), 2);
  assert.equal(indexAtTime(b, 5 * H, H), 3);
  assert.equal(indexAtTime(b, 9 * H, H), 7);
  // قبل أوّل شمعة بمتوسّط الشمعة المحمَّلة (6 ساعات / 4 = 1.5 ساعة) لا بساعة التقويم
  assert.equal(indexAtTime(b, -3 * H, H), -2);
  for (const i of [-4, 0, 3, 4, 9]) assert.equal(indexAtTime(b, timeAtIndex(b, i, H)!, H), i);
}

// ترند طرفه الأقدم خرج من التاريخ المحمَّل بعد عطلة: يبقى بعدد الشموع لا بساعات التقويم
{
  // 120 شمعة تداول (5 أيام × 24) ثم عطلة 48 ساعة ثم 60 شمعة: 180 شمعة، الشمعة ≈ 1.27 ساعة
  const times: number[] = [];
  for (let i = 0; i < 120; i++) times.push(i * H);
  for (let i = 0; i < 60; i++) times.push((120 + 48 + i) * H);
  const b = times.map((time) => ({ time }));
  // السلسلة تغطّي أسبوعاً ⇒ نمطها يتكرّر للخلف: 120 شمعة تداول ثم 48 ساعة عطلة. 140 ساعة قبل أوّل شمعة
  // = 28 ساعة تداول بالأسبوع السابق قبل عطلته ⇒ −92 (كان −140 بساعات التقويم، ثم −110 بالمتوسّط المتقلّب)
  assert.equal(indexAtTime(b, -140 * H, H), -92);
  for (const i of [-1, -92, -120, -121, -400]) assert.equal(indexAtTime(b, timeAtIndex(b, i, H)!, H), i);
}

// شعاع اليومي على H1 بساعات الفوركس الحقيقية (الأحد 21:00 ← الجمعة 21:00 UTC): طرفاه قبل التاريخ المحمَّل،
// وخانتهما ثابتة بالشموع مع كل شمعة جديدة — كانت تقفز 76 شمعة عند افتتاح الأحد (متوسّط النافذة يتبدّل).
{
  const open = (t: number) => {
    const d = new Date(t * 1000);
    const wd = d.getUTCDay();
    const h = d.getUTCHours();
    return !(wd === 6 || (wd === 5 && h >= 21) || (wd === 0 && h < 21));
  };
  const all: number[] = [];
  const t0 = Date.UTC(2026, 6, 5, 21) / 1000; // الأحد 5 يوليو 21:00
  for (let t = t0; all.length < 2000; t += H) if (open(t)) all.push(t);
  const a = Date.UTC(2026, 7, 10) / 1000; // الاثنين 10 أغسطس (شمعة يومية)
  const trueIdx = all.findIndex((t) => t >= a);
  for (let end = 1500; end < 1700; end++) {
    const win = all.slice(end - 180, end).map((time) => ({ time }));
    assert.equal(indexAtTime(win, a, H), trueIdx - (end - 180), `window ending at bar ${end}`);
  }
}

const line = (ai: number, bi: number, extra: Partial<Drawing> = {}): Drawing => ({
  id: 'd1',
  tool: 'trend',
  a: { index: ai, price: 1.08 },
  b: { index: bi, price: 1.09 },
  color: '#fff',
  ...extra,
} as Drawing);

// نقطة من فريم أصغر داخل الشمعة الحيّة: كسر داخلها، لا خانة المستقبل التالية
{
  const b = bars(1000 * H, 10);
  const liveStart = 1009 * H;
  assert.equal(indexAtTime(b, liveStart + 45 * 60, H), 9);
  const d = anchorDrawings(
    [{ ...line(0, 0), a: { index: 0, price: 1, time: liveStart + 45 * 60 }, b: { index: 0, price: 1, time: liveStart + 15 * 60 } }],
    b,
    H,
    false
  );
  assert.equal(d[0].a.index, 9.75);
  assert.equal(d[0].b!.index, 9.25);
  assert.equal(indexAtTime(b, liveStart + H, H), 10); // خطوة كاملة بعدها ⇒ مستقبل كالسابق
}

// جوهر البند: رُسم أمس، واليوم النافذة زحفت 24 شمعة ⇒ الخطّ على الشموع نفسها
{
  const yesterday = bars(1000 * H, 300);
  const stamped = anchorDrawings([line(250, 280)], yesterday, H, false);
  assert.equal(stamped[0].a.time, 1250 * H);
  assert.equal(stamped[0].b!.time, 1280 * H);
  const today = bars(1024 * H, 300); // آخر 300 بعد 24 شمعة جديدة
  const re = anchorDrawings(stamped, today, H, false);
  assert.equal(re[0].a.index, 226);
  assert.equal(re[0].b!.index, 256);
  assert.equal(today[re[0].a.index].time, 1250 * H); // الشمعة نفسها، لا الخانة
  assert.equal(re[0].a.price, 1.08);
}

// لا تغيير ⇒ المصفوفة نفسها (لا رسم ولا كتابة بكل تيك)؛ وسلسلة فارغة ⇒ لا ختم
{
  const b = bars(0, 50);
  const once = anchorDrawings([line(10, 20)], b, H, false);
  assert.equal(anchorDrawings(once, b, H, false), once);
  const raw = [line(10, 20)];
  assert.equal(anchorDrawings(raw, [], H, false), raw);
}

// نقطة سُحبت (جديدة بلا time) تُختم بموضعها الجديد، والطرف الآخر يبقى على زمنه
{
  const b = bars(0, 50);
  const d = anchorDrawings([line(10, 20)], b, H, false)[0];
  const moved = { ...d, b: { index: 30, price: 1.1 } };
  const out = anchorDrawings([moved], b, H, false)[0];
  assert.equal(out.b!.time, 30 * H);
  assert.equal(out.a, d.a);
}

// الأنواع الاصطناعية: الإرساء بزمن الشمعة المصدر (`srcTime`) لا بزمن اللبنة المختلَق
{
  // لبنات Renko: الشمعة 100 صنعت لبنتين، 103 ثلاثاً، 107 واحدة. `time` مختلَق كما بـrenko.ts.
  const src = [100, 100, 103, 103, 103, 107];
  const bricks = src.map((h, i) => ({ time: 100 * H + i * 60, srcTime: h * H }));
  // ختم لبنة: زمن شمعتها الحقيقية، و`sub` ترتيبها بين أخواتها
  assert.deepEqual(stampAtIndex(bricks, 3, H), { time: 103 * H, sub: 1 });
  assert.deepEqual(stampAtIndex(bricks, 2, H), { time: 103 * H });
  // رُسم على اللبنة 3 ⇒ يعود إليها بعد إعادة التحميل بفهرس قديم
  const drawn = { ...line(0, 0), a: { index: 3, price: 1 }, b: { index: 5, price: 1 } };
  const s1 = anchorDrawings([drawn], bricks, H, true)[0];
  assert.deepEqual([s1.a.time, s1.a.sub, s1.a.index], [103 * H, 1, 3]);
  assert.equal(anchorDrawings([{ ...s1, a: { ...s1.a, index: 0 } }], bricks, H, true)[0].a.index, 3);
  // على شموع الساعة: عند الشمعة 103 لا عند بداية السلسلة (كان زمن اللبنة 100h+180s)
  const hours = bars(90 * H, 30);
  assert.equal(anchorDrawings([s1], hours, H, false)[0].a.index, 13);
  // نقطة من شموع الساعة (104h، لا لبنة عندها) ⇒ آخر لبنة اكتملت قبلها
  const fromH1 = { ...line(0, 0), a: { index: 14, price: 1, time: 104 * H }, b: { index: 17, price: 1, time: 107 * H } };
  const onRenko = anchorDrawings([fromH1], bricks, H, true)[0];
  assert.equal(onRenko.a.index, 4);
  assert.equal(onRenko.b!.index, 5);
  // `sub` أكبر من عدد اللبنات الحالي ⇒ آخرهنّ لا ما بعدهنّ
  const far = { ...line(0, 0), a: { index: 0, price: 1, time: 100 * H, sub: 5 } };
  assert.equal(anchorDrawings([far], bricks, H, true)[0].a.index, 1);
  // Range: أزمنة حقيقية بلا `srcTime` ⇒ نفس القاعدة بلا كسر داخل الخانة
  const range = [0, 3, 4, 9].map((h) => ({ time: h * H }));
  const mid = { ...line(0, 0), a: { index: 0, price: 1, time: 5 * H } };
  assert.equal(anchorDrawings([mid], range, H, true)[0].a.index, 2);
}

// رسم بطرف واحد (hline) لا يكتسب `b`
{
  const d = { id: 'h', tool: 'hline', a: { index: 5, price: 1 }, color: '#fff' } as Drawing;
  const out = anchorDrawings([d], bars(0, 10), H, false)[0];
  assert.equal('b' in out, false);
  assert.equal(out.a.time, 5 * H);
}

// طرف بالمستقبل: يُختم بآخر شمعة + عدد شموع، فالعطلة لا تزيحه ولا تُسقطه على الجمعة
{
  const fri = bars(1000 * H, 50); // آخر شمعة 1049
  assert.deepEqual(stampAtIndex(fri, 59, H), { time: 1049 * H, ahead: 10, aheadStep: H });
  assert.deepEqual(stampAtIndex(fri, 20, H), { time: 1020 * H });
  assert.equal(stampAtIndex([], 3, H), null);
  const d = anchorDrawings([line(40, 59)], fri, H, false)[0];
  assert.equal(d.b!.ahead, 10);
  // الاثنين: فجوة 49 ساعة ثم 5 شموع جديدة، والنافذة زحفت 5
  const mon = [...fri.slice(5), ...bars(1098 * H, 5)];
  const re = anchorDrawings([d], mon, H, false)[0];
  assert.equal(re.a.index, 35);
  assert.equal(re.b!.index, 44 + 10); // خانة شمعة الجمعة الأخيرة + 10 شموع متداولة
  // الزمن التقويمي القديم (1059) كان سيسقط على آخر شمعة الجمعة: الخانة 44
  assert.equal(indexAtTime(mon, 1059 * H, H), 44);
  // ثابتة: لا تغيير ثانٍ
  assert.equal(anchorDrawings([re], mon, H, false)[0], re);
}

// مشتركة بين الفريمات: خطّ رُسم على الساعة يُفتح على اليومي (وعكسه)
{
  const D = 24 * H;
  const days = Array.from({ length: 30 }, (_, i) => ({ time: (100 + i) * D }));
  // قمّتان بيوم واحد (06:00 و18:00) ⇒ ربع ونصف+ربع شمعة، لا خطّ عمودي على شمعة واحدة
  const fromH1: Drawing = {
    ...line(0, 0),
    a: { index: 0, price: 1.08, time: 110 * D + 6 * H },
    b: { index: 0, price: 1.09, time: 110 * D + 18 * H },
  };
  const onD1 = anchorDrawings([fromH1], days, D, false)[0];
  assert.equal(onD1.a.index, 10.25);
  assert.equal(onD1.b!.index, 10.75);
  // سحب الخطّ على اليومي (رأسياً، أو بشمعة) يُبقي الساعة داخل اليوم: كان الختم يقصّ الكسر لـ00:00
  assert.equal(stampAtIndex(days, 10.75, D)!.time, 110 * D + 18 * H);
  assert.equal(stampAtIndex(days, 11.25, D)!.time, 111 * D + 6 * H);
  assert.equal(timeAtIndex(days, 10, D), 110 * D);
  const h1Bars = Array.from({ length: 24 * 30 }, (_, i) => ({ time: 100 * D + i * H }));
  const moved: Drawing = {
    ...line(0, 0),
    a: { index: 11.25, price: 1.08, ...stampAtIndex(days, 11.25, D)! },
    b: { index: 11.75, price: 1.09, ...stampAtIndex(days, 11.75, D)! },
  };
  const onH1 = anchorDrawings([moved], h1Bars, H, false)[0];
  assert.equal(onH1.a.index, 11 * 24 + 6);
  assert.equal(onH1.b!.index, 11 * 24 + 18);
  // طرف بالمستقبل: 48 شمعة ساعة = شمعتان يوميّتان
  const ahead: Drawing = {
    ...line(0, 0),
    a: { index: 0, price: 1, time: 120 * D },
    b: { index: 0, price: 1, time: 129 * D, ahead: 48, aheadStep: H },
  };
  const a2 = anchorDrawings([ahead], days, D, false)[0];
  assert.equal(a2.b!.index, 29 + 2);
  // يومي ⇒ ساعة: الزمن على بداية اليوم تماماً ⇒ خانة صحيحة بلا كسر
  const hours = bars(110 * 24 * H, 72);
  const back = anchorDrawings([{ ...line(0, 0), a: { index: 3, price: 1, time: 111 * D } }], hours, H, false)[0];
  assert.equal(back.a.index, 24);
}

// آخر لبنة ليست آخر شمعة (`endTime`): آخر لبنة Renko من الشمعة 20 والشموع حتى 29 بلا لبنة جديدة
{
  const candles = bars(0, 30);
  const bricks = [5, 12, 20].map((h, i) => ({ time: 100 * H + i * 60, srcTime: h * H }));
  const end = 29 * H;
  // طرف مستقبل على Renko بعد آخر لبنة بـ3 ⇒ على الشموع بعد آخر شمعة بـ3 (كان 20 + 3 = 23، بالماضي)
  const st = stampAtIndex(bricks, 2 + 3, H, end)!;
  assert.equal(st.time, end);
  assert.equal(st.ahead, 3);
  const fut = line(0, 5, { b: { index: 5, price: 1, ...st } });
  assert.equal(anchorDrawings([fut], candles, H, false, end)[0].b!.index, 29 + 3);
  // والعودة لـRenko: الطرف نفسه بعد آخر لبنة بـ3 لا بـ3 + 9 شموع
  assert.equal(anchorDrawings([{ ...fut, b: { ...fut.b!, index: 0 } }], bricks, H, true, end)[0].b!.index, 2 + 3);
  // شمعة بعد آخر لبنة (25) ⇒ على Renko اللبنة السارية (الأخيرة)، لا المنطقة المستقبلية
  assert.equal(indexAtTime(bricks, 25 * H, H, end), 2);
  assert.equal(indexAtTime(bricks, 25 * H, H), 2 + 5);
  // بعد آخر شمعة ⇒ المستقبل يُعدّ من آخر شمعة
  assert.equal(indexAtTime(bricks, 31 * H, H, end), 2 + 2);
  // شموع عادية: endTime = آخر شمعة ⇒ بلا تغيير
  assert.deepEqual(stampAtIndex(candles, 32, H, end), stampAtIndex(candles, 32, H));
}

// drawSlotAt: بلا إزاحة يقصّ لآخر شمعة؛ مع سحب الشارت يساراً يبلغ خانات المستقبل الظاهرة فقط
{
  assert.equal(drawSlotAt(50, 0, 100, 10), 5);
  assert.equal(drawSlotAt(99.9, 0, 100, 10), 9);
  assert.equal(drawSlotAt(140, 0, 100, 10), 9);
  assert.equal(drawSlotAt(-5, 0, 100, 10), 0);
  // سُحب 30px يساراً ⇒ ثلاث خانات فارغة يمين آخر شمعة
  assert.equal(drawSlotAt(95, -30, 100, 10), 12);
  assert.equal(drawSlotAt(99, -30, 100, 10), 12);
  assert.equal(drawSlotAt(400, -30, 100, 10), 12);
  assert.equal(drawSlotAt(10, 0, 0, 0), 0);
}

// نقطة من فريم أصغر في فجوة العطلة (افتتاح الأحد 22:00) ⇒ شمعة الاثنين اليومية لا الجمعة
{
  const D = 86400;
  const fri = Date.UTC(2026, 8, 18) / 1000;
  const mon = Date.UTC(2026, 8, 21) / 1000;
  const d1 = [fri - D, fri, mon].map((time) => ({ time }));
  const sun22 = mon - 2 * H;
  const out = anchorDrawings([line(0, 0, { a: { index: 0, price: 1.1, time: sun22 } })], d1, D, false);
  assert.equal(out[0]!.a.index, 2, 'Sunday gap-open point sits on Monday D1 bar');
  // داخل الجمعة يبقى كسراً داخلها
  const fri12 = fri + 12 * H;
  const in2 = anchorDrawings([line(0, 0, { a: { index: 0, price: 1.1, time: fri12 } })], d1, D, false);
  assert.equal(in2[0]!.a.index, 1.5);
}

// نافذة أقصر من أسبوع (M15 بـ180 شمعة) ونقطة قبلها عبر عطلة نهاية الأسبوع: تُعدّ بشموع تداول لا بساعات تقويم.
{
  const M15 = 900;
  // فوركس صيفي: إغلاق الجمعة 21:00 UTC وافتتاح الأحد 21:00 UTC
  const gen = (step: number, n: number, end: number) => {
    const out: { time: number }[] = [];
    for (let t = Math.floor(end / step) * step; out.length < n; t -= step) {
      const d = new Date(t * 1000);
      const wd = d.getUTCDay();
      const h = d.getUTCHours();
      if (!(wd === 6 || (wd === 5 && h >= 21) || (wd === 0 && h < 21))) out.push({ time: t });
    }
    return out.reverse();
  };
  const now = Date.UTC(2026, 8, 23, 14) / 1000; // الأربعاء
  const m15 = gen(M15, 180, now);
  const h1 = gen(H, 180, now);
  const thu = Date.UTC(2026, 8, 17, 10) / 1000; // الخميس السابق 10:00
  const tue = Date.UTC(2026, 8, 22, 10) / 1000;
  // 35 ساعة حتى إغلاق الجمعة + 20.25 ساعة من افتتاح الأحد حتى أوّل شمعة (الإثنين 17:15) = 221 شمعة M15
  assert.equal(indexAtTime(m15, thu, M15, undefined, true), -221);
  assert.equal(indexAtTime(m15, thu, M15), -413, 'بلا الإشارة: السلوك القديم (الكريبتو 24/7)');
  assert.equal(timeAtIndex(m15, -221, M15, undefined, true), thu);
  assert.equal(stampAtIndex(m15, -221, M15, undefined, true)!.time, thu);
  // الخطّ يقطع الشمعة الحيّة بالسعر نفسه على M15 وH1
  const tl = [line(0, 0, { a: { index: 0, price: 1.1, time: thu }, b: { index: 0, price: 1.11, time: tue } })];
  const at = (bs: { time: number }[], step: number) => {
    const d = anchorDrawings(tl, bs, step, false, undefined, true)[0]!;
    return d.a.price + ((d.b!.price - d.a.price) * (bs.length - 1 - d.a.index)) / (d.b!.index - d.a.index);
  };
  assert.ok(Math.abs(at(m15, M15) - at(h1, H)) < 1e-9, `${at(m15, M15)} ≠ ${at(h1, H)}`);
}

// Renko: نقطة بمنطقة المستقبل بعد شمعة حيّة صنعت ثلاث لبنات تبقى بخانتها (كانت تقفز لأولى لبنات الشمعة).
{
  const T0 = 1_790_000_000;
  const bricks = [0, 1, 2, 3, 3, 3].map((h, i) => ({ time: T0 + 60 * i, srcTime: T0 + h * 3600 }));
  const endTime = T0 + 3 * 3600;
  for (const idx of [6, 8]) {
    const s = stampAtIndex(bricks, idx, 3600, endTime, true)!;
    const p = anchorPoint({ index: idx, price: 1.1, ...s } as never, bricks, 3600, true, endTime, true);
    assert.equal(p.index, idx);
  }
  // لبنة داخل الشمعة (sub) لا تتأثّر.
  const s4 = stampAtIndex(bricks, 4, 3600, endTime, true)!;
  assert.equal(anchorPoint({ index: -1, price: 1.1, ...s4 } as never, bricks, 3600, true, endTime, true).index, 4);
}

// قبل أوّل شمعة: كسر الشمعة وقاعدة الفجوة كما داخل السلسلة (كانا يضيعان ⇒ ترند عمودي، ونقطة الأحد على الجمعة).
{
  const H = 3600;
  const D = 86400;
  const mon = Date.UTC(2026, 0, 5) / 1000;
  const days: { time: number }[] = [];
  for (let w = 0; w < 10; w++) for (let d = 0; d < 5; d++) days.push({ time: mon + w * 7 * D + d * D });
  const at = (t: number) => anchorPoint({ index: 0, price: 1, time: t } as never, days, D, false, undefined, 'EURUSD').index;
  const preWed = mon - 14 * D + 2 * D;
  assert.equal(at(preWed + 6 * H), -7.75);
  assert.equal(at(preWed + 18 * H), -7.25);
  assert.equal(at(mon - 7 * D - 2 * H), -5); // الأحد 22:00 ⇒ شمعة الاثنين
  // ختم عند −7.5 ثم إعادة فهرسة ⇒ −7.5 لا −8
  const s = stampAtIndex(days, -7.5, D, undefined, 'EURUSD')!;
  assert.equal(anchorPoint({ index: -7.5, price: 1, ...s } as never, days, D, false, undefined, 'EURUSD').index, -7.5);
  // كريبتو H1 متّصل (متوسّط الخطوة): 5س45د قبل الأولى ⇒ −5.75
  const t0 = mon;
  const hours = Array.from({ length: 100 }, (_, i) => ({ time: t0 + i * H }));
  const idx = anchorPoint({ index: 0, price: 1, time: t0 - 5 * H - 45 * 60 } as never, hours, H, false).index;
  assert.ok(Math.abs(idx + 5.75) < 1e-9, `crypto pre-first ${idx}`);
}

console.log('drawingAnchors.selftest: PASS');
