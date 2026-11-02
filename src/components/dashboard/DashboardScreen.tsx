import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardStats } from '../../types';
import { api } from '../../lib/api';
import { KPIGrid } from './KPIGrid';
import { SalesChart } from './SalesChart';
import { QuickActions } from './QuickActions';
import { RecentTransactionsTable } from './RecentTransactionsTable';
import { LowStockAlerts } from './LowStockAlerts';
import { PaymentMethodChart } from './PaymentMethodChart';
import { FinancialSummaryStrip } from './FinancialSummaryStrip';
import {
  RotateCcw,
  Calendar,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';

interface DashboardScreenProps {
  onNavigate: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user, settings } = useAuth();
  const [filter, setFilter] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      let url = `/dashboard/stats?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&start_date=${customStart}&end_date=${customEnd}`;
      }
      const data = await api.get<DashboardStats>(url);
      setStats(data);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to fetch dashboard statistics:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [filter, customStart, customEnd]);

  const dateFilterOptions = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC] dark:bg-[#020617] text-[#0F172A] dark:text-[#F8FAFC] space-y-5 custom-scrollbar min-h-screen">
      {/* 1. Top Header & Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-[#2563EB]" /> POS Dashboard
            </h1>
            <span className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Live Station
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Welcome back, <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{user?.name || 'Operator'}</strong> • {settings?.business_name || 'Bright Cyber & ICT Centre'}
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-[#0F172A] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs text-xs">
            {dateFilterOptions.map((opt) => (
              <button
                key={opt.id}
                id={`filter-btn-${opt.id}`}
                onClick={() => {
                  setFilter(opt.id);
                  setShowCustomPicker(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === opt.id
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                filter === 'custom'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDashboardStats}
            title="Refresh Metrics"
            className="p-2 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] rounded-xl transition cursor-pointer shadow-xs"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
          </button>

          {/* Direct Checkout Shortcut Button */}
          <button
            onClick={() => onNavigate('pos')}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> New Sale (F2)
          </button>
        </div>
      </div>

      {/* Custom Date Range Popover / Bar */}
      {showCustomPicker && (
        <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-3.5 rounded-xl shadow-xs flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC]"
            />
          </div>

          <button
            onClick={() => {
              if (customStart && customEnd) {
                setFilter('custom');
              }
            }}
            className="bg-[#2563EB] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#1D4ED8] transition cursor-pointer"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* 2. KPI Cards Grid */}
      <KPIGrid stats={stats} loading={loading} />

      {/* 3. Financial Summary Strip */}
      <FinancialSummaryStrip
        summary={stats?.financialSummary}
        onNavigate={onNavigate}
        loading={loading}
        onRefresh={fetchDashboardStats}
      />

      {/* 4. Quick Actions Panel */}
      <QuickActions onNavigate={onNavigate} />

      {/* 5. Main Content Grid: Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Sales Overview Chart */}
        <div className="lg:col-span-2">
          <SalesChart
            timeline={stats?.salesTimeline}
            activeFilter={filter}
            onFilterChange={setFilter}
            loading={loading}
          />
        </div>

        {/* Right 1 Col: Payment Method Distribution */}
        <div className="lg:col-span-1">
          <PaymentMethodChart
            methods={stats?.paymentMethods || []}
            totalSales={stats?.kpis?.totalSales ?? stats?.kpis?.totalRevenue ?? 0}
            loading={loading}
          />
        </div>
      </div>

      {/* 6. Secondary Grid: Recent Transactions & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Transactions Table */}
        <RecentTransactionsTable
          transactions={stats?.recentTransactions || []}
          onNavigate={onNavigate}
          loading={loading}
        />

        {/* Low Stock Alerts */}
        <LowStockAlerts
          products={stats?.lowStockProducts || []}
          onNavigate={onNavigate}
          loading={loading}
        />
      </div>
    </div>
  );
};
