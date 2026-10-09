/**
 * Self-test for the lesson "screen recording" scenes (pure).
 * Run: npx --yes tsx src/lessonStage/scenes.selftest.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { LESSON_SCENES, allSceneIds, buildScene, drawOps, frameAt, sceneIdFor, estimateSeconds, type Lang } from './scenes';

const here = __dirname;
const repo = join(here, '..', '..', '..');

// the web app carries an identical copy
const webCopy = join(repo, 'src', 'components', 'academy', 'lessonStage', 'scenes.ts');
if (existsSync(webCopy)) {
  assert.equal(readFileSync(webCopy, 'utf8'), readFileSync(join(here, 'scenes.ts'), 'utf8'), 'web and phone copies of scenes.ts differ');
}

// every scene id in the table exists
const known = new Set(allSceneIds());
for (const [lec, list] of Object.entries(LESSON_SCENES))
  for (const id of list) assert.ok(known.has(id.split('@')[0]), `${lec}: unknown scene ${id}`);

// the table covers every part of every lesson in the course content
const contentDir = join(repo, 'backend', 'academy_content');
if (existsSync(contentDir)) {
  for (const f of readdirSync(contentDir).filter((x) => x.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(contentDir, f), 'utf8'));
    for (const [lec, langs] of Object.entries<Record<string, unknown[]>>(data.lectures)) {
      const n = (langs.ar ?? []).length;
      assert.ok(LESSON_SCENES[lec], `no scenes for ${lec}`);
      assert.equal(LESSON_SCENES[lec].length, n, `${lec}: ${n} parts but ${LESSON_SCENES[lec].length} scenes`);
    }
  }
}

const finite = (v: unknown) => typeof v !== 'number' || Number.isFinite(v);
let frames = 0;
let examples = 0;
for (const [lec, list] of Object.entries(LESSON_SCENES)) {
  const school = lec.startsWith('ew') ? 'elliott' : lec.startsWith('wy') ? 'wyckoff' : lec.startsWith('smc') ? 'ict-smc' : lec.split('-')[0];
  list.forEach((_, idx) => {
    for (const lang of ['ar', 'en', 'ku'] as Lang[]) {
      const whole = buildScene(school, lec, idx, lang);
      const parts = whole.seq ?? [whole];
      examples += parts.length;
      // the whole part plays: sample frames across all examples
      for (const p of [0, 0.2, 0.5, 0.8, 1]) {
        const f = frameAt(whole, p);
        for (const op of drawOps(whole, f, 360, 250)) for (const v of Object.values(op)) {
          if (Array.isArray(v)) v.flat().forEach((x) => assert.ok(finite(x), `${lec}#${idx} NaN in ${op.t}`));
          else assert.ok(finite(v), `${lec}#${idx} NaN in ${op.t}`);
        }
      }
      for (const sc of parts) {
        assert.equal(sc.candles.length, 56);
        for (const c of sc.candles) {
          assert.ok(c.h >= Math.max(c.o, c.c) - 1e-9 && c.l <= Math.min(c.o, c.c) + 1e-9, `${lec}#${idx} ${sc.id} bad candle`);
          assert.ok(c.l > 0, `${lec}#${idx} ${sc.id} negative price`);
        }
        assert.ok(sc.steps.length >= 2, `${lec}#${idx} ${sc.id} too few steps`);
        for (const p of [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 1]) {
          const f = frameAt(sc, p);
          assert.ok(f.n >= 1 && f.n <= 56);
          assert.ok(Number.isFinite(f.cursor.i) && Number.isFinite(f.cursor.p), `${lec}#${idx} ${sc.id} cursor NaN at ${p}`);
          for (const op of drawOps(sc, f, 360, 250)) for (const v of Object.values(op)) {
            if (Array.isArray(v)) v.flat().forEach((x) => assert.ok(finite(x), `${lec}#${idx} ${sc.id} NaN in ${op.t}`));
            else assert.ok(finite(v), `${lec}#${idx} ${sc.id} NaN in ${op.t}`);
          }
          frames++;
        }
        const end = frameAt(sc, 1);
        assert.equal(end.shapes.length, sc.steps.filter((s) => s.s).length, `${lec}#${idx} ${sc.id} not all drawn`);
        assert.ok(end.shapes.every((s) => s.q === 1), `${lec}#${idx} ${sc.id} unfinished drawing`);
        assert.ok(end.caption.length > 0, `${lec}#${idx} ${sc.id} no caption`);
      }
    }
  });
}

// deterministic: the same part draws the same picture
assert.deepEqual(buildScene('ict-smc', 'smc-l2-01', 0, 'ar').candles, buildScene('ict-smc', 'smc-l2-01', 0, 'ar').candles);
// fallback for an unknown lesson
assert.ok(known.has(sceneIdFor('elliott', 'nope', 3)));
// words: Arabic on the Arabic lesson, English otherwise
const ar = buildScene('ict-smc', 'smc-l2-01', 0, 'ar');
assert.ok(frameAt(ar, 1).caption.match(/[؀-ۿ]/));
assert.ok(!frameAt(buildScene('ict-smc', 'smc-l2-01', 0, 'en'), 1).caption.match(/[؀-ۿ]/));

// the pictures show what the lesson says
const fvg = buildScene('ict-smc', 'smc-l2-02', 0, 'ar');
assert.ok(fvg.candles[20].l > fvg.candles[18].h, 'FVG: candle 3 low must be above candle 1 high');
const ob = buildScene('ict-smc', 'smc-l2-01', 0, 'ar');
assert.ok(ob.candles[21].c < ob.candles[21].o, 'OB: last down candle');
const obBear = buildScene('ict-smc', 'smc-l2-01', 1, 'ar');
assert.ok(obBear.candles[21].c > obBear.candles[21].o, 'bearish OB: last up candle');
const pos = buildScene('basics', 'basics-l1-04', 0, 'ar');
assert.ok(frameAt(pos, 1).shapes.some((s) => s.s.k === 'ring' && (s.s.label ?? '').includes('TP')), 'position: target reached');

// RSI divergence: price makes a higher high while RSI makes a lower high
{
  const sc = buildScene('classic', 'classic-l2-02', 0, 'ar').seq![0];
  const lines = frameAt(sc, 1).shapes.filter((x) => x.s.k === 'line').map((x) => x.s as { a: { p: number }; b: { p: number } });
  assert.ok(lines[0].b.p > lines[0].a.p, 'price HH');
  assert.ok(lines[1].b.p < lines[1].a.p, 'RSI LH');
}
assert.ok(estimateSeconds('كلمة '.repeat(100)) > 30);
console.log(`scenes selftest OK · ${Object.keys(LESSON_SCENES).length} lessons · ${examples} examples · ${frames} frames`);
