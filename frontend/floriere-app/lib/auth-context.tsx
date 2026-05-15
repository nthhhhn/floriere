import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { apiGet, apiPost } from './api';
import { clearSession, getToken, getUser, saveSession } from './session';
import type { AuthUser, Role } from './types';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    as_seller?: boolean;
    shop_name?: string;
    phone?: string;
  }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getUser();
      const token = await getToken();
      if (stored && token) {
        setUser(stored);
        // Best-effort refresh — don't block the UI if it fails.
        try {
          const me = await apiGet<{ user: AuthUser | null }>('/auth/me');
          if (me.user) setUser(me.user);
          else {
            await clearSession();
            setUser(null);
          }
        } catch {
          /* keep stored user on transient network errors */
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const out = await apiPost<{ token: string; user: AuthUser }>(
      '/auth/login',
      { email, password },
      { auth: false },
    );
    await saveSession(out.token, out.user);
    setUser(out.user);
    return out.user;
  };

  const signUp: AuthContextValue['signUp'] = async (input) => {
    const out = await apiPost<{ token: string; user: AuthUser }>(
      '/auth/register',
      input,
      { auth: false },
    );
    await saveSession(out.token, out.user);
    setUser(out.user);
    return out.user;
  };

  const signOut = async () => {
    try { await apiPost('/auth/logout'); } catch { /* swallow */ }
    await clearSession();
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await apiGet<{ user: AuthUser | null }>('/auth/me');
      setUser(me.user);
    } catch {
      /* swallow */
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function homeRouteForRole(role: Role): string {
  switch (role) {
    case 'seller': return '/(seller)/home';
    case 'admin':  return '/(admin)/home';
    default:       return '/(purchaser)/home';
  }
}
