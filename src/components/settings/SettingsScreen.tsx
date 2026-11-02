import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BusinessSettings } from '../../types';
import { api } from '../../lib/api';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
  Printer,
  Smartphone,
  ShieldAlert,
  Percent,
  Palette,
  Sun,
  Moon
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { settings, refreshSettings } = useAuth();
  const { theme, isDark, setTheme } = useTheme();

  const [businessName, setBusinessName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [receiptFooter, setReceiptFooter] = useState<string>('');
  const [currency, setCurrency] = useState<string>('KES');
  const [taxRate, setTaxRate] = useState<string>('16');
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [receiptPrefix, setReceiptPrefix] = useState<string>('BC');
  const [defaultOpeningFloat, setDefaultOpeningFloat] = useState<string>('10000');
  const [servicesPaybill, setServicesPaybill] = useState<string>('4298298');
  const [servicesAccount, setServicesAccount] = useState<string>('0350494');
  const [mpesaPaybill, setMpesaPaybill] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name || 'BRIGHT CYBER & ICT CENTRE');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setReceiptFooter(settings.receipt_footer || '');
      setCurrency(settings.currency || 'KES');
      setTaxRate(String(settings.tax_rate ?? 16));
      setTaxEnabled(settings.tax_enabled === 1);
      setReceiptPrefix(settings.receipt_prefix || 'BC');
      setDefaultOpeningFloat(String(settings.default_opening_float ?? 10000));
      setServicesPaybill(settings.services_mpesa_paybill || '4298298');
      setServicesAccount(settings.services_mpesa_account || '0350494');
      setMpesaPaybill(settings.mpesa_paybill_or_till || 'Cyber & ICT Services: Paybill 4298298 (Acc: 0350494)');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    try {
      setSaving(true);
      await api.put('/settings', {
        business_name: businessName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        receipt_footer: receiptFooter.trim() || null,
        currency: currency.trim() || 'KES',
        tax_rate: parseFloat(taxRate) || 0,
        tax_enabled: taxEnabled ? 1 : 0,
        receipt_prefix: receiptPrefix.trim() || 'BC',
        default_opening_float: parseFloat(defaultOpeningFloat) || 10000,
        services_mpesa_paybill: servicesPaybill.trim() || '4298298',
        services_mpesa_account: servicesAccount.trim() || '0350494',
        mpesa_paybill_or_till: mpesaPaybill.trim() || `Cyber & ICT Services: Paybill ${servicesPaybill} (Acc: ${servicesAccount})`,
      });

      await refreshSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <SettingsIcon className="w-4 h-4 text-[#C5A059]" /> System Parameters & POS Settings
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Enterprise legal identity, receipt typography, theme appearance, and M-Pesa channels
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-[#121212] border border-[#C5A059] rounded text-[#C5A059] text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#C5A059] shrink-0" />
          <span>System configuration synchronized across all active POS terminals!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Section 0: Appearance / Theme Mode */}
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222222] text-xs font-serif-luxury font-medium text-[#C5A059] uppercase tracking-[0.18em]">
            <Palette className="w-3.5 h-3.5 text-[#C5A059]" /> Visual Display Theme
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded border text-left flex items-center gap-3 transition cursor-pointer ${
                isDark
                  ? 'border-[#C5A059] bg-[#141414] shadow-md ring-1 ring-[#C5A059]/40'
                  : 'border-[#262626] bg-[#0E0E0E] hover:border-[#444444]'
              }`}
            >
              <Moon className="w-5 h-5 text-[#C5A059]" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white">Obsidian Dark Luxury</div>
                <div className="text-[10px] text-[#777777]">Deep obsidian black terminal</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded border text-left flex items-center gap-3 transition cursor-pointer ${
                !isDark
                  ? 'border-[#9A6B1F] bg-[#FFFFFF] shadow-md ring-1 ring-[#9A6B1F]/40 text-[#0F172A]'
                  : 'border-[#262626] bg-[#0E0E0E] hover:border-[#444444]'
              }`}
            >
              <Sun className={`w-5 h-5 ${!isDark ? 'text-[#9A6B1F]' : 'text-[#888888]'}`} />
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider ${!isDark ? 'text-[#0F172A]' : 'text-white'}`}>
                  Crisp White Light Mode
                </div>
                <div className={`text-[10px] ${!isDark ? 'text-[#64748B]' : 'text-[#777777]'}`}>
                  Daylight clarity & bright surfaces
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 1: Business Identity */}
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222222] text-xs font-serif-luxury font-medium text-[#C5A059] uppercase tracking-[0.18em]">
            <Building className="w-3.5 h-3.5 text-[#C5A059]" /> Enterprise Identification
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Company / Enterprise Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Physical Address / Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Biashara Street, Nairobi"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Official Telephone / Contact</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000000"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Support Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@brightcyber.co.ke"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Lipa Na M-Pesa Payment Parameters */}
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222222] text-xs font-serif-luxury font-medium text-[#C5A059] uppercase tracking-[0.18em]">
            <Smartphone className="w-3.5 h-3.5 text-[#C5A059]" /> Lipa Na M-Pesa Configuration
          </div>

          <div className="p-4 bg-[#121212] border border-[#262626] rounded space-y-3">
            <div className="text-xs font-serif-luxury text-[#C5A059] uppercase font-semibold">
              Cyber & ICT Services (Lipa Na M-Pesa)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Paybill Number</label>
                <input
                  type="text"
                  value={servicesPaybill}
                  onChange={(e) => setServicesPaybill(e.target.value)}
                  placeholder="4298298"
                  className="w-full px-3 py-2 bg-[#161616] border border-[#2c2c2c] rounded text-xs font-mono font-bold text-[#C5A059] focus:outline-none focus:border-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Account Number</label>
                <input
                  type="text"
                  value={servicesAccount}
                  onChange={(e) => setServicesAccount(e.target.value)}
                  placeholder="0350494"
                  className="w-full px-3 py-2 bg-[#161616] border border-[#2c2c2c] rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Receipt Number Prefix</label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                placeholder="BC"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono uppercase text-white focus:outline-none focus:border-[#C5A059]"
              />
              <span className="text-[10px] text-[#666666]">e.g. BC-2026-000045</span>
            </div>

            <div>
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Default Opening Balance Float (KES)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={defaultOpeningFloat}
                onChange={(e) => setDefaultOpeningFloat(e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C5A059]"
              />
              <span className="text-[10px] text-[#666666]">Default cash in drawer when starting a new day</span>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Summary Display Text</label>
              <input
                type="text"
                value={mpesaPaybill}
                onChange={(e) => setMpesaPaybill(e.target.value)}
                placeholder="Cyber & ICT Services Paybill: 4298298 (Acc: 0350494)"
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-[#C5A059] font-medium focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Receipt Footer Note</label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Thank you for choosing Bright Cyber & ICT Centre! Fast, reliable services."
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Tax Rules */}
        <div className="bg-[#0D0D0D] border border-[#222222] rounded p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#222222] text-xs font-serif-luxury font-medium text-[#C5A059] uppercase tracking-[0.18em]">
            <Percent className="w-3.5 h-3.5 text-[#C5A059]" /> Taxation Configuration
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="tax-enabled-checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="rounded text-[#C5A059] focus:ring-0"
              />
              <label htmlFor="tax-enabled-checkbox" className="text-[#E5E5E0] font-medium cursor-pointer">
                Enable VAT / Sales Tax Calculation
              </label>
            </div>

            <div>
              <label className="text-[10px] text-[#777777] uppercase tracking-wider block mb-1">Standard Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                step="any"
                disabled={!taxEnabled}
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className={`w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C5A059] ${
                  !taxEnabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.2em] rounded transition flex items-center gap-2 cursor-pointer shadow active:scale-[0.99]"
          >
            <Save className="w-4 h-4 text-black" /> {saving ? 'Applying Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
