import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Service, Category } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber } from '../../lib/utils';
import {
  Printer,
  Plus,
  Search,
  Edit2,
  RotateCcw,
  Tag,
  Clock,
  Layers,
  X,
  AlertTriangle,
  FileText,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export const ServicesScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Delete & Purge State
  const [deleteModalService, setDeleteModalService] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [price, setPrice] = useState<string>('0');
  const [costEstimate, setCostEstimate] = useState<string>('0');
  const [unit, setUnit] = useState<string>('page');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const [servRes, catRes] = await Promise.all([
        api.get<{ services: Service[] }>('/services?active_only=false'),
        api.get<{ categories: Category[] }>('/categories'),
      ]);

      setServices(servRes.services || []);
      const serviceCats = (catRes.categories || []).filter((c) => c.type === 'service');
      const finalCats = serviceCats.length > 0 ? serviceCats : (catRes.categories || []);
      setCategories(finalCats);
      if (finalCats.length > 0 && categoryId === 0) {
        setCategoryId(finalCats[0].id);
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load services:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('0');
    setCostEstimate('0');
    setUnit('page');
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (s: Service) => {
    setEditingService(s);
    setName(s.name);
    setDescription(s.description || '');
    setCategoryId(s.category_id);
    setPrice(String(s.price));
    setCostEstimate(String(s.cost_estimate || 0));
    setUnit(s.unit);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const pr = parseFloat(price) || 0;
    const cost = parseFloat(costEstimate) || 0;

    if (!name.trim()) {
      setFormError('Service name is required');
      return;
    }
    if (pr <= 0) {
      setFormError('Service price must be greater than zero');
      return;
    }

    try {
      setSaving(true);
      const resolvedCatId = categoryId || (categories.length > 0 ? categories[0].id : 1);

      if (editingService) {
        // Update
        await api.put(`/services/${editingService.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          category_id: Number(resolvedCatId),
          price: pr,
          cost_estimate: cost,
          unit: unit.trim(),
        });
        showToast(`Service "${name.trim()}" updated successfully.`);
      } else {
        // Create
        await api.post('/services', {
          name: name.trim(),
          description: description.trim() || null,
          category_id: Number(resolvedCatId),
          price: pr,
          cost_estimate: cost,
          unit: unit.trim(),
        });
        showToast(`Service "${name.trim()}" registered successfully.`);
      }

      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: Service) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/services/${s.id}`);
      showToast(`Service "${s.name}" ${s.active === 1 ? 'disabled' : 'enabled'}.`);
      fetchServices();
    } catch (err: any) {
      showToast(err.message || 'Failed to update service status', 'error');
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deleteModalService) return;
    try {
      setDeleting(true);
      await api.delete(`/services/${deleteModalService.id}?permanent=true`);
      showToast(`Service "${deleteModalService.name}" permanently deleted.`);
      setDeleteModalService(null);
      if (modalOpen && editingService?.id === deleteModalService.id) {
        setModalOpen(false);
      }
      fetchServices();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete service', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmPurgeDeactivated = async () => {
    try {
      setPurging(true);
      const res = await api.post<{ success: boolean; count: number; message: string }>('/services/purge-deactivated');
      showToast(res.message || `Successfully deleted ${res.count || 0} deactivated service(s).`);
      setPurgeModalOpen(false);
      fetchServices();
    } catch (err: any) {
      showToast(err.message || 'Failed to purge deactivated services', 'error');
    } finally {
      setPurging(false);
    }
  };

  const deactivatedCount = services.filter((s) => s.active === 0).length;
  const activeCount = services.filter((s) => s.active === 1).length;

  // Filtered services
  const filteredServices = services.filter((s) => {
    if (selectedCategory !== 'all' && String(s.category_id) !== selectedCategory) {
      return false;
    }
    if (statusFilter === 'active' && s.active !== 1) return false;
    if (statusFilter === 'deactivated' && s.active !== 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }
    return true;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Printer className="w-4 h-4 text-[#C5A059]" /> Cyber & ICT Service Tariffs
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Printing, government portals (KRA/eCitizen), graphic design, and typing rates
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {deactivatedCount > 0 && (
              <button
                id="btn-purge-deactivated-services"
                onClick={() => setPurgeModalOpen(true)}
                className="px-3.5 py-2 border border-rose-800/80 bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 hover:text-rose-100 font-semibold text-xs uppercase tracking-[0.16em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
                title={`Permanently delete all ${deactivatedCount} deactivated services`}
              >
                <Trash2 className="w-4 h-4 text-rose-400" /> Delete Deactivated ({deactivatedCount})
              </button>
            )}

            <button
              id="btn-add-new-service"
              onClick={handleOpenAddModal}
              className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-black" /> Register Service Tariff
            </button>
          </div>
        )}
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
              placeholder="Search service name or specifications..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Service Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Status ({services.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="deactivated">Disabled / Deactivated ({deactivatedCount})</option>
          </select>

          <button
            onClick={fetchServices}
            title="Refresh services"
            className="p-1.5 bg-[#141414] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Service Offering</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Billing Unit</th>
                <th className="py-3 px-4 text-right">Direct Cost</th>
                <th className="py-3 px-4 text-right">Tariff Rate (KSh)</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    Loading service tariffs...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#555555]">
                    No services found matching filters.
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-[#141414] transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#E5E5E0]">{service.name}</div>
                      {service.description && (
                        <div className="text-[11px] text-[#777777] mt-0.5">{service.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#C5A059] text-[11px]">
                      {service.category_name}
                    </td>
                    <td className="py-3 px-4 text-[#888888] font-mono text-[11px]">
                      per {service.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#777777]">
                      {formatKsh(service.cost_estimate)}
                    </td>
                    <td className="py-3 px-4 text-right font-serif font-medium text-[#C5A059]">
                      {formatKsh(service.price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded ${
                          service.active === 1
                            ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30'
                            : 'bg-rose-950/20 text-rose-400 border border-rose-900/40'
                        }`}
                      >
                        {service.active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(service)}
                            className="p-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition cursor-pointer"
                            title="Edit service"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(service)}
                            className={`p-1.5 rounded transition cursor-pointer text-[10px] uppercase tracking-wider font-semibold border ${
                              service.active === 1
                                ? 'bg-[#141414] hover:bg-amber-950/30 text-[#888888] hover:text-amber-300 border-[#262626]'
                                : 'bg-[#141414] hover:bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
                            }`}
                            title={service.active === 1 ? 'Disable service' : 'Enable service'}
                          >
                            {service.active === 1 ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => setDeleteModalService(service)}
                            className="p-1.5 bg-[#141414] hover:bg-rose-950/60 text-[#777777] hover:text-rose-300 rounded border border-[#262626] hover:border-rose-900/60 transition cursor-pointer"
                            title={`Delete ${service.name} permanently`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Service Delete Confirmation Modal */}
      {deleteModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-rose-850/80 rounded-lg max-w-md w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-3 pb-3 border-b border-[#222222] mb-4">
              <div className="w-9 h-9 rounded-full bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/80 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury font-medium text-sm text-white uppercase tracking-[0.14em]">
                  Permanently Delete Service?
                </h3>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                  Irreversible Tariff Removal
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] rounded mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Service Name:</span>
                <span className="font-semibold text-white">{deleteModalService.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888888]">Billing Rate:</span>
                <span className="font-serif text-[#C5A059]">{formatKsh(deleteModalService.price)} / {deleteModalService.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded mb-4 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                This will completely remove <strong>{deleteModalService.name}</strong> from your cyber tariffs catalogue.
                Past sales records maintain their receipt history.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalService(null)}
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
                {deleting ? 'Deleting Service...' : 'Yes, Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Purge Deactivated Services Modal */}
      {purgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-rose-850/80 rounded-lg max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0]">
            <div className="flex items-center gap-3 pb-3 border-b border-[#222222] mb-4">
              <div className="w-9 h-9 rounded-full bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/80 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury font-medium text-sm text-white uppercase tracking-[0.14em]">
                  Delete All Deactivated Services?
                </h3>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                  Bulk Removal of Disabled Tariffs
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] rounded mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center font-semibold text-white">
                <span>Deactivated Services Count:</span>
                <span className="font-mono text-rose-400 text-sm">{deactivatedCount} service(s)</span>
              </div>
              <div className="max-h-36 overflow-y-auto custom-scrollbar pt-2 border-t border-[#222222] space-y-1">
                {services
                  .filter((s) => s.active === 0)
                  .map((s) => (
                    <div key={s.id} className="flex justify-between text-[11px] text-[#AAAAAA]">
                      <span className="truncate max-w-[280px]">• {s.name}</span>
                      <span className="font-serif text-[#C5A059]">{formatKsh(s.price)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded mb-4 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                This will permanently delete all <strong>{deactivatedCount}</strong> deactivated service tariffs from the system.
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
                {purging ? 'Purging Services...' : `Delete All ${deactivatedCount} Deactivated`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-[#222222] rounded max-w-lg w-full shadow-2xl p-5 text-[#E5E5E0] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                {editingService ? `Edit Service: ${editingService.name}` : 'Register Service Offering'}
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
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KRA PIN Registration or Colour Printing (A4)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Description / Guidelines</label>
                <input
                  type="text"
                  placeholder="e.g. Full application on iTax portal including certificate printing"
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
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Unit of Billing</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="page">Page (pages)</option>
                    <option value="copy">Copy (copies)</option>
                    <option value="document">Document / Application</option>
                    <option value="hour">Hour (browsing/training)</option>
                    <option value="design">Design / Project</option>
                    <option value="device">Device / Installation</option>
                    <option value="set">Set / Pack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    Direct Cost Estimate (KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costEstimate}
                    onChange={(e) => setCostEstimate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[9px] text-[#666666]">
                    Ink/toner, paper, or processing fee
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">
                    Selling Rate (KSh) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-serif font-medium text-[#C5A059] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
                {editingService && isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setDeleteModalService(editingService)}
                    className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 hover:text-rose-200 text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Service
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
                    {saving ? 'Saving...' : editingService ? 'Update Service' : 'Register Service'}
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
