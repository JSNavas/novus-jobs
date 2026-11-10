import { JobLocation, JobSeniority, JobStatus, JobVerdict, JudgeStatus, RunStatus, RunTrigger } from '../types.js';

/**
 * Los valores de los enums van a los `CHECK` desde el mismo sitio que el TS:
 * un valor nuevo se añade una vez y la BD lo acepta sin tocar SQL a mano.
 */
function inList<T extends string>(values: Record<string, T>): string {
  return Object.values(values).map((v) => `'${v}'`).join(', ');
}

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
  location_kind    TEXT    NOT NULL CHECK (location_kind IN (${inList(JobLocation)})),
  verdict          TEXT    NOT NULL CHECK (verdict IN (${inList(JobVerdict)})),
  rejection_reason TEXT,
  seniority        TEXT    NOT NULL CHECK (seniority IN (${inList(JobSeniority)})),
  is_aggregator    INTEGER NOT NULL DEFAULT 0 CHECK (is_aggregator IN (0, 1)),
  is_uncertain     INTEGER NOT NULL DEFAULT 0 CHECK (is_uncertain IN (0, 1)),
  stack_match      TEXT    NOT NULL DEFAULT '[]',
  apply_url        TEXT,
  contact_email    TEXT,
  judge_status     TEXT    NOT NULL CHECK (judge_status IN (${inList(JudgeStatus)})),
  status           TEXT    NOT NULL DEFAULT '${JobStatus.New}' CHECK (status IN (${inList(JobStatus)})),
  found_at         TEXT    NOT NULL,
  posted_at        TEXT,
  UNIQUE (source, fingerprint)
);

CREATE INDEX IF NOT EXISTS jobs_found_at ON jobs (found_at DESC);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT    NOT NULL,
  started_at  TEXT    NOT NULL,
  finished_at TEXT,
  status      TEXT    NOT NULL CHECK (status IN (${inList(RunStatus)})),
  trigger     TEXT    NOT NULL CHECK (trigger IN (${inList(RunTrigger)})),
  fetched     INTEGER NOT NULL DEFAULT 0,
  accepted    INTEGER NOT NULL DEFAULT 0,
  rejected    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  -- Sin CHECK a propósito: ver ensureColumn() en database.ts.
  failure     TEXT
);
`;
