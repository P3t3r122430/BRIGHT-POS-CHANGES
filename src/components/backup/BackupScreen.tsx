import React, { useState, useEffect } from 'react';
import { BackupItem, BackupScheduleConfig } from '../../types';
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
  Clock,
  Calendar,
  Layers,
  Play,
  Settings2,
  X,
  FileCheck,
} from 'lucide-react';

const DEFAULT_SCHEDULE_CONFIG: BackupScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  time: '23:00',
  retention: 7,
  lastRun: null,
  lastStatus: null,
  lastError: null,
  nextScheduledRun: '',
  backupCount: 0,
};

export const BackupScreen: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Scheduled Backups state
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>(DEFAULT_SCHEDULE_CONFIG);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);
  const [triggeringSchedule, setTriggeringSchedule] = useState<boolean>(false);

  // Restore Modal State
  const [restoreModalFile, setRestoreModalFile] = useState<string | null>(null);

  const fetchBackupsAndSchedule = async () => {
    try {
      setLoading(true);
      const [backupsRes, scheduleRes] = await Promise.allSettled([
        api.get<{ backups: BackupItem[] }>('/backups'),
        api.get<{ config?: BackupScheduleConfig; schedule?: BackupScheduleConfig }>('/backups/schedule'),
      ]);

      if (backupsRes.status === 'fulfilled' && backupsRes.value?.backups) {
        setBackups(backupsRes.value.backups);
      }
      if (scheduleRes.status === 'fulfilled' && scheduleRes.value) {
        const cfg = scheduleRes.value.schedule || scheduleRes.value.config;
        if (cfg && typeof cfg === 'object') {
          setScheduleConfig(prev => ({
            ...DEFAULT_SCHEDULE_CONFIG,
            ...(prev || {}),
            ...cfg,
          }));
        }
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load backup data:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupsAndSchedule();
  }, []);

  const handleCreateBackup = async () => {
    setActionSuccess(null);
    setActionError(null);
    try {
      setCreating(true);
      const res = await api.post<{ success: boolean; filename: string }>('/backups/create');
      setActionSuccess(`Database snapshot archived successfully: ${res.filename}`);
      fetchBackupsAndSchedule();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create database backup snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSchedule = async () => {
    setActionSuccess(null);
    setActionError(null);
    try {
      setSavingSchedule(true);
      const res = await api.put<{ success: boolean; config?: BackupScheduleConfig; schedule?: BackupScheduleConfig }>('/backups/schedule', {
        enabled: scheduleConfig?.enabled ?? true,
        frequency: scheduleConfig?.frequency ?? 'daily',
        time: scheduleConfig?.time ?? '23:00',
        retention: Number(scheduleConfig?.retention) || 7,
      });
      const updated = res?.schedule || res?.config;
      if (updated && typeof updated === 'object') {
        setScheduleConfig(prev => ({
          ...DEFAULT_SCHEDULE_CONFIG,
          ...(prev || {}),
          ...updated,
        }));
      }
      setActionSuccess('Scheduled backup automation settings updated successfully!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update backup schedule settings');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleTriggerScheduledBackup = async () => {
    setActionSuccess(null);
    setActionError(null);
    try {
      setTriggeringSchedule(true);
      const res = await api.post<{
        success: boolean;
        filename?: string;
        prunedCount?: number;
        backup?: { filename?: string; prunedCount?: number };
      }>('/backups/trigger-scheduled');
      const filename = res?.filename || res?.backup?.filename || 'archive';
      const pruned = res?.prunedCount ?? res?.backup?.prunedCount ?? 0;
      setActionSuccess(
        `Automated scheduled backup cycle executed: Created snapshot "${filename}" (Pruned ${pruned} snapshot(s) according to retention policy)`
      );
      fetchBackupsAndSchedule();
    } catch (err: any) {
      setActionError(err.message || 'Failed to trigger automated backup cycle');
    } finally {
      setTriggeringSchedule(false);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    const token = getAuthToken();
    const url = `/api/backups/download/${filename}?token=${token || ''}`;
    window.open(url, '_blank');
  };

  const handleExecuteRestore = async () => {
    if (!restoreModalFile) return;
    const filename = restoreModalFile;
    setRestoreModalFile(null);

    setActionSuccess(null);
    setActionError(null);
    try {
      setRestoringFile(filename);
      const res = await api.post<{ success: boolean; emergencyBackup: string }>('/backups/restore', {
        filename,
        confirmed: true,
      });
      setActionSuccess(
        `Safety snapshot created: "${res.emergencyBackup}". Database restored successfully from "${filename}". System reloading...`
      );
      setTimeout(() => {
        window.location.reload();
      }, 1800);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore database');
    } finally {
      setRestoringFile(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#C5A059]" /> Disaster Recovery & State Snapshots
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Complete database archives of merchandise catalogs, service rate cards, sales receipts, client profiles, and journals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-create-backup-snapshot"
            disabled={creating}
            onClick={handleCreateBackup}
            className="px-4 py-2 border border-[#C5A059] bg-[#C5A059] hover:bg-[#b08e4d] text-black font-semibold text-xs uppercase tracking-[0.15em] rounded transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <Save className="w-4 h-4 text-black" /> {creating ? 'Archiving...' : 'Create Snapshot'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#141414] border border-[#262626] text-[#C5A059] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-wider">Active Database</div>
              <div className="text-xs font-mono font-medium text-[#E5E5E0] mt-0.5">/data/brightcyber.db</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#141414] border border-[#262626] text-[#C5A059] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-wider">Stored Snapshots</div>
              <div className="text-xs font-semibold text-[#E5E5E0] mt-0.5">{backups.length} snapshot(s) archived</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#141414] border border-[#262626] text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#777777] font-semibold uppercase tracking-wider">Emergency Protocol</div>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">Pre-restore auto-backup enforced</div>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATIC SCHEDULED BACKUPS CARD */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 bg-[#121212] border-b border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#C5A059]" />
            <div>
              <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
                Automated Scheduled Backups Engine
              </h3>
              <p className="text-[11px] text-[#777777]">
                Server-side cron schedule for automatic snapshots with retention policy pruning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerScheduledBackup}
              disabled={triggeringSchedule}
              className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-[#C5A059] hover:text-[#d4b06b] text-[11px] uppercase tracking-wider font-semibold rounded border border-[#C5A059]/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Execute a scheduled backup run right now to test retention pruning"
            >
              <Play className="w-3.5 h-3.5" /> {triggeringSchedule ? 'Running...' : 'Run Scheduled Backup Now'}
            </button>
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black text-[11px] uppercase tracking-wider font-semibold rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {savingSchedule ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            {/* Toggle */}
            <div className="bg-[#141414] p-3 rounded border border-[#222222] space-y-2">
              <label className="text-[10px] text-[#777777] uppercase font-semibold tracking-wider block">
                Automation Status
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleConfig?.enabled ?? true}
                  onChange={(e) =>
                    setScheduleConfig((prev) => ({ ...(prev || DEFAULT_SCHEDULE_CONFIG), enabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#C5A059] rounded"
                />
                <span className={`font-semibold ${(scheduleConfig?.enabled ?? true) ? 'text-emerald-400' : 'text-[#888888]'}`}>
                  {(scheduleConfig?.enabled ?? true) ? 'AUTOMATION ENABLED' : 'AUTOMATION PAUSED'}
                </span>
              </label>
            </div>

            {/* Frequency */}
            <div className="bg-[#141414] p-3 rounded border border-[#222222] space-y-2">
              <label className="text-[10px] text-[#777777] uppercase font-semibold tracking-wider block">
                Backup Frequency
              </label>
              <select
                value={scheduleConfig?.frequency ?? 'daily'}
                onChange={(e) =>
                  setScheduleConfig((prev) => ({ ...(prev || DEFAULT_SCHEDULE_CONFIG), frequency: e.target.value as any }))
                }
                className="w-full bg-[#0A0A0A] text-[#E5E5E0] px-2.5 py-1.5 rounded border border-[#333333] focus:outline-none focus:border-[#C5A059]"
              >
                <option value="daily">Daily Schedule</option>
                <option value="weekly">Weekly Schedule (Sunday)</option>
              </select>
            </div>

            {/* Time of Day */}
            <div className="bg-[#141414] p-3 rounded border border-[#222222] space-y-2">
              <label className="text-[10px] text-[#777777] uppercase font-semibold tracking-wider block">
                Execution Time (24h)
              </label>
              <input
                type="time"
                value={scheduleConfig?.time ?? '23:00'}
                onChange={(e) =>
                  setScheduleConfig((prev) => ({ ...(prev || DEFAULT_SCHEDULE_CONFIG), time: e.target.value }))
                }
                className="w-full bg-[#0A0A0A] text-[#E5E5E0] px-2.5 py-1.5 rounded border border-[#333333] focus:outline-none focus:border-[#C5A059] font-mono"
              />
            </div>

            {/* Retention */}
            <div className="bg-[#141414] p-3 rounded border border-[#222222] space-y-2">
              <label className="text-[10px] text-[#777777] uppercase font-semibold tracking-wider block">
                Retention Count (Snapshots)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={scheduleConfig?.retention ?? 7}
                onChange={(e) =>
                  setScheduleConfig((prev) => ({
                    ...(prev || DEFAULT_SCHEDULE_CONFIG),
                    retention: parseInt(e.target.value) || 7,
                  }))
                }
                className="w-full bg-[#0A0A0A] text-[#E5E5E0] px-2.5 py-1.5 rounded border border-[#333333] focus:outline-none focus:border-[#C5A059] font-mono"
              />
            </div>
          </div>

          {/* Schedule Engine Diagnostics Bar */}
          <div className="bg-[#111111] p-3 rounded border border-[#1F1F1F] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div>
                <span className="text-[#777777]">Last Run: </span>
                <span className="font-mono text-[#E5E5E0]">
                  {scheduleConfig?.lastRun ? formatDate(scheduleConfig.lastRun) : 'Never executed'}
                </span>
              </div>
              <div>
                <span className="text-[#777777]">Last Status: </span>
                <span
                  className={`font-semibold uppercase ${
                    (scheduleConfig?.lastStatus || '').toLowerCase() === 'success'
                      ? 'text-emerald-400'
                      : (scheduleConfig?.lastStatus || '').toLowerCase() === 'failed'
                      ? 'text-rose-400'
                      : 'text-[#888888]'
                  }`}
                >
                  {scheduleConfig?.lastStatus || 'IDLE'}
                </span>
              </div>
              <div>
                <span className="text-[#777777]">Next Run Target: </span>
                <span className="font-mono text-[#C5A059]">
                  {scheduleConfig?.time ?? '23:00'} ({(scheduleConfig?.frequency ?? 'daily').toUpperCase()})
                </span>
              </div>
              <div>
                <span className="text-[#777777]">Snapshots Retained: </span>
                <span className="font-mono text-[#E5E5E0]">
                  {backups.length} / {scheduleConfig?.retention ?? 7} limit
                </span>
              </div>
            </div>

            {scheduleConfig?.lastError && (
              <div className="text-rose-400 text-[11px] font-mono">
                Error: {scheduleConfig.lastError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 bg-[#121212] border-b border-[#1F1F1F] flex items-center justify-between">
          <h3 className="font-serif-luxury font-medium text-xs text-[#E5E5E0] uppercase tracking-[0.18em]">
            Available System Snapshots ({backups.length})
          </h3>
          <button
            onClick={fetchBackupsAndSchedule}
            className="p-1 text-[#777777] hover:text-[#C5A059] rounded transition cursor-pointer"
            title="Refresh backups list"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C5A059]' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-b border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Snapshot Identifier</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Archive Size</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#555555]">
                    Scanning backup storage directory...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#555555]">
                    No backup files found. Click "Create Snapshot" above to generate an initial archive.
                  </td>
                </tr>
              ) : (
                backups.map((b) => {
                  const isAuto = b.filename.includes('brightcyber-auto-');
                  const isEmergency = b.filename.includes('brightcyber-emergency-');
                  const isPreV2 = b.filename.includes('brightcyber-pre-v2-');

                  return (
                    <tr key={b.filename} className="hover:bg-[#141414] transition">
                      <td className="py-3 px-4 font-mono font-semibold text-[#C5A059] text-[11px]">
                        {b.filename}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold border ${
                            isEmergency
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : isAuto
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                              : isPreV2
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : 'bg-[#181818] text-[#AAAAAA] border-[#262626]'
                          }`}
                        >
                          {isEmergency ? 'Emergency Pre-Restore' : isAuto ? 'Automated Scheduled' : isPreV2 ? 'Pre-Upgrade' : 'Manual Snapshot'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#888888]">
                        {(b.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4 text-[#AAAAAA] font-mono text-[11px]">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadBackup(b.filename)}
                            className="px-2.5 py-1 bg-[#141414] hover:bg-[#1A1A1A] text-[#E5E5E0] text-[10px] uppercase tracking-wider font-semibold rounded border border-[#262626] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-[#C5A059]" /> Download
                          </button>
                          <button
                            disabled={restoringFile === b.filename}
                            onClick={() => setRestoreModalFile(b.filename)}
                            className="px-2.5 py-1 bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 text-[10px] uppercase tracking-wider font-semibold rounded border border-amber-800/40 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${restoringFile === b.filename ? 'animate-spin' : ''}`} />
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTORE DATABASE CONFIRMATION MODAL */}
      {restoreModalFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0E0E0E] border border-rose-900/60 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-serif-luxury font-medium text-sm uppercase tracking-wider text-rose-300">
                  Confirm Database Restoration
                </h3>
              </div>
              <button
                onClick={() => setRestoreModalFile(null)}
                className="text-[#777777] hover:text-[#E5E5E0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#AAAAAA]">
              <p>
                You are about to restore the POS database from snapshot:
              </p>
              <div className="p-2.5 bg-[#141414] rounded border border-[#262626] font-mono text-[#C5A059] break-all">
                {restoreModalFile}
              </div>
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded text-amber-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> Automatic Safety Protocol Active:
                </div>
                <p className="text-[11px] text-amber-300/90">
                  Before overwriting the active database, the system will automatically generate an emergency snapshot (
                  <span className="font-mono text-xs">brightcyber-emergency-pre-restore-*.db</span>) so current state can never be lost.
                </p>
              </div>
              <p className="text-[11px] text-[#888888]">
                Restoration will replace tables and records with the state in this snapshot and trigger an automatic application reload.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F1F1F]">
              <button
                onClick={() => setRestoreModalFile(null)}
                className="px-4 py-2 bg-[#141414] hover:bg-[#1A1A1A] text-[#AAAAAA] hover:text-[#E5E5E0] text-xs uppercase tracking-wider font-semibold rounded border border-[#262626] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase tracking-wider font-semibold rounded cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Confirm & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
