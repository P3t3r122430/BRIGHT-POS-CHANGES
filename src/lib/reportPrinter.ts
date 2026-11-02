import { BusinessSettings } from '../types';
import { formatKsh, formatNumber } from './utils';

export interface ReportPrintData {
  reportType: 'pnl' | 'sales' | 'products' | 'services' | 'inventory';
  startDate?: string;
  endDate?: string;
  data: any;
  settings: Partial<BusinessSettings> | null;
}

export function generateReportHtml(params: ReportPrintData): string {
  const { reportType, startDate, endDate, data, settings } = params;
  const businessName = settings?.business_name || 'BRIGHT CYBER & ICT CENTRE';
  const address = settings?.address || 'Biashara Street, Next to Central Plaza, Nairobi, Kenya';
  const phone = settings?.phone || '+254 712 345 678 / +254 798 765 432';
  const email = settings?.email || 'info@brightcyber.co.ke';
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const periodText = startDate && endDate
    ? `${startDate} to ${endDate}`
    : startDate
    ? `From ${startDate}`
    : endDate
    ? `Up to ${endDate}`
    : 'All Time to Date';

  let title = 'Executive Financial Audit & Statement';
  let contentHtml = '';

  if (reportType === 'pnl') {
    title = 'Statement of Comprehensive Income (Profit & Loss)';
    const s = data?.summary || data || {};
    const rev = data?.revenue || {
      productRevenue: data?.productProfit?.product_revenue || 0,
      serviceRevenue: data?.serviceProfit?.service_revenue || 0,
    };
    const cogs = data?.cogs || {
      productCogs: data?.productProfit?.product_cost || 0,
      serviceCost: data?.serviceProfit?.service_cost || 0,
    };
    const expenses = data?.expenses?.breakdown || (data?.expensesByCategory || []).map((e: any) => ({ category: e.category, amount: e.total_amount || 0 }));
    const totalRev = s.totalRevenue ?? data?.totalRevenue ?? 0;
    const totalCost = s.totalCogs ?? s.totalCost ?? data?.totalCost ?? 0;
    const grossProf = s.grossProfit ?? s.totalGrossProfit ?? data?.totalGrossProfit ?? 0;
    const grossMargin = s.grossMarginPct ?? (totalRev > 0 ? ((grossProf / totalRev) * 100).toFixed(1) : 0);
    const totalExp = s.totalExpenses ?? s.totalOperatingExpenses ?? data?.totalOperatingExpenses ?? 0;
    const netProf = s.netProfit ?? data?.netProfit ?? 0;
    const netMargin = s.netMarginPct ?? s.profitMarginPercent ?? data?.profitMarginPercent ?? (totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(1) : 0);

    contentHtml = `
      <div class="audit-section">
        <div class="section-title">1. REVENUE REALISATION</div>
        <table class="report-table">
          <tr>
            <td class="pl-4">Physical Merchandise & Hardware Sales</td>
            <td class="text-right font-mono">${formatKsh(rev.productRevenue || 0)}</td>
          </tr>
          <tr>
            <td class="pl-4">Cyber, Government & ICT Services Revenue</td>
            <td class="text-right font-mono">${formatKsh(rev.serviceRevenue || 0)}</td>
          </tr>
          <tr class="subtotal-row">
            <td class="bold">TOTAL REVENUE (TURNOVER)</td>
            <td class="text-right bold font-mono">${formatKsh(totalRev)}</td>
          </tr>
        </table>
      </div>

      <div class="audit-section">
        <div class="section-title">2. COST OF SALES & DIRECT PRODUCTION (COGS)</div>
        <table class="report-table">
          <tr>
            <td class="pl-4">Cost of Physical Merchandise Sold</td>
            <td class="text-right font-mono">(${formatKsh(cogs.productCogs || 0)})</td>
          </tr>
          <tr>
            <td class="pl-4">Direct Estimated Cost of Cyber & ICT Services</td>
            <td class="text-right font-mono">(${formatKsh(cogs.serviceCost || 0)})</td>
          </tr>
          <tr class="subtotal-row">
            <td class="bold">TOTAL DIRECT COST OF SALES</td>
            <td class="text-right bold font-mono">(${formatKsh(totalCost)})</td>
          </tr>
        </table>
      </div>

      <div class="kpi-banner">
        <div class="flex-between">
          <span class="bold">GROSS TRADING PROFIT (Gross Margin: ${grossMargin}%)</span>
          <span class="bold text-lg font-mono">${formatKsh(grossProf)}</span>
        </div>
      </div>

      <div class="audit-section">
        <div class="section-title">3. OPERATIONAL DISBURSEMENTS & OVERHEADS</div>
        <table class="report-table">
          ${expenses.length > 0 ? expenses.map((exp: any) => `
            <tr>
              <td class="pl-4">${exp.category}</td>
              <td class="text-right font-mono">(${formatKsh(exp.amount || 0)})</td>
            </tr>
          `).join('') : `
            <tr><td colspan="2" class="pl-4 text-muted">No operational expense disbursements recorded in this period.</td></tr>
          `}
          <tr class="subtotal-row">
            <td class="bold">TOTAL OPERATING EXPENSES</td>
            <td class="text-right bold font-mono">(${formatKsh(totalExp)})</td>
          </tr>
        </table>
      </div>

      <div class="net-profit-box ${Number(netProf) >= 0 ? 'profit-positive' : 'profit-negative'}">
        <div class="flex-between">
          <span class="bold" style="letter-spacing: 0.5px;">NET OPERATING PROFIT (Net Margin: ${netMargin}%)</span>
          <span class="bold text-xl font-mono">${formatKsh(netProf)}</span>
        </div>
      </div>
    `;
  } else if (reportType === 'sales') {
    title = 'Executive Sales Journal & Settlement Summary';
    const sum = data?.summary || {};
    const byCashier = data?.salesByCashier || [];
    const byMethod = data?.salesByMethod || [];

    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Gross Revenue</div>
          <div class="kpi-val">${formatKsh(sum.total_revenue || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Transactions</div>
          <div class="kpi-val">${formatNumber(sum.total_sales_count || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Average Ticket Size</div>
          <div class="kpi-val">${formatKsh(sum.average_ticket_value || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Discounts Given</div>
          <div class="kpi-val">${formatKsh(sum.total_discount || 0)}</div>
        </div>
      </div>

      <div class="audit-section">
        <div class="section-title">STAFF & CASHIER PERFORMANCE</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Staff / Attendant</th>
              <th>Username</th>
              <th class="text-center">Receipts Issued</th>
              <th class="text-right">Total Revenue Realised</th>
            </tr>
          </thead>
          <tbody>
            ${byCashier.map((c: any) => `
              <tr>
                <td class="bold">${c.cashier_name}</td>
                <td>${c.username}</td>
                <td class="text-center font-mono">${c.transaction_count}</td>
                <td class="text-right bold font-mono">${formatKsh(c.total_revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="audit-section">
        <div class="section-title">SETTLEMENT METHOD AUDIT</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Payment Channel</th>
              <th class="text-center">Transactions</th>
              <th class="text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody>
            ${byMethod.map((m: any) => `
              <tr>
                <td class="bold uppercase">${m.method}</td>
                <td class="text-center font-mono">${m.payment_count}</td>
                <td class="text-right bold font-mono">${formatKsh(m.total_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (reportType === 'products') {
    title = 'Physical Merchandise & Hardware Audit';
    const items = Array.isArray(data) ? data : [];
    const totalRev = items.reduce((acc, i) => acc + Number(i.total_revenue || 0), 0);
    const totalProfit = items.reduce((acc, i) => acc + Number(i.gross_profit || 0), 0);

    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Merchandise Revenue</div>
          <div class="kpi-val">${formatKsh(totalRev)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Merchandise Gross Profit</div>
          <div class="kpi-val">${formatKsh(totalProfit)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Products Audited</div>
          <div class="kpi-val">${items.length}</div>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th class="text-center">Units Sold</th>
            <th class="text-right">Revenue (KSh)</th>
            <th class="text-right">COGS (KSh)</th>
            <th class="text-right">Gross Profit</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((p: any) => `
            <tr>
              <td class="bold">${p.name}</td>
              <td class="font-mono">${p.sku}</td>
              <td>${p.category_name}</td>
              <td class="text-center font-mono">${p.total_quantity_sold || 0}</td>
              <td class="text-right font-mono">${formatNumber(p.total_revenue)}</td>
              <td class="text-right font-mono">${formatNumber(p.total_cogs)}</td>
              <td class="text-right bold font-mono">${formatKsh(p.gross_profit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (reportType === 'services') {
    title = 'Cyber, Government & ICT Services Tariff Audit';
    const items = Array.isArray(data) ? data : [];
    const totalRev = items.reduce((acc, i) => acc + Number(i.total_revenue || 0), 0);
    const totalProfit = items.reduce((acc, i) => acc + Number(i.gross_profit || 0), 0);

    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Services Realisation</div>
          <div class="kpi-val">${formatKsh(totalRev)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Services Gross Profit</div>
          <div class="kpi-val">${formatKsh(totalProfit)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Service Tariffs Audited</div>
          <div class="kpi-val">${items.length}</div>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>Service Tariff Name</th>
            <th>Department / Category</th>
            <th class="text-center">Volume Rendered</th>
            <th class="text-right">Revenue (KSh)</th>
            <th class="text-right">Estimated Cost (KSh)</th>
            <th class="text-right">Gross Profit</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((s: any) => `
            <tr>
              <td class="bold">${s.name}</td>
              <td>${s.category_name}</td>
              <td class="text-center font-mono">${s.total_rendered || 0}</td>
              <td class="text-right font-mono">${formatNumber(s.total_revenue)}</td>
              <td class="text-right font-mono">${formatNumber(s.total_cost)}</td>
              <td class="text-right bold font-mono">${formatKsh(s.gross_profit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (reportType === 'inventory') {
    title = 'Capital Stock & Inventory Valuation Statement';
    const s = data?.summary || {};

    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Capital Cost Valuation</div>
          <div class="kpi-val">${formatKsh(s.totalCostValuation || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Projected Retail Valuation</div>
          <div class="kpi-val">${formatKsh(s.totalRetailValuation || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Potential Gross Margin</div>
          <div class="kpi-val">${s.projectedMarginPct || 0}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Units on Hand</div>
          <div class="kpi-val">${formatNumber(s.totalUnits || 0)}</div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${businessName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111;
      background: #f7f7f7;
      font-size: 12px;
      line-height: 1.45;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .action-bar {
      max-width: 800px;
      width: 100%;
      background: #181818;
      color: #fff;
      padding: 10px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .action-bar button {
      background: #C5A059;
      color: #000;
      border: none;
      padding: 6px 14px;
      font-weight: 700;
      font-size: 11px;
      border-radius: 4px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .action-bar button:hover {
      background: #d8b46e;
    }
    .statement-container {
      max-width: 800px;
      width: 100%;
      background: #fff;
      padding: 32px 28px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .business-title {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
      margin-bottom: 2px;
    }
    .report-title {
      font-size: 14px;
      font-weight: 700;
      color: #333;
      margin-top: 4px;
    }
    .meta-text {
      font-size: 11px;
      color: #666;
      margin-top: 3px;
    }
    .audit-section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #222;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 8px;
    }
    .report-table th {
      background: #f0f0f0;
      border-bottom: 1px solid #999;
      padding: 6px 8px;
      text-align: left;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .report-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #eee;
    }
    .subtotal-row td {
      border-top: 1px solid #888;
      border-bottom: 1px solid #888;
      background: #fafafa;
    }
    .kpi-banner {
      background: #f5f0e6;
      border: 1px solid #C5A059;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .net-profit-box {
      padding: 12px 16px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .profit-positive {
      background: #eaf5ea;
      border: 1px solid #2e7d32;
      color: #1b5e20;
    }
    .profit-negative {
      background: #ffebee;
      border: 1px solid #c62828;
      color: #b71c1c;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      padding: 10px 12px;
      border-radius: 4px;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 700;
      color: #111;
      font-family: monospace;
      margin-top: 3px;
    }
    .footer {
      border-top: 1px dashed #aaa;
      padding-top: 12px;
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .pl-4 { padding-left: 16px !important; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .text-lg { font-size: 14px; }
    .text-xl { font-size: 16px; }

    @media print {
      body { background: transparent !important; padding: 0 !important; }
      .action-bar { display: none !important; }
      .statement-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      @page {
        margin: 12mm 10mm;
        size: A4 portrait;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <span style="font-size: 12px; font-weight: 600;">Executive Financial Statement • ${title}</span>
    <button onclick="window.print()">🖨️ Print Statement</button>
  </div>

  <div class="statement-container">
    <div class="header">
      <div class="business-title">${businessName}</div>
      <div class="meta-text">${address} • Tel: ${phone} • Email: ${email}</div>
      <div class="report-title">${title}</div>
      <div class="meta-text">Audited Period: <strong>${periodText}</strong> • Generated: ${generatedAt}</div>
    </div>

    ${contentHtml}

    <div class="footer">
      <div>This is an official computed executive statement generated from the Bright Cyber & ICT Centre transaction ledger.</div>
      <div style="margin-top: 4px; font-family: monospace;">*** CONFIDENTIAL EXECUTIVE FINANCIAL REPORT ***</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {}
      }, 300);
    };
  </script>
</body>
</html>`;
}

export function openReportInNewTab(params: ReportPrintData): void {
  const html = generateReportHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function downloadReportHtml(params: ReportPrintData): void {
  const html = generateReportHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Statement_${params.reportType}_${params.startDate || 'all'}_${params.endDate || 'now'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReportDirect(params: ReportPrintData): void {
  const htmlContent = generateReportHtml(params);
  try {
    let iframe = document.getElementById('report-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'report-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (e) {
          openReportInNewTab(params);
        }
      }, 300);
      return;
    }
  } catch (err) {
    console.warn('Iframe print error, falling back to new tab:', err);
  }

  openReportInNewTab(params);
}
