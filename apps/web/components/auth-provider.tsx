"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getAccessToken, setTokens, clearTokens } from "@/lib/auth";
import type { User } from "@repo/shared/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { first_name: string; last_name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.data ?? data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    const { access_token, refresh_token } = data.data;
    setTokens(access_token, refresh_token);
    // Fetch user profile
    const me = await api.get("/api/auth/me");
    setUser(me.data.data ?? me.data);
  }, []);

  const register = useCallback(async (body: { first_name: string; last_name: string; email: string; password: string }) => {
    const { data } = await api.post("/api/auth/register", body);
    const { access_token, refresh_token } = data.data;
    setTokens(access_token, refresh_token);
    const me = await api.get("/api/auth/me");
    setUser(me.data.data ?? me.data);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
