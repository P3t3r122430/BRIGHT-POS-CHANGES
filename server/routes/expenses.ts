import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const expensesRouter = Router();

// Get expenses with filtering
expensesRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const category = req.query.category ? String(req.query.category) : '';
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';
  const search = req.query.search ? String(req.query.search).trim() : '';

  let sql = `
    SELECT e.*, u.name as user_name
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category) {
    sql += ' AND e.category = ?';
    params.push(category);
  }

  if (startDate) {
    sql += ' AND e.created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND e.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  if (search) {
    sql += ' AND (e.description LIKE ? OR e.notes LIKE ? OR e.category LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p);
  }

  sql += ' ORDER BY e.created_at DESC';

  const expenses = queryAll(sql, params);

  // Aggregation
  const summary = queryOne(`
    SELECT
      COUNT(*) as total_records,
      COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE 1=1 ${category ? 'AND category = ?' : ''}
  `, category ? [category] : []);

  res.json({ expenses, summary });
});

// Record expense
expensesRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    category: z.string().min(2, 'Category is required'),
    description: z.string().min(3, 'Description is required').trim(),
    amount: z.number().positive('Amount must be positive'),
    payment_method: z.enum(['cash', 'mpesa', 'bank', 'card', 'other']).default('cash'),
    notes: z.string().trim().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { category, description, amount, payment_method, notes } = parsed.data;
  const now = new Date().toISOString();
  const userId = req.user?.userId || 1;

  const result = runSql(`
    INSERT INTO expenses (category, description, amount, payment_method, user_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [category, description, amount, payment_method, userId, notes || null, now]);

  createAuditLog(
    userId,
    req.user?.username || 'user',
    'create_expense',
    'expense',
    result.lastInsertRowid,
    `Recorded expense: KSh ${amount} for "${description}" (${category}) paid via ${payment_method}`
  );

  res.status(201).json({
    success: true,
    expense: {
      id: result.lastInsertRowid,
      category,
      description,
      amount,
      payment_method,
      user_id: userId,
      notes: notes || null,
      created_at: now,
    },
  });
});

// Admin: Delete expense
expensesRouter.delete('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne<any>('SELECT * FROM expenses WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  runSql('DELETE FROM expenses WHERE id = ?', [id]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'delete_expense',
    'expense',
    id,
    `Deleted expense #${id}: KSh ${existing.amount} ("${existing.description}")`
  );

  res.json({ success: true, message: 'Expense deleted successfully' });
});
