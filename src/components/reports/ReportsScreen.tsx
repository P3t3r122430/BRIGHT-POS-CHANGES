import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import {
  printReportDirect,
  openReportInNewTab,
  downloadReportHtml
} from '../../lib/reportPrinter';
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  RotateCcw,
  Users,
  UserCheck,
  Package,
  Layers,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

export const ReportsScreen: React.FC = () => {
  const { settings } = useAuth();
  const [activeReport, setActiveReport] = useState<
    'pnl' | 'sales' | 'products' | 'services' | 'cashiers' | 'customers' | 'inventory'
  >('pnl');

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [productSegment, setProductSegment] = useState<'all' | 'best_sellers' | 'slow_movers' | 'low_stock' | 'out_of_stock'>('all');

  const [loading, setLoading] = useState<boolean>(true);

  // Filter reference lists
  const [cashierOptions, setCashierOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [customerOptions, setCustomerOptions] = useState<Array<{ id: number; name: string }>>([]);

  // Data states
  const [pnlData, setPnlData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [cashiersData, setCashiersData] = useState<any[]>([]);
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [inventoryReportData, setInventoryReportData] = useState<any>(null);

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [usersRes, custRes] = await Promise.allSettled([
          api.get<{ users: any[] }>('/users'),
          api.get<{ customers: any[] }>('/customers'),
        ]);
        if (usersRes.status === 'fulfilled' && usersRes.value?.users) {
          setCashierOptions(usersRes.value.users.map((u: any) => ({ id: u.id, name: u.name || u.username })));
        }
        if (custRes.status === 'fulfilled' && custRes.value?.customers) {
          setCustomerOptions(custRes.value.customers.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch (e) {
        console.warn('Failed to load filter options:', e);
      }
    };
    loadFilterOptions();
  }, []);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (selectedCashier !== 'all') params.set('cashier_id', selectedCashier);
    if (selectedCustomer !== 'all') params.set('customer_id', selectedCustomer);
    if (selectedPaymentMethod !== 'all') params.set('payment_method', selectedPaymentMethod);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = buildQuery();

      if (activeReport === 'pnl') {
        const res = await api.get<{ pnl: any }>(`/reports/profit-loss${query}`);
        setPnlData(res.pnl);
      } else if (activeReport === 'sales') {
        const res = await api.get<{ sales: any }>(`/reports/sales${query}`);
        setSalesData(res.sales);
      } else if (activeReport === 'products') {
        const res = await api.get<{ products: any[] }>(`/reports/products${query}`);
        setProductsData(res.products || []);
      } else if (activeReport === 'services') {
        const res = await api.get<{ services: any[] }>(`/reports/services${query}`);
        setServicesData(res.services || []);
      } else if (activeReport === 'cashiers') {
        const res = await api.get<{ cashiers: any[] }>(`/reports/cashiers${query}`);
        setCashiersData(res.cashiers || []);
      } else if (activeReport === 'customers') {
        const res = await api.get<{ customers: any[] }>(`/reports/customers${query}`);
        setCustomersData(res.customers || []);
      } else if (activeReport === 'inventory') {
        const res = await api.get<{ summary: any; movements: any[] }>(`/reports/inventory${query}`);
        setInventoryReportData(res);
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to fetch report:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate, selectedCashier, selectedCustomer, selectedPaymentMethod]);

  // Client-side segmented product filtering
  const filteredProducts = React.useMemo(() => {
    if (!productsData) return [];
    if (productSegment === 'best_sellers') {
      return [...productsData].sort((a, b) => (b.total_quantity_sold || 0) - (a.total_quantity_sold || 0));
    }
    if (productSegment === 'slow_movers') {
      return [...productsData].sort((a, b) => (a.total_quantity_sold || 0) - (b.total_quantity_sold || 0));
    }
    if (productSegment === 'low_stock') {
      return productsData.filter((p) => (p.current_stock ?? p.stock_quantity ?? 0) <= 5 && (p.current_stock ?? p.stock_quantity ?? 0) > 0);
    }
    if (productSegment === 'out_of_stock') {
      return productsData.filter((p) => (p.current_stock ?? p.stock_quantity ?? 0) <= 0);
    }
    return productsData;
  }, [productsData, productSegment]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReport === 'products') {
      csvContent += 'Product,SKU,Category,Units Sold,Revenue (KSh),COGS (KSh),Gross Profit (KSh)\n';
      filteredProducts.forEach((p) => {
        csvContent += `"${p.name}","${p.sku}","${p.category_name || ''}",${p.total_quantity_sold || 0},${p.total_revenue || 0},${p.total_cogs || 0},${p.gross_profit || 0}\n`;
      });
    } else if (activeReport === 'services') {
      csvContent += 'Service,Category,Volume Delivered,Revenue (KSh),Direct Cost (KSh),Gross Profit (KSh),Average Rate (KSh)\n';
      servicesData.forEach((s) => {
        csvContent += `"${s.name}","${s.category_name || ''}",${s.total_rendered || 0},${s.total_revenue || 0},${s.total_cost || 0},${s.gross_profit || 0},${s.average_rate || 0}\n`;
      });
    } else if (activeReport === 'pnl' && pnlData) {
      const sum = pnlData.summary || pnlData || {};
      csvContent += 'Profit & Loss Statement\n';
      csvContent += `Total Revenue,${sum.totalRevenue ?? 0}\n`;
      csvContent += `Cost of Goods & Services,${sum.totalCogs ?? sum.totalCost ?? 0}\n`;
      csvContent += `Gross Profit,${sum.grossProfit ?? sum.totalGrossProfit ?? 0}\n`;
      csvContent += `Operating Expenses,${sum.totalExpenses ?? sum.totalOperatingExpenses ?? 0}\n`;
      csvContent += `Net Profit,${sum.netProfit ?? 0}\n`;
    } else if (activeReport === 'cashiers') {
      csvContent += 'Cashier Name,Username,Transactions,Gross Sales,Discounts,Refunds,Net Sales,Avg Ticket,Cash,M-Pesa,Card\n';
      cashiersData.forEach((c) => {
        csvContent += `"${c.name}","${c.username}",${c.total_transactions || 0},${c.gross_sales || c.total_sales || 0},${c.discounts || 0},${c.refunds || 0},${c.net_sales || c.total_sales || 0},${c.average_transaction_value || 0},${c.payment_methods?.cash || 0},${c.payment_methods?.mpesa || 0},${c.payment_methods?.card || 0}\n`;
      });
    } else if (activeReport === 'customers') {
      csvContent += 'Customer ID,Name,Phone,Email,Purchases,Total Spent (KSh),Average Order (KSh),Last Purchase\n';
      customersData.forEach((c) => {
        csvContent += `"CUST-${String(c.id).padStart(4, '0')}","${c.name}","${c.phone || ''}","${c.email || ''}",${c.total_purchases || 0},${c.total_spent || 0},${c.average_ticket || 0},"${c.last_purchase_date || ''}"\n`;
      });
    } else if (activeReport === 'inventory' && inventoryReportData) {
      csvContent += 'Inventory Movements & Adjustments\n';
      csvContent += 'Timestamp,SKU / Item,Movement Type,Change Qty,Quantity After,Author,Notes\n';
      (inventoryReportData.movements || []).forEach((m: any) => {
        csvContent += `"${m.created_at}","${m.sku || m.product_name || m.product_id}","${m.movement_type}",${m.quantity_change},${m.quantity_after || ''},"${m.created_by_name || 'System'}","${m.notes || ''}"\n`;
      });
    } else if (activeReport === 'sales' && salesData) {
      csvContent += 'Sales Summary\n';
      csvContent += `Gross Sales,${salesData.summary?.gross_sales || salesData.summary?.total_revenue || 0}\n`;
      csvContent += `Discounts,${salesData.summary?.total_discount || 0}\n`;
      csvContent += `Refunds,${salesData.summary?.total_refunds || 0}\n`;
      csvContent += `Net Sales,${salesData.summary?.net_sales || salesData.summary?.total_revenue || 0}\n`;
      csvContent += `Transactions,${salesData.summary?.total_sales_count || 0}\n`;
      csvContent += `Average Ticket,${salesData.summary?.average_ticket_value || 0}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BrightCyber_${activeReport}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCurrentReportData = () => {
    switch (activeReport) {
      case 'pnl':
        return pnlData;
      case 'sales':
        return salesData;
      case 'products':
        return filteredProducts;
      case 'services':
        return servicesData;
      case 'cashiers':
        return { cashiers: cashiersData };
      case 'customers':
        return { customers: customersData };
      case 'inventory':
        return inventoryReportData;
      default:
        return null;
    }
  };

  const handlePrintStatement = () => {
    const data = getCurrentReportData();
    if (!data) return;
    printReportDirect({
      reportType: activeReport,
      startDate,
      endDate,
      data,
      settings,
    });
  };

  const handleOpenTab = () => {
    const data = getCurrentReportData();
    if (!data) return;
    openReportInNewTab({
      reportType: activeReport,
      startDate,
      endDate,
      data,
      settings,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-5 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-[#C5A059]" /> Executive Financial Audits & Statements
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Profit & Loss accounting, sales journals, cashier performance, customer accounts, and stock valuation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#AAAAAA] hover:text-[#E5E5E0] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#262626] transition flex items-center gap-1.5 cursor-pointer"
            title="Download Raw Data CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A059]" /> Export CSV
          </button>
          <button
            onClick={handleOpenTab}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#C5A059] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#C5A059]/40 transition flex items-center gap-1.5 cursor-pointer"
            title="Open printable executive statement in a dedicated tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" /> New Tab
          </button>
          <button
            onClick={handlePrintStatement}
            className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-black" /> Print Statement
          </button>
        </div>
      </div>

      {/* Sub-report Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0D0D] p-2 rounded-lg border border-[#222222]">
        {[
          { id: 'pnl', label: 'Profit & Loss (P&L)' },
          { id: 'sales', label: 'Sales Journal' },
          { id: 'products', label: 'Products Audit' },
          { id: 'services', label: 'Services Tariff' },
          { id: 'cashiers', label: 'Cashiers & Shifts' },
          { id: 'customers', label: 'Customer Accounts' },
          { id: 'inventory', label: 'Stock Valuation & Movements' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => setActiveReport(rep.id as any)}
            className={`px-3 py-1.5 rounded text-[11px] uppercase tracking-wider font-semibold transition cursor-pointer border ${
              activeReport === rep.id
                ? 'bg-[#C5A059] text-black border-[#C5A059] shadow'
                : 'bg-[#141414] text-[#888888] hover:text-[#E5E5E0] border-[#222222]'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Comprehensive Multi-Filter Bar */}
      <div className="bg-[#0D0D0D] p-3 rounded-lg border border-[#222222] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 text-[11px] text-[#777777] uppercase font-semibold tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#C5A059]" /> Filter:
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 bg-[#141414] px-2.5 py-1 rounded border border-[#262626]">
            <Calendar className="w-3.5 h-3.5 text-[#666666]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-[#E5E5E0] focus:outline-none"
            />
            <span className="text-[#555555]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-[#E5E5E0] focus:outline-none"
            />
          </div>

          {/* Cashier Filter */}
          {(activeReport === 'sales' || activeReport === 'cashiers') && (
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="bg-[#141414] text-xs text-[#E5E5E0] px-2.5 py-1 rounded border border-[#262626] focus:outline-none"
            >
              <option value="all">All Cashiers</option>
              {cashierOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Customer Filter */}
          {(activeReport === 'sales' || activeReport === 'customers') && (
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="bg-[#141414] text-xs text-[#E5E5E0] px-2.5 py-1 rounded border border-[#262626] focus:outline-none max-w-[160px]"
            >
              <option value="all">All Customers</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Payment Method Filter */}
          {activeReport === 'sales' && (
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-[#141414] text-xs text-[#E5E5E0] px-2.5 py-1 rounded border border-[#262626] focus:outline-none"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="mpesa">M-Pesa Only</option>
              <option value="card">Card Only</option>
              <option value="other">Bank / Other</option>
            </select>
          )}

          {/* Product Segment Badges */}
          {activeReport === 'products' && (
            <div className="flex items-center gap-1 bg-[#141414] p-0.5 rounded border border-[#262626]">
              {(
                [
                  { id: 'all', label: 'All Items' },
                  { id: 'best_sellers', label: 'Best Sellers' },
                  { id: 'slow_movers', label: 'Slow Movers' },
                  { id: 'low_stock', label: 'Low Stock (≤5)' },
                  { id: 'out_of_stock', label: 'Out of Stock' },
                ] as const
              ).map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setProductSegment(seg.id)}
                  className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded transition ${
                    productSegment === seg.id
                      ? 'bg-[#C5A059] text-black font-bold'
                      : 'text-[#888888] hover:text-[#E5E5E0]'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={fetchReport}
          className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
          title="Reload Report"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C5A059]' : ''}`} />
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="p-8 text-center text-[#777777] bg-[#0D0D0D] border border-[#222222] rounded-lg">
          Compiling business audit report...
        </div>
      )}

      {/* REPORT VIEW 1: PROFIT & LOSS */}
      {!loading && activeReport === 'pnl' && pnlData && (() => {
        const summary = pnlData.summary || pnlData || {};
        const revenue = pnlData.revenue || {
          productRevenue: pnlData.productProfit?.product_revenue || 0,
          serviceRevenue: pnlData.serviceProfit?.service_revenue || 0,
        };
        const cogs = pnlData.cogs || {
          productCogs: pnlData.productProfit?.product_cost || 0,
          serviceCost: pnlData.serviceProfit?.service_cost || 0,
        };
        const expensesBreakdown = pnlData.expenses?.breakdown || (pnlData.expensesByCategory || []).map((e: any) => ({ category: e.category, amount: e.total_amount || 0 }));
        const totalRev = summary.totalRevenue ?? pnlData.totalRevenue ?? 0;
        const totalCost = summary.totalCogs ?? summary.totalCost ?? pnlData.totalCost ?? 0;
        const grossProf = summary.grossProfit ?? summary.totalGrossProfit ?? pnlData.totalGrossProfit ?? 0;
        const grossMargin = summary.grossMarginPct ?? (totalRev > 0 ? ((grossProf / totalRev) * 100).toFixed(1) : 0);
        const totalExp = summary.totalExpenses ?? summary.totalOperatingExpenses ?? pnlData.totalOperatingExpenses ?? 0;
        const netProf = summary.netProfit ?? pnlData.netProfit ?? 0;
        const netMargin = summary.netMarginPct ?? summary.profitMarginPercent ?? pnlData.profitMarginPercent ?? (totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(1) : 0);

        return (
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-6 shadow-sm space-y-6">
            <div className="text-center pb-4 border-b border-[#222222]">
              <h3 className="text-sm font-serif-luxury font-medium text-[#C5A059] uppercase tracking-[0.25em]">
                {settings?.business_name || 'Bright Cyber & Stationery'}
              </h3>
              <h4 className="text-base font-serif font-semibold text-[#E5E5E0] mt-1">
                Statement of Comprehensive Income (Profit & Loss)
              </h4>
              <p className="text-[11px] text-[#777777] uppercase tracking-widest mt-1">
                Reporting Period: {startDate || 'All Time'} through {endDate || 'Current Date'}
              </p>
            </div>

            <div className="space-y-6 text-xs max-w-2xl mx-auto">
              <div className="space-y-2">
                <div className="font-serif-luxury font-medium text-[#C5A059] uppercase text-xs tracking-[0.14em] border-b border-[#222222] pb-1.5">
                  1. Revenue Realisation
                </div>
                <div className="flex justify-between pl-4 text-[#AAAAAA]">
                  <span>Physical Merchandise & Hardware Sales</span>
                  <span className="font-mono text-[#E5E5E0]">{formatKsh(revenue.productRevenue)}</span>
                </div>
                <div className="flex justify-between pl-4 text-[#AAAAAA]">
                  <span>Cyber & ICT Services Revenue</span>
                  <span className="font-mono text-[#E5E5E0]">{formatKsh(revenue.serviceRevenue)}</span>
                </div>
                <div className="flex justify-between font-serif font-medium text-white pt-1.5 border-t border-[#1F1F1F]">
                  <span className="uppercase text-[11px] tracking-wider text-[#C5A059]">TOTAL REVENUE</span>
                  <span className="text-sm">{formatKsh(totalRev)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-serif-luxury font-medium text-[#C5A059] uppercase text-xs tracking-[0.14em] border-b border-[#222222] pb-1.5">
                  2. Direct Cost of Goods & Services (COGS)
                </div>
                <div className="flex justify-between pl-4 text-[#AAAAAA]">
                  <span>Cost of Physical Merchandise Sold</span>
                  <span className="font-mono text-[#888888]">({formatKsh(cogs.productCogs)})</span>
                </div>
                <div className="flex justify-between pl-4 text-[#AAAAAA]">
                  <span>Direct Cost of Cyber & ICT Services</span>
                  <span className="font-mono text-[#888888]">({formatKsh(cogs.serviceCost)})</span>
                </div>
                <div className="flex justify-between font-serif font-medium text-[#AAAAAA] pt-1.5 border-t border-[#1F1F1F]">
                  <span className="uppercase text-[11px] tracking-wider">TOTAL DIRECT COST</span>
                  <span>({formatKsh(totalCost)})</span>
                </div>
              </div>

              <div className="bg-[#141414] p-3.5 rounded border border-[#262626] flex justify-between font-serif font-medium text-sm text-[#C5A059]">
                <span className="uppercase tracking-wider">GROSS PROFIT (Margin: {grossMargin}%)</span>
                <span>{formatKsh(grossProf)}</span>
              </div>

              <div className="space-y-2">
                <div className="font-serif-luxury font-medium text-[#C5A059] uppercase text-xs tracking-[0.14em] border-b border-[#222222] pb-1.5">
                  4. Operational Disbursements
                </div>
                {expensesBreakdown.map((exp: any, i: number) => (
                  <div key={i} className="flex justify-between pl-4 text-[#AAAAAA]">
                    <span>{exp.category}</span>
                    <span className="font-mono text-[#888888]">({formatKsh(exp.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between font-serif font-medium text-rose-300 pt-1.5 border-t border-[#1F1F1F]">
                  <span className="uppercase text-[11px] tracking-wider">TOTAL OPERATING EXPENSES</span>
                  <span>({formatKsh(totalExp)})</span>
                </div>
              </div>

              <div
                className={`p-4 rounded border flex justify-between font-serif font-medium text-base ${
                  Number(netProf) >= 0
                    ? 'bg-[#121212] border-[#C5A059] text-[#C5A059]'
                    : 'bg-rose-950/30 border-rose-900 text-rose-300'
                }`}
              >
                <span className="uppercase tracking-widest text-xs">NET PROFIT (Net Margin: {netMargin}%)</span>
                <span className="text-lg">{formatKsh(netProf)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* REPORT VIEW 2: SALES JOURNAL */}
      {!loading && activeReport === 'sales' && salesData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
              <div className="text-[10px] text-[#777777] uppercase font-semibold">Gross Sales</div>
              <div className="text-lg font-serif font-semibold text-[#E5E5E0] mt-1">
                {formatKsh(salesData.summary?.gross_sales || salesData.summary?.total_revenue || 0)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
              <div className="text-[10px] text-[#777777] uppercase font-semibold">Total Discounts</div>
              <div className="text-lg font-serif font-semibold text-amber-400 mt-1">
                {formatKsh(salesData.summary?.total_discount || 0)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
              <div className="text-[10px] text-[#777777] uppercase font-semibold">Net Sales</div>
              <div className="text-lg font-serif font-semibold text-[#C5A059] mt-1">
                {formatKsh(salesData.summary?.net_sales || salesData.summary?.total_revenue || 0)}
              </div>
            </div>
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
              <div className="text-[10px] text-[#777777] uppercase font-semibold">Transactions / Avg</div>
              <div className="text-lg font-serif font-semibold text-[#E5E5E0] mt-1">
                {salesData.summary?.total_sales_count || 0} <span className="text-xs text-[#888888]">({formatKsh(salesData.summary?.average_ticket_value || 0)})</span>
              </div>
            </div>
          </div>

          {/* Transactions list */}
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden">
            <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] font-serif-luxury text-xs text-[#C5A059] uppercase tracking-wider">
              Settled Transactions ({salesData.transactions?.length || 0})
            </div>
            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-wider border-b border-[#1F1F1F]">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {(salesData.transactions || []).map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#141414] transition">
                      <td className="py-2 px-3 font-mono font-bold text-[#C5A059]">{t.receipt_number}</td>
                      <td className="py-2 px-3 text-[#AAAAAA]">{formatDate(t.created_at)}</td>
                      <td className="py-2 px-3 text-[#E5E5E0]">{t.cashier_name || 'Staff'}</td>
                      <td className="py-2 px-3 text-[#AAAAAA]">{t.customer_name || 'Walk-in'}</td>
                      <td className="py-2 px-3">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#C5A059]">
                          {t.payment_method}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-[#E5E5E0]">{formatKsh(t.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT VIEW 3: PRODUCTS AUDIT */}
      {!loading && activeReport === 'products' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] flex items-center justify-between text-xs">
            <span className="font-serif-luxury text-[#C5A059] uppercase tracking-wider">
              Merchandise Inventory Performance ({filteredProducts.length} items)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">COGS</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {filteredProducts.map((p, idx) => {
                  const stock = p.current_stock ?? p.stock_quantity ?? 0;
                  return (
                    <tr key={idx} className="hover:bg-[#141414] transition">
                      <td className="py-2.5 px-4 font-medium text-[#E5E5E0]">{p.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[#C5A059]">{p.sku}</td>
                      <td className="py-2.5 px-4 text-[#AAAAAA]">{p.category_name}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-[#E5E5E0]">
                        {p.total_quantity_sold || 0}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#E5E5E0]">
                        {formatKsh(p.total_revenue || 0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#777777]">
                        {formatKsh(p.total_cogs || 0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-medium">
                        {formatKsh(p.gross_profit || 0)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            stock <= 0
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                              : stock <= 5
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                              : 'text-[#AAAAAA]'
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 4: SERVICES TARIFF AUDIT */}
      {!loading && activeReport === 'services' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] font-serif-luxury text-xs text-[#C5A059] uppercase tracking-wider">
            Cyber & ICT Services Tariff Realisation ({servicesData.length} tariffs)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Volume Rendered</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Direct Cost</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-right">Average Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {servicesData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-medium text-[#E5E5E0]">{s.name}</td>
                    <td className="py-2.5 px-4 text-[#C5A059]">{s.category_name}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-[#E5E5E0]">
                      {s.total_rendered || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#E5E5E0]">
                      {formatKsh(s.total_revenue || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#777777]">
                      {formatKsh(s.total_cost || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-medium">
                      {formatKsh(s.gross_profit || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#AAAAAA]">
                      {formatKsh(s.average_rate || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 5: CASHIERS & SHIFTS REPORT */}
      {!loading && activeReport === 'cashiers' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] font-serif-luxury text-xs text-[#C5A059] uppercase tracking-wider">
            Cashier Shift & Settlement Performance ({cashiersData.length} staff)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Cashier Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4 text-center">Transactions</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Discounts</th>
                  <th className="py-3 px-4 text-right">Refunds</th>
                  <th className="py-3 px-4 text-right">Net Sales</th>
                  <th className="py-3 px-4 text-right">Avg Ticket</th>
                  <th className="py-3 px-4 text-right">Cash / M-Pesa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {cashiersData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-semibold text-[#E5E5E0]">{c.name}</td>
                    <td className="py-2.5 px-4 font-mono text-[#888888]">@{c.username}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium text-[#E5E5E0]">
                      {c.total_transactions || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#E5E5E0]">
                      {formatKsh(c.gross_sales || c.total_sales || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-400">
                      {formatKsh(c.discounts || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-400">
                      {formatKsh(c.refunds || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-bold">
                      {formatKsh(c.net_sales || c.total_sales || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#AAAAAA]">
                      {formatKsh(c.average_transaction_value || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-[#777777]">
                      {formatKsh(c.payment_methods?.cash || 0)} / {formatKsh(c.payment_methods?.mpesa || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 6: CUSTOMER ACCOUNTS REPORT */}
      {!loading && activeReport === 'customers' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] font-serif-luxury text-xs text-[#C5A059] uppercase tracking-wider">
            Customer Patronage & Lifetime Value ({customersData.length} patrons)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4 text-center">Purchases</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 text-right">Average Order</th>
                  <th className="py-3 px-4 text-right">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {customersData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#C5A059]">
                      CUST-{String(c.id).padStart(4, '0')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#E5E5E0]">{c.name}</td>
                    <td className="py-2.5 px-4 font-mono text-[#888888]">{c.phone || '-'}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium text-[#E5E5E0]">
                      {c.total_purchases || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-bold">
                      {formatKsh(c.total_spent || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#AAAAAA]">
                      {formatKsh(c.average_ticket || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#777777]">
                      {c.last_purchase_date ? formatDate(c.last_purchase_date) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 7: STOCK VALUATION & MOVEMENTS */}
      {!loading && activeReport === 'inventory' && inventoryReportData && (() => {
        const invSum = inventoryReportData.summary || {};
        const movements = inventoryReportData.movements || [];

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Total Capital Cost</div>
                <div className="text-xl font-serif text-[#E5E5E0] mt-1 font-medium">
                  {formatKsh(invSum.totalCostValuation || 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-0.5">
                  {invSum.totalItems || 0} items, {invSum.totalUnits || 0} units
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Total Retail Valuation</div>
                <div className="text-xl font-serif text-[#C5A059] mt-1 font-medium">
                  {formatKsh(invSum.totalRetailValuation || 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-0.5">Projected retail turnover</div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Projected Margin</div>
                <div className="text-xl font-serif text-emerald-400 mt-1 font-medium">
                  {formatKsh(invSum.potentialGrossProfit || 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-0.5">
                  Margin: {invSum.projectedMarginPct || 0}%
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-3.5">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Stock Alerts</div>
                <div className="text-xl font-serif text-amber-400 mt-1 font-medium">
                  {invSum.lowStockCount || 0} low / {invSum.outOfStockCount || 0} out
                </div>
                <div className="text-[11px] text-[#666666] mt-0.5">Reorder attention required</div>
              </div>
            </div>

            {/* Inventory Movements Journal */}
            <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
              <div className="p-3 bg-[#121212] border-b border-[#1F1F1F] font-serif-luxury text-xs text-[#C5A059] uppercase tracking-wider">
                Recent Inventory Movements & Adjustments Journal ({movements.length} records)
              </div>
              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                    <tr>
                      <th className="py-2.5 px-3">Date / Time</th>
                      <th className="py-2.5 px-3">Product SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-center">Delta Qty</th>
                      <th className="py-2.5 px-3 text-center">Stock Post</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {movements.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#141414] transition">
                        <td className="py-2 px-3 text-[#888888] font-mono text-[11px]">
                          {formatDate(m.created_at)}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-[#C5A059]">
                          {m.sku || m.product_name || `Product #${m.product_id}`}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-[#181818] text-[#AAAAAA] border border-[#262626]">
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span className={m.quantity_change > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[#E5E5E0]">
                          {m.quantity_after ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-[#AAAAAA]">{m.created_by_name || 'System'}</td>
                        <td className="py-2 px-3 text-[#777777] text-[11px] truncate max-w-[200px]">{m.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
