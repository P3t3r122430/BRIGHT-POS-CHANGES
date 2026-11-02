import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const discountsRouter = Router();

const discountSchema = z.object({
  code: z.string().trim().toUpperCase().nullable().optional(),
  name: z.string().trim().min(2, 'Discount name must be at least 2 characters'),
  description: z.string().trim().nullable().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  value: z.number().positive('Discount value must be greater than 0'),
  min_spend: z.number().min(0).default(0),
  max_discount: z.number().positive().nullable().optional(),
  target_type: z.enum(['all', 'product', 'service']).default('all'),
  is_quick_preset: z.number().int().min(0).max(1).default(1),
  active: z.number().int().min(0).max(1).default(1),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

// GET: List all discounts
discountsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const activeOnly = req.query.active_only === 'true';

  try {
    let sql = `
      SELECT 
        d.*,
        (
          SELECT COUNT(DISTINCT s.id) 
          FROM sales s 
          WHERE s.discount > 0 AND s.status = 'completed'
        ) as total_discounted_sales
      FROM discounts d
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' WHERE d.active = 1';
    }

    sql += ' ORDER BY d.is_quick_preset DESC, d.discount_type ASC, d.value ASC';

    const discounts = queryAll<any>(sql, params);
    res.json({ discounts });
  } catch (error: any) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch discounts' });
  }
});

// GET: Summary stats for discounts
discountsRouter.get('/stats', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const totalDiscountsGiven = queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(discount), 0) as total FROM sales WHERE status = 'completed'"
    );
    const discountedTransactionsCount = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sales WHERE discount > 0 AND status = 'completed'"
    );
    const activeDiscountsCount = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM discounts WHERE active = 1"
    );
    const topPresets = queryAll<any>(
      "SELECT * FROM discounts WHERE active = 1 AND is_quick_preset = 1 ORDER BY value ASC LIMIT 6"
    );

    res.json({
      total_discounts_granted: totalDiscountsGiven?.total || 0,
      discounted_sales_count: discountedTransactionsCount?.count || 0,
      active_discounts_count: activeDiscountsCount?.count || 0,
      quick_presets: topPresets,
    });
  } catch (error: any) {
    console.error('Error fetching discount stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch discount stats' });
  }
});

// POST: Validate code or calculate discount
discountsRouter.post('/validate', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { code, discount_id, subtotal, item_types } = req.body;

  try {
    let discount: any = null;

    if (discount_id) {
      discount = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [discount_id]);
    } else if (code) {
      discount = queryOne<any>('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?)', [code.trim()]);
    }

    if (!discount) {
      res.status(404).json({ error: 'Discount or promo code not found.' });
      return;
    }

    if (discount.active !== 1) {
      res.status(400).json({ error: `Discount "${discount.name}" is currently inactive.` });
      return;
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (discount.min_spend > 0 && orderSubtotal < discount.min_spend) {
      res.status(400).json({
        error: `Minimum spend of KSh ${discount.min_spend} required for "${discount.name}". Current order is KSh ${orderSubtotal}.`,
      });
      return;
    }

    let calculatedDiscount = 0;
    if (discount.discount_type === 'percentage') {
      calculatedDiscount = (orderSubtotal * discount.value) / 100;
      if (discount.max_discount && discount.max_discount > 0) {
        calculatedDiscount = Math.min(calculatedDiscount, discount.max_discount);
      }
    } else {
      calculatedDiscount = Math.min(discount.value, orderSubtotal);
    }

    res.json({
      valid: true,
      discount,
      calculated_amount: Math.round(calculatedDiscount * 100) / 100,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to validate discount' });
  }
});

// POST: Create a new discount
discountsRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  try {
    if (data.code) {
      const existing = queryOne<any>('SELECT id FROM discounts WHERE UPPER(code) = UPPER(?)', [data.code]);
      if (existing) {
        res.status(400).json({ error: `A discount with code "${data.code}" already exists.` });
        return;
      }
    }

    const result = runSql(
      `INSERT INTO discounts (
        code, name, description, discount_type, value, min_spend, max_discount, target_type, is_quick_preset, usage_count, active, start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        data.code ? data.code.toUpperCase() : null,
        data.name,
        data.description || null,
        data.discount_type,
        data.value,
        data.min_spend || 0,
        data.max_discount || null,
        data.target_type || 'all',
        data.is_quick_preset ?? 1,
        data.active ?? 1,
        data.start_date || null,
        data.end_date || null,
        now,
        now,
      ]
    );

    const newDiscount = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [result.lastInsertRowid]);

    createAuditLog(
      req.user?.userId || null,
      req.user?.name || 'Admin',
      'CREATE_DISCOUNT',
      'discount',
      String(result.lastInsertRowid),
      `Created discount promotion: "${data.name}" (${data.discount_type === 'percentage' ? `${data.value}%` : `KSh ${data.value}`})`
    );

    res.status(201).json({ discount: newDiscount, message: 'Discount rule created successfully' });
  } catch (error: any) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: error.message || 'Failed to create discount' });
  }
});

