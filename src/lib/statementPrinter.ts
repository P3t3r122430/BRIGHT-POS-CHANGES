import { CustomerStatement } from '../types';
import { formatKsh, formatDate } from './utils';

export function generateCustomerStatementHtml(statement: CustomerStatement): string {
  const { customer, settings, period, lines, summary, generatedAt } = statement;

  const businessName = settings?.business_name || 'BRIGHT CYBER & ICT CENTRE';
  const address = settings?.address || 'Biashara Street, Nairobi, Kenya';
  const phone = settings?.phone || '+254 712 345 678';
  const email = settings?.email || 'info@brightcyber.co.ke';
  const formattedGenDate = new Date(generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowsHtml = lines.length === 0
    ? `<tr><td colspan="6" style="text-align:center; padding: 24px; color: #666; font-style: italic;">No purchase or payment activity recorded in this date period.</td></tr>`
    : lines.map((line, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfcfc'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          ${new Date(line.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 11px; font-weight: bold; color: #1e3a8a;">
          ${line.receiptNumber}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: #374151;">
          <div>${line.description}</div>
          <div style="font-size: 9.5px; color: #6b7280;">Paid via: ${line.paymentMethod.toUpperCase()} • Staff: ${line.cashier}</div>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 11px; font-weight: 600;">
          ${line.debit > 0 ? formatKsh(line.debit) : '—'}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 11px; font-weight: 600; color: #047857;">
          ${line.payment > 0 ? formatKsh(line.payment) : '—'}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 11px; font-weight: 700; color: #111827;">
          ${formatKsh(line.balance)}
        </td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Customer Account Statement — ${customer.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #f3f4f6;
      padding: 30px 15px;
      font-size: 12px;
      line-height: 1.45;
    }
    .statement-wrapper {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .action-header {
      max-width: 850px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 12px 20px;
      border-radius: 8px;
      color: #fff;
    }
    .btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn:hover { background: #1d4ed8; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; }
    .statement-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; text-align: right; }
    .period-box { text-align: right; font-size: 11.5px; color: #4b5563; margin-top: 4px; }
    .info-grid {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .info-col { flex: 1; }
    .info-col h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
    .info-col p { font-size: 12px; font-weight: 600; color: #1e293b; margin: 2px 0; }
    .info-col span { color: #64748b; font-weight: normal; font-size: 11px; }
    table.ledger { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    table.ledger th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      font-weight: 700;
    }
    .summary-card {
      margin-left: auto;
      width: 320px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 14px 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;
      color: #334155;
    }
    .summary-row.total {
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer-note {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #64748b;
    }
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .action-header { display: none !important; }
      .statement-wrapper { box-shadow: none !important; padding: 10px 0 !important; border: none !important; max-width: 100% !important; }
      @page { margin: 12mm 10mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="action-header">
    <span style="font-weight: 600;">Customer Statement: ${customer.name} (${customer.customerIdFormatted})</span>
    <button class="btn" onclick="window.print()">🖨️ Print Statement / Save PDF</button>
  </div>

  <div class="statement-wrapper">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="company-name">${businessName}</div>
          <div style="color: #4b5563; font-size: 11px; margin-top: 2px;">${address}</div>
          <div style="color: #4b5563; font-size: 11px;">Tel: ${phone} • Email: ${email}</div>
        </td>
        <td style="vertical-align: top;">
          <div class="statement-title">ACCOUNT STATEMENT</div>
          <div class="period-box">Period: <strong>${period.startDate}</strong> to <strong>${period.endDate}</strong></div>
          <div class="period-box" style="font-size: 10px; color: #6b7280;">Generated: ${formattedGenDate}</div>
        </td>
      </tr>
    </table>

    <div class="info-grid">
      <div class="info-col">
        <h4>STATEMENT FOR CLIENT</h4>
        <p>${customer.name}</p>
        <span>Account Ref: <strong>${customer.customerIdFormatted}</strong></span>
      </div>
      <div class="info-col">
        <h4>CONTACT DETAILS</h4>
        <p>Tel: ${customer.phone}</p>
        <span>Email: ${customer.email}</span>
      </div>
      <div class="info-col">
        <h4>BILLING ADDRESS</h4>
        <p>${customer.address || 'N/A'}</p>
        <span>Member Since: ${new Date(customer.registeredDate).toLocaleDateString('en-GB')}</span>
      </div>
    </div>

    <table class="ledger">
      <thead>
        <tr>
          <th style="text-align: left; width: 85px;">Date</th>
          <th style="text-align: left; width: 110px;">Receipt #</th>
          <th style="text-align: left;">Particulars / Description</th>
          <th style="text-align: right; width: 95px;">Purchases (Debit)</th>
          <th style="text-align: right; width: 95px;">Payment (Credit)</th>
          <th style="text-align: right; width: 100px;">Cumulative Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="summary-card">
      <div class="summary-row">
        <span>Opening Balance:</span>
        <span style="font-family: monospace;">${formatKsh(summary.openingBalance)}</span>
      </div>
      <div class="summary-row">
        <span>Total Purchases (Debits):</span>
        <span style="font-family: monospace; font-weight: 600;">${formatKsh(summary.totalPurchases)}</span>
      </div>
      <div class="summary-row" style="color: #047857;">
        <span>Total Payments Settled:</span>
        <span style="font-family: monospace; font-weight: 600;">${formatKsh(summary.totalPayments)}</span>
      </div>
      <div class="summary-row total">
        <span>Closing Balance:</span>
        <span style="font-family: monospace;">${formatKsh(summary.closingBalance)}</span>
      </div>
    </div>

    <div class="footer-note">
      <div>Thank you for choosing Bright Cyber & ICT Centre. We appreciate your continued business.</div>
      <div style="margin-top: 3px; font-weight: 600;">This document is an official computer-generated statement of account transactions.</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto-focus print if requested
      if (window.location.search.includes('print=true')) {
        setTimeout(function() { window.print(); }, 400);
      }
    };
  </script>
</body>
</html>`;
}

export function printCustomerStatementDirect(statement: CustomerStatement): void {
  const html = generateCustomerStatementHtml(statement);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export function downloadCustomerStatementHtml(statement: CustomerStatement): void {
  const html = generateCustomerStatementHtml(statement);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Statement_${statement.customer.name.replace(/\s+/g, '_')}_${statement.period.startDate}_to_${statement.period.endDate}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
