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
  isLocked: boolean;
  autoLockTimeoutMinutes: number;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  lockSession: () => void;
  unlockSession: (password: string) => Promise<void>;
  switchUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateUserSession: (newUser: User, newToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('brightcyber_is_locked') === 'true';
  });

  const lastActivityRef = React.useRef<number>(Date.now());
  const userRef = React.useRef<User | null>(user);
  const isLockedRef = React.useRef<boolean>(isLocked);
  const settingsRef = React.useRef<BusinessSettings | null>(settings);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
      setIsLocked(false);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.user);
      await fetchSettings();

      // Check if session was previously locked or if inactivity timeout elapsed during reload
      const wasLocked = sessionStorage.getItem('brightcyber_is_locked') === 'true';
      const lastActiveRaw = sessionStorage.getItem('brightcyber_last_activity');
      if (lastActiveRaw) {
        const lastActive = parseInt(lastActiveRaw, 10);
        const timeoutMins = settingsRef.current?.auto_lock_timeout_minutes || 15;
        if (Date.now() - lastActive > timeoutMins * 60 * 1000) {
          setIsLocked(true);
          sessionStorage.setItem('brightcyber_is_locked', 'true');
        } else if (wasLocked) {
          setIsLocked(true);
        }
      } else if (wasLocked) {
        setIsLocked(true);
      }
    } catch (err) {
      console.warn('Authentication token check failed:', err);
      setAuthToken(null);
      setUser(null);
      setIsLocked(false);
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
      setIsLocked(false);
      setAuthToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser]);

  // Inactivity auto-lock listener & periodic checker
  useEffect(() => {
    if (!user) return;

    let lastPersisted = Date.now();

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      // Throttle session storage write to every 5 seconds
      if (Date.now() - lastPersisted > 5000) {
        lastPersisted = Date.now();
        sessionStorage.setItem('brightcyber_last_activity', Date.now().toString());
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'touchstart',
      'touchend',
      'scroll',
      'wheel',
    ];

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Check inactivity every 2 seconds
    const interval = setInterval(() => {
      if (!userRef.current || isLockedRef.current) return;

      const configuredMinutes = settingsRef.current?.auto_lock_timeout_minutes || 15;
      const timeoutMs = Math.max(1, configuredMinutes) * 60 * 1000;
      const idleTime = Date.now() - lastActivityRef.current;

      if (idleTime >= timeoutMs) {
        console.warn(`[SECURITY] Inactivity threshold reached (${configuredMinutes}m). Locking POS terminal.`);
        setIsLocked(true);
        sessionStorage.setItem('brightcyber_is_locked', 'true');
      }
    }, 2000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    setAuthToken(res.token);
    setUser(res.user);
    setIsLocked(false);
    sessionStorage.removeItem('brightcyber_is_locked');
    lastActivityRef.current = Date.now();
    sessionStorage.setItem('brightcyber_last_activity', Date.now().toString());
    await fetchSettings();
  };

  const lockSession = useCallback(() => {
    if (userRef.current) {
      setIsLocked(true);
      sessionStorage.setItem('brightcyber_is_locked', 'true');
    }
  }, []);

  const unlockSession = async (password: string): Promise<void> => {
    if (!user) throw new Error('No active operator to unlock.');
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username: user.username,
      password,
    });
    setAuthToken(res.token);
    setUser(res.user);
    setIsLocked(false);
    sessionStorage.removeItem('brightcyber_is_locked');
    lastActivityRef.current = Date.now();
    sessionStorage.setItem('brightcyber_last_activity', Date.now().toString());
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setAuthToken(null);
      setUser(null);
      setIsLocked(false);
    }
  };

  const switchUser = async () => {
    await logout();
  };

  const updateUserSession = (newUser: User, newToken?: string) => {
    if (newToken) {
      setAuthToken(newToken);
    }
    setUser(newUser);
  };

  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier' || user?.role === 'admin';
  const autoLockTimeoutMinutes = settings?.auto_lock_timeout_minutes || 15;

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isCashier,
        isLocked,
        autoLockTimeoutMinutes,
        login,
        logout,
        lockSession,
        unlockSession,
        switchUser,
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
