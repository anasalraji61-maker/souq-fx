/**
 * Self-test for academyResume (pure).
 * Run: npx --yes tsx src/academyResume.selftest.ts
 */
import assert from 'node:assert/strict';
import { parseStoredIndex, resumeSegmentIndex } from './academyResume';

// ── قراءة الموضع المحفوظ بتخزين الجهاز ──────────────────────────────────────
assert.equal(parseStoredIndex('0'), 0);
assert.equal(parseStoredIndex('7'), 7);
assert.equal(parseStoredIndex('-3'), -3, 'يُقرأ كما هو؛ القصّ مسؤولية resumeSegmentIndex');
assert.equal(parseStoredIndex(null), null);
assert.equal(parseStoredIndex(undefined), null);
assert.equal(parseStoredIndex(''), null);
assert.equal(parseStoredIndex('abc'), null);
assert.equal(parseStoredIndex('  5  '), 5, 'parseInt يتجاوز الفراغ');

// ── الاستئناف الطبيعي ───────────────────────────────────────────────────────
assert.equal(resumeSegmentIndex(4, 10), 4, 'يُستأنف من حيث توقّف');
assert.equal(resumeSegmentIndex(1, 10), 1);

// ── محاضرة منتهية تُفتح من أولها ────────────────────────────────────────────
assert.equal(resumeSegmentIndex(9, 10), 0, 'آخر مقطع = انتهت');
assert.equal(resumeSegmentIndex(99, 10), 0, 'صفّ قديم لمحاضرة قُصّرت');
assert.equal(resumeSegmentIndex(1, 2), 0, 'محاضرة من مقطعين، الموضع آخرها');
assert.equal(resumeSegmentIndex(0, 2), 0);

// ── لا موضع، أو محاضرة بلا مقاطع ────────────────────────────────────────────
assert.equal(resumeSegmentIndex(null, 10), 0);
assert.equal(resumeSegmentIndex(3, 1), 0, 'مقطع واحد: لا استئناف أصلاً');
assert.equal(resumeSegmentIndex(3, 0), 0, 'محاضرة فارغة');
assert.equal(resumeSegmentIndex(3, Number.NaN), 0);
assert.equal(resumeSegmentIndex(Number.NaN, 10), 0);

// ── قيم مشوَّهة لا تُخرج الفهرس عن حدود المصفوفة ────────────────────────────
assert.equal(resumeSegmentIndex(-5, 10), 0, 'سالب → الأول');
assert.equal(resumeSegmentIndex(4.9, 10), 4, 'كسر → الأدنى، فلا يقفز مقطعاً');
assert.equal(resumeSegmentIndex(Number.POSITIVE_INFINITY, 10), 0);
assert.equal(resumeSegmentIndex(Number.NEGATIVE_INFINITY, 10), 0);

// ── الحدّ لا يُخرج أبداً عن [0, total-1] ────────────────────────────────────
for (let total = 2; total <= 30; total++) {
  for (let stored = -40; stored <= 60; stored++) {
    const r = resumeSegmentIndex(stored, total);
    assert.ok(Number.isInteger(r) && r >= 0 && r <= total - 1, `خارج الحدود: ${stored}/${total}`);
  }
}

console.log('academyResume selftest: OK');
