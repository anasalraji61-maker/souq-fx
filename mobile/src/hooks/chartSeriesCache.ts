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

/**
 * أقصر سلسلة تُخزَّن. المفتاح (رمز، فريم) بلا عدد الشموع، والقرّاء القصار (`useLastCloses` يومية 50، وقف
 * التقلّب ساعيّة 60) كانوا يكتبون فيها ⇒ التركيز/الرباعي/الطرفية على D تفتح بخُمسَي التاريخ (SMA200 وإيشيموكو
 * فارغة) ثم تقفز (chart102a). تحت افتراض `api.chart` (180) بهامش لما يُسقطه المزوّد، وفوق أطول قراءة قصيرة.
 */
const FULL_SERIES_MIN_CANDLES = 120;

/**
 * يخزّن الحقيقية ويعيدها؛ التجريبية (انقطاع قصير للمزوّد) ⇒ الحقيقية المخزّنة لنفس (الرمز، الفريم) إن وُجدت.
 * الحقيقية القصيرة (دون `FULL_SERIES_MIN_CANDLES`) تُعاد لمستدعيها ولا تُخزَّن — ولا تمسّ المخزَّنة.
 */
export function rememberChartSeries(sym: string, tf: string, s: ChartSeries): ChartSeries {
  const key = seriesCacheKey(sym, tf);
  if (!isSyntheticProvenance(s.data_source)) {
    if ((s.candles?.length ?? 0) >= FULL_SERIES_MIN_CANDLES) sharedSeriesCache.put(key, s);
    return s;
  }
  return sharedSeriesCache.get(key) ?? s;
}
