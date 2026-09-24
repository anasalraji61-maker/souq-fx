/**
 * شموع تجريبية مرسوّة على السعر الحيّ.
 *
 * `mockSeries` يمشي من أساس ثابت مكتوب بالكود (EURUSD 1.0854…) فحين يفشل الجلب ويصل التيك
 * الحقيقي، يُطبع بالرأس سعر بعيد عن كل الشموع، ويُدمج التيك بآخر شمعة فتصير شمعة عملاقة تمتدّ
 * من السعر القديم إلى الحيّ وتضغط بقية الشارت لخطّ مسطّح. هنا تُضرب السلسلة كلّها بمعامل واحد
 * بحيث يساوي آخر إغلاق السعر المعطى: الشكل والنسب المئوية كما هي، والمستوى هو مستوى السوق.
 */
import type { ChartSeries } from '../api';
import { symbolPriceDecimals } from './indicators/utils';

export function anchorDemoSeries(series: ChartSeries, price: number): ChartSeries {
  const n = series.candles.length;
  const lastClose = n ? series.candles[n - 1].close : NaN;
  if (!(Number.isFinite(price) && price > 0 && Number.isFinite(lastClose) && lastClose > 0)) {
    return series;
  }
  const k = price / lastClose;
  if (k === 1) return series;
  // خانة إضافية على خانات الزوج: التقريب لا يُسطّح شموع الفريمات الصغيرة.
  const d = (symbolPriceDecimals(series.symbol) ?? 5) + 1;
  const r = (x: number) => +(x * k).toFixed(d);
  const candles = series.candles.map((c) => ({
    ...c,
    open: r(c.open),
    high: r(c.high),
    low: r(c.low),
    close: r(c.close),
  }));
  return { ...series, candles, last: candles[n - 1].close };
}
