import { Router, Response } from 'express';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const cashDrawerRouter = Router();

// Helper to get today YMD
function getTodayYMD(): string {
  return new Date().toISOString().split('T')[0];
}

// Get Cash Drawer status & reconciliation for a given date (defaults to today)
cashDrawerRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const date = (req.query.date as string) || getTodayYMD();
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // 1. Get default opening float from settings
  const settings = queryOne<any>('SELECT default_opening_float, currency FROM business_settings WHERE id = 1');
  const defaultFloat = settings?.default_opening_float ?? 10000;

  // 2. Query today's sales cash payments
  const cashSalesData = queryOne<any>(`
    SELECT COALESCE(SUM(p.amount), 0) as cash_amount, COUNT(DISTINCT s.id) as cash_tx_count
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.status = 'completed' AND p.method = 'cash' AND s.created_at >= ? AND s.created_at <= ?
  `, [dayStart, dayEnd]);
  const cashSales = cashSalesData?.cash_amount || 0;
  const cashTxCount = cashSalesData?.cash_tx_count || 0;

  // 3. Query today's cash expenses
  const cashExpensesData = queryOne<any>(`
    SELECT COALESCE(SUM(amount), 0) as expense_amount, COUNT(*) as expense_count
    FROM expenses
    WHERE payment_method = 'cash' AND created_at >= ? AND created_at <= ?
  `, [dayStart, dayEnd]);
  const cashExpenses = cashExpensesData?.expense_amount || 0;
  const expenseCount = cashExpensesData?.expense_count || 0;

  // 4. Check if session already exists for this date
  const session = queryOne<any>(`
    SELECT cds.*, u.name as user_name, u.username
    FROM cash_drawer_sessions cds
    LEFT JOIN users u ON cds.user_id = u.id
    WHERE cds.session_date = ?
  `, [date]);

  const openingFloat = session ? session.opening_float : defaultFloat;
  const cashAdjustment = session ? (session.cash_adjustment || 0) : 0;
  const countedCash = session && session.counted_cash_in_hand !== null && session.counted_cash_in_hand !== undefined
    ? session.counted_cash_in_hand
    : null;

  const calculatedCashInHand = openingFloat + cashSales - cashExpenses + cashAdjustment;
  const cashInHand = countedCash !== null ? countedCash : calculatedCashInHand;
  const variance = countedCash !== null ? (countedCash - calculatedCashInHand) : 0;

  // 5. Query recent 7-day history of drawer audits
  const history = queryAll<any>(`
    SELECT cds.*, u.name as user_name
    FROM cash_drawer_sessions cds
    LEFT JOIN users u ON cds.user_id = u.id
    ORDER BY cds.session_date DESC
    LIMIT 7
  `);

  res.json({
    date,
    opening_float: openingFloat,
    default_opening_float: defaultFloat,
    cash_sales: cashSales,
    cash_tx_count: cashTxCount,
    cash_expenses: cashExpenses,
    expense_count: expenseCount,
    cash_adjustment: cashAdjustment,
    calculated_cash_in_hand: calculatedCashInHand,
    counted_cash_in_hand: countedCash,
    cash_in_hand: cashInHand,
    variance,
    is_audited: countedCash !== null,
    status: session?.status || 'open',
    notes: session?.notes || '',
    user_name: session?.user_name || null,
    updated_at: session?.updated_at || null,
    history,
  });
});

// Update Opening Float & Cash in Hand count / Drawer Reconciliation
cashDrawerRouter.post('/update', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    session_date: z.string().default(getTodayYMD()),
    opening_float: z.number().min(0, 'Opening float cannot be negative'),
    counted_cash_in_hand: z.number().min(0).nullable().optional(),
    cash_adjustment: z.number().default(0),
    status: z.enum(['open', 'closed', 'reconciled']).default('open'),
    notes: z.string().trim().nullable().optional(),
    set_as_default_float: z.boolean().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const {
    session_date,
    opening_float,
    counted_cash_in_hand,
    cash_adjustment,
    status,
    notes,
    set_as_default_float,
  } = parsed.data;

  const now = new Date().toISOString();
  const userId = req.user?.userId || 1;

  // Check if session exists
  const existing = queryOne<any>('SELECT id FROM cash_drawer_sessions WHERE session_date = ?', [session_date]);

  if (existing) {
    runSql(`
      UPDATE cash_drawer_sessions SET
        opening_float = ?,
        counted_cash_in_hand = ?,
        cash_adjustment = ?,
        status = ?,
        notes = ?,
        user_id = ?,
        updated_at = ?
      WHERE session_date = ?
    `, [
      opening_float,
      counted_cash_in_hand !== undefined ? counted_cash_in_hand : null,
      cash_adjustment,
      status,
      notes || null,
      userId,
      now,
      session_date,
    ]);
  } else {
    runSql(`
      INSERT INTO cash_drawer_sessions (
        session_date, opening_float, counted_cash_in_hand, cash_adjustment, status, notes, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session_date,
      opening_float,
      counted_cash_in_hand !== undefined ? counted_cash_in_hand : null,
      cash_adjustment,
      status,
      notes || null,
      userId,
      now,
      now,
    ]);
  }

  // Update default opening float in business settings if requested
  if (set_as_default_float) {
    runSql('UPDATE business_settings SET default_opening_float = ?, updated_at = ? WHERE id = 1', [
      opening_float,
      now,
    ]);
  }

  const countedStr = counted_cash_in_hand !== null && counted_cash_in_hand !== undefined
    ? `Counted Cash in Hand: KSh ${counted_cash_in_hand}`
    : 'Calculated Cash';

  createAuditLog(
    userId,
    req.user?.username || 'user',
    'update_cash_drawer',
    'cash_drawer',
    existing?.id || null,
    `Cash Drawer Updated for ${session_date} — Opening Float: KSh ${opening_float}, ${countedStr}, Adjustment: KSh ${cash_adjustment}`
  );

  res.json({
    success: true,
    message: 'Cash drawer & opening balance float updated successfully',
    session_date,
    opening_float,
    counted_cash_in_hand: counted_cash_in_hand !== undefined ? counted_cash_in_hand : null,
    cash_adjustment,
    status,
    notes: notes || '',
    updated_at: now,
  });
});
