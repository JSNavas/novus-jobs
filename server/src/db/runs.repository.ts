import { RunFailure, RunStatus, RunTrigger, type RunInfo } from '../types.js';
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

  /**
   * `startedAt` se recibe, no se inventa aquí: el reloj lo pone quien manda
   * —el runner—, que es el mismo con el que luego se calculan los topes. Si
   * cada uno mirara su propia hora, los límites de ritmo se medirían contra un
   * instante distinto del que quedó grabado.
   */
  start(source: string, trigger: RunTrigger, startedAt = new Date().toISOString()): number {
    const result = this.db.prepare(
      'INSERT INTO runs (source, started_at, status, trigger) VALUES (?, ?, ?, ?)',
    ).run(source, startedAt, RunStatus.Running, trigger);
    return Number(result.lastInsertRowid);
  }

  /**
   * Cierra la pasada como buena. `note` existe para la pasada PARCIAL: una
   * plataforma entregó ofertas y otra se cayó. La pasada hizo su trabajo —por
   * eso no es un error— pero el motivo no se tira, porque es lo que el señor
   * necesita ver para arreglar la que falló.
   */
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
    const row = this.db.prepare<[number], RunRow>("SELECT * FROM runs WHERE id = ?").get(id);
    return row ? toRun(row) : null;
  }

  /** Una pasada que quedó "running" es de un proceso muerto: se cierra al arrancar. */
  failInterrupted(): number {
    const result = this.db.prepare("UPDATE runs SET finished_at = ?, status = ?, error = ?, failure = ? WHERE status = ?")
      .run(new Date().toISOString(), RunStatus.Error, "interrumpida: el servidor se reinició", RunFailure.Other, RunStatus.Running);
    return result.changes;
  }

  /**
   * La última búsqueda manual iniciada, con su motivo de fallo si falló.
   *
   * El runner decide con esto cuánto hay que esperar para volver a pulsar el
   * botón, y el motivo es lo que distingue "cierra una ventana y repite" de
   * "no insistas hasta iniciar sesión".
   */
  lastManual(): { startedAt: string; status: RunStatus; failure: RunFailure | null } | null {
    const row = this.db.prepare<[string], { started_at: string; status: RunStatus; failure: RunFailure | null }>(
      'SELECT started_at, status, failure FROM runs WHERE trigger = ? ORDER BY id DESC LIMIT 1',
    ).get(RunTrigger.Manual);
    return row ? { startedAt: row.started_at, status: row.status, failure: row.failure } : null;
  }

  /**
   * Las pasadas que DE VERDAD tocaron la plataforma desde un instante.
   *
   * Una que murió con el perfil ocupado no cuenta: ni se abrió el navegador, ni
   * LinkedIn vio nada. Gastarle presupuesto al señor por una ventana que se
   * dejó abierta sería cobrarle algo que no consumió.
   */
  countTouchingSince(since: string, trigger?: RunTrigger): number {
    const base = "SELECT COUNT(*) AS n FROM runs WHERE started_at >= ? AND (failure IS NULL OR failure != ?)";
    const sql = trigger ? `${base} AND trigger = ?` : base;
    const params: unknown[] = [since, RunFailure.ProfileBusy];
    if (trigger) params.push(trigger);
    const row = this.db.prepare(sql).get(...params) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  /** Cuándo se tocó la plataforma por última vez, sea manual o programada. */
  lastTouchingAt(): string | null {
    const row = this.db.prepare<[string], { started_at: string }>(
      'SELECT started_at FROM runs WHERE failure IS NULL OR failure != ? ORDER BY id DESC LIMIT 1',
    ).get(RunFailure.ProfileBusy);
    return row?.started_at ?? null;
  }

  /** La pasada inmediatamente anterior a `id`. Sirve para no repetir un aviso. */
  previousTo(id: number): RunInfo | null {
    const row = this.db.prepare<[number], RunRow>('SELECT * FROM runs WHERE id < ? ORDER BY id DESC LIMIT 1').get(id);
    return row ? toRun(row) : null;
  }

  latest(): RunInfo | null {
    const row = this.db.prepare<[], RunRow>('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get();
    return row ? toRun(row) : null;
  }

  list(limit: number): RunInfo[] {
    return this.db.prepare<[number], RunRow>('SELECT * FROM runs ORDER BY id DESC LIMIT ?').all(limit).map(toRun);
  }
}
