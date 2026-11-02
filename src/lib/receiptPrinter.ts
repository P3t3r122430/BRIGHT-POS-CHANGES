import { Sale, BusinessSettings } from '../types';
import { formatKsh, formatDate, formatNumber } from './utils';
import html2canvas from 'html2canvas';

export function generateReceiptHtml(
  sale: Sale,
  settings: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal'
): string {
  const businessName = settings?.business_name || 'BRIGHT CYBER & ICT CENTRE';
  const address = settings?.address || 'Biashara Street, Next to Central Plaza, Nairobi, Kenya';
  const phone = settings?.phone || '+254 712 345 678 / +254 798 765 432';
  const email = settings?.email || 'info@brightcyber.co.ke';
  const receiptFooter = settings?.receipt_footer || 'Thank you for choosing Bright Cyber & ICT Centre. Quality ICT Services!';

  const servPaybill = settings?.services_mpesa_paybill || '4298298';
  const servAccount = settings?.services_mpesa_account || '0350494';
  const prodPaybill = settings?.products_mpesa_paybill || '247247';
  const prodAccount = settings?.products_mpesa_account || '768726';

  const hasServices = (sale.items || []).some(i => Boolean(i.service_id) || i.item_type === 'service');
  const hasProducts = (sale.items || []).some(i => Boolean(i.product_id) || i.item_type === 'product');

  let mpesaHtml = '';
  if (hasServices && !hasProducts) {
    mpesaHtml = `
      <div style="margin: 4px 0; padding: 4px; border: 1px dashed #444; background: #fafafa;">
        <div style="font-weight: 800; font-size: 10px; color: #000; letter-spacing: 0.5px;">LIPA NA M-PESA (SERVICES)</div>
        <div style="font-size: 10px; font-family: monospace; font-weight: 700; margin-top: 1px;">
          PAYBILL: <strong>${servPaybill}</strong> &nbsp;|&nbsp; ACC: <strong>${servAccount}</strong>
        </div>
      </div>`;
  } else if (hasProducts && !hasServices) {
    mpesaHtml = `
      <div style="margin: 4px 0; padding: 4px; border: 1px dashed #444; background: #fafafa;">
        <div style="font-weight: 800; font-size: 10px; color: #000; letter-spacing: 0.5px;">LIPA NA M-PESA (PRODUCTS)</div>
        <div style="font-size: 10px; font-family: monospace; font-weight: 700; margin-top: 1px;">
          PAYBILL: <strong>${prodPaybill}</strong> &nbsp;|&nbsp; ACC: <strong>${prodAccount}</strong>
        </div>
      </div>`;
  } else {
    mpesaHtml = `
      <div style="margin: 4px 0; padding: 4px; border: 1px dashed #444; background: #fafafa;">
        <div style="font-weight: 800; font-size: 9.5px; color: #000; letter-spacing: 0.5px;">LIPA NA M-PESA CHANNELS</div>
        <div style="font-size: 9px; font-family: monospace; font-weight: 700; margin-top: 1px;">
          Services: Paybill <strong>${servPaybill}</strong> | Acc: <strong>${servAccount}</strong>
        </div>
        <div style="font-size: 9px; font-family: monospace; font-weight: 700;">
          Products: Paybill <strong>${prodPaybill}</strong> | Acc: <strong>${prodAccount}</strong>
        </div>
      </div>`;
  }

  const isThermal = format === 'thermal';
  const widthStyle = isThermal ? 'max-width: 320px; width: 100%; margin: 0 auto;' : 'max-width: 760px; width: 100%; margin: 0 auto;';

  const itemsHtml = (sale.items || []).map((item) => `
    <tr>
      <td style="padding: 4px 2px; text-align: left; vertical-align: top;">
        <div style="font-weight: 700; color: #000;">${item.item_name_snapshot}</div>
        <div style="font-size: 9.5px; color: #555;">${formatKsh(item.unit_price_snapshot)} x ${item.quantity} ${item.unit || ''}</div>
      </td>
      <td style="padding: 4px 2px; text-align: center; font-family: monospace; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 4px 2px; text-align: right; font-family: monospace; vertical-align: top;">${formatNumber(item.unit_price_snapshot)}</td>
      <td style="padding: 4px 2px; text-align: right; font-family: monospace; font-weight: 700; vertical-align: top;">${formatNumber(item.total)}</td>
    </tr>
  `).join('');

  const paymentsHtml = (sale.payments || []).map((p) => `
    <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 2px;">
      <span style="text-transform: uppercase; font-weight: 600;">PAID (${p.method})${p.reference ? ` [${p.reference}]` : ''}:</span>
      <span style="font-family: monospace; font-weight: 700;">${formatKsh(p.amount)}</span>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${sale.receipt_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
      color: #000;
      background: #f4f4f4;
      font-size: 11px;
      line-height: 1.35;
      padding: 16px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-bar {
      ${widthStyle}
      background: #111;
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .print-btn {
      background: #C5A059;
      color: #000;
      border: none;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
    }
    .receipt-box {
      ${widthStyle}
      background: #fff;
      padding: 14px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: 700; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .border-b-dashed { border-bottom: 1px dashed #555; padding-bottom: 8px; margin-bottom: 8px; }
    .border-t-dashed { border-top: 1px dashed #555; padding-top: 8px; margin-top: 8px; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { border-bottom: 1px solid #444; padding: 4px 2px; text-transform: uppercase; font-size: 9.5px; font-weight: 700; }
    @media print {
      body { background: transparent !important; padding: 0 !important; }
      .print-bar { display: none !important; }
      .receipt-box { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 2px !important; box-shadow: none !important; }
      @page {
        margin: ${isThermal ? '2mm' : '8mm'};
        size: ${isThermal ? '80mm auto' : 'auto'};
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span style="font-size: 11px; font-weight: 600;">Receipt #${sale.receipt_number}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
  </div>

  <div class="receipt-box">
    <!-- Header -->
    <div class="text-center border-b-dashed">
      <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
        ${businessName}
      </div>
      <div style="font-size: 9.5px; color: #333;">${address}</div>
      <div style="font-size: 9.5px; color: #333;">Tel: ${phone}</div>
      <div style="font-size: 9.5px; color: #333;">Email: ${email}</div>
    </div>

    <!-- Metadata -->
    <div class="border-b-dashed" style="font-size: 10.5px;">
      <div class="flex-between">
        <span>Receipt Number:</span>
        <span class="bold font-mono">${sale.receipt_number}</span>
      </div>
      <div class="flex-between">
        <span>Date & Time:</span>
        <span class="font-mono">${formatDate(sale.created_at)}</span>
      </div>
      <div class="flex-between">
        <span>Attendant / Cashier:</span>
        <span>${sale.cashier_name || 'Staff'}</span>
      </div>
      <div class="flex-between">
        <span>Client:</span>
        <span>${sale.customer_name || 'Walk-in Client'}</span>
      </div>
      ${sale.status === 'voided' ? '<div style="color: red; font-weight: bold; text-align: center; margin-top: 4px;">*** VOIDED TRANSACTION ***</div>' : ''}
      ${sale.status === 'refunded' ? '<div style="color: #b85d00; font-weight: bold; text-align: center; margin-top: 4px;">*** REFUNDED TRANSACTION ***</div>' : ''}
    </div>

    <!-- Items -->
    <div class="border-b-dashed">
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Item Description</th>
            <th style="text-align: center; width: 30px;">Qty</th>
            <th style="text-align: right; width: 55px;">Rate</th>
            <th style="text-align: right; width: 65px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="border-b-dashed" style="font-size: 10.5px;">
      <div class="flex-between" style="margin-bottom: 2px;">
        <span>Subtotal:</span>
        <span class="font-mono">${formatKsh(sale.subtotal)}</span>
      </div>
      ${(sale.discount || 0) > 0 ? `
      <div class="flex-between" style="margin-bottom: 2px; color: #444;">
        <span>Discount:</span>
        <span class="font-mono">- ${formatKsh(sale.discount)}</span>
      </div>` : ''}
      ${(sale.tax || 0) > 0 ? `
      <div class="flex-between" style="margin-bottom: 2px; color: #444;">
        <span>Tax Amount:</span>
        <span class="font-mono">${formatKsh(sale.tax)}</span>
      </div>` : ''}
      <div class="flex-between border-t-dashed bold" style="font-size: 13px; margin-top: 4px; padding-top: 4px;">
        <span>TOTAL SETTLED:</span>
        <span class="font-mono">${formatKsh(sale.total)}</span>
      </div>
    </div>

    <!-- Payments -->
    <div class="border-b-dashed">
      ${paymentsHtml}
    </div>

    <!-- Footer -->
    <div class="text-center" style="font-size: 9.5px; color: #222; padding-top: 4px;">
      <div style="font-style: italic; margin-bottom: 4px;">${receiptFooter}</div>
      ${mpesaHtml}
      <div style="font-size: 8px; color: #666; font-family: monospace; letter-spacing: 1px; margin-top: 4px;">*** BRIGHT CYBER & ICT CENTRE ***</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {}
      }, 250);
    };
  </script>
</body>
</html>`;
}

export function generateReceiptText(
  sale: Sale,
  settings: Partial<BusinessSettings> | null
): string {
  const bName = settings?.business_name || 'BRIGHT CYBER & ICT CENTRE';
  const address = settings?.address || 'Biashara Street, Nairobi, Kenya';
  const phone = settings?.phone || '+254 712 345 678';
  const footer = settings?.receipt_footer || 'Thank you for choosing us!';

  const servPaybill = settings?.services_mpesa_paybill || '4298298';
  const servAccount = settings?.services_mpesa_account || '0350494';
  const prodPaybill = settings?.products_mpesa_paybill || '247247';
  const prodAccount = settings?.products_mpesa_account || '768726';

  const hasServices = (sale.items || []).some(i => Boolean(i.service_id) || i.item_type === 'service');
  const hasProducts = (sale.items || []).some(i => Boolean(i.product_id) || i.item_type === 'product');

  let mpesaText = '';
  if (hasServices && !hasProducts) {
    mpesaText = `LIPA NA M-PESA (SERVICES):\nPAYBILL NO: ${servPaybill}   ACCOUNT NO: ${servAccount}\n`;
  } else if (hasProducts && !hasServices) {
    mpesaText = `LIPA NA M-PESA (PRODUCTS):\nPAYBILL NO: ${prodPaybill}   ACCOUNT NO: ${prodAccount}\n`;
  } else {
    mpesaText = `LIPA NA M-PESA CHANNELS:\nServices: Paybill ${servPaybill} | Acc: ${servAccount}\nProducts: Paybill ${prodPaybill} | Acc: ${prodAccount}\n`;
  }

  const divider = '==========================================';
  const dashed = '------------------------------------------';

  let txt = `${divider}\n`;
  txt += `       ${bName.toUpperCase()}\n`;
  txt += `       ${address}\n`;
  txt += `       Tel: ${phone}\n`;
  txt += `${divider}\n`;
  txt += `RECEIPT NO: ${sale.receipt_number}\n`;
  txt += `DATE:       ${formatDate(sale.created_at)}\n`;
  txt += `CLIENT:     ${sale.customer_name || 'Walk-in Client'}\n`;
  txt += `CASHIER:    ${sale.cashier_name || 'Staff'}\n`;
  txt += `${dashed}\n`;
  txt += `ITEM                      QTY   RATE    TOTAL\n`;
  txt += `${dashed}\n`;

  for (const item of sale.items || []) {
    const name = item.item_name_snapshot.padEnd(24, ' ').substring(0, 24);
    const qty = String(item.quantity).padStart(3, ' ');
    const rate = String(Math.round(item.unit_price_snapshot)).padStart(6, ' ');
    const total = String(Math.round(item.total)).padStart(8, ' ');
    txt += `${name} ${qty} ${rate} ${total}\n`;
  }

  txt += `${dashed}\n`;
  txt += `SUBTOTAL:                    ${formatKsh(sale.subtotal)}\n`;
  if ((sale.discount || 0) > 0) {
    txt += `DISCOUNT:                   -${formatKsh(sale.discount)}\n`;
  }
  if ((sale.tax || 0) > 0) {
    txt += `TAX:                         ${formatKsh(sale.tax)}\n`;
  }
  txt += `TOTAL SETTLED:               ${formatKsh(sale.total)}\n`;
  txt += `${dashed}\n`;

  for (const p of sale.payments || []) {
    txt += `PAID (${p.method.toUpperCase()}):       ${formatKsh(p.amount)}${p.reference ? ` [${p.reference}]` : ''}\n`;
  }

  txt += `${divider}\n`;
  txt += `${footer}\n`;
  if (mpesaText) txt += `${mpesaText}`;
  txt += `${divider}\n`;

  return txt;
}

export async function copyReceiptToClipboard(
  sale: Sale,
  settings: Partial<BusinessSettings> | null
): Promise<boolean> {
  const text = generateReceiptText(sale, settings);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy receipt text:', err);
    return false;
  }
}

