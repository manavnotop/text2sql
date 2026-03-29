'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';

interface AuthUser {
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  apiKey: string | null;
  login: (username: string, password: string, apiKey?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo';

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_USER_KEY = 'auth_user';
const LLM_API_KEY_KEY = 'llm_api_key';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    const storedApiKey = localStorage.getItem(LLM_API_KEY_KEY);

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    if (storedApiKey) {
      setApiKey(storedApiKey);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (
    username: string,
    password: string,
    apiKey?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      return { success: false, error: 'Invalid username or password' };
    }

    const authUser: AuthUser = { username };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
    setIsAuthenticated(true);

    if (apiKey && apiKey.trim()) {
      localStorage.setItem(LLM_API_KEY_KEY, apiKey.trim());
      setApiKey(apiKey.trim());
    }

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(LLM_API_KEY_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setApiKey(null);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    apiKey,
    login,
    logout,
  }), [isAuthenticated, user, apiKey, login, logout]);

  if (isLoading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
