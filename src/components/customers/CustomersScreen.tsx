import React, { useState, useEffect } from 'react';
import { Customer, Sale } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import {
  Users,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Phone,
  Mail,
  Receipt,
  Eye,
  X,
  UserCheck
} from 'lucide-react';

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // History Drawer State
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ customers: Customer[] }>('/customers');
      setCustomers(res.customers || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load customers:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleOpenHistory = async (c: Customer) => {
    setSelectedCustomer(c);
    setHistoryOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get<{ customer: Customer; sales: Sale[] }>(`/customers/${c.id}`);
      setCustomerSales(res.sales || []);
    } catch (err) {
      console.error('Failed to load customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await api.post('/customers', {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#C5A059]" /> Client Directory & Loyalty Profiles
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Client contacts, purchase history, lifetime value, and organizational notes
          </p>
        </div>

        <button
          id="btn-add-customer"
          onClick={handleOpenAdd}
          className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-black" /> Register Client
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#0D0D0D] p-3.5 rounded border border-[#222222]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, phone, or email..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
          />
        </div>

        <button
          onClick={fetchCustomers}
          className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Telephone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    Loading client directory...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    No clients found matching query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#141414] transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#E5E5E0] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" /> {c.name}
                      </div>
                      {c.notes && (
                        <div className="text-[11px] text-[#777777] line-clamp-1">{c.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#AAAAAA]">
                      {c.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#666666]" /> {c.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#888888]">
                      {c.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#666666]" /> {c.email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[#AAAAAA]">
                      {formatNumber(c.total_purchases)}
                    </td>
                    <td className="py-3 px-4 text-right font-serif text-[#C5A059] font-medium">
                      {formatKsh(c.total_spend)}
                    </td>
                    <td className="py-3 px-4 text-[#777777] font-mono text-[11px]">
                      {c.last_purchase_date
                        ? new Date(c.last_purchase_date).toLocaleDateString('en-KE')
                        : 'None yet'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(c)}
                          className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
                          title="View order history"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                {editingCustomer ? `Edit: ${editingCustomer.name}` : 'Register Client Profile'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Full Name / Organization *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Telephone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +254 712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Frequent bulk printing / Legal formatting"
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
                  className="px-4 py-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow"
                >
                  {saving ? 'Saving...' : editingCustomer ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {historyOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0] max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-3">
              <div>
                <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">{selectedCustomer.name}</h3>
                <p className="text-[11px] text-[#777777] mt-0.5">
                  Lifetime Spend: {formatKsh(selectedCustomer.total_spend)} across{' '}
                  {formatNumber(selectedCustomer.total_purchases)} order(s)
                </p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {loadingHistory ? (
                <div className="py-8 text-center text-[#555555]">Loading purchase history...</div>
              ) : customerSales.length === 0 ? (
                <div className="py-8 text-center text-[#555555]">No purchases found for this client.</div>
              ) : (
                customerSales.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-[#141414] rounded border border-[#262626] space-y-1.5"
                  >
                    <div className="flex justify-between font-semibold">
                      <span className="text-[#C5A059] font-mono">{s.receipt_number}</span>
                      <span className="font-serif text-[#E5E5E0] font-medium">{formatKsh(s.total)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#777777]">
                      <span className="font-mono">{formatDate(s.created_at)}</span>
                      <span className="capitalize">{s.payment_methods || 'Cash'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
