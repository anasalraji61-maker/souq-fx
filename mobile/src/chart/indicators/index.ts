/** حاجز تجميع (barrel) — يُصدِّر كل دوال المؤشرات بنفس الأسماء بالضبط كما كانت بملف
 * math.ts الأصلي قبل التقسيم، حتى لا يحتاج أي ملف مستهلك تغيير مسار الاستيراد.
 * راجع docs/ARCHITECTURE.md، بند 3 من "خطة الهجرة الفورية الآمنة". */
export * from './utils';
export * from './moving-averages';
export * from './trend';
export * from './momentum';
export * from './volatility';
export * from './volume';
export * from './price-transform';
