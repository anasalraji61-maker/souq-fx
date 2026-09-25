/**
 * Self-test: PFE بالـpip لا يلتصق عند ±100 على أسعار الفوركس.
 * Run: npx --yes tsx src/chart/pfeUnit.selftest.ts
 */
import assert from 'node:assert/strict';
import { computePfe } from './indicators/trend';

// EURUSD متعرّج: صعود 5 pip ثم هبوط 3 pip بالتناوب ⇒ صافي +1 pip/شمعة، كفاءة منخفضة.
const closes: number[] = [1.08];
for (let i = 1; i < 60; i++) closes.push(closes[i - 1]! + (i % 2 ? 0.0005 : -0.0003));

const rawPrice = computePfe(closes);
assert.ok(rawPrice[59]! > 99, `بالسعر الخام يلتصق عند ~100 (${rawPrice[59]})`);

const pip = computePfe(closes, 10, 5, 0.0001);
assert.ok(pip[59]! > 0 && pip[59]! < 40, `بالـpip كفاءة منخفضة موجبة (${pip[59]})`);

// مسار مستقيم بالـpip ⇒ قرب +100، وهابط ⇒ قرب −100.
const up = Array.from({ length: 40 }, (_, i) => 1.08 + i * 0.0010);
assert.ok(computePfe(up, 10, 5, 0.0001)[39]! > 99);
const down = up.map((v) => 2.16 - v);
assert.ok(computePfe(down, 10, 5, 0.0001)[39]! < -99);

// الوحدة الافتراضية = الصيغة الأصلية؛ وحدة غير صالحة ⇒ 1.
assert.deepEqual(computePfe(closes, 10, 5, 1), rawPrice);
assert.deepEqual(computePfe(closes, 10, 5, 0), rawPrice);

console.log('pfeUnit selftest PASS');
