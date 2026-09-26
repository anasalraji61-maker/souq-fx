/** فحص ذاتي لـ`fibLabels.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { FIB_EXTENSIONS, fibIsDown, fibRatioText, fibLevelPrice, isFibExtension, planFibLabels } from './fibLabels';

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

// ── النسبة نصّاً ───────────────────────────────────────────────────────────
ok('0 ⇒ 0%', fibRatioText(0) === '0%');
ok('1 ⇒ 100%', fibRatioText(1) === '100%');
ok('0.5 ⇒ 50% لا 50.0%', fibRatioText(0.5) === '50%');
ok('0.618 ⇒ 61.8%', fibRatioText(0.618) === '61.8%');
ok('0.236 ⇒ 23.6%', fibRatioText(0.236) === '23.6%');
ok('0.382 ⇒ 38.2%', fibRatioText(0.382) === '38.2%');
ok('0.786 ⇒ 78.6%', fibRatioText(0.786) === '78.6%');
ok('NaN ⇒ فارغ', fibRatioText(NaN) === '');
// النسب القياسية كلّها بلا صفر زائد ولا خانة ثانية.
ok('كل النسب القياسية مختصرة', FIB_LEVELS.every((l) => !fibRatioText(l).includes('.0%')));

// ── اتجاه المستويات وزرّ «عكس» ─────────────────────────────────────────────
const up = { a: { price: 1.0 }, b: { price: 1.1 } };
const dn = { a: { price: 1.1 }, b: { price: 1.0 } };
ok('صاعدة (A قاع) ⇒ ليست هابطة', fibIsDown(up) === false);
ok('هابطة (A قمّة) ⇒ هابطة', fibIsDown(dn) === true);
ok('صاعدة معكوسة ⇒ 0% عند A (القاع)', fibLevelPrice(1.1, 1.0, 0, fibIsDown({ ...up, reversed: true })) === 1.0);
ok('هابطة معكوسة ⇒ 0% عند A (القمّة)', fibLevelPrice(1.1, 1.0, 0, fibIsDown({ ...dn, reversed: true })) === 1.1);
ok('عكس مرّتين = الأصل', fibIsDown({ ...dn, reversed: false }) === fibIsDown(dn));
ok('بلا B ⇒ ليست هابطة', fibIsDown({ a: { price: 1 } }) === false);

// ── سعر المستوى ────────────────────────────────────────────────────────────
ok('0% = القمّة', fibLevelPrice(1.1, 1.0, 0) === 1.1);
ok('100% = القاع', Math.abs(fibLevelPrice(1.1, 1.0, 1) - 1.0) < 1e-12);
ok('50% = المنتصف', Math.abs(fibLevelPrice(1.1, 1.0, 0.5) - 1.05) < 1e-12);
// موجة هابطة (من القمّة للقاع): 0% عند القاع، و61.8% ارتداد صاعد منه — لا 38.2%
ok('هابطة: 0% = القاع', fibLevelPrice(1.1, 1.0, 0, true) === 1.0);
ok('هابطة: 61.8% فوق القاع بـ61.8% من المدى', Math.abs(fibLevelPrice(1.1, 1.0, 0.618, true) - 1.0618) < 1e-12);
ok('هابطة: 100% = القمّة', Math.abs(fibLevelPrice(1.1, 1.0, 1, true) - 1.1) < 1e-12);
ok('هابطة بمدى صفري ⇒ السعر نفسه', fibLevelPrice(1.085, 1.085, 0.5, true) === 1.085);
ok('وسوم الهابطة تحمل أسعارها',
  planFibLabels({ levels: [0, 0.618, 1], hi: 1.1, lo: 1.0, down: true, yOf: (p) => (1.1 - p) * 3000, format: (v) => v.toFixed(4) })
    .map((l) => l.text).join('|') === '100% · 1.1000|61.8% · 1.0618|0% · 1.0000');
// البند: مدى صفري كان ينشر المستويات على وحدة سعرية كاملة بسبب `hi - lo || 1`.
ok('مدى صفري ⇒ كل المستويات على السعر نفسه',
  FIB_LEVELS.every((l) => fibLevelPrice(1.085, 1.085, l) === 1.085));
ok('مدى صفري لا يعطي 0.085 عند 100%', fibLevelPrice(1.085, 1.085, 1) !== 1.085 - 1);

// ── الخطّة ─────────────────────────────────────────────────────────────────
const fmt = (p: number) => p.toFixed(5);
// لوح مريح: 300px لسبعة مستويات (تباعد 50px) ⇒ كلّها تظهر.
const roomy = planFibLabels({
  levels: FIB_LEVELS, hi: 1.1, lo: 1.0,
  yOf: (p) => (1.1 - p) * 3000, format: fmt, minGapPx: 13,
});
ok('لوح مريح ⇒ سبعة وسوم', roomy.length === 7);
ok('مرتّبة تنازلياً بالسعر', roomy.every((l, i) => i === 0 || roomy[i - 1]!.price >= l.price));
ok('النصّ نسبة ثم سعر', roomy[0]!.text === '0% · 1.10000');
ok('وسم 61.8% يحمل سعره',
  roomy.find((l) => l.level === 0.618)!.text === `61.8% · ${fmt(1.1 - 0.1 * 0.618)}`);

// الحالة التي نشأ عنها البند: ارتداد قصير على هاتف — 60px لسبعة مستويات (تباعد 10px).
const tight = planFibLabels({
  levels: FIB_LEVELS, hi: 1.1, lo: 1.0,
  yOf: (p) => (1.1 - p) * 600, format: fmt, minGapPx: 13,
});
ok('لوح ضيّق ⇒ إسقاط', tight.length < 7);
ok('لوح ضيّق: لا وسمين أقرب من الحدّ',
  tight.every((a, i) => i === 0 || Math.abs(tight[i - 1]!.y - a.y) >= 13));
const tightLv = tight.map((l) => l.level);
// الأهمية لا الموضع: الطرفان يبقيان، و23.6% لا تزيح 61.8%.
ok('لوح ضيّق: الطرفان يبقيان', tightLv.includes(0) && tightLv.includes(1));
ok('لوح ضيّق: 61.8% قبل 23.6%', !(tightLv.includes(0.236) && !tightLv.includes(0.618)));
ok('لوح ضيّق: 61.8% قبل 78.6%', !(tightLv.includes(0.786) && !tightLv.includes(0.618)));

// حالة الطرد القاسية: كل المستويات على موضع واحد ⇒ وسم واحد فقط، وهو 0%.
const flat = planFibLabels({
  levels: FIB_LEVELS, hi: 1.085, lo: 1.085,
  yOf: () => 40, format: fmt, minGapPx: 13,
});
ok('مدى صفري ⇒ وسم واحد', flat.length === 1);
ok('مدى صفري ⇒ الوسم الباقي هو 0%', flat[0]!.level === 0);

// مدخلات فاسدة لا تُسقط الشارت ولا تختلق موضعاً.
ok('hi غير محدود ⇒ لا وسوم',
  planFibLabels({ levels: FIB_LEVELS, hi: NaN, lo: 1, yOf: () => 0, format: fmt }).length === 0);
ok('yOf تعيد NaN ⇒ لا وسوم',
  planFibLabels({ levels: FIB_LEVELS, hi: 1.1, lo: 1, yOf: () => NaN, format: fmt }).length === 0);
ok('مستوى NaN يُتخطّى',
  planFibLabels({ levels: [0, NaN, 1], hi: 1.1, lo: 1, yOf: (p) => (1.1 - p) * 3000, format: fmt })
    .length === 2);
ok('minGap فاسد ⇒ الافتراض لا تعطيل الفحص',
  planFibLabels({ levels: FIB_LEVELS, hi: 1.1, lo: 1.0, yOf: (p) => (1.1 - p) * 600,
    format: fmt, minGapPx: -5 }).length === tight.length);
ok('قائمة مستويات فارغة ⇒ لا وسوم',
  planFibLabels({ levels: [], hi: 1.1, lo: 1, yOf: () => 0, format: fmt }).length === 0);

// مقياس مقلوب (y يكبر مع السعر) — التباعد بالمطلق فلا يتعطّل الفحص.
const inverted = planFibLabels({
  levels: FIB_LEVELS, hi: 1.1, lo: 1.0,
  yOf: (p) => (p - 1.0) * 600, format: fmt, minGapPx: 13,
});
ok('مقياس مقلوب: لا وسمين متلاصقين',
  inverted.every((a) => inverted.every((b) => a === b || Math.abs(a.y - b.y) >= 13)));
ok('مقياس مقلوب: نفس عدد الوسوم', inverted.length === tight.length);

// وسم خطّ أفقي عند y=150 (مستوى 50% بالضبط) ⇒ وسم 50% يُسقَط والبقيّة كما هي.
const besideLine = planFibLabels({
  levels: FIB_LEVELS, hi: 1.1, lo: 1.0,
  yOf: (p) => (1.1 - p) * 3000, format: fmt, minGapPx: 13, taken: [150],
});
ok('taken يُسقط المستوى تحت وسم الخطّ', !besideLine.some((l) => l.level === 0.5));
ok('taken لا يمسّ البعيد', besideLine.length === roomy.length - 1);

// ── الامتداد: أهداف بعد نهاية الموجة ─────────────────────────────────────
ok('−27.2% بعلامة ناقص حقيقية', fibRatioText(-0.272) === '−27.2%');
ok('−61.8%', fibRatioText(-0.618) === '−61.8%');
ok('−0 لا يحمل علامة', fibRatioText(-0) === '0%');
ok('الامتداد مُعلَّم', FIB_EXTENSIONS.every(isFibExtension) && ![0, 0.5, 1].some(isFibExtension));
// صاعدة 1.0 ⇒ 1.1: الهدف فوق القمّة (127.2% و161.8% من الموجة مقيسةً من القاع).
ok('صاعدة: −27.2% فوق القمّة', Math.abs(fibLevelPrice(1.1, 1.0, -0.272) - 1.1272) < 1e-12);
ok('صاعدة: −61.8% = 161.8% من الموجة', Math.abs(fibLevelPrice(1.1, 1.0, -0.618) - 1.1618) < 1e-12);
// هابطة 1.1 ⇒ 1.0: الهدف تحت القاع.
ok('هابطة: −27.2% تحت القاع', Math.abs(fibLevelPrice(1.1, 1.0, -0.272, true) - 0.9728) < 1e-12);
ok('هابطة: −61.8% تحت القاع', Math.abs(fibLevelPrice(1.1, 1.0, -0.618, true) - 0.9382) < 1e-12);
// وسم خارج اللوح لا يُخطَّط ولا يحجز مكاناً: لوح 300px، والامتداد فوق حافّته العليا (y سالب).
const withExt = planFibLabels({
  levels: [...FIB_LEVELS, ...FIB_EXTENSIONS], hi: 1.1, lo: 1.0,
  yOf: (p) => (1.1 - p) * 3000, format: fmt, minGapPx: 13, plotH: 300,
});
ok('plotH: الامتداد خارج اللوح لا وسم له', !withExt.some((l) => isFibExtension(l.level)));
ok('plotH: مستويات الارتداد كلّها باقية', withExt.length === 7);
// ولوح أطول (الهدف مرئيّ فوق الموجة) ⇒ وسما الامتداد يظهران بسعريهما.
const extVisible = planFibLabels({
  levels: [...FIB_LEVELS, ...FIB_EXTENSIONS], hi: 1.1, lo: 1.0,
  yOf: (p) => (1.2 - p) * 3000, format: fmt, minGapPx: 13, plotH: 700,
});
ok('الامتداد المرئيّ موسوم', extVisible.length === 9);
ok('وسم الامتداد نسبة ثم سعر', extVisible[0]!.text === `−61.8% · ${fmt(1.1618)}`);
// ازدحام: الامتداد يسبق 78.6% و23.6% لكنه لا يزيح 38.2%.
ok('الأهمية: −27.2% قبل 23.6%', (() => {
  const t = planFibLabels({ levels: [0.236, -0.272], hi: 1.1, lo: 1.0, yOf: () => 50, format: fmt });
  return t.length === 1 && t[0]!.level === -0.272;
})());
ok('الأهمية: 38.2% قبل −27.2%', (() => {
  const t = planFibLabels({ levels: [-0.272, 0.382], hi: 1.1, lo: 1.0, yOf: () => 50, format: fmt });
  return t.length === 1 && t[0]!.level === 0.382;
})());

if (failures) {
  console.error(`fibLabels.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('fibLabels.selftest: PASS');
}
