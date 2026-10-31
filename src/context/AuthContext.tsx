/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string, role?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, pass: string, confirm: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; isDevMode?: boolean; devResetLink?: string; devResetToken?: string; error?: string }>;
  resetPassword: (token: string, newPass: string, confirmPass: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pulse_token') || sessionStorage.getItem('pulse_token'));
  const [loading, setLoading] = useState(true);

  // Initialize and verify session
  useEffect(() => {
    async function loadSession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          setToken(null);
          localStorage.removeItem('pulse_token');
          sessionStorage.removeItem('pulse_token');
        }
      } catch (err) {
        console.warn('Failed to load session', err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, pass: string, role?: string, rememberMe: boolean = true) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setToken(data.token);
      setCurrentUser(data.user);
      if (rememberMe) {
        localStorage.setItem('pulse_token', data.token);
        sessionStorage.removeItem('pulse_token');
      } else {
        sessionStorage.setItem('pulse_token', data.token);
        localStorage.removeItem('pulse_token');
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Request failed' };
      }
      return {
        success: true,
        message: data.message,
        isDevMode: data.isDevMode,
        devResetLink: data.devResetLink,
        devResetToken: data.devResetToken,
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const resetPassword = async (tokenStr: string, newPass: string, confirmPass: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenStr, newPassword: newPass, confirmPassword: confirmPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset failed' };
      }
      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const register = async (fullName: string, email: string, pass: string, confirm: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password: pass, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('pulse_token', data.token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('pulse_token', data.token);
      }
    } catch (err) {
      console.error('Failed to switch demo role', err);
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('pulse_token');
    sessionStorage.removeItem('pulse_token');
  };

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff' || isAdmin;
  const isCustomer = currentUser?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        login,
        register,
        forgotPassword,
        resetPassword,
        switchDemoRole,
        logout,
        isAdmin,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
