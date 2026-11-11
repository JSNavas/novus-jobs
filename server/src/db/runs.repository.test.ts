import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { JobLocation, JobSeniority, JobStatus, JobVerdict, JudgeStatus, RunTrigger } from '../types.js';
import { openDatabase, type Db } from './database.js';
import { RunsRepository } from './runs.repository.js';

/**
 * EL CASO REAL: el historial del 10 de noviembre decía «3 aceptadas» en la
 * pasada 7 cuando en la tabla había 1, y «23 leídas» en la 6 sin una sola fila
 * detrás. Esos números son pulsables en el dashboard, así que se cuentan.
 */
describe('RunsRepository — los contadores se cuentan contra jobs', () => {
  let dir: string;
  let db: Db;
  let runs: RunsRepository;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runs-test-'));
    db = openDatabase(dir);
    runs = new RunsRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  /** Guarda una oferta de la pasada `runId` sin pasar por el pipeline. */
  function addJob(runId: number, verdict: JobVerdict, n: number): void {
    db.prepare(
      `INSERT INTO jobs (source, fingerprint, text, location_kind, verdict, seniority,
        is_aggregator, is_uncertain, stack_match, judge_status, status, found_at, run_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, '[]', ?, ?, ?, ?)`,
    ).run(
      'linkedin', `huella-${runId}-${verdict}-${n}`, 'texto', JobLocation.Global, verdict,
      JobSeniority.Regular, JudgeStatus.Judged, JobStatus.New, '2026-11-10T21:07:02.550Z', runId,
    );
  }

  it('ignora los contadores guardados y cuenta las filas que hay de verdad', () => {
    const id = runs.start('linkedin', RunTrigger.Manual);
    // La pasada se cierra diciendo 3 aceptadas y 20 descartadas...
    runs.finish(id, { fetched: 23, accepted: 3, rejected: 20 });
    // ...pero en la tabla solo hay 1 y 2.
    addJob(id, JobVerdict.Accepted, 1);
    addJob(id, JobVerdict.Rejected, 1);
    addJob(id, JobVerdict.Rejected, 2);

    const run = runs.find(id);
    assert.equal(run?.accepted, 1, 'manda lo que se puede abrir');
    assert.equal(run?.rejected, 2);
    assert.equal(run?.fetched, 23, 'las leídas sí se recuerdan: incluyen duplicadas y no son pulsables');
  });

  it('una pasada sin filas detrás enseña cero, no el número que prometió', () => {
    const id = runs.start('linkedin', RunTrigger.Scheduled);
    runs.finish(id, { fetched: 23, accepted: 2, rejected: 21 });

    const run = runs.find(id);
    assert.equal(run?.accepted, 0);
    assert.equal(run?.rejected, 0);
    assert.equal(run?.fetched, 23);
  });

  it('cuenta igual en el historial, en la última y en la anterior', () => {
    const vieja = runs.start('linkedin', RunTrigger.Scheduled);
    runs.finish(vieja, { fetched: 10, accepted: 9, rejected: 1 });
    addJob(vieja, JobVerdict.Rejected, 1);

    const nueva = runs.start('linkedin', RunTrigger.Manual);
    runs.finish(nueva, { fetched: 10, accepted: 0, rejected: 0 });
    addJob(nueva, JobVerdict.Accepted, 1);

    assert.equal(runs.latest()?.accepted, 1, 'latest()');
    assert.equal(runs.previousTo(nueva)?.rejected, 1, 'previousTo()');

    const page = runs.list(10);
    assert.equal(page.items.find((r) => r.id === vieja)?.rejected, 1, 'list()');
    assert.equal(page.items.find((r) => r.id === vieja)?.accepted, 0, 'list()');
  });
});
