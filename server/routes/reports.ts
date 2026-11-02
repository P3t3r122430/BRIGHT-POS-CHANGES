import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from '../auth/jwt.js';

export const reportsRouter = Router();

// 1. Sales Report
reportsRouter.get('/sales', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';

  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  // Summary
  const summary = queryOne(`
    SELECT
      COUNT(*) as total_sales_count,
      COALESCE(SUM(subtotal), 0) as total_subtotal,
      COALESCE(SUM(discount), 0) as total_discount,
      COALESCE(SUM(tax), 0) as total_tax,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as average_ticket_value
    FROM sales s
    WHERE s.status = 'completed' ${dateFilter}
  `, params);

  // Grouped by Date (Day)
  const salesByDate = queryAll(`
    SELECT
      DATE(s.created_at) as sale_date,
      COUNT(*) as transaction_count,
      SUM(s.subtotal) as subtotal,
      SUM(s.discount) as discount,
      SUM(s.total) as revenue
    FROM sales s
    WHERE s.status = 'completed' ${dateFilter}
    GROUP BY DATE(s.created_at)
    ORDER BY sale_date DESC
  `, params);

  // Grouped by Cashier
  const salesByCashier = queryAll(`
    SELECT
      u.name as cashier_name,
      u.username,
      COUNT(s.id) as transaction_count,
      SUM(s.total) as total_revenue
    FROM sales s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'completed' ${dateFilter}
    GROUP BY u.id
    ORDER BY total_revenue DESC
  `, params);

  // Grouped by Payment Method
  const salesByMethod = queryAll(`
    SELECT
      p.method,
      COUNT(p.id) as payment_count,
      SUM(p.amount) as total_amount
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.status = 'completed' ${dateFilter}
    GROUP BY p.method
    ORDER BY total_amount DESC
  `, params);

  const salesResult = {
    summary,
    salesByDate,
    salesByCashier,
    salesByMethod,
  };

  res.json({
    ...salesResult,
    sales: salesResult,
  });
});

// 2. Profit & Loss Report
const handleProfitLoss = (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';

  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  // Product sales profit
  const productProfit = queryOne(`
    SELECT
      COALESCE(SUM(si.total), 0) as product_revenue,
      COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0) as product_cost,
      COALESCE(SUM(si.total - (si.cost_price_snapshot * si.quantity)), 0) as product_gross_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND si.product_id IS NOT NULL ${dateFilter}
  `, params);

  // Service sales profit
  const serviceProfit = queryOne(`
    SELECT
      COALESCE(SUM(si.total), 0) as service_revenue,
      COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0) as service_cost,
      COALESCE(SUM(si.total - (si.cost_price_snapshot * si.quantity)), 0) as service_gross_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND si.service_id IS NOT NULL ${dateFilter}
  `, params);

  // Expenses in date range
  let expFilter = '';
  const expParams: any[] = [];
  if (startDate) {
    expFilter += ' AND created_at >= ?';
    expParams.push(startDate);
  }
  if (endDate) {
    expFilter += ' AND created_at <= ?';
    expParams.push(endDate + 'T23:59:59.999Z');
  }

  const expensesSummary = queryOne(`
    SELECT COALESCE(SUM(amount), 0) as total_operating_expenses
    FROM expenses
    WHERE 1=1 ${expFilter}
  `, expParams);

  const expensesByCategory = queryAll(`
    SELECT category, COUNT(*) as count, SUM(amount) as total_amount
    FROM expenses
    WHERE 1=1 ${expFilter}
    GROUP BY category
    ORDER BY total_amount DESC
  `, expParams);

  const totalRevenue = (productProfit?.product_revenue || 0) + (serviceProfit?.service_revenue || 0);
  const totalCost = (productProfit?.product_cost || 0) + (serviceProfit?.service_cost || 0);
  const totalGrossProfit = totalRevenue - totalCost;
  const totalOperatingExpenses = expensesSummary?.total_operating_expenses || 0;
  const netProfit = totalGrossProfit - totalOperatingExpenses;
  const grossMarginPercent = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(1)) : 0;
  const profitMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const expensesBreakdown = expensesByCategory.map((e: any) => ({
    category: e.category,
    amount: e.total_amount || 0,
    count: e.count || 0,
  }));

  const pnlObj = {
    summary: {
      totalRevenue,
      totalCogs: totalCost,
      totalCost,
      grossProfit: totalGrossProfit,
      totalGrossProfit,
      grossMarginPct: grossMarginPercent,
      totalExpenses: totalOperatingExpenses,
      totalOperatingExpenses,
      netProfit,
      netMarginPct: profitMarginPercent,
      profitMarginPercent,
    },
    revenue: {
      productRevenue: productProfit?.product_revenue || 0,
      serviceRevenue: serviceProfit?.service_revenue || 0,
      totalRevenue,
    },
    cogs: {
      productCogs: productProfit?.product_cost || 0,
      serviceCost: serviceProfit?.service_cost || 0,
      totalCogs: totalCost,
    },
    expenses: {
      total: totalOperatingExpenses,
      totalExpenses: totalOperatingExpenses,
      breakdown: expensesBreakdown,
    },
    totalRevenue,
    totalCost,
    totalGrossProfit,
    totalOperatingExpenses,
    netProfit,
    profitMarginPercent,
    productProfit,
    serviceProfit,
    expensesByCategory,
  };

  res.json({
    ...pnlObj,
    pnl: pnlObj,
  });
};

