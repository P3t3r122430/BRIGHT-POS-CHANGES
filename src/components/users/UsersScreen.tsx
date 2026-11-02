import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../lib/api';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Key,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Password Reset Modal
  const [pwModalOpen, setPwModalOpen] = useState<boolean>(false);
  const [pwTargetUser, setPwTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);
  const [pwModalSaving, setPwModalSaving] = useState<boolean>(false);
  const [pwModalError, setPwModalError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBannerNotice({ type, message });
    setTimeout(() => {
      setBannerNotice((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ users: User[] }>('/users');
      setUsers(res.users || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load users:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setRole('cashier');
    setPassword('');
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email);
    setRole(u.role);
    setPassword('');
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenPwReset = (u: User) => {
    setPwTargetUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPwModalError(null);
    setPwModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!name.trim() || !username.trim() || !email.trim()) {
      setModalError('Name, username and email are required');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        if (password && password.length < 6) {
          setModalError('New password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await api.put(`/users/${editingUser.id}`, {
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
          newPassword: password.trim() ? password.trim() : undefined,
        });
        showBanner('success', `Staff member "${username}" updated successfully.`);
      } else {
        if (!password || password.length < 6) {
          setModalError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await api.post('/users', {
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
          password,
        });
        showBanner('success', `New staff member "${name}" (${username}) created successfully.`);
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save staff account');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTargetUser) return;
    if (newPassword.length < 6) {
      setPwModalError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwModalError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setPwModalSaving(true);
      setPwModalError(null);
      await api.put(`/users/${pwTargetUser.id}/password`, {
        newPassword,
      });
      showBanner('success', `Password for "${pwTargetUser.username}" successfully updated.`);
      setPwModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwModalError(err.message || 'Failed to reset password');
    } finally {
      setPwModalSaving(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    try {
      const res = await api.delete<{ success: boolean; message?: string }>(`/users/${u.id}`);
      showBanner('success', res.message || `Account status for "${u.username}" changed.`);
      fetchUsers();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed to update account status');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC] dark:bg-[#0A0A0A] text-[#0F172A] dark:text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Banner Notification */}
      {bannerNotice && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between animate-in fade-in ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-[#121c12] border-emerald-200 dark:border-[#4CAF50]/40 text-emerald-800 dark:text-[#A5D6A7]'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4CAF50]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span className="font-medium">{bannerNotice.message}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#0F172A] dark:text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" /> Staff Accounts & RBAC Access
          </h2>
          <p className="text-[11px] text-[#64748B] dark:text-[#777777] uppercase tracking-[0.2em] mt-1">
            Operator management, role authorizations, credentials, and activity oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 bg-white dark:bg-[#141414] hover:bg-[#F1F5F9] dark:hover:bg-[#1A1A1A] text-[#64748B] dark:text-[#888888] hover:text-[#0F172A] dark:hover:text-[#2563EB] rounded-lg border border-[#E2E8F0] dark:border-[#262626] transition cursor-pointer"
            title="Refresh staff roster"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-add-user"
            onClick={handleOpenAdd}
            className="px-4 py-2 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-white" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#121212] text-[#64748B] dark:text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#E2E8F0] dark:border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Assigned Role</th>
                <th className="py-3 px-4 text-center">Receipts Handled</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748B] dark:text-[#555555]">
                    Loading personnel records...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#141414] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-[#E5E5E0]">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-[#2563EB] dark:text-[#3B82F6] text-[11px] font-medium">{u.username}</td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#888888]">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${
                          u.role === 'admin'
                            ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/10 text-[#2563EB] dark:text-[#3B82F6] border-[#BFDBFE] dark:border-[#2563EB]/40'
                            : 'bg-[#F1F5F9] dark:bg-[#181818] text-[#64748B] dark:text-[#AAAAAA] border-[#E2E8F0] dark:border-[#282828]'
                        }`}
                      >
                        {u.role === 'admin' ? <Shield className="w-3 h-3 text-[#2563EB] dark:text-[#3B82F6]" /> : <UserIcon className="w-3 h-3 text-[#64748B] dark:text-[#888888]" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-[#0F172A] dark:text-[#E5E5E0]">
                      {u.total_sales_recorded || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${
                          u.active === 1
                            ? 'bg-emerald-50 dark:bg-[#4CAF50]/10 text-emerald-700 dark:text-[#4CAF50] border-emerald-200 dark:border-[#4CAF50]/30'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                        }`}
                      >
                        {u.active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPwReset(u)}
                          className="p-1.5 bg-white dark:bg-[#141414] hover:bg-[#F1F5F9] dark:hover:bg-[#1A1A1A] text-[#64748B] dark:text-[#888888] hover:text-[#2563EB] dark:hover:text-[#3B82F6] rounded-lg border border-[#E2E8F0] dark:border-[#262626] transition cursor-pointer"
                          title="Reset password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-white dark:bg-[#141414] hover:bg-[#F1F5F9] dark:hover:bg-[#1A1A1A] text-[#64748B] dark:text-[#888888] hover:text-[#2563EB] dark:hover:text-[#3B82F6] rounded-lg border border-[#E2E8F0] dark:border-[#262626] transition cursor-pointer"
                          title="Edit profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== 1 && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition cursor-pointer border ${
                              u.active === 1
                                ? 'bg-white dark:bg-[#141414] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#64748B] dark:text-[#888888] hover:text-rose-600 dark:hover:text-rose-300 border-[#E2E8F0] dark:border-[#262626]'
                                : 'bg-[#EFF6FF] dark:bg-[#181818] text-[#2563EB] dark:text-[#4CAF50] border-[#BFDBFE] dark:border-[#4CAF50]/30'
                            }`}
                          >
                            {u.active === 1 ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-2xl max-w-md w-full shadow-2xl p-5 text-[#0F172A] dark:text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#222222] mb-4">
              <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#E5E5E0] uppercase tracking-[0.18em]">
                {editingUser ? `Edit Staff: ${editingUser.name}` : 'Provision Staff Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#2563EB] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">Username Identifier *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs font-mono text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">Access Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="cashier">Cashier (POS & Sales)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">
                  {editingUser ? 'Update Password (leave blank to keep current)' : 'Initial Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    minLength={6}
                    placeholder={editingUser ? '•••••••• (leave unchanged)' : 'Min 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 pr-9 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#AAAAAA] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#F1F5F9] dark:bg-[#181818] text-[#64748B] dark:text-[#888888] hover:text-[#0F172A] dark:hover:text-white text-[11px] uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#282828] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update Staff' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {pwModalOpen && pwTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-2xl max-w-sm w-full shadow-2xl p-5 text-[#0F172A] dark:text-[#E5E5E0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#222222] mb-3">
              <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#E5E5E0] uppercase tracking-[0.18em] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#2563EB]" />
                Reset Credentials: <span className="font-mono text-[#2563EB]">@{pwTargetUser.username}</span>
              </h3>
              <button onClick={() => setPwModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#2563EB] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwModalError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{pwModalError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">
                  New Security Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full px-3 pr-9 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#AAAAAA] cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#777777] uppercase tracking-wider block mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password..."
                    className="w-full px-3 pr-9 py-2 bg-[#F8FAFC] dark:bg-[#141414] border border-[#E2E8F0] dark:border-[#262626] rounded-lg text-xs text-[#0F172A] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#AAAAAA] cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#222222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPwModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#F1F5F9] dark:bg-[#181818] text-[#64748B] dark:text-[#888888] hover:text-[#0F172A] dark:hover:text-white text-[11px] uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#282828] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwModalSaving}
                  className="px-4 py-1.5 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {pwModalSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
