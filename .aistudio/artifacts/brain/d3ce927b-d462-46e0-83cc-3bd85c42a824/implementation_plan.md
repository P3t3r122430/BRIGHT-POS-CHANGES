# Bright Cyber POS — V2 Architectural Upgrade Plan

Upgrade the existing **Bright Cyber POS** to **V2** with enhanced security hardening, hold/park sale capabilities, daily financial dashboard metrics, advanced multi-dimensional reports, comprehensive customer accounts & printable statements, and automated scheduled backups. All upgrades strictly preserve existing database structures, historical records, and POS operating workflows.

---

## Critical Philosophy & Data Safety Rules

> [!IMPORTANT]
> **Preservation Guarantee**:
> 1. Zero data destruction: No existing tables will be dropped, altered destructively, or emptied. Existing products, services, sales, payments, customers, inventory movements, and backup files remain untouched.
> 2. Backward compatibility: All schema updates utilize `CREATE TABLE IF NOT EXISTS` or non-destructive `ALTER TABLE ... ADD COLUMN` statements.
> 3. Zero architectural churn: The system remains on SQLite (`sql.js`), Node.js 22, Express, and React 19 SPA. No external services (Firebase, Supabase, Cloud SQL) will be introduced.

---

## 1. System Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRIGHT CYBER POS V2                             │
│                  Browser POS Client (React 19 SPA)                     │
└──────┬──────────────────────┬───────────────────────────┬──────────────┘
       │                      │                           │
       ▼                      ▼                           ▼
