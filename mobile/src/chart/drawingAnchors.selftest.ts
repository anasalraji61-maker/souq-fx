/**
 * Self-test for drawing time anchors (pure).
 * Run: npx --yes tsx src/chart/drawingAnchors.selftest.ts
 */
import assert from 'node:assert/strict';
import { anchorDrawings, indexAtTime, stampAtIndex, timeAtIndex } from './drawingAnchors';
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
  assert.equal(indexAtTime(b, -2 * H, H), -2);
  for (const i of [-4, 0, 3, 4, 9]) assert.equal(indexAtTime(b, timeAtIndex(b, i, H)!, H), i);
}

const line = (ai: number, bi: number, extra: Partial<Drawing> = {}): Drawing => ({
  id: 'd1',
  tool: 'trend',
  a: { index: ai, price: 1.08 },
  b: { index: bi, price: 1.09 },
  color: '#fff',
  ...extra,
} as Drawing);

// جوهر البند: رُسم أمس، واليوم النافذة زحفت 24 شمعة ⇒ الخطّ على الشموع نفسها
{
  const yesterday = bars(1000 * H, 300);
  const stamped = anchorDrawings([line(250, 280)], yesterday, H, true);
  assert.equal(stamped[0].a.time, 1250 * H);
  assert.equal(stamped[0].b!.time, 1280 * H);
  const today = bars(1024 * H, 300); // آخر 300 بعد 24 شمعة جديدة
  const re = anchorDrawings(stamped, today, H, true);
  assert.equal(re[0].a.index, 226);
  assert.equal(re[0].b!.index, 256);
  assert.equal(today[re[0].a.index].time, 1250 * H); // الشمعة نفسها، لا الخانة
  assert.equal(re[0].a.price, 1.08);
}

// لا تغيير ⇒ المصفوفة نفسها (لا رسم ولا كتابة بكل تيك)؛ وسلسلة فارغة ⇒ لا ختم
{
  const b = bars(0, 50);
  const once = anchorDrawings([line(10, 20)], b, H, true);
  assert.equal(anchorDrawings(once, b, H, true), once);
  const raw = [line(10, 20)];
  assert.equal(anchorDrawings(raw, [], H, true), raw);
}

// نقطة سُحبت (جديدة بلا time) تُختم بموضعها الجديد، والطرف الآخر يبقى على زمنه
{
  const b = bars(0, 50);
  const d = anchorDrawings([line(10, 20)], b, H, true)[0];
  const moved = { ...d, b: { index: 30, price: 1.1 } };
  const out = anchorDrawings([moved], b, H, true)[0];
  assert.equal(out.b!.time, 30 * H);
  assert.equal(out.a, d.a);
}

// الأنواع الاصطناعية: ختم فقط، بلا إعادة فهرسة
{
  const b = bars(0, 50);
  const d = { ...line(10, 20), a: { index: 3, price: 1, time: 40 * H } };
  const out = anchorDrawings([d], b, H, false)[0];
  assert.equal(out.a.index, 3);
  assert.equal(out.b!.time, 20 * H);
}

// رسم بطرف واحد (hline) لا يكتسب `b`
{
  const d = { id: 'h', tool: 'hline', a: { index: 5, price: 1 }, color: '#fff' } as Drawing;
  const out = anchorDrawings([d], bars(0, 10), H, true)[0];
  assert.equal('b' in out, false);
  assert.equal(out.a.time, 5 * H);
}

// طرف بالمستقبل: يُختم بآخر شمعة + عدد شموع، فالعطلة لا تزيحه ولا تُسقطه على الجمعة
{
  const fri = bars(1000 * H, 50); // آخر شمعة 1049
  assert.deepEqual(stampAtIndex(fri, 59, H), { time: 1049 * H, ahead: 10, aheadStep: H });
  assert.deepEqual(stampAtIndex(fri, 20, H), { time: 1020 * H });
  assert.equal(stampAtIndex([], 3, H), null);
  const d = anchorDrawings([line(40, 59)], fri, H, true)[0];
  assert.equal(d.b!.ahead, 10);
  // الاثنين: فجوة 49 ساعة ثم 5 شموع جديدة، والنافذة زحفت 5
  const mon = [...fri.slice(5), ...bars(1098 * H, 5)];
  const re = anchorDrawings([d], mon, H, true)[0];
  assert.equal(re.a.index, 35);
  assert.equal(re.b!.index, 44 + 10); // خانة شمعة الجمعة الأخيرة + 10 شموع متداولة
  // الزمن التقويمي القديم (1059) كان سيسقط على آخر شمعة الجمعة: الخانة 44
  assert.equal(indexAtTime(mon, 1059 * H, H), 44);
  // ثابتة: لا تغيير ثانٍ
  assert.equal(anchorDrawings([re], mon, H, true)[0], re);
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
  const onD1 = anchorDrawings([fromH1], days, D, true)[0];
  assert.equal(onD1.a.index, 10.25);
  assert.equal(onD1.b!.index, 10.75);
  // طرف بالمستقبل: 48 شمعة ساعة = شمعتان يوميّتان
  const ahead: Drawing = {
    ...line(0, 0),
    a: { index: 0, price: 1, time: 120 * D },
    b: { index: 0, price: 1, time: 129 * D, ahead: 48, aheadStep: H },
  };
  const a2 = anchorDrawings([ahead], days, D, true)[0];
  assert.equal(a2.b!.index, 29 + 2);
  // يومي ⇒ ساعة: الزمن على بداية اليوم تماماً ⇒ خانة صحيحة بلا كسر
  const hours = bars(110 * 24 * H, 72);
  const back = anchorDrawings([{ ...line(0, 0), a: { index: 3, price: 1, time: 111 * D } }], hours, H, true)[0];
  assert.equal(back.a.index, 24);
}

console.log('drawingAnchors.selftest: PASS');
