/**
 * Self-test for drawingsPersist (pure — مؤقّتات وهمية، بلا تخزين ولا React).
 * Run: npx --yes tsx src/chart/drawingsPersist.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  DRAWINGS_SAVE_DELAY_MS,
  DrawingsSaveQueue,
  type DrawingsTimers,
  drawingsKey,
  drawingsSignature,
} from './drawingsPersist';
import type { Drawing } from './types';

/** مؤقّتات وهمية: لا وقت حقيقياً، والتشغيل يدويّ بـ`tick()`. */
function fakeTimers() {
  let seq = 0;
  const jobs = new Map<number, () => void>();
  const timers: DrawingsTimers = {
    set: (fn) => {
      const id = ++seq;
      jobs.set(id, fn);
      return id;
    },
    clear: (h) => {
      jobs.delete(h as number);
    },
  };
  return {
    timers,
    /** يشغّل كل ما هو مجدوَل (كأنّ المهلة انقضت). */
    tick() {
      const now = [...jobs.entries()];
      jobs.clear();
      for (const [, fn] of now) fn();
    },
    live: () => jobs.size,
  };
}

const d = (id: string): Drawing => ({
  id,
  tool: 'hline',
  a: { index: 0, price: 1 },
  color: '#2DD4BF',
});

type Written = { symbol: string; timeframe: string; ids: string[] };
function recorder() {
  const out: Written[] = [];
  return {
    out,
    save: (symbol: string, timeframe: string, drawings: Drawing[]) =>
      out.push({ symbol, timeframe, ids: drawings.map((x) => x.id) }),
  };
}

// أ) المفتاح: لا التباس بين رمز وفريم مهما قُطّعت الحروف
{
  assert.equal(drawingsKey('EURUSD', '1H'), drawingsKey('EURUSD', '1H'));
  assert.notEqual(drawingsKey('EURUSD', '1H'), drawingsKey('EURUSD', '4H'));
  assert.notEqual(drawingsKey('EURUSD', '1H'), drawingsKey('XAUUSD', '1H'));
  assert.notEqual(
    drawingsKey('EURUSD', '1H'),
    drawingsKey('EUR', 'USD1H'),
    'الفاصل يمنع التباس التقطيع'
  );
  assert.ok(DRAWINGS_SAVE_DELAY_MS > 0);
}

// ب) الحالة العادية: كتابة واحدة بعد المهلة، وآخر حالة هي المكتوبة
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  q.schedule('EURUSD', '1H', [d('a')]);
  q.schedule('EURUSD', '1H', [d('a'), d('b')]);
  q.schedule('EURUSD', '1H', [d('a'), d('b'), d('c')]);
  assert.equal(r.out.length, 0, 'لا كتابة قبل انقضاء المهلة');
  assert.equal(t.live(), 1, 'مؤقّت واحد لا ثلاثة');
  t.tick();
  assert.deepEqual(r.out, [{ symbol: 'EURUSD', timeframe: '1H', ids: ['a', 'b', 'c'] }]);
  t.tick();
  assert.equal(r.out.length, 1, 'لا كتابة مكرّرة بعد الانطلاق');
}

// ج) **الخطأ الأول**: ما تأجّل يُكتب بمفتاحه هو لا بمفتاح الرمز الجديد
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  q.schedule('EURUSD', '1H', [d('eur-line')]);
  assert.equal(q.pendingKey(), drawingsKey('EURUSD', '1H'));
  // المتداول بدّل للذهب قبل انقضاء المهلة
  q.flush();
  assert.deepEqual(r.out, [{ symbol: 'EURUSD', timeframe: '1H', ids: ['eur-line'] }]);
  assert.equal(q.pendingKey(), null);
  // ولو انقضت المهلة بعدها لا تُكتب مرّة ثانية
  t.tick();
  assert.equal(r.out.length, 1);
  // والرمز الجديد يكتب حمولته هو
  q.schedule('XAUUSD', '1H', []);
  t.tick();
  assert.deepEqual(r.out[1], { symbol: 'XAUUSD', timeframe: '1H', ids: [] });
}

// د) **الخطأ الثاني**: رسمٌ ثم تبديل فوري — لا يضيع
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  q.schedule('EURUSD', '1H', [d('just-drawn')]);
  q.flush(); // التبديل يحدث خلال أقلّ من 400ms
  assert.deepEqual(r.out, [{ symbol: 'EURUSD', timeframe: '1H', ids: ['just-drawn'] }]);
  assert.equal(t.live(), 0, 'المؤقّت أُلغي فلا كتابة ثانية');
}

// هـ) flush بلا شيء مؤجَّل: لا كتابة فارغة تمسح رسومات محفوظة
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  q.flush();
  q.flush();
  assert.equal(r.out.length, 0, 'flush على فراغ لا يكتب شيئاً');
  // وبعد كتابة فعلية، flush ثانية لا تعيدها
  q.schedule('EURUSD', '1H', [d('a')]);
  t.tick();
  q.flush();
  assert.equal(r.out.length, 1);
}

// و) cancel: تفكيك المكوّن يُسقط المؤجَّل بلا كتابة
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  q.schedule('EURUSD', '1H', [d('a')]);
  q.cancel();
  assert.equal(q.pendingKey(), null);
  t.tick();
  assert.equal(r.out.length, 0);
  assert.equal(t.live(), 0);
}

// ز) سلسلة تبديلات متتابعة: لكل مفتاح كتابة واحدة بحمولته، وبالترتيب
{
  const t = fakeTimers();
  const r = recorder();
  const q = new DrawingsSaveQueue(r.save, t.timers, 400);
  for (const [sym, tf, id] of [
    ['EURUSD', '1H', 'x'],
    ['XAUUSD', '1H', 'y'],
    ['XAUUSD', '4H', 'z'],
  ] as const) {
    q.schedule(sym, tf, [d(id)]);
    q.flush();
  }
  assert.deepEqual(
    r.out.map((w) => `${w.symbol}/${w.timeframe}:${w.ids.join(',')}`),
    ['EURUSD/1H:x', 'XAUUSD/1H:y', 'XAUUSD/4H:z']
  );
}

// البصمة: فهرس مشتقّ من زمن لا يغيّرها، وفهرس بلا زمن يغيّرها، وأي تعديل آخر يغيّرها
{
  const d = (a: Drawing['a']): Drawing => ({ id: 'x', tool: 'hline', a, color: '#fff' }) as Drawing;
  const s = drawingsSignature([d({ index: 10, price: 1.1, time: 3600 })]);
  assert.equal(drawingsSignature([d({ index: 34, price: 1.1, time: 3600 })]), s);
  assert.notEqual(drawingsSignature([d({ index: 10, price: 1.2, time: 3600 })]), s);
  assert.notEqual(drawingsSignature([d({ index: 10, price: 1.1, time: 7200 })]), s);
  assert.notEqual(
    drawingsSignature([d({ index: 10, price: 1.1 })]),
    drawingsSignature([d({ index: 11, price: 1.1 })])
  );
}

console.log('drawingsPersist.selftest: PASS');
