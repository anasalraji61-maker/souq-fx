/**
 * ذاكرة جلسة لشموع (رمز، فريم) — دالة خالصة بلا React ولا `api`.
 *
 * كل تبديل فريم بالرباعي كان يُفرغ الخلايا الأربع ويعيد جلبها من الصفر خلف مؤشّرات تحميل،
 * حتى الرجوع لفريم فُتح قبل ثوانٍ (15m ⇒ 1H ⇒ 15m = جولتا انتظار كاملتان). الآن آخر سلسلة
 * ناجحة تُعرض فوراً، والجلب يجري كالعادة ويستبدلها لحظة وصوله (عرض ثم تحديث).
 *
 * - مدّة قصيرة (`ttlMs`، 5 دقائق افتراضاً): أقدم من ذلك قد تنقصه شمعة كاملة على الفريمات
 *   الصغيرة، فمؤشّر التحميل أصدق من شموع تُقرأ كحالية.
 * - سقف عدد (`max`) بطرد الأقدم استعمالاً: أربعة رموز × بضعة فريمات لا تتراكم بلا حدّ.
 * - المستدعي لا يخزّن السلاسل التجريبية (demo) — ذاكرة لا تجعل الوهمي يبدو محفوظاً.
 */

export type SeriesCache<T> = {
  get: (key: string, now?: number) => T | null;
  put: (key: string, value: T, now?: number) => void;
  clear: () => void;
};

export function seriesCacheKey(symbol: string, timeframe: string): string {
  return `${symbol.toUpperCase()}|${timeframe}`;
}

export function createSeriesCache<T>(max = 24, ttlMs = 5 * 60 * 1000): SeriesCache<T> {
  // `Map` يحفظ ترتيب الإدراج: إعادة الإدراج عند كل قراءة/كتابة تجعل أوّله الأقدم استعمالاً.
  const m = new Map<string, { value: T; at: number }>();
  return {
    get(key, now = Date.now()) {
      const e = m.get(key);
      if (!e) return null;
      if (!(now - e.at < ttlMs) || now < e.at) {
        m.delete(key);
        return null;
      }
      m.delete(key);
      m.set(key, e);
      return e.value;
    },
    put(key, value, now = Date.now()) {
      m.delete(key);
      m.set(key, { value, at: now });
      while (m.size > Math.max(1, max)) {
        const oldest = m.keys().next().value as string;
        m.delete(oldest);
      }
    },
    clear() {
      m.clear();
    },
  };
}
