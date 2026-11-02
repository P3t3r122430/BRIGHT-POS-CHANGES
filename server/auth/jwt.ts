import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { queryOne, runSql } from '../db/database.js';

// Retrieve or auto-generate cryptographically secure JWT secret (512-bit entropy)
const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, 'jwt.secret');

function getOrInitJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 10) {
    return process.env.JWT_SECRET.trim();
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      const savedSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (savedSecret.length > 10) {
        process.env.JWT_SECRET = savedSecret;
        return savedSecret;
      }
    }
    // Generate persistent secret
    const newSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, newSecret, 'utf8');
    process.env.JWT_SECRET = newSecret;
    return newSecret;
  } catch (e) {
    // Fallback to static secure secret so tokens remain valid across restarts
    const fallback = 'brightcyber-pos-enterprise-secure-jwt-token-secret-key-2026-kenya';
    process.env.JWT_SECRET = fallback;
    return fallback;
  }
}

const jwtSecret = getOrInitJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface TokenPayload {
  userId: number;
  username: string;
  name: string;
  role: 'admin' | 'cashier';
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtSecret as string, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret as string) as TokenPayload;
  } catch (err) {
    return null;
  }
}

// Express Request type augmentation
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please log in.' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
    return;
  }

  // Verify user is still active in database
  const user = queryOne<{ id: number; active: number; role: string; name: string }>(
    'SELECT id, active, role, name FROM users WHERE id = ?',
    [decoded.userId]
  );

  if (!user || user.active !== 1) {
    res.status(403).json({ error: 'Account is deactivated or no longer exists.' });
    return;
  }

  req.user = {
    userId: user.id,
    username: decoded.username,
    name: user.name,
    role: user.role as 'admin' | 'cashier',
  };

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrative privileges required for this action.' });
    return;
  }
  next();
}

export function createAuditLog(
  userId: number | null,
  username: string,
  action: string,
  entityType: string,
  entityId: string | number | null,
  description: string
): void {
  try {
    const now = new Date().toISOString();
    runSql(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, action, entityType, entityId ? String(entityId) : null, description, now]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