reportsRouter.get('/profit', authenticateToken, handleProfitLoss);
reportsRouter.get('/profit-loss', authenticateToken, handleProfitLoss);

// 3. Products Sold Report
reportsRouter.get('/products', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';

  let dateFilter = '';
  const params: any[] = [];
  if (startDate) {
    dateFilter += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  const productsReport = queryAll(`
    SELECT
      p.sku,
      p.name,
      p.stock_quantity as current_stock,
      p.unit,
      c.name as category_name,
      SUM(si.quantity) as units_sold,
      SUM(si.total) as total_revenue,
      SUM(si.cost_price_snapshot * si.quantity) as total_cost,
      SUM(si.total - (si.cost_price_snapshot * si.quantity)) as total_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE s.status = 'completed' AND si.product_id IS NOT NULL ${dateFilter}
    GROUP BY p.id
    ORDER BY total_revenue DESC
  `, params);

  res.json({ products: productsReport });
});

// 4. Services Sold Report
reportsRouter.get('/services', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';

  let dateFilter = '';
  const params: any[] = [];
  if (startDate) {
    dateFilter += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }

  const servicesReport = queryAll(`
    SELECT
      srv.name,
      srv.unit,
      c.name as category_name,
      SUM(si.quantity) as quantity_served,
      SUM(si.total) as total_revenue,
      SUM(si.cost_price_snapshot * si.quantity) as estimated_cost,
      SUM(si.total - (si.cost_price_snapshot * si.quantity)) as total_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN services srv ON si.service_id = srv.id
    JOIN categories c ON srv.category_id = c.id
    WHERE s.status = 'completed' AND si.service_id IS NOT NULL ${dateFilter}
    GROUP BY srv.id
    ORDER BY total_revenue DESC
  `, params);

  res.json({ services: servicesReport });
});

// 5. Inventory Valuation Report
reportsRouter.get('/inventory-valuation', authenticateToken, (_req: AuthenticatedRequest, res: Response): void => {
  const stats = queryOne(`
    SELECT
      COUNT(*) as total_items,
      COALESCE(SUM(stock_quantity), 0) as total_units,
      COALESCE(SUM(stock_quantity * cost_price), 0) as total_cost_value,
      COALESCE(SUM(stock_quantity * selling_price), 0) as total_retail_value,
      COALESCE(SUM(stock_quantity * (selling_price - cost_price)), 0) as potential_profit,
      SUM(CASE WHEN stock_quantity <= minimum_stock AND stock_quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
    WHERE active = 1
  `);

  const categoryBreakdown = queryAll(`
    SELECT
      c.name as category_name,
      COUNT(p.id) as product_count,
      SUM(p.stock_quantity) as total_units,
      SUM(p.stock_quantity * p.cost_price) as cost_value,
      SUM(p.stock_quantity * p.selling_price) as retail_value
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    GROUP BY c.id
    ORDER BY retail_value DESC
  `);

  const items = queryAll(`
    SELECT
      p.id,
      p.sku,
      p.name,
      p.stock_quantity,
      p.minimum_stock,
      p.unit,
      p.cost_price,
      p.selling_price,
      (p.stock_quantity * p.cost_price) as total_cost_value,
      (p.stock_quantity * p.selling_price) as total_retail_value,
      ((p.selling_price - p.cost_price) * p.stock_quantity) as potential_profit,
      c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    ORDER BY total_retail_value DESC
  `);

  const totalCostVal = stats?.total_cost_value || 0;
  const totalRetailVal = stats?.total_retail_value || 0;
  const potentialGross = stats?.potential_profit || 0;
  const projectedMarginPct = totalRetailVal > 0 ? Number(((potentialGross / totalRetailVal) * 100).toFixed(1)) : 0;

  const valuation = {
    summary: {
      totalItems: stats?.total_items || 0,
      totalUnits: stats?.total_units || 0,
      totalCostValuation: totalCostVal,
      totalCostValue: totalCostVal,
      totalRetailValuation: totalRetailVal,
      totalRetailValue: totalRetailVal,
      potentialGrossProfit: potentialGross,
      potentialProfit: potentialGross,
      projectedMarginPct,
      lowStockCount: stats?.low_stock_count || 0,
      outOfStockCount: stats?.out_of_stock_count || 0,
    },
    totalItems: stats?.total_items || 0,
    totalUnits: stats?.total_units || 0,
    totalCostValue: totalCostVal,
    totalCostValuation: totalCostVal,
    totalRetailValue: totalRetailVal,
    totalRetailValuation: totalRetailVal,
    potentialProfit: potentialGross,
    potentialGrossProfit: potentialGross,
    projectedMarginPct,
    lowStockCount: stats?.low_stock_count || 0,
    outOfStockCount: stats?.out_of_stock_count || 0,
    categoryBreakdown,
    items,
  };

  res.json({
    valuation,
    ...valuation,
  });
});
