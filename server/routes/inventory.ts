import { Router, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { queryAll, queryOne, runSql, runTransaction } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const inventoryRouter = Router();

// Get inventory summary, stock valuation and status
inventoryRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const filter = req.query.filter ? String(req.query.filter) : 'all'; // 'all', 'low_stock', 'out_of_stock'

  let sql = `
    SELECT p.*, c.name as category_name,
      CASE
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock_quantity <= p.minimum_stock THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END as stock_status,
      (p.stock_quantity * p.cost_price) as total_cost_value,
      (p.stock_quantity * p.selling_price) as total_retail_value
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
  `;
  const params: any[] = [];

  if (filter === 'low_stock') {
    sql += ' AND p.stock_quantity > 0 AND p.stock_quantity <= p.minimum_stock';
  } else if (filter === 'out_of_stock') {
    sql += ' AND p.stock_quantity = 0';
  }

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  sql += ' ORDER BY p.stock_quantity ASC, p.name ASC';

  const items = queryAll(sql, params);

  // Overall metrics
  const stats = queryOne(`
    SELECT
      COUNT(*) as total_products,
      SUM(stock_quantity) as total_units,
      SUM(stock_quantity * cost_price) as total_cost_valuation,
      SUM(stock_quantity * selling_price) as total_retail_valuation,
      SUM(CASE WHEN stock_quantity <= minimum_stock AND stock_quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
    WHERE active = 1
  `);

  res.json({
    items,
    stats: {
      totalProducts: stats?.total_products || 0,
      totalUnits: stats?.total_units || 0,
      totalCostValuation: stats?.total_cost_valuation || 0,
      totalRetailValuation: stats?.total_retail_valuation || 0,
      lowStockCount: stats?.low_stock_count || 0,
      outOfStockCount: stats?.out_of_stock_count || 0,
    },
  });
});

