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
 * congelado en la BD del usuario, de modo que un valor nuevo del enum pasaría en
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

/** Las columnas de `jobs`, en el orden en que se copian al rehacer la tabla. */
const JOB_COLUMNS = [
  'id', 'source', 'fingerprint', 'title', 'role', 'company', 'author', 'text', 'url',
  'location', 'location_kind', 'verdict', 'rejection_reason', 'seniority',
  'is_aggregator', 'is_uncertain', 'stack_match', 'apply_url', 'contact_email',
  'judge_status', 'status', 'found_at', 'posted_at', 'applications',
  'response_days_min', 'response_days_max', 'run_id', 'rejection_code', 'rejection_params',
] as const;

/**
 * Quita de `jobs` los `CHECK` de enum que quedaron congelados.
 *
 * Las bases creadas antes llevan escrita en el DDL la lista de valores de
 * entonces, y SQLite no sabe modificar una restricción: la única forma es
 * rehacer la tabla. Mientras siga ahí, un valor nuevo del enum —`home_country`,
 * `hybrid`— se inserta bien en una instalación nueva y falla en la suya.
 *
 * Se detecta por el valor que delata a las viejas, `'venezuela'`, así que esto
 * corre UNA vez y nunca más. Va en una transacción con las claves ajenas
 * apagadas: a mitad de camino la tabla no existe, y una caída ahí no puede
 * dejar la base sin sus ofertas.
 */
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

/**
 * `location_kind` decía `venezuela` cuando el filtro daba por hecho que el
 * usuario vivía allí. Ahora el valor es `home_country` —"el país del usuario",
 * cualquiera que sea— y hay que renombrar lo ya guardado: si no, las ofertas de
 * antes dejan de encajar en el enum y el dashboard las pinta sin etiqueta.
 *
 * Solo toca las filas con el valor viejo, así que repetirlo no cambia nada.
 */
function renameLegacyHomeLocation(db: Db): void {
  db.exec("UPDATE jobs SET location_kind = 'home_country' WHERE location_kind = 'venezuela'");
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
  ensureColumn(db, 'jobs', 'applications', 'INTEGER');
  ensureColumn(db, 'jobs', 'response_days_min', 'INTEGER');
  ensureColumn(db, 'jobs', 'response_days_max', 'INTEGER');
  ensureColumn(db, 'jobs', 'rejection_code', 'TEXT');
  ensureColumn(db, 'jobs', 'rejection_params', 'TEXT');
  backfillRunId(db);
  // El orden importa: primero caen los CHECK viejos y solo entonces se puede
  // escribir el valor nuevo.
  dropFrozenEnumChecks(db);
  renameLegacyHomeLocation(db);
  return db;
}
