import { JobVerdict, RunFailure, RunStatus, RunTrigger, type RunInfo } from '../types.js';
import type { Db } from './database.js';

/**
 * UN CONTADOR SE CUENTA, NO SE RECUERDA.
 *
 * `accepted` y `rejected` existen como columnas de `runs`, pero no se leen de
 * ahí: se cuentan contra `jobs`. En el dashboard esos números son pulsables, y
 * un número guardado puede separarse de lo que hay detrás —pasó: la pasada 7
 * decía «3 aceptadas» y en la tabla había 1, y la 6 decía «23 leídas» sin una
 * sola fila que abrir—. Un contador que al pulsarlo no enseña lo que promete es
 * peor que no poder pulsarlo, así que se calcula de la única fuente que el
 * usuario puede ver. Esto además repara solo el historial ya torcido.
 *
 * `fetched` sí se lee de la columna: cuenta publicaciones LEÍDAS, duplicadas
 * incluidas, y esas no se guardan en `jobs` a propósito. No es pulsable.
 */
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
    const row = this.db.prepare<[number], RunRow>(`SELECT ${RUN_COLUMNS} FROM runs r WHERE r.id = ?`).get(id);
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
  lastManual(source: string): { startedAt: string; status: RunStatus; failure: RunFailure | null } | null {
    const row = this.db.prepare<[string, string], { started_at: string; status: RunStatus; failure: RunFailure | null }>(
      'SELECT started_at, status, failure FROM runs WHERE trigger = ? AND source = ? ORDER BY id DESC LIMIT 1',
    ).get(RunTrigger.Manual, source);
    return row ? { startedAt: row.started_at, status: row.status, failure: row.failure } : null;
  }

  /**
   * Las pasadas que DE VERDAD tocaron la plataforma desde un instante.
   *
   * Una que murió con el perfil ocupado no cuenta: ni se abrió el navegador, ni
   * LinkedIn vio nada. Gastarle presupuesto al señor por una ventana que se
   * dejó abierta sería cobrarle algo que no consumió.
   *
   * Siempre por plataforma: cada una tiene su propio ritmo y su propio
   * presupuesto, y lo leído en una no puede gastar el de la otra.
   */
  countTouchingSince(since: string, source: string, trigger?: RunTrigger): number {
    const base =
      'SELECT COUNT(*) AS n FROM runs WHERE started_at >= ? AND (failure IS NULL OR failure != ?) AND source = ?';
    const sql = trigger ? `${base} AND trigger = ?` : base;
    const params: unknown[] = [since, RunFailure.ProfileBusy, source];
    if (trigger) params.push(trigger);
    const row = this.db.prepare(sql).get(...params) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  /**
   * Cuándo se tocó ESTA plataforma por última vez, sea manual o programada.
   *
   * Por plataforma y no global: el hueco existe para no encadenar dos lecturas
   * seguidas de un mismo sitio, y una consulta a una API abierta no cambia en
   * nada el patrón que ve LinkedIn.
   */
  lastTouchingAt(source: string): string | null {
    const row = this.db.prepare<[string, string], { started_at: string }>(
      'SELECT started_at FROM runs WHERE (failure IS NULL OR failure != ?) AND source = ? ORDER BY id DESC LIMIT 1',
    ).get(RunFailure.ProfileBusy, source);
    return row?.started_at ?? null;
  }

  /** La pasada inmediatamente anterior a `id`. Sirve para no repetir un aviso. */
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

  /**
   * Una PÁGINA del historial, con el total para poder pintar el paginador.
   *
   * El total se consulta aparte y no se deduce de lo devuelto: con 9 filas en
   * una página de 10 no se sabe si hay más detrás, y la única forma de que el
   * paginador no mienta es preguntarlo.
   */
  list(limit: number, offset = 0): { items: RunInfo[]; total: number } {
    const total = this.db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM runs').get()?.count ?? 0;
    const rows = this.db.prepare<[number, number], RunRow>(
      `SELECT ${RUN_COLUMNS} FROM runs r ORDER BY r.id DESC LIMIT ? OFFSET ?`,
    ).all(limit, offset);
    return { items: rows.map(toRun), total };
  }
}
