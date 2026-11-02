import { Router, Response } from 'express';
import { z } from 'zod';
import { queryOne, runSql } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, createAuditLog } from '../auth/jwt.js';

export const settingsRouter = Router();

// Get settings
settingsRouter.get('/', authenticateToken, (_req: AuthenticatedRequest, res: Response): void => {
  let settings = queryOne('SELECT * FROM business_settings WHERE id = 1');
  if (!settings) {
    const now = new Date().toISOString();
    runSql(`
      INSERT INTO business_settings (
        id, business_name, address, phone, email, receipt_footer, currency, tax_rate, tax_enabled, low_stock_threshold, receipt_prefix, allow_negative_stock, mpesa_paybill_or_till, services_mpesa_paybill, services_mpesa_account, products_mpesa_paybill, products_mpesa_account, updated_at
      ) VALUES (1, 'BRIGHT CYBER & ICT CENTRE', 'Biashara Street, Nairobi, Kenya', '+254 712 345 678', 'info@brightcyber.co.ke', 'Thank you for choosing Bright Cyber & ICT Centre. Quality ICT Services!', 'KES', 0, 0, 5, 'BC-2026-', 0, 'Services: Paybill 4298298 (Acc: 0350494) | Products: Paybill 247247 (Acc: 768726)', '4298298', '0350494', '247247', '768726', ?)
    `, [now]);
    settings = queryOne('SELECT * FROM business_settings WHERE id = 1');
  }

  res.json({ settings });
});

// Admin: Update settings
settingsRouter.put('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const schema = z.object({
    business_name: z.string().min(2).trim(),
    address: z.string().trim().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal('')).or(z.null()),
    receipt_footer: z.string().trim().nullable().optional(),
    currency: z.string().default('KES'),
    tax_rate: z.number().min(0).max(100).default(0),
    tax_enabled: z.number().min(0).max(1).default(0),
    low_stock_threshold: z.number().int().min(1).default(5),
    receipt_prefix: z.string().default('BC-2026-'),
    allow_negative_stock: z.number().min(0).max(1).default(0),
    default_opening_float: z.number().min(0).default(10000),
    mpesa_paybill_or_till: z.string().trim().nullable().optional(),
    services_mpesa_paybill: z.string().trim().nullable().optional(),
    services_mpesa_account: z.string().trim().nullable().optional(),
    products_mpesa_paybill: z.string().trim().nullable().optional(),
    products_mpesa_account: z.string().trim().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const d = parsed.data;
  const now = new Date().toISOString();

  const servPaybill = d.services_mpesa_paybill || '4298298';
  const servAcc = d.services_mpesa_account || '0350494';
  const prodPaybill = d.products_mpesa_paybill || '247247';
  const prodAcc = d.products_mpesa_account || '768726';
  const combinedMpesa = d.mpesa_paybill_or_till || `Services: Paybill ${servPaybill} (Acc: ${servAcc}) | Products: Paybill ${prodPaybill} (Acc: ${prodAcc})`;

  runSql(`
    UPDATE business_settings SET
      business_name = ?,
      address = ?,
      phone = ?,
      email = ?,
      receipt_footer = ?,
      currency = ?,
      tax_rate = ?,
      tax_enabled = ?,
      low_stock_threshold = ?,
      receipt_prefix = ?,
      allow_negative_stock = ?,
      default_opening_float = ?,
      mpesa_paybill_or_till = ?,
      services_mpesa_paybill = ?,
      services_mpesa_account = ?,
      products_mpesa_paybill = ?,
      products_mpesa_account = ?,
      updated_at = ?
    WHERE id = 1
  `, [
    d.business_name,
    d.address || null,
    d.phone || null,
    d.email || null,
    d.receipt_footer || null,
    d.currency,
    d.tax_rate,
    d.tax_enabled,
    d.low_stock_threshold,
    d.receipt_prefix,
    d.allow_negative_stock,
    d.default_opening_float,
    combinedMpesa,
    servPaybill,
    servAcc,
    prodPaybill,
    prodAcc,
    now,
  ]);

  createAuditLog(
    req.user?.userId || null,
    req.user?.username || 'admin',
    'update_settings',
    'settings',
    1,
    `Admin updated business settings for "${d.business_name}"`
  );

  res.json({ success: true, message: 'Settings updated successfully' });
});
