/**
 * Self-test for moderation.ts — تطبيع قائمة الحظر المقروءة من القرص.
 * Run: npx --yes tsx src/moderation.selftest.ts
 *
 * moderation.ts يستورد AsyncStorage وReact (غير متاحين خارج التطبيق) — يُستبدلان ببدائل فارغة قبل
 * التحميل، فالمختبَر هو الدالّة الصافية وحدها.
 */
import assert from 'node:assert/strict';
import Module from 'node:module';

const stubs: Record<string, unknown> = {
  '@react-native-async-storage/async-storage': { default: {} },
  react: { useCallback: () => undefined, useEffect: () => undefined, useState: () => [] },
};
const M = Module as unknown as { _load: (req: string, ...rest: unknown[]) => unknown };
const origLoad = M._load;
M._load = (req: string, ...rest: unknown[]) => (req in stubs ? stubs[req] : origLoad(req, ...rest));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sanitizeBlocked } = require('./moderation') as typeof import('./moderation');

// الأسماء تُطبَّع كما يطبّعها isBlocked/block: حروف صغيرة بلا مسافات طرفية
assert.deepEqual(sanitizeBlocked(['Ahmed', '  spam_bot ', 'x']), ['ahmed', 'spam_bot', 'x']);
// التكرار بعد التطبيع يُحذف (يبقى الأول بموضعه)
assert.deepEqual(sanitizeBlocked(['ahmed', 'AHMED', ' Ahmed', 'b']), ['ahmed', 'b']);
// غير النصوص والفارغ بعد التطبيع يُتجاهل
assert.deepEqual(sanitizeBlocked(['a', 1, null, { n: 'b' }, '   ', '', 'c']), ['a', 'c']);
// ليس مصفوفة ⇒ قائمة فارغة
for (const bad of [null, undefined, 'ahmed', 42, { 0: 'a' }]) assert.deepEqual(sanitizeBlocked(bad), []);
// سقف 500: الأحدث (آخر القائمة) يبقى
const many = Array.from({ length: 520 }, (_, i) => `User${i}`);
const capped = sanitizeBlocked(many);
assert.equal(capped.length, 500);
assert.equal(capped[0], 'user20');
assert.equal(capped[499], 'user519');
// أسماء عربية/كردية بلا حالة حروف تبقى كما هي (مقصوصة الطرفين فقط)
assert.deepEqual(sanitizeBlocked([' أحمد ', 'ئارام']), ['أحمد', 'ئارام']);
// الثبات: تطبيع الناتج لا يغيّره
assert.deepEqual(sanitizeBlocked(sanitizeBlocked(['B', 'b ', 'C'])), ['b', 'c']);

console.log('moderation sanitizeBlocked selftest OK');
