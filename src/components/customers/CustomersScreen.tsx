import React, { useState, useEffect } from 'react';
import { Customer, Sale, CustomerStatement } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import { printCustomerStatementDirect, downloadCustomerStatementHtml } from '../../lib/statementPrinter';
import {
  Users,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Receipt,
  Eye,
  X,
  UserCheck,
  FileText,
  Printer,
  Download,
  Calendar,
  ExternalLink,
  ChevronRight,
  Clock,
  ArrowRight
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
  const [address, setAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Purchase History Drawer State
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Customer Statement Modal State
  const [statementModalOpen, setStatementModalOpen] = useState<boolean>(false);
  const [statementStartDate, setStatementStartDate] = useState<string>('');
  const [statementEndDate, setStatementEndDate] = useState<string>('');
  const [statementData, setStatementData] = useState<CustomerStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);

  // Single Receipt Modal Preview
  const [previewSaleId, setPreviewSaleId] = useState<number | null>(null);

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
    setAddress('');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleOpenHistory = async (c: Customer) => {
    setSelectedCustomer(c);
    setHistoryOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get<{ customer: Customer; sales: any[] }>(`/customers/${c.id}`);
      setCustomerSales(res.sales || []);
    } catch (err) {
      console.error('Failed to load customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenStatement = async (c: Customer) => {
    setSelectedCustomer(c);
    setStatementModalOpen(true);
    fetchStatementData(c.id, statementStartDate, statementEndDate);
  };

  const fetchStatementData = async (customerId: number, start: string, end: string) => {
    try {
      setLoadingStatement(true);
      let query = '';
      if (start && end) {
        query = `?start_date=${start}&end_date=${end}`;
      } else if (start) {
        query = `?start_date=${start}`;
      } else if (end) {
        query = `?end_date=${end}`;
      }
      const res = await api.get<{ statement: CustomerStatement }>(`/customers/${customerId}/statement${query}`);
      setStatementData(res.statement);
    } catch (err) {
      console.error('Failed to generate customer statement:', err);
    } finally {
      setLoadingStatement(false);
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
          address: address.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await api.post('/customers', {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
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
    const custIdStr = `cust-${String(c.id).padStart(4, '0')}`;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      custIdStr.includes(q) ||
      String(c.id) === q
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#C5A059]" /> Client Directory & Customer Accounts
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Accounts management, purchase history ledgers, printable statements, and contacts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            title="Refresh directory"
            className="p-2 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-black" /> Register Client
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, email, address, or Customer ID (e.g. CUST-0001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0D0D0D] border border-[#222222] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Client ID & Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Address / Billing</th>
                <th className="py-3 px-4 text-center">Purchases</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4 text-center">Last Purchase</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    Loading client accounts...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    {search ? 'No client accounts match your query.' : 'No registered client profiles yet.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#141414] transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#C5A059] border border-[#262626] font-semibold">
                          CUST-{String(c.id).padStart(4, '0')}
                        </span>
                        <span className="font-semibold text-[#E5E5E0]">{c.name}</span>
                      </div>
                      {c.notes && (
                        <p className="text-[10px] text-[#666666] mt-0.5 italic line-clamp-1">{c.notes}</p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#AAAAAA] space-y-0.5">
                      {c.phone ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[#E5E5E0]">
                          <Phone className="w-3 h-3 text-[#777777]" /> {c.phone}
                        </div>
                      ) : (
                        <span className="text-[#555555] text-[10px] italic">No phone</span>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1 text-[10px] text-[#888888]">
                          <Mail className="w-3 h-3 text-[#666666]" /> {c.email}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#888888]">
                      {c.address ? (
                        <div className="flex items-center gap-1 text-[11px] text-[#CCCCCC]">
                          <MapPin className="w-3 h-3 text-[#C5A059] shrink-0" />
                          <span className="truncate max-w-xs">{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-[#555555] text-[10px] italic">No address on file</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-[#E5E5E0]">
                      {formatNumber(c.total_purchases || 0)}
                    </td>

                    <td className="py-3 px-4 text-right font-serif text-[#C5A059] font-medium">
                      {formatKsh(c.total_spend || 0)}
                    </td>

                    <td className="py-3 px-4 text-center text-[#777777] font-mono text-[10.5px]">
                      {c.last_purchase_date ? formatDate(c.last_purchase_date) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStatement(c)}
                          className="px-2 py-1 bg-[#141414] hover:bg-[#1A1A1A] text-[#C5A059] hover:border-[#C5A059] rounded border border-[#262626] transition cursor-pointer text-[10px] font-semibold flex items-center gap-1"
                          title="Generate printable customer account statement"
                        >
                          <FileText className="w-3 h-3" /> Statement
                        </button>
                        <button
                          onClick={() => handleOpenHistory(c)}
                          className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
                          title="View complete purchase ledger"
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
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#C5A059] cursor-pointer">
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
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Physical / Billing Address</label>
                <input
                  type="text"
                  placeholder="e.g. Biashara Plaza, Suite 4B, Nairobi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bulk photocopying contract / Tax exempt cert"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#181818] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow cursor-pointer"
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
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-xl max-w-3xl w-full shadow-2xl p-5 text-[#E5E5E0] max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1A1A1A] text-[#C5A059] border border-[#262626] font-bold">
                    CUST-{String(selectedCustomer.id).padStart(4, '0')}
                  </span>
                  <h3 className="font-serif-luxury font-medium text-sm text-[#E5E5E0] uppercase tracking-[0.18em]">
                    {selectedCustomer.name}
                  </h3>
                </div>
                <p className="text-[11px] text-[#777777] mt-1">
                  Lifetime Value: <strong className="text-[#C5A059]">{formatKsh(selectedCustomer.total_spend || 0)}</strong> across{' '}
                  <strong className="text-white">{formatNumber(selectedCustomer.total_purchases || customerSales.length)}</strong> order(s)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHistoryOpen(false);
                    handleOpenStatement(selectedCustomer);
                  }}
                  className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Statement
                </button>
                <button onClick={() => setHistoryOpen(false)} className="text-[#666666] hover:text-[#C5A059] p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Purchase History Ledger Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingHistory ? (
                <div className="py-12 text-center text-[#555555]">Loading client purchase history ledger...</div>
              ) : customerSales.length === 0 ? (
                <div className="py-12 text-center text-[#555555]">No purchases recorded for this client.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.16em] sticky top-0 border-b border-[#222222]">
                    <tr>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Items / Services Rendered</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Payment</th>
                      <th className="py-2.5 px-3 text-center">Cashier</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {customerSales.map((s) => (
                      <tr key={s.id} className="hover:bg-[#141414] transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#C5A059]">
                          {s.receipt_number}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#888888] text-[11px]">
                          {formatDate(s.created_at)}
                        </td>
                        <td className="py-2.5 px-3 text-[#CCCCCC] text-[11px] max-w-xs truncate" title={s.items_summary || ''}>
                          {s.items_summary || 'General ICT Products & Services'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-medium text-white">
                          {formatKsh(s.total)}
                        </td>
                        <td className="py-2.5 px-3 text-center uppercase font-mono text-[10px] text-[#888888]">
                          {s.payment_methods || 'Cash'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#AAAAAA] text-[11px]">
                          {s.cashier_name || 'Staff'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                              s.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : s.status === 'refunded'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`/api/sales/${s.id}/receipt`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-[#C5A059] hover:text-[#d8b46e] inline-flex items-center gap-1 font-semibold text-[10px]"
                            title="Open printable receipt"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Statement Modal (Phase 7) */}
      {statementModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded-xl max-w-4xl w-full shadow-2xl p-6 text-[#E5E5E0] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222] mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1A1A1A] text-[#C5A059] border border-[#262626] font-bold">
                    CUST-{String(selectedCustomer.id).padStart(4, '0')}
                  </span>
                  <h3 className="font-serif-luxury font-medium text-sm text-[#E5E5E0] uppercase tracking-[0.18em]">
                    Customer Statement — {selectedCustomer.name}
                  </h3>
                </div>
                <p className="text-[11px] text-[#777777] mt-0.5">
                  Official computer-generated account statement & transaction history ledger
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => statementData && downloadCustomerStatementHtml(statementData)}
                  disabled={!statementData}
                  className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#AAAAAA] hover:text-[#E5E5E0] text-xs uppercase tracking-wider font-semibold rounded border border-[#262626] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Download Statement HTML"
                >
                  <Download className="w-3.5 h-3.5 text-[#C5A059]" /> Export HTML
                </button>

                <button
                  onClick={() => statementData && printCustomerStatementDirect(statementData)}
                  disabled={!statementData}
                  className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Print customer statement directly or save to PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-black" /> Print Statement
                </button>

                <button
                  onClick={() => setStatementModalOpen(false)}
                  className="text-[#666666] hover:text-[#C5A059] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Date Range Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] p-3 rounded border border-[#1E1E1E] mb-4 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C5A059]" />
                <span className="font-semibold text-[#AAAAAA] uppercase text-[10px] tracking-wider">Statement Period:</span>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  className="bg-[#181818] border border-[#282828] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
                <span className="text-[#666666]">to</span>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  className="bg-[#181818] border border-[#282828] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
                <button
                  onClick={() => fetchStatementData(selectedCustomer.id, statementStartDate, statementEndDate)}
                  className="px-3 py-1 bg-[#222222] hover:bg-[#2A2A2A] text-white rounded font-semibold text-xs border border-[#333333] transition cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>

              <div className="text-[11px] text-[#777777]">
                Total Purchases: <strong className="text-white font-mono">{formatKsh(statementData?.summary.totalPurchases || 0)}</strong>
              </div>
            </div>

            {/* Live Statement Preview */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-[#1E1E1E] rounded bg-[#0A0A0A] p-4 space-y-4">
              {loadingStatement ? (
                <div className="py-16 text-center text-[#555555]">Generating statement ledger...</div>
              ) : !statementData ? (
                <div className="py-16 text-center text-[#555555]">Failed to load statement data.</div>
              ) : (
                <div className="space-y-4">
                  {/* Company & Client Info Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#1E1E1E]">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-[#C5A059]">
                        {statementData.settings?.business_name || 'BRIGHT CYBER & ICT CENTRE'}
                      </div>
                      <div className="text-[11px] text-[#777777] mt-0.5">
                        {statementData.settings?.address || 'Biashara Street, Nairobi, Kenya'}
                      </div>
                      <div className="text-[11px] text-[#777777]">
                        Tel: {statementData.settings?.phone || '+254 712 345 678'} • Email: {statementData.settings?.email || 'info@brightcyber.co.ke'}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-xs uppercase tracking-widest text-[#777777]">Statement For</div>
                      <div className="text-sm font-bold text-white mt-0.5">{statementData.customer.name}</div>
                      <div className="text-[11px] text-[#AAAAAA]">
                        Ref: <strong className="font-mono text-[#C5A059]">{statementData.customer.customerIdFormatted}</strong> • Tel: {statementData.customer.phone}
                      </div>
                      {statementData.customer.address && statementData.customer.address !== 'N/A' && (
                        <div className="text-[10.5px] text-[#777777]">{statementData.customer.address}</div>
                      )}
                    </div>
                  </div>

                  {/* Statement Ledger Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.16em] border-y border-[#1E1E1E]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Description / Particulars</th>
                          <th className="py-2.5 px-3 text-right">Debit (KSh)</th>
                          <th className="py-2.5 px-3 text-right">Payment (KSh)</th>
                          <th className="py-2.5 px-3 text-right">Running Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A1A]">
                        {statementData.lines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#555555] italic">
                              No purchase or payment activity recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          statementData.lines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-[#141414] transition">
                              <td className="py-2.5 px-3 font-mono text-[#888888]">
                                {new Date(line.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#C5A059]">
                                {line.receiptNumber}
                              </td>
                              <td className="py-2.5 px-3 text-[#CCCCCC]">
                                <div>{line.description}</div>
                                <div className="text-[10px] text-[#666666]">Via: {line.paymentMethod} • Staff: {line.cashier}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">
                                {line.debit > 0 ? formatNumber(line.debit) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                                {line.payment > 0 ? formatNumber(line.payment) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#C5A059]">
                                {formatKsh(line.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Box */}
                  <div className="flex justify-end pt-2">
                    <div className="w-72 bg-[#121212] border border-[#222222] rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-[#888888]">
                        <span>Opening Balance:</span>
                        <span className="font-mono">{formatKsh(statementData.summary.openingBalance)}</span>
                      </div>
                      <div className="flex justify-between text-white font-semibold">
                        <span>Total Purchases:</span>
                        <span className="font-mono">{formatKsh(statementData.summary.totalPurchases)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Total Settled:</span>
                        <span className="font-mono">{formatKsh(statementData.summary.totalPayments)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#262626] pt-1.5 font-bold text-[#C5A059] text-sm">
                        <span>Closing Balance:</span>
                        <span className="font-mono">{formatKsh(statementData.summary.closingBalance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
