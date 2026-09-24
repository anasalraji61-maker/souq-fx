/**
 * إشارة «فشل الحفظ/الحذف» المشتركة لمخازن الشارت (الرسومات، القوالب، التخطيطات، قائمة المراقبة).
 * كانت منسوخة حرفياً أربع مرات (قيمة + مجموعة مستمعين + notify + set/subscribe/get)؛ الآن مصدر واحد.
 * الرمز ثابت لا نصّ معروض — الترجمة بطبقة العرض عبر `t[code]`. خالصة بلا React/AsyncStorage.
 */
export type SaveErrorSignal<C extends string> = {
  /** يضبط الحالة ويُبلغ كل المستمعين (`null` = نجح آخر حفظ). */
  set: (code: C | null) => void;
  /** يُستدعى فوراً بالحالة الحالية ثم عند كل تغيير؛ يعيد دالة إلغاء الاشتراك. */
  subscribe: (cb: (code: C | null) => void) => () => void;
  get: () => C | null;
  /** تصفير صامت بلا إبلاغ (لإعادة ضبط الذاكرة بالاختبارات). */
  reset: () => void;
};

export function createSaveErrorSignal<C extends string>(): SaveErrorSignal<C> {
  let current: C | null = null;
  const listeners = new Set<(code: C | null) => void>();
  return {
    set(code) {
      current = code;
      for (const cb of listeners) {
        try {
          cb(current);
        } catch {
          /* مستمع معطوب لا يوقف البقية */
        }
      }
    },
    subscribe(cb) {
      listeners.add(cb);
      cb(current);
      return () => {
        listeners.delete(cb);
      };
    },
    get: () => current,
    reset() {
      current = null;
    },
  };
}
