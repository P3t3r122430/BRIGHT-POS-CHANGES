import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const categoriesRouter = Router();

// Get all categories with counts of services/products
categoriesRouter.get('/', authenticateToken, (_req: AuthenticatedRequest, res: Response): void => {
  const categories = queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) as product_count,
      (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id AND s.active = 1) as service_count
    FROM categories c
    ORDER BY c.type, c.name
  `);
  res.json({ categories });
});

// Admin: Create category
categoriesRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    name: z.string().min(2, 'Category name is required').trim(),
    type: z.enum(['service', 'product']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { name, type } = parsed.data;
  const existing = queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name]);
  if (existing) {
    res.status(400).json({ error: 'A category with this name already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const result = runSql(
    'INSERT INTO categories (name, type, active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
    [name, type, now, now]
  );

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'create_category',
    'category',
    result.lastInsertRowid,
    `Created new category "${name}" (${type})`
  );

  res.status(201).json({
    category: {
      id: result.lastInsertRowid,
      name,
      type,
      active: 1,
      created_at: now,
      updated_at: now,
    },
  });
});

// Admin: Update category
categoriesRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(2).trim().optional(),
    active: z.number().min(0).max(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const existing = queryOne<{ id: number; name: string; type: string; active: number }>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const name = parsed.data.name ?? existing.name;
  const active = parsed.data.active !== undefined ? parsed.data.active : existing.active;
  const now = new Date().toISOString();

  runSql('UPDATE categories SET name = ?, active = ?, updated_at = ? WHERE id = ?', [
    name,
    active,
    now,
    id,
  ]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_category',
    'category',
    id,
    `Updated category "${existing.name}" -> "${name}" (active: ${active})`
  );

  res.json({ success: true, message: 'Category updated successfully' });
});
