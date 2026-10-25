import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, InventoryMovement } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import {
  Warehouse,
  Plus,
  Search,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Package,
  History,
  CheckCircle2,
  DollarSign,
  X,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState<string>('');

  // Stock Adjustment Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'restock' | 'damage' | 'loss' | 'adjustment'>('restock');
  const [quantityDelta, setQuantityDelta] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [prodRes, moveRes] = await Promise.all([
        api.get<{ products: Product[] }>('/products?active_only=false'),
        api.get<{ movements: InventoryMovement[] }>('/inventory/movements?limit=100'),
      ]);

      setProducts(prodRes.products || []);
      setMovements(moveRes.movements || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load inventory data:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjustment = (p?: Product) => {
    setSelectedProduct(p || (products.length > 0 ? products[0] : null));
    setMovementType('restock');
    setQuantityDelta('1');
    setReason('');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedProduct) {
      setModalError('Please select a product');
      return;
    }

    const qty = parseInt(quantityDelta, 10);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Quantity must be a positive number');
      return;
    }

    if (!reason.trim()) {
      setModalError('Please provide a reason for stock adjustment');
      return;
    }

    try {
      setSaving(true);
      await api.post('/inventory/adjust', {
        productId: selectedProduct.id,
        movementType,
        quantity: qty,
        reason: reason.trim(),
      });

      setModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record stock movement');
    } finally {
      setSaving(false);
    }
  };

  // Inventory Valuation Calculations
  const totalCostValuation = products.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + p.stock_quantity * p.selling_price, 0);
  const potentialProfit = Math.max(0, totalRetailValuation - totalCostValuation);
  const totalUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.minimum_stock).length;

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Warehouse className="w-4 h-4 text-[#C5A059]" /> Inventory & Capital Valuation
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Physical stock balances, intake logs, movement trails, and asset valuations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-adjust-stock"
            onClick={() => handleOpenAdjustment()}
            className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-black" /> Stock In / Adjust
          </button>
        </div>
      </div>

      {/* Stock Valuation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Total Units in Stock</div>
          <div className="text-2xl font-serif text-[#E5E5E0] mt-1.5 font-medium">
            {formatNumber(totalUnits)}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Across {products.length} registered SKUs</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Capital Investment (Cost)</div>
          <div className="text-2xl font-serif text-[#E5E5E0] mt-1.5 font-medium">
            {formatKsh(totalCostValuation)}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Capital invested in physical assets</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Projected Retail Value</div>
          <div className="text-2xl font-serif text-[#C5A059] mt-1.5 font-medium">
            {formatKsh(totalRetailValuation)}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">Expected gross realisation</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-4">
          <div className="text-[10px] uppercase font-semibold text-[#777777] tracking-[0.2em]">Potential Gross Margin</div>
          <div className="text-2xl font-serif text-[#4CAF50] mt-1.5 font-medium">
            {formatKsh(potentialProfit)}
          </div>
          <div className="text-[11px] text-[#666666] mt-1">
            {lowStockCount > 0 ? (
              <span className="text-[#C5A059] font-medium">{lowStockCount} items need replenishment</span>
            ) : (
              'All items above minimum stock'
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Current Stock vs Movement Logs */}
      <div className="flex items-center gap-2 border-b border-[#222222] pb-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded text-xs uppercase tracking-wider font-semibold transition cursor-pointer flex items-center gap-2 border ${
            activeTab === 'stock'
              ? 'bg-[#181818] text-[#C5A059] border-[#C5A059]/40 shadow-sm'
              : 'text-[#777777] hover:text-[#E5E5E0] border-transparent'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Stock Balances & Reconciliations
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded text-xs uppercase tracking-wider font-semibold transition cursor-pointer flex items-center gap-2 border ${
            activeTab === 'movements'
              ? 'bg-[#181818] text-[#C5A059] border-[#C5A059]/40 shadow-sm'
              : 'text-[#777777] hover:text-[#E5E5E0] border-transparent'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Movement Ledger ({movements.length})
        </button>
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 bg-[#0D0D0D] p-3 rounded border border-[#222222]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock balances by SKU or product name..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <button
              onClick={fetchInventory}
              className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-right">Cost Valuation</th>
                    <th className="py-3 px-4 text-right">Retail Valuation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock_quantity <= p.minimum_stock;
                    const isOut = p.stock_quantity === 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#141414] transition">
                        <td className="py-2.5 px-4 font-mono font-semibold text-[#C5A059]">
                          {p.sku}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-[#E5E5E0]">{p.name}</div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#888888]">
                          {formatKsh(p.cost_price)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-serif text-white font-medium">
                          {formatKsh(p.selling_price)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-mono px-2 py-0.5 rounded text-[10px] ${
                              isOut
                                ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                                : isLow
                                ? 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40'
                                : 'bg-[#141414] text-[#4CAF50] border border-[#4CAF50]/30'
                            }`}
                          >
                            {p.stock_quantity} {p.unit}s
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#888888]">
                          {formatKsh(p.stock_quantity * p.cost_price)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-serif text-[#C5A059] font-medium">
                          {formatKsh(p.stock_quantity * p.selling_price)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setMovementType('restock');
                                setQuantityDelta('10');
                                setReason(`Restocked stock intake for ${p.name}`);
                                setModalError(null);
                                setModalOpen(true);
                              }}
                              className="px-2 py-1 bg-[#1A1811] hover:bg-[#C5A059] text-[#C5A059] hover:text-black rounded border border-[#C5A059]/40 transition cursor-pointer text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                              title={`Restock ${p.name}`}
                            >
                              <Plus className="w-3 h-3" /> Restock
                            </button>
                            <button
                              onClick={() => handleOpenAdjustment(p)}
                              className="px-2 py-1 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#E5E5E0] text-[10px] uppercase tracking-wider font-semibold rounded border border-[#262626] transition cursor-pointer"
                              title="Audit / adjust stock"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MOVEMENTS AUDIT LOG */}
      {activeTab === 'movements' && (
        <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty Change</th>
                  <th className="py-3 px-4 text-center">Stock Before → After</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#555555]">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isIncrease = m.quantity > 0;

                    return (
                      <tr key={m.id} className="hover:bg-[#141414] transition">
                        <td className="py-2.5 px-4 text-[#888888] font-mono text-[11px]">
                          {formatDate(m.created_at)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-[#E5E5E0]">{m.product_name}</div>
                          <div className="text-[10px] text-[#666666] font-mono">{m.product_sku}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border ${
                              m.movement_type === 'sale'
                                ? 'bg-[#141414] text-[#E5E5E0] border-[#2E2E2E]'
                                : m.movement_type === 'restock'
                                ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                                : m.movement_type === 'damage'
                                ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                                : m.movement_type === 'loss'
                                ? 'bg-red-950/40 text-red-300 border-red-900/60'
                                : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          <span className={isIncrease ? 'text-[#4CAF50] font-semibold' : 'text-rose-400 font-semibold'}>
                            {isIncrease ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-[#777777]">
                          {m.previous_quantity} → <span className="text-[#E5E5E0] font-medium">{m.new_quantity}</span>
                        </td>
                        <td className="py-2.5 px-4 text-[#AAAAAA]">{m.reason || '—'}</td>
                        <td className="py-2.5 px-4 text-right text-[#777777] font-medium">
                          {m.user_name || 'System'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                Stock Reconciliation / Intake
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Select Product *</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === Number(e.target.value));
                    setSelectedProduct(p || null);
                  }}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Current: {p.stock_quantity} {p.unit}s)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Movement Classification *</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="restock">➕ Restock (Supplier delivery / stock intake)</option>
                  <option value="damage">⚠️ Damage (Damaged / defective)</option>
                  <option value="loss">❌ Loss (Lost or unaccounted stock)</option>
                  <option value="adjustment">🔄 Manual Correction (Physical inventory count)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1 font-semibold">
                  Quantity ({movementType === 'damage' || movementType === 'loss' ? 'Units to Deduct' : 'Units to Add / Set'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#141414] border border-[#262626] rounded text-sm font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
                />

                {/* Quick Add Presets for Restock */}
                {movementType === 'restock' && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-[#666666]">Quick Add:</span>
                    {[5, 10, 20, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantityDelta(String(num))}
                        className="px-2 py-0.5 rounded bg-[#181818] hover:bg-[#C5A059]/20 hover:text-[#C5A059] text-[10px] font-mono border border-[#282828] transition cursor-pointer"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Reason / Reference Note *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Kasuku Invoice #8920 received or Damaged packaging"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {selectedProduct && (
                <div className="p-2.5 bg-[#141414] border border-[#222222] rounded text-[11px] text-[#888888] flex justify-between items-center">
                  <span>Current: <strong className="text-white font-mono">{selectedProduct.stock_quantity} {selectedProduct.unit}s</strong></span>
                  <span>
                    New Level:{' '}
                    <strong className="text-[#C5A059] font-mono">
                      {movementType === 'restock'
                        ? selectedProduct.stock_quantity + (parseInt(quantityDelta, 10) || 0)
                        : movementType === 'damage' || movementType === 'loss'
                        ? Math.max(0, selectedProduct.stock_quantity - (parseInt(quantityDelta, 10) || 0))
                        : parseInt(quantityDelta, 10) || 0}{' '}
                      {selectedProduct.unit}s
                    </strong>
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#181818] hover:bg-[#222222] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition"
                >
                  {saving ? 'Processing...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
