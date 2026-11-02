import React from 'react';
import { DashboardStats } from '../../types';
import { formatKsh, formatNumber } from '../../lib/utils';
import {
  TrendingUp,
  Receipt,
  RotateCcw,
  Percent,
  Package,
  Layers,
  UserCheck,
  Award,
  DollarSign,
  AlertOctagon,
  ArrowRight,
  Sparkles,
  Wallet,
  Smartphone,
  CreditCard,
  Banknote
} from 'lucide-react';

interface DailyFinancialSummaryProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export const DailyFinancialSummary: React.FC<DailyFinancialSummaryProps> = ({ stats, loading, onNavigate }) => {
  const kpis: any = stats?.kpis || {};
  const top = stats?.topPerformers;
  const filterLabel = stats?.dateRange?.filter ? stats.dateRange.filter.toUpperCase() : 'TODAY';

  const grossSales = kpis.grossSales ?? kpis.totalRevenue ?? 0;
  const discounts = kpis.discounts ?? kpis.totalDiscount ?? 0;
  const refundTotal = kpis.refundTotal ?? 0;
  const refundCount = kpis.refundCount ?? 0;
  const voidedCount = kpis.voidedCount ?? 0;
  const netSales = kpis.netSales ?? Math.max(0, grossSales - discounts - refundTotal);
  const cogs = kpis.costOfGoods ?? kpis.cogs ?? 0;
  const grossProfit = kpis.grossProfit ?? (netSales - cogs);
  const totalExpenses = kpis.totalExpenses ?? 0;
  const netProfit = kpis.netProfit ?? (grossProfit - totalExpenses);
  const avgTx = kpis.averageTransactionValue ?? (kpis.totalTransactions > 0 ? grossSales / kpis.totalTransactions : 0);
  const netCashPos = kpis.netCashPosition ?? stats?.financialSummary?.expectedCashInHand ?? 0;

