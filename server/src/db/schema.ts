import { JobStatus } from '../types.js';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source           TEXT    NOT NULL,
  fingerprint      TEXT    NOT NULL,
  title            TEXT,
  role             TEXT,
  company          TEXT,
  author           TEXT,
  text             TEXT    NOT NULL,
  url              TEXT,
  location         TEXT,
  location_kind    TEXT    NOT NULL,
  verdict          TEXT    NOT NULL,
  rejection_reason TEXT,
  -- El mismo motivo sin idioma: el código de la regla y sus datos, para que la
  -- pantalla lo escriba en el idioma de quien mira. La frase de arriba se queda
  -- porque es la que leen los correos y las ofertas guardadas antes de esto.
  rejection_code   TEXT,
  rejection_params TEXT,
  is_aggregator    INTEGER NOT NULL DEFAULT 0 CHECK (is_aggregator IN (0, 1)),
  is_uncertain     INTEGER NOT NULL DEFAULT 0 CHECK (is_uncertain IN (0, 1)),
  stack_match      TEXT    NOT NULL DEFAULT '[]',
  apply_url        TEXT,
  contact_email    TEXT,
  judge_status     TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT '${JobStatus.New}',
  found_at         TEXT    NOT NULL,
  -- De qué pasada salió. Lo añadía ensureColumn() y por eso faltaba al rehacer
  -- la tabla: una columna que ya es permanente va en el esquema, no en una
  -- migración. ensureColumn() se queda para las bases anteriores a esto.
  run_id           INTEGER,
  -- Cuándo la publicó la plataforma, no cuándo la leímos nosotros.
  posted_at        TEXT,
  -- Los números de la plataforma. Cambian con los días, así que viven en
  -- columnas y no en el texto: el texto es lo que la huella deduplica.
  applications     INTEGER,
  response_days_min INTEGER,
  response_days_max INTEGER,
  UNIQUE (source, fingerprint)
);

CREATE INDEX IF NOT EXISTS jobs_found_at ON jobs (found_at DESC);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT    NOT NULL,
  started_at  TEXT    NOT NULL,
  finished_at TEXT,
  status      TEXT    NOT NULL,
  trigger     TEXT    NOT NULL,
  fetched     INTEGER NOT NULL DEFAULT 0,
  accepted    INTEGER NOT NULL DEFAULT 0,
  rejected    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  -- Sin CHECK a propósito: ver ensureColumn() en database.ts.
  failure     TEXT
);

-- Lo que el usuario puede cambiar sin tocar código ni reiniciar nada. Clave y
-- valor, y no una columna por ajuste: añadir uno no debe pedir una migración.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
