import React from 'react';
import {
  ShoppingCart,
  PackagePlus,
  UserPlus,
  Receipt,
  Wallet,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions = [
    {
      id: 'quick-action-new-sale',
      label: 'New Sale',
      desc: 'Launch checkout register',
      tab: 'pos',
      icon: ShoppingCart,
      primary: true,
      badge: 'F2',
      color: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white',
      iconColor: 'text-white',
    },
    {
      id: 'quick-action-add-product',
      label: 'Add Product',
      desc: 'Catalog & barcodes',
      tab: 'products',
      icon: PackagePlus,
      primary: false,
      color: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]',
      iconColor: 'text-[#2563EB]',
    },
    {
      id: 'quick-action-new-customer',
      label: 'New Customer',
      desc: 'Add client profile',
      tab: 'customers',
      icon: UserPlus,
      primary: false,
      color: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]',
      iconColor: 'text-[#10B981]',
    },
    {
      id: 'quick-action-expenses',
      label: 'Record Expense',
      desc: 'Log operational costs',
      tab: 'expenses',
      icon: Wallet,
      primary: false,
      color: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]',
      iconColor: 'text-[#EF4444]',
    },
    {
      id: 'quick-action-reports',
      label: 'Reports & P&L',
      desc: 'Financial breakdown',
      tab: 'reports',
      icon: TrendingUp,
      primary: false,
      color: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]',
      iconColor: 'text-[#3B82F6]',
    },
    {
      id: 'quick-action-transactions',
      label: 'Sales Receipts',
      desc: 'Review past tickets',
      tab: 'transactions',
      icon: Receipt,
      primary: false,
      color: 'bg-white dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B]',
      iconColor: 'text-[#F59E0B]',
    },
  ];

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] dark:border-[#1E293B] mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Quick Actions
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Frequently accessed cashier and manager tools
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              id={action.id}
              onClick={() => onNavigate(action.tab)}
              className={`p-3.5 rounded-xl transition-all flex flex-col items-start justify-between text-left group cursor-pointer shadow-xs ${action.color}`}
            >
              <div className="w-full flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    action.primary
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F1F5F9] dark:bg-[#1E293B]'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${action.primary ? 'text-white' : action.iconColor}`} />
                </div>
                {action.badge && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                    {action.badge}
                  </span>
                )}
              </div>

              <div>
                <div className="font-semibold text-xs leading-tight flex items-center gap-1">
                  <span>{action.label}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                </div>
                <div
                  className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${
                    action.primary ? 'text-white/80' : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  {action.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
