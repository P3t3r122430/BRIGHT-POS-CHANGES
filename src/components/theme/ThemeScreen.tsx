import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Moon,
  Sun,
  Palette,
  CheckCircle2,
  Monitor,
  Sparkles,
  Smartphone,
  Eye,
  Check
} from 'lucide-react';

export const ThemeScreen: React.FC = () => {
  const { theme, isDark, isLight, setTheme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#0F172A] dark:text-[#F8FAFC] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-[#2563EB]" /> Display & Theme Preferences
          </h2>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.2em] mt-1">
            Toggle between Crisp Modern Light Mode and Obsidian Navy Dark Mode
          </p>
        </div>

        {/* Quick Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-theme-mode"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs tracking-wider uppercase shadow-sm transition cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5" /> Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" /> Switch to Dark Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Theme Selection Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-serif-luxury font-semibold text-[#2563EB] uppercase tracking-[0.18em]">
          Select Operating Visual Theme
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Crisp Light Mode Card */}
          <div
            id="card-theme-light"
            onClick={() => setTheme('light')}
            className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              isLight
                ? 'border-[#2563EB] bg-[#FFFFFF] shadow-md ring-2 ring-[#2563EB]/20 text-[#0F172A]'
                : 'border-[#E2E8F0] dark:border-[#1E293B] bg-[#FFFFFF] dark:bg-[#0F172A] hover:border-[#94A3B8] opacity-80'
            }`}
          >
            {isLight && (
              <div className="absolute top-3 right-3 bg-[#2563EB] text-white p-1 rounded-full shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-luxury text-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                    Crisp Light Mode (Recommended)
                  </h4>
                  <span className="text-[10px] tracking-widest uppercase text-[#64748B] dark:text-[#94A3B8]">
                    Clean Navy & Royal Blue Visual Hierarchy
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed mb-4 text-[#64748B] dark:text-[#94A3B8]">
                Modern crisp surfaces (#F8FAFC / #FFFFFF), deep navy sidebar (#0F172A), sharp slate text (#0F172A), and vibrant primary blue (#2563EB) accents.
                Optimal contrast for daylight counters and retail environments.
              </p>

              {/* Theme Mockup Mini Preview */}
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2 text-xs text-[#0F172A]">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <span className="text-[10px] text-[#2563EB] font-mono font-semibold uppercase">PREVIEW: POS CARD</span>
                  <span className="text-[10px] text-[#64748B] font-mono">KES 30.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A] text-xs font-semibold">Colour Printing (A4)</span>
                  <span className="px-2 py-0.5 bg-[#2563EB] text-white font-bold text-[10px] rounded">ADD</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span>Status: {isLight ? 'Active Default' : 'Inactive'}</span>
              <span className="font-medium text-[11px] uppercase tracking-wider text-[#2563EB]">
                {isLight ? 'Currently Active' : 'Click to Enable'}
              </span>
            </div>
          </div>

          {/* Obsidian Dark Mode Card */}
          <div
            id="card-theme-dark"
            onClick={() => setTheme('dark')}
            className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              isDark
                ? 'border-[#2563EB] bg-[#0F172A] shadow-md ring-2 ring-[#2563EB]/40 text-[#F8FAFC]'
                : 'border-[#E2E8F0] dark:border-[#1E293B] bg-[#FFFFFF] dark:bg-[#0F172A] hover:border-[#94A3B8] opacity-80'
            }`}
          >
            {isDark && (
              <div className="absolute top-3 right-3 bg-[#2563EB] text-white p-1 rounded-full shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#3B82F6] shadow-inner">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-luxury text-sm font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                    Obsidian Navy Dark Mode
                  </h4>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] tracking-widest uppercase">
                    Night & High-Contrast Cyber Operation
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed mb-4">
                Deep navy tones (#0B0F19 / #0F172A), crisp slate text (#F8FAFC), and vibrant royal blue highlights.
                Minimizes eye strain during prolonged screen time.
              </p>

              {/* Theme Mockup Mini Preview */}
              <div className="p-3 bg-[#0B0F19] border border-[#1E293B] rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1E293B]">
                  <span className="text-[10px] text-[#3B82F6] font-mono font-semibold uppercase">PREVIEW: POS CARD</span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">KES 30.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium">Colour Printing (A4)</span>
                  <span className="px-2 py-0.5 bg-[#2563EB] text-white font-bold text-[10px] rounded">ADD</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span>Status: {isDark ? 'Active' : 'Inactive'}</span>
              <span className="text-[#2563EB] font-medium text-[11px] uppercase tracking-wider">
                {isDark ? 'Currently Active' : 'Click to Enable'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Feature Details Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-serif-luxury font-semibold text-xs text-[#2563EB] uppercase tracking-[0.18em] flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-[#2563EB]" /> Smart Display Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg space-y-1.5">
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> Persistent Storage
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Your theme choice is stored locally in your browser so each terminal remembers its preferred mode across restarts.
            </p>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg space-y-1.5">
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> 1-Click Navbar Toggle
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              You can also click the Sun/Moon icon in the top navigation bar anytime to quickly flip themes without leaving your current sale.
            </p>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg space-y-1.5">
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> Thermal Print Optimized
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Receipt generation and thermal print outputs remain crystal-clear high-contrast monochrome regardless of screen mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
