import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from '../auth/jwt.js';

export const reportsRouter = Router();

// 1. Sales Report
reportsRouter.get('/sales', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';
  const cashierId = req.query.cashier_id ? Number(req.query.cashier_id) : null;
  const customerId = req.query.customer_id ? Number(req.query.customer_id) : null;
  const paymentMethod = req.query.payment_method ? String(req.query.payment_method).trim() : '';

  let filterSql = '';
  const params: any[] = [];

  if (startDate) {
    filterSql += ' AND s.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    filterSql += ' AND s.created_at <= ?';
    params.push(endDate + 'T23:59:59.999Z');
  }
  if (cashierId) {
    filterSql += ' AND s.cashier_id = ?';
    params.push(cashierId);
  }
  if (customerId) {
    filterSql += ' AND s.customer_id = ?';
    params.push(customerId);
  }
  if (paymentMethod) {
    filterSql += ' AND EXISTS (SELECT 1 FROM payments p WHERE p.sale_id = s.id AND p.method = ?)';
    params.push(paymentMethod);
  }

  // Summary of completed sales
  const summary = queryOne(`
    SELECT
      COUNT(*) as total_sales_count,
      COALESCE(SUM(s.subtotal), 0) as total_subtotal,
      COALESCE(SUM(s.discount), 0) as total_discount,
      COALESCE(SUM(s.tax), 0) as total_tax,
      COALESCE(SUM(s.total), 0) as total_revenue,
      COALESCE(AVG(s.total), 0) as average_ticket_value
    FROM sales s
    WHERE s.status = 'completed' ${filterSql}
  `, params);

  // Summary of refunds in period
  const refundsSummary = queryOne(`
    SELECT
      COUNT(*) as refund_count,
      COALESCE(SUM(s.total), 0) as total_refunded
    FROM sales s
    WHERE s.status = 'refunded' ${filterSql}
  `, params);

  const grossSales = summary?.total_subtotal || summary?.total_revenue || 0;
  const totalDiscounts = summary?.total_discount || 0;
  const refundTotal = refundsSummary?.total_refunded || 0;
  const refundCount = refundsSummary?.refund_count || 0;
  const netSales = Math.max(0, (summary?.total_revenue || 0) - refundTotal);
  const txCount = summary?.total_sales_count || 0;
  const averageTransaction = txCount > 0 ? (summary?.total_revenue || 0) / txCount : 0;

  // Grouped by Date (Day)
  const salesByDate = queryAll(`
    SELECT
      DATE(s.created_at) as sale_date,
      COUNT(*) as transaction_count,
      SUM(s.subtotal) as subtotal,
      SUM(s.discount) as discount,
      SUM(s.total) as revenue
    FROM sales s
    WHERE s.status = 'completed' ${filterSql}
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
    WHERE s.status = 'completed' ${filterSql}
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
    WHERE s.status = 'completed' ${filterSql}
    GROUP BY p.method
    ORDER BY total_amount DESC
  `, params);

  // Individual detailed transactions matching filters
  const transactions = queryAll(`
    SELECT
      s.id,
      s.receipt_number,
      s.created_at,
      s.subtotal,
      s.discount,
      s.total,
      s.status,
      u.name as cashier_name,
      COALESCE(c.name, 'Walk-in Client') as customer_name,
      (SELECT GROUP_CONCAT(method, ', ') FROM payments p WHERE p.sale_id = s.id) as payment_methods
    FROM sales s
    JOIN users u ON s.cashier_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1 ${filterSql}
    ORDER BY s.created_at DESC
    LIMIT 200
  `, params);

  const salesResult = {
    summary: {
      ...summary,
      grossSales,
      totalDiscounts,
      refundCount,
      refundTotal,
      netSales,
      averageTransaction,
      transactionCount: txCount,
    },
    grossSales,
    totalDiscounts,
    refundCount,
    refundTotal,
    netSales,
    averageTransaction,
    salesByDate,
    salesByCashier,
    salesByMethod,
    transactions,
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

reportsRouter.get('/inventory', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const valuationRes = queryOne(`
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

  const lowStockItems = queryAll(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1 AND p.stock_quantity <= p.minimum_stock AND p.stock_quantity > 0
    ORDER BY p.stock_quantity ASC
  `);

  const outOfStockItems = queryAll(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1 AND p.stock_quantity = 0
    ORDER BY p.name ASC
  `);

  const recentMovements = queryAll(`
    SELECT im.*, p.name as product_name, p.sku, u.name as user_name
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
    JOIN users u ON im.user_id = u.id
    ORDER BY im.created_at DESC
    LIMIT 50
  `);

  const items = queryAll(`
    SELECT p.*, c.name as category_name,
      (p.stock_quantity * p.cost_price) as cost_value,
      (p.stock_quantity * p.selling_price) as retail_value
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    ORDER BY p.stock_quantity ASC
  `);

  res.json({
    summary: valuationRes,
    lowStockItems,
    outOfStockItems,
    recentMovements,
    items,
  });
});

// 6. Cashiers Performance Report
reportsRouter.get('/cashiers', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
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

  const cashiers = queryAll(`
    SELECT
      u.id,
      u.name,
      u.username,
      u.role,
      COUNT(CASE WHEN s.status = 'completed' THEN s.id END) as transaction_count,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.subtotal ELSE 0 END), 0) as gross_sales,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.discount ELSE 0 END), 0) as total_discounts,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total ELSE 0 END), 0) as total_revenue,
      COUNT(CASE WHEN s.status = 'refunded' THEN s.id END) as refund_count,
      COALESCE(SUM(CASE WHEN s.status = 'refunded' THEN s.total ELSE 0 END), 0) as refund_total,
      COUNT(CASE WHEN s.status = 'voided' THEN s.id END) as void_count
    FROM users u
    LEFT JOIN sales s ON s.cashier_id = u.id ${dateFilter}
    GROUP BY u.id
    ORDER BY total_revenue DESC, u.name ASC
  `, params);

  const cashiersEnriched = cashiers.map((c: any) => {
    const tx = c.transaction_count || 0;
    const rev = c.total_revenue || 0;
    const ref = c.refund_total || 0;
    const net = Math.max(0, rev - ref);
    const avg = tx > 0 ? Math.round((rev / tx) * 100) / 100 : 0;

    // Breakdown payments for this cashier
    const paymentParams = [c.id];
    let payDateFilter = '';
    if (startDate) {
      payDateFilter += ' AND s.created_at >= ?';
      paymentParams.push(startDate);
    }
    if (endDate) {
      payDateFilter += ' AND s.created_at <= ?';
      paymentParams.push(endDate + 'T23:59:59.999Z');
    }

    const payments = queryAll(`
      SELECT p.method, COALESCE(SUM(p.amount), 0) as amount
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.status = 'completed' AND s.cashier_id = ? ${payDateFilter}
      GROUP BY p.method
    `, paymentParams);

    const paymentMap: Record<string, number> = { cash: 0, mpesa: 0, card: 0, other: 0 };
    for (const p of payments) {
      paymentMap[p.method] = p.amount;
    }

    return {
      ...c,
      netSales: net,
      net_sales: net,
      total_sales: rev,
      total_transactions: tx,
      discounts: c.total_discounts || 0,
      refunds: ref,
      averageTransaction: avg,
      average_transaction_value: avg,
      payments: paymentMap,
      payment_methods: paymentMap,
    };
  });

  res.json({ cashiers: cashiersEnriched });
});

// 7. Customers Performance Report
reportsRouter.get('/customers', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const startDate = req.query.start_date ? String(req.query.start_date) : '';
  const endDate = req.query.end_date ? String(req.query.end_date) : '';
  const search = req.query.search ? String(req.query.search).trim() : '';

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

  let searchFilter = '';
  if (search) {
    searchFilter = ' WHERE (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p);
  }

  const customers = queryAll(`
    SELECT
      c.id,
      c.name,
      c.phone,
      c.email,
      c.address,
      c.created_at,
      COUNT(s.id) as total_purchases,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total ELSE 0 END), 0) as total_spending,
      MAX(CASE WHEN s.status = 'completed' THEN s.created_at END) as last_purchase_date
    FROM customers c
    LEFT JOIN sales s ON s.customer_id = c.id ${dateFilter}
    ${searchFilter}
    GROUP BY c.id
    ORDER BY total_spending DESC, total_purchases DESC
  `, params);

  const customersEnriched = customers.map((c: any) => {
    const purchases = c.total_purchases || 0;
    const spending = c.total_spending || 0;
    const avg = purchases > 0 ? Math.round((spending / purchases) * 100) / 100 : 0;
    return {
      ...c,
      total_spent: spending,
      averagePurchase: avg,
      average_ticket: avg,
    };
  });

  res.json({ customers: customersEnriched });
});
