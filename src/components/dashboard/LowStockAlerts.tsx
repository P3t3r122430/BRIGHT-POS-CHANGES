import React from 'react';
import { LowStockProductItem } from '../../types';
import { formatKsh } from '../../lib/utils';
import { AlertTriangle, PackageX, Warehouse, ArrowRight } from 'lucide-react';

interface LowStockAlertsProps {
  products: LowStockProductItem[];
  onNavigate: (tab: string) => void;
  loading: boolean;
}

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({
  products,
  onNavigate,
  loading,
}) => {
  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] dark:border-[#1E293B]">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> Low Stock Alerts
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Items below reorder thresholds needing restock
          </p>
        </div>

        <button
          onClick={() => onNavigate('inventory')}
          className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition cursor-pointer"
        >
          Stock Manager <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product List */}
      <div className="my-2 space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">
            Loading stock status...
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#10B981] flex flex-col items-center gap-1">
            <Warehouse className="w-6 h-6 text-[#10B981]" />
            <span>All inventory items are healthy and adequately stocked!</span>
          </div>
        ) : (
          products.map((item) => {
            const isOutOfStock = item.stock_quantity <= 0;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1] dark:hover:border-[#334155] transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] bg-white dark:bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#E2E8F0] dark:border-[#334155]">
                      {item.sku}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 flex items-center gap-2">
                    <span>{item.category_name}</span>
                    <span>•</span>
                    <span className="font-mono">{formatKsh(item.selling_price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold font-mono ${
                        isOutOfStock ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                      }`}
                    >
                      {item.stock_quantity} {item.unit}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      Min: {item.minimum_stock}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isOutOfStock
                        ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                    }`}
                  >
                    {isOutOfStock ? 'Empty' : 'Low'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
        <span>{products.length} products flagged</span>
        <button
          onClick={() => onNavigate('inventory')}
          className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
        >
          Reorder & Restock &rarr;
        </button>
      </div>
    </div>
  );
};
