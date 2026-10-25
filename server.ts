import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db/database.js';
import { initializeSchema } from './server/db/schema.js';
import { seedDatabase } from './server/db/seed.js';

import { authRouter } from './server/routes/auth.js';
import { categoriesRouter } from './server/routes/categories.js';
import { productsRouter } from './server/routes/products.js';
import { servicesRouter } from './server/routes/services.js';
import { inventoryRouter } from './server/routes/inventory.js';
import { salesRouter } from './server/routes/sales.js';
import { customersRouter } from './server/routes/customers.js';
import { expensesRouter } from './server/routes/expenses.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { reportsRouter } from './server/routes/reports.js';
import { usersRouter } from './server/routes/users.js';
import { settingsRouter } from './server/routes/settings.js';
import { auditLogsRouter } from './server/routes/audit_logs.js';
import { backupsRouter } from './server/routes/backups.js';
import { discountsRouter } from './server/routes/discounts.js';
import { cashDrawerRouter } from './server/routes/cash_drawer.js';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/discounts', discountsRouter);
  app.use('/api/cash-drawer', cashDrawerRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      business: 'BRIGHT CYBER & ICT CENTRE',
      system: 'Bright Cyber POS',
      currency: 'KES',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite development vs production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize SQLite Database, Schema, and Seeds synchronously before accepting requests
  try {
    console.log('Initializing Bright Cyber POS database...');
    await getDb();
    await initializeSchema();
    await seedDatabase();
    console.log('Bright Cyber POS database ready.');
  } catch (error) {
    console.error('Database initialization error:', error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bright Cyber POS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
