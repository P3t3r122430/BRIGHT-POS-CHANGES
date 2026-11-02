import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatKsh, formatNumber } from '../../lib/utils';
import {
  printReportDirect,
  openReportInNewTab,
  downloadReportHtml
} from '../../lib/reportPrinter';
import {
  TrendingUp,
  FileText,
  Download,
  Printer,
  Calendar,
  RotateCcw,
  DollarSign,
  Layers,
  Package,
  CheckCircle2,
  PieChart,
  Percent,
  ExternalLink
} from 'lucide-react';

export const ReportsScreen: React.FC = () => {
  const { settings } = useAuth();
  const [activeReport, setActiveReport] = useState<'pnl' | 'sales' | 'products' | 'services' | 'inventory'>('pnl');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [pnlData, setPnlData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [inventoryValData, setInventoryValData] = useState<any>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let query = '';
      if (startDate && endDate) {
        query = `?start_date=${startDate}&end_date=${endDate}`;
      }

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
      } else if (activeReport === 'inventory') {
        const res = await api.get<{ valuation: any }>('/reports/inventory-valuation');
        setInventoryValData(res.valuation);
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
  }, [activeReport, startDate, endDate]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReport === 'products') {
      csvContent += 'Product,SKU,Category,Units Sold,Revenue (KSh),COGS (KSh),Gross Profit (KSh)\n';
      productsData.forEach((p) => {
        csvContent += `"${p.name}","${p.sku}","${p.category_name}",${p.total_quantity_sold},${p.total_revenue},${p.total_cogs},${p.gross_profit}\n`;
      });
    } else if (activeReport === 'services') {
      csvContent += 'Service,Category,Volume Delivered,Revenue (KSh),Estimated Cost (KSh),Gross Profit (KSh)\n';
      servicesData.forEach((s) => {
        csvContent += `"${s.name}","${s.category_name}",${s.total_rendered},${s.total_revenue},${s.total_cost},${s.gross_profit}\n`;
      });
    } else if (activeReport === 'pnl' && pnlData) {
      const sum = pnlData.summary || pnlData || {};
      csvContent += 'Profit & Loss Statement\n';
      csvContent += `Total Revenue,${sum.totalRevenue ?? 0}\n`;
      csvContent += `Cost of Goods & Services,${sum.totalCogs ?? sum.totalCost ?? 0}\n`;
      csvContent += `Gross Profit,${sum.grossProfit ?? sum.totalGrossProfit ?? 0}\n`;
      csvContent += `Operating Expenses,${sum.totalExpenses ?? sum.totalOperatingExpenses ?? 0}\n`;
      csvContent += `Net Profit,${sum.netProfit ?? 0}\n`;
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
        return productsData;
      case 'services':
        return servicesData;
      case 'inventory':
        return inventoryValData;
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

  const handleDownloadStatement = () => {
    const data = getCurrentReportData();
    if (!data) return;
    downloadReportHtml({
      reportType: activeReport,
      startDate,
      endDate,
      data,
      settings,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-[#C5A059]" /> Executive Financial Audits & Statements
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Profit & Loss accounting, sales journals, item performance, and inventory valuation
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

      {/* Sub-report Selectors & Date Range */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D0D0D] p-3 rounded border border-[#222222] text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pnl', label: 'Profit & Loss (P&L)' },
            { id: 'sales', label: 'Sales Summary' },
            { id: 'products', label: 'Merchandise Audit' },
            { id: 'services', label: 'Services Tariff Audit' },
            { id: 'inventory', label: 'Capital Valuation' },
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

        <div className="flex items-center gap-2">
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

          <button
            onClick={fetchReport}
            className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* REPORT VIEW 1: P&L STATEMENT */}
      {activeReport === 'pnl' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-[#555555] bg-[#0D0D0D] border border-[#222222] rounded">
              Generating executive Profit & Loss statement...
            </div>
          ) : pnlData ? (
            <div className="bg-[#0D0D0D] border border-[#222222] rounded p-6 shadow-sm space-y-6">
              {/* Header */}
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

              {/* Financial Sections */}
              {(() => {
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
                  <div className="space-y-6 text-xs max-w-2xl mx-auto">
                    {/* 1. REVENUE */}
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

                    {/* 2. COST OF SALES */}
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

                    {/* 3. GROSS PROFIT */}
                    <div className="bg-[#141414] p-3.5 rounded border border-[#262626] flex justify-between font-serif font-medium text-sm text-[#C5A059]">
                      <span className="uppercase tracking-wider">GROSS PROFIT (Margin: {grossMargin}%)</span>
                      <span>{formatKsh(grossProf)}</span>
                    </div>

                    {/* 4. OPERATING EXPENSES */}
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

                    {/* 5. NET PROFIT */}
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
                );
              })()}
            </div>
          ) : null}
        </div>
      )}

      {/* REPORT VIEW 2: PRODUCT PERFORMANCE */}
      {activeReport === 'products' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Revenue (KSh)</th>
                  <th className="py-3 px-4 text-right">COGS (KSh)</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {productsData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-medium text-[#E5E5E0]">{p.name}</td>
                    <td className="py-2.5 px-4 font-mono text-[#C5A059]">{p.sku}</td>
                    <td className="py-2.5 px-4 text-[#AAAAAA]">{p.category_name}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-[#E5E5E0]">
                      {p.total_quantity_sold || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#E5E5E0] font-medium">
                      {formatNumber(p.total_revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#777777]">
                      {formatNumber(p.total_cogs)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-medium">
                      {formatKsh(p.gross_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 3: SERVICES RENDERED */}
      {activeReport === 'services' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Volume Rendered</th>
                  <th className="py-3 px-4 text-right">Revenue (KSh)</th>
                  <th className="py-3 px-4 text-right">Direct Cost (KSh)</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
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
                    <td className="py-2.5 px-4 text-right font-serif text-[#E5E5E0] font-medium">
                      {formatNumber(s.total_revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#777777]">
                      {formatNumber(s.total_cost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-medium">
                      {formatKsh(s.gross_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW 4: INVENTORY VALUATION */}
      {activeReport === 'inventory' && inventoryValData && (() => {
        const invSum = inventoryValData.summary || inventoryValData || {};
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Total Capital Cost</div>
                <div className="text-2xl font-serif text-[#E5E5E0] mt-1.5 font-medium">
                  {formatKsh(invSum.totalCostValuation ?? invSum.totalCostValue ?? 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-1">
                  {invSum.totalItems || 0} distinct items, {invSum.totalUnits || 0} units
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Total Retail Valuation</div>
                <div className="text-2xl font-serif text-[#C5A059] mt-1.5 font-medium">
                  {formatKsh(invSum.totalRetailValuation ?? invSum.totalRetailValue ?? 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-1">Projected merchandise realization</div>
              </div>

              <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
                <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-[0.2em]">Projected Margin</div>
                <div className="text-2xl font-serif text-[#4CAF50] mt-1.5 font-medium">
                  {formatKsh(invSum.potentialGrossProfit ?? invSum.potentialProfit ?? 0)}
                </div>
                <div className="text-[11px] text-[#666666] mt-1">
                  Margin: {invSum.projectedMarginPct || 0}%
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
