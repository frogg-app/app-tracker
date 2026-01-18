import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

let db: Database.Database | null = null;

export async function initDatabase(): Promise<Database.Database> {
  // Ensure data directory exists
  const dir = dirname(config.database.path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(config.database.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  logger.info('Database initialized', { path: config.database.path });
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

function runMigrations(db: Database.Database): void {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    {
      name: '001_initial',
      sql: `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Agents table
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          hostname TEXT,
          ip_address TEXT,
          token_hash TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          last_seen_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Audit log table
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          user_id TEXT,
          agent_id TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          details TEXT,
          ip_address TEXT
        );

        -- Metrics snapshots (for demo/historical data)
        CREATE TABLE IF NOT EXISTS metrics_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          data TEXT NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_agent_timestamp ON metrics_snapshots(agent_id, timestamp);
      `,
    },
    {
      name: '002_api_tokens',
      sql: `
        CREATE TABLE IF NOT EXISTS api_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          scopes TEXT NOT NULL DEFAULT '[]',
          expires_at TEXT,
          last_used_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
      `,
    },
  ];

  const applied = new Set(
    (db.prepare('SELECT name FROM migrations').all() as Array<{ name: string }>).map((r) => r.name)
  );

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    logger.info('Running migration', { name: migration.name });
    db.exec(migration.sql);
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
  }
}
