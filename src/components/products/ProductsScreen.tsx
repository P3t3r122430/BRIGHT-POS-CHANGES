import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, Category } from '../../types';
import { api } from '../../lib/api';
import { formatNumber, formatKsh } from '../../lib/utils';
import {
  Package,
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  RotateCcw,
  Barcode,
  Tag,
  DollarSign,
  Layers,
  X,
  CheckCircle2,
  Filter,
  Trash2,
  Info
} from 'lucide-react';

export const ProductsScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Single Product Delete Confirmation Modal
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Purge Deactivated Products Modal
  const [purgeModalOpen, setPurgeModalOpen] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);

  // Quick Restock Modal State
  const [restockModalOpen, setRestockModalOpen] = useState<boolean>(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restockReason, setRestockReason] = useState<string>('Restocked inventory intake');
  const [restockSaving, setRestockSaving] = useState<boolean>(false);
  const [restockSuccessMessage, setRestockSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [sku, setSku] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('0');
  const [stockQuantity, setStockQuantity] = useState<string>('0');
  const [minimumStock, setMinimumStock] = useState<string>('5');
  const [unit, setUnit] = useState<string>('piece');
  const [supplier, setSupplier] = useState<string>('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = '/products?active_only=false';
      if (filterLowStock) url += '&low_stock=true';

      const [prodRes, catRes] = await Promise.all([
        api.get<{ products: Product[] }>(url),
        api.get<{ categories: Category[] }>('/categories'),
      ]);

      setProducts(prodRes.products || []);
      const productCats = (catRes.categories || []).filter((c) => c.type === 'product');
      const finalCats = productCats.length > 0 ? productCats : (catRes.categories || []);
      setCategories(finalCats);
      if (finalCats.length > 0 && (!categoryId || categoryId === 0)) {
        setCategoryId(finalCats[0].id);
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load products:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterLowStock]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    const randomSku = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
    setSku(randomSku);
    setBarcode('');
    setName('');
    setDescription('');
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setCostPrice('0');
    setSellingPrice('0');
    setStockQuantity('0');
    setMinimumStock('5');
    setUnit('piece');
    setSupplier('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setName(p.name);
    setDescription(p.description || '');
    setCategoryId(p.category_id);
    setCostPrice(String(p.cost_price));
    setSellingPrice(String(p.selling_price));
    setStockQuantity(String(p.stock_quantity));
    setMinimumStock(String(p.minimum_stock));
    setUnit(p.unit);
    setSupplier(p.supplier || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenRestockModal = (p: Product) => {
    setRestockProduct(p);
    setRestockQty('10');
    setRestockReason(`Restocked stock intake for ${p.name}`);
    setRestockSuccessMessage(null);
    setRestockModalOpen(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity to add.');
      return;
    }

    try {
      setRestockSaving(true);
      const res = await api.post<{ success: boolean; newStock: number; message: string }>('/inventory/adjust', {
        productId: restockProduct.id,
        movementType: 'restock',
        quantity: qty,
        reason: restockReason.trim() || `Restocked ${qty} ${restockProduct.unit}(s)`,
      });

      setRestockSuccessMessage(`Successfully added +${qty} ${restockProduct.unit}s! New stock: ${res.newStock}`);
      setTimeout(() => {
        setRestockModalOpen(false);
        setRestockSuccessMessage(null);
      }, 1200);
      fetchProducts();
    } catch (err: any) {
      alert('Restock failed: ' + (err.message || 'Error updating inventory'));
    } finally {
      setRestockSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cost = parseFloat(costPrice) || 0;
    const price = parseFloat(sellingPrice) || 0;
    const stock = parseInt(stockQuantity, 10) || 0;
    const minStock = parseInt(minimumStock, 10) || 5;
    const resolvedCatId = categoryId || (categories.length > 0 ? categories[0].id : 1);

    if (!name.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (!sku.trim()) {
      setFormError('SKU is required');
      return;
    }
    if (price <= 0) {
      setFormError('Selling price must be greater than zero');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: resolvedCatId,
        categoryId: resolvedCatId,
        cost_price: cost,
        costPrice: cost,
        selling_price: price,
        sellingPrice: price,
        minimum_stock: minStock,
        minimumStock: minStock,
        unit,
        supplier: supplier.trim() || undefined,
        stock_quantity: stock,
        stockQuantity: stock,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        showToast(`Product "${name.trim()}" updated successfully.`);
      } else {
        await api.post('/products', payload);
        showToast(`Product "${name.trim()}" registered successfully.`);
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product details');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await api.put(`/products/${p.id}`, { active: p.active === 1 ? 0 : 1 });
      showToast(`Product "${p.name}" ${p.active === 1 ? 'deactivated' : 're-activated'}.`);
      fetchProducts();
    } catch (err: any) {
      showToast('Failed to update product status: ' + (err.message || err), 'error');
    }
  };

  // Permanently delete a single product
  const handleConfirmDeleteSingle = async () => {
    if (!deleteModalProduct) return;
    try {
      setDeleting(true);
      await api.delete(`/products/${deleteModalProduct.id}?permanent=true`);
      showToast(`Product "${deleteModalProduct.name}" permanently deleted.`);
      setDeleteModalProduct(null);
      if (modalOpen && editingProduct?.id === deleteModalProduct.id) {
        setModalOpen(false);
      }
      fetchProducts();
    } catch (err: any) {
      showToast('Failed to delete product: ' + (err.message || err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Permanently delete all deactivated products
  const handleConfirmPurgeDeactivated = async () => {
    try {
      setPurging(true);
      const res = await api.post<{ success: boolean; count: number; message: string }>('/products/purge-deactivated');
      showToast(res.message || `Successfully deleted ${res.count || 0} deactivated product(s).`);
      setPurgeModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast('Failed to purge deactivated products: ' + (err.message || err), 'error');
    } finally {
      setPurging(false);
    }
  };

  const deactivatedCount = products.filter((p) => p.active === 0).length;
  const activeCount = products.filter((p) => p.active === 1).length;

  const filteredProducts = products.filter((p) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query));

    const matchCategory =
      selectedCategory === 'all' || String(p.category_id) === selectedCategory;

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.active === 1) ||
      (statusFilter === 'deactivated' && p.active === 0);

    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between border transition-all animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#888888] hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Package className="w-4 h-4 text-[#C5A059]" /> Merchandise & Inventory Catalogue
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Physical merchandise, hardware, stationery, accessories, and stock control
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {deactivatedCount > 0 && (
              <button
                id="btn-purge-deactivated-products"
                onClick={() => setPurgeModalOpen(true)}
                className="px-3.5 py-2 border border-rose-800/80 bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 hover:text-rose-100 font-semibold text-xs uppercase tracking-[0.16em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
                title={`Permanently delete all ${deactivatedCount} deactivated products`}
              >
                <Trash2 className="w-4 h-4 text-rose-400" /> Delete Deactivated ({deactivatedCount})
              </button>
            )}

            <button
              id="btn-add-new-product"
              onClick={handleOpenAddModal}
              className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-black" /> Register Product
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0D0D0D] p-3.5 rounded border border-[#222222]">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Status ({products.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="deactivated">Disabled / Deactivated ({deactivatedCount})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-1.5 rounded text-[11px] uppercase tracking-wider font-medium border transition cursor-pointer flex items-center gap-1.5 ${
              filterLowStock
                ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                : 'bg-[#141414] border-[#262626] text-[#888888] hover:text-[#E5E5E0]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Warning
          </button>

          <button
            onClick={fetchProducts}
            title="Refresh list"
            className="p-1.5 bg-[#141414] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (KSh)</th>
                <th className="py-3 px-4 text-right">Price (KSh)</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555]">
                    Loading products catalogue...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555]">
                    No merchandise found matching query.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const marginAmt = product.selling_price - product.cost_price;
                  const marginPct =
                    product.selling_price > 0
                      ? Math.round((marginAmt / product.selling_price) * 100)
                      : 0;

                  const isOutOfStock = product.stock_quantity === 0;
                  const isLowStock = product.stock_quantity <= product.minimum_stock;

                  return (
                    <tr key={product.id} className="hover:bg-[#141414] transition">
                      <td className="py-2.5 px-4 font-mono">
                        <div className="font-semibold text-[#C5A059]">{product.sku}</div>
                        {product.barcode && (
                          <div className="text-[10px] text-[#666666] flex items-center gap-1">
                            <Barcode className="w-2.5 h-2.5" /> {product.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[#E5E5E0]">{product.name}</div>
                        {product.description && (
                          <div className="text-[11px] text-[#777777] line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#AAAAAA]">
                        {product.category_name || 'PRODUCTS'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#888888]">
                        {formatNumber(product.cost_price)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-serif text-white font-medium">
                        {formatNumber(product.selling_price)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#C5A059]">
                        +{marginPct}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[10px] ${
                            isOutOfStock
                              ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                              : isLowStock
                              ? 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40'
                              : 'bg-[#141414] text-[#4CAF50] border border-[#4CAF50]/30'
                          }`}
                        >
                          {product.stock_quantity} {product.unit}s
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded ${
                            product.active === 1
                              ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30'
                              : 'bg-rose-950/20 text-rose-400 border border-rose-900/40'
                          }`}
                        >
                          {product.active === 1 ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenRestockModal(product)}
                              className="px-2 py-1 bg-[#1A1811] hover:bg-[#C5A059] text-[#C5A059] hover:text-black rounded border border-[#C5A059]/40 transition cursor-pointer text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                              title={`Add stock / restock ${product.name}`}
                            >
                              <Plus className="w-3 h-3" /> Restock
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
                              title="Edit product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(product)}
                              className={`p-1.5 rounded transition cursor-pointer text-[10px] uppercase tracking-wider font-semibold border ${
                                product.active === 1
                                  ? 'bg-[#141414] hover:bg-amber-950/30 text-[#888888] hover:text-amber-300 border-[#262626]'
                                  : 'bg-[#141414] hover:bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
                              }`}
                              title={product.active === 1 ? 'Deactivate product' : 'Enable product'}
                            >
                              {product.active === 1 ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => setDeleteModalProduct(product)}
                              className="p-1.5 bg-[#141414] hover:bg-rose-950/60 text-[#777777] hover:text-rose-300 rounded border border-[#262626] hover:border-rose-900/60 transition cursor-pointer"
                              title={`Delete ${product.name} permanently`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Product Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-rose-850/80 rounded-lg max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-3 pb-3 border-b border-[#222222] mb-4">
              <div className="w-9 h-9 rounded-full bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/80 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury font-medium text-sm text-white uppercase tracking-[0.14em]">
                  Permanently Delete Product?
                </h3>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                  Irreversible Catalogue Removal
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] rounded mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Product Name:</span>
                <span className="font-semibold text-white">{deleteModalProduct.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">SKU Code:</span>
                <span className="font-mono text-[#C5A059]">{deleteModalProduct.sku}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Selling Price:</span>
                <span className="font-serif text-white">{formatKsh(deleteModalProduct.selling_price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Current Stock:</span>
                <span className="font-mono text-white">{deleteModalProduct.stock_quantity} {deleteModalProduct.unit}s</span>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded mb-4 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                This will completely delete <strong>{deleteModalProduct.name}</strong> from your inventory catalogue.
                Existing sales transactions and financial accounting records will maintain their historical snapshots.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                className="px-4 py-2 bg-[#181818] hover:bg-[#222222] text-[#888888] hover:text-white text-xs uppercase tracking-wider rounded border border-[#282828] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 border border-rose-700 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting Product...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Purge Deactivated Products Modal */}
      {purgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-rose-850/80 rounded-lg max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-3 pb-3 border-b border-[#222222] mb-4">
              <div className="w-9 h-9 rounded-full bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/80 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury font-medium text-sm text-white uppercase tracking-[0.14em]">
                  Delete All Deactivated Products?
                </h3>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                  Bulk Removal of Disabled Items
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] rounded mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center font-semibold text-white">
                <span>Deactivated Items Count:</span>
                <span className="font-mono text-rose-400 text-sm">{deactivatedCount} product(s)</span>
              </div>
              <div className="max-h-36 overflow-y-auto custom-scrollbar pt-2 border-t border-[#222222] space-y-1">
                {products
                  .filter((p) => p.active === 0)
                  .map((p) => (
                    <div key={p.id} className="flex justify-between text-[11px] text-[#AAAAAA]">
                      <span className="truncate max-w-[260px]">• {p.name}</span>
                      <span className="font-mono text-[#777777]">{p.sku}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded mb-4 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                This will permanently delete all <strong>{deactivatedCount}</strong> deactivated physical products from the system.
                Historical receipt totals and reports are safeguarded.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPurgeModalOpen(false)}
                className="px-4 py-2 bg-[#181818] hover:bg-[#222222] text-[#888888] hover:text-white text-xs uppercase tracking-wider rounded border border-[#282828] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={handleConfirmPurgeDeactivated}
                className="px-4 py-2 border border-rose-700 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {purging ? 'Purging Products...' : `Delete All ${deactivatedCount} Deactivated`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Register Merchandise Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#C5A059]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SanDisk Flash Drive 32GB"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief specification or details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="piece">Piece (pcs)</option>
                    <option value="pack">Pack / Box</option>
                    <option value="book">Book / Notebook</option>
                    <option value="set">Set</option>
                    <option value="ream">Ream (Paper)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Buying Cost (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Selling Price (KSh) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-serif text-[#C5A059] font-medium focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    {editingProduct ? 'Current Stock Level' : 'Initial Stock Intake'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-[#777777] mt-0.5 block">
                      Directly set physical count
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. Kasuku Stationers Ltd"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                {editingProduct && isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setDeleteModalProduct(editingProduct)}
                    className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 hover:text-rose-200 text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Product
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-[#181818] hover:bg-[#222222] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition cursor-pointer"
                  >
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Register Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Quick Restock Modal */}
      {restockModalOpen && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#C5A059]/40 rounded-lg max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/40">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.16em]">
                    Restock Product
                  </h3>
                  <p className="text-[10px] text-[#777777] uppercase tracking-wider">
                    Add new stock to physical inventory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalOpen(false)}
                className="text-[#666666] hover:text-[#C5A059]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {restockSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{restockSuccessMessage}</span>
              </div>
            )}

            <div className="p-3 bg-[#141414] border border-[#222222] rounded mb-4 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Item Name:</span>
                <span className="font-semibold text-white">{restockProduct.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">SKU Code:</span>
                <span className="font-mono text-[#C5A059]">{restockProduct.sku}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Current Stock:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {restockProduct.stock_quantity} {restockProduct.unit}s
                </span>
              </div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1 font-semibold">
                  Quantity to Add ({restockProduct.unit}s) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  autoFocus
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-[#262626] rounded text-sm font-mono text-white focus:outline-none focus:border-[#C5A059] font-bold"
                />

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#666666]">Quick Add:</span>
                  {[5, 10, 20, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRestockQty(String(num))}
                      className="px-2 py-0.5 rounded bg-[#181818] hover:bg-[#C5A059]/20 hover:text-[#C5A059] text-[10px] font-mono border border-[#282828] transition cursor-pointer"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                  Restock Reason / Supplier Invoice Note
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Delivered by Kasuku Stationers invoice #1049"
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                <div className="text-[11px] text-[#777777]">
                  New total will be:{' '}
                  <strong className="text-[#C5A059] font-mono">
                    {restockProduct.stock_quantity + (parseInt(restockQty, 10) || 0)} {restockProduct.unit}s
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockModalOpen(false)}
                    className="px-3 py-2 bg-[#181818] hover:bg-[#222222] text-[#888888] text-[11px] uppercase tracking-wider rounded border border-[#282828] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={restockSaving}
                    className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-black" />
                    {restockSaving ? 'Updating Stock...' : 'Confirm Restock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
