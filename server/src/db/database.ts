import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from './schema.js';

export type Db = Database.Database;

function ensureColumn(db: Db, table: string, column: string, definition: string): void {
  const columns = db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function backfillRunId(db: Db): void {
  db.exec(`
    UPDATE jobs SET run_id = (
      SELECT r.id FROM runs r
      WHERE r.started_at <= jobs.found_at
        AND jobs.found_at <= COALESCE(r.finished_at, r.started_at)
      ORDER BY r.id DESC LIMIT 1
    ) WHERE run_id IS NULL
  `);
}

const JOB_COLUMNS = [
  'id', 'source', 'fingerprint', 'title', 'role', 'company', 'author', 'text', 'url',
  'location', 'location_kind', 'verdict', 'rejection_reason', 'seniority',
  'is_aggregator', 'is_uncertain', 'stack_match', 'apply_url', 'contact_email',
  'judge_status', 'status', 'found_at', 'posted_at', 'applications',
  'response_days_min', 'response_days_max', 'run_id', 'rejection_code', 'rejection_params',
] as const;

function dropFrozenEnumChecks(db: Db): void {
  const ddl = db.prepare<[], { sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'jobs'",
  ).get()?.sql;
  if (!ddl?.includes("'venezuela'")) return;

  const columns = JOB_COLUMNS.join(', ');
  db.pragma('foreign_keys = OFF');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(SCHEMA.replace(/CREATE TABLE IF NOT EXISTS jobs \(/, 'CREATE TABLE jobs_rebuilt ('));
    db.exec(`INSERT INTO jobs_rebuilt (${columns}) SELECT ${columns} FROM jobs`);
    db.exec('DROP TABLE jobs');
    db.exec('ALTER TABLE jobs_rebuilt RENAME TO jobs');
    db.exec('CREATE INDEX IF NOT EXISTS jobs_found_at ON jobs (found_at DESC)');
    db.exec('COMMIT');
    console.log('[bd] tabla jobs rehecha sin los CHECK de enum congelados');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function renameLegacyHomeLocation(db: Db): void {
  db.exec("UPDATE jobs SET location_kind = 'home_country' WHERE location_kind = 'venezuela'");
}

export function openDatabase(dataDir: string): Db {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, 'jobs.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  ensureColumn(db, 'runs', 'failure', 'TEXT');
  ensureColumn(db, 'jobs', 'role', 'TEXT');
  ensureColumn(db, 'jobs', 'run_id', 'INTEGER');
  ensureColumn(db, 'jobs', 'applications', 'INTEGER');
  ensureColumn(db, 'jobs', 'response_days_min', 'INTEGER');
  ensureColumn(db, 'jobs', 'response_days_max', 'INTEGER');
  ensureColumn(db, 'jobs', 'rejection_code', 'TEXT');
  ensureColumn(db, 'jobs', 'rejection_params', 'TEXT');
  backfillRunId(db);
  dropFrozenEnumChecks(db);
  renameLegacyHomeLocation(db);
  return db;
}
