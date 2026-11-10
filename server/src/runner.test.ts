import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { openDatabase, type Db } from './db/database.js';
import { JobsRepository } from './db/jobs.repository.js';
import { RunsRepository } from './db/runs.repository.js';
import { Mailer } from './notify/mailer.js';
import { PROFILE } from './profile/profile.js';
import { RunRefusedError, Runner } from './runner.js';
import { RunFailure, RunTrigger } from './types.js';

/**
 * EL RITMO ES LA SALUD DE LA CUENTA, así que se prueba.
 *
 * El caso que se colaba antes era el cuarto: una sesión caída lee 0
 * publicaciones, el suelo bajaba a diez minutos "porque no leyó nada", y el
 * botón autorizaba a golpear una pantalla de login indefinidamente.
 */
describe('Runner — suelo de las búsquedas manuales', () => {
  let dir: string;
  let db: Db;
  let runs: RunsRepository;
  let now: Date;

  const T0 = '2026-11-10T12:00:00.000Z';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-test-'));
    db = openDatabase(dir);
    runs = new RunsRepository(db);
    now = new Date(T0);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function runner(): Runner {
    return new Runner({
      sources: [],
      jobs: new JobsRepository(db),
      runs,
      judge: null,
      profile: PROFILE,
      mailer: new Mailer(null),
      dashboardUrl: 'http://localhost/',
      clock: () => now,
    });
  }

  /** Deja registrada una pasada que terminó como dice `failure` (o bien). */
  function pastRun(failure: RunFailure | null, trigger = RunTrigger.Manual): void {
    const id = runs.start('linkedin', trigger, now.toISOString());
    if (failure) runs.fail(id, 'lo que fuera', failure);
    else runs.finish(id, { fetched: 12, accepted: 1, rejected: 11 });
  }

  function pastManual(failure: RunFailure | null): void {
    pastRun(failure, RunTrigger.Manual);
  }

  function advance(ms: number): void {
    now = new Date(Date.parse(T0) + ms);
  }

  function refusal(action: () => unknown): string {
    try {
      action();
    } catch (error) {
      assert.ok(error instanceof RunRefusedError, `esperaba RunRefusedError, llegó ${String(error)}`);
      return error.message;
    }
    return assert.fail('se esperaba que la búsqueda se negara');
  }

  it('la primera búsqueda manual se permite', () => {
    const run = runner().startManual();
    assert.equal(run.id, 1);
  });

  it('una segunda búsqueda a los 10 min se niega y dice cuánto falta', () => {
    pastManual(null);
    advance(10 * 60_000);
    const message = refusal(() => runner().startManual());
    assert.match(message, /espera 50 min/);
  });

  it('pasada una hora se vuelve a permitir', () => {
    pastManual(null);
    advance(61 * 60_000);
    assert.ok(runner().startManual().id);
  });

  it('SIN SESIÓN no se reintenta nunca: se niega y manda a iniciar sesión', () => {
    pastManual(RunFailure.LoginRequired);
    advance(6 * 60 * 60_000); // seis horas después: sigue sin tener sentido
    const message = refusal(() => runner().startManual());
    assert.match(message, /sin sesión/);
    assert.match(message, /npm run login/);
  });

  it('con el PERFIL OCUPADO se puede reintentar a los 5 min: solo hay que cerrar una ventana', () => {
    pastManual(RunFailure.ProfileBusy);
    advance(5 * 60_000 + 1_000);
    assert.ok(runner().startManual().id);
  });

  it('con el perfil ocupado, antes de 5 min todavía se niega', () => {
    pastManual(RunFailure.ProfileBusy);
    advance(60_000);
    assert.match(refusal(() => runner().startManual()), /espera 4 min/);
  });

  it('una pasada vacía POR MAQUETADO no rebaja el suelo', () => {
    // Si lo rebajara, un cambio en el DOM de LinkedIn se traduciría en un
    // navegador golpeando el feed cada pocos minutos sin que nada mejore.
    pastManual(RunFailure.Layout);
    advance(15 * 60_000);
    assert.match(refusal(() => runner().startManual()), /espera 45 min/);
  });

  it('las pasadas programadas no las limita el suelo manual', () => {
    pastManual(null);
    const r = runner();
    r.startScheduled();
    assert.equal(runs.list(10).filter((x) => x.id === 2).length, 1);
  });

  /* ═══ LOS LÍMITES QUE PROTEGEN LA CUENTA ═══
   * Lo que LinkedIn mide no es cuántas veces se pulsa un botón, sino cuántas
   * veces un navegador carga el feed y con qué patrón. Cada uno de estos tapa
   * una forma distinta de parecer un robot. */

  it('no se puede buscar justo después de la pasada automática', () => {
    // Era el agujero del suelo "una por hora": si la última MANUAL fue ayer,
    // pulsar a las 18:01 encadenaba dos cargas con un minuto de diferencia.
    pastRun(null, RunTrigger.Scheduled);
    advance(60_000);
    assert.match(refusal(() => runner().startManual()), /dos lecturas seguidas/);
  });

  it('pasados 20 min de la automática ya se permite', () => {
    pastRun(null, RunTrigger.Scheduled);
    advance(21 * 60_000);
    assert.ok(runner().startManual().id);
  });

  it('el presupuesto diario corta a la cuarta búsqueda a mano', () => {
    for (let i = 0; i < 3; i++) {
      pastManual(null);
      advance((i + 1) * 61 * 60_000);
    }
    advance(10 * 60 * 60_000);
    assert.match(refusal(() => runner().startManual()), /máximo/);
  });

  it('una manual que murió con el perfil ocupado NO gasta presupuesto', () => {
    // Nunca se abrió el navegador: LinkedIn no vio nada que cobrar.
    for (let i = 0; i < 5; i++) pastManual(RunFailure.ProfileBusy);
    advance(60 * 60_000);
    assert.ok(runner().startManual().id);
  });

  it('el techo diario también para al planificador', () => {
    for (let i = 0; i < 8; i++) pastRun(null, RunTrigger.Scheduled);
    const before = runs.list(50).length;
    runner().startScheduled();
    assert.equal(runs.list(50).length, before, 'no debería haber lanzado nada');
  });

  it('el presupuesto se cuenta por día de Venezuela, no por día UTC', () => {
    // A las 20:00 UTC son las 16:00 en Venezuela: sigue siendo el mismo día y
    // el contador NO se ha reiniciado. Con el corte en UTC, la tarde del señor
    // tendría presupuesto doble.
    now = new Date('2026-11-10T20:00:00.000Z');
    for (let i = 0; i < 3; i++) {
      pastManual(null);
      now = new Date(now.getTime() + 61 * 60_000);
    }
    now = new Date('2026-11-11T01:00:00.000Z'); // 21:00 en Venezuela, mismo día
    assert.match(refusal(() => runner().startManual()), /máximo/);
    now = new Date('2026-11-11T05:00:00.000Z'); // 01:00 en Venezuela, día nuevo
    assert.ok(runner().startManual().id);
  });
});
