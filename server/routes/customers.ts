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
    SELECT s.*, u.name as cashier_name
    FROM sales s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC
  `, [id]);

  res.json({ customer, sales });
});

// Create customer
customersRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    name: z.string().min(2, 'Customer name is required').trim(),
    phone: z.string().trim().optional(),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().trim().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { name, phone, email, notes } = parsed.data;
  const now = new Date().toISOString();

  const result = runSql(`
    INSERT INTO customers (name, phone, email, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, phone || null, email || null, notes || null, now, now]);

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
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `, [
    data.name,
    data.phone !== undefined ? data.phone : null,
    data.email !== undefined ? data.email : null,
    data.notes !== undefined ? data.notes : null,
    now,
    id,
  ]);

  res.json({ success: true, message: 'Customer updated successfully' });
});
