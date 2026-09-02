"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, getToken, setToken } from "./api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthCtx {
  token: string | null;
  user: AuthUser | null;
  /** Validasi token saat mount selesai — gate render supaya tidak flash. */
  ready: boolean;
  signIn: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  token: null,
  user: null,
  ready: false,
  signIn: async () => {},
  logout: async () => {},
});

/**
 * Auth global (padanan auth-context nextjs-spine). Token di localStorage
 * (spine_token) — context mirror + validasi /auth/me saat mount.
 * Semua setState lewat async path (promise) — hindari set-state-in-effect.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initializer baca localStorage — bukan effect.
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Mount: validasi token tersimpan lewat /auth/me.
  useEffect(() => {
    let cancelled = false;
    const t = getToken();
    const settle = (fn: () => void) => {
      if (!cancelled) fn();
    };

    if (!t) {
      Promise.resolve().then(() => settle(() => setReady(true)));
    } else {
      api<AuthUser>("/api/v1/auth/me")
        .then((res) => {
          settle(() => {
            if (res.ok) setUser(res.data);
            else setToken(null); // token invalid/expired
          });
        })
        .catch(() => settle(() => setToken(null)))
        .finally(() => settle(() => setReady(true)));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (t: string) => {
    setToken(t); // localStorage dulu -> hook lain (getToken) langsung konsisten
    setTokenState(t);
    const res = await api<AuthUser>("/api/v1/auth/me");
    if (res.ok) setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    api("/api/v1/auth/logout", { method: "POST" }).catch(() => {}); // fire-and-forget
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ token, user, ready, signIn, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
