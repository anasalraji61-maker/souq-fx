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
  axisShowsHours,
  nicePriceTicks,
  niceTimeTickIndexes,
  niceLogPriceTicks,
  percentScaleTicks,
  formatScalePercent,
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

// ===== ساعات محور الزمن من فجوة العلامات لا من المدى =====
{
  const H = 3600;
  // 80 شمعة ساعة، 4 علامات كل ~26 شمعة: المدى 79 ساعة (كان ⇒ تواريخ فقط)، لكن الفجوة 26 ساعة ≥ يوم.
  assert.equal(axisShowsHours([0, 26 * H, 53 * H, 79 * H], 79 * H, false), false);
  // 5 علامات على 80 شمعة ساعة: فجوة ~20 ساعة ⇒ الساعة لازمة (علامتان باليوم نفسه).
  assert.equal(axisShowsHours([0, 20 * H, 40 * H, 59 * H, 79 * H], 79 * H, false), true);
  // 15m عبر العطلة: 60 شمعة، الجمعة 16:00 → الاثنين 02:00 (58 ساعة)؛ فجوة العطلة كبيرة والبقيّة ساعات.
  const fri = 1_758_297_600; // جمعة
  assert.equal(axisShowsHours([fri, fri + 5 * H, fri + 54 * H, fri + 58 * H], 58 * H, false), true);
  // شموع يومية: لا ساعة أبداً.
  assert.equal(axisShowsHours([0, H, 2 * H], 2 * H, true), false);
  // علامة واحدة: القرار من المدى كما كان.
  assert.equal(axisShowsHours([0], 30 * H, false), true);
  assert.equal(axisShowsHours([0], 72 * H, false), false);
  console.log('axisShowsHours PASS');

// nicePriceTicks: خطوات مستديرة ثابتة مع التيك، بحدّ العدد وأصغر منزلة
{
  // EURUSD مدى ~60 pip، 5 علامات كحدّ ⇒ خطوة 20 pip (10 pip تعطي ستّاً)
  const t = nicePriceTicks(1.08412, 1.09013, 5, 0.00001);
  assert.deepEqual(t, [1.086, 1.088, 1.09]);
  // تيك يمدّ المدى قليلاً ⇒ العلامات نفسها
  assert.deepEqual(nicePriceTicks(1.08409, 1.09016, 5, 0.00001), t);
  // الذهب
  assert.deepEqual(nicePriceTicks(2331.4, 2348.9, 6, 0.01), [2335, 2340, 2345]);
  // مدى أضيق من أصغر منزلة: خطوة لا تنزل تحت المنزلة
  const tiny = nicePriceTicks(1.08500, 1.08503, 7, 0.00001);
  assert.deepEqual(tiny, [1.085, 1.08501, 1.08502, 1.08503]);
  assert.ok(nicePriceTicks(1.085, 1.08503, 2, 0.00001).length <= 2);
  // JPY: لا كسور عائمة
  for (const p of nicePriceTicks(151.2, 152.05, 7, 0.001)) assert.equal(String(p).length <= 6, true);
  assert.deepEqual(nicePriceTicks(NaN, 1, 5, 0), []);
  assert.deepEqual(nicePriceTicks(2, 1, 5, 0), []);
  // حدّ العدد محترم دائماً
  for (const cap of [1, 2, 3, 4, 5, 6, 7]) assert.ok(nicePriceTicks(0.6512, 0.6589, cap, 0.00001).length <= cap);
}

}

{
  // علامات الزمن على حدود مستديرة
  const H = 3600;
  const t0 = Date.UTC(2026, 0, 14, 9, 15) / 1000; // الأربعاء 09:15
  const m15 = Array.from({ length: 80 }, (_, i) => t0 + i * 900); // 20 ساعة
  const idx = niceTimeTickIndexes(m15, 900, 4)!;
  assert.ok(idx && idx.length >= 2 && idx.length <= 4);
  // كل علامة على ساعة مستديرة، وبفاصل واحد مستدير
  for (const i of idx) assert.equal((m15[i]! % (6 * H)) % H, 0);
  const gaps = idx.slice(1).map((v, k) => m15[v]! - m15[idx[k]!]!);
  assert.ok(gaps.every((g) => g === gaps[0]));
  assert.ok([6 * H, 12 * H].includes(gaps[0]!));
  // الإزاحة المحلية: +3 ساعات ⇒ الحدود على ساعات محليّة مستديرة
  const idxL = niceTimeTickIndexes(m15, 900, 4, () => 3 * H)!;
  for (const i of idxL) assert.equal((m15[i]! + 3 * H) % (6 * H), 0);
  // العطلة: شمعة الأحد 22:00 تحمل حدّ اليوم/الاثنين الذي لا شمعة عنده
  const fri = Date.UTC(2026, 0, 16, 12) / 1000;
  const sun = Date.UTC(2026, 0, 18, 22) / 1000;
  const wk = [...Array.from({ length: 10 }, (_, i) => fri + i * H), ...Array.from({ length: 30 }, (_, i) => sun + i * H)];
  const iw = niceTimeTickIndexes(wk, H, 3)!;
  assert.ok(iw.includes(10) || iw.some((i) => wk[i]! % 86400 === 0));
  // اليومي: حدود أسابيع/أشهر لا أيام
  const d0 = Date.UTC(2026, 0, 1) / 1000;
  const days = Array.from({ length: 120 }, (_, i) => d0 + i * 86400);
  const id = niceTimeTickIndexes(days, 86400, 4)!;
  for (const i of id) assert.equal(new Date(days[i]! * 1000).getUTCDate(), 1);
  // حدّ العدد محترم، وقليل الشموع ⇒ null
  for (const cap of [2, 3, 4]) assert.ok((niceTimeTickIndexes(m15, 900, cap) ?? []).length <= cap);
  assert.equal(niceTimeTickIndexes(m15.slice(0, 2), 900, 4), null);
  // الهاتف (حدّ 3، 80 شمعة): الفاصل الأدقّ يزيد والأخشن أقلّ من حدّين ⇒ ترقيق تقويمي لا `null` (النِّسَب الكيفيّة)
  const h0 = Date.UTC(2026, 1, 2, 23) / 1000; // الاثنين 23:00 ⇒ أربعة منتصفات ليل بالنافذة
  const h1 = Array.from({ length: 80 }, (_, i) => h0 + i * H);
  const ih = niceTimeTickIndexes(h1, H, 3);
  assert.ok(ih && ih.length >= 2 && ih.length <= 3, `H1 phone: ${ih}`);
  for (const i of ih!) assert.equal(h1[i]! % 86400, 0, 'H1 ticks on midnight');
  // ثابتة مع التمرير: إزاحة النافذة يوماً (والترقيق نفسه لازم) تُبقي الأزمنة المختارة نفسها — الإيقاع تقويمي لا ترتيبي
  const h1b = h1.slice(24).concat(Array.from({ length: 24 }, (_, i) => h0 + (80 + i) * H));
  const ihb = niceTimeTickIndexes(h1b, H, 3)!;
  const shown = new Set(ih!.map((i) => h1[i]));
  for (const i of ihb) if (h1b[i]! <= h1[79]!) assert.ok(shown.has(h1b[i]!), 'stable while panning');
  const dd0 = Date.UTC(2025, 10, 20) / 1000;
  const d1 = Array.from({ length: 80 }, (_, i) => dd0 + i * 86400);
  const idd = niceTimeTickIndexes(d1, 86400, 3);
  assert.ok(idd && idd.length >= 2 && idd.length <= 3, `D1 phone: ${idd}`);
  for (const i of idd!) assert.equal(new Date(d1[i]! * 1000).getUTCDate(), 1, 'D1 ticks on month start');
  const mn = Array.from({ length: 80 }, (_, i) => Date.UTC(2019, 3 + i, 1) / 1000);
  const imn = niceTimeTickIndexes(mn, 30 * 86400, 3);
  assert.ok(imn && imn.length >= 2 && imn.length <= 3, `MN phone: ${imn}`);
  for (const i of imn!) assert.equal(new Date(mn[i]! * 1000).getUTCMonth(), 0, 'MN ticks on January');
}

