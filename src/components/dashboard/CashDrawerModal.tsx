import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatKsh } from '../../lib/utils';
import { CashDrawerSession } from '../../types';
import {
  Vault,
  X,
  CheckCircle2,
  AlertTriangle,
  Coins,
  TrendingUp,
  Receipt,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [openingFloat, setOpeningFloat] = useState<string>('10000');
  const [countedCash, setCountedCash] = useState<string>('');
  const [useManualCount, setUseManualCount] = useState<boolean>(false);
  const [cashAdjustment, setCashAdjustment] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState<boolean>(false);

  // Live query data
  const [sessionData, setSessionData] = useState<CashDrawerSession | null>(null);

  // Denomination assistant states
  const [showDenominations, setShowDenominations] = useState<boolean>(false);
  const [denoms, setDenoms] = useState<{ [key: string]: number }>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '1': 0,
  });

  const fetchDrawerData = async (targetDate: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<CashDrawerSession>(`/cash-drawer?date=${targetDate}`);
      setSessionData(data);
      setOpeningFloat(String(data.opening_float ?? 10000));
      setCashAdjustment(String(data.cash_adjustment ?? 0));
      setNotes(data.notes || '');

      if (data.counted_cash_in_hand !== null && data.counted_cash_in_hand !== undefined) {
        setUseManualCount(true);
        setCountedCash(String(data.counted_cash_in_hand));
      } else {
        setUseManualCount(false);
        setCountedCash(String(data.calculated_cash_in_hand));
      }
    } catch (err: any) {
      console.warn('Failed to load cash drawer session:', err);
      setError(err.message || 'Failed to fetch cash drawer state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date().toISOString().split('T')[0];
      setDate(d);
      fetchDrawerData(d);
    }
  }, [isOpen, initialDate]);

  // Compute calculated cash based on inputs
  const parsedFloat = parseFloat(openingFloat) || 0;
  const parsedAdj = parseFloat(cashAdjustment) || 0;
  const cashSales = sessionData?.cash_sales ?? 0;
  const cashExpenses = sessionData?.cash_expenses ?? 0;
  const expectedCash = parsedFloat + cashSales - cashExpenses + parsedAdj;

  const parsedCounted = useManualCount
    ? (parseFloat(countedCash) || 0)
    : expectedCash;

  const variance = useManualCount ? (parsedCounted - expectedCash) : 0;

  // Handle denomination count change
  const handleDenomChange = (val: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10) || 0;
    const updated = { ...denoms, [val]: Math.max(0, qty) };
    setDenoms(updated);

    const total = Object.entries(updated).reduce(
      (sum, [v, count]) => sum + parseInt(v, 10) * Number(count || 0),
      0
    );
    setUseManualCount(true);
    setCountedCash(String(total));
  };

  const handleApplyPresetFloat = (amount: number) => {
    setOpeningFloat(String(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedFloat) || parsedFloat < 0) {
      setError('Opening float must be a valid non-negative number');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.post('/cash-drawer/update', {
        session_date: date,
        opening_float: parsedFloat,
        counted_cash_in_hand: useManualCount ? parsedCounted : null,
        cash_adjustment: parsedAdj,
        status: useManualCount ? 'reconciled' : 'open',
        notes: notes.trim() || null,
        set_as_default_float: setAsDefault,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update cash drawer');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B0F19]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
              <Vault className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Cash Drawer & Register Float
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Adjust daily opening balance float and audit physical cash in hand
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F8FAFC] dark:bg-[#1E293B]/40 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Register Session Date:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  fetchDrawerData(e.target.value);
                }}
                className="px-2.5 py-1 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchDrawerData(date)}
              className="text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>
          </div>

          {/* Section 1: Opening Balance Float */}
          <div className="p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#2563EB]" /> 1. Opening Balance Float (KES)
              </label>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Cash placed in drawer before start of day
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-[#64748B] dark:text-[#94A3B8]">
                KSh
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="10000"
                required
                className="w-full pl-12 pr-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-sm font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] mr-1">
                Quick Presets:
              </span>
              {[2000, 5000, 10000, 15000, 20000, 25000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleApplyPresetFloat(amt)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold transition cursor-pointer ${
                    parsedFloat === amt
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155] hover:border-[#2563EB]'
                  }`}
                >
                  {formatKsh(amt)}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#475569] dark:text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded border-[#CBD5E1] dark:border-[#334155] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span>Save this float amount as default standard for upcoming days</span>
              </label>
            </div>
          </div>

          {/* Section 2: Cash in Hand (Physical Drawer Count) */}
          <div className="p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Vault className="w-3.5 h-3.5 text-emerald-600" /> 2. Cash in Hand (Physical Drawer Count)
              </label>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Actual physical cash audit
              </span>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] dark:bg-[#1E293B] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <button
                type="button"
                onClick={() => {
                  setUseManualCount(false);
                  setCountedCash(String(expectedCash));
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                  !useManualCount
                    ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Auto-Calculate (Expected)
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseManualCount(true);
                  if (!countedCash) setCountedCash(String(expectedCash));
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                  useManualCount
                    ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Physical Count / Audit
              </button>
            </div>

            {useManualCount ? (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-600">
                    KSh
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Enter physical cash in drawer"
                    className="w-full pl-12 pr-28 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCountedCash(String(expectedCash))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-semibold hover:bg-emerald-200 transition cursor-pointer"
                  >
                    Match Expected
                  </button>
                </div>

                {/* Denominations Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDenominations(!showDenominations)}
                    className="text-[#2563EB] dark:text-[#3B82F6] hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" />
                    {showDenominations ? 'Hide Denomination Breakdown' : 'Open Currency Denominations Assistant'}
                  </button>

                  {showDenominations && (
                    <div className="mt-2.5 p-3 bg-[#F8FAFC] dark:bg-[#1E293B]/60 rounded-xl border border-[#E2E8F0] dark:border-[#334155] space-y-2">
                      <div className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                        Count Notes & Coins
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['1000', '500', '200', '100', '50', '20', '10', '5', '1'].map((v) => (
                          <div key={v} className="flex items-center gap-1.5 bg-white dark:bg-[#0F172A] p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
                            <span className="text-[10px] font-mono font-bold w-12 text-[#64748B] dark:text-[#94A3B8]">
                              KSh {v}×
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={denoms[v] || ''}
                              onChange={(e) => handleDenomChange(v, e.target.value)}
                              placeholder="0"
                              className="w-full text-center py-0.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded text-xs font-mono font-semibold text-[#0F172A] dark:text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                    System Expected Drawer Total
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-300">
                    Opening Float + Cash Sales - Cash Payouts
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-[#2563EB] dark:text-[#3B82F6]">
                  {formatKsh(expectedCash)}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Live Real-Time Reconciliation Audit Strip */}
          <div className="p-4 bg-[#F8FAFC] dark:bg-[#0B0F19] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[11px] text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Live Reconciliation Summary
              </span>
              <span className="text-[10px] text-[#94A3B8]">
                {useManualCount ? 'Audited with physical count' : 'Auto-balanced'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Opening Float</div>
                <div className="font-mono font-bold text-[#0F172A] dark:text-white mt-0.5">
                  +{formatKsh(parsedFloat)}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Cash Sales Today</div>
                <div className="font-mono font-bold text-[#2563EB] mt-0.5">
                  +{formatKsh(cashSales)}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Cash Outlays</div>
                <div className="font-mono font-bold text-rose-600 mt-0.5">
                  -{formatKsh(cashExpenses)}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Calculated Expected</div>
                <div className="font-mono font-bold text-[#0F172A] dark:text-white mt-0.5">
                  {formatKsh(expectedCash)}
                </div>
              </div>
            </div>

            {/* Reconciliation / Variance Status Banner */}
            {useManualCount && (
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                variance === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : variance < 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  {variance === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <div>
                    <div className="font-bold text-xs">
                      {variance === 0
                        ? 'Balanced — Exact Register Match'
                        : variance < 0
                        ? `Cash Shortage (Deficit of ${formatKsh(Math.abs(variance))})`
                        : `Cash Surplus (Overage of +${formatKsh(variance)})`}
                    </div>
                    <div className="text-[10px] opacity-80">
                      Counted Cash: {formatKsh(parsedCounted)} vs Expected: {formatKsh(expectedCash)}
                    </div>
                  </div>
                </div>

                <div className="text-sm font-mono font-bold">
                  {variance > 0 ? `+${formatKsh(variance)}` : formatKsh(variance)}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Notes / Audit Memo */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#64748B]" /> Shift / Audit Memo (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shift 1 morning float verified. Midday audit matched."
              className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Update Register'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
