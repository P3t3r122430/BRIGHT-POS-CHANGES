import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  User as UserIcon,
  Lock,
  KeyRound,
  Mail,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  AtSign
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserSession } = useAuth();

  const [name, setName] = useState<string>(user?.name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [email, setEmail] = useState<string>(user?.email || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false);
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync initial state when modal opens
  React.useEffect(() => {
    if (isOpen && user) {
      setName(user.name);
      setUsername(user.username);
      setEmail(user.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }

    // Password validation
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to authorize security changes.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters in length.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation password do not match.');
        return;
      }
    }

    try {
      setSaving(true);
      const res = await api.put<{ success: boolean; message: string; token?: string; user?: any }>('/auth/profile', {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.user) {
        updateUserSession(res.user, res.token);
      }

      setSuccess(newPassword ? 'Password and profile updated successfully!' : 'Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update credentials. Please verify your current password.');
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: 'bg-neutral-700' };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div
      id="modal-user-profile"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0F0F0F] border border-[#262626] rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#C5A059]/40 bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E5E5E0] tracking-wide">
                Account & Password Security
              </h3>
              <p className="text-[11px] text-[#777777]">
                Manage credentials for <span className="text-[#C5A059] font-mono">@{user.username}</span>
              </p>
            </div>
          </div>
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="text-[#777777] hover:text-[#E5E5E0] p-1 rounded hover:bg-[#222222] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* User Account Info Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-[#1F1F1F]">
              <h4 className="text-[11px] uppercase tracking-widest text-[#A0A0A0] font-semibold flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#C5A059]" /> Personal Details
              </h4>
              <span className="text-[10px] text-[#C5A059] uppercase tracking-wider font-mono border border-[#C5A059]/30 bg-[#C5A059]/10 px-2 py-0.5 rounded">
                Role: {user.role}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                  Username <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <AtSign className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    className="w-full pl-8 pr-3 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition"
                />
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="space-y-3.5 pt-2">
            <div className="pb-1 border-b border-[#1F1F1F]">
              <h4 className="text-[11px] uppercase tracking-widest text-[#A0A0A0] font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#C5A059]" /> Change Password
              </h4>
              <p className="text-[10px] text-[#777777] mt-0.5">
                Leave password fields empty if you only want to update your name/email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                Current Password {newPassword && <span className="text-rose-400">*</span>}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-profile-current-password"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to authorize changes"
                  className="w-full pl-8 pr-9 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition placeholder-[#555555]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#AAAAAA] cursor-pointer"
                >
                  {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-new-password"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-8 pr-9 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition placeholder-[#555555]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#AAAAAA] cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CCCCCC] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-confirm-password"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-8 pr-9 py-2 bg-[#171717] border border-[#2E2E2E] rounded text-xs text-[#E5E5E0] font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 transition placeholder-[#555555]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#AAAAAA] cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {newPassword && (
              <div className="p-2.5 bg-[#141414] border border-[#222222] rounded space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#888888]">Password Strength:</span>
                  <span className="font-medium text-[#E5E5E0]">{strength.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 h-1.5">
                  <div className={`rounded-full h-full ${strength.score >= 1 ? strength.color : 'bg-[#2A2A2A]'}`} />
                  <div className={`rounded-full h-full ${strength.score >= 2 ? strength.color : 'bg-[#2A2A2A]'}`} />
                  <div className={`rounded-full h-full ${strength.score >= 3 ? strength.color : 'bg-[#2A2A2A]'}`} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#222222]">
            <button
              type="button"
              id="btn-cancel-profile"
              onClick={onClose}
              className="px-4 py-2 border border-[#333333] hover:bg-[#202020] text-[#CCCCCC] rounded text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-profile"
              disabled={saving}
              className="px-5 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-black font-semibold rounded text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving Changes...' : 'Save & Update Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
