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

// —— blockUser على تخزين وهمي: كل تحميل للوحدة نسخة حالة جديدة ——
type Disk = { value: string | null; failRead?: boolean; writes: string[] };
function freshModule(disk: Disk) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  stubs['@react-native-async-storage/async-storage'] = {
    __esModule: true,
    default: {
      getItem: async () => {
        await gate;
        if (disk.failRead) throw new Error('io');
        return disk.value;
      },
      setItem: async (_k: string, v: string) => {
        disk.writes.push(v);
        disk.value = v;
      },
    },
  };
  delete require.cache[require.resolve('./moderation')];
  const mod = require('./moderation') as typeof import('./moderation');
  return { mod, release };
}

(async () => {
  // حظران سريعان قبل انتهاء أول قراءة: الاثنان يبقيان (كان الثاني يمحو الأول)
  {
    const disk: Disk = { value: JSON.stringify(['old']), writes: [] };
    const { mod, release } = freshModule(disk);
    const a = mod.blockUser('Spammer_A');
    const b = mod.blockUser('spammer_b');
    release();
    await Promise.all([a, b]);
    assert.deepEqual(JSON.parse(disk.value!), ['old', 'spammer_a', 'spammer_b']);
    // ثانيةً بحروف أخرى: لا تكرار ولا كتابة
    const n = disk.writes.length;
    await mod.blockUser(' SPAMMER_A ');
    assert.equal(disk.writes.length, n);
  }
  // قراءة فاشلة: الحظر لا يكتب فوق القائمة المحفوظة
  {
    const disk: Disk = { value: JSON.stringify(['a', 'b', 'c']), failRead: true, writes: [] };
    const { mod, release } = freshModule(disk);
    release();
    await mod.blockUser('x');
    assert.equal(disk.writes.length, 0);
    assert.deepEqual(JSON.parse(disk.value!), ['a', 'b', 'c']);
  }
  // JSON تالف: يُعامل كقائمة فارغة ويُكتب فوقه (لا شيء يُستعاد)
  {
    const disk: Disk = { value: '{not json', writes: [] };
    const { mod, release } = freshModule(disk);
    release();
    await mod.blockUser('x');
    assert.deepEqual(JSON.parse(disk.value!), ['x']);
  }
  console.log('moderation selftest: OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
