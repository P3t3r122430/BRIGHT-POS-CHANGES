import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const customersRouter = Router();

// Get customers with total spend and transaction count
customersRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';

  let sql = `
    SELECT c.*,
      COUNT(s.id) as total_purchases,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total ELSE 0 END), 0) as total_spend,
      MAX(s.created_at) as last_purchase_date
    FROM customers c
    LEFT JOIN sales s ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.notes LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p);
  }

  sql += ' GROUP BY c.id ORDER BY c.name ASC';

  const customers = queryAll(sql, params);
  res.json({ customers });
});

// Get customer profile + purchase history
customersRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);

  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const sales = queryAll(`
    SELECT s.*, u.name as cashier_name,
      (SELECT GROUP_CONCAT(item_name_snapshot, ', ') FROM sale_items si WHERE si.sale_id = s.id) as items_summary,
      (SELECT GROUP_CONCAT(method, ', ') FROM payments p WHERE p.sale_id = s.id) as payment_methods
    FROM sales s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC
  `, [id]);

  res.json({ customer, sales });
});

// GET: Customer Statement (Periodic Ledger Statement)
customersRouter.get('/:id/statement', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);

  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';

  let dateFilter = '';
  const params: any[] = [id];

  if (startDate) {
    dateFilter += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  const sales = queryAll(`
    SELECT
      s.id,
      s.receipt_number,
      s.created_at,
      s.subtotal,
      s.discount,
      s.total,
      s.status,
      u.name as cashier_name,
      (SELECT GROUP_CONCAT(item_name_snapshot, ', ') FROM sale_items si WHERE si.sale_id = s.id) as items_summary,
      (SELECT GROUP_CONCAT(method, ', ') FROM payments p WHERE p.sale_id = s.id) as payment_methods,
      (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.sale_id = s.id) as amount_paid
    FROM sales s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.customer_id = ? AND s.status != 'voided' ${dateFilter}
    ORDER BY s.created_at ASC
  `, params);

  const settings = queryOne('SELECT * FROM business_settings WHERE id = 1');

  let runningTotal = 0;
  let totalPurchases = 0;
  let totalPayments = 0;

  const statementLines = sales.map((sale: any) => {
    const isCompleted = sale.status === 'completed';
    const debit = isCompleted ? sale.total : 0;
    const payment = isCompleted ? (sale.amount_paid || sale.total) : 0;
    
    totalPurchases += debit;
    totalPayments += payment;
    runningTotal += debit;

    return {
      id: sale.id,
      receiptNumber: sale.receipt_number,
      date: sale.created_at,
      description: sale.items_summary || 'General ICT Services & Goods',
      status: sale.status,
      paymentMethod: sale.payment_methods || 'Cash',
      cashier: sale.cashier_name,
      debit,
      payment,
      balance: runningTotal,
    };
  });

  res.json({
    statement: {
      customer: {
        id: customer.id,
        customerIdFormatted: `CUST-${String(customer.id).padStart(4, '0')}`,
        name: customer.name,
        phone: customer.phone || 'N/A',
        email: customer.email || 'N/A',
        address: customer.address || 'N/A',
        registeredDate: customer.created_at,
      },
      settings: settings || {
        business_name: 'BRIGHT CYBER & ICT CENTRE',
        address: 'Biashara Street, Nairobi, Kenya',
        phone: '+254 712 345 678',
        email: 'info@brightcyber.co.ke',
      },
      period: {
        startDate: startDate || 'Beginning of record',
        endDate: endDate || new Date().toISOString().split('T')[0],
      },
      lines: statementLines,
      summary: {
        openingBalance: 0,
        totalPurchases,
        totalPayments,
        closingBalance: 0,
        transactionCount: statementLines.length,
      },
      generatedAt: new Date().toISOString(),
    },
  });
});

// Create customer
customersRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    name: z.string().min(2, 'Customer name is required').trim(),
    phone: z.string().trim().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { name, phone, email, address, notes } = parsed.data;
  const now = new Date().toISOString();

  const result = runSql(`
    INSERT INTO customers (name, phone, email, address, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [name, phone || null, email || null, address || null, notes || null, now, now]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'user',
    'create_customer',
    'customer',
    result.lastInsertRowid,
    `Registered customer: "${name}" (${phone || 'No phone'})`
  );

  res.status(201).json({
    customer: {
      id: result.lastInsertRowid,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    },
  });
});

// Update customer
customersRouter.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const schema = z.object({
    name: z.string().min(2).trim().optional(),
    phone: z.string().trim().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    address: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  runSql(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `, [
    data.name,
    data.phone !== undefined ? data.phone : null,
    data.email !== undefined ? data.email : null,
    data.address !== undefined ? data.address : null,
    data.notes !== undefined ? data.notes : null,
    now,
    id,
  ]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'user',
    'update_customer',
    'customer',
    id,
    `Updated customer profile: "${data.name || existing.name}"`
  );

  res.json({ success: true, message: 'Customer updated successfully' });
});
