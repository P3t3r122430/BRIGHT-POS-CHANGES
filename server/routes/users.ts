import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { queryAll, queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const usersRouter = Router();

// Admin: List all staff users
usersRouter.get('/', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  const users = queryAll(`
    SELECT id, name, username, email, role, active, created_at, updated_at,
      (SELECT COUNT(*) FROM sales s WHERE s.cashier_id = users.id) as total_sales_recorded
    FROM users
    ORDER BY role ASC, name ASC
  `);
  res.json({ users });
});

// Admin: Create new user
usersRouter.post('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const rawBody = req.body || {};
  const cleanUsername = (rawBody.username || '').trim().toLowerCase();
  let cleanEmail = (rawBody.email || '').trim().toLowerCase();
  
  if (!cleanEmail && cleanUsername) {
    cleanEmail = `${cleanUsername}@brightcyber.co.ke`;
  }

  const schema = z.object({
    name: z.string().min(2, 'Name is required').trim(),
    username: z.string().min(3, 'Username must be at least 3 characters').trim().toLowerCase(),
    email: z.string().email('Valid email is required').trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'cashier']).default('cashier'),
  });

  const parsed = schema.safeParse({
    name: rawBody.name,
    username: cleanUsername,
    email: cleanEmail,
    password: rawBody.password,
    role: rawBody.role || 'cashier',
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { name, username, email, password, role } = parsed.data;

  // Check unique username and email with specific errors
  const existingUsername = queryOne<{ id: number; name: string }>('SELECT id, name FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  if (existingUsername) {
    res.status(400).json({ error: `Username "${username}" is already assigned to "${existingUsername.name}". Please pick a different username.` });
    return;
  }

  const existingEmail = queryOne<{ id: number; name: string }>('SELECT id, name FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existingEmail) {
    res.status(400).json({ error: `Email address "${email}" is already used by "${existingEmail.name}". Please use a distinct email address.` });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  const result = runSql(`
    INSERT INTO users (name, username, email, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `, [name, username, email, hash, role, now, now]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'create_user',
    'user',
    result.lastInsertRowid,
    `Created new staff account: "${name}" (${username}, Role: ${role})`
  );

  res.status(201).json({
    success: true,
    user: {
      id: result.lastInsertRowid,
      name,
      username,
      email,
      role,
      active: 1,
      created_at: now,
    },
  });
});

// Admin: Update user details
usersRouter.put('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const existing = queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const rawBody = req.body || {};
  const schema = z.object({
    name: z.string().min(2).trim().nullable().optional(),
    username: z.string().min(3).trim().toLowerCase().nullable().optional(),
    email: z.string().email().trim().toLowerCase().nullable().optional(),
    role: z.enum(['admin', 'cashier']).nullable().optional(),
    active: z.number().min(0).max(1).nullable().optional(),
    newPassword: z.string().min(6).nullable().optional(),
    password: z.string().min(6).nullable().optional(),
  });

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;

  // Check username collision with other users
  if (data.username && data.username.toLowerCase() !== existing.username.toLowerCase()) {
    const conflict = queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [data.username, id]);
    if (conflict) {
      res.status(400).json({ error: `Username "${data.username}" is already in use by another user.` });
      return;
    }
  }

  // Check email collision with other users
  if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
    const conflict = queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?', [data.email, id]);
    if (conflict) {
      res.status(400).json({ error: `Email "${data.email}" is already registered to another user.` });
      return;
    }
  }

  const now = new Date().toISOString();

  let passwordHash = existing.password_hash;
  const pwToSet = data.newPassword || data.password;
  if (pwToSet) {
    passwordHash = bcrypt.hashSync(pwToSet, 10);
  }

  runSql(`
    UPDATE users SET
      name = COALESCE(?, name),
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      active = COALESCE(?, active),
      password_hash = ?,
      updated_at = ?
    WHERE id = ?
  `, [
    data.name ?? existing.name,
    data.username ?? existing.username,
    data.email ?? existing.email,
    data.role ?? existing.role,
    data.active !== undefined ? data.active : existing.active,
    passwordHash,
    now,
    id,
  ]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_user',
    'user',
    id,
    `Admin updated user account "${data.username || existing.username}" (${data.role || existing.role}, Active: ${data.active ?? existing.active}${pwToSet ? ', Password Updated' : ''})`
  );

  res.json({ success: true, message: 'User updated successfully' });
});

// Admin: Change password for specific user
usersRouter.put('/:id/password', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  const user = queryOne<any>('SELECT id, username, name FROM users WHERE id = ?', [id]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const rawBody = req.body || {};
  const targetPassword = rawBody.newPassword || rawBody.new_password || rawBody.password;

  if (!targetPassword || typeof targetPassword !== 'string' || targetPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const hash = bcrypt.hashSync(targetPassword, 10);
  const now = new Date().toISOString();

  runSql('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, now, id]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'reset_user_password',
    'user',
    id,
    `Admin changed password for staff user "${user.username}"`
  );

  res.json({ success: true, message: `Password for ${user.username} successfully updated.` });
});

// Admin: Toggle active status / disable user
usersRouter.delete('/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = Number(req.params.id);
  if (id === 1) {
    res.status(400).json({ error: 'Cannot disable primary super administrator account.' });
    return;
  }

  const user = queryOne<any>('SELECT id, username, active FROM users WHERE id = ?', [id]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newActive = user.active === 1 ? 0 : 1;
  const now = new Date().toISOString();

  runSql('UPDATE users SET active = ?, updated_at = ? WHERE id = ?', [newActive, now, id]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'toggle_user_status',
    'user',
    id,
    `Admin ${newActive === 1 ? 'activated' : 'disabled'} user account "${user.username}"`
  );

  res.json({
    success: true,
    active: newActive,
    message: `User ${user.username} has been ${newActive === 1 ? 'activated' : 'disabled'}.`
  });
});
