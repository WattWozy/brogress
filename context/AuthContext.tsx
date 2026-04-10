'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Models } from 'appwrite';
import { getUser, loginWithEmail, registerWithEmail, logoutUser } from '@/lib/appwrite';
import { LoginModal } from '@/components/LoginModal';

interface AuthContextValue {
  user: Models.User<Models.Preferences>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null | 'loading'>('loading');

  useEffect(() => {
    getUser().then(setUser).catch(() => setUser(null));
  }, []);

  async function login(email: string, password: string) {
    await loginWithEmail(email, password);
    setUser(await getUser());
  }

  async function register(email: string, password: string) {
    await registerWithEmail(email, password);
    await loginWithEmail(email, password);
    setUser(await getUser());
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  if (user === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e' }} />;
  }

  if (!user) {
    return <LoginModal onLogin={login} onRegister={register} />;
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
