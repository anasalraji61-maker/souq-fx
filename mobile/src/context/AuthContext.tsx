import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api';
import { currentPushToken } from '../notifications';

type User = { user_id: number; username: string; email?: string | null; token: string };

type RegisterOpts = {
  email: string;
  role?: 'trader' | 'trainer' | 'broker' | 'agent' | 'company';
  sponsor_code?: string;
  side?: 'left' | 'right';
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, password: string, opts: RegisterOpts) => Promise<void>;
  logout: () => Promise<void>;
  /** حذف الحساب — شرط إلزامي لأبل (App Store Review Guideline 5.1.1(v)) */
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function withinMs<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}
const KEY = 'matrix.auth.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const u = JSON.parse(raw) as User;
          setAuthToken(u.token);
          setUser(u);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (u: User | null) => {
    setUser(u);
    setAuthToken(u?.token ?? null);
    // فشل التخزين المحلي (مساحة ممتلئة/صلاحيات) لا يجب أن يُسقط دخول/تسجيل/خروج ناجحاً فعلياً
    // بذاكرة الجلسة الحالية — نفس فلسفة try/catch الصامت المستخدَمة أصلاً بقراءة الجلسة أعلاه
    // (سطر 31-40 بهذا الملف). أثر التسريب الوحيد: الجلسة لن تنجو من إعادة تشغيل التطبيق إن فشل
    // التخزين، لا فشل login()/register()/logout() نفسها بواجهة المستخدم.
    try {
      if (u) await AsyncStorage.setItem(KEY, JSON.stringify(u));
      else await AsyncStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const res = await api.login(usernameOrEmail, password);
      await persist({
        user_id: res.user_id,
        username: res.username,
        email: res.email,
        token: res.token,
      });
    },
    [persist]
  );

  const register = useCallback(
    async (username: string, password: string, opts: RegisterOpts) => {
      const res = await api.register(username, password, opts);
      await persist({
        user_id: res.user_id,
        username: res.username,
        email: res.email ?? opts.email,
        token: res.token,
      });
    },
    [persist]
  );

  const logout = useCallback(async () => {
    // الخادم أولاً (والتوكن ما زال مضبوطاً — `postJson` يقرأ الرؤوس لحظة الإرسال): يُلغي الجلسة ويفكّ رمز
    // Push هذا الجهاز. كان الخروج محلياً فقط فتصل إشعارات تنبيهات الحساب لمن يستعمل الهاتف بعده
    // (backend-r50a). فشله أو بطؤه لا يمنع الخروج: جلب الرمز بسقف 2ث (قد يعلق بلا شبكة؛ معرّف التثبيت
    // يكفي الخادم حينها)، والطلب بسقف 4ث، ثم المسح المحلي دائماً.
    if (user) {
      const pt = await withinMs(currentPushToken(), 2000, null);
      await withinMs(api.logout(pt).catch(() => undefined), 4000, undefined);
    }
    await persist(null);
  }, [persist, user]);

  const deleteAccount = useCallback(async () => {
    // الخادم يمحو الهوية الشخصية ويُلغي كل الجلسات فوراً (db.delete_user_account) —
    // بعدها لا فائدة من إبقاء الجلسة المحلية، حتى لو فشل الاتصال بعد نجاح المحو خادمياً.
    await api.deleteAccount();
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, deleteAccount }),
    [user, loading, login, register, logout, deleteAccount]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