export function downloadReceiptFile(
  sale: Sale,
  settings: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal'
): void {
  const html = generateReceiptHtml(sale, settings, format);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt-${sale.receipt_number}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openReceiptInNewTab(
  sale: Sale,
  settings: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal'
): void {
  if (sale.id) {
    // If sale has an ID in backend, open direct backend receipt endpoint (never blocked)
    window.open(`/api/sales/${sale.id}/receipt?format=${format}`, '_blank');
    return;
  }

  // Fallback to Blob URL
  const html = generateReceiptHtml(sale, settings, format);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function printReceipt(
  sale: Sale,
  settings: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal'
): void {
  // Method 1: If sale has an ID, opening /api/sales/:id/receipt or blob is most reliable in iframes
  const htmlContent = generateReceiptHtml(sale, settings, format);

  // Try iframe print first
  try {
    let iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
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
        } catch (iframeErr) {
          console.warn('Iframe print restricted, opening new tab:', iframeErr);
          openReceiptInNewTab(sale, settings, format);
        }
      }, 250);
      return;
    }
  } catch (err) {
    console.warn('Iframe print setup error:', err);
  }

  // Fallback: Open in new tab which is outside the iframe sandbox
  openReceiptInNewTab(sale, settings, format);
}

export function getWhatsAppReceiptUrl(
  sale: Sale,
  settings: Partial<BusinessSettings> | null,
  phoneNumber?: string | null
): string {
  const text = generateReceiptText(sale, settings);
  let cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '254' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.replace('+', '');
  } else if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) && cleanPhone.length === 9) {
    cleanPhone = '254' + cleanPhone;
  }
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function generateReceiptCanvas(
  saleOrElement: Sale | HTMLElement | string,
  settings?: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal'
): Promise<HTMLCanvasElement | null> {
  const isThermal = format === 'thermal';
  const widthPx = isThermal ? 380 : 720;

  let sale: Sale | null = null;
  if (saleOrElement && typeof saleOrElement === 'object' && 'receipt_number' in saleOrElement) {
    sale = saleOrElement as Sale;
  }

  // Create an offscreen wrapper attached to DOM so html2canvas computes typography and layout accurately
  const wrapper = document.createElement('div');
  wrapper.id = 'receipt-render-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = `${widthPx}px`;
  wrapper.style.zIndex = '-99999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.opacity = '1';
  wrapper.style.overflow = 'visible';

  let targetNode: HTMLElement;

  if (sale) {
    targetNode = document.createElement('div');
    targetNode.id = 'receipt-capture-content';
    targetNode.style.width = `${widthPx}px`;
    targetNode.style.backgroundColor = '#ffffff';
    targetNode.style.color = '#000000';
    targetNode.style.padding = '24px 20px 48px 20px';
    targetNode.style.fontFamily = '"Courier New", Courier, monospace, monospace';
    targetNode.style.fontSize = '11px';
    targetNode.style.lineHeight = '1.35';
    targetNode.style.boxSizing = 'border-box';
    targetNode.style.position = 'relative';

    const bName = settings?.business_name || 'BRIGHT CYBER & ICT CENTRE';
    const address = settings?.address || 'Biashara Street, Nairobi, Kenya';
    const phone = settings?.phone || '+254 712 345 678';
    const email = settings?.email || 'info@brightcyber.co.ke';
    const footer = settings?.receipt_footer || 'Thank you for choosing Bright Cyber & ICT Centre!';
    const servPaybill = settings?.services_mpesa_paybill || '4298298';
    const servAccount = settings?.services_mpesa_account || '0350494';
    const prodPaybill = settings?.products_mpesa_paybill || '247247';
    const prodAccount = settings?.products_mpesa_account || '768726';

    const hasServices = (sale.items || []).some(i => Boolean(i.service_id) || i.item_type === 'service');
    const hasProducts = (sale.items || []).some(i => Boolean(i.product_id) || i.item_type === 'product');

    let mpesaHtml = '';
    if (hasServices && !hasProducts) {
      mpesaHtml = `
        <div style="margin-top: 10px; padding: 8px; border: 1.5px dashed #333333; background-color: #fafafa; font-size: 10px; text-align: center;">
          <div style="font-weight: bold; margin-bottom: 2px;">LIPA NA M-PESA (SERVICES)</div>
          <div>PAYBILL: <strong>${servPaybill}</strong> &nbsp;|&nbsp; ACC: <strong>${servAccount}</strong></div>
        </div>`;
    } else if (hasProducts && !hasServices) {
      mpesaHtml = `
        <div style="margin-top: 10px; padding: 8px; border: 1.5px dashed #333333; background-color: #fafafa; font-size: 10px; text-align: center;">
          <div style="font-weight: bold; margin-bottom: 2px;">LIPA NA M-PESA (PRODUCTS)</div>
          <div>PAYBILL: <strong>${prodPaybill}</strong> &nbsp;|&nbsp; ACC: <strong>${prodAccount}</strong></div>
        </div>`;
    } else {
      mpesaHtml = `
        <div style="margin-top: 10px; padding: 8px; border: 1.5px dashed #333333; background-color: #fafafa; font-size: 9.5px; text-align: center;">
          <div style="font-weight: bold; margin-bottom: 2px;">LIPA NA M-PESA</div>
          <div>Services &bull; Paybill: <strong>${servPaybill}</strong> &bull; Acc: <strong>${servAccount}</strong></div>
          <div style="margin-top: 3px;">Products &bull; Paybill: <strong>${prodPaybill}</strong> &bull; Acc: <strong>${prodAccount}</strong></div>
        </div>`;
    }

    targetNode.innerHTML = `
      <div style="text-align: center; border-bottom: 1.5px dashed #444444; padding-bottom: 10px; margin-bottom: 10px;">
        <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #000000;">${bName}</div>
        <div style="font-size: 10px; color: #222222; margin-top: 3px;">${address}</div>
        <div style="font-size: 10px; color: #222222;">Tel: ${phone}</div>
        <div style="font-size: 10px; color: #222222;">Email: ${email}</div>
      </div>

      <div style="border-bottom: 1.5px dashed #444444; padding-bottom: 10px; margin-bottom: 10px; font-size: 10.5px; color: #000000;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Receipt No:</span><strong style="font-size: 11.5px; font-family: monospace;">${sale.receipt_number}</strong></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Date & Time:</span><span style="font-family: monospace;">${formatDate(sale.created_at)}</span></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Attendant / Cashier:</span><span>${sale.cashier_name || 'Staff'}</span></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Client:</span><span>${sale.customer_name || 'Walk-in Client'}</span></div>
        ${sale.customer_phone ? `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Client Phone:</span><span style="font-family: monospace;">${sale.customer_phone}</span></div>` : ''}
        ${sale.status === 'voided' ? '<div style="color: #dc2626; font-weight: bold; text-align: center; margin-top: 6px; padding: 4px; border: 1.5px solid #dc2626; background-color: #fee2e2;">*** VOIDED TRANSACTION ***</div>' : ''}
        ${sale.status === 'refunded' ? '<div style="color: #b45309; font-weight: bold; text-align: center; margin-top: 6px; padding: 4px; border: 1.5px solid #b45309; background-color: #fef3c7;">*** REFUNDED TRANSACTION ***</div>' : ''}
      </div>

      <div style="border-bottom: 1.5px dashed #444444; padding-bottom: 10px; margin-bottom: 10px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left; color: #000000;">
          <thead>
            <tr style="border-bottom: 1.5px solid #333333; font-weight: bold; text-transform: uppercase; font-size: 9.5px;">
              <th style="padding-bottom: 5px; text-align: left;">Item Description</th>
              <th style="padding-bottom: 5px; text-align: center; width: 40px;">Qty</th>
              <th style="padding-bottom: 5px; text-align: right; width: 68px;">Price</th>
              <th style="padding-bottom: 5px; text-align: right; width: 78px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map((it) => `
              <tr style="border-bottom: 1px dotted #cccccc;">
                <td style="padding: 5px 0; font-weight: 600; word-break: break-word;">${it.item_name_snapshot}</td>
                <td style="padding: 5px 0; text-align: center; font-family: monospace;">${it.quantity}</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace;">${formatNumber(it.unit_price_snapshot)}</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold; font-family: monospace;">${formatNumber(it.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="border-bottom: 1.5px dashed #444444; padding-bottom: 10px; margin-bottom: 10px; font-size: 11px; color: #000000;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span>Subtotal:</span><span style="font-family: monospace;">${formatKsh(sale.subtotal)}</span></div>
        ${(sale.discount || 0) > 0 ? `<div style="display: flex; justify-content: space-between; color: #333333; margin-bottom: 3px;"><span>Discount:</span><span style="font-family: monospace;">-${formatKsh(sale.discount)}</span></div>` : ''}
        ${(sale.tax || 0) > 0 ? `<div style="display: flex; justify-content: space-between; color: #333333; margin-bottom: 3px;"><span>Tax / VAT:</span><span style="font-family: monospace;">${formatKsh(sale.tax)}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; border-top: 1.5px dashed #444444; padding-top: 6px; margin-top: 6px;">
          <span>TOTAL SETTLED:</span>
          <span style="font-family: monospace;">${formatKsh(sale.total)}</span>
        </div>
      </div>

      <div style="border-bottom: 1.5px dashed #444444; padding-bottom: 8px; margin-bottom: 10px; font-size: 10.5px; color: #000000;">
        ${(sale.payments || []).map((p) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="text-transform: uppercase;">Paid (${p.method})${p.reference ? ` [${p.reference}]` : ''}:</span>
            <strong style="font-family: monospace;">${formatKsh(p.amount)}</strong>
          </div>
        `).join('')}
      </div>

      ${sale.notes ? `
        <div style="border-bottom: 1.5px dashed #444444; padding-bottom: 8px; margin-bottom: 10px; font-size: 10px; background-color: #f7f7f7; padding: 8px; border-radius: 4px; color: #000000;">
          <strong>Instructions / Note:</strong> ${sale.notes}
        </div>
      ` : ''}

      <div style="text-align: center; font-size: 10px; color: #222222; margin-top: 6px;">
        <div style="font-style: italic; margin-bottom: 4px;">${footer}</div>
        ${mpesaHtml}
        <div style="font-size: 9px; color: #555555; letter-spacing: 1.5px; margin-top: 10px; font-family: monospace;">*** BRIGHT CYBER & ICT CENTRE ***</div>
      </div>
      <div style="height: 24px;"></div>
    `;
  } else {
    // Fallback: If passed a string ID or element directly
    const elem: HTMLElement | null =
      typeof saleOrElement === 'string'
        ? document.getElementById(saleOrElement)
        : saleOrElement instanceof HTMLElement
        ? saleOrElement
        : null;
    if (!elem) return null;
    targetNode = elem.cloneNode(true) as HTMLElement;
    targetNode.style.width = `${widthPx}px`;
    targetNode.style.height = 'auto';
    targetNode.style.maxHeight = 'none';
    targetNode.style.overflow = 'visible';
    targetNode.style.backgroundColor = '#ffffff';
    targetNode.style.color = '#000000';
    targetNode.style.padding = '24px 20px 48px 20px';
  }

  wrapper.appendChild(targetNode);
  document.body.appendChild(wrapper);

  try {
    // Give browser a short frame for layout calculation
    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await html2canvas(targetNode, {
      scale: 2, // 2x Retina clarity
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
    });

    return canvas;
  } catch (err) {
    console.error('Failed to generate receipt canvas:', err);
    return null;
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

export async function downloadReceiptAsPhoto(
  saleOrElement: Sale | HTMLElement | string,
  settings?: Partial<BusinessSettings> | null,
  format: 'thermal' | 'a4' = 'thermal',
  imageType: 'jpeg' | 'png' = 'jpeg'
): Promise<boolean> {
  const canvas = await generateReceiptCanvas(saleOrElement, settings, format);
  if (!canvas) {
    console.error('Canvas generation failed');
    return false;
  }

  let receiptNo = 'Receipt';
  if (saleOrElement && typeof saleOrElement === 'object' && 'receipt_number' in saleOrElement) {
    receiptNo = (saleOrElement as Sale).receipt_number;
  }

  try {
    const ext = imageType === 'jpeg' ? 'jpeg' : 'png';
    const mime = imageType === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = imageType === 'jpeg' ? 0.95 : 1;
    const dataUrl = canvas.toDataURL(mime, quality);

    const link = document.createElement('a');
    link.download = `Receipt-${receiptNo}.${ext}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (err) {
    console.error('Failed to download receipt photo:', err);
    return false;
  }
}

export interface WhatsAppImageShareResult {
  success: boolean;
  method: 'native-share' | 'clipboard-and-web' | 'download-and-web' | 'failed';
  message?: string;
}

export async function shareReceiptImageOnWhatsApp(
  sale: Sale,
  settings?: Partial<BusinessSettings> | null,
  phoneNumber?: string | null,
  format: 'thermal' | 'a4' = 'thermal'
): Promise<WhatsAppImageShareResult> {
  const canvas = await generateReceiptCanvas(sale, settings, format);
  if (!canvas) {
    return { success: false, method: 'failed', message: 'Could not generate receipt image.' };
  }

  const bName = settings?.business_name || 'Bright Cyber & ICT Centre';
  let cleanPhone = (phoneNumber || sale.customer_phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '254' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.replace('+', '');
  } else if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) && cleanPhone.length === 9) {
    cleanPhone = '254' + cleanPhone;
  }

  const caption = `🧾 *Receipt #${sale.receipt_number}*\n🏢 *${bName}*\n💰 *Total Settled:* ${formatKsh(sale.total)}\n📅 ${formatDate(sale.created_at)}\nThank you for choosing Bright Cyber & ICT Centre!`;

  // 1. Try Mobile Web Share API with Files (Android Chrome, iOS Safari, etc.)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );

      if (blob) {
        const file = new File([blob], `Receipt-${sale.receipt_number}.jpeg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Receipt #${sale.receipt_number}`,
            text: caption,
          });
          return {
            success: true,
            method: 'native-share',
            message: 'Sharing sheet opened. Select WhatsApp to send the receipt photo.',
          };
        }
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'native-share', message: 'Share dialogue closed.' };
      }
      console.warn('Native share failed, falling back to desktop/clipboard workflow:', shareErr);
    }
  }

  // 2. Desktop Workflow: Copy Image to Clipboard & Auto-Download & Open WhatsApp Web
  let copiedToClipboard = false;
  try {
    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (pngBlob && navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      copiedToClipboard = true;
    }
  } catch (clipErr) {
    console.warn('Clipboard writeImage failed:', clipErr);
  }

  // Also auto-download the receipt JPEG image so the user has the physical photo file immediately
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `Receipt-${sale.receipt_number}.jpeg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (downloadErr) {
    console.warn('Auto download failed:', downloadErr);
  }

  // Open WhatsApp Web with caption
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(caption)}`
    : `https://wa.me/?text=${encodeURIComponent(caption)}`;
  window.open(waUrl, '_blank');

  return {
    success: true,
    method: copiedToClipboard ? 'clipboard-and-web' : 'download-and-web',
    message: copiedToClipboard
      ? 'Receipt image copied to clipboard & downloaded! In WhatsApp, simply press Ctrl+V (or Paste) to send the photo.'
      : 'Receipt image downloaded! You can attach or drag-and-drop it into WhatsApp.',
  };
}