// Admin: Adjust stock quantity (restock, damage, loss, manual adjustment)
inventoryRouter.post('/adjust', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const raw = req.body || {};
  const normalized = {
    product_id: raw.product_id !== undefined ? Number(raw.product_id) : (raw.productId !== undefined ? Number(raw.productId) : undefined),
    movement_type: raw.movement_type || raw.movementType || 'restock',
    quantity: raw.quantity !== undefined ? Number(raw.quantity) : undefined,
    reason: raw.reason !== undefined && String(raw.reason).trim() !== '' ? String(raw.reason).trim() : 'Stock intake / restock',
  };

  const schema = z.object({
    product_id: z.number().int().positive('Product ID is required'),
    movement_type: z.enum(['restock', 'damage', 'loss', 'adjustment']),
    quantity: z.number().int('Quantity must be an integer'),
    reason: z.string().min(1, 'A reason for stock adjustment is required').trim(),
  });

  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { product_id, movement_type, quantity, reason } = parsed.data;

  const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [product_id]);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const currentStock = product.stock_quantity;
  let newStock = currentStock;

  if (movement_type === 'restock') {
    if (quantity <= 0) {
      res.status(400).json({ error: 'Restock quantity must be positive' });
      return;
    }
    newStock = currentStock + quantity;
  } else if (movement_type === 'damage' || movement_type === 'loss') {
    if (quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be positive' });
      return;
    }
    if (currentStock - quantity < 0) {
      res.status(400).json({ error: `Cannot deduct ${quantity} units. Only ${currentStock} units in stock.` });
      return;
    }
    newStock = currentStock - quantity;
  } else if (movement_type === 'adjustment') {
    // Adjustment can set exact quantity or delta
    if (quantity < 0) {
      res.status(400).json({ error: 'Stock quantity cannot be negative.' });
      return;
    }
    newStock = quantity;
  }

  const now = new Date().toISOString();
  const delta = newStock - currentStock;

  runTransaction(() => {
    runSql('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [newStock, now, product_id]);

    runSql(`
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product_id,
      movement_type,
      Math.abs(delta),
      currentStock,
      newStock,
      reason,
      req.user?.userId || 1,
      now,
    ]);
  });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'inventory_adjustment',
    'product',
    product_id,
    `Stock adjusted for "${product.name}" (${movement_type}): ${currentStock} -> ${newStock} units (${delta >= 0 ? '+' : ''}${delta}). Reason: ${reason}`
  );

  res.json({
    success: true,
    message: `Stock updated for ${product.name}. New level: ${newStock} ${product.unit}s.`,
    newStock,
    product: {
      ...product,
      stock_quantity: newStock,
      updated_at: now,
    },
  });
});

// Get stock movements history
inventoryRouter.get('/movements', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const productId = req.query.product_id ? Number(req.query.product_id) : null;
  const movementType = req.query.movement_type ? String(req.query.movement_type) : null;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  let sql = `
    SELECT im.*, p.name as product_name, p.sku as product_sku, p.unit as product_unit, u.name as user_name
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
    JOIN users u ON im.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (productId) {
    sql += ' AND im.product_id = ?';
    params.push(productId);
  }

  if (movementType) {
    sql += ' AND im.movement_type = ?';
    params.push(movementType);
  }

  sql += ' ORDER BY im.created_at DESC LIMIT ?';
  params.push(limit);

  const movements = queryAll(sql, params);
  res.json({ movements });
});

// Admin: Export inventory stock list (Excel .xlsx or CSV .csv)
inventoryRouter.get('/export', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const format = (String(req.query.format || 'xlsx').toLowerCase() === 'csv') ? 'csv' : 'xlsx';
  const todayDate = new Date().toISOString().slice(0, 10);
  const nowFormatted = new Date().toLocaleString('en-KE', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const adminName = req.user?.name || req.user?.username || 'Admin';

  const sql = `
    SELECT 
      p.id,
      p.sku,
      p.barcode,
      p.name,
      p.description,
      c.name AS category_name,
      p.unit,
      p.stock_quantity,
      p.minimum_stock,
      p.cost_price,
      p.selling_price,
      (p.stock_quantity * p.cost_price) AS total_cost_value,
      (p.stock_quantity * p.selling_price) AS total_retail_value,
      ((p.stock_quantity * p.selling_price) - (p.stock_quantity * p.cost_price)) AS potential_profit,
      CASE
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock_quantity <= p.minimum_stock THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END AS stock_status,
      p.supplier,
      p.updated_at
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    ORDER BY c.name ASC, p.name ASC
  `;

  const items = queryAll<any>(sql);

  let totalUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let totalPotentialProfit = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const item of items) {
    totalUnits += item.stock_quantity;
    totalCostValuation += item.total_cost_value;
    totalRetailValuation += item.total_retail_value;
    totalPotentialProfit += item.potential_profit;
    if (item.stock_status === 'LOW_STOCK') lowStockCount++;
    if (item.stock_status === 'OUT_OF_STOCK') outOfStockCount++;
  }

  const filename = `bright-cyber-stock-list-${todayDate}.${format}`;

  if (format === 'csv') {
    // Generate clean CSV with formal Bright Cyber header
    const csvRows: string[] = [];
    csvRows.push('"BRIGHT CYBER & ICT"');
    csvRows.push('"CURRENT INVENTORY / STOCK LIST"');
    csvRows.push(`"Generated date and time: ${nowFormatted}","Generated by: Admin (${adminName})"`);
    csvRows.push(`"Total Products: ${items.length}","Total Units: ${totalUnits}","Total Cost Valuation: KES ${totalCostValuation.toFixed(2)}","Total Retail Valuation: KES ${totalRetailValuation.toFixed(2)}"`);
    csvRows.push('""'); // blank line
    csvRows.push([
      '"#"',
      '"SKU / Product Code"',
      '"Barcode"',
      '"Product Name"',
      '"Category"',
      '"Unit"',
      '"Current Quantity"',
      '"Minimum Stock Alert"',
      '"Stock Status"',
      '"Cost Price (KES)"',
      '"Selling Price (KES)"',
      '"Total Cost Value (KES)"',
      '"Total Retail Value (KES)"',
      '"Potential Profit (KES)"',
      '"Supplier"',
      '"Last Updated"'
    ].join(','));

    items.forEach((item: any, idx: number) => {
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      csvRows.push([
        idx + 1,
        escape(item.sku),
        escape(item.barcode || ''),
        escape(item.name),
        escape(item.category_name),
        escape(item.unit),
        item.stock_quantity,
        item.minimum_stock,
        escape(item.stock_status),
        item.cost_price.toFixed(2),
        item.selling_price.toFixed(2),
        item.total_cost_value.toFixed(2),
        item.total_retail_value.toFixed(2),
        item.potential_profit.toFixed(2),
        escape(item.supplier || ''),
        escape(item.updated_at ? item.updated_at.split('T')[0] : '')
      ].join(','));
    });

    // Totals row
    csvRows.push([
      '"TOTALS"',
      '""',
      '""',
      '""',
      '""',
      '""',
      totalUnits,
      '""',
      '""',
      '""',
      '""',
      totalCostValuation.toFixed(2),
      totalRetailValuation.toFixed(2),
      totalPotentialProfit.toFixed(2),
      '""',
      '""'
    ].join(','));

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'export_stock_list',
      'inventory',
      null,
      `Admin exported complete stock list (CSV: ${items.length} items, KES ${totalCostValuation.toFixed(2)} cost value)`
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csvRows.join('\r\n'));
    return;
  }

  // Excel format
  const wsData: any[][] = [
    ['BRIGHT CYBER & ICT'],
    ['CURRENT INVENTORY / STOCK LIST'],
    [`Generated date and time: ${nowFormatted}`, '', `Generated by: Admin (${adminName})`],
    [
      `Total Products: ${items.length}`,
      `Total Units: ${totalUnits}`,
      `Total Cost Valuation: KES ${totalCostValuation.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Total Retail Valuation: KES ${totalRetailValuation.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Low / Out of Stock: ${lowStockCount + outOfStockCount}`,
    ],
    [], // blank spacer
    [
      '#',
      'SKU / Product Code',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Current Quantity',
      'Minimum Stock Alert',
      'Stock Status',
      'Cost Price (KES)',
      'Selling Price (KES)',
      'Total Cost Value (KES)',
      'Total Retail Value (KES)',
      'Potential Profit (KES)',
      'Supplier',
      'Last Updated'
    ]
  ];

  items.forEach((item: any, idx: number) => {
    wsData.push([
      idx + 1,
      item.sku,
      item.barcode || 'N/A',
      item.name,
      item.category_name,
      item.unit,
      item.stock_quantity,
      item.minimum_stock,
      item.stock_status,
      Number(item.cost_price.toFixed(2)),
      Number(item.selling_price.toFixed(2)),
      Number(item.total_cost_value.toFixed(2)),
      Number(item.total_retail_value.toFixed(2)),
      Number(item.potential_profit.toFixed(2)),
      item.supplier || 'N/A',
      item.updated_at ? item.updated_at.split('T')[0] : 'N/A'
    ]);
  });

  // Totals row
  wsData.push([
    'TOTALS',
    '',
    '',
    '',
    '',
    '',
    totalUnits,
    '',
    '',
    '',
    '',
    Number(totalCostValuation.toFixed(2)),
    Number(totalRetailValuation.toFixed(2)),
    Number(totalPotentialProfit.toFixed(2)),
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 18 }, // SKU
    { wch: 16 }, // Barcode
    { wch: 34 }, // Name
    { wch: 22 }, // Category
    { wch: 10 }, // Unit
    { wch: 18 }, // Current Qty
    { wch: 20 }, // Min Stock Alert
    { wch: 16 }, // Stock Status
    { wch: 18 }, // Cost Price
    { wch: 18 }, // Selling Price
    { wch: 22 }, // Total Cost Value
    { wch: 22 }, // Total Retail Value
    { wch: 22 }, // Potential Profit
    { wch: 18 }, // Supplier
    { wch: 14 }  // Last Updated
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock List');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'export_stock_list',
    'inventory',
    null,
    `Admin exported complete stock list (Excel: ${items.length} items, KES ${totalCostValuation.toFixed(2)} cost value)`
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
});

