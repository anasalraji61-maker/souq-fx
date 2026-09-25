/** فحص ذاتي لـ`arrowNudge`/`nudgePipPrice` (`drawEdit.ts`) — يُشغَّل بـNode بلا شجرة مكوّنات. */
import {
  arrowNudge,
  nudgePipPrice,
  nudgeRepeatMultiplier,
  NUDGE_REPEAT_FAST_STEP,
  NUDGE_REPEAT_SLOW_TICKS,
  translateDrawing,
} from './drawEdit';
import type { Drawing } from './types';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

ok('← شمعة', JSON.stringify(arrowNudge('ArrowLeft', false)) === JSON.stringify({ bars: -1, steps: 0 }));
ok('Shift+→ عشر', arrowNudge('ArrowRight', true)?.bars === 10);
ok('↑ خطوة', arrowNudge('ArrowUp', false)?.steps === 1);
ok('Shift+↓ عشر', arrowNudge('ArrowDown', true)?.steps === -10);
ok('مفتاح آخر ⇒ null', arrowNudge('a', false) === null);

ok('EURUSD +1 pip', nudgePipPrice(1.08532, 1, 0.0001) === 1.08542);
ok('بلا ضجيج', nudgePipPrice(1.1, 3, 0.0001) === 1.1003);
ok('USDJPY −10 pip', nudgePipPrice(157.423, -10, 0.01) === 157.323);
ok('XAUUSD +1 pip', nudgePipPrice(2345.67, 1, 0.1) === 2345.77);

// خطّ أفقي مُزاح بالسعر وحده لا يغيّر فهرسه؛ والترند يحتفظ بميله.
const stamp = (i: number) => ({ time: 1000 + i * 60 });
const h: Drawing = { id: 'h', tool: 'hline', a: { index: 5, price: 1.2 }, color: '#fff' };
const h2 = translateDrawing(h, 0, (p) => nudgePipPrice(p, 1, 0.0001), stamp);
ok('hline: السعر', h2.a.price === 1.2001 && h2.a.index === 5 && h2.a.time === 1300);
const t: Drawing = { id: 't', tool: 'trend', a: { index: 2, price: 1.1 }, b: { index: 8, price: 1.2 }, color: '#fff' };
const t2 = translateDrawing(t, -1, (p) => p, stamp);
ok('trend: شمعة يساراً', t2.a.index === 1 && t2.b!.index === 7 && t2.b!.price === 1.2);
// لا خانة قبل الأولى.
const t3 = translateDrawing(t, -10, (p) => p, stamp);
ok('trend: يتوقّف عند 0', t3.a.index === 0 && t3.b!.index === 6);

// الضغط المطوَّل: خطوة واحدة أوّل 10 تكرارات ثم 5.
ok('تكرار 1 ⇒ خطوة', nudgeRepeatMultiplier(1) === 1);
ok('تكرار 10 ⇒ خطوة', nudgeRepeatMultiplier(NUDGE_REPEAT_SLOW_TICKS) === 1);
ok('تكرار 11 ⇒ سريع', nudgeRepeatMultiplier(NUDGE_REPEAT_SLOW_TICKS + 1) === NUDGE_REPEAT_FAST_STEP);

if (failures) {
  console.error(`drawNudge selftest: ${failures} failure(s)`);
  process.exit(1);
}
console.log('drawNudge selftest: PASS');
