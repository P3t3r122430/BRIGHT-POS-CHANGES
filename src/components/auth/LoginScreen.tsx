import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 selection:bg-[#C5A059]/30 selection:text-[#C5A059]">
      <div className="max-w-md w-full bg-[#0D0D0D] border border-[#222222] rounded p-8 sm:p-10 shadow-2xl space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-[#C5A059] rotate-45 bg-[#141414] shadow-xl my-2">
            <div className="w-8 h-8 bg-[#C5A059] flex items-center justify-center -rotate-45">
              <span className="font-serif-luxury text-sm font-bold text-black tracking-tighter">BC</span>
            </div>
          </div>
          <h1 className="text-lg font-serif-luxury font-medium tracking-[0.18em] text-[#E5E5E0] uppercase pt-2">
            BRIGHT CYBER & ICT
          </h1>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] max-w-xs mx-auto">
            Point of Sale & Enterprise Management
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div>
            <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[0.2em] block mb-2">
              Operator Identifier
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                className="w-full pl-9 pr-3 py-2.5 bg-[#141414] border border-[#262626] rounded text-sm text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/40 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[0.2em] block mb-2">
              Security Credential
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-[#141414] border border-[#262626] rounded text-sm text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/40 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#C5A059] cursor-pointer transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.25em] rounded transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] mt-2"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-black" /> Authenticating...
              </>
            ) : (
              'Access Station'
            )}
          </button>
        </form>

        <div className="text-center text-[10px] text-[#555555] uppercase tracking-[0.25em] pt-2">
          Bright Cyber & ICT Centre • Nairobi, Kenya
        </div>
      </div>
    </div>
  );
};
