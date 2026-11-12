import { JobVerdict, RunFailure, RunStatus, RunTrigger, type RunInfo } from '../types.js';
import type { Db } from './database.js';

const RUN_COLUMNS = `
  r.id, r.source, r.started_at, r.finished_at, r.status, r.fetched, r.error, r.failure,
  (SELECT COUNT(*) FROM jobs j WHERE j.run_id = r.id AND j.verdict = '${JobVerdict.Accepted}') AS accepted,
  (SELECT COUNT(*) FROM jobs j WHERE j.run_id = r.id AND j.verdict = '${JobVerdict.Rejected}') AS rejected
`;

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
  failure: RunFailure | null;
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
    failure: row.failure,
  };
}

export interface RunOutcome {
  fetched: number;
  accepted: number;
  rejected: number;
}

export class RunsRepository {
  constructor(private readonly db: Db) {}

  start(source: string, trigger: RunTrigger, startedAt = new Date().toISOString()): number {
    const result = this.db.prepare(
      'INSERT INTO runs (source, started_at, status, trigger) VALUES (?, ?, ?, ?)',
    ).run(source, startedAt, RunStatus.Running, trigger);
    return Number(result.lastInsertRowid);
  }

  finish(id: number, outcome: RunOutcome, note: { message: string; failure: RunFailure } | null = null): void {
    this.db.prepare(
      'UPDATE runs SET finished_at = ?, status = ?, fetched = ?, accepted = ?, rejected = ?, error = ?, failure = ? WHERE id = ?',
    ).run(
      new Date().toISOString(), RunStatus.Ok,
      outcome.fetched, outcome.accepted, outcome.rejected,
      note?.message ?? null, note?.failure ?? null, id,
    );
  }

  fail(id: number, error: string, failure: RunFailure): void {
    this.db.prepare('UPDATE runs SET finished_at = ?, status = ?, error = ?, failure = ? WHERE id = ?')
      .run(new Date().toISOString(), RunStatus.Error, error, failure, id);
  }

  find(id: number): RunInfo | null {
    const row = this.db.prepare<[number], RunRow>(`SELECT ${RUN_COLUMNS} FROM runs r WHERE r.id = ?`).get(id);
    return row ? toRun(row) : null;
  }

  failInterrupted(): number {
    const dropped = this.db.prepare(
      'DELETE FROM runs WHERE status = ? AND fetched = 0 AND accepted = 0 AND rejected = 0',
    ).run(RunStatus.Running);
    const result = this.db.prepare("UPDATE runs SET finished_at = ?, status = ?, error = ?, failure = ? WHERE status = ?")
      .run(new Date().toISOString(), RunStatus.Error, "interrumpida: el servidor se reinició", RunFailure.Other, RunStatus.Running);
    return Number(dropped.changes) + Number(result.changes);
  }

  lastManual(source: string): { startedAt: string; status: RunStatus; failure: RunFailure | null } | null {
    const row = this.db.prepare<[string, string], { started_at: string; status: RunStatus; failure: RunFailure | null }>(
      'SELECT started_at, status, failure FROM runs WHERE trigger = ? AND source = ? ORDER BY id DESC LIMIT 1',
    ).get(RunTrigger.Manual, source);
    return row ? { startedAt: row.started_at, status: row.status, failure: row.failure } : null;
  }

  countTouchingSince(since: string, source: string, trigger?: RunTrigger): number {
    const base =
      'SELECT COUNT(*) AS n FROM runs WHERE started_at >= ? AND (failure IS NULL OR failure != ?) AND source = ?';
    const sql = trigger ? `${base} AND trigger = ?` : base;
    const params: unknown[] = [since, RunFailure.ProfileBusy, source];
    if (trigger) params.push(trigger);
    const row = this.db.prepare(sql).get(...params) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  lastTouchingAt(source: string): string | null {
    const row = this.db.prepare<[string, string], { started_at: string }>(
      'SELECT started_at FROM runs WHERE (failure IS NULL OR failure != ?) AND source = ? ORDER BY id DESC LIMIT 1',
    ).get(RunFailure.ProfileBusy, source);
    return row?.started_at ?? null;
  }

  previousTo(id: number): RunInfo | null {
    const row = this.db.prepare<[number], RunRow>(
      `SELECT ${RUN_COLUMNS} FROM runs r WHERE r.id < ? ORDER BY r.id DESC LIMIT 1`,
    ).get(id);
    return row ? toRun(row) : null;
  }

  latest(): RunInfo | null {
    const row = this.db.prepare<[], RunRow>(`SELECT ${RUN_COLUMNS} FROM runs r ORDER BY r.id DESC LIMIT 1`).get();
    return row ? toRun(row) : null;
  }

  list(limit: number, offset = 0, since: string | null = null): { items: RunInfo[]; total: number } {
    const where = since === null ? '' : 'WHERE r.started_at >= ?';
    const filter = since === null ? [] : [since];
    const total = this.db
      .prepare<string[], { count: number }>(`SELECT COUNT(*) AS count FROM runs r ${where}`)
      .get(...filter)?.count ?? 0;
    const rows = this.db.prepare<Array<string | number>, RunRow>(
      `SELECT ${RUN_COLUMNS} FROM runs r ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
    ).all(...filter, limit, offset);
    return { items: rows.map(toRun), total };
  }
}
