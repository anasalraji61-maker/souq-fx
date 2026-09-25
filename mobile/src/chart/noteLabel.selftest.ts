/** فحص ذاتي لـ`noteLabel.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { noteBox, noteTextWidth, NOTE_CHAR_W, NOTE_PAD_W } from './noteLabel';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

const W = 292; // هاتف 360px − محور 68
const txt = 'Breakout retest'; // 15 حرفاً ⇒ 101px
ok('العرض التقريبي', noteTextWidth(txt) === 15 * NOTE_CHAR_W + NOTE_PAD_W);
ok('العربية بعدد الحروف لا البايتات', noteTextWidth('دعم') === 3 * NOTE_CHAR_W + NOTE_PAD_W);

// وسط اللوح ⇒ يميناً كما كان، بعرضه كاملاً.
const mid = noteBox(100, txt, W);
ok('وسط: بلا قلب', !mid.flipped && mid.left === 100 && mid.width === noteTextWidth(txt));

// قرب الشمعة الحيّة ⇒ يُقلب لينتهي عند الإرساء، ولا يتجاوز حافّة اللوح.
const live = noteBox(270, txt, W);
ok('حيّة: مقلوب', live.flipped);
ok('حيّة: ينتهي عند الإرساء', Math.abs(live.left + live.width - 270) < 1e-9);
ok('حيّة: كامل العرض', live.width === noteTextWidth(txt));

// لا يتّسع بأيّ جهة ⇒ الجهة الأوسع ويُختصر داخل اللوح.
const long = 'x'.repeat(60);
const l1 = noteBox(200, long, W);
ok('طويل يميناً أضيق ⇒ يسار', l1.flipped && l1.left >= 2 - 1e-9 && Math.abs(l1.left + l1.width - 200) < 1e-9);
const l2 = noteBox(60, long, W);
ok('طويل يساراً أضيق ⇒ يمين ضمن اللوح', !l2.flipped && l2.left + l2.width <= W - 2 + 1e-9);

// الإرساء على الحافّة اليمنى تماماً ⇒ لا عرض سالب.
const edge = noteBox(W, 'A', W);
ok('حافّة: عرض موجب', edge.width > 0 && edge.flipped);
// لوح أضيق من الهامش ⇒ لا قيم سالبة.
const tiny = noteBox(0, 'A', 1);
ok('لوح ضيّق جداً: لا سالب', tiny.width >= 0 && tiny.left >= 0);

if (failures) {
  console.error(`noteLabel selftest: ${failures} failure(s)`);
  process.exit(1);
}
console.log('noteLabel selftest: PASS');
