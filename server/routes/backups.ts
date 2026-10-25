import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { listBackups, createBackup, restoreBackup } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const backupsRouter = Router();

// Admin: List backups
backupsRouter.get('/', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const backups = listBackups();
  res.json({ backups });
});

// Admin: Create backup
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
  const { filename } = req.body;
  if (!filename) {
    res.status(400).json({ error: 'Filename is required for restore operation.' });
    return;
  }

  const safeFilename = path.basename(filename);
  const filepath = path.join(process.cwd(), 'backups', safeFilename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Specified backup file does not exist.' });
    return;
  }

  try {
    await restoreBackup(filepath);

    createAuditLog(
      req.user?.userId || null,
      req.user?.username || 'admin',
      'restore_database',
      'backup',
      safeFilename,
      `Restored database from backup file: ${safeFilename}`
    );

    res.json({ success: true, message: `Database successfully restored from ${safeFilename}.` });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to restore database: ${err.message}` });
  }
});
