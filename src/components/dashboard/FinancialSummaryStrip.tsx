import React, { useState } from 'react';
import { FinancialSummaryData } from '../../types';
import { formatKsh } from '../../lib/utils';
import { CashDrawerModal } from './CashDrawerModal';
import {
  Vault,
  TrendingUp,
  Receipt,
  Wallet,
  Coins,
  ArrowRight,
  Edit3,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface FinancialSummaryStripProps {
  summary: FinancialSummaryData | undefined;
  onNavigate: (tab: string) => void;
  loading: boolean;
  onRefresh?: () => void;
}

export const FinancialSummaryStrip: React.FC<FinancialSummaryStripProps> = ({
  summary,
  onNavigate,
  loading,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const openingBalance = summary?.openingBalance ?? 10000;
  const todaySales = summary?.todaySales ?? 0;
  const todayProfit = summary?.todayProfit ?? 0;
  const todayExpenses = summary?.todayExpenses ?? 0;
  const cashInHand = summary?.cashInHand ?? (openingBalance + (summary?.cashSales ?? 0) - todayExpenses);
  const isAudited = summary?.isAudited ?? false;
  const variance = summary?.variance ?? 0;

  return (
    <>
      <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9] dark:border-[#1E293B] mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs">
              <Vault className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                Cash Drawer & Financial Summary
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Daily register reconciliation, opening float, and physical cash audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-edit-drawer-float"
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#3B82F6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-[#2563EB]/20"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Float & Cash in Hand
            </button>

            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center gap-1 transition cursor-pointer self-start md:self-auto ml-1"
            >
              Expenses <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Opening Balance (Float) - Clickable to edit */}
          <div
            onClick={() => setModalOpen(true)}
            className="group relative bg-[#F8FAFC] dark:bg-[#1E293B]/60 hover:bg-blue-50/50 dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB]/40 p-3.5 rounded-xl flex flex-col justify-between transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Opening Balance (Float)
              </span>
              <div className="flex items-center gap-1">
                <Vault className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#2563EB] transition" />
              </div>
            </div>
            <div className="mt-2 text-lg font-bold font-mono tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {loading ? '...' : formatKsh(openingBalance)}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 flex items-center justify-between">
              <span className="text-[#2563EB] dark:text-[#3B82F6] font-medium flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" /> Click to edit float
              </span>
            </div>
          </div>

          {/* 2. Today's Sales */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#1E293B] p-3.5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Today's Sales
              </span>
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="mt-2 text-lg font-bold font-mono tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {loading ? '...' : formatKsh(todaySales)}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Gross Sales</span>
            </div>
          </div>

          {/* 3. Today's Profit */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#1E293B] p-3.5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Today's Profit
              </span>
              <Coins className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="mt-2 text-lg font-bold font-mono tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {loading ? '...' : formatKsh(todayProfit)}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Net Margin</span>
            </div>
          </div>

          {/* 4. Today's Expenses */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#1E293B] p-3.5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Today's Expenses
              </span>
              <Receipt className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div className="mt-2 text-lg font-bold font-mono tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {loading ? '...' : formatKsh(todayExpenses)}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 flex items-center justify-between">
              <span>Disbursements</span>
            </div>
          </div>

          {/* 5. Cash in Hand (Drawer) - Clickable to edit / audit */}
          <div
            onClick={() => setModalOpen(true)}
            className="group relative bg-[#2563EB] hover:bg-[#1D4ED8] text-white p-3.5 rounded-xl shadow-xs flex flex-col justify-between transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                Cash in Hand (Drawer)
              </span>
              <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white group-hover:bg-white/30 transition">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-2 text-xl font-bold font-mono tracking-tight text-white flex items-baseline justify-between">
              <span>{loading ? '...' : formatKsh(cashInHand)}</span>
              {isAudited && (
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">
                  Audited
                </span>
              )}
            </div>

            <div className="text-[10px] text-blue-100 mt-1 flex items-center justify-between">
              <span>
                {isAudited
                  ? variance === 0
                    ? 'Physical Count (Exact)'
                    : variance < 0
                    ? `Shortage: -${formatKsh(Math.abs(variance))}`
                    : `Surplus: +${formatKsh(variance)}`
                  : 'Float + Cash Sales - Payouts'}
              </span>
              <span className="underline opacity-90 text-[10px]">Edit</span>
            </div>
          </div>
        </div>
      </div>

      <CashDrawerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        initialDate={summary?.sessionDate}
      />
    </>
  );
};

