import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { listBackups, createBackup, restoreBackup, pruneOldBackups } from '../db/database.js';
import { runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';
import { getBackupScheduleConfig, executeScheduledBackup } from '../services/scheduler.js';

export const backupsRouter = Router();

// Admin: List backups
backupsRouter.get('/', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const backups = listBackups();
  res.json({ backups });
});

// Admin: Get automated backup schedule configuration & status
backupsRouter.get('/schedule', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const schedule = getBackupScheduleConfig();
  res.json({ schedule, config: schedule });
});

// Admin: Update automated backup schedule configuration
backupsRouter.put('/schedule', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24-hour)'),
    retention: z.number().int().min(1).max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { enabled, frequency, time, retention } = parsed.data;

  runSql(`
    UPDATE business_settings SET
      auto_backup_enabled = ?,
      auto_backup_frequency = ?,
      auto_backup_time = ?,
      auto_backup_retention = ?,
      updated_at = ?
    WHERE id = 1
  `, [enabled ? 1 : 0, frequency, time, retention, new Date().toISOString()]);

  // Prune any excess backups beyond new retention
  const pruned = pruneOldBackups(retention);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_backup_schedule',
    'backup',
    null,
    `Updated automatic backup settings: ${enabled ? 'ENABLED' : 'DISABLED'}, Frequency: ${frequency}, Time: ${time}, Retention: keep last ${retention} backups (pruned ${pruned} old files)`
  );

  const updatedConfig = getBackupScheduleConfig();
  res.json({
    success: true,
    message: 'Backup schedule updated successfully.',
    schedule: updatedConfig,
    config: updatedConfig,
  });
});

// Admin: Trigger scheduled backup now
backupsRouter.post('/trigger-scheduled', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await executeScheduledBackup('manual');
  if (!result.success) {
    res.status(500).json({ error: result.error || 'Failed to execute backup' });
    return;
  }

  res.json({
    success: true,
    message: `Automatic backup successfully created: ${result.filename} (${((result.size || 0) / 1024).toFixed(1)} KB)`,
    backup: result,
    filename: result.filename,
    prunedCount: result.prunedCount ?? 0,
  });
});

// Admin: Create manual backup
backupsRouter.post('/create', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const backup = createBackup();
    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'create_backup',
      'backup',
      backup.filename,
      `Created database backup: ${backup.filename} (${(backup.size / 1024).toFixed(1)} KB)`
    );

    res.status(201).json({
      success: true,
      message: 'Database backup created successfully.',
      backup,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Backup creation failed: ${err.message}` });
  }
});

// Admin: Download backup
backupsRouter.get('/download/:filename', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(process.cwd(), 'backups', filename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Backup file not found.' });
    return;
  }

  res.download(filepath, filename);
});

// Admin: Restore from existing backup file on server
backupsRouter.post('/restore', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { filename, confirmed } = req.body;
  if (!filename) {
    res.status(400).json({ error: 'Filename is required for restore operation.' });
    return;
  }

  if (confirmed !== true) {
    res.status(400).json({ error: 'Explicit confirmation required before restoring database.' });
    return;
  }

  const safeFilename = path.basename(filename);
  const filepath = path.join(process.cwd(), 'backups', safeFilename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Specified backup file does not exist.' });
    return;
  }

  try {
    const restoreResult = await restoreBackup(filepath);

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'restore_database',
      'backup',
      safeFilename,
      `Restored database from ${safeFilename}. Emergency pre-restore snapshot saved: ${restoreResult.emergencyBackup}`
    );

    res.json({
      success: true,
      message: `Database successfully restored from ${safeFilename}.`,
      emergencyBackup: restoreResult.emergencyBackup,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to restore database: ${err.message}` });
  }
});
