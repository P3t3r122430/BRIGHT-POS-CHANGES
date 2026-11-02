import React from 'react';
import { DashboardStats } from '../../types';
import { formatKsh, formatNumber } from '../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface KPIGridProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ stats, loading }) => {
  const kpis = stats?.kpis;
  const comparisonLabel = stats?.dateRange?.comparisonLabel || 'vs previous';

  const totalSales = kpis?.totalSales ?? kpis?.totalRevenue ?? 0;
  const totalProfit = kpis?.totalProfit ?? kpis?.grossProfit ?? 0;
  const totalTransactions = kpis?.totalTransactions ?? kpis?.transactionCount ?? 0;
  const newCustomers = kpis?.newCustomers ?? 0;
  const totalCustomers = kpis?.totalCustomers ?? 0;

  const salesTrend = kpis?.salesTrend || { percentage: 0, isUp: true, text: '—' };
  const profitTrend = kpis?.profitTrend || { percentage: 0, isUp: true, text: '—' };
  const transactionsTrend = kpis?.transactionsTrend || { percentage: 0, isUp: true, text: '—' };
  const customersTrend = kpis?.customersTrend || { percentage: 0, isUp: true, text: '—' };

  const avgTicket = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;
  const profitMargin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 1000) / 10 : 0;

  const cards = [
    {
      id: 'kpi-total-sales',
      title: 'Total Sales',
      value: formatKsh(totalSales),
      trend: salesTrend,
      icon: DollarSign,
      iconBg: 'bg-[#2563EB]/10 text-[#2563EB]',
      subtext: `${formatNumber(totalTransactions)} orders • Avg ${formatKsh(avgTicket)}`,
    },
    {
      id: 'kpi-total-profit',
      title: 'Total Profit',
      value: formatKsh(totalProfit),
      trend: profitTrend,
      icon: TrendingUp,
      iconBg: 'bg-[#10B981]/10 text-[#10B981]',
      subtext: `Margin yield: ${profitMargin}% of gross revenue`,
    },
    {
      id: 'kpi-total-transactions',
      title: 'Transactions',
      value: formatNumber(totalTransactions),
      trend: transactionsTrend,
      icon: Receipt,
      iconBg: 'bg-[#3B82F6]/10 text-[#3B82F6]',
      subtext: `Completed settlements across all registers`,
    },
    {
      id: 'kpi-total-customers',
      title: 'Customers',
      value: formatNumber(totalCustomers > 0 ? totalCustomers : newCustomers),
      trend: customersTrend,
      icon: Users,
      iconBg: 'bg-[#64748B]/10 text-[#64748B]',
      subtext: `${formatNumber(newCustomers)} new accounts registered this period`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isTrendUp = card.trend.isUp;
        const hasTrend = card.trend.percentage > 0;

        return (
          <div
            key={card.id}
            id={card.id}
            className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs hover:border-[#CBD5E1] dark:hover:border-[#334155] transition-all flex flex-col justify-between"
          >
            <div>
              {/* Top Row: Title + Icon */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  {card.title}
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Middle Row: Main Metric Value */}
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                  {loading ? (
                    <span className="inline-block w-24 h-7 bg-[#E2E8F0] dark:bg-[#1E293B] animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Trend Badge & Subtext */}
            <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {hasTrend ? (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${
                      isTrendUp
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }`}
                  >
                    {isTrendUp ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {card.trend.percentage.toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#94A3B8] px-1.5 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E293B]">
                    <Minus className="w-3 h-3" /> 0.0%
                  </span>
                )}
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                  {comparisonLabel}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
