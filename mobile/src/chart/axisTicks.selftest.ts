/**
 * Self-test for axisTicks (pure).
 * Run: npx --yes tsx src/chart/axisTicks.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  axisTickCount,
  axisTickRatios,
  layoutAxisLabels,
  boxesTouch,
  offAxisSide,
} from './axisTicks';

const TIME_GAP = 6;
const PRICE_GAP = 4;
const PRICE_LABEL_H = 14;

/** محاكاة القصّ كما ترسمه الشاشة، للتحقّق من أن العدد المختار لا يتراكب فعلاً. */
const simulate = (plot: number, size: number, count: number) => {
  const centers = axisTickRatios(count).map((r) => r * plot);
  return layoutAxisLabels(centers, size, 0, plot).map((b) => b.start);
};
const minGap = (starts: number[], size: number) => {
  let m = Number.POSITIVE_INFINITY;
  for (let i = 1; i < starts.length; i++) m = Math.min(m, starts[i] - (starts[i - 1] + size));
  return starts.length < 2 ? Number.POSITIVE_INFINITY : m;
};

// ===== محور الزمن: العتبات القديمة كانت تتراكب، والجديدة لا =====

// العطل بعينه: هاتف كبير (جهاز 430px ⇒ لوح ≈ 338px) كان يأخذ أربع علامات عرضها 88
{
  const OLD = simulate(338, 88, 4);
  assert.ok(minGap(OLD, 88) < 0, `العتبة القديمة كانت سليمة؟ ${minGap(OLD, 88)}`);
  const n = axisTickCount(338, 88, TIME_GAP, 4);
  assert.equal(n, 3);
  assert.ok(minGap(simulate(338, 88, n), 88) >= TIME_GAP);
}

// ومثله لوح 210px بعلامة 72px: ثلاث علامات قديماً ⇒ تراكب
{
  assert.ok(minGap(simulate(210, 72, 3), 72) < 0);
  const n = axisTickCount(210, 72, TIME_GAP, 4);
  assert.equal(n, 2);
  assert.ok(minGap(simulate(210, 72, n), 72) >= TIME_GAP);
}

// العروض التي كانت سليمة تبقى كما هي بالضبط — لا تغيير بلا سبب
{
  assert.equal(axisTickCount(300, 88, TIME_GAP, 4), 3); // كان 3
  assert.equal(axisTickCount(190, 56, TIME_GAP, 4), 3); // كان 3
  assert.equal(axisTickCount(520, 88, TIME_GAP, 4), 4); // كان 4
  assert.equal(axisTickCount(414, 88, TIME_GAP, 4), 4); // أوّل عرض يتّسع لأربع
  assert.equal(axisTickCount(413, 88, TIME_GAP, 4), 3);
}

// لوح أضيق من علبتين ⇒ علامة واحدة (كان ثلاثاً بعرض 56 داخل 120)
{
  assert.equal(axisTickCount(100, 56, TIME_GAP, 4), 1);
  assert.deepEqual(axisTickRatios(1), [0.5]);
  assert.equal(axisTickCount(118, 56, TIME_GAP, 4), 2); // 2·56+6 بالضبط
}

// مسح على كل عرض معقول: العدد المختار لا يتراكب أبداً
{
  for (const size of [56, 72, 88]) {
    for (let plot = 80; plot <= 900; plot += 1) {
      const n = axisTickCount(plot, size, TIME_GAP, 4);
      assert.ok(n >= 1 && n <= 4, `n=${n} plot=${plot}`);
      assert.ok(
        minGap(simulate(plot, size, n), size) >= TIME_GAP - 1e-9,
        `تراكب عند plot=${plot} size=${size} n=${n}`
      );
    }
  }
}

// ===== محور السعر: سبع علامات ثابتة مهما قصر اللوح =====
{
  // ارتفاعات واسعة: السبع كما كانت
  assert.equal(axisTickCount(398, PRICE_LABEL_H, PRICE_GAP, 7), 7); // لوح 400
  assert.equal(axisTickCount(198, PRICE_LABEL_H, PRICE_GAP, 7), 7); // لوح 200
  // لوح 100 (الحدّ الأدنى بالشاشة): السبع كانت تتباعد 16.6px والنصّ 14px
  const short = axisTickCount(98, PRICE_LABEL_H, PRICE_GAP, 7);
  assert.ok(short < 7 && short >= 2, `short=${short}`);
  assert.ok(minGap(simulate(98, PRICE_LABEL_H, short), PRICE_LABEL_H) >= PRICE_GAP);
  assert.ok(minGap(simulate(98, PRICE_LABEL_H, 7), PRICE_LABEL_H) < PRICE_GAP);
}

// ===== layoutAxisLabels: القصّ والإخفاء =====

// القصّ يطابق ما كانت الشاشة ترسمه: [0, extent−size]
{
  const boxes = layoutAxisLabels([0, 50, 1000], 20, 4, 100);
  assert.equal(boxes[0].start, 0); // مركز 0 ⇒ يُدفَع للحافة
  assert.equal(boxes[1].start, 40);
  assert.equal(boxes[2].start, 80); // extent − size
}

// إزاحة التمرير تُقرِّب الطرف من جاره ⇒ الوسطى تُخفى والطرفان يبقيان
{
  const boxes = layoutAxisLabels([0, 95, 190], 88, 6, 200);
  assert.equal(boxes[0].hidden, false);
  assert.equal(boxes[2].hidden, false);
  assert.equal(boxes[1].hidden, true);
}

