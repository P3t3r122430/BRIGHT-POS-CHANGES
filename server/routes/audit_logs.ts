import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth/jwt.js';

export const auditLogsRouter = Router();

// Admin: Get audit logs with filter and search
auditLogsRouter.get('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const action = req.query.action ? String(req.query.action) : '';
  const entityType = req.query.entity_type ? String(req.query.entity_type) : '';
  const limit = req.query.limit ? Number(req.query.limit) : 100;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  if (entityType) {
    sql += ' AND entity_type = ?';
    params.push(entityType);
  }

  if (search) {
    sql += ' AND (description LIKE ? OR username LIKE ? OR entity_id LIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const logs = queryAll(sql, params);
  res.json({ logs });
});
