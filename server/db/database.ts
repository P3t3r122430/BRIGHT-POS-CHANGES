import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_FILE = path.join(DATA_DIR, 'brightcyber.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let dbInstance: SqlJsDatabase | null = null;
let SQL: any = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    if (fs.existsSync(wasmPath)) {
      const wasmBinary = fs.readFileSync(wasmPath);
      SQL = await initSqlJs({
        wasmBinary,
        locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
      });
    } else {
      SQL = await initSqlJs({
        locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
      });
    }
  } catch (e) {
    console.error('Failed to initSqlJs with locateFile, trying default:', e);
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
    saveDb();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error persisting SQLite database to disk:', err);
  }
}

// Helper to run query with parameters and return array of objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  let stmt: any;
  try {
    stmt = dbInstance.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    if (stmt) {
      try { stmt.free(); } catch {}
    }
    console.error('SQL queryAll error:', err, 'SQL:', sql, 'params:', params);
    throw err;
  }
}

// Helper to run query and get single object or null
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const list = queryAll<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

let transactionDepth = 0;

// Helper to execute insert/update/delete and auto-save
export function runSql(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  
  // Get last insert ID and changes
  const rowIdRes = dbInstance.exec('SELECT last_insert_rowid() as id;');
  const lastInsertRowid = rowIdRes[0]?.values[0]?.[0] as number || 0;
  
  const changesRes = dbInstance.exec('SELECT changes() as changes;');
  const changes = changesRes[0]?.values[0]?.[0] as number || 0;
  
  if (transactionDepth === 0) {
    saveDb();
  }
  return { changes, lastInsertRowid };
}

// Helper to execute multiple queries in a transaction
export function runTransaction<T>(callback: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  const isTopLevel = transactionDepth === 0;
  if (isTopLevel) {
    dbInstance.run('BEGIN TRANSACTION;');
  }
  transactionDepth++;
  try {
    const result = callback();
    transactionDepth--;
    if (isTopLevel) {
      dbInstance.run('COMMIT;');
      saveDb();
    }
    return result;
  } catch (error) {
    transactionDepth--;
    if (isTopLevel) {
      try {
        dbInstance.run('ROLLBACK;');
      } catch (rollbackErr) {
        console.warn('Rollback notice:', rollbackErr);
      }
    }
    console.error('Transaction failed:', error);
    throw error;
  }
}

// Create timestamped backup
export function createBackup(): { filename: string; filepath: string; size: number; timestamp: string } {
  if (!dbInstance) throw new Error('Database not initialized');
  saveDb();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `brightcyber-backup-${timestamp}.db`;
  const filepath = path.join(BACKUP_DIR, filename);

  const data = dbInstance.export();
  fs.writeFileSync(filepath, Buffer.from(data));
  const stats = fs.statSync(filepath);

  return {
    filename,
    filepath,
    size: stats.size,
    timestamp: now.toISOString(),
  };
}

// Restore database from a backup file or uploaded buffer
export async function restoreBackup(backupFilePathOrBuffer: string | Buffer): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Pre-backup current database before restoring
  try {
    createBackup();
  } catch (e) {
    console.warn('Could not make pre-restore backup:', e);
  }

  let buffer: Buffer;
  if (typeof backupFilePathOrBuffer === 'string') {
    buffer = fs.readFileSync(backupFilePathOrBuffer);
  } else {
    buffer = backupFilePathOrBuffer;
  }

  if (dbInstance) {
    dbInstance.close();
  }

  dbInstance = new SQL.Database(buffer);
  dbInstance.run('PRAGMA foreign_keys = ON;');
  saveDb();
}

// List all backups
export function listBackups(): Array<{ filename: string; size: number; createdAt: string }> {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
  return files.map(filename => {
    const filePath = path.join(BACKUP_DIR, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
