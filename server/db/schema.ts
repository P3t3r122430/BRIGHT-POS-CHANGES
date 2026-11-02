import { getDb, runSql, queryOne } from './database.js';

export async function initializeSchema(): Promise<void> {
  await getDb();

  const createTablesSql = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('service', 'product')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'piece',
      supplier TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

    -- Services table
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER NOT NULL,
      price REAL NOT NULL,
      cost_estimate REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'job',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      cashier_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'voided', 'refunded')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    );

    -- Sale items table (financial snapshots for immutable reporting)
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      service_id INTEGER,
      item_name_snapshot TEXT NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      cost_price_snapshot REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'unit',
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (service_id) REFERENCES services (id)
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash', 'mpesa', 'card', 'bank', 'other')),
      amount REAL NOT NULL,
      reference TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
    );

    -- Inventory movements table
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'restock', 'damage', 'loss', 'adjustment', 'refund_return')),
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reason TEXT,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Expenses table
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Price history table
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('product', 'service')),
      entity_id INTEGER NOT NULL,
      old_price REAL NOT NULL,
      new_price REAL NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Business settings table
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      business_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      receipt_footer TEXT,
      currency TEXT NOT NULL DEFAULT 'KES',
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_enabled INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      receipt_prefix TEXT NOT NULL DEFAULT 'BC-',
      allow_negative_stock INTEGER NOT NULL DEFAULT 0,
      default_opening_float REAL NOT NULL DEFAULT 10000,
      mpesa_paybill_or_till TEXT,
      services_mpesa_paybill TEXT DEFAULT '4298298',
      services_mpesa_account TEXT DEFAULT '0350494',
      products_mpesa_paybill TEXT DEFAULT '247247',
      products_mpesa_account TEXT DEFAULT '768726',
      updated_at TEXT NOT NULL
    );

    -- Cash Drawer / Register Shift Sessions
    CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date TEXT UNIQUE NOT NULL,
      opening_float REAL NOT NULL DEFAULT 10000,
      counted_cash_in_hand REAL,
      cash_adjustment REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'reconciled')),
      notes TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Discounts & Promotional Rules table
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
      value REAL NOT NULL,
      min_spend REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all', 'product', 'service')),
      is_quick_preset INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales(receipt_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_drawer_sessions_date ON cash_drawer_sessions(session_date);
  `;

  // Run schema statement batches
  const statements = createTablesSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    runSql(statement);
  }

  // Safe migrations for existing business_settings columns
  const migrationColumns = [
    { col: 'services_mpesa_paybill', def: "TEXT DEFAULT '4298298'" },
    { col: 'services_mpesa_account', def: "TEXT DEFAULT '0350494'" },
    { col: 'products_mpesa_paybill', def: "TEXT DEFAULT '247247'" },
    { col: 'products_mpesa_account', def: "TEXT DEFAULT '768726'" },
    { col: 'default_opening_float', def: "REAL DEFAULT 10000" },
  ];

  for (const m of migrationColumns) {
    try {
      runSql(`ALTER TABLE business_settings ADD COLUMN ${m.col} ${m.def}`);
    } catch {
      // Column may already exist
    }
  }

  // Ensure default M-Pesa paybill values are set if null or old defaults
  try {
    runSql(`
      UPDATE business_settings SET
        services_mpesa_paybill = COALESCE(NULLIF(services_mpesa_paybill, ''), '4298298'),
        services_mpesa_account = COALESCE(NULLIF(services_mpesa_account, ''), '0350494'),
        products_mpesa_paybill = COALESCE(NULLIF(products_mpesa_paybill, ''), '247247'),
        products_mpesa_account = COALESCE(NULLIF(products_mpesa_account, ''), '768726'),
        mpesa_paybill_or_till = 'Services: Paybill 4298298 (Acc: 0350494) | Products: Paybill 247247 (Acc: 768726)'
      WHERE id = 1
    `);
  } catch {
    // Ignore if table not yet populated
  }

  // Purge any deactivated physical products
  try {
    runSql('UPDATE sale_items SET product_id = NULL WHERE product_id IN (SELECT id FROM products WHERE active = 0)');
    runSql('DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE active = 0)');
    runSql("DELETE FROM price_history WHERE entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE active = 0)");
    runSql('DELETE FROM products WHERE active = 0');
  } catch (err) {
    console.warn('Deactivated products cleanup note:', err);
  }
}
