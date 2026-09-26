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
  PANE_VALUE_MAX_CHARS,
  formatPaneValue,
  paneBoundedDecimals,
  formatPaneValueScaled,
  paneShownValue,
  latestPaneValue,
  percentBRange,
  paneSeriesMaxAbs,
  paneSpreadSeries,
  paneValueAt,
  paneValueDecimals,
  paneValueState,
  paneValueTrend,
  placeGuides,
  placeScaledGuides,
  GUIDE_LABEL_MIN_GAP,
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
  assert.equal(g.length, 3);
  assert.equal(g.find((x) => x.v === -50)!.kind, 'mid');
  assert.equal(placeGuides('willr', GUIDES_MID_MIN_INNER_H - 1).length, 2);
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

// أعلى لوحة فعلية (MAX_PANE_H 48 ⇒ مساحة 32): العتبات مرقّمة والوسط مرسوم — كانت عتباتها 34/44 فلا يظهر أيّهما.
{
  const full = placeGuides('rsi', 32);
  assert.equal(full.length, 3);
  assert.deepEqual(full.map((x) => x.label), ['70', null, '30']); // 50 أقرب من 10px لـ70 ⇒ خطّ بلا رقم
  const chop = placeGuides('chop', 32).filter((x) => x.label != null);
  assert.equal(chop.length, 1); // 61.8 و38.2 على بعد ~7.6px ⇒ رقم واحد
  const rvix = placeGuides('rvix', 32);
  // 80/20 كـTradingView مرقّمان، و50 خطّ بلا رقم (أقرب من 10px لكليهما)
  assert.deepEqual(rvix.map((x) => [x.v, x.label]), [[80, '80'], [50, null], [20, '20']]);
  assert.deepEqual(placeGuides('rvix', GUIDES_MID_MIN_INNER_H - 1).map((x) => x.v), [80, 20]);
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
  // %R/CMO/%B قرب الصفر من تحت: لا «-0.0»
  assert.equal(formatPaneValue(-0.04), '0.0');
  // حدّ ‎100‎ بعد التقريب: ‎99.96‎ و‎100.04‎ كلاهما «100»
  assert.equal(formatPaneValue(99.96), '100');
  assert.equal(formatPaneValue(-99.97), '-100');
  assert.equal(formatPaneValue(99.94), '99.9');
  assert.equal(formatPaneValue(-0.003, 2), '0.00');
  assert.equal(formatPaneValue(-0.06), '-0.1');
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

// ——— صياغة قيمة لوحة ثنائية الجانب (مقياس ديناميكي) ———

// أ) مقياس اللوحة: أقصى مطلق صالح، ويتجاهل null/NaN/Infinity
{
  assert.equal(paneSeriesMaxAbs([1, -5, 3]), 5);
  assert.equal(paneSeriesMaxAbs([null, -0.004, 0.002]), 0.004);
  assert.equal(paneSeriesMaxAbs([]), 0);
  assert.equal(paneSeriesMaxAbs([null, undefined]), 0);
  assert.equal(paneSeriesMaxAbs([Number.NaN, Number.POSITIVE_INFINITY, 2]), 2);
  assert.equal(paneSeriesMaxAbs([0]), 0);
}

// ب) الخانات العشرية: ثلاث خانات معنوية عند المقياس، محصورة 0..8
{
  assert.equal(paneValueDecimals(0.00042), 6);
  assert.equal(paneValueDecimals(0.5), 3);
  assert.equal(paneValueDecimals(5.67), 2);
  assert.equal(paneValueDecimals(56.7), 1);
  assert.equal(paneValueDecimals(567), 0);
  assert.equal(paneValueDecimals(5678), 0);
  assert.equal(paneValueDecimals(0), 2);
  assert.equal(paneValueDecimals(-1), 2);
  assert.equal(paneValueDecimals(Number.NaN), 2);
  assert.ok(paneValueDecimals(1e-30) <= 8);
  let prev = -1;
  for (const a of [1e4, 1e3, 100, 10, 1, 0.1, 0.01, 0.001]) {
    const d = paneValueDecimals(a);
    assert.ok(d >= prev, `a=${a}`);
    prev = d;
  }
}

// ج) الصياغة: **الشكل واحد لكل اللوحة**، والجانبان متماثلان
{
  // MACD على زوج عملات: القيم بحدود 1e-4 — الصياغة الثابتة السابقة كانت تعطي «0.0»
  const macdLike = [0.00042, -0.00031, 0.00018, null, 0.00007];
  assert.equal(formatPaneValue(0.00042), '0.0', 'الصياغة القديمة فعلاً عديمة الفائدة هنا');
  // خمس خانات لا ستّ: ستّ لا تتّسع بالسالب (‎-0.000310‎ تسعة محارف)، فتُخفَّض للّوحة
  // كلّها — لا لبعض قيمها — فيبقى الشكل واحداً والجانبان متماثلين.
  assert.equal(formatPaneValueScaled(macdLike, 0.00042), '0.00042');
  assert.equal(formatPaneValueScaled(macdLike, -0.00031), '-0.00031');
  // نفس عدد الخانات للقيمتين — لا شكلان بلوحة واحدة
  const pos = formatPaneValueScaled(macdLike, 0.00042)!;
  const neg = formatPaneValueScaled(macdLike, -0.00031)!;
  assert.equal(pos.split('.')[1]!.length, neg.split('.')[1]!.length);

  // الصياغة لا تتغيّر بتغيّر القيمة المعروضة وحدها (ثبات مع كل تيك)
  const decs = new Set(
    macdLike
      .filter((v): v is number => v != null)
      .map((v) => formatPaneValueScaled(macdLike, v)!.split('.')[1]?.length ?? 0)
  );
  assert.equal(decs.size, 1, 'خانات مختلفة داخل لوحة واحدة');
}

// د) المدى الكامل: مقاييس صغيرة وكبيرة، وK/M للحجم الضخم
{
  // مقياس 120 ⇐ ثلاث خانات معنوية = أعداد صحيحة (وهكذا يُقرأ CCI وROC فعلاً)
  assert.equal(formatPaneValueScaled([120, -80], 62.5), '63');
  assert.equal(formatPaneValueScaled([120, -80], -80), '-80');
  // ومقياس 2.4 ⇐ خانتان، فالدقّة تتبع اللوحة لا رقماً ثابتاً
  assert.equal(formatPaneValueScaled([2.4, -2.4], 0.625), '0.63');
  assert.equal(formatPaneValueScaled([2.5, -1.2], 1.234), '1.23');
  assert.equal(formatPaneValueScaled([9000, -9000], 1234.5), '1235');
  // OBV/حجم: المقياس ≥1e5 ⇐ آلاف، و≥1e8 ⇐ ملايين
  assert.ok(formatPaneValueScaled([5e5, -5e5], 250000)!.endsWith('K'));
  assert.ok(formatPaneValueScaled([5e9, -5e9], 2.5e9)!.endsWith('M'));
  // وتحت 1e5 تبقى أرقاماً عادية (لا «0.1K» لقيمة 120)
  assert.equal(formatPaneValueScaled([5e4, -5e4], 120), '120');
}

// هـ) الحدود: null/NaN ⇐ لا نصّ، والصفر صفر لا «-0»
{
  assert.equal(formatPaneValueScaled([1, 2], null), null);
  assert.equal(formatPaneValueScaled([1, 2], undefined), null);
  assert.equal(formatPaneValueScaled([1, 2], Number.NaN), null);
  assert.equal(formatPaneValueScaled([1, 2], Number.POSITIVE_INFINITY), null);
  assert.equal(formatPaneValueScaled([1, 2], 0), '0');
  assert.equal(formatPaneValueScaled([0.5, -0.5], -0.0001), '0', 'لا «-0» بالواجهة');
  assert.equal(formatPaneValueScaled([], 5), '5');
}

// و) **حدّ العرض**: لا نصّ يتجاوز ما يتّسع بعمود الرأس، بأيّ مقياس وأيّ إشارة
{
  const scales = [1e-9, 1e-6, 1e-4, 0.001, 0.01, 1, 9.99, 99.9, 1234, 99999, 5e5, 5e9, 1e14];
  for (const m of scales) {
    for (const v of [m, -m, m / 3, -m / 3, m / 1000, 0]) {
      const t = formatPaneValueScaled([m, -m], v);
      if (t == null) continue;
      assert.ok(
        t.length <= PANE_VALUE_MAX_CHARS,
        `مقياس ${m} قيمة ${v} ⇐ «${t}» (${t.length} محرفاً > ${PANE_VALUE_MAX_CHARS})`
      );
    }
  }
}

// ز) اتّساع الفكّ (Gator): نقطة صالحة متى صحّت السلسلتان معاً، والقيمة موجبة أبداً
{
  // نفس اصطلاح computeGator: upper ≥ 0 وlower ≤ 0
  assert.deepEqual(paneSpreadSeries([1, 2, 3], [-1, -2, -3]), [2, 4, 6]);
  assert.deepEqual(
    paneSpreadSeries([1, null, 3], [-1, -2, null]),
    [2, null, null],
    'طول جانب واحد ليس اتّساعاً'
  );
  assert.deepEqual(paneSpreadSeries([Number.NaN, 2], [-1, -2]), [null, 4]);
  assert.deepEqual(paneSpreadSeries([1, 2, 3], [-1]), [2], 'الطول أقصر السلسلتين');
  assert.deepEqual(paneSpreadSeries([], []), []);
  assert.equal(paneSpreadSeries([0], [0])[0], 0, 'فكّ منطبق ⇐ صفر لا null');
  // موجب أبداً بهذا الاصطلاح — وهو سبب أن التلوين بالإشارة لا يقول شيئاً
  for (const [u, l] of [[0.0001, -0.00002], [5, -0.1], [0, -3]] as const) {
    assert.ok(paneSpreadSeries([u], [l])[0]! >= 0);
  }
  // والصياغة تمرّ بنفس دالّة الـ47 لوحة بلا شيفرة جديدة
  assert.equal(formatPaneValueScaled(paneSpreadSeries([1, 2], [-1, -2]), 4), '4');
}

// ح) اتّجاه آخر قيمتين صالحتين — أساس لون رأس Gator
{
  assert.equal(paneValueTrend([1, 2]), 'up');
  assert.equal(paneValueTrend([2, 1]), 'down');
  assert.equal(paneValueTrend([2, 2]), 'flat');
  assert.equal(paneValueTrend([]), null);
  assert.equal(paneValueTrend([5]), null, 'قيمة واحدة ⇐ لا اتّجاه');
  assert.equal(paneValueTrend([null, null]), null);
  // فجوة null بين آخر قيمتين لا تُسقط المقارنة
  assert.equal(paneValueTrend([1, null, null, 3]), 'up');
  assert.equal(paneValueTrend([3, Number.NaN, 1]), 'down');
  // ذيل null بعد القيم لا يخفي الاتّجاه
  assert.equal(paneValueTrend([1, 2, null]), 'up');
  // آخر قيمتين لا أوّلهما
  assert.equal(paneValueTrend([9, 1, 2]), 'up');
}

// ح٢) القراءة عند شمعة التقاطع — الرقم يتبع التقاطع لا آخر السلسلة
{
  const v = [10, 20, 30, 40];
  assert.equal(paneValueAt(v, 0), 10);
  assert.equal(paneValueAt(v, 2), 30);
  assert.equal(paneValueAt(v, 3), 40);
  // بلا تقاطع ⇐ آخر قيمة صالحة (السلوك السابق كما هو)
  assert.equal(paneValueAt(v, null), 40);
  assert.equal(paneValueAt(v, undefined), 40);
  assert.equal(paneValueAt([10, 20, null], null), 20, 'آخر صالحة لا آخر خانة');
  // خارج المدى (النافذة تحرّكت والتقاطع قائم) ⇐ آخر قيمة، لا فراغ
  assert.equal(paneValueAt(v, 4), 40);
  assert.equal(paneValueAt(v, 99), 40);
  assert.equal(paneValueAt(v, -1), 40);
  assert.equal(paneValueAt(v, 1.5), 40, 'فهرس غير صحيح ⇐ آخر قيمة');
  assert.equal(paneValueAt(v, Number.NaN), 40);
  // شمعة صحيحة لكن المؤشّر لم ينضج عندها ⇐ لا رقم مزوَّر
  assert.equal(paneValueAt([null, null, 30], 0), null);
  assert.equal(paneValueAt([Number.NaN, 20], 0), null);
  assert.equal(paneValueAt([], 0), null, 'سلسلة فارغة ⇐ null');
  assert.equal(paneValueAt([], null), null);
  // والصياغة تمرّ كما هي على القيمة المقروءة
  assert.equal(formatPaneValue(paneValueAt([62.34, 68.91], 0)), '62.3');
  assert.equal(paneValueState('rsi', paneValueAt([75, 40], 0)), 'high', 'الحالة من شمعة التقاطع');
  assert.equal(paneValueState('rsi', paneValueAt([75, 40], 1)), 'mid');
}

// ط) اتّجاه محدود بشمعة التقاطع — لون رأس Gator يتبع المقروء
{
  const v = [1, 2, 1, 5];
  assert.equal(paneValueTrend(v), 'up', 'بلا حدّ: آخر قيمتين (1 ⇒ 5)');
  assert.equal(paneValueTrend(v, 2), 'down', 'عند الفهرس 2: (2 ⇒ 1)');
  assert.equal(paneValueTrend(v, 1), 'up');
  assert.equal(paneValueTrend(v, 0), null, 'أول شمعة ⇐ لا سابق فلا اتّجاه');
  // حدّ خارج المدى يُتجاهَل فيعود للسلوك الافتراضي
  assert.equal(paneValueTrend(v, 99), 'up');
  assert.equal(paneValueTrend(v, -1), 'up');
  assert.equal(paneValueTrend(v, 1.5), 'up');
  assert.equal(paneValueTrend(v, null), 'up');
  // فجوة null قبل شمعة التقاطع لا تُسقط المقارنة
  assert.equal(paneValueTrend([1, null, 3, 9], 2), 'up');
}

// ي) StochRSI و‎%B‎: العتبتان الجديدتان وخانات الكسر المشتقّة من المدى
{
  // StochRSI بعتبات الستوكاستيك لا عتبات RSI — وهو الخطأ الذي يسهل الوقوع فيه
  const sr = placeGuides('stochRsi', INNER);
  assert.deepEqual(sr.map((g) => g.v).sort((a, b) => b - a), [80, 50, 20]);
  // خطّ الوسط 50 كـTV على الستوكاستيك وMFI وStochRSI
  for (const k of ['stoch', 'mfi', 'stochRsi']) {
    assert.deepEqual(placeGuides(k, INNER).filter((g) => g.kind === 'mid').map((g) => g.v), [50], k);
  }
  assert.equal(sr.find((g) => g.v === 80)!.top, 12); // ((100-80)/100)*60
  assert.ok(!sr.some((g) => g.v === 70 || g.v === 30), 'ليست عتبات RSI');
  assert.equal(paneValueState('stochRsi', 85), 'high');
  assert.equal(paneValueState('stochRsi', 50), 'mid');
  assert.equal(paneValueState('stochRsi', 5), 'low');

  // ‎%B‎ بوحدة السلسلة (كسر): الخط عند 0.8 بموضع ((1-0.8)/1)*60
  const pb = placeGuides('percentB', INNER);
  assert.deepEqual(pb.map((g) => g.v), [0.8, 0.5, 0.2]);
  // مدى ‎0..1‎ فالقسمة كسريّة: المقارنة بهامش ‎1e-9‎ بكسل — الفرق دون البكسل الواحد
  // بمراتب، ولا يُطلب هنا تطابق ثنائي تامّ (‎0.2‎ نفسها ليست تمثيلاً تامّاً).
  const near = (a: number, b: number, m: string) =>
    assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} ≠ ${b}`);
  near(pb.find((g) => g.v === 0.8)!.top, 12, '%B 0.8');
  near(pb.find((g) => g.v === 0.5)!.top, 30, 'الوسط = المتوسّط المتحرّك');
  near(pb.find((g) => g.v === 0.2)!.top, 48, '%B 0.2');
  assert.equal(pb.find((g) => g.v === 0.5)!.label, '0.5');
  // خارج الحزام: القيمة تتجاوز المدى فعلاً — الحالة تُقرأ ولا تُقصّ
  assert.equal(paneValueState('percentB', 1.2), 'high');
  assert.equal(paneValueState('percentB', -0.1), 'low');
  assert.equal(paneValueState('percentB', 0.5), 'mid');

  // خانات الكسر: مدى واسع ⇐ واحدة، مدى ضيّق ⇐ اثنتان، لوحة بلا عتبات ⇐ واحدة
  assert.equal(paneBoundedDecimals('rsi'), 1);
  assert.equal(paneBoundedDecimals('stochRsi'), 1);
  assert.equal(paneBoundedDecimals('willr'), 1, 'مدى سالب واسع');
  assert.equal(paneBoundedDecimals('percentB'), 2);
  // Laguerre RSI: خطّا ‎0.85/0.15‎ على حدّي ألوان الخطّ، ومداه 0..1 ⇒ خانتان عشريتان.
  const lg = placeGuides('laguerreRsi', INNER);
  assert.deepEqual(lg.map((g) => g.v), [0.85, 0.5, 0.15]);
  assert.ok(Math.abs(lg[0].top - 0.15 * INNER) < 1e-9);
  assert.equal(paneValueState('laguerreRsi', 0.9), 'high');
  assert.equal(paneValueState('laguerreRsi', 0.1), 'low');
  assert.equal(paneValueState('laguerreRsi', 0.85), 'mid');
  assert.equal(paneBoundedDecimals('laguerreRsi'), 2);
  assert.equal(paneBoundedDecimals('nope'), 1);
  // العشر لوحات المحصورة الجديدة: عتباتها = حدود ألوان خطّها بالرسم (تُطابَق حرفياً هنا).
  assert.deepEqual(PANE_GUIDES.stc.levels.map((l) => l.v), [75, 25]);
  assert.deepEqual(PANE_GUIDES.connorsRsi.levels.map((l) => l.v), [90, 10]);
  assert.deepEqual(PANE_GUIDES.tii.levels.map((l) => l.v), [80, 20]);
  // DeMarker بمقياس 0–1 (قرار أنس ١١): خانتان عشريتان ‎0.63‎، والحالة من 0.7/0.3.
  assert.deepEqual(PANE_GUIDES.demarker.levels.map((l) => l.v), [0.7, 0.3]);
  assert.equal(paneBoundedDecimals('demarker'), 2);
  assert.equal(paneValueState('demarker', 0.75), 'high');
  assert.equal(paneValueState('demarker', 0.25), 'low');
  assert.equal(paneValueState('demarker', 0.5), 'mid');
  for (const id of ['rmi', 'cutlerRsi', 'ultimateOsc']) {
    assert.deepEqual(PANE_GUIDES[id].levels.map((l) => l.v), [70, 30], id);
  }
  assert.equal(paneValueState('chop', 62), 'high');
  assert.equal(paneValueState('chop', 38), 'low');
  assert.equal(paneValueState('chop', 50), 'mid');
  // CMO بمدى ‎−100..100‎: ‎+50‎ بربع الارتفاع و‎−50‎ بثلاثة أرباعه، و0 بالمنتصف
  const cm = placeGuides('cmo', INNER);
  assert.deepEqual(cm.map((g) => [g.v, g.top]), [[50, 15], [0, 30], [-50, 45]]);
  assert.equal(paneValueState('cmo', -60), 'low');
  assert.equal(paneValueState('cmo', 55), 'high');
  assert.equal(paneValueState('cmo', 0), 'mid');
  // ADXR كـADX: عتبة 25 واحدة، تحتها 'mid' لا 'low'
  assert.equal(paneValueState('adxr', 30), 'high');
  assert.equal(paneValueState('adxr', 10), 'mid');
  assert.equal(paneBoundedDecimals('cmo'), 1);
  // وبها يُقرأ ‎%B‎ فعلاً بدل أن تتساوى كل قراءاته
  assert.equal(formatPaneValue(0.42, 2), '0.42');
  assert.equal(formatPaneValue(0.47, 2), '0.47');
  assert.notEqual(formatPaneValue(0.42, 2), formatPaneValue(0.47, 2));
  assert.equal(formatPaneValue(0.42), '0.4', 'الافتراض لم يتغيّر');
  assert.equal(formatPaneValue(1.05, 2), '1.05', 'فوق الحزام يُكتب كما هو');
  // معامل فاسد ⇐ الافتراض، لا NaN ولا استثناء من toFixed
  assert.equal(formatPaneValue(0.42, -1), '0.4');
  assert.equal(formatPaneValue(0.42, 99), '0.4');
  assert.equal(formatPaneValue(0.42, 1.5), '0.4');
  assert.equal(formatPaneValue(123.4, 2), '123', '≥100 بلا كسر مهما كانت الخانات');
}

console.log('paneGuides.selftest: PASS');

// عتبات بمقياس النافذة (Mass Index ‎27 / 26.5‎)
{
  // مقياس ‎24..28‎ على 60px: 27 عند 15px، و26.5 عند 22.5 — أقرب من 10px فيُسقَط رقمها لا خطّها
  const g = placeScaledGuides([26.5, 27], 24, 28, 60);
  assert.deepEqual(g.map((x) => x.v), [27, 26.5], 'الأعلى أولاً مهما كان ترتيب الإدخال');
  assert.equal(g[0].top, 15);
  assert.equal(g[1].top, 22.5);
  assert.equal(g[0].label, '27');
  assert.equal(g[1].label, null);
  // مقياس ضيّق (‎26..27.5‎): تتباعدان بما يكفي ⇒ الرقمان معاً
  const w = placeScaledGuides([27, 26.5], 26, 27.5, 60);
  assert.ok(w[1].top - w[0].top >= GUIDE_LABEL_MIN_GAP);
  assert.deepEqual(w.map((x) => x.label), ['27', '26.5']);
  // لوحة قصيرة: خطوط بلا أرقام؛ أقصر من الحدّ: لا شيء؛ مدى صفر/فاسد: لا شيء
  assert.ok(placeScaledGuides([27], 24, 28, GUIDES_MIN_INNER_H).every((x) => x.label === null));
  assert.deepEqual(placeScaledGuides([27], 24, 28, GUIDES_MIN_INNER_H - 1), []);
  assert.deepEqual(placeScaledGuides([27], 27, 27, 60), []);
  assert.deepEqual(placeScaledGuides([27], 24, NaN, 60), []);
  // العتبة على الحافّة تبقى داخل المساحة
  assert.equal(placeScaledGuides([28], 24, 28, 60)[0].top, 0);
  assert.equal(placeScaledGuides([24], 24, 28, 60)[0].top, 59);
}

// اللون من الرقم المطبوع: ‎3e-7‎ بمقياس MACD اليورو يُطبع «0» ⇒ لا جانب
{
  const macdEur = [0.00042, -0.00031, 0.0000003];
  const txt = formatPaneValueScaled(macdEur, 0.0000003);
  assert.equal(txt, '0');
  assert.equal(paneShownValue(txt), 0);
  assert.equal(paneShownValue('-0.00031'), -0.00031);
  assert.equal(paneShownValue('1.5K'), 1500);
  assert.equal(paneShownValue('-2.25M'), -2250000);
  assert.equal(paneShownValue('3.0e-7'), 3e-7);
  assert.equal(paneShownValue(null), null);
  assert.equal(paneShownValue('50'), 50);
}

// لوحة بوحدة السعر: منازل الزوج حدّ أدنى — Momentum اليورو بمدى ‎0.0105‎ كان «0.0005»
{
  const momEur = [0.0105, -0.0081, 0.00047];
  assert.equal(formatPaneValueScaled(momEur, 0.00047), '0.0005', 'بلا منازل الزوج: ثلاث خانات معنوية من المقياس');
  assert.equal(formatPaneValueScaled(momEur, 0.00047, 5), '0.00047');
  assert.equal(formatPaneValueScaled([1.52, -1.1], 0.472, 3), '0.472', 'الين بثلاث منازل');
  // الحدّ لا يُنقص خانات المقياس (ميل الين ‎0.0234‎ يبقى بأربع لا ثلاث)
  assert.equal(formatPaneValueScaled([0.0234, -0.01], 0.0234, 3), '0.0234');
  // لا يتجاوز عرض العمود: BTC ATR ‎12345‎ بمنزلتين ⇒ تُخفَّض حتى تتّسع
  const t = formatPaneValueScaled([12345, -12345], 12345.67, 2)!;
  assert.ok(t.length <= 8, t);
  // لوحة K/M لا تتأثّر
  assert.ok(formatPaneValueScaled([5e5, -5e5], 250000, 5)!.endsWith('K'));
}

// ‎%B‎: المدى 0..1 أدنى، ويتّسع للظاهر خارجه ⇒ 1.25 لا يقع على بكسل 1.0.
{
  assert.deepEqual(percentBRange([0.3, 0.7]), { min: 0, max: 1 });
  assert.deepEqual(percentBRange([1.25, -0.2, 0.5]), { min: -0.2, max: 1.25 });
  const g = placeGuides('percentB', INNER, { min: 0, max: 2 });
  assert.equal(g.find((x) => x.v === 0.5)!.top, 0.75 * INNER);
}

// سعر مربوط: AO/DPO بقايا فاصلة ‎~1e-16‎ ⇐ صفر لا «4.4e-16»
{
  const peg = [4.4e-16, -2.2e-16, 1.1e-16];
  assert.equal(formatPaneValueScaled(peg, 4.4e-16, 4), '0');
  assert.equal(formatPaneValueScaled(peg, -2.2e-16), '0');
  // وحركة حقيقية صغيرة على اليورو تبقى مقروءة
  assert.equal(formatPaneValueScaled([0.00003, -0.00002], 0.00003, 5), '0.00003');
}
