import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  Shield,
  ShieldAlert,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Clock,
  Terminal,
  Store
} from 'lucide-react';

interface LoginScreenProps {
  isLockScreen?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ isLockScreen = false }) => {
  const { user, login, unlockSession, switchUser, autoLockTimeoutMinutes } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // If in lock screen mode, unlocking uses the currently locked user's account
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Please enter your password to unlock the terminal.');
      return;
    }

    try {
      setLoading(true);
      await unlockSession(password);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Incorrect password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Standard login for new operator or switching operators
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Please enter both operator identifier and password.');
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VIEW A: DEDICATED POS TERMINAL LOCK SCREEN
  // ==========================================
  if (isLockScreen && user) {
    return (
      <div
        id="pos-lock-screen-overlay"
        className="fixed inset-0 z-[9999] bg-[#070A10]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-[#F8FAFC] antialiased select-none"
      >
        <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Subtle security glow at top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Header */}
          <div className="text-center space-y-2 pt-1">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
              <Lock className="w-7 h-7 animate-pulse text-amber-400" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 text-amber-300">
                POS Terminal Locked
              </span>
            </div>

            <h1 className="text-xl font-bold font-serif-luxury tracking-wide text-white uppercase pt-1">
              Bright Cyber & ICT Centre
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Locked due to {autoLockTimeoutMinutes}-minute inactivity timeout.
            </p>
          </div>

          {/* Active Operator Card */}
          <div className="bg-[#1E293B]/80 border border-[#334155] rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">Active Operator</div>
              <div className="text-sm font-bold text-white truncate">{user.name}</div>
              <div className="text-[11px] text-[#64748B] flex items-center gap-2 font-mono">
                <span>@{user.username}</span>
                <span className="text-[#334155]">•</span>
                <span className="text-blue-400 font-sans uppercase font-semibold text-[10px]">
                  {user.role === 'admin' ? 'Administrator' : 'Cashier'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Sale In Progress Notification */}
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-blue-100">Station State Preserved:</span> Any active sales cart, cash drawer records, and unfinished orders remain intact. Enter your password to resume immediately.
            </div>
          </div>

          {error && (
            <div
              id="lock-screen-error-alert"
              className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Unlock Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5">
                Operator Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-lock-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Enter password for @${user.username}`}
                  className="w-full pl-10 pr-10 py-3 bg-[#0B0F19] border border-[#334155] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] cursor-pointer transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-unlock-terminal"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-white" />
                  <span>Unlock POS Terminal</span>
                </>
              )}
            </button>
          </form>

          {/* Switch Operator Action */}
          <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs">
            <span className="text-[#64748B] text-[11px]">Different cashier on duty?</span>
            <button
              id="btn-switch-operator"
              type="button"
              onClick={switchUser}
              className="text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Operator / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: REDESIGNED MAIN OPERATOR LOGIN SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-[#070A10] flex items-center justify-center p-4 sm:p-6 text-[#F8FAFC] antialiased select-none relative overflow-hidden">
      {/* Decorative background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#2563EB]/10 via-[#3B82F6]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-[#2563EB] rotate-45 bg-[#141F36] shadow-xl my-2 rounded-xl group transition-transform hover:scale-105">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center -rotate-45 rounded-md shadow-md">
              <span className="font-serif-luxury text-base font-bold text-white tracking-tighter">BC</span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
              <Store className="w-3 h-3 text-[#3B82F6]" />
              <span>Biashara Street, Nairobi • POS Terminal</span>
            </div>
            <h1 className="text-xl font-bold font-serif-luxury tracking-wider text-white uppercase pt-1">
              BRIGHT CYBER & ICT
            </h1>
            <p className="text-[11px] text-[#94A3B8] uppercase tracking-[0.2em] font-medium">
              Point of Sale & Business Management
            </p>
          </div>
        </div>

        {error && (
          <div
            id="login-error-alert"
            className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4.5">
          <div>
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.18em] block mb-2">
              Operator Identifier
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email (e.g. admin, cashier)"
                className="w-full pl-10 pr-3.5 py-3 bg-[#0B0F19] border border-[#334155] rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.18em] block">
                Security Password
              </label>
              <span className="text-[10px] text-[#64748B]">Case-sensitive</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-[#0B0F19] border border-[#334155] rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] cursor-pointer transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-bold text-xs uppercase tracking-[0.25em] rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30 active:scale-[0.99] mt-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating Operator...</span>
              </>
            ) : (
              <>
                <span>Authorize & Open Station</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & System Info Footer */}
        <div className="pt-2 border-t border-[#1E293B] text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#64748B]">
            <Shield className="w-3 h-3 text-[#3B82F6]" />
            <span>Encrypted POS Session • Role-Based Access Control</span>
          </div>
          <div className="text-[10px] text-[#475569] uppercase tracking-widest font-mono">
            Bright Cyber & ICT Centre • Nairobi, Kenya
          </div>
        </div>
      </div>
    </div>
  );
};
