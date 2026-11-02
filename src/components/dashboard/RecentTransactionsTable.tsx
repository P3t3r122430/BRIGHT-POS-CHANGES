import React from 'react';
import { Sale } from '../../types';
import { formatKsh } from '../../lib/utils';
import { Receipt, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface RecentTransactionsTableProps {
  transactions: Sale[];
  onNavigate: (tab: string) => void;
  loading: boolean;
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  transactions,
  onNavigate,
  loading,
}) => {
  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] dark:border-[#1E293B]">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#2563EB]" /> Recent Transactions
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Real-time receipt stream from active checkouts
          </p>
        </div>

        <button
          onClick={() => onNavigate('transactions')}
          className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition cursor-pointer"
        >
          View All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto my-2">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] border-b border-[#F1F5F9] dark:border-[#1E293B]">
              <th className="py-2.5 px-2">Receipt #</th>
              <th className="py-2.5 px-2">Customer</th>
              <th className="py-2.5 px-2">Method</th>
              <th className="py-2.5 px-2">Date/Time</th>
              <th className="py-2.5 px-2 text-right">Amount</th>
              <th className="py-2.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-[#94A3B8]">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-[#94A3B8]">
                  No recent transactions recorded today.
                </td>
              </tr>
            ) : (
              transactions.map((sale) => {
                const isCompleted = sale.status === 'completed';
                const isVoided = sale.status === 'voided';

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/50 transition-colors"
                  >
                    <td className="py-2.5 px-2 font-mono font-semibold text-[#2563EB] whitespace-nowrap">
                      {sale.receipt_number}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-[140px]">
                      {sale.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-2.5 px-2 text-[#64748B] dark:text-[#94A3B8] capitalize whitespace-nowrap">
                      {sale.payment_methods || 'Cash'}
                    </td>
                    <td className="py-2.5 px-2 text-[#64748B] dark:text-[#94A3B8] font-mono text-[11px] whitespace-nowrap">
                      {sale.created_at ? (
                        <>
                          {new Date(sale.created_at).toLocaleTimeString('en-KE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">
                      {formatKsh(sale.total)}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          isCompleted
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : isVoided
                            ? 'bg-[#EF4444]/10 text-[#EF4444]'
                            : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {isVoided && <XCircle className="w-2.5 h-2.5" />}
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
        <span>Showing latest {transactions.length} sales</span>
        <button
          onClick={() => onNavigate('pos')}
          className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
        >
          Open Cashier Register (F2) &rarr;
        </button>
      </div>
    </div>
  );
};
