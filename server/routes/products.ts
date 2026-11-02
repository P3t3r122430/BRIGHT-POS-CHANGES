import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql, runTransaction } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const productsRouter = Router();

// Get all products (with optional search, category filter, active filter)
productsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const activeOnly = req.query.active_only !== 'false';
  const lowStockOnly = req.query.low_stock === 'true';

  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (activeOnly) {
    sql += ' AND p.active = 1';
  }

  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (lowStockOnly) {
    sql += ' AND p.stock_quantity <= p.minimum_stock';
  }

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY p.name ASC';

  const products = queryAll(sql, params);
  res.json({ products });
});

// Get single product with price history
productsRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const product = queryOne(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const priceHistory = queryAll(`
    SELECT ph.*, u.name as user_name
    FROM price_history ph
    JOIN users u ON ph.user_id = u.id
    WHERE ph.entity_type = 'product' AND ph.entity_id = ?
    ORDER BY ph.created_at DESC
  `, [id]);

  const recentMovements = queryAll(`
    SELECT im.*, u.name as user_name
    FROM inventory_movements im
    JOIN users u ON im.user_id = u.id
    WHERE im.product_id = ?
    ORDER BY im.created_at DESC
    LIMIT 20
  `, [id]);

  res.json({ product, priceHistory, recentMovements });
});

