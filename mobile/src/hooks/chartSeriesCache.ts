import type { ChartSeries } from '../api';
import { createSeriesCache, seriesCacheKey } from '../chart/seriesCache';
import { isSyntheticProvenance } from '../chart/dataSource';

/**
 * ذاكرة جلسة واحدة لشموع (رمز، فريم) يتشاركها التركيز والرباعي (والطرفية حين تنتقل إليها): فتح التركيز
 * على رمز/فريم جلبه الرباعي قبل ثوانٍ فوري، و15m→1H→15m بالتركيز لا ينتظر الشبكة مرّتين (chart-r74c).
 * لا تُخزَّن السلاسل التجريبية ولا «غير المتاحة» — ذاكرة لا تجعل الوهمي يبدو محفوظاً.
 */
export const sharedSeriesCache = createSeriesCache<ChartSeries>();

export const cachedChartSeries = (sym: string, tf: string): ChartSeries | null =>
  sharedSeriesCache.get(seriesCacheKey(sym, tf));

/** يخزّن الحقيقية ويعيدها؛ التجريبية (انقطاع قصير للمزوّد) ⇒ الحقيقية المخزّنة لنفس (الرمز، الفريم) إن وُجدت. */
export function rememberChartSeries(sym: string, tf: string, s: ChartSeries): ChartSeries {
  const key = seriesCacheKey(sym, tf);
  if (!isSyntheticProvenance(s.data_source)) {
    sharedSeriesCache.put(key, s);
    return s;
  }
  return sharedSeriesCache.get(key) ?? s;
}
