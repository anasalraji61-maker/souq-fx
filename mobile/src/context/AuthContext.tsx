import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, setUnauthorizedListener } from '../api';
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
  /** الجلسة المحفوظة رفضها الخادم (401) فمُسحت — شاشة الحساب تدعو لإعادة الدخول. يُصفَّر عند دخول/تسجيل. */
  sessionExpired: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

function withinMs<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}
const KEY = 'matrix.auth.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = user?.token ?? null;

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

  // backend-r52: تحقّق عند الإقلاع وعند العودة للواجهة. 401 ⇒ مسح الجلسة المحلية ودعوة دخول (كانت الجلسة
  // المنتهية تبقى «مسجّلاً» بالواجهة والخادم يعاملها مجهولاً ⇒ الدفتر والتنبيهات تختفي بلا تفسير).
  // المقارنة بالتوكن بعد الردّ: دخول جديد أثناء الطلب لا يُمسح بردّ التوكن القديم.
  const checkSession = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    const r = await api.sessionCheck();
    if (r === 'expired' && tokenRef.current === token) {
      // الخادم يفكّ رمز Push هذا الجهاز بالتوكن المنتهي أيضاً (`auth_logout`) — وإلا تبقى إشعارات الحساب تصل.
      await withinMs(api.logout().catch(() => undefined), 4000, undefined);
      if (tokenRef.current !== token) return;
      setSessionExpired(true);
      await persist(null);
    }
  }, [persist]);

  // backend-r70: 401 من مسار بيانات شخصية (دفتر/تنبيهات/متابعة/تخطيطات) ⇒ فحص فوري بدل انتظار العودة للواجهة.
  // عدّة لوحات تفشل معاً بالتوكن نفسه ⇒ فحص واحد جارٍ في كل مرة.
  const checkingRef = useRef(false);
  useEffect(() => {
    setUnauthorizedListener(() => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      void checkSession().finally(() => {
        checkingRef.current = false;
      });
    });
    return () => setUnauthorizedListener(null);
  }, [checkSession]);

  const userToken = user?.token ?? null;
  useEffect(() => {
    if (loading || !userToken) return;
    void checkSession();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void checkSession();
    });
    return () => sub.remove();
  }, [loading, userToken, checkSession]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const res = await api.login(usernameOrEmail, password);
      setSessionExpired(false);
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
      setSessionExpired(false);
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
    () => ({ user, loading, login, register, logout, deleteAccount, sessionExpired }),
    [user, loading, login, register, logout, deleteAccount, sessionExpired]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
