/**
 * Self-test for paneGuides (pure).
 * Run: npx --yes tsx src/chart/paneGuides.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  GUIDES_LABEL_MIN_INNER_H,
  GUIDES_MID_MIN_INNER_H,
  GUIDES_MIN_INNER_H,
  PANE_GUIDES,
  formatPaneValue,
  latestPaneValue,
  paneValueState,
  placeGuides,
} from './paneGuides';

// سلامة الجدول: كل عتبة داخل مدى لوحتها، والمدى صاعد
for (const [id, spec] of Object.entries(PANE_GUIDES)) {
  assert.ok(spec.max > spec.min, `${id}: bad span`);
  assert.ok(spec.levels.length > 0, `${id}: no levels`);
  for (const lv of spec.levels) {
    assert.ok(lv.v >= spec.min && lv.v <= spec.max, `${id}: level ${lv.v} outside [${spec.min},${spec.max}]`);
  }
}

const INNER = 60; // لوحة مريحة

// RSI: الخطوط الثلاثة بالترتيب الصحيح — 70 أعلى الصورة، 30 أسفلها، 50 بينهما
{
  const g = placeGuides('rsi', INNER);
  assert.equal(g.length, 3);
  const by = (v: number) => g.find((x) => x.v === v)!;
  assert.equal(by(70).top, 18); // ((100-70)/100)*60
  assert.equal(by(50).top, 30);
  assert.equal(by(30).top, 42);
  assert.ok(by(70).top < by(50).top && by(50).top < by(30).top);
  assert.equal(by(70).label, '70');
  assert.equal(by(50).kind, 'mid');
}

// %R بمدى سالب يستعمل نفس التعيين بالضبط: ‎−20‎ بأعلى الصورة و‎−80‎ بأسفلها
{
  const g = placeGuides('willr', INNER);
  assert.equal(g.length, 2);
  const by = (v: number) => g.find((x) => x.v === v)!;
  assert.equal(by(-20).top, 12); // ((0-(-20))/100)*60
  assert.equal(by(-80).top, 48);
  assert.ok(by(-20).top < by(-80).top);
  assert.equal(by(-80).label, '-80');
}

// ADX: عتبة واحدة (25) وهي 'mid' فتختفي باللوحة القصيرة
{
  assert.equal(placeGuides('adx', INNER).length, 1);
  assert.equal(placeGuides('adx', INNER)[0].v, 25);
  assert.equal(placeGuides('adx', GUIDES_MID_MIN_INNER_H - 1).length, 0);
}

// تدرّج الازدحام: الوسطى تختفي أولاً، ثم الأرقام، ثم الخطوط كلّها
{
  assert.equal(placeGuides('rsi', GUIDES_MID_MIN_INNER_H).length, 3);
  const short = placeGuides('rsi', GUIDES_MID_MIN_INNER_H - 1);
  assert.equal(short.length, 2);
  assert.ok(short.every((x) => x.kind === 'extreme'));
  assert.ok(short.every((x) => x.label != null)); // ما زال يتّسع للأرقام

  const noLabels = placeGuides('rsi', GUIDES_LABEL_MIN_INNER_H - 1);
  assert.equal(noLabels.length, 2);
  assert.ok(noLabels.every((x) => x.label == null));

  assert.deepEqual(placeGuides('rsi', GUIDES_MIN_INNER_H - 1), []);
  assert.deepEqual(placeGuides('rsi', 0), []);
  assert.deepEqual(placeGuides('rsi', -10), []);
  assert.deepEqual(placeGuides('rsi', Number.NaN), []);
}

// لوحة بلا عتبات معروفة (مقياس ديناميكي) لا تُرسم لها خطوط مخترَعة
for (const id of ['cci', 'roc', 'atr', 'volume', '', 'nope']) {
  assert.deepEqual(placeGuides(id, INNER), [], id);
}

// الخط لا يخرج خارج مساحة الرسم مهما صغرت
{
  for (const h of [18, 19, 34, 44, 200]) {
    for (const id of Object.keys(PANE_GUIDES)) {
      for (const g of placeGuides(id, h)) {
        assert.ok(g.top >= 0 && g.top <= h - 1, `${id}@${h}: top=${g.top}`);
      }
    }
  }
}

// قراءة آخر قيمة: تتخطّى الذيل الفارغ (الشموع غير المكتملة) ولا تتوقّف عنده
{
  assert.equal(latestPaneValue([1, 2, 3]), 3);
  assert.equal(latestPaneValue([1, 2, null, null]), 2);
  assert.equal(latestPaneValue([null, null]), null);
  assert.equal(latestPaneValue([]), null);
  assert.equal(latestPaneValue([1, Number.NaN]), 1);
  assert.equal(latestPaneValue([1, undefined]), 1);
  assert.equal(latestPaneValue([Number.POSITIVE_INFINITY, 5]), 5);
}

// الصياغة تتّسع بعرض 36px
{
  assert.equal(formatPaneValue(62.34), '62.3');
  assert.equal(formatPaneValue(0), '0.0');
  assert.equal(formatPaneValue(-80.25), '-80.3');
  assert.equal(formatPaneValue(100), '100');
  // Math.round بجافاسكريبت يقرّب النصف نحو ‎+∞‎ (‎−1234.5 → −1234‎) — مثبَّت هنا عمداً
  // حتى لا يُقرأ الرقم يوماً كأنه خطأ حساب.
  assert.equal(formatPaneValue(-1234.5), '-1234');
  assert.equal(formatPaneValue(-1234.6), '-1235');
  assert.equal(formatPaneValue(null), null);
  assert.equal(formatPaneValue(Number.NaN), null);
}

// حالة القيمة (لتلوين الرقم وحده)
{
  assert.equal(paneValueState('rsi', 85), 'high');
  assert.equal(paneValueState('rsi', 70), 'mid'); // العتبة نفسها ليست تجاوزاً
  assert.equal(paneValueState('rsi', 50), 'mid');
  assert.equal(paneValueState('rsi', 12), 'low');
  assert.equal(paneValueState('willr', -5), 'high');
  assert.equal(paneValueState('willr', -90), 'low');
  assert.equal(paneValueState('willr', -50), 'mid');
  // ADX بعتبة واحدة: لا حالة 'low' — ADX منخفض يعني «بلا اتجاه» لا إشارة عكسية
  assert.equal(paneValueState('adx', 40), 'high');
  assert.equal(paneValueState('adx', 10), 'mid');
  assert.equal(paneValueState('rsi', null), 'mid');
  assert.equal(paneValueState('cci', 500), 'mid');
}

console.log('paneGuides.selftest: PASS');
