'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthTokenResponse } from '../types';
import { api, AuthError } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: (shouldRedirect?: boolean) => void;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      if (err instanceof AuthError) {
        console.warn('Session expired or invalid. Quietly logged out.');
      } else {
        console.error('Failed to load user profile:', err);
      }
      logout(false);
    }
  };

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setLoading(true);
    try {
      // Set the token inside the context and fetch the profile
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login profile fetch failed:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const logout = (shouldRedirect: boolean = true) => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLoading(false);
    
    if (shouldRedirect && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path !== '/' && path !== '/login' && path !== '/register') {
        router.push('/login');
      }
    }
  };

  // Initialize session
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const userData = await api.get<User>('/auth/me');
          setUser(userData);
        } catch (err) {
          if (err instanceof AuthError) {
            console.warn('Startup session token validation failed (expired/invalid).');
          } else {
            console.error('Token validation failed on startup:', err);
          }
          logout(false);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for global auth expiration events from api.ts
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth_expired', handleAuthExpired);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
