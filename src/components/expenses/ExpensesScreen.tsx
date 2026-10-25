import React, { useState, useEffect } from 'react';
import { Expense } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import { CashDrawerModal } from '../dashboard/CashDrawerModal';
import {
  Wallet,
  Plus,
  Search,
  RotateCcw,
  Receipt,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Vault,
  Edit3
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity & Tokens',
  'Fiber Internet',
  'Paper & Printing Consumables',
  'Stock Purchases',
  'Hardware & Printer Repairs',
  'Staff Wages & Allowances',
  'Office Refreshments',
  'Taxes & Licenses',
  'Other Expenses',
];

export const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Cash Drawer Modal state
  const [drawerModalOpen, setDrawerModalOpen] = useState<boolean>(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = '/expenses?';
      if (categoryFilter !== 'all') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await api.get<{ expenses: Expense[] }>(url);
      setExpenses(res.expenses || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load expenses:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, startDate, endDate]);

  const handleOpenAdd = () => {
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription('');
    setAmount('');
    setPaymentMethod('cash');
    setNotes('');
    setModalOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim() || isNaN(amt) || amt <= 0) return;

    try {
      setSaving(true);
      await api.post('/expenses', {
        category,
        description: description.trim(),
        amount: amt,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });

      setModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.user_name && e.user_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-[#C5A059]" /> Operating Outlays & Expenses
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Utilities, electricity tokens, internet, toner cartridges, and maintenance disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-reconcile-drawer"
            onClick={() => setDrawerModalOpen(true)}
            className="px-3.5 py-2 border border-[#333333] hover:border-[#C5A059] bg-[#141414] hover:bg-[#1A1A1A] text-[#E5E5E0] font-semibold text-xs uppercase tracking-[0.14em] rounded transition flex items-center gap-2 cursor-pointer"
          >
            <Vault className="w-3.5 h-3.5 text-[#C5A059]" /> Reconcile Cash Drawer & Float
          </button>

          <button
            id="btn-record-expense"
            onClick={handleOpenAdd}
            className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-black" /> Log Outlay
          </button>
        </div>
      </div>

      {/* Expense KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Total Recorded Outlays</div>
          <div className="text-2xl font-serif text-[#E5E5E0] mt-1.5 font-medium">
            {formatKsh(totalExpenseAmount)}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Across {expenses.length} logged entries</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Filtered Transactions</div>
          <div className="text-2xl font-serif text-[#C5A059] mt-1.5 font-medium">
            {filteredExpenses.length}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Active query matching criteria</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Top Operational Category</div>
          <div className="text-2xl font-serif text-[#E5E5E0] mt-1.5 font-medium truncate">
            {expenses.length > 0 ? expenses[0].category : 'None'}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Primary cost disbursement</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D0D0D] p-3.5 rounded border border-[#222222] text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses by description, category, or recorder..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Outlay Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[#141414] px-2.5 py-1 rounded border border-[#262626]">
            <Calendar className="w-3.5 h-3.5 text-[#666666]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-[#E5E5E0] focus:outline-none"
            />
            <span className="text-[#555555] text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-[#E5E5E0] focus:outline-none"
            />
          </div>

          <button
            onClick={fetchExpenses}
            className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Particulars</th>
                <th className="py-3 px-4">Disbursement Method</th>
                <th className="py-3 px-4 text-right">Amount (KSh)</th>
                <th className="py-3 px-4 text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#555555]">
                    Loading outlays ledger...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#555555]">
                    No outlays found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-mono text-[#888888] text-[11px]">
                      {formatDate(exp.created_at)}
                    </td>
                    <td className="py-2.5 px-4 text-[#C5A059] font-medium text-[11px]">{exp.category}</td>
                    <td className="py-2.5 px-4">
                      <div className="text-[#E5E5E0] font-medium">{exp.description}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-[#777777] mt-0.5">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#AAAAAA] uppercase font-mono text-[10px]">
                      {exp.payment_method}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#E5E5E0] font-medium">
                      {formatKsh(exp.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#777777]">{exp.user_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">Log Operating Outlay</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Expense Classification *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Description / Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya Power Tokens 500 units or 3 Reams A4 Paper"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Amount (KSh) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-serif text-[#C5A059] font-medium focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Disbursement Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="cash">Drawer Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Receipt / Invoice Ref No</label>
                <input
                  type="text"
                  placeholder="e.g. Token Ref: 8901-2345-6789"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#181818] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow"
                >
                  {saving ? 'Recording...' : 'Record Outlay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Drawer Reconciliation & Float Modal */}
      <CashDrawerModal
        isOpen={drawerModalOpen}
        onClose={() => setDrawerModalOpen(false)}
        onSuccess={() => {
          fetchExpenses();
        }}
      />
    </div>
  );
};
