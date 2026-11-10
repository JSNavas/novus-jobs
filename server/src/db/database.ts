import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from './schema.js';

export type Db = Database.Database;

/**
 * Añade una columna si la tabla todavía no la tiene.
 *
 * `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que una
 * columna nueva no llega nunca a las bases de datos ya creadas. Y una columna
 * añadida así NO lleva `CHECK`: el `CHECK` de un `CREATE TABLE` viejo se queda
 * congelado en la BD del señor, de modo que un valor nuevo del enum pasaría en
 * una instalación nueva y fallaría en la suya. Los valores los valida el TS, que
 * es el mismo en las dos.
 */
function ensureColumn(db: Db, table: string, column: string, definition: string): void {
  const columns = db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** Abre (y crea si falta) `jobs.db` dentro del directorio de datos. */
export function openDatabase(dataDir: string): Db {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, 'jobs.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  ensureColumn(db, 'runs', 'failure', 'TEXT');
  ensureColumn(db, 'jobs', 'role', 'TEXT');
  return db;
}
