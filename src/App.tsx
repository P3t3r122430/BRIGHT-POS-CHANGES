import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PosScreen } from './components/pos/PosScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ProductsScreen } from './components/products/ProductsScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { ServicesScreen } from './components/services/ServicesScreen';
import { TransactionsScreen } from './components/transactions/TransactionsScreen';
import { CustomersScreen } from './components/customers/CustomersScreen';
import { ExpensesScreen } from './components/expenses/ExpensesScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { DiscountsScreen } from './components/discounts/DiscountsScreen';
import { ThemeScreen } from './components/theme/ThemeScreen';
import { UsersScreen } from './components/users/UsersScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { AuditLogsScreen } from './components/audit/AuditLogsScreen';
import { BackupScreen } from './components/backup/BackupScreen';
import { RotateCcw } from 'lucide-react';

function MainApp() {
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('pos');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center text-[#0F172A] dark:text-[#F8FAFC] space-y-4">
        <div className="w-12 h-12 border border-[#2563EB] flex items-center justify-center rotate-45 shadow-lg bg-[#FFFFFF] dark:bg-[#0F172A]">
          <div className="w-7 h-7 bg-[#2563EB] flex items-center justify-center -rotate-45">
            <span className="font-serif-luxury text-[11px] font-bold text-white tracking-tighter">BC</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.25em] font-medium text-[#64748B] dark:text-[#94A3B8]">
          <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
          <span>INITIALIZING POS TERMINAL...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Safety check: if tab is admin-only and user is not admin, default to 'pos'
  const adminOnlyTabs = ['users', 'settings', 'audit', 'backup'];
  const activeTab = adminOnlyTabs.includes(currentTab) && !isAdmin ? 'pos' : currentTab;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col antialiased">
      {/* Top Bar */}
      <Navbar currentTab={activeTab} onNavigate={(tab) => setCurrentTab(tab)} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={activeTab} onSelectTab={(tab) => setCurrentTab(tab)} />

        {/* Dynamic Screen View */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-hidden">
          {activeTab === 'pos' && <PosScreen />}
          {activeTab === 'dashboard' && (
            <DashboardScreen onNavigate={(tab) => setCurrentTab(tab)} />
          )}
          {activeTab === 'products' && <ProductsScreen />}
          {activeTab === 'inventory' && <InventoryScreen />}
          {activeTab === 'services' && <ServicesScreen />}
          {activeTab === 'discounts' && <DiscountsScreen />}
          {activeTab === 'transactions' && <TransactionsScreen />}
          {activeTab === 'customers' && <CustomersScreen />}
          {activeTab === 'expenses' && <ExpensesScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'theme' && <ThemeScreen />}
          {activeTab === 'users' && isAdmin && <UsersScreen />}
          {activeTab === 'settings' && isAdmin && <SettingsScreen />}
          {activeTab === 'audit' && isAdmin && <AuditLogsScreen />}
          {activeTab === 'backup' && isAdmin && <BackupScreen />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
