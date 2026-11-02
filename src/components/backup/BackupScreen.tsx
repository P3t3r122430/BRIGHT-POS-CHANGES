import React, { useState, useEffect } from 'react';
import { BackupItem } from '../../types';
import { api, getAuthToken } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Save,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const BackupScreen: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ backups: BackupItem[] }>('/backups');
      setBackups(res.backups || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to list backups:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setActionSuccess(null);
    setActionError(null);
    try {
      setCreating(true);
      const res = await api.post<{ success: boolean; filename: string }>('/backups/create');
      setActionSuccess(`Database snapshot archived successfully: ${res.filename}`);
      fetchBackups();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create database backup snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    const token = getAuthToken();
    const url = `/api/backups/download/${filename}?token=${token || ''}`;
    window.open(url, '_blank');
  };

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `DANGER: Restoring "${filename}" will replace the current active SQLite database. An automatic safety backup will be created first. Proceed with restore?`
      )
    ) {
      return;
    }

    setActionSuccess(null);
    setActionError(null);
    try {
      setRestoringFile(filename);
      await api.post('/backups/restore', { filename });
      setActionSuccess(`Database successfully restored from snapshot ${filename}! The system state is now restored.`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore database');
    } finally {
      setRestoringFile(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC] dark:bg-[#0A0A0A] text-[#0F172A] dark:text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#0F172A] dark:text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#2563EB]" /> Disaster Recovery & State Snapshots
          </h2>
          <p className="text-[11px] text-[#64748B] dark:text-[#777777] uppercase tracking-[0.2em] mt-1">
            Complete database archives of merchandise catalogs, service rate cards, sales receipts, client profiles, and journals
          </p>
        </div>

        <button
          id="btn-create-backup-snapshot"
          disabled={creating}
          onClick={handleCreateBackup}
          className="px-4 py-2 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Save className="w-4 h-4 text-white" /> {creating ? 'Archiving...' : 'Create Snapshot'}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#141414] border border-[#BFDBFE] dark:border-[#262626] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] dark:text-[#777777] font-semibold uppercase tracking-wider">Active Database</div>
              <div className="text-xs font-mono font-medium text-[#0F172A] dark:text-[#E5E5E0] mt-0.5">/data/brightcyber.db</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#141414] border border-[#BFDBFE] dark:border-[#262626] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] dark:text-[#777777] font-semibold uppercase tracking-wider">Stored Snapshots</div>
              <div className="text-xs font-semibold text-[#0F172A] dark:text-[#E5E5E0] mt-0.5">{backups.length} snapshot(s)</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-[#141414] border border-emerald-200 dark:border-[#262626] text-emerald-600 dark:text-[#4CAF50] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] dark:text-[#777777] font-semibold uppercase tracking-wider">Recovery Protocol</div>
              <div className="text-xs text-emerald-700 dark:text-[#4CAF50] font-medium mt-0.5">Pre-restore auto-backup enabled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white dark:bg-[#0D0D0D] border border-[#E2E8F0] dark:border-[#222222] rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#121212] border-b border-[#E2E8F0] dark:border-[#1F1F1F] flex items-center justify-between">
          <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#E5E5E0] uppercase tracking-[0.18em]">Available System Snapshots</h3>
          <button
            onClick={fetchBackups}
            className="p-1 text-[#64748B] hover:text-[#2563EB] dark:text-[#777777] dark:hover:text-[#3B82F6] rounded transition cursor-pointer"
            title="Refresh backups"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#121212] text-[#64748B] dark:text-[#777777] uppercase text-[10px] tracking-[0.18em] border-b border-[#E2E8F0] dark:border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Snapshot Identifier</th>
                <th className="py-3 px-4">Archive Size</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#64748B] dark:text-[#555555]">
                    Scanning backup storage directory...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#64748B] dark:text-[#555555]">
                    No backup files found. Click "Create Snapshot" above to generate an initial archive.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-[#F8FAFC] dark:hover:bg-[#141414] transition">
                    <td className="py-3 px-4 font-mono font-semibold text-[#2563EB] dark:text-[#3B82F6] text-[11px]">
                      {b.filename}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#888888]">
                      {(b.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#AAAAAA] font-mono text-[11px]">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadBackup(b.filename)}
                          className="px-2.5 py-1 bg-white dark:bg-[#141414] hover:bg-[#F1F5F9] dark:hover:bg-[#1A1A1A] text-[#0F172A] dark:text-[#E5E5E0] text-[10px] uppercase tracking-wider font-semibold rounded-lg border border-[#E2E8F0] dark:border-[#262626] transition flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-[#2563EB]" /> Download
                        </button>
                        <button
                          disabled={restoringFile === b.filename}
                          onClick={() => handleRestore(b.filename)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] uppercase tracking-wider font-semibold rounded-lg border border-amber-200 dark:border-amber-800/40 transition flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${restoringFile === b.filename ? 'animate-spin' : ''}`} />
                          Restore
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
    </div>
  );
};