  const cashSales = kpis.cashTotal ?? 0;
  const mpesaSales = kpis.mpesaTotal ?? 0;
  const cardSales = kpis.cardTotal ?? 0;
  const otherSales = kpis.otherTotal ?? 0;

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9] dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 dark:bg-[#3B82F6]/20 text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center font-bold text-xs">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              Daily Financial Dashboard Overview
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold tracking-normal">
                {filterLabel}
              </span>
            </h2>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Consolidated sales, discounts, refunds, cost of goods (COGS), gross profit, and net cash position
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('reports')}
          className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#3B82F6] flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
        >
          View Full Financial Audits <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 1: The Core Financial Flow (Gross -> Discounts -> Refunds -> Net Sales -> COGS -> Gross Profit) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Gross Sales */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Gross Sales
          </div>
          <div className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
            {loading ? '...' : formatKsh(grossSales)}
          </div>
          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {formatNumber(kpis.totalTransactions || 0)} transactions
          </div>
        </div>

        {/* Discounts */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
            Discounts
          </div>
          <div className="text-lg font-bold font-mono text-[#F59E0B] mt-1">
            {loading ? '...' : `-${formatKsh(discounts)}`}
          </div>
          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Deductions granted
          </div>
        </div>

        {/* Refunds */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#EF4444]">
            Refunds ({refundCount})
          </div>
          <div className="text-lg font-bold font-mono text-[#EF4444] mt-1">
            {loading ? '...' : `-${formatKsh(refundTotal)}`}
          </div>
          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {voidedCount > 0 ? `${voidedCount} voided` : 'Reversals processed'}
          </div>
        </div>

        {/* Net Sales */}
        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#3B82F6]">
            Net Sales
          </div>
          <div className="text-lg font-bold font-mono text-[#2563EB] dark:text-[#3B82F6] mt-1">
            {loading ? '...' : formatKsh(netSales)}
          </div>
          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Realized revenue
          </div>
        </div>

        {/* Cost of Goods (COGS) */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Cost of Goods (COGS)
          </div>
          <div className="text-lg font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
            {loading ? '...' : formatKsh(cogs)}
          </div>
          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Direct inventory cost
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
            Gross Profit
          </div>
          <div className="text-lg font-bold font-mono text-[#10B981] mt-1">
            {loading ? '...' : formatKsh(grossProfit)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
            {netSales > 0 ? `${((grossProfit / netSales) * 100).toFixed(1)}% margin` : '0%'}
          </div>
        </div>
      </div>

      {/* Row 2: Payment Methods & Cash Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Cash Sales */}
        <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Cash Sales
            </div>
            <div className="text-base font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              {loading ? '...' : formatKsh(cashSales)}
            </div>
          </div>
        </div>

        {/* M-Pesa Sales */}
        <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> M-Pesa Sales
            </div>
            <div className="text-base font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              {loading ? '...' : formatKsh(mpesaSales)}
            </div>
          </div>
        </div>

        {/* Card Sales */}
        <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Card Sales
            </div>
            <div className="text-base font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              {loading ? '...' : formatKsh(cardSales)}
            </div>
          </div>
        </div>

        {/* Other / Expenses */}
        <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-500" /> Operating Expenses
            </div>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {loading ? '...' : formatKsh(totalExpenses)}
            </div>
          </div>
        </div>

        {/* Net Cash Position */}
        <div className="p-3.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-600 text-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-white" /> Net Cash Position
            </div>
            <div className="text-base font-bold font-mono text-white mt-1">
              {loading ? '...' : formatKsh(netCashPos)}
            </div>
            <div className="text-[9px] text-blue-100 mt-0.5">
              Opening float + cash in - out
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Performers & Extra Metrics (Avg Tx, Best Sellers, Top Cashier & Customer) */}
      <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Top Performers & Trading Velocity
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Average Transaction Value */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/40 border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase">
              Avg Transaction Value
            </div>
            <div className="text-base font-bold font-mono text-[#0F172A] dark:text-[#F8FAFC] mt-1">
              {loading ? '...' : formatKsh(avgTx)}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Per settled ticket
            </div>
          </div>

          {/* Best-selling Product */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/40 border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase flex items-center gap-1">
              <Package className="w-3 h-3 text-[#2563EB]" /> Best-Selling Product
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 truncate" title={top?.bestSellingProduct?.name || 'None'}>
              {top?.bestSellingProduct ? top.bestSellingProduct.name : 'No merchandise sold'}
            </div>
            <div className="text-[10px] text-[#2563EB] dark:text-[#3B82F6] font-medium mt-0.5">
              {top?.bestSellingProduct ? `${top.bestSellingProduct.quantity_sold} sold (${formatKsh(top.bestSellingProduct.total_revenue)})` : '—'}
            </div>
          </div>

          {/* Best-selling Service */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/40 border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#10B981]" /> Best-Selling Service
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 truncate" title={top?.bestSellingService?.name || 'None'}>
              {top?.bestSellingService ? top.bestSellingService.name : 'No service rendered'}
            </div>
            <div className="text-[10px] text-[#10B981] font-medium mt-0.5">
              {top?.bestSellingService ? `${top.bestSellingService.count} jobs (${formatKsh(top.bestSellingService.total_revenue)})` : '—'}
            </div>
          </div>

          {/* Top Cashier */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/40 border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-indigo-500" /> Top Cashier
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 truncate">
              {top?.topCashier ? top.topCashier.name : 'No cashier active'}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
              {top?.topCashier ? `${top.topCashier.transactions_count} orders (${formatKsh(top.topCashier.total_sales)})` : '—'}
            </div>
          </div>

          {/* Top Customer */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/40 border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-500" /> Top Customer
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 truncate">
              {top?.topCustomer ? top.topCustomer.name : 'Walk-in Clients'}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {top?.topCustomer ? `${top.topCustomer.transactions_count} orders (${formatKsh(top.topCustomer.total_spend)})` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
