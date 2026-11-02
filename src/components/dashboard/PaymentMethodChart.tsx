import React from 'react';
import { PaymentMethodStat } from '../../types';
import { formatKsh } from '../../lib/utils';
import { CreditCard, Smartphone, Banknote, HelpCircle } from 'lucide-react';

interface PaymentMethodChartProps {
  methods: PaymentMethodStat[];
  totalSales: number;
  loading: boolean;
}

export const PaymentMethodChart: React.FC<PaymentMethodChartProps> = ({
  methods = [],
  totalSales,
  loading,
}) => {
  const getIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'cash':
        return Banknote;
      case 'mpesa':
        return Smartphone;
      case 'card':
        return CreditCard;
      default:
        return HelpCircle;
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-4 border-b border-[#F1F5F9] dark:border-[#1E293B]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          Payment Methods
        </h3>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Settlement breakdown across tender types
        </p>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div className="my-4">
        {loading ? (
          <div className="h-3 w-full bg-[#F1F5F9] dark:bg-[#1E293B] animate-pulse rounded-full" />
        ) : methods.length === 0 ? (
          <div className="text-xs text-[#94A3B8] text-center py-4">No settlements recorded</div>
        ) : (
          <div className="space-y-4">
            {/* Horizontal Segment Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#F1F5F9] dark:bg-[#1E293B]">
              {methods.map((method, idx) => (
                <div
                  key={idx}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.max(method.percentage, 2)}%`,
                    backgroundColor: method.color,
                  }}
                  title={`${method.name}: ${method.percentage}% (${formatKsh(method.amount)})`}
                />
              ))}
            </div>

            {/* List breakdown */}
            <div className="space-y-2.5">
              {methods.map((method, idx) => {
                const Icon = getIcon(method.key);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#1E293B]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: method.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          {method.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {method.percentage}% share
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {formatKsh(method.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
        <span>Gross Settled:</span>
        <span className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          {formatKsh(totalSales)}
        </span>
      </div>
    </div>
  );
};
