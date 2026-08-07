import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api';

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
};

const Ctx = createContext<AuthCtx | null>(null);
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
    if (u) await AsyncStorage.setItem(KEY, JSON.stringify(u));
    else await AsyncStorage.removeItem(KEY);
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
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
