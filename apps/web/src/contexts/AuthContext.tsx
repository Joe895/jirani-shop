import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { get, post } from '../lib/api';
type AuthContextValue = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get<{ user: User }>('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  async function login(email: string, password: string) {
    const result = await post<{ user: User }>('/auth/login', { email, password }); setUser(result.user); return result.user;
  }
  async function register(name: string, email: string, password: string) {
    const result = await post<{ user: User }>('/auth/register', { name, email, password }); setUser(result.user); return result.user;
  }
  async function logout() { await post('/auth/logout'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider missing'); return context; }
