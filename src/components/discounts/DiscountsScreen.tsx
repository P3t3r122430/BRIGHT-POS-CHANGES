import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Discount } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatDate } from '../../lib/utils';
import {
  Tag,
  Plus,
  Search,
  Check,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Trash2,
  Percent,
  Sparkles,
  TrendingDown,
  Gift,
  Copy,
  Sliders,
  ShieldAlert,
  X,
  Layers,
  ArrowUpDown,
  ShoppingBag,
  Zap
} from 'lucide-react';

export const DiscountsScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    total_discounts_granted: number;
    discounted_sales_count: number;
    active_discounts_count: number;
  }>({
    total_discounts_granted: 0,
    discounted_sales_count: 0,
    active_discounts_count: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'percentage' | 'fixed'>('ALL');
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'all' | 'product' | 'service'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState<string>('');
  const [formMinSpend, setFormMinSpend] = useState<string>('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
  const [formTargetType, setFormTargetType] = useState<'all' | 'product' | 'service'>('all');
  const [formIsQuickPreset, setFormIsQuickPreset] = useState<boolean>(true);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load Discounts and Stats
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [discRes, statsRes] = await Promise.all([
        api.get<{ discounts: Discount[] }>('/discounts'),
        api.get<any>('/discounts/stats'),
      ]);
      setDiscounts(discRes.discounts || []);
      if (statsRes) {
        setStats({
          total_discounts_granted: statsRes.total_discounts_granted || 0,
          discounted_sales_count: statsRes.discounted_sales_count || 0,
          active_discounts_count: statsRes.active_discounts_count || 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to load discounts:', err);
      setError(err.message || 'Failed to load discount rules. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingDiscount(null);
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormType('percentage');
    setFormValue('');
    setFormMinSpend('0');
    setFormMaxDiscount('');
    setFormTargetType('all');
    setFormIsQuickPreset(true);
    setFormActive(true);
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (d: Discount) => {
    setEditingDiscount(d);
    setFormCode(d.code || '');
    setFormName(d.name);
    setFormDesc(d.description || '');
    setFormType(d.discount_type);
    setFormValue(String(d.value));
    setFormMinSpend(String(d.min_spend || 0));
    setFormMaxDiscount(d.max_discount ? String(d.max_discount) : '');
    setFormTargetType(d.target_type);
    setFormIsQuickPreset(d.is_quick_preset === 1);
    setFormActive(d.active === 1);
    setModalError(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (id: number) => {
    if (!isAdmin) {
      alert('Only administrators can enable or disable discount rules.');
      return;
    }
    try {
      await api.patch(`/discounts/${id}/toggle-active`, {});
      setDiscounts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, active: d.active === 1 ? 0 : 1 } : d))
      );
      setSuccessMessage('Discount status updated.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (d: Discount) => {
    if (!isAdmin) {
      alert('Only administrators can delete discount rules.');
      return;
    }
    if (!confirm(`Are you sure you want to delete discount rule "${d.name}"?`)) return;

    try {
      await api.delete(`/discounts/${d.id}`);
      setDiscounts((prev) => prev.filter((item) => item.id !== d.id));
      setSuccessMessage(`Discount "${d.name}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to delete discount');
    }
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const val = parseFloat(formValue);
    if (isNaN(val) || val <= 0) {
      setModalError('Discount value must be a positive number.');
      return;
    }

    if (formType === 'percentage' && val > 100) {
      setModalError('Percentage discount cannot exceed 100%.');
      return;
    }

    const payload = {
      code: formCode ? formCode.trim().toUpperCase() : null,
      name: formName.trim(),
      description: formDesc.trim() || null,
      discount_type: formType,
      value: val,
      min_spend: parseFloat(formMinSpend) || 0,
      max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
      target_type: formTargetType,
      is_quick_preset: formIsQuickPreset ? 1 : 0,
      active: formActive ? 1 : 0,
    };

    try {
      setSaving(true);
      if (editingDiscount) {
        const res = await api.put<{ discount: Discount; message: string }>(`/discounts/${editingDiscount.id}`, payload);
        setDiscounts((prev) => prev.map((d) => (d.id === editingDiscount.id ? res.discount : d)));
        setSuccessMessage('Discount rule updated successfully.');
      } else {
        const res = await api.post<{ discount: Discount; message: string }>('/discounts', payload);
        setDiscounts((prev) => [res.discount, ...prev]);
        setSuccessMessage('New discount rule created successfully.');
      }
      setModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save discount rule.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Discounts
  const filteredDiscounts = discounts.filter((d) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchCode = d.code ? d.code.toLowerCase().includes(q) : false;
      const matchDesc = d.description ? d.description.toLowerCase().includes(q) : false;
      if (!matchName && !matchCode && !matchDesc) return false;
    }

    // Type filter
    if (typeFilter !== 'ALL' && d.discount_type !== typeFilter) return false;

    // Target filter
    if (targetFilter !== 'ALL' && d.target_type !== targetFilter) return false;

    // Active filter
    if (activeFilter === 'active' && d.active !== 1) return false;
    if (activeFilter === 'inactive' && d.active === 1) return false;

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 dark:bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6]">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif-luxury text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                Discounts & Promotions Manager
              </h1>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Configure POS quick percentage presets, vouchers, student deals, and customer concessions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh discounts list"
            className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              id="btn-add-discount"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Discount Rule
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F1F5F9]/70 dark:bg-[#090D16]/50 border-b border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
        <div className="bg-white dark:bg-[#0F172A] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Active Discount Rules
            </span>
            <div className="text-xl font-bold font-serif-luxury text-[#2563EB] dark:text-[#3B82F6] mt-0.5">
              {discounts.filter((d) => d.active === 1).length}{' '}
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-normal">/ {discounts.length} total</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#BFDBFE] dark:border-[#334155] flex items-center justify-center text-[#2563EB]">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Total Concessions Granted
            </span>
            <div className="text-xl font-bold font-serif-luxury text-[#10B981] mt-0.5">
              {formatKsh(stats.total_discounts_granted)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Discounted Transactions
            </span>
            <div className="text-xl font-bold font-serif-luxury text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {stats.discounted_sales_count}{' '}
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-normal">sales</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mx-4 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search discount rules by name, promo code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] dark:border-[#334155] p-0.5 bg-[#F8FAFC] dark:bg-[#1E293B]">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] shadow-2xs font-semibold'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('percentage')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                typeFilter === 'percentage'
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] shadow-2xs font-semibold'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              % Percentage
            </button>
            <button
              onClick={() => setTypeFilter('fixed')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                typeFilter === 'fixed'
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] shadow-2xs font-semibold'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              KES Fixed
            </button>
          </div>

          {/* Scope Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-[11px] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Target Scopes</option>
            <option value="all">Entire Order</option>
            <option value="product">Products Only</option>
            <option value="service">Cyber Services Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-[11px] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Content Grid / Table */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center text-[#64748B] space-y-2">
            <RotateCcw className="w-6 h-6 animate-spin text-[#2563EB]" />
            <span className="text-xs uppercase tracking-wider">Loading discount rules...</span>
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[#64748B] dark:text-[#94A3B8] border border-dashed border-[#CBD5E1] dark:border-[#334155] rounded-2xl bg-white dark:bg-[#0F172A] p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] dark:bg-[#1E293B] flex items-center justify-center text-[#2563EB]">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No Discount Rules Found</h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mt-1">
                {searchQuery || typeFilter !== 'ALL' || targetFilter !== 'ALL' || activeFilter !== 'ALL'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Create promotional discounts, coupons, and quick presets for rapid checkout.'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create First Discount Rule
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiscounts.map((discount) => {
              const isPct = discount.discount_type === 'percentage';
              const isQuick = discount.is_quick_preset === 1;
              const isActive = discount.active === 1;

              return (
                <div
                  key={discount.id}
                  className={`bg-white dark:bg-[#0F172A] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-md ${
                    isActive
                      ? 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#BFDBFE] dark:hover:border-[#334155]'
                      : 'border-[#E2E8F0]/60 dark:border-[#1E293B]/60 opacity-70 bg-[#F8FAFC]/50 dark:bg-[#0B0F19]/50'
                  }`}
                >
                  <div>
                    {/* Top Row: Value Badge & Quick Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1.5 rounded-xl font-serif-luxury font-bold text-sm flex items-center gap-1 ${
                            isPct
                              ? 'bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] border border-[#BFDBFE] dark:border-[#334155]'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isPct ? (
                            <>
                              <Percent className="w-3.5 h-3.5" />
                              <span>{discount.value}% OFF</span>
                            </>
                          ) : (
                            <>
                              <span>- {formatKsh(discount.value)}</span>
                            </>
                          )}
                        </div>

                        {isQuick && (
                          <span
                            title="Visible on POS quick 1-click discount bar"
                            className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3 text-amber-500" /> POS Preset
                          </span>
                        )}
                      </div>

                      {/* Active Status Badge */}
                      <button
                        onClick={() => handleToggleActive(discount.id)}
                        title={isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] border-[#E2E8F0] dark:border-[#334155] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    {/* Name & Code */}
                    <div className="mt-3">
                      <h3 className="font-semibold text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                        {discount.name}
                      </h3>

                      {discount.code && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="font-mono text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E293B] px-2 py-0.5 rounded border border-[#BFDBFE] dark:border-[#334155] flex items-center gap-1">
                            {discount.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(discount.code!)}
                            title="Copy promo code"
                            className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition"
                          >
                            {copiedCode === discount.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {discount.description && (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-2 leading-relaxed line-clamp-2">
                          {discount.description}
                        </p>
                      )}
                    </div>

                    {/* Conditions Box */}
                    <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] space-y-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      <div className="flex items-center justify-between">
                        <span>Applies to:</span>
                        <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC] capitalize">
                          {discount.target_type === 'all'
                            ? 'All Items'
                            : discount.target_type === 'product'
                            ? 'Physical Products'
                            : 'Cyber Services'}
                        </span>
                      </div>

                      {discount.min_spend > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Min Spend:</span>
                          <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatKsh(discount.min_spend)}
                          </span>
                        </div>
                      )}

                      {discount.max_discount && discount.max_discount > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Max Discount Cap:</span>
                          <span className="font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                            {formatKsh(discount.max_discount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between">
                    <div className="text-[10px] text-[#94A3B8]">
                      Rule #{discount.id}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(discount)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition cursor-pointer"
                          title="Edit discount rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(discount)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete discount rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT DISCOUNT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-[#0F172A] dark:text-[#F8FAFC]">
            {/* Header */}
            <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B0F19]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#2563EB]" />
                <h3 className="font-serif-luxury font-bold text-xs uppercase tracking-wider">
                  {editingDiscount ? 'Edit Discount Rule' : 'New Discount / Promotion Rule'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveDiscount} className="p-4 space-y-3.5 overflow-y-auto max-h-[80vh] custom-scrollbar text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Discount Name */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student 10% Off, VIP Client Discount"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Promo Code (Optional) */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                  Promo / Voucher Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. STUDENT10, PROMO20, CYBERVIP"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono uppercase bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Type and Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (KES)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                    Value {formType === 'percentage' ? '(%) *' : '(KES) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={formType === 'percentage' ? '10' : '50'}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Min Spend and Max Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                    Min Spend (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formMinSpend}
                    onChange={(e) => setFormMinSpend(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                    Max Discount (KES Cap)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional max cap"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Target Scope */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                  Applicable Catalogue Scope
                </label>
                <select
                  value={formTargetType}
                  onChange={(e) => setFormTargetType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="all">Entire Order (All Products & Services)</option>
                  <option value="product">Stationery & Physical Products Only</option>
                  <option value="service">Cyber & ICT Services Only</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider block mb-1">
                  Description / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Valid on bulk photocopies and flash drive purchases"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsQuickPreset}
                    onChange={(e) => setFormIsQuickPreset(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    Show on POS Cart Quick-Preset Discount Bar
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span className="text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                    Rule is Active & Ready for Checkout
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingDiscount ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
