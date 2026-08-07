import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DICTS, Dict, LangId, LANGS, isRtl } from './locales';

type I18nCtx = {
  lang: LangId;
  t: Dict;
  rtl: boolean;
  setLang: (id: LangId) => Promise<void>;
  langs: typeof LANGS;
};

const Ctx = createContext<I18nCtx | null>(null);
const KEY = 'matrix.lang.v1';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangId>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved && saved in DICTS) setLangState(saved as LangId);
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback(async (id: LangId) => {
    setLangState(id);
    await AsyncStorage.setItem(KEY, id);
    const wantRtl = isRtl(id);
    if (I18nManager.isRTL !== wantRtl) {
      try {
        I18nManager.allowRTL(wantRtl);
        I18nManager.forceRTL(wantRtl);
      } catch {
        /* web may ignore */
      }
    }
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
