import React, { useState } from 'react';
import { TimelinePoint } from '../../types';
import { formatKsh, formatNumber } from '../../lib/utils';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface SalesChartProps {
  timeline: TimelinePoint[] | undefined;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  loading: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  timeline = [],
  activeFilter,
  onFilterChange,
  loading,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'sales' | 'profit'>('sales');

  const maxVal = Math.max(...timeline.map((item) => (viewMode === 'sales' ? item.sales : item.profit)), 100);
  const totalVolume = timeline.reduce((sum, item) => sum + (viewMode === 'sales' ? item.sales : item.profit), 0);
  const totalTx = timeline.reduce((sum, item) => sum + item.transactions, 0);

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Sales Overview
            </h3>
            <span className="text-[11px] font-medium bg-[#2563EB]/10 text-[#2563EB] px-2 py-0.5 rounded-md">
              {viewMode === 'sales' ? 'Revenue Timeline' : 'Gross Margin'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Total {viewMode === 'sales' ? 'Sales' : 'Profit'}: <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{formatKsh(totalVolume)}</strong> across {formatNumber(totalTx)} transactions
          </p>
        </div>

        {/* View Mode Toggle (Sales vs Profit) & Timeline Granularity */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F1F5F9] dark:bg-[#1E293B] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('sales')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'sales'
                  ? 'bg-white dark:bg-[#2563EB] text-[#2563EB] dark:text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A]'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setViewMode('profit')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'profit'
                  ? 'bg-white dark:bg-[#10B981] text-[#10B981] dark:text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A]'
              }`}
            >
              Profit
            </button>
          </div>
        </div>
      </div>

      {/* Chart Visualization Area */}
      <div className="py-6 flex-1 flex flex-col justify-end min-h-[220px]">
        {loading ? (
          <div className="h-44 w-full bg-[#F1F5F9] dark:bg-[#1E293B] animate-pulse rounded-lg flex items-center justify-center text-xs text-[#94A3B8]">
            Loading sales timeline...
          </div>
        ) : timeline.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#94A3B8]">
            No sales transactions found in this period.
          </div>
        ) : (
          <div className="w-full">
            {/* Bars container */}
            <div className="grid gap-2 sm:gap-4 items-end h-44 pt-6 px-2" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}>
              {timeline.map((point, idx) => {
                const currentVal = viewMode === 'sales' ? point.sales : point.profit;
                const heightPct = Math.max(8, Math.round((currentVal / maxVal) * 100));
                const isHovered = hoveredIdx === idx;
                const isHighest = currentVal === maxVal && currentVal > 0;

                return (
                  <div
                    key={idx}
                    className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-[#0F172A] text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 border border-[#334155]">
                        <div className="font-semibold">{point.label}</div>
                        <div className="text-[#38BDF8] font-mono">{formatKsh(currentVal)}</div>
                        <div className="text-[10px] text-[#94A3B8]">{point.transactions} orders</div>
                      </div>
                    )}

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[48px] bg-[#F1F5F9] dark:bg-[#1E293B] rounded-t-md h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          viewMode === 'sales'
                            ? isHighest
                              ? 'bg-[#2563EB]'
                              : isHovered
                              ? 'bg-[#3B82F6]'
                              : 'bg-[#60A5FA] dark:bg-[#2563EB]/80'
                            : isHighest
                            ? 'bg-[#10B981]'
                            : isHovered
                            ? 'bg-[#34D399]'
                            : 'bg-[#6EE7B7] dark:bg-[#10B981]/80'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] mt-2 truncate w-full text-center">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <span>Active Period Revenue Trend</span>
        </div>
        <span className="font-mono text-[11px]">Updated live</span>
      </div>
    </div>
  );
};
