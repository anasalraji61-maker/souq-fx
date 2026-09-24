/** فحص ذاتي لـ`channel.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { channelHandlePrice, channelWidthAt, fitChannelWidth } from './channel';

const close = (x: number, y: number) => assert.ok(Math.abs(x - y) < 1e-9, `${x} != ${y}`);

// صاعد على القيعان: الموازي على أبعد قمّة فوق الخطّ (الشمعة 2: قمّة 1.1030، الخطّ عندها 1.1010).
const bars = [
  { high: 1.1005, low: 1.1 },
  { high: 1.1015, low: 1.1006 },
  { high: 1.103, low: 1.101 },
  { high: 1.102, low: 1.1015 },
  { high: 1.1028, low: 1.102 },
];
close(fitChannelWidth(bars, { index: 0, price: 1.1 }, { index: 4, price: 1.102 }, 0.001), 0.002);
// الطرفان بالعكس (سُحب من اليمين لليسار) ⇒ النتيجة نفسها.
close(fitChannelWidth(bars, { index: 4, price: 1.102 }, { index: 0, price: 1.1 }, 0.001), 0.002);

// هابط على القمم: الموازي على أبعد قاع تحته ⇒ عرض سالب.
const down = [
  { high: 1.2, low: 1.198 },
  { high: 1.1995, low: 1.195 },
  { high: 1.198, low: 1.196 },
];
close(fitChannelWidth(down, { index: 0, price: 1.2 }, { index: 2, price: 1.198 }, 0.001), -0.004);

// طرفان على شمعة واحدة / لا شيء يتجاوز الخطّ ⇒ الاحتياطي بإشارة الجهة.
close(fitChannelWidth(bars, { index: 2, price: 1.1 }, { index: 2, price: 1.2 }, 0.001), 0.001);
close(fitChannelWidth(down, { index: 0, price: 1.1 }, { index: 2, price: 1.09 }, 0.001), -0.001);
close(fitChannelWidth(bars, { index: 0, price: 1.2 }, { index: 4, price: 1.21 }, -0.003), 0.003);
// فهارس خارج السلسلة (نقطة بالمستقبل) لا تكسر الحساب.
close(fitChannelWidth(bars, { index: 3, price: 1.1015 }, { index: 9, price: 1.103 }, 0.001), 0.00105);

// مقبض العرض وعكسه.
const a = { index: 0, price: 1.1 };
const b = { index: 4, price: 1.102 };
close(channelHandlePrice(a, b, 0.002), 1.103);
close(channelWidthAt(a, b, channelHandlePrice(a, b, -0.0007)), -0.0007);

console.log('channel.selftest: PASS');
