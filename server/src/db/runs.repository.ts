import { RunStatus, RunTrigger, type RunInfo } from '../types.js';
import type { Db } from './database.js';

interface RunRow {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  fetched: number;
  accepted: number;
  rejected: number;
  error: string | null;
}

function toRun(row: RunRow): RunInfo {
  return {
    id: row.id,
    source: row.source,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    fetched: row.fetched,
    accepted: row.accepted,
    rejected: row.rejected,
    error: row.error,
  };
}

export interface RunOutcome {
  fetched: number;
  accepted: number;
  rejected: number;
}

export class RunsRepository {
  constructor(private readonly db: Db) {}

  start(source: string, trigger: RunTrigger): number {
    const result = this.db.prepare(
      'INSERT INTO runs (source, started_at, status, trigger) VALUES (?, ?, ?, ?)',
    ).run(source, new Date().toISOString(), RunStatus.Running, trigger);
    return Number(result.lastInsertRowid);
  }

  finish(id: number, outcome: RunOutcome): void {
    this.db.prepare(
      'UPDATE runs SET finished_at = ?, status = ?, fetched = ?, accepted = ?, rejected = ? WHERE id = ?',
    ).run(new Date().toISOString(), RunStatus.Ok, outcome.fetched, outcome.accepted, outcome.rejected, id);
  }

  fail(id: number, error: string): void {
    this.db.prepare('UPDATE runs SET finished_at = ?, status = ?, error = ? WHERE id = ?')
      .run(new Date().toISOString(), RunStatus.Error, error, id);
  }

  find(id: number): RunInfo | null {
    const row = this.db.prepare<[number], RunRow>("SELECT * FROM runs WHERE id = ?").get(id);
    return row ? toRun(row) : null;
  }

  /** Una pasada que quedó "running" es de un proceso muerto: se cierra al arrancar. */
  failInterrupted(): number {
    const result = this.db.prepare("UPDATE runs SET finished_at = ?, status = ?, error = ? WHERE status = ?")
      .run(new Date().toISOString(), RunStatus.Error, "interrumpida: el servidor se reinició", RunStatus.Running);
    return result.changes;
  }

  /** La última búsqueda manual iniciada, con si leyó publicaciones, para aplicar el límite. */
  lastManual(): { startedAt: string; readPosts: boolean } | null {
    const row = this.db.prepare<[string], { started_at: string; fetched: number }>(
      'SELECT started_at, fetched FROM runs WHERE trigger = ? ORDER BY id DESC LIMIT 1',
    ).get(RunTrigger.Manual);
    return row ? { startedAt: row.started_at, readPosts: row.fetched > 0 } : null;
  }

  latest(): RunInfo | null {
    const row = this.db.prepare<[], RunRow>('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get();
    return row ? toRun(row) : null;
  }

  list(limit: number): RunInfo[] {
    return this.db.prepare<[number], RunRow>('SELECT * FROM runs ORDER BY id DESC LIMIT ?').all(limit).map(toRun);
  }
}