// الأخير مضمون البقاء ولو كانت الوسطى مُبقاة قبله (تُسقَط الوسطى لا الأخير)
{
  const boxes = layoutAxisLabels([0, 200, 250], 88, 6, 400);
  assert.equal(boxes[0].hidden, false);
  assert.equal(boxes[1].hidden, true); // كانت مُبقاة ثم أُسقطت ليتّسع الأخير
  assert.equal(boxes[2].hidden, false);
}

// محور لا يتّسع للأول والأخير معاً حتى بعد إسقاط الوسط ⇒ يُخفى الأول وحده
{
  const boxes = layoutAxisLabels([0, 100, 108], 88, 6, 200);
  assert.deepEqual(boxes.map((b) => b.hidden), [true, true, false]);
}

// طرفان لا يتّسعان معاً ⇒ يُخفى الأول (الأحدث أولى)
{
  const boxes = layoutAxisLabels([0, 100], 60, 6, 100);
  assert.equal(boxes[0].hidden, true);
  assert.equal(boxes[1].hidden, false);
}

// واسع: لا شيء يُخفى
{
  const boxes = layoutAxisLabels([50, 250, 450], 88, 6, 500);
  assert.deepEqual(boxes.map((b) => b.hidden), [false, false, false]);
}

// مدخلات فاسدة: بلا NaN ولا استثناء
{
  assert.deepEqual(layoutAxisLabels([], 88, 6, 300), []);
  const boxes = layoutAxisLabels([Number.NaN, 150], 88, 6, 300);
  assert.ok(boxes.every((b) => Number.isFinite(b.start) && b.start >= 0));
  assert.equal(axisTickCount(Number.NaN, 88, 6, 4), 1);
  assert.equal(axisTickCount(300, 0, 6, 4), 1);
  assert.equal(axisTickCount(300, 88, Number.NaN, 4), axisTickCount(300, 88, 0, 4));
  assert.equal(axisTickCount(300, 88, 6, 1), 1); // السقف آخر كلمة
}

// ===== boxesTouch =====
{
  assert.equal(boxesTouch(0, 18, 30, 18, 0), false);
  assert.equal(boxesTouch(0, 18, 17, 18, 0), true);
  assert.equal(boxesTouch(0, 18, 18, 18, 0), false); // متلاصقتان بلا تداخل
  assert.equal(boxesTouch(0, 18, 18, 18, 2), true); // مع فجوة مطلوبة
  assert.equal(boxesTouch(40, 18, 0, 18, 0), false);
  assert.equal(boxesTouch(Number.NaN, 18, 0, 18, 0), false);
}

// ===== وسوم المحور فوق علاماته (بالأرقام الحقيقيّة من MatrixChart) =====
{
  const TAG_H = 18;
  const LABEL_H = 14;
  const CLEAR = 2;
  const tagTop = (y: number, plotH: number) => Math.max(0, Math.min(plotH - 20, y - 9));

  // علامة تقع تحت الوسم ⇒ تُخفى (كانت تظهر شريحة من أرقامها حول حافته)
  assert.equal(boxesTouch(60, LABEL_H, tagTop(70, 400), TAG_H, CLEAR), true);
  // وعلامة تُفلت منه ⇒ تبقى
  assert.equal(boxesTouch(20, LABEL_H, tagTop(70, 400), TAG_H, CLEAR), false);

  // تكدّس الوسمين: المتداول يلمس شمعة على بُعد 6px من السعر الحيّ
  const live = tagTop(200, 400);
  assert.equal(boxesTouch(live, TAG_H, tagTop(206, 400), TAG_H, 0), true);
  // وعلى بُعد 20px ⇒ وسمان منفصلان، كلاهما يبقى
  assert.equal(boxesTouch(live, TAG_H, tagTop(220, 400), TAG_H, 0), false);

  // القصّ عند الحافتين لا يُنتج تكدّساً وهميّاً بين وسمين متباعدين فعلاً
  assert.equal(boxesTouch(tagTop(-50, 400), TAG_H, tagTop(390, 400), TAG_H, 0), false);
  // لكن سعرين خارج المدى من الجهة نفسها يُقصّان إلى الحافة ذاتها ⇒ تكدّس حقيقيّ
  assert.equal(boxesTouch(tagTop(-50, 400), TAG_H, tagTop(-10, 400), TAG_H, 0), true);

  // وسم زمن التقاطع (104px) فوق علامة تاريخ (88px)
  const crossLeft = (x: number, plotW: number) => Math.max(0, Math.min(plotW - 104, x - 52));
  assert.equal(boxesTouch(0, 88, crossLeft(60, 400), 104, CLEAR), true);
  assert.equal(boxesTouch(0, 88, crossLeft(300, 400), 104, CLEAR), false);
}

// ===== offAxisSide =====
{
  assert.equal(offAxisSide(120, 400), null);
  assert.equal(offAxisSide(0, 400), null); // الحافة داخل المدى
  assert.equal(offAxisSide(400, 400), null);
  assert.equal(offAxisSide(-0.5, 400), 'above'); // أعلى من السقف ⇒ فوق
  assert.equal(offAxisSide(400.5, 400), 'below');
  assert.equal(offAxisSide(Number.NaN, 400), null);
  assert.equal(offAxisSide(120, Number.NaN), null);
}

console.log('axisTicks.selftest: PASS');
