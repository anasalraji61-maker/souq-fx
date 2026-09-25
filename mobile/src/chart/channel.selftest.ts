/** فحص ذاتي لـ`channel.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { channelHandlePrice, channelLinePrices, channelWidthAt, fitChannelWidth } from './channel';

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

// خطوط القناة كما تُرسم: خطّياً إزاحة ثابتة بالسعر (كما كانت)
{
  const lin = channelLinePrices(a, b, 0.002);
  close(lin.a, 1.102);
  close(lin.b, 1.104);
  close(channelLinePrices(a, b, 0.002, 0.5).a, 1.101);
}
// باللوغاريتمي: متوازية بالبكسل (نسبة ثابتة لطرفَي الأساس) والموازي يمرّ بمقبض العرض عند المنتصف
{
  const ga = { index: 0, price: 1800 };
  const gb = { index: 100, price: 2600 };
  const w = 150;
  const par = channelLinePrices(ga, gb, w, 1, true);
  close(Math.log(par.a) - Math.log(ga.price), Math.log(par.b) - Math.log(gb.price));
  close((Math.log(par.a) + Math.log(par.b)) / 2, Math.log(channelHandlePrice(ga, gb, w)));
  const mid = channelLinePrices(ga, gb, w, 0.5, true);
  close(Math.log(mid.a) - Math.log(ga.price), (Math.log(par.a) - Math.log(ga.price)) / 2);
  // سعر ≤0 ⇒ الخطّي
  close(channelLinePrices({ index: 0, price: 1 }, { index: 1, price: 2 }, -5, 1, true).a, -4);
}

console.log('channel.selftest: PASS');
