import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, BusinessSettings } from '../types';
import { api, getAuthToken, setAuthToken, ApiError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  settings: BusinessSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateUserSession: (newUser: User, newToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ settings: BusinessSettings }>('/settings');
      setSettings(res.settings);
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.user);
      await fetchSettings();
    } catch (err) {
      console.warn('Authentication token check failed:', err);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
      setAuthToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser]);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    setAuthToken(res.token);
    setUser(res.user);
    await fetchSettings();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const updateUserSession = (newUser: User, newToken?: string) => {
    if (newToken) {
      setAuthToken(newToken);
    }
    setUser(newUser);
  };

  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isCashier,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        refreshSettings: fetchSettings,
        updateUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
