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

/**
 * De qué pasada salió cada oferta guardada ANTES de que existiera `run_id`.
 *
 * Sin esto, el dashboard enseñaría "28 leídas" en una pasada y al pulsarla no
 * habría nada que ver, que es peor que no poder pulsar: parece que las ofertas
 * se perdieron. La pasada se deduce por la hora — una oferta se guarda entre
 * que su pasada empieza y termina — y solo se toca lo que está sin asignar, así
 * que repetirlo no cambia nada.
 */
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

/** Abre (y crea si falta) `jobs.db` dentro del directorio de datos. */
export function openDatabase(dataDir: string): Db {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, 'jobs.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  ensureColumn(db, 'runs', 'failure', 'TEXT');
  ensureColumn(db, 'jobs', 'role', 'TEXT');
  ensureColumn(db, 'jobs', 'run_id', 'INTEGER');
  backfillRunId(db);
  return db;
}
