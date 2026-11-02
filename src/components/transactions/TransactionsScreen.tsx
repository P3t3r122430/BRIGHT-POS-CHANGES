import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sale } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import {
  printReceipt,
  openReceiptInNewTab,
  downloadReceiptFile,
  downloadReceiptAsPhoto,
  copyReceiptToClipboard,
  getWhatsAppReceiptUrl,
  shareReceiptImageOnWhatsApp,
} from '../../lib/receiptPrinter';
import {
  Receipt,
  Search,
  RotateCcw,
  Printer,
  Ban,
  Undo2,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  Eye,
  User,
  CreditCard,
  ExternalLink,
  Download,
  Copy,
  Check,
  Camera,
  MessageCircle,
} from 'lucide-react';

export const TransactionsScreen: React.FC = () => {
  const { user, isAdmin, settings } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Sale Details Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [receiptCopied, setReceiptCopied] = useState<boolean>(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState<'jpeg' | 'png' | null>(null);
  const [waPhone, setWaPhone] = useState<string>('');
  const [sharingWhatsAppImage, setSharingWhatsAppImage] = useState<boolean>(false);
  const [waToast, setWaToast] = useState<string | null>(null);

  const handleDownloadPhoto = async (imageType: 'jpeg' | 'png' = 'jpeg') => {
    if (!selectedSale) return;
    setDownloadingPhoto(imageType);
    try {
      await downloadReceiptAsPhoto(selectedSale, settings, 'thermal', imageType);
    } catch (err) {
      console.error('Failed to download receipt photo:', err);
    } finally {
      setDownloadingPhoto(null);
    }
  };

  const handleCopyReceiptText = async () => {
    if (!selectedSale) return;
    const ok = await copyReceiptToClipboard(selectedSale, settings);
    if (ok) {
      setReceiptCopied(true);
      setTimeout(() => setReceiptCopied(false), 2500);
    }
  };

  const handleShareWhatsAppImage = async () => {
    if (!selectedSale) return;
    setSharingWhatsAppImage(true);
    try {
      const res = await shareReceiptImageOnWhatsApp(selectedSale, settings, waPhone, 'thermal');
      if (res.success) {
        setWaToast(res.message || 'WhatsApp opened with receipt image.');
        setTimeout(() => setWaToast(null), 4500);
      }
    } catch (err) {
      console.error('Failed to share on WhatsApp:', err);
    } finally {
      setSharingWhatsAppImage(false);
    }
  };

  // Void Modal
  const [voidModalOpen, setVoidModalOpen] = useState<boolean>(false);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('');
  const [restoreStock, setRestoreStock] = useState<boolean>(true);
  const [refunding, setRefunding] = useState<boolean>(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      let url = '/sales?limit=100';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await api.get<{ sales: Sale[] }>(url);
      setSales(res.sales || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load sales:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [statusFilter, startDate, endDate]);

  const handleOpenDetails = async (saleId: number) => {
    try {
      const res = await api.get<{ sale: Sale }>(`/sales/${saleId}`);
      setSelectedSale(res.sale);
      setWaPhone(res.sale.customer_phone || '');
      setDetailsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load sale details');
    }
  };

  const handleVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !voidReason.trim()) return;

    try {
      setVoiding(true);
      await api.post(`/sales/${selectedSale.id}/void`, {
        reason: voidReason.trim(),
      });
      setVoidModalOpen(false);
      setDetailsModalOpen(false);
      setVoidReason('');
      fetchSales();
    } catch (err: any) {
      alert(err.message || 'Failed to void transaction');
    } finally {
      setVoiding(false);
    }
  };

  const handleRefundSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !refundReason.trim()) return;

    try {
      setRefunding(true);
      await api.post(`/sales/${selectedSale.id}/refund`, {
        reason: refundReason.trim(),
        restoreStock,
      });
      setRefundModalOpen(false);
      setDetailsModalOpen(false);
      setRefundReason('');
      fetchSales();
    } catch (err: any) {
      alert(err.message || 'Failed to refund transaction');
    } finally {
      setRefunding(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      s.receipt_number.toLowerCase().includes(q) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
      (s.cashier_name && s.cashier_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-[#C5A059]" /> Sales Receipts & Transaction Ledger
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Transaction history, receipt reprints, refunds, and void authorizations
          </p>
        </div>

        <button
          onClick={fetchSales}
          className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] text-[11px] uppercase tracking-wider rounded border border-[#262626] transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh Records
        </button>
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
              placeholder="Search receipt #, customer name, or cashier..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Transaction Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="refunded">Refunded Only</option>
            <option value="voided">Voided Only</option>
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
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555]">
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555]">
                    No transactions match search criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-mono font-medium text-[#C5A059]">
                      {s.receipt_number}
                    </td>
                    <td className="py-2.5 px-4 text-[#888888] font-mono text-[11px]">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="py-2.5 px-4 text-[#E5E5E0]">
                      {s.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-2.5 px-4 text-[#888888]">{s.cashier_name || '—'}</td>
                    <td className="py-2.5 px-4 text-[#AAAAAA] capitalize">
                      {s.payment_methods || 'Cash'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#888888]">
                      {s.item_count || 1}
                    </td>
                    <td className="py-2.5 px-4 text-right font-serif text-[#E5E5E0] font-medium">
                      {formatKsh(s.total)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border ${
                          s.status === 'completed'
                            ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                            : s.status === 'voided'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                            : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(s.id)}
                        className="px-2.5 py-1 bg-[#141414] hover:bg-[#1A1A1A] text-[#C5A059] text-[10px] uppercase tracking-wider font-semibold rounded border border-[#262626] transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALE DETAILS & ACTIONS MODAL */}
      {detailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0] max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                    Sale: {selectedSale.receipt_number}
                  </h3>
                  <span
                    className={`text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border ${
                      selectedSale.status === 'completed'
                        ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                        : selectedSale.status === 'voided'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                        : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                    }`}
                  >
                    {selectedSale.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#777777] mt-0.5 font-mono">
                  {formatDate(selectedSale.created_at)} • Cashier: {selectedSale.cashier_name || '—'}
                </p>
              </div>

              <button onClick={() => setDetailsModalOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Notes */}
            <div className="bg-[#141414] p-3 rounded border border-[#262626] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-[#777777]">Customer:</span>
                <span className="text-[#E5E5E0] font-medium">
                  {selectedSale.customer_name || 'Walk-in Customer'}
                </span>
              </div>
              {selectedSale.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-[#777777]">Phone:</span>
                  <span className="text-[#AAAAAA] font-mono">{selectedSale.customer_phone}</span>
                </div>
              )}
              {selectedSale.notes && (
                <div className="pt-1 border-t border-[#262626] text-[#777777]">
                  <span className="font-medium text-[#AAAAAA]">Notes:</span> {selectedSale.notes}
                </div>
              )}
            </div>

            {/* Itemized Snapshot Table */}
            <div className="mb-4">
              <h4 className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em] mb-2">
                Purchased Items ({selectedSale.items?.length || 0})
              </h4>
              <table className="w-full text-left text-xs bg-[#141414] rounded overflow-hidden border border-[#262626]">
                <thead className="bg-[#181818] text-[#777777] uppercase text-[9px] tracking-widest border-b border-[#262626]">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {selectedSale.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 text-[#E5E5E0] font-medium">
                        {item.item_name_snapshot}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[#888888]">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#888888]">
                        {formatKsh(item.unit_price_snapshot)}
                      </td>
                      <td className="py-2 px-3 text-right font-serif text-[#C5A059] font-medium">
                        {formatKsh(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-[#141414] p-3 rounded border border-[#262626] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between text-[#888888]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#E5E5E0]">{formatKsh(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-[#C5A059]">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatKsh(selectedSale.discount)}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between text-[#888888]">
                  <span>Tax:</span>
                  <span className="font-mono text-[#E5E5E0]">{formatKsh(selectedSale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-serif font-medium text-sm text-[#C5A059] pt-1.5 border-t border-[#262626]">
                <span>Total Amount:</span>
                <span>{formatKsh(selectedSale.total)}</span>
              </div>
            </div>

            {/* Payment Records */}
            <div className="mb-4">
              <h4 className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em] mb-2">
                Payment Tendered
              </h4>
              <div className="space-y-1.5">
                {selectedSale.payments?.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#141414] rounded border border-[#262626] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span className="uppercase text-[11px] font-semibold text-[#E5E5E0]">{p.method}</span>
                      {p.reference && (
                        <span className="font-mono text-[10px] text-[#777777] bg-[#1A1A1A] px-1.5 py-0.5 rounded border border-[#282828]">
                          Ref: {p.reference}
                        </span>
                      )}
                    </div>
                    <span className="font-serif font-medium text-[#C5A059]">
                      {formatKsh(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-[#222222] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => printReceipt(selectedSale, settings, 'thermal')}
                  className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black text-[11px] uppercase tracking-wider font-semibold rounded transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>

                <button
                  type="button"
                  onClick={() => openReceiptInNewTab(selectedSale, settings, 'thermal')}
                  className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#E5E5E0] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#282828] hover:border-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                  title="Open printable receipt in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" /> Open Tab
                </button>

                <button
                  type="button"
                  onClick={() => downloadReceiptFile(selectedSale, settings, 'thermal')}
                  className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#E5E5E0] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#282828] hover:border-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                  title="Download receipt HTML file"
                >
                  <Download className="w-3.5 h-3.5 text-[#C5A059]" /> Download
                </button>

                <button
                  type="button"
                  disabled={downloadingPhoto !== null}
                  onClick={() => handleDownloadPhoto('jpeg')}
                  className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#E5E5E0] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#282828] hover:border-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                  title="Download full unclipped receipt as JPEG photo"
                >
                  <Camera className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>{downloadingPhoto === 'jpeg' ? 'Saving...' : 'Photo (JPEG)'}</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingPhoto !== null}
                  onClick={() => handleDownloadPhoto('png')}
                  className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#888888] hover:text-[#E5E5E0] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#282828] hover:border-[#555] transition flex items-center gap-1.5 cursor-pointer"
                  title="Download receipt as PNG photo"
                >
                  <Camera className="w-3.5 h-3.5 text-[#888888]" />
                  <span>{downloadingPhoto === 'png' ? 'Saving...' : 'PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReceiptText}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold rounded border transition flex items-center gap-1.5 cursor-pointer ${
                    receiptCopied
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#181818] hover:bg-[#222222] text-[#E5E5E0] border-[#282828] hover:border-[#C5A059]'
                  }`}
                  title="Copy formatted receipt text for WhatsApp/SMS"
                >
                  {receiptCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#C5A059]" />}
                  {receiptCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {isAdmin && selectedSale.status === 'completed' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRefundReason('');
                      setRefundModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#C5A059] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#C5A059]/40 transition cursor-pointer"
                  >
                    Refund Sale
                  </button>

                  <button
                    onClick={() => {
                      setVoidReason('');
                      setVoidModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 text-[11px] uppercase tracking-wider font-semibold rounded border border-rose-900/60 transition cursor-pointer"
                  >
                    Void Sale
                  </button>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Receipt Share */}
            <div className="pt-3 border-t border-[#222222] flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Customer WhatsApp phone (e.g. 0712345678)"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-[#141414] border border-[#262626] focus:border-emerald-500 rounded text-xs font-mono text-[#E5E5E0] placeholder-[#666666] outline-none"
                />
              </div>

              <button
                type="button"
                disabled={sharingWhatsAppImage}
                onClick={handleShareWhatsAppImage}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs rounded transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Share or send full receipt image directly on WhatsApp"
              >
                {sharingWhatsAppImage ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
                <span>{sharingWhatsAppImage ? 'Preparing...' : 'WhatsApp (Image)'}</span>
              </button>

              <a
                href={getWhatsAppReceiptUrl(selectedSale, settings, waPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-[#181818] hover:bg-[#222222] text-emerald-400 border border-[#282828] hover:border-emerald-600/60 text-xs font-semibold rounded transition flex items-center gap-1 cursor-pointer shrink-0"
                title="Send formatted text receipt via WhatsApp link"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Text
              </a>
            </div>

            {waToast && (
              <div className="mt-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2 rounded flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{waToast}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN VOID SALE MODAL */}
      {voidModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-3 text-rose-400">
              <Ban className="w-5 h-5" />
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                Void Transaction {selectedSale.receipt_number}
              </h3>
            </div>

            <p className="text-xs text-[#888888] mb-3">
              Voiding cancels this transaction and returns any physical merchandise back to stock.
              This action is recorded in the permanent audit trail.
            </p>

            <form onSubmit={handleVoidSale} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                  Reason for Voiding *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Customer cancelled order / Cashier entered wrong items"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-rose-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-3 py-1.5 bg-[#181818] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 font-semibold text-[11px] uppercase tracking-wider rounded border border-rose-700"
                >
                  {voiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN REFUND SALE MODAL */}
      {refundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-3 text-[#C5A059]">
              <Undo2 className="w-5 h-5" />
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                Refund Sale {selectedSale.receipt_number}
              </h3>
            </div>

            <form onSubmit={handleRefundSale} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                  Reason for Refund *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Faulty flash drive returned / Customer dissatisfied"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="restore-stock-checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="rounded text-[#C5A059] focus:ring-0"
                />
                <label htmlFor="restore-stock-checkbox" className="text-[#AAAAAA] cursor-pointer">
                  Return physical products back into inventory stock
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-3 py-1.5 bg-[#181818] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-4 py-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-[11px] uppercase tracking-wider rounded shadow"
                >
                  {refunding ? 'Processing...' : `Process Refund (${formatKsh(selectedSale.total)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