// المقياس اللوغاريتمي: الذهب الشهري 250..4000 — علامات موزّعة على الارتفاع كلّه لا مكدّسة بأعلاه
{
  const lo = 250;
  const hi = 4000;
  const ticks = niceLogPriceTicks(lo, hi, 7, 0.01);
  assert.ok(ticks.length >= 5 && ticks.length <= 7, `log ticks: ${ticks}`);
  const pos = ticks.map((p) => (Math.log(p) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
  assert.ok(pos[0]! < 0.2, `lowest log tick near bottom: ${pos[0]}`);
  assert.ok(pos.filter((q) => q < 0.5).length >= 2, 'lower half has labels');
  for (const p of ticks) assert.ok(p >= lo && p <= hi);
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i]! > ticks[i - 1]!, 'strictly rising');
  // مانتيسا مستديرة
  for (const p of ticks) {
    const m = p / Math.pow(10, Math.floor(Math.log10(p)));
    assert.ok([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].some((x) => Math.abs(x - m) < 1e-9), `round mantissa ${p}`);
  }
  // المدى الخطّي (أقلّ من ضعفين) = nicePriceTicks نفسها
  assert.deepEqual(niceLogPriceTicks(1.08, 1.1, 6, 0.00001), nicePriceTicks(1.08, 1.1, 6, 0.00001));
  // أسعار صغيرة (عملة رقمية رخيصة): منازل الخطوة الدنيا محترمة
  const small = niceLogPriceTicks(0.0001, 0.01, 5, 0.000001);
  assert.ok(small.length >= 3 && small.every((p) => p >= 0.0001 && p <= 0.01), `small: ${small}`);
  console.log('niceLogPriceTicks PASS');
}

// مقياس النسبة: EURUSD 1.0800..1.0854 (0..+0.5%) بحدّ 6 ⇒ خطوات 0.1% مستديرة بالنسبة، والسعر المقابل على الأساس.
{
  const t = percentScaleTicks(1.08, 1.0854, 1.08, 6);
  assert.deepEqual(t.map((x) => x.label), ['0.00%', '+0.10%', '+0.20%', '+0.30%', '+0.40%', '+0.50%']);
  assert.ok(Math.abs(t[1]!.price - 1.08108) < 1e-9);
  // تحت الأساس ⇒ ناقص حقيقي.
  const d = percentScaleTicks(1.0746, 1.08, 1.08, 6);
  assert.equal(d[0]!.label, '−0.50%');
  // مدى 5د ضيّق (0.012%) ⇒ ثلاث منازل لا علامات مكرّرة.
  const n = percentScaleTicks(1.08, 1.08013, 1.08, 5);
  assert.equal(new Set(n.map((x) => x.label)).size, n.length);
  assert.ok(n.some((x) => x.label === '+0.005%'), JSON.stringify(n));
  assert.deepEqual(percentScaleTicks(1, 2, 0, 5), []);
  assert.equal(formatScalePercent(-0.0001), '0.00%');
  assert.equal(formatScalePercent(1.234), '+1.23%');
  console.log('percentScaleTicks OK');
}

// محور السعر: مراكز تنازلية (EURUSD 1.080..1.090 على لوح 300px ⇒ y = 300..0) — كانت تُخفي كل العلامات
// إلا الأعلى. الآن الست ظاهرة، والفهارس بترتيب المدخلات.
{
  const ys = [300, 240, 180, 120, 60, 0];
  const b = layoutAxisLabels(ys, 16, 4, 298);
  assert.deepEqual(b.map((x) => x.hidden), [false, false, false, false, false, false]);
  assert.deepEqual(b.map((x) => x.i), [0, 1, 2, 3, 4, 5]);
  assert.equal(b[0]!.start, 282);
  assert.equal(b[5]!.start, 0);
  // متلاصقة تنازلياً: يُخفى بعضها لا كلّها.
  const tight = layoutAxisLabels([100, 90, 80, 70, 60], 16, 4, 298);
  assert.ok(tight.filter((x) => !x.hidden).length >= 2, JSON.stringify(tight));
  console.log('layoutAxisLabels descending PASS');
}

{
  // 4H: لا فاصل 6س (حدوده داخل الشموع) ⇒ علامات 00:00/12:00 لا 00:00/08:00/12:00/20:00
  const H = 3600;
  const t0 = Date.UTC(2026, 8, 22) / 1000;
  const h4 = Array.from({ length: 12 }, (_, k) => t0 + k * 4 * H);
  const idx = niceTimeTickIndexes(h4, 4 * H, 8)!;
  const hours = idx.map((i) => new Date(h4[i]! * 1000).getUTCHours());
  assert.ok(hours.every((h) => h === 0 || h === 12), JSON.stringify(hours));
  console.log('niceTimeTickIndexes 4H multiples PASS');
}
