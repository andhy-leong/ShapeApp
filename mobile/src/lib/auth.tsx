import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, loadToken, setToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

interface AuthState {
  ready: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      try {
        if (await loadToken()) {
          const { user } = await api.me();
          setUser(user);
        }
      } catch (e: any) {
        // Hors ligne : on garde le jeton, l'utilisateur pourra réessayer
        if (e?.status === 401) await setToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      setUser,
      logout,
      login: async (email, password) => {
        const res = await api.login(email.trim(), password);
        await setToken(res.token);
        setUser(res.user);
      },
      register: async (email, password, name) => {
        const res = await api.register(email.trim(), password, name.trim());
        await setToken(res.token);
        setUser(res.user);
      },
      refresh: async () => {
        const { user } = await api.me();
        setUser(user);
      },
    }),
    [ready, user, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