┌──────────────┐       ┌──────────────┐            ┌──────────────┐
│  POS Terminal│       │ Financial &  │            │  Customers   │
│  & Held Cart │       │ Reports Hub  │            │  & Statement │
│  (Hold/Park) │       │ (KPIs & P&L) │            │  (Ledger)    │
└──────┬───────┘       └──────┬───────┘            └──────┬───────┘
       │                      │                           │
       └──────────────────────┼───────────────────────────┘
                              │ REST API (/api/*) + JWT Bearer
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express Backend Application                         │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Security & Auth       │   │ Automated Backup Scheduler           │  │
│  │ - 512-bit crypto secret│  │ - Daily/Weekly cron tick (60s loop)  │  │
│  │ - Role-based guards   │   │ - Snapshot verification & retention  │  │
│  │ - No secret logging   │   │ - Emergency pre-restore snapshots    │  │
│  └───────────────────────┘   └──────────────────────────────────────┘  │
│                                                                        │
│  API Routers:                                                          │
│  /auth | /sales (Hold API) | /dashboard | /reports | /customers        │
│  /backups (Schedule API) | /inventory | /settings | /audit-logs       │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Direct SQL Queries / Transactions
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  SQLite Database (sql.js + Disk Sync)                  │
│                                                                        │
│  Existing: users, products, services, sales, sale_items, payments,    │
│            inventory_movements, expenses, audit_logs, settings         │
│  New/Enhanced:                                                         │
│   • held_sales (Persistent server-authoritative hold/park cart)        │
│   • customers (+address column)                                        │
│   • business_settings (+auto_backup_* configuration columns)           │
│   • automated timestamped snapshots in /backups                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Implementation Blueprint

### Phase 1 — Security Hardening
- **JWT Key Hardening**:
  - Remove hardcoded fallback secret (`brightcyber-pos-enterprise-...`).
  - Generate a persistent 64-byte (512-bit) cryptographically random secret in `/data/jwt.secret` with strict read permissions.
  - Require this secret on startup; never expose it to client payloads or logs.
- **Log Sanitization**:
  - Strip `console.log` statements outputting password checks or sensitive user query payloads in `server/routes/auth.ts`.
  - Prevent passwords, tokens, and filesystem paths from ever being written to `audit_logs`.
- **Audit Logging Enhancement**:
  - Record failed login attempts (tracking username attempted, timestamp, IP/agent without password).
  - Record user logouts, held sales, resumed sales, cancelled sales, customer updates, backup creations, restore events, and settings changes.
- **Route Authorization Verification**:
  - Maintain cashier access to standard POS operations: sales checkout, held cart resume/hold, customer search/registration, reading product catalogues.
  - Enforce `requireAdmin` on voids, refunds, inventory manual adjustments, staff user creation/passwords, database restoration, and system settings mutation.

### Phase 2 — Hold / Park Sale
- **Persistent Server-Authoritative Storage**:
  - Create table `held_sales` in SQLite.
  - Store: `id`, `reference_number` (e.g. `HOLD-2026-0001`), `cashier_id`, `customer_id`, `customer_name`, `items_json`, `subtotal`, `discount`, `tax`, `total`, `notes`, `created_at`, `updated_at`.
- **Safety**:
  - Held sales do **not** affect inventory or revenue until actually checked out.
  - When a cashier clicks **Hold Sale**, the active cart is validated, persisted to `held_sales`, logged in audit logs, and cleared from the active screen.
  - When resuming, the POS prompts confirmation if the active cart currently has items to prevent accidental data loss.
  - Deleting/cancelling a held sale prompts confirmation and deletes the record from `held_sales`.
- **UI Integration**:
  - Dedicated **Hold Sale** button on active cart and **Held Sales (Count)** queue indicator in `PosScreen`.
  - Responsive modal showing Held Ticket #, Customer, Cashier, Date/Time, Item Count, Total, with **Resume Sale** and **Cancel / Discard** actions.

### Phase 3 — Daily Financial Dashboard
- **Financial Metric Calculations**:
  - **Today's Financial Overview**:
    - Gross Sales (Sum of subtotals of completed sales)
    - Discounts (Sum of discounts granted)
    - Refunds (Count and total refunded amount)
    - Net Sales (`Gross Sales - Discounts - Refunds`)
    - Cost of Goods Sold (COGS: `SUM(si.cost_price_snapshot * si.quantity)`)
    - Gross Profit (`Net Sales - COGS`)
    - Payment Method Breakdown: Cash sales, M-Pesa sales, Card sales, Other
    - Operating Expenses & Net Cash Position (`Opening Float + Cash Sales - Cash Expenses + Adjustments`)
  - **Performance & Executive Metrics**:
    - Average Transaction Value (`Net Sales / Completed Transactions`)
    - Best-Selling Product (Units sold & revenue realized)
    - Best-Selling Service (Volume delivered & revenue realized)
    - Top Cashier (Transaction count & total volume)
    - Top Customer (Purchases count & total spend)
    - Voided / Cancelled Transactions count
  - **Filters**: Today, Yesterday, This Week, This Month, Custom Date Range.
  - Zero historical modification; all figures dynamically aggregated from the immutable transaction ledger.

### Phase 4 — Advanced Reports
- **Enhanced Reports Hub**:
  1. **Sales Report**: Filterable by Date Range, Cashier, Customer, and Payment Method; outputs Gross Sales, Discounts, Refunds, Net Sales, and Ticket Average.
  2. **Profit & Loss Report**: Full income statement with Product vs Service margins, direct COGS, categorized operational expenses, and Net Profit margin.
  3. **Product Merchandise Report**: Units sold, revenue, cost, gross profit, current stock, segmented into *Best Sellers*, *Slow Movers*, *Low Stock*, and *Out of Stock*.
  4. **Service Tariff Report**: Service name, category, volume rendered, revenue generated, estimated direct cost, and average ticket price.
  5. **Cashier Performance Report**: Cashier name, transaction volume, gross sales, refunds processed, discounts given, and payment method collections.
  6. **Customer Accounts Report**: Customer name, transactions count, lifetime spend, average purchase value, and last purchase date.
  7. **Inventory Valuation & Movement Report**: Current stock units, valuation at cost, valuation at retail, projected gross profit, and audit trail of inventory movements.
- **Export & Print**:
  - Export to CSV with formatted headers and date ranges.
  - Clean printable statements with Bright Cyber branding, period metadata, and professional layout.
  - Dedicated tab view for browser PDF generation.

### Phase 5 & 6 — Customer Accounts & Purchase History
- **Customer Profiles**:
  - Schema extension: Add `address` column to `customers` table.
  - Customer profile cards with Customer ID (`CUST-000X`), Name, Phone, Email, Address, Date Registered, Notes, Lifetime Spend, and Purchase Count.
  - Quick multi-field search by Name, Phone, and Customer ID.
- **Purchase History Ledger**:
  - Chronological transaction list for each customer: Receipt #, Date & Time, Summary of items/services, Total Amount, Payment Method, Cashier, and Status.
  - Click to view/reprint full transaction receipt.

### Phase 7 — Printable Customer Statements
- **Statement Generator**:
  - Select customer + Date Range (From Date — To Date).
  - Clean statement header: **BRIGHT CYBER ICT CENTRE**, Business contacts, Customer Details (Name, Phone, ID, Address), Statement Period.
  - Statement Ledger Table:
    `| Date | Receipt # | Description / Items | Amount (Debit) | Payment Received | Running Balance |`
  - Financial Summary Card: Opening Balance, Total Purchases, Total Payments Received, Closing Balance.
  - Action buttons: **Print Statement** and **Download Statement (HTML / PDF Print)**.

### Phase 8 — Automatic Scheduled Backups
- **Configuration & Persistence**:
  - Add settings columns to `business_settings`:
    - `auto_backup_enabled` (0 or 1, default 1)
    - `auto_backup_frequency` ('daily' or 'weekly', default 'daily')
    - `auto_backup_time` ('23:00' default)
    - `auto_backup_retention` (number of backups to retain, default 7)
    - `auto_backup_last_run`, `auto_backup_last_status`, `auto_backup_last_error`
- **Background Engine (`server/services/scheduler.ts`)**:
  - Runs in the Express process on a 60-second non-blocking tick.
  - Compares current time with configured backup time; triggers backup when due.
  - Verifies SQLite database existence, executes safe database snapshot export, writes timestamped `.db` file in `backups/`, verifies written file size > 0.
  - Prunes older backups beyond the configured retention limit (`auto_backup_retention`), never deleting the live database or the only remaining backup.
  - Logs success or failure to `audit_logs`.
- **Restore Safety Protocol**:
  - Always creates an emergency timestamped snapshot (`brightcyber-emergency-pre-restore-*.db`) before overwriting.
  - Requires Admin role.
  - Validates SQLite magic header in the target backup before restoring.
  - Logs restoration to audit log.

---

## 3. Database Schema Changes & Backward Compatibility

### Existing Tables Involved
- `users`: Preserved; role checks strictly enforced.
- `customers`: Preserved; non-destructive column addition:
  ```sql
  ALTER TABLE customers ADD COLUMN address TEXT;
  ```
- `sales`, `sale_items`, `payments`: Preserved 100% immutable; read-only financial queries.
- `business_settings`: Preserved; non-destructive column additions for backup scheduler:
  ```sql
  ALTER TABLE business_settings ADD COLUMN auto_backup_enabled INTEGER DEFAULT 1;
  ALTER TABLE business_settings ADD COLUMN auto_backup_frequency TEXT DEFAULT 'daily';
  ALTER TABLE business_settings ADD COLUMN auto_backup_time TEXT DEFAULT '23:00';
  ALTER TABLE business_settings ADD COLUMN auto_backup_retention INTEGER DEFAULT 7;
  ALTER TABLE business_settings ADD COLUMN auto_backup_last_run TEXT;
  ALTER TABLE business_settings ADD COLUMN auto_backup_last_status TEXT;
  ALTER TABLE business_settings ADD COLUMN auto_backup_last_error TEXT;
  ```
- `audit_logs`: Preserved; expanded action types (`login_failed`, `hold_sale`, `resume_sale`, `cancel_held_sale`, `auto_backup`, `restore_database`).

### New Table Required
```sql
CREATE TABLE IF NOT EXISTS held_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number TEXT UNIQUE NOT NULL,
  cashier_id INTEGER NOT NULL,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cashier_id) REFERENCES users (id),
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);
CREATE INDEX IF NOT EXISTS idx_held_sales_created ON held_sales(created_at);
```

---

## 4. API Endpoints Map

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Authenticate user; log success or failed login |
| `/api/sales/held` | GET | Cashier/Admin | List all active held sales queue |
| `/api/sales/held` | POST | Cashier/Admin | Park / hold a sale from active cart |
| `/api/sales/held/:id` | GET | Cashier/Admin | Retrieve held sale details |
| `/api/sales/held/:id` | DELETE | Cashier/Admin | Cancel / discard a held sale |
| `/api/dashboard/stats` | GET | Cashier/Admin | Comprehensive daily financial metrics & top performers |
| `/api/reports/sales` | GET | Cashier/Admin | Multi-filter sales report (cashier, customer, method, dates) |
| `/api/reports/cashiers` | GET | Admin | Cashier performance & audit summary |
| `/api/reports/customers` | GET | Cashier/Admin | Customer purchase metrics report |
| `/api/reports/inventory` | GET | Cashier/Admin | Stock valuation, movements, and stock status |
| `/api/customers` | GET/POST | Cashier/Admin | Customer listing (search by name, phone, ID) & creation |
| `/api/customers/:id` | GET/PUT | Cashier/Admin | Customer details, address, notes, purchase history |
| `/api/customers/:id/statement` | GET | Cashier/Admin | Generate customer periodic account statement |
| `/api/backups/schedule` | GET/PUT | Admin | View and update automated backup frequency and retention |
| `/api/backups/restore` | POST | Admin | Restore with automatic emergency snapshot & validation |

---

## 5. Frontend Components Map

1. `src/components/pos/PosScreen.tsx`:
   - Connect Park/Hold action directly to `/api/sales/held`.
   - Update Held Sales modal with ticket numbers, timestamps, item breakdowns, total, and resume/cancel actions.
2. `src/components/dashboard/DashboardScreen.tsx` & subcomponents:
   - Render financial cards: Gross sales, Discounts, Refunds, Net sales, COGS, Gross profit, Cash, M-Pesa, Card, Other, Expenses, Net cash position.
   - Render Top Performers cards: Best-selling product, best-selling service, top cashier, top customer.
3. `src/components/reports/ReportsScreen.tsx`:
   - Add Cashier and Customer report views.
   - Add multi-dimensional filter bar (Date range, Cashier, Customer, Payment method).
   - Export options: CSV, Dedicated tab, Print view.
4. `src/components/customers/CustomersScreen.tsx`:
   - Customer profile dialog with address, notes, and stats.
   - Purchase history table with receipt modal trigger.
   - Customer Statement generator modal with date range filter, table of debits/credits, running totals, and Print/PDF actions.
5. `src/components/backup/BackupScreen.tsx`:
   - Automated Backup card displaying status (ENABLED/DISABLED), frequency, time, retention count, last run status, next scheduled run.
   - Emergency snapshot confirmation modal on restore.

---

## 6. Testing & Verification Strategy

- **Database Integrity Test**: Verify that existing 270+ products, sales records, customers, and payments load without schema error.
- **Security Check**:
  - Attempt login with invalid credentials -> ensure audit log recorded and no secret in response.
  - Verify unauthorized access to admin endpoints returns 403 Forbidden.
- **Hold / Resume Cart Flow**:
  - Add items -> click Hold Sale -> verify cart clears and ticket appears in Held Sales.
  - Resume ticket -> verify exact items, quantities, and discounts are restored in cart.
  - Complete checkout -> verify sale completes and inventory is deducted.
- **Dashboard Calculations**:
  - Compare calculated Net Sales, COGS, and Gross Profit with raw database queries.
- **Customer Statement**:
  - Generate statement for a customer -> verify dates, receipts, running totals, and print styling.
- **Backup & Retention**:
  - Trigger manual and scheduled backups -> verify file written, audit logged, and retention prunes only excess older files without touching the live database.
