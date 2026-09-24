/**
 * Self-test for createSeriesCache (pure).
 * Run: npx --yes tsx src/chart/seriesCache.selftest.ts
 */
import assert from 'node:assert/strict';
import { createSeriesCache, seriesCacheKey } from './seriesCache';

assert.equal(seriesCacheKey('eurusd', '15m'), 'EURUSD|15m');
assert.notEqual(seriesCacheKey('EURUSD', '1H'), seriesCacheKey('EURUSD', '15m'));

// عرض فوري ضمن المدّة، ولا شيء بعدها
{
  const c = createSeriesCache<string>(4, 1000);
  assert.equal(c.get('a', 0), null);
  c.put('a', 'A', 0);
  assert.equal(c.get('a', 999), 'A');
  assert.equal(c.get('a', 1000), null); // انتهت
  assert.equal(c.get('a', 1001), null); // وحُذفت
  c.put('a', 'A2', 2000);
  assert.equal(c.get('a', 2500), 'A2'); // الكتابة تجدّد الزمن
  assert.equal(c.get('a', 1500), null); // ساعة رجعت للخلف ⇒ لا ثقة
}

// الطرد: الأقدم استعمالاً لا الأقدم كتابة
{
  const c = createSeriesCache<number>(2, 1e9);
  c.put('a', 1, 0);
  c.put('b', 2, 0);
  assert.equal(c.get('a', 1), 1); // a صار الأحدث استعمالاً
  c.put('c', 3, 2);
  assert.equal(c.get('b', 3), null); // b طُرد
  assert.equal(c.get('a', 3), 1);
  assert.equal(c.get('c', 3), 3);
  c.clear();
  assert.equal(c.get('a', 3), null);
}

// سقف فاسد ⇒ عنصر واحد على الأقل
{
  const c = createSeriesCache<number>(0, 1e9);
  c.put('a', 1, 0);
  assert.equal(c.get('a', 0), 1);
  c.put('b', 2, 0);
  assert.equal(c.get('a', 0), null);
  assert.equal(c.get('b', 0), 2);
}

console.log('seriesCache.selftest: PASS');
