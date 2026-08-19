import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'ecm_poc_user';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Static demo auth — no real Supabase wiring in the POC (single-user demo).
// User state is persisted to localStorage so refresh doesn't log out.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (/* email, password */) => {
    // POC: bypass — no credentials required. Real Supabase Auth is v2 (see TRD §2).
    const demoUser = { id: 'demo', name: 'Accounts Executive', role: 'user' };
    setUser(demoUser);
    return { success: true };
  };

  const logout = () => setUser(null);

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}