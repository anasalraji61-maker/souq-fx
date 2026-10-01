/**
 * Self-test for planPanes (pure).
 * Run: npx --yes tsx src/chart/panes.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  COLLAPSED_BAR_H,
  MAX_PANE_H,
  MIN_PANE_H,
  PANE_IDS,
  PANE_LABELS,
  PANE_PRIORITY,
  collapsedBarText,
  planPanes,
} from './panes';

// مصدر المعرّفات سليم: لا تكرار، ولكلٍّ اسم، وكل أولوية موجودة فعلاً بين اللوحات
assert.equal(new Set(PANE_IDS).size, PANE_IDS.length);
assert.equal(PANE_IDS.length, 110);
for (const id of PANE_IDS) assert.ok(PANE_LABELS[id], `missing label: ${id}`);
for (const id of PANE_PRIORITY) assert.ok(PANE_IDS.includes(id), `unknown priority id: ${id}`);

const plan = (active: string[], availableH: number, dense = false) =>
  planPanes({ active, availableH, dense });

// لا مؤشّرات لوحات → كل الارتفاع للسعر
{
  const p = plan(['ema20', 'bollinger'], 420);
  assert.deepEqual(p.shown, []);
  assert.equal(p.mainH, 420);
  assert.equal(p.barH, 0);
}

// الحالة الشائعة: هاتف 420px بلوحة إلى أربع — كلّها تتّسع بلا طيّ ولا فيض
for (let n = 1; n <= 4; n++) {
  const active = ['volume', 'rsi', 'macd', 'stoch'].slice(0, n);
  const p = plan(active, 420);
  assert.equal(p.shown.length, n, `n=${n}`);
  assert.equal(p.collapsed.length, 0, `n=${n}`);
  assert.ok(p.paneH >= MIN_PANE_H && p.paneH <= MAX_PANE_H, `n=${n} paneH=${p.paneH}`);
  const total = p.mainH + p.shown.length * (p.paneH + p.gap);
  assert.ok(total <= 420, `n=${n} overflow: ${total}`);
}

// البند الذي فتح هذا العمل: خمس لوحات فأكثر بهاتف 420px كانت تفيض بصمت
{
  const active = ['volume', 'rsi', 'macd', 'stoch', 'atr', 'cci', 'willr', 'adx'];
  const p = plan(active, 420);
  assert.ok(p.collapsed.length > 0, 'expected collapsing');
  assert.equal(p.barH, COLLAPSED_BAR_H);
  assert.equal(p.shown.length + p.collapsed.length, active.length);
  const total = p.mainH + p.shown.length * (p.paneH + p.gap) + p.barH + p.gap;
  assert.ok(total <= 420, `overflow: ${total}`);
  // لا يُطوى RSI ليبقى ما هو أندر منه
  assert.ok(p.shown.includes('rsi'));
  assert.ok(p.shown.includes('volume'));
}

// الأولوية تتقدّم على ترتيب الرسم: Woodie CCI يسبق RSI رسماً، والعكس عند الضيق
{
  // 210px: الميزانية تتّسع للوحة واحدة بعد حجز الشريط
  const p = plan(['woodieCci', 'rsi'], 210);
  assert.ok(p.shown.includes('rsi'));
  assert.deepEqual(p.collapsed, ['woodieCci']);
  // والمعروض يبقى بترتيب الرسم مهما كان ترتيب الأولوية
  const p2 = plan(['woodieCci', 'rsi', 'macd'], 900);
  assert.deepEqual(p2.shown, ['woodieCci', 'rsi', 'macd']);
}

// خلية التخطيط الرباعي (~170px): لا لوحة تتّسع، فيبقى الشريط وحده — لا اختفاء صامت
{
  const p = plan(['rsi', 'macd'], 170);
  assert.equal(p.shown.length, 0);
  assert.equal(p.collapsed.length, 2);
  assert.equal(p.barH, COLLAPSED_BAR_H);
  const total = p.mainH + p.barH + p.gap;
  assert.ok(total <= 170, `overflow: ${total}`);
}

// إطار قصير جداً: الشريط ما زال يظهر (أرضية السعر تتنازل عن 22px لا أكثر)
{
  const p = plan(['rsi'], 120);
  assert.equal(p.barH, COLLAPSED_BAR_H);
  assert.ok(p.mainH + p.barH + p.gap <= 120);
}

// ارتفاع صفر أو سالب لا يُنتج قيَماً سالبة
for (const h of [0, -50]) {
  const p = plan(['rsi'], h);
  assert.ok(p.mainH >= 0 && p.paneH >= 0 && p.barH >= 0, `h=${h}`);
}

// الوضع المدمج: فجوة صفر — ميزانية أوسع للوحات بنفس الارتفاع
{
  const active = ['volume', 'rsi', 'macd', 'stoch', 'atr'];
  const normal = plan(active, 420, false);
  const dense = plan(active, 420, true);
  assert.equal(dense.gap, 0);
  assert.equal(normal.gap, 6);
  assert.ok(dense.shown.length >= normal.shown.length);
  const total = dense.mainH + dense.shown.length * dense.paneH + (dense.barH ? dense.barH : 0);
  assert.ok(total <= 420, `dense overflow: ${total}`);
}

// كل اللوحات الـ108 مفعَّلة: لا فيض، ولا لوحة أضيق من الحدّ الأدنى
{
  const p = plan([...PANE_IDS], 700);
  assert.ok(p.paneH >= MIN_PANE_H);
  assert.equal(p.shown.length + p.collapsed.length, 110);
  const total = p.mainH + p.shown.length * (p.paneH + p.gap) + (p.barH ? p.barH + p.gap : 0);
  assert.ok(total <= 700, `overflow: ${total}`);
}

// نص الشريط
assert.equal(collapsedBarText(['rsi', 'macd']), 'RSI · MACD');
assert.equal(collapsedBarText(['rsi', 'macd', 'atr', 'cci', 'adx']), 'RSI · MACD · ATR · CCI …');
assert.equal(collapsedBarText([]), '');

// ===== صفحات اللوحات: ضغطة الشريط تُظهر المطويّ بدل الظاهر =====

// الصفحة 0 = السلوك السابق حرفياً (الأعلى أولوية أولاً) — لا انحدار لمن لا يضغط الشريط
{
  const active = [...PANE_IDS];
  const a = plan(active, 420);
  const b = planPanes({ active, availableH: 420, dense: false, page: 0 });
  assert.deepEqual(a.shown, b.shown);
  assert.deepEqual(a.collapsed, b.collapsed);
  assert.equal(a.page, 0);
  assert.ok(a.pageCount > 1, `pageCount=${a.pageCount}`);
}

// الصفحات تقسّم اللوحات قسمةً تامّة: كل لوحة تظهر بصفحة واحدة بالضبط عبر الدورة كاملة
{
  const active = ['volume', 'rsi', 'macd', 'stoch', 'atr', 'adx', 'cci', 'obv', 'mfi'];
  const p0 = planPanes({ active, availableH: 420, dense: false, page: 0 });
  assert.ok(p0.collapsed.length > 0, 'expected collapsing at 420px with 9 panes');
  const seen = new Set<string>();
  for (let i = 0; i < p0.pageCount; i++) {
    const p = planPanes({ active, availableH: 420, dense: false, page: i });
    assert.equal(p.page, i);
    assert.equal(p.pageCount, p0.pageCount);
    assert.equal(p.shown.length + p.collapsed.length, active.length);
    // لا لوحة بصفحتين
    for (const id of p.shown) {
      assert.ok(!seen.has(id), `pane shown twice across pages: ${id}`);
      seen.add(id);
    }
    // الظاهر يبقى بترتيب الرسم لا بترتيب الأولوية
    const order = p.shown.map((id) => PANE_IDS.indexOf(id));
    for (let j = 1; j < order.length; j++) assert.ok(order[j] > order[j - 1], 'draw order broken');
    // ولا فيض بأي صفحة
    const total = p.mainH + p.shown.length * (p.paneH + p.gap) + (p.barH ? p.barH + p.gap : 0);
    assert.ok(total <= 420, `overflow on page ${i}: ${total}`);
  }
  assert.equal(seen.size, active.length, 'every pane must be reachable by paging');
}

// الدورة مغلقة: بعد آخر صفحة تعود الأولى — والرقم غير المحصور يُحصر دورياً
{
  const active = ['volume', 'rsi', 'macd', 'stoch', 'atr', 'adx', 'cci', 'obv', 'mfi'];
  const n = planPanes({ active, availableH: 420, dense: false, page: 0 }).pageCount;
  const first = planPanes({ active, availableH: 420, dense: false, page: 0 });
  for (const raw of [n, 2 * n, 97 * n]) {
    const p = planPanes({ active, availableH: 420, dense: false, page: raw });
    assert.equal(p.page, 0, `page ${raw} should wrap to 0`);
    assert.deepEqual(p.shown, first.shown);
  }
  // الأرقام السالبة (لا تحدث من الواجهة لكن لا تكسر الدالة) وغير الرقمية
  assert.equal(planPanes({ active, availableH: 420, dense: false, page: -1 }).page, n - 1);
  assert.equal(planPanes({ active, availableH: 420, dense: false, page: Number.NaN }).page, 0);
  assert.equal(planPanes({ active, availableH: 420, dense: false, page: 2.7 }).page, 2 % n);
}

// إطار لا يتّسع ولا للوحة واحدة: صفحة واحدة فقط — فلا يَعِد الشريط بتبديل لا يحدث
{
  const active = ['volume', 'rsi', 'macd'];
  for (const h of [0, 40, 120]) {
    const p = planPanes({ active, availableH: h, dense: false, page: 3 });
    if (p.shown.length === 0) {
      assert.equal(p.pageCount, 1, `h=${h} pageCount=${p.pageCount}`);
      assert.equal(p.page, 0);
    }
  }
}

// لا طيّ أصلاً: صفحة واحدة مهما كان الرقم الممرَّر
{
  const p = planPanes({ active: ['volume', 'rsi'], availableH: 600, dense: false, page: 5 });
  assert.equal(p.collapsed.length, 0);
  assert.equal(p.pageCount, 1);
  assert.equal(p.page, 0);
}

// بلا لوحات إطلاقاً
{
  const p = planPanes({ active: [], availableH: 420, dense: false, page: 4 });
  assert.equal(p.pageCount, 1);
  assert.equal(p.page, 0);
}

console.log('panes.selftest: PASS');
