/** فحص ذاتي لـ`levelLabels.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { thinByGap, LEVEL_LABEL_GAP } from './levelLabels';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

type L = { id: string; y: number; rank: number };
const y = (l: L) => l.y;
const r = (l: L) => l.rank;

ok('الحدّ الافتراضي 13', LEVEL_LABEL_GAP === 13);

// متباعدة ⇒ كلّها تبقى، وبترتيبها الأصلي لا بترتيب الأهمية.
const wide: L[] = [
  { id: 'a', y: 10, rank: 3 },
  { id: 'b', y: 40, rank: 1 },
  { id: 'c', y: 70, rank: 2 },
];
ok('متباعدة ⇒ الكل', thinByGap(wide, y, r, 13).length === 3);
ok('الناتج بالترتيب الأصلي',
  thinByGap(wide, y, r, 13).map((l) => l.id).join('') === 'abc');

// متلاصقة ⇒ الأهمّ يبقى (rank أصغر) والأقلّ يُسقَط، أيّاً كان موضعه بالمصفوفة.
const tight: L[] = [
  { id: 'low', y: 20, rank: 5 },
  { id: 'high', y: 24, rank: 1 },
];
ok('متلاصقة ⇒ واحد', thinByGap(tight, y, r, 13).length === 1);
ok('الأهمّ هو الباقي', thinByGap(tight, y, r, 13)[0]!.id === 'high');
// وبالعكس بترتيب المصفوفة: النتيجة نفسها (الأهمية لا الموضع).
ok('الترتيب بالمصفوفة لا يغيّر النتيجة',
  thinByGap([...tight].reverse(), y, r, 13)[0]!.id === 'high');

// التباعد بالضبط عند الحدّ يُقبَل (< لا ≤).
ok('التباعد = الحدّ يُقبَل',
  thinByGap([{ id: 'a', y: 0, rank: 1 }, { id: 'b', y: 13, rank: 2 }], y, r, 13).length === 2);
ok('التباعد أقلّ بواحد يُسقَط',
  thinByGap([{ id: 'a', y: 0, rank: 1 }, { id: 'b', y: 12, rank: 2 }], y, r, 13).length === 1);

// سلسلة متلاصقة: القبول يقيس ضدّ كل مقبول لا ضدّ السابق وحده.
const chain: L[] = [
  { id: 'p0', y: 0, rank: 0 },
  { id: 'p1', y: 8, rank: 1 },
  { id: 'p2', y: 16, rank: 2 },
  { id: 'p3', y: 26, rank: 3 },
];
const chainKept = thinByGap(chain, y, r, 13);
ok('سلسلة: p1 يُسقَط لقربه من p0', !chainKept.some((l) => l.id === 'p1'));
ok('سلسلة: p2 يبقى (16 ≥ 13 عن p0)', chainKept.some((l) => l.id === 'p2'));
ok('سلسلة: p3 يُسقَط (10 عن p2)', !chainKept.some((l) => l.id === 'p3'));

// مقياس مقلوب: التباعد بالمطلق.
ok('مقياس مقلوب',
  thinByGap([{ id: 'a', y: 100, rank: 1 }, { id: 'b', y: 96, rank: 2 }], y, r, 13).length === 1);

// موضع غير محدود يُسقَط ولا يمنع غيره.
const bad: L[] = [
  { id: 'nan', y: NaN, rank: 0 },
  { id: 'ok', y: 50, rank: 1 },
  { id: 'inf', y: Infinity, rank: 2 },
];
ok('NaN/Infinity تُسقَط', thinByGap(bad, y, r, 13).map((l) => l.id).join('') === 'ok');

// رتبة متساوية ⇒ الأسبق بالمصفوفة يبقى (ثبات).
const ties: L[] = [
  { id: 'first', y: 10, rank: 1 },
  { id: 'second', y: 12, rank: 1 },
];
ok('رتبة متساوية ⇒ الأسبق', thinByGap(ties, y, r, 13)[0]!.id === 'first');

// حدّ فاسد ⇒ الافتراض لا تعطيل الفحص.
ok('حدّ سالب ⇒ الافتراض',
  thinByGap([{ id: 'a', y: 0, rank: 1 }, { id: 'b', y: 5, rank: 2 }], y, r, -3).length === 1);
ok('حدّ NaN ⇒ الافتراض',
  thinByGap([{ id: 'a', y: 0, rank: 1 }, { id: 'b', y: 5, rank: 2 }], y, r, NaN).length === 1);
ok('قائمة فارغة', thinByGap([], y, r, 13).length === 0);
// لا تعديل على المصفوفة الممرَّرة.
const src: L[] = [{ id: 'b', y: 40, rank: 2 }, { id: 'a', y: 10, rank: 1 }];
thinByGap(src, y, r, 13);
ok('المصفوفة الأصلية لم تُرتَّب بالمكان', src[0]!.id === 'b');

if (failures) {
  console.error(`levelLabels.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('levelLabels.selftest: PASS');
}