// Admin: Create product
productsRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const rawBody = req.body || {};
  let catId = rawBody.category_id !== undefined ? Number(rawBody.category_id) : (rawBody.categoryId !== undefined ? Number(rawBody.categoryId) : 0);

  if (!catId || isNaN(catId) || catId <= 0) {
    const defaultCat = queryOne<{ id: number }>('SELECT id FROM categories WHERE type = "product" LIMIT 1') || queryOne<{ id: number }>('SELECT id FROM categories LIMIT 1');
    if (defaultCat) {
      catId = defaultCat.id;
    }
  }

  const normalizedBody = {
    sku: rawBody.sku,
    barcode: rawBody.barcode,
    name: rawBody.name,
    description: rawBody.description,
    category_id: catId,
    cost_price: rawBody.cost_price !== undefined ? Number(rawBody.cost_price) : (rawBody.costPrice !== undefined ? Number(rawBody.costPrice) : 0),
    selling_price: rawBody.selling_price !== undefined ? Number(rawBody.selling_price) : (rawBody.sellingPrice !== undefined ? Number(rawBody.sellingPrice) : 0),
    stock_quantity: rawBody.stock_quantity !== undefined ? Number(rawBody.stock_quantity) : (rawBody.stockQuantity !== undefined ? Number(rawBody.stockQuantity) : 0),
    minimum_stock: rawBody.minimum_stock !== undefined ? Number(rawBody.minimum_stock) : (rawBody.minimumStock !== undefined ? Number(rawBody.minimumStock) : 5),
    unit: rawBody.unit || 'piece',
    supplier: rawBody.supplier,
  };

  const schema = z.object({
    sku: z.string().min(1).trim().nullable().optional(),
    barcode: z.string().trim().nullable().optional(),
    name: z.string().min(2, 'Product name is required').trim(),
    description: z.string().trim().nullable().optional(),
    category_id: z.number().int().positive('Valid category required'),
    cost_price: z.number().min(0, 'Cost price cannot be negative'),
    selling_price: z.number().min(0, 'Selling price cannot be negative'),
    stock_quantity: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
    minimum_stock: z.number().int().min(0, 'Minimum stock threshold cannot be negative').default(5),
    unit: z.string().default('piece'),
    supplier: z.string().trim().nullable().optional(),
  });

  const parsed = schema.safeParse(normalizedBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  // Auto-generate SKU if not provided
  let finalSku = data.sku;
  if (!finalSku) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    finalSku = `PRD-${Date.now().toString().slice(-4)}-${randomSuffix}`;
  }

  // Check unique SKU
  const existingSku = queryOne('SELECT id FROM products WHERE sku = ?', [finalSku]);
  if (existingSku) {
    res.status(400).json({ error: `SKU "${finalSku}" is already in use.` });
    return;
  }

  let newProductId = 0;

  runTransaction(() => {
    const result = runSql(`
      INSERT INTO products (
        sku, barcode, name, description, category_id, cost_price, selling_price,
        stock_quantity, minimum_stock, unit, supplier, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      finalSku,
      data.barcode || null,
      data.name,
      data.description || null,
      data.category_id,
      data.cost_price,
      data.selling_price,
      data.stock_quantity,
      data.minimum_stock,
      data.unit,
      data.supplier || null,
      now,
      now,
    ]);

    newProductId = result.lastInsertRowid;

    if (data.stock_quantity > 0) {
      runSql(`
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
        ) VALUES (?, 'restock', ?, 0, ?, 'Initial product registration stock', ?, ?)
      `, [newProductId, data.stock_quantity, data.stock_quantity, req.user?.userId || 1, now]);
    }
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'create_product',
    'product',
    newProductId,
    `Registered new physical product: "${data.name}" (SKU: ${finalSku}, Cost: KSh ${data.cost_price}, Price: KSh ${data.selling_price}, Stock: ${data.stock_quantity})`
  );

  res.status(201).json({
    success: true,
    product: {
      id: newProductId,
      ...data,
      sku: finalSku,
      active: 1,
      created_at: now,
      updated_at: now,
    },
  });
});

// Admin: Update product
productsRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const rawBody = req.body || {};
  const normalizedBody = {
    sku: rawBody.sku,
    barcode: rawBody.barcode,
    name: rawBody.name,
    description: rawBody.description,
    category_id: rawBody.category_id !== undefined ? Number(rawBody.category_id) : (rawBody.categoryId !== undefined ? Number(rawBody.categoryId) : undefined),
    cost_price: rawBody.cost_price !== undefined ? Number(rawBody.cost_price) : (rawBody.costPrice !== undefined ? Number(rawBody.costPrice) : undefined),
    selling_price: rawBody.selling_price !== undefined ? Number(rawBody.selling_price) : (rawBody.sellingPrice !== undefined ? Number(rawBody.sellingPrice) : undefined),
    stock_quantity: rawBody.stock_quantity !== undefined ? Number(rawBody.stock_quantity) : (rawBody.stockQuantity !== undefined ? Number(rawBody.stockQuantity) : undefined),
    minimum_stock: rawBody.minimum_stock !== undefined ? Number(rawBody.minimum_stock) : (rawBody.minimumStock !== undefined ? Number(rawBody.minimumStock) : undefined),
    unit: rawBody.unit,
    supplier: rawBody.supplier,
    active: rawBody.active !== undefined ? Number(rawBody.active) : undefined,
  };

  const schema = z.object({
    sku: z.string().min(1).trim().optional(),
    barcode: z.string().trim().nullable().optional(),
    name: z.string().min(2).trim().optional(),
    description: z.string().trim().nullable().optional(),
    category_id: z.number().int().positive().optional(),
    cost_price: z.number().min(0).optional(),
    selling_price: z.number().min(0).optional(),
    stock_quantity: z.number().int().min(0).optional(),
    minimum_stock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
    supplier: z.string().trim().nullable().optional(),
    active: z.number().min(0).max(1).optional(),
  });

  const parsed = schema.safeParse(normalizedBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  // Check SKU uniqueness if changed
  if (data.sku && data.sku !== existing.sku) {
    const duplicateSku = queryOne('SELECT id FROM products WHERE sku = ? AND id != ?', [data.sku, id]);
    if (duplicateSku) {
      res.status(400).json({ error: `SKU "${data.sku}" is already in use by another product.` });
      return;
    }
  }

  runTransaction(() => {
    // Record price change if selling_price changed
    if (data.selling_price !== undefined && data.selling_price !== existing.selling_price) {
      runSql(`
        INSERT INTO price_history (entity_type, entity_id, old_price, new_price, user_id, created_at)
        VALUES ('product', ?, ?, ?, ?, ?)
      `, [id, existing.selling_price, data.selling_price, req.user?.userId || 1, now]);
    }

    // Record stock quantity adjustment if changed
    if (data.stock_quantity !== undefined && data.stock_quantity !== existing.stock_quantity) {
      const delta = data.stock_quantity - existing.stock_quantity;
      const movementType = delta > 0 ? 'restock' : 'adjustment';
      runSql(`
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        movementType,
        Math.abs(delta),
        existing.stock_quantity,
        data.stock_quantity,
        `Stock manually updated via product edit (${delta >= 0 ? '+' : ''}${delta})`,
        req.user?.userId || 1,
        now,
      ]);
    }

    runSql(`
      UPDATE products SET
        sku = COALESCE(?, sku),
        barcode = COALESCE(?, barcode),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        cost_price = COALESCE(?, cost_price),
        selling_price = COALESCE(?, selling_price),
        stock_quantity = COALESCE(?, stock_quantity),
        minimum_stock = COALESCE(?, minimum_stock),
        unit = COALESCE(?, unit),
        supplier = COALESCE(?, supplier),
        active = COALESCE(?, active),
        updated_at = ?
      WHERE id = ?
    `, [
      data.sku ?? existing.sku,
      data.barcode !== undefined ? data.barcode : existing.barcode,
      data.name ?? existing.name,
      data.description !== undefined ? data.description : existing.description,
      data.category_id ?? existing.category_id,
      data.cost_price ?? existing.cost_price,
      data.selling_price ?? existing.selling_price,
      data.stock_quantity !== undefined ? data.stock_quantity : existing.stock_quantity,
      data.minimum_stock ?? existing.minimum_stock,
      data.unit ?? existing.unit,
      data.supplier !== undefined ? data.supplier : existing.supplier,
      data.active !== undefined ? data.active : existing.active,
      now,
      id,
    ]);
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_product',
    'product',
    id,
    `Updated product "${existing.name}" details (Cost: KSh ${data.cost_price ?? existing.cost_price}, Price: KSh ${data.selling_price ?? existing.selling_price})`
  );

  res.json({ success: true, message: 'Product updated successfully' });
});

