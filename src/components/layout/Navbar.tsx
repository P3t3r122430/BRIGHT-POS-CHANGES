import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfileModal } from '../auth/ProfileModal';
import {
  Monitor,
  User as UserIcon,
  LogOut,
  Clock,
  Wifi,
  WifiOff,
  Shield,
  Printer,
  ChevronDown,
  Moon,
  Sun,
  Palette,
  KeyRound
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, settings, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-KE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString('en-KE', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-b border-[#E2E8F0] dark:border-[#1E293B] px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm shrink-0 font-bold text-sm tracking-tight">
          BC
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm sm:text-base tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
              {settings?.business_name || 'BRIGHT CYBER & ICT CENTRE'}
            </h1>
            <span className="bg-[#2563EB]/10 dark:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#3B82F6] border border-[#2563EB]/20 dark:border-[#2563EB]/30 text-[10px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider font-mono">
              POS Terminal
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tracking-wide">
            Biashara Street, Nairobi • Main Counter
          </p>
        </div>
      </div>

      {/* Center: Live Time, Date & Quick POS button */}
      <div className="hidden md:flex items-center gap-4 bg-[#F1F5F9] dark:bg-[#1E293B] px-4 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <Clock className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
          <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{time}</span>
          <span className="text-[#CBD5E1] dark:text-[#64748B]">•</span>
          <span>{date}</span>
        </div>

        <div className="h-4 w-px bg-[#E2E8F0] dark:bg-[#334155]" />

        <div className="flex items-center gap-1.5 text-xs">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold text-[11px] uppercase tracking-wider">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-semibold text-[11px] uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
        </div>

        {currentTab !== 'pos' && (
          <button
            id="btn-nav-quick-sale"
            onClick={() => onNavigate('pos')}
            className="ml-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-3 py-1 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer tracking-wide"
          >
            <Printer className="w-3.5 h-3.5" /> New Sale (F2)
          </button>
        )}
      </div>

      {/* Right: User Profile, Theme Switcher & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Quick Theme Switcher Button */}
        <button
          id="btn-navbar-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? "Switch to Crisp Light Mode" : "Switch to Dark Mode"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-xs transition cursor-pointer text-[#0F172A] dark:text-[#F8FAFC]"
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="hidden lg:inline text-[11px] text-[#94A3B8]">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden lg:inline text-[11px] text-[#64748B]">Dark Mode</span>
            </>
          )}
        </button>

        <div className="relative">
          <button
            id="btn-user-profile-toggle"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-left transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-semibold text-xs shadow-inner">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
                {user?.name || 'Staff User'}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1 uppercase tracking-wider">
                {user?.role === 'admin' ? (
                  <span className="text-[#2563EB] dark:text-[#3B82F6] font-semibold flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" /> Administrator
                  </span>
                ) : (
                  <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Cashier</span>
                )}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] ml-0.5" />
          </button>

          {profileOpen && (
            <div
              id="dropdown-user-menu"
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95"
            >
              <div className="px-3.5 py-2.5 border-b border-[#F1F5F9] dark:border-[#1E293B] text-xs">
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{user?.name}</p>
                <p className="text-[#64748B] dark:text-[#94A3B8] truncate text-[11px] font-mono">@{user?.username}</p>
                <div className="inline-block text-[10px] text-[#2563EB] dark:text-[#3B82F6] mt-1.5 uppercase font-semibold tracking-wider border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 rounded">
                  Role: {user?.role}
                </div>
              </div>

              <button
                id="btn-nav-profile-settings"
                onClick={() => {
                  setProfileOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] flex items-center gap-2 cursor-pointer transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" /> My Profile & Password
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  onNavigate('theme');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] flex items-center gap-2 cursor-pointer transition"
              >
                <Palette className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" /> Display & Color Theme
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] flex items-center gap-2 cursor-pointer transition"
                >
                  <Monitor className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" /> Business Settings
                </button>
              )}

              <button
                id="btn-logout"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 border-t border-[#F1F5F9] dark:border-[#1E293B] cursor-pointer transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
};
