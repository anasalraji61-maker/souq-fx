import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DICTS, Dict, LangId, LANGS, isRtl, resolveLang, deviceLocaleTag, LANG_STORAGE_KEY } from './locales';
import { ensureAlertChannel, registerPushToken } from '../notifications';

type I18nCtx = {
  lang: LangId;
  t: Dict;
  rtl: boolean;
  setLang: (id: LangId) => Promise<void>;
  langs: typeof LANGS;
};

const Ctx = createContext<I18nCtx | null>(null);
const KEY = LANG_STORAGE_KEY;

/**
 * لغة أول فتح (قبل أن يختار المتداول شيئاً): كانت العربية دائماً، فمن يثبّت التطبيق من صفحة المتجر
 * الإنجليزية على جهاز إنجليزي تستقبله جولة ترحيب لا يقرؤها — وزرّ اللغة بتبويب الحساب لم يعرف بعد
 * أين هو. القاعدة بـ`resolveLang` (`locales.ts`) كي تتّفق الواجهة ولغة الإشعارات. لا يُحفظ هذا
 * التخمين — المحفوظ هو اختيار المتداول الصريح وحده.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangId>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      let saved: string | null = null;
      try {
        saved = await AsyncStorage.getItem(KEY);
      } catch {
        /* تخزين معطَّل: لغة الجهاز — كانت تبقى العربية هنا بينما الإشعارات تتبع الجهاز */
      } finally {
        setLangState(resolveLang(saved, deviceLocaleTag()));
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    // **اتجاه المنصّة مُثبَّت على LTR، والانعكاس للعربية/الكردية يدويّ بكل الواجهة.** كل صفّ بالتطبيق
    // يقلب نفسه بشرط `rtl` من هذا السياق (`rtl && styles.xRtl` ← `row-reverse`، و`textAlign` صريح)
    // — أكثر من 170 موضعاً. وكان `setLang` يستدعي `forceRTL(true)` ويطلب إعادة التشغيل؛ فإذا أعاد
    // المتداول فتح التطبيق كما طُلب منه صار Yoga يعكس كل `row` بنفسه، فينقلب `row-reverse` اليدويّ
    // **مرّة ثانية إلى اليسار**: الواجهة العربية كلها بالاتجاه الخطأ، بسبب اتّباع التعليمات حرفياً.
    // وجهاز أندرويد بلغة عربية يبدأ أصلاً بـRTL مفعّل (السماح افتراضيّ). فنثبّت LTR هنا مرّة عند
    // الإقلاع؛ من سبق أن فُعِّل عنده يُصلَح من الفتح التالي. والويب يتجاهل `I18nManager` كلياً.
    if (Platform.OS === 'web') return;
    try {
      I18nManager.allowRTL(false);
      if (I18nManager.isRTL) I18nManager.forceRTL(false);
    } catch {
      /* ignore */
    }
  }, []);

  // تبديل اللغة فوريّ على كل الشاشات (الانعكاس يقرأ `rtl` من السياق) — لا إعادة تشغيل ولا نافذة.
  const setLang = useCallback(async (id: LangId) => {
    setLangState(id);
    try {
      await AsyncStorage.setItem(KEY, id);
    } catch {
      /* فشل الحفظ: اللغة تسري بهذه الجلسة ويُعاد الافتراضي بالفتح التالي — أهون من استثناء */
    }
    // الخادم يختار لغة إشعار التنبيه من اللغة المسجَّلة مع توكن الجهاز، والتوكن كان يُسجَّل بالإقلاع
    // فقط ⇒ من بدّل العربية إلى الإنجليزية ظلّت تنبيهات أسعاره عربية حتى يعيد تشغيل التطبيق. نعيد
    // التسجيل الآن (بلا سؤال إذن — بلا إذن ممنوح لا يفعل شيئاً، ويقرأ اللغة المحفوظة للتوّ)، ونحدّث
    // اسم قناة أندرويد بإعدادات النظام باللغة الجديدة. بلا انتظار: تبديل اللغة لا ينتظر الشبكة.
    void ensureAlertChannel(true);
    void registerPushToken();
  }, []);

  const value = useMemo(
    () => ({
      lang,
      t: DICTS[lang],
      rtl: isRtl(lang),
      setLang,
      langs: LANGS,
    }),
    [lang, setLang]
  );

  if (!ready) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
