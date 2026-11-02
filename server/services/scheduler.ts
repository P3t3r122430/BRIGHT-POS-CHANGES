import { createBackup, pruneOldBackups, listBackups } from '../db/database.js';
import { queryOne, runSql } from '../db/database.js';
import { createAuditLog } from '../auth/jwt.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let isBackupRunning = false;

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // "HH:MM" e.g. "23:00"
  retention: number; // e.g. 7
  lastRun: string | null;
  lastStatus: 'SUCCESS' | 'FAILED' | null;
  lastError: string | null;
  nextScheduledRun: string;
  backupCount: number;
}

export function getBackupScheduleConfig(): BackupScheduleConfig {
  const row = queryOne<any>(`
    SELECT
      auto_backup_enabled,
      auto_backup_frequency,
      auto_backup_time,
      auto_backup_retention,
      auto_backup_last_run,
      auto_backup_last_status,
      auto_backup_last_error
    FROM business_settings
    WHERE id = 1
  `);

  const enabled = row ? row.auto_backup_enabled === 1 : true;
  const frequency = (row?.auto_backup_frequency as 'daily' | 'weekly') || 'daily';
  const time = row?.auto_backup_time || '23:00';
  const retention = Number(row?.auto_backup_retention) || 7;
  const lastRun = row?.auto_backup_last_run || null;
  const lastStatus = row?.auto_backup_last_status || null;
  const lastError = row?.auto_backup_last_error || null;
  const backups = listBackups();

  const nextScheduledRun = calculateNextScheduledRun(frequency, time, lastRun);

  return {
    enabled,
    frequency,
    time,
    retention,
    lastRun,
    lastStatus,
    lastError,
    nextScheduledRun,
    backupCount: backups.length,
  };
}

export function calculateNextScheduledRun(frequency: 'daily' | 'weekly', targetTime: string, lastRun: string | null): string {
  const [hours, minutes] = (targetTime || '23:00').split(':').map(n => parseInt(n, 10) || 0);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    // If today's time has already passed, schedule for tomorrow or next week
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
  }

  return next.toISOString();
}

export async function executeScheduledBackup(trigger: 'scheduled' | 'manual' = 'scheduled'): Promise<{
  success: boolean;
  filename?: string;
  size?: number;
  prunedCount?: number;
  error?: string;
}> {
  if (isBackupRunning) {
    return { success: false, error: 'A backup job is currently in progress.' };
  }

  isBackupRunning = true;
  const now = new Date().toISOString();

  try {
    const config = getBackupScheduleConfig();
    const backup = createBackup('brightcyber-auto-backup');

    // Retention enforcement
    const prunedCount = pruneOldBackups(config.retention);

    // Update business settings record
    runSql(`
      UPDATE business_settings SET
        auto_backup_last_run = ?,
        auto_backup_last_status = 'SUCCESS',
        auto_backup_last_error = NULL
      WHERE id = 1
    `, [now]);

    createAuditLog(
      null,
      trigger === 'scheduled' ? 'system_scheduler' : 'admin',
      'auto_backup',
      'backup',
      backup.filename,
      `Automatic scheduled backup succeeded: ${backup.filename} (${(backup.size / 1024).toFixed(1)} KB). Retained limit: ${config.retention} (pruned ${prunedCount}).`
    );

    return {
      success: true,
      filename: backup.filename,
      size: backup.size,
      prunedCount,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown backup error';
    try {
      runSql(`
        UPDATE business_settings SET
          auto_backup_last_run = ?,
          auto_backup_last_status = 'FAILED',
          auto_backup_last_error = ?
        WHERE id = 1
      `, [now, errorMessage]);

      createAuditLog(
        null,
        'system_scheduler',
        'auto_backup_failed',
        'backup',
        null,
        `Automatic backup failed: ${errorMessage}`
      );
    } catch {}

    return { success: false, error: errorMessage };
  } finally {
    isBackupRunning = false;
  }
}

function checkAndRunScheduler(): void {
  try {
    const config = getBackupScheduleConfig();
    if (!config.enabled) return;

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentHHMM !== config.time) {
      return;
    }

    // Check if we already ran within the last hour
    if (config.lastRun) {
      const lastRunDate = new Date(config.lastRun);
      const diffMs = now.getTime() - lastRunDate.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 55) {
        // Already ran today during this time slot
        return;
      }

      if (config.frequency === 'weekly' && diffMinutes < 60 * 24 * 6) {
        // Weekly frequency has not elapsed 6+ days yet
        return;
      }
    }

    console.log(`[BACKUP SCHEDULER] Triggering scheduled backup at ${currentHHMM}...`);
    executeScheduledBackup('scheduled').catch(e => {
      console.error('[BACKUP SCHEDULER] Error executing scheduled backup:', e);
    });
  } catch (err) {
    console.warn('[BACKUP SCHEDULER] Tick error:', err);
  }
}

export function startBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('[BACKUP SCHEDULER] Starting background backup monitor (60s tick interval)...');
  // Run check every 60 seconds
  schedulerInterval = setInterval(checkAndRunScheduler, 60000);
}

export function stopBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
