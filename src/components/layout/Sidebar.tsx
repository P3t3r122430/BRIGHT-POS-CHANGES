import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ShoppingCart,
  LayoutDashboard,
  Printer,
  Package,
  Warehouse,
  Receipt,
  Users,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Settings,
  History,
  Database,
  ChevronRight,
  Palette,
  PanelLeftClose,
  PanelLeft,
  Pin,
  PinOff,
  Tag
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  cartCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, cartCount = 0 }) => {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();

  // State: Hover expands sidebar, navigating collapses it back
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // The sidebar is expanded if hovered, pinned, or explicitly opened
  const isExpanded = isPinned || isHovered;

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    // Auto-collapse immediately after navigation unless explicitly pinned
    if (!isPinned) {
      setIsHovered(false);
      // Remove active focus so it doesn't stay expanded from focus
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const operationsItems = [
    {
      id: 'pos',
      label: 'New Sale / POS',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : null,
      adminOnly: false,
      shortcut: 'F2',
      highlight: true,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: 'products',
      label: 'Physical Products',
      icon: Package,
      adminOnly: false,
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Warehouse,
      adminOnly: false,
    },
    {
      id: 'services',
      label: 'Cyber & ICT Services',
      icon: Printer,
      adminOnly: false,
    },
    {
      id: 'discounts',
      label: 'Discounts & Promo',
      icon: Tag,
      adminOnly: false,
    },
    {
      id: 'transactions',
      label: 'Sales & Receipts',
      icon: Receipt,
      adminOnly: false,
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: Users,
      adminOnly: false,
    },
    {
      id: 'expenses',
      label: 'Expense Tracker',
      icon: Wallet,
      adminOnly: false,
    },
    {
      id: 'reports',
      label: 'Reports & P&L',
      icon: TrendingUp,
      adminOnly: false,
    },
    {
      id: 'theme',
      label: 'Dark / White Mode',
      icon: Palette,
      adminOnly: false,
    },
  ];

  const adminItems = [
    {
      id: 'users',
      label: 'Staff Management',
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      id: 'settings',
      label: 'Business Settings',
      icon: Settings,
      adminOnly: true,
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      icon: History,
      adminOnly: true,
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: Database,
      adminOnly: true,
    },
  ];

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isPinned) setIsHovered(false);
      }}
      className={`bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] flex flex-col border-r border-[#E2E8F0] dark:border-[#1E293B] shrink-0 h-[calc(100vh-57px)] select-none transition-all duration-200 ease-in-out z-20 ${
        isExpanded ? 'w-64 shadow-2xl dark:shadow-2xl' : 'w-16'
      }`}
    >
      {/* Top Toggle & Status Rail Header */}
      <div className="p-2 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between min-h-[44px]">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 pl-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] dark:text-[#64748B]">
                Navigation
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin (Auto-collapse on navigate)' : 'Pin sidebar open'}
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  isPinned
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
                }`}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPinned(false);
                  setIsHovered(false);
                }}
                title="Collapse to icons"
                className="p-1.5 rounded text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsHovered(true)}
            title="Expand menu"
            className="w-full flex items-center justify-center p-1.5 rounded text-[#64748B] hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links Scrollable Area */}
      <div className="p-2 flex-1 overflow-y-auto space-y-1 custom-scrollbar overflow-x-hidden">
        {/* Operations Section Heading / Divider */}
        {isExpanded ? (
          <div className="px-2.5 py-1 text-[10px] font-semibold text-[#94A3B8] dark:text-[#64748B] uppercase tracking-[0.22em]">
            Operations
          </div>
        ) : (
          <div className="h-px bg-[#E2E8F0] dark:bg-[#1E293B] my-1 mx-2" />
        )}

        {operationsItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div key={item.id} className="relative group">
              <button
                id={`nav-item-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
                } ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center shrink-0">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-[#64748B] group-hover:text-[#0F172A] dark:group-hover:text-[#F8FAFC]'
                      }`}
                    />
                    {/* Collapsed Badge indicator on icon */}
                    {!isExpanded && item.badge !== null && item.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#2563EB] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-[#0F172A] shadow">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <span className="tracking-wide whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div className="flex items-center gap-1.5">
                    {item.badge !== null && item.badge !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#2563EB] text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] border border-[#E2E8F0] dark:border-[#334155]'
                        }`}
                      >
                        {item.shortcut}
                      </span>
                    )}
                    {!isActive && !item.badge && !item.shortcut && (
                      <ChevronRight className="w-3 h-3 text-[#94A3B8] dark:text-[#475569] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )}
              </button>

              {/* Floating Tooltip in Collapsed Mode */}
              {!isExpanded && (
                <div className="fixed left-16 ml-2 px-2.5 py-1.5 bg-[#0F172A] dark:bg-[#1E293B] border border-[#334155] text-[#F8FAFC] text-xs rounded-md shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 text-[#3B82F6] border border-white/10">
                      {item.shortcut}
                    </span>
                  )}
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#2563EB] text-white">
                      {item.badge} items
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Administration Section Heading / Divider */}
        {isAdmin && (
          <>
            {isExpanded ? (
              <div className="pt-4 px-2.5 py-1 text-[10px] font-semibold text-[#94A3B8] dark:text-[#64748B] uppercase tracking-[0.22em] flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#1E293B] mt-2">
                <span>Administration</span>
                <span className="text-[9px] bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155] px-1.5 py-0.2 rounded font-mono uppercase">
                  Admin
                </span>
              </div>
            ) : (
              <div className="h-px bg-[#E2E8F0] dark:bg-[#1E293B] my-2 mx-2" />
            )}

            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    id={`nav-item-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
                    } ${
                      isActive
                        ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors shrink-0 ${
                          isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#0F172A] dark:group-hover:text-[#F8FAFC]'
                        }`}
                      />
                      {isExpanded && (
                        <span className="tracking-wide whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isExpanded && (
                      <ChevronRight className="w-3 h-3 text-[#94A3B8] dark:text-[#475569] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>

                  {/* Floating Tooltip in Collapsed Mode */}
                  {!isExpanded && (
                    <div className="fixed left-16 ml-2 px-2.5 py-1.5 bg-[#0F172A] dark:bg-[#1E293B] border border-[#334155] text-[#F8FAFC] text-xs rounded-md shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-[#CBD5E1] border border-white/10 uppercase">
                        Admin
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="p-2.5 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] text-[11px] text-[#64748B] flex items-center justify-between">
        {isExpanded ? (
          <>
            <div className="truncate text-[10px]">
              <span className="text-[#94A3B8] dark:text-[#475569]">Mode:</span>{' '}
              <span className="text-[#0F172A] dark:text-[#94A3B8] font-medium">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <div className="text-[#2563EB] dark:text-[#3B82F6] font-mono text-[10px] bg-white dark:bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#E2E8F0] dark:border-[#1E293B]">
              KES
            </div>
          </>
        ) : (
          <div
            title={`Terminal Active • Currency: KES`}
            className="w-full flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] font-mono text-[9px] bg-white dark:bg-[#0F172A] py-1 rounded border border-[#E2E8F0] dark:border-[#1E293B]"
          >
            KES
          </div>
        )}
      </div>
    </aside>
  );
};