// Admin: Permanently delete all deactivated products
productsRouter.post('/purge-deactivated', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const deactivated = queryAll<{ id: number; name: string; sku: string }>('SELECT id, name, sku FROM products WHERE active = 0');
  
  if (deactivated.length === 0) {
    res.json({ success: true, count: 0, message: 'No deactivated physical products found to delete.' });
    return;
  }

  const ids = deactivated.map(d => d.id);
  const count = deactivated.length;
  const names = deactivated.map(d => `${d.name} (${d.sku})`).join(', ');

  runTransaction(() => {
    // Unlink from sale_items so historical receipts keep snapshots intact
    runSql('UPDATE sale_items SET product_id = NULL WHERE product_id IN (SELECT id FROM products WHERE active = 0)');
    // Remove related movements and price history
    runSql('DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE active = 0)');
    runSql("DELETE FROM price_history WHERE entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE active = 0)");
    // Delete all deactivated products
    runSql('DELETE FROM products WHERE active = 0');
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'purge_deactivated_products',
    'product',
    null,
    `Permanently purged ${count} deactivated product(s): ${names}`
  );

  res.json({
    success: true,
    count,
    deletedProducts: deactivated,
    message: `Successfully deleted all ${count} deactivated physical product(s).`,
  });
});

// Admin: Permanently delete a single product
productsRouter.delete('/:id/permanent', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne<{ id: number; name: string; sku: string; selling_price: number }>('SELECT id, name, sku, selling_price FROM products WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  runTransaction(() => {
    // Unlink from sale_items so historical receipts keep item snapshots intact
    runSql('UPDATE sale_items SET product_id = NULL WHERE product_id = ?', [id]);
    runSql('DELETE FROM inventory_movements WHERE product_id = ?', [id]);
    runSql("DELETE FROM price_history WHERE entity_type = 'product' AND entity_id = ?", [id]);
    runSql('DELETE FROM products WHERE id = ?', [id]);
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'delete_product_permanent',
    'product',
    id,
    `Permanently deleted product "${existing.name}" (SKU: ${existing.sku})`
  );

  res.json({ success: true, message: `Product "${existing.name}" permanently deleted.` });
});

// Admin: Toggle active status (or permanently delete if permanent query param is true)
productsRouter.delete('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const isPermanent = req.query.permanent === 'true';

  const existing = queryOne<{ id: number; name: string; sku: string; active: number }>('SELECT id, name, sku, active FROM products WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (isPermanent) {
    runTransaction(() => {
      runSql('UPDATE sale_items SET product_id = NULL WHERE product_id = ?', [id]);
      runSql('DELETE FROM inventory_movements WHERE product_id = ?', [id]);
      runSql("DELETE FROM price_history WHERE entity_type = 'product' AND entity_id = ?", [id]);
      runSql('DELETE FROM products WHERE id = ?', [id]);
    });

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'delete_product_permanent',
      'product',
      id,
      `Permanently deleted product "${existing.name}" (SKU: ${existing.sku})`
    );

    res.json({ success: true, message: `Product "${existing.name}" permanently deleted.` });
    return;
  }

  const newStatus = existing.active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  runSql('UPDATE products SET active = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    newStatus === 0 ? 'deactivate_product' : 'activate_product',
    'product',
    id,
    `${newStatus === 0 ? 'Deactivated' : 'Re-activated'} product "${existing.name}"`
  );

  res.json({ success: true, message: `Product ${newStatus === 0 ? 'deactivated' : 'activated'} successfully` });
});

// Admin: Reset physical products to master inventory catalogue
productsRouter.post('/reset-master', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { resetAndSeedPhysicalProducts } = await import('../db/seed.js');
    await resetAndSeedPhysicalProducts();

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'reset_products',
      'product',
      null,
      'Reset and synced physical inventory to master catalogue table'
    );

    res.json({ success: true, message: 'Physical products catalogue reset and synchronized successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset physical products' });
  }
});

