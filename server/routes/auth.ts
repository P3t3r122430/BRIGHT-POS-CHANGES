import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { queryOne, runSql } from '../db/database.js';
import { generateToken, authenticateToken, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/login', (req, res): void => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const { username, password } = parseResult.data;

  // Search by username or email
  const user = queryOne<{
    id: number;
    name: string;
    username: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'cashier';
    active: number;
  }>(
    'SELECT * FROM users WHERE (username = ? OR email = ?)',
    [username.trim(), username.trim()]
  );

  console.log('[AUTH] Looking up user:', username.trim(), 'found:', user ? user.username : 'null');
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  if (user.active !== 1) {
    res.status(403).json({ error: 'This user account has been disabled. Please contact the administrator.' });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  console.log('[AUTH] password valid?', isPasswordValid);
  if (!isPasswordValid) {
    createAuditLog(user.id, user.username, 'login_failed', 'auth', user.id, 'Failed login attempt with incorrect password');
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  createAuditLog(user.id, user.username, 'login_success', 'auth', user.id, `User logged in successfully with role ${user.role}`);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = queryOne<{
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    active: number;
  }>(
    'SELECT id, name, username, email, role, active FROM users WHERE id = ?',
    [req.user.userId]
  );

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

authRouter.post('/logout', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user) {
    createAuditLog(req.user.userId, req.user.username, 'logout', 'auth', req.user.userId, 'User logged out');
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

authRouter.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').trim().toLowerCase().nullable().optional(),
    email: z.string().email('Invalid email address'),
    currentPassword: z.string().nullable().optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { name, username: newUsernameRaw, email, currentPassword, newPassword } = parsed.data;

  const currentUser = queryOne<{
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'admin' | 'cashier';
    password_hash: string;
    active: number;
  }>(
    'SELECT id, name, username, email, role, password_hash, active FROM users WHERE id = ?',
    [req.user.userId]
  );

  if (!currentUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const finalUsername = newUsernameRaw ? newUsernameRaw.trim().toLowerCase() : currentUser.username;

  // Check username uniqueness
  if (finalUsername !== currentUser.username) {
    const existingWithUsername = queryOne<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
      [finalUsername, req.user.userId]
    );
    if (existingWithUsername) {
      res.status(400).json({ error: `Username "${finalUsername}" is already taken.` });
      return;
    }
  }

  // Check email uniqueness
  const existingWithEmail = queryOne<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
    [email.trim().toLowerCase(), req.user.userId]
  );
  if (existingWithEmail) {
    res.status(400).json({ error: 'Email is already taken by another account.' });
    return;
  }

  const now = new Date().toISOString();

  if (newPassword && newPassword.trim() !== '') {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to set a new password.' });
      return;
    }
    const isOldCorrect = bcrypt.compareSync(currentPassword, currentUser.password_hash);
    if (!isOldCorrect) {
      res.status(400).json({ error: 'Current password provided is incorrect.' });
      return;
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    runSql(
      'UPDATE users SET name = ?, username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?',
      [name.trim(), finalUsername, email.trim(), newHash, now, req.user.userId]
    );
  } else {
    runSql(
      'UPDATE users SET name = ?, username = ?, email = ?, updated_at = ? WHERE id = ?',
      [name.trim(), finalUsername, email.trim(), now, req.user.userId]
    );
  }

  createAuditLog(
    req.user.userId,
    finalUsername,
    'update_profile',
    'user',
    req.user.userId,
    `User "${finalUsername}" updated personal profile & security credentials`
  );

  const updatedToken = generateToken({
    userId: currentUser.id,
    username: finalUsername,
    name: name.trim(),
    role: currentUser.role,
  });

  res.json({
    success: true,
    message: newPassword ? 'Profile and password updated successfully.' : 'Profile updated successfully.',
    token: updatedToken,
    user: {
      id: currentUser.id,
      name: name.trim(),
      username: finalUsername,
      email: email.trim(),
      role: currentUser.role,
      active: currentUser.active,
    },
  });
});
