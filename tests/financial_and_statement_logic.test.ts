import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Financial calculation logic
function calculateFinancialSummary(transactions: Array<{ total: number; discount: number; is_refund?: boolean }>, expenses: number = 0) {
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalRefunds = 0;
  let validTxCount = 0;

  for (const t of transactions) {
    if (t.is_refund) {
      totalRefunds += Math.abs(t.total);
    } else {
      grossSales += (t.total + t.discount);
      totalDiscounts += t.discount;
      validTxCount++;
    }
  }

  const netSales = grossSales - totalDiscounts - totalRefunds;
  const averageTicket = validTxCount > 0 ? Math.round((netSales / validTxCount) * 100) / 100 : 0;
  const netCashPosition = netSales - expenses;

  return {
    grossSales,
    totalDiscounts,
    totalRefunds,
    netSales,
    validTxCount,
    averageTicket,
    netCashPosition,
  };
}

// 2. Customer ledger running balance calculation
interface RawTransaction {
  id: number;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

function computeCustomerStatement(
  customerId: number,
  customerName: string,
  transactions: RawTransaction[],
  startDate?: string,
  endDate?: string
) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let openingBalance = 0;
  const ledgerLines: Array<{
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }> = [];

  const startMs = startDate ? new Date(startDate).getTime() : 0;
  const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;

  let currentBalance = 0;

  for (const t of sorted) {
    const tMs = new Date(t.created_at).getTime();
    const debit = Number(t.total_amount) || 0; // Purchase charge
    const credit = Number(t.total_amount) || 0; // Settled payment

    if (tMs < startMs) {
      // Prior period running balance (0 if fully settled at POS)
      openingBalance += debit - credit;
    } else if (tMs <= endMs) {
      if (ledgerLines.length === 0) {
        currentBalance = openingBalance;
      }
      currentBalance += (debit - credit);
      ledgerLines.push({
        date: t.created_at,
        reference: t.receipt_number,
        description: `POS Sale Receipt (${t.payment_method.toUpperCase()})`,
        debit,
        credit,
        balance: currentBalance,
      });
    }
  }

  const totalDebits = ledgerLines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredits = ledgerLines.reduce((acc, l) => acc + l.credit, 0);

  return {
    customerId,
    customerName,
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: currentBalance,
    lineCount: ledgerLines.length,
    ledgerLines,
  };
}

// 3. Held sale reference generator format
function generateHeldReferenceFormat(year: number, sequence: number) {
  return `HOLD-${year}-${String(sequence).padStart(5, '0')}`;
}

// Tests
test('Financial summary calculates gross, discounts, refunds, and net sales correctly', () => {
  const sampleTxns = [
    { total: 1000, discount: 50 },  // gross 1050, net 1000
    { total: 500, discount: 0 },    // gross 500, net 500
    { total: 200, discount: 20 },   // gross 220, net 200
    { total: -300, discount: 0, is_refund: true }, // refund 300
  ];

  const result = calculateFinancialSummary(sampleTxns, 400);

  assert.equal(result.grossSales, 1050 + 500 + 220); // 1770
  assert.equal(result.totalDiscounts, 70);
  assert.equal(result.totalRefunds, 300);
  assert.equal(result.netSales, 1770 - 70 - 300); // 1400
  assert.equal(result.validTxCount, 3);
  assert.equal(result.averageTicket, Math.round((1400 / 3) * 100) / 100);
  assert.equal(result.netCashPosition, 1400 - 400); // 1000
});

test('Customer statement builds chronological ledger with debits and settled credits', () => {
  const txns: RawTransaction[] = [
    { id: 1, receipt_number: 'RCPT-2026-000001', total_amount: 1500, payment_method: 'mpesa', created_at: '2026-01-15T10:00:00Z' },
    { id: 2, receipt_number: 'RCPT-2026-000002', total_amount: 800, payment_method: 'cash', created_at: '2026-02-10T14:30:00Z' },
    { id: 3, receipt_number: 'RCPT-2026-000003', total_amount: 3200, payment_method: 'card', created_at: '2026-03-05T09:15:00Z' },
  ];

  const statement = computeCustomerStatement(101, 'Jane Doe', txns);

  assert.equal(statement.customerId, 101);
  assert.equal(statement.customerName, 'Jane Doe');
  assert.equal(statement.lineCount, 3);
  assert.equal(statement.totalDebits, 1500 + 800 + 3200);
  assert.equal(statement.totalCredits, 1500 + 800 + 3200);
  assert.equal(statement.closingBalance, 0);
  assert.equal(statement.ledgerLines[0].reference, 'RCPT-2026-000001');
  assert.equal(statement.ledgerLines[2].reference, 'RCPT-2026-000003');
});

test('Customer statement filters by date range correctly', () => {
  const txns: RawTransaction[] = [
    { id: 1, receipt_number: 'RCPT-2026-000001', total_amount: 1000, payment_method: 'cash', created_at: '2026-01-01T10:00:00Z' },
    { id: 2, receipt_number: 'RCPT-2026-000002', total_amount: 2500, payment_method: 'mpesa', created_at: '2026-02-15T10:00:00Z' },
    { id: 3, receipt_number: 'RCPT-2026-000003', total_amount: 4000, payment_method: 'card', created_at: '2026-03-20T10:00:00Z' },
  ];

  const statement = computeCustomerStatement(102, 'John Smith', txns, '2026-02-01', '2026-02-28');

  assert.equal(statement.lineCount, 1);
  assert.equal(statement.ledgerLines[0].reference, 'RCPT-2026-000002');
  assert.equal(statement.totalDebits, 2500);
  assert.equal(statement.totalCredits, 2500);
});

test('Held sales reference formatting generates standard POS tickets', () => {
  assert.equal(generateHeldReferenceFormat(2026, 1), 'HOLD-2026-00001');
  assert.equal(generateHeldReferenceFormat(2026, 42), 'HOLD-2026-00042');
  assert.equal(generateHeldReferenceFormat(2026, 9999), 'HOLD-2026-09999');
});
