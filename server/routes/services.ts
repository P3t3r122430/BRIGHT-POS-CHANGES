import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql, runTransaction } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const servicesRouter = Router();

// Get all services (with search, category filter, active filter)
servicesRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const activeOnly = req.query.active_only !== 'false';

  let sql = `
    SELECT s.*, c.name as category_name
    FROM services s
    JOIN categories c ON s.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (activeOnly) {
    sql += ' AND s.active = 1';
  }

  if (categoryId) {
    sql += ' AND s.category_id = ?';
    params.push(categoryId);
  }

  if (search) {
    sql += ' AND (s.name LIKE ? OR s.description LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  sql += ' ORDER BY c.name ASC, s.name ASC';

  const services = queryAll(sql, params);
  res.json({ services });
});

// Get single service with price history
servicesRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const service = queryOne(`
    SELECT s.*, c.name as category_name
    FROM services s
    JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `, [id]);

  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  const priceHistory = queryAll(`
    SELECT ph.*, u.name as user_name
    FROM price_history ph
    JOIN users u ON ph.user_id = u.id
    WHERE ph.entity_type = 'service' AND ph.entity_id = ?
    ORDER BY ph.created_at DESC
  `, [id]);

  res.json({ service, priceHistory });
});

// Admin: Create service
servicesRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    name: z.string().min(2, 'Service name is required').trim(),
    description: z.string().trim().nullable().optional(),
    category_id: z.number().int().positive('Category is required'),
    price: z.number().min(0, 'Price cannot be negative'),
    cost_estimate: z.number().min(0, 'Cost estimate cannot be negative').default(0),
    unit: z.string().default('job'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  const result = runSql(`
    INSERT INTO services (name, description, category_id, price, cost_estimate, unit, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    data.name,
    data.description || null,
    data.category_id,
    data.price,
    data.cost_estimate,
    data.unit,
    now,
    now,
  ]);

  const newId = result.lastInsertRowid;

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'create_service',
    'service',
    newId,
    `Created new service: "${data.name}" (Price: KSh ${data.price}/${data.unit}, Est Cost: KSh ${data.cost_estimate})`
  );

  res.status(201).json({
    service: {
      id: newId,
      ...data,
      active: 1,
      created_at: now,
      updated_at: now,
    },
  });
});

// Admin: Update service
servicesRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne<any>('SELECT * FROM services WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  const schema = z.object({
    name: z.string().min(2).trim().optional(),
    description: z.string().trim().nullable().optional(),
    category_id: z.number().int().positive().optional(),
    price: z.number().min(0).optional(),
    cost_estimate: z.number().min(0).optional(),
    unit: z.string().optional(),
    active: z.number().min(0).max(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  runTransaction(() => {
    // Record price history if price changed
    if (data.price !== undefined && data.price !== existing.price) {
      runSql(`
        INSERT INTO price_history (entity_type, entity_id, old_price, new_price, user_id, created_at)
        VALUES ('service', ?, ?, ?, ?, ?)
      `, [id, existing.price, data.price, req.user?.userId || 1, now]);
    }

    runSql(`
      UPDATE services SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        price = COALESCE(?, price),
        cost_estimate = COALESCE(?, cost_estimate),
        unit = COALESCE(?, unit),
        active = COALESCE(?, active),
        updated_at = ?
      WHERE id = ?
    `, [
      data.name ?? existing.name,
      data.description !== undefined ? data.description : existing.description,
      data.category_id ?? existing.category_id,
      data.price ?? existing.price,
      data.cost_estimate ?? existing.cost_estimate,
      data.unit ?? existing.unit,
      data.active !== undefined ? data.active : existing.active,
      now,
      id,
    ]);
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_service',
    'service',
    id,
    `Updated service "${existing.name}" (Price: KSh ${data.price ?? existing.price}/${data.unit ?? existing.unit})`
  );

  res.json({ success: true, message: 'Service updated successfully' });
});

// Admin: Permanently delete all deactivated services
servicesRouter.post('/purge-deactivated', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const deactivated = queryAll<{ id: number; name: string }>('SELECT id, name FROM services WHERE active = 0');
  
  if (deactivated.length === 0) {
    res.json({ success: true, count: 0, message: 'No deactivated services found to delete.' });
    return;
  }

  const count = deactivated.length;
  const names = deactivated.map(d => d.name).join(', ');

  runTransaction(() => {
    runSql('UPDATE sale_items SET service_id = NULL WHERE service_id IN (SELECT id FROM services WHERE active = 0)');
    runSql("DELETE FROM price_history WHERE entity_type = 'service' AND entity_id IN (SELECT id FROM services WHERE active = 0)");
    runSql('DELETE FROM services WHERE active = 0');
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'purge_deactivated_services',
    'service',
    null,
    `Permanently purged ${count} deactivated service(s): ${names}`
  );

  res.json({
    success: true,
    count,
    message: `Successfully deleted all ${count} deactivated service(s).`,
  });
});

// Admin: Toggle active status or permanently delete
servicesRouter.delete('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const isPermanent = req.query.permanent === 'true';

  const existing = queryOne<{ id: number; name: string; active: number }>('SELECT id, name, active FROM services WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  if (isPermanent) {
    runTransaction(() => {
      runSql('UPDATE sale_items SET service_id = NULL WHERE service_id = ?', [id]);
      runSql("DELETE FROM price_history WHERE entity_type = 'service' AND entity_id = ?", [id]);
      runSql('DELETE FROM services WHERE id = ?', [id]);
    });

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'delete_service_permanent',
      'service',
      id,
      `Permanently deleted service "${existing.name}"`
    );

    res.json({ success: true, message: `Service "${existing.name}" permanently deleted.` });
    return;
  }

  const newStatus = existing.active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  runSql('UPDATE services SET active = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    newStatus === 0 ? 'deactivate_service' : 'activate_service',
    'service',
    id,
    `${newStatus === 0 ? 'Deactivated' : 'Re-activated'} service "${existing.name}"`
  );

  res.json({ success: true, message: `Service ${newStatus === 0 ? 'deactivated' : 'activated'} successfully` });
});