// PUT: Update discount
discountsRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid discount ID' });
    return;
  }

  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  try {
    const existing = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Discount not found' });
      return;
    }

    if (data.code && data.code.toUpperCase() !== (existing.code || '').toUpperCase()) {
      const duplicate = queryOne<any>('SELECT id FROM discounts WHERE UPPER(code) = UPPER(?) AND id != ?', [data.code, id]);
      if (duplicate) {
        res.status(400).json({ error: `A discount with code "${data.code}" already exists.` });
        return;
      }
    }

    runSql(
      `UPDATE discounts SET
        code = ?,
        name = ?,
        description = ?,
        discount_type = ?,
        value = ?,
        min_spend = ?,
        max_discount = ?,
        target_type = ?,
        is_quick_preset = ?,
        active = ?,
        start_date = ?,
        end_date = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        data.code ? data.code.toUpperCase() : null,
        data.name,
        data.description || null,
        data.discount_type,
        data.value,
        data.min_spend || 0,
        data.max_discount || null,
        data.target_type || 'all',
        data.is_quick_preset ?? 1,
        data.active ?? 1,
        data.start_date || null,
        data.end_date || null,
        now,
        id,
      ]
    );

    const updated = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [id]);

    createAuditLog(
      req.user?.userId || null,
      req.user?.name || 'Admin',
      'UPDATE_DISCOUNT',
      'discount',
      String(id),
      `Updated discount: "${data.name}"`
    );

    res.json({ discount: updated, message: 'Discount updated successfully' });
  } catch (error: any) {
    console.error('Error updating discount:', error);
    res.status(500).json({ error: error.message || 'Failed to update discount' });
  }
});

// PATCH: Toggle active status
discountsRouter.patch('/:id/toggle-active', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid discount ID' });
    return;
  }

  try {
    const existing = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Discount not found' });
      return;
    }

    const newActive = existing.active === 1 ? 0 : 1;
    const now = new Date().toISOString();

    runSql('UPDATE discounts SET active = ?, updated_at = ? WHERE id = ?', [newActive, now, id]);

    res.json({
      id,
      active: newActive,
      message: `Discount is now ${newActive === 1 ? 'Active' : 'Inactive'}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle discount status' });
  }
});

// DELETE: Delete discount
discountsRouter.delete('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid discount ID' });
    return;
  }

  try {
    const existing = queryOne<any>('SELECT * FROM discounts WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Discount not found' });
      return;
    }

    runSql('DELETE FROM discounts WHERE id = ?', [id]);

    createAuditLog(
      req.user?.userId || null,
      req.user?.name || 'Admin',
      'DELETE_DISCOUNT',
      'discount',
      String(id),
      `Deleted discount: "${existing.name}"`
    );

    res.json({ message: 'Discount deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ error: error.message || 'Failed to delete discount' });
  }
});
