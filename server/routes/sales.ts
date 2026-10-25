import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql, runTransaction } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const salesRouter = Router();

const saleItemSchema = z.object({
  productId: z.number().int().nullable().optional(),
  serviceId: z.number().int().nullable().optional(),
  name: z.string().min(1),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  quantity: z.number().positive(),
  unit: z.string().default('unit'),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
});

const paymentItemSchema = z.object({
  method: z.enum(['cash', 'mpesa', 'card', 'bank', 'other']),
  amount: z.number().positive(),
  reference: z.string().trim().optional(),
});

const checkoutSchema = z.object({
  customerId: z.number().int().nullable().optional(),
  items: z.array(saleItemSchema).min(1, 'Cart cannot be empty'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  payments: z.array(paymentItemSchema).min(1, 'Payment is required'),
  amountPaid: z.number().min(0),
  change: z.number().min(0).default(0),
  notes: z.string().trim().optional(),
});

// Helper to generate unique receipt number
function generateReceiptNumber(): string {
  const currentYear = new Date().getFullYear();
  const prefix = `BC-${currentYear}-`;

  // Find max receipt number for this year
  const lastSale = queryOne<{ receipt_number: string }>(
    "SELECT receipt_number FROM sales WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  let nextSequence = 1;
  if (lastSale && lastSale.receipt_number) {
    const parts = lastSale.receipt_number.split('-');
    if (parts.length >= 3) {
      const seqStr = parts[parts.length - 1];
      const parsedSeq = parseInt(seqStr, 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
}

// POST: Complete atomic sale checkout
salesRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { customerId, items, subtotal, discount, tax, total, payments, notes } = parsed.data;
  const cashierId = req.user?.userId || 1;
  const cashierName = req.user?.name || 'Cashier';
  const now = new Date().toISOString();

  // Validate settings regarding negative stock
  const settings = queryOne<any>('SELECT * FROM business_settings WHERE id = 1');
  const allowNegativeStock = settings?.allow_negative_stock === 1;

  try {
    let createdSaleId = 0;
    let receiptNumber = '';

    runTransaction(() => {
      // 1. Verify physical stock for all physical products in cart
      for (const item of items) {
        if (item.productId) {
          const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [item.productId]);
          if (!product) {
            throw new Error(`Product "${item.name}" was not found in database.`);
          }
          if (product.active !== 1) {
            throw new Error(`Product "${item.name}" is no longer active.`);
          }
          if (!allowNegativeStock && product.stock_quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for "${product.name}". Only ${product.stock_quantity} ${product.unit}(s) available.`
            );
          }
        }
      }

      // 2. Validate payment sum covers total
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.round(totalPaid * 100) < Math.round(total * 100)) {
        throw new Error(`Total payment (KSh ${totalPaid}) is less than the grand total (KSh ${total}).`);
      }

      // 3. Generate receipt number
      receiptNumber = generateReceiptNumber();

      // 4. Insert Sale
      const saleResult = runSql(`
        INSERT INTO sales (
          receipt_number, customer_id, cashier_id, subtotal, discount, tax, total, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
      `, [
        receiptNumber,
        customerId || null,
        cashierId,
        subtotal,
        discount,
        tax,
        total,
        notes || null,
        now,
        now,
      ]);

      createdSaleId = saleResult.lastInsertRowid;

      // 5. Insert Sale Items and deduct stock for products
      for (const item of items) {
        runSql(`
          INSERT INTO sale_items (
            sale_id, product_id, service_id, item_name_snapshot, unit_price_snapshot, cost_price_snapshot,
            quantity, unit, discount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          createdSaleId,
          item.productId || null,
          item.serviceId || null,
          item.name,
          item.unitPrice,
          item.costPrice,
          item.quantity,
          item.unit,
          item.discount,
          item.total,
        ]);

        // If product, reduce stock & log inventory movement
        if (item.productId) {
          const product = queryOne<any>('SELECT stock_quantity FROM products WHERE id = ?', [item.productId]);
          const prevStock = product ? product.stock_quantity : 0;
          const newStock = prevStock - item.quantity;

          runSql('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [
            newStock,
            now,
            item.productId,
          ]);

          runSql(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
            ) VALUES (?, 'sale', ?, ?, ?, ?, ?, ?)
          `, [
            item.productId,
            item.quantity,
            prevStock,
            newStock,
            `Sold in receipt #${receiptNumber}`,
            cashierId,
            now,
          ]);
        }
      }

      // 6. Insert Payments
      for (const payment of payments) {
        runSql(`
          INSERT INTO payments (sale_id, method, amount, reference, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          createdSaleId,
          payment.method,
          payment.amount,
          payment.reference || null,
          now,
        ]);
      }
    });

    // Write audit log
    createAuditLog(
      cashierId,
      req.user?.username || 'cashier',
      'create_sale',
      'sale',
      createdSaleId,
      `Completed sale #${receiptNumber} for KSh ${total} with ${items.length} item(s)`
    );

    // Fetch full receipt details for response
    const completeSale = getSaleWithDetails(createdSaleId);

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      sale: completeSale,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to complete transaction.' });
  }
});

// Helper to fetch complete sale with items, payments, customer, cashier
function getSaleWithDetails(saleId: number) {
  const sale = queryOne(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as cashier_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ?
  `, [saleId]);

  if (!sale) return null;

  const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
  const payments = queryAll('SELECT * FROM payments WHERE sale_id = ?', [saleId]);
  const settings = queryOne('SELECT * FROM business_settings WHERE id = 1');

  return {
    ...sale,
    items,
    payments,
    settings,
  };
}

// GET: List sales with filtering
salesRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const status = req.query.status ? String(req.query.status) : '';
  const cashierId = req.query.cashier_id ? Number(req.query.cashier_id) : null;
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';
  const limit = req.query.limit ? Number(req.query.limit) : 100;

  // Non-admins can only see their own sales if specified, or all sales
  let sql = `
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as cashier_name,
      (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count,
      (SELECT GROUP_CONCAT(method, ', ') FROM payments p WHERE p.sale_id = s.id) as payment_methods
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    JOIN users u ON s.cashier_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  if (cashierId) {
    sql += ' AND s.cashier_id = ?';
    params.push(cashierId);
  }

  if (startDate) {
    sql += ' AND s.created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  if (search) {
    sql += ' AND (s.receipt_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR s.notes LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p);
  }

  sql += ' ORDER BY s.created_at DESC LIMIT ?';
  params.push(limit);

  const sales = queryAll(sql, params);
  res.json({ sales });
});

// GET: Single sale details
salesRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const sale = getSaleWithDetails(id);

  if (!sale) {
    res.status(404).json({ error: 'Sale not found.' });
    return;
  }

  res.json({ sale });
});

// GET: Direct printable receipt page (can be opened in new tab or popup)
salesRouter.get('/:id/receipt', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const sale = getSaleWithDetails(id);

  if (!sale) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>Receipt Not Found</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2>Receipt Not Found</h2>
        <p>The requested transaction record does not exist.</p>
      </body></html>
    `);
    return;
  }

  const settings = sale.settings || {
    business_name: 'BRIGHT CYBER & ICT CENTRE',
    address: 'Biashara Street, Nairobi, Kenya',
    phone: '+254 712 345 678 / +254 798 765 432',
    email: 'info@brightcyber.co.ke',
    receipt_footer: 'Thank you for choosing Bright Cyber & ICT Centre!',
    mpesa_paybill_or_till: 'Buy Goods Till: 543210',
  };

  const isThermal = req.query.format !== 'a4';
  const width = isThermal ? '320px' : '700px';

  const itemsHtml = (sale.items || []).map((item: any) => `
    <tr>
      <td style="padding: 4px 2px; text-align: left; vertical-align: top;">
        <div style="font-weight: 700; color: #000;">${item.item_name_snapshot}</div>
        <div style="font-size: 10px; color: #555;">KSh ${Number(item.unit_price_snapshot).toLocaleString()} x ${item.quantity} ${item.unit || ''}</div>
      </td>
      <td style="padding: 4px 2px; text-align: center; font-family: monospace; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 4px 2px; text-align: right; font-family: monospace; vertical-align: top;">${Number(item.unit_price_snapshot).toLocaleString()}</td>
      <td style="padding: 4px 2px; text-align: right; font-family: monospace; font-weight: 700; vertical-align: top;">${Number(item.total).toLocaleString()}</td>
    </tr>
  `).join('');

  const paymentsHtml = (sale.payments || []).map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
      <span style="text-transform: uppercase; font-weight: 600;">PAID (${p.method})${p.reference ? ` [${p.reference}]` : ''}:</span>
      <span style="font-family: monospace; font-weight: 700;">KSh ${Number(p.amount).toLocaleString()}</span>
    </div>
  `).join('');

  const dateFormatted = new Date(sale.created_at).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt - ${sale.receipt_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: #000;
      background: #f0f0f0;
      font-size: 11.5px;
      line-height: 1.35;
      padding: 20px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .action-bar {
      width: ${width};
      max-width: 100%;
      background: #1e1e1e;
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .action-bar button {
      background: #C5A059;
      color: #000;
      border: none;
      padding: 6px 12px;
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
    .receipt-container {
      width: ${width};
      max-width: 100%;
      background: #fff;
      padding: 16px 14px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .font-mono { font-family: "Courier New", Courier, monospace; }
    .border-b-dashed { border-bottom: 1px dashed #666; padding-bottom: 8px; margin-bottom: 8px; }
    .border-t-dashed { border-top: 1px dashed #666; padding-top: 8px; margin-top: 8px; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { border-bottom: 1px solid #444; padding: 4px 2px; text-transform: uppercase; font-size: 10px; font-weight: 700; }
    @media print {
      body { background: transparent !important; padding: 0 !important; }
      .action-bar { display: none !important; }
      .receipt-container { width: 100% !important; max-width: 100% !important; box-shadow: none !important; border-radius: 0 !important; padding: 4px !important; margin: 0 !important; }
      @page {
        margin: ${isThermal ? '2mm' : '8mm'};
        size: ${isThermal ? '80mm auto' : 'auto'};
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <span style="font-size: 11px; font-weight: 600; color: #e0e0e0;">Receipt #${sale.receipt_number}</span>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()">🖨️ Print Now</button>
    </div>
  </div>

  <div class="receipt-container" id="receipt">
    <!-- Header -->
    <div class="text-center border-b-dashed">
      <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
        ${settings.business_name || 'BRIGHT CYBER & ICT CENTRE'}
      </div>
      <div style="font-size: 10px; color: #333;">${settings.address || 'Biashara Street, Nairobi, Kenya'}</div>
      <div style="font-size: 10px; color: #333;">Tel: ${settings.phone || '+254 712 345 678'}</div>
      <div style="font-size: 10px; color: #333;">Email: ${settings.email || 'info@brightcyber.co.ke'}</div>
    </div>

    <!-- Metadata -->
    <div class="border-b-dashed" style="font-size: 11px;">
      <div class="flex-between">
        <span>Receipt No:</span>
        <span class="bold font-mono">${sale.receipt_number}</span>
      </div>
      <div class="flex-between">
        <span>Date:</span>
        <span class="font-mono">${dateFormatted}</span>
      </div>
      <div class="flex-between">
        <span>Cashier / Staff:</span>
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
            <th style="text-align: left;">Description</th>
            <th style="text-align: center; width: 32px;">Qty</th>
            <th style="text-align: right; width: 60px;">Rate</th>
            <th style="text-align: right; width: 70px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="border-b-dashed" style="font-size: 11px;">
      <div class="flex-between" style="margin-bottom: 2px;">
        <span>Subtotal:</span>
        <span class="font-mono">KSh ${Number(sale.subtotal).toLocaleString()}</span>
      </div>
      ${(sale.discount || 0) > 0 ? `
      <div class="flex-between" style="margin-bottom: 2px; color: #444;">
        <span>Discount:</span>
        <span class="font-mono">- KSh ${Number(sale.discount).toLocaleString()}</span>
      </div>` : ''}
      ${(sale.tax || 0) > 0 ? `
      <div class="flex-between" style="margin-bottom: 2px; color: #444;">
        <span>Tax:</span>
        <span class="font-mono">KSh ${Number(sale.tax).toLocaleString()}</span>
      </div>` : ''}
      <div class="flex-between border-t-dashed bold" style="font-size: 14px; margin-top: 4px; padding-top: 4px;">
        <span>TOTAL SETTLED:</span>
        <span class="font-mono">KSh ${Number(sale.total).toLocaleString()}</span>
      </div>
    </div>

    <!-- Payments -->
    <div class="border-b-dashed">
      ${paymentsHtml}
    </div>

    <!-- Footer -->
    <div class="text-center" style="font-size: 10px; color: #222; padding-top: 4px;">
      <div style="font-style: italic; margin-bottom: 4px;">${settings.receipt_footer || 'Thank you for choosing Bright Cyber & ICT Centre!'}</div>
      ${settings.mpesa_paybill_or_till ? `<div style="font-weight: 700; font-size: 10.5px; margin-bottom: 3px;">${settings.mpesa_paybill_or_till}</div>` : ''}
      <div style="font-size: 8.5px; color: #666; font-family: monospace; letter-spacing: 1px;">*** BRIGHT CYBER & ICT CENTRE ***</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.error(e);
        }
      }, 300);
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// POST: Void sale (Admin required)
salesRouter.post('/:id/void', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { reason } = req.body;

  if (!reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'A valid reason for voiding this transaction is required.' });
    return;
  }

  const sale = queryOne<any>('SELECT * FROM sales WHERE id = ?', [id]);
  if (!sale) {
    res.status(404).json({ error: 'Sale record not found.' });
    return;
  }

  if (sale.status === 'voided') {
    res.status(400).json({ error: 'This transaction is already voided.' });
    return;
  }

  const now = new Date().toISOString();
  const items = queryAll<any>('SELECT * FROM sale_items WHERE sale_id = ?', [id]);

  runTransaction(() => {
    // 1. Mark sale as voided
    runSql('UPDATE sales SET status = "voided", notes = COALESCE(notes || " | ", "") || ?, updated_at = ? WHERE id = ?', [
      `VOIDED: ${reason.trim()}`,
      now,
      id,
    ]);

    // 2. Return physical products back to inventory
    for (const item of items) {
      if (item.product_id) {
        const product = queryOne<any>('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
        if (product) {
          const prevStock = product.stock_quantity;
          const newStock = prevStock + item.quantity;

          runSql('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [
            newStock,
            now,
            item.product_id,
          ]);

          runSql(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
            ) VALUES (?, 'refund_return', ?, ?, ?, ?, ?, ?)
          `, [
            item.product_id,
            item.quantity,
            prevStock,
            newStock,
            `Transaction #${sale.receipt_number} Voided: ${reason}`,
            req.user?.userId || 1,
            now,
          ]);
        }
      }
    }
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'void_sale',
    'sale',
    id,
    `Admin voided transaction #${sale.receipt_number} (KSh ${sale.total}). Reason: ${reason}`
  );

  res.json({ success: true, message: `Transaction #${sale.receipt_number} has been voided and stock restored.` });
});

// POST: Refund sale (Admin required)
salesRouter.post('/:id/refund', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { reason, returnStock = true } = req.body;

  if (!reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'A valid reason for processing this refund is required.' });
    return;
  }

  const sale = queryOne<any>('SELECT * FROM sales WHERE id = ?', [id]);
  if (!sale) {
    res.status(404).json({ error: 'Sale record not found.' });
    return;
  }

  if (sale.status === 'refunded') {
    res.status(400).json({ error: 'This transaction is already refunded.' });
    return;
  }

  const now = new Date().toISOString();
  const items = queryAll<any>('SELECT * FROM sale_items WHERE sale_id = ?', [id]);

  runTransaction(() => {
    // 1. Mark sale as refunded
    runSql('UPDATE sales SET status = "refunded", notes = COALESCE(notes || " | ", "") || ?, updated_at = ? WHERE id = ?', [
      `REFUNDED: ${reason.trim()}`,
      now,
      id,
    ]);

    // 2. Return physical items to inventory if selected
    if (returnStock) {
      for (const item of items) {
        if (item.product_id) {
          const product = queryOne<any>('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
          if (product) {
            const prevStock = product.stock_quantity;
            const newStock = prevStock + item.quantity;

            runSql('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [
              newStock,
              now,
              item.product_id,
            ]);

            runSql(`
              INSERT INTO inventory_movements (
                product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
              ) VALUES (?, 'refund_return', ?, ?, ?, ?, ?, ?)
            `, [
              item.product_id,
              item.quantity,
              prevStock,
              newStock,
              `Transaction #${sale.receipt_number} Refunded: ${reason}`,
              req.user?.userId || 1,
              now,
            ]);
          }
        }
      }
    }
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'refund_sale',
    'sale',
    id,
    `Admin refunded transaction #${sale.receipt_number} (KSh ${sale.total}). Reason: ${reason}`
  );

  res.json({ success: true, message: `Transaction #${sale.receipt_number} has been marked as refunded.` });
});
