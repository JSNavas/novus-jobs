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
import { OPEN_API_POLICY, WATCHED_ACCOUNT_POLICY } from './sources/policy.js';
import type { JobSource } from './sources/types.js';
import { RunFailure, RunTrigger } from './types.js';

function fakeSource(name: string, policy: JobSource['policy']): JobSource {
  return {
    name,
    label: name,
    profileId: null,
    loginUrl: null,
    policy,
    async fetch() { return []; },
    async close() {},
  };
}

const LINKEDIN = fakeSource('linkedin', WATCHED_ACCOUNT_POLICY);
const GETONBRD = fakeSource('getonbrd', OPEN_API_POLICY);

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

  afterEach(async () => {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function runner(
    sources: readonly JobSource[] = [LINKEDIN],
    gates: { onboarded?: boolean; enabled?: (source: string) => boolean } = {},
  ): Runner {
    return new Runner({
      sources,
      maxAgeDays: () => 90,
      jobs: new JobsRepository(db),
      runs,
      judge: null,
      profile: () => PROFILE,
      onboarded: () => gates.onboarded ?? true,
      enabled: gates.enabled ?? (() => true),
      timeZone: () => 'America/Caracas',
      mailer: new Mailer(null),
      dashboardUrl: 'http://localhost/',
      clock: () => now,
    });
  }

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
    advance(6 * 60 * 60_000);
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
    pastManual(RunFailure.Layout);
    advance(15 * 60_000);
    assert.match(refusal(() => runner().startManual()), /espera 45 min/);
  });

  it('las pasadas programadas no las limita el suelo manual', () => {
    pastManual(null);
    const r = runner();
    r.startScheduled(['linkedin']);
    assert.equal(runs.list(10).items.filter((x) => x.id === 2).length, 1);
  });

  it('la pasada automática NO bloquea el botón: el suelo manual es lo único que cuenta', () => {
    pastRun(null, RunTrigger.Scheduled);
    advance(60_000);
    assert.ok(runner().startManual().id);
  });

  it('ya no hay presupuesto diario: a la cuarta se puede, si se respetó la hora', () => {
    for (let i = 0; i < 3; i++) pastManual(null);
    advance(61 * 60_000);
    assert.ok(runner().startManual().id);
  });

  it('una manual que murió con el perfil ocupado NO gasta presupuesto', () => {
    for (let i = 0; i < 5; i++) pastManual(RunFailure.ProfileBusy);
    advance(60 * 60_000);
    assert.ok(runner().startManual().id);
  });

  it('el techo diario también para al planificador', () => {
    for (let i = 0; i < 20; i++) pastRun(null, RunTrigger.Scheduled);
    const before = runs.list(50).items.length;
    runner().startScheduled(['linkedin']);
    assert.equal(runs.list(50).items.length, before, 'no debería haber lanzado nada');
  });

  it('EL CASO REAL: con LinkedIn en su hora de espera, Get on Board se busca igual', () => {
    pastRun(null, RunTrigger.Manual);
    const previas = runs.list(50).items.map((r) => r.id);
    const run = runner([LINKEDIN, GETONBRD]).startManual();

    assert.ok(run.id, 'la búsqueda arranca');
    const lanzadas = runs.list(50).items.filter((r) => !previas.includes(r.id)).map((r) => r.source);
    assert.deepEqual(lanzadas, ['getonbrd'], 'solo la que podía: LinkedIn no se toca');
  });

  it('lo leído en Get on Board no gasta el presupuesto de LinkedIn', () => {
    for (let i = 0; i < 5; i++) {
      const id = runs.start('getonbrd', RunTrigger.Manual, now.toISOString());
      runs.finish(id, { fetched: 187, accepted: 29, rejected: 158 });
    }
    advance(60_000);
    const lanzadas = runs.list(50).items.map((r) => r.id);
    runner([LINKEDIN, GETONBRD]).startManual();
    const nuevas = runs.list(50).items.filter((r) => !lanzadas.includes(r.id)).map((r) => r.source);
    assert.deepEqual(nuevas.sort(), ['getonbrd', 'linkedin'], 'LinkedIn tenía su presupuesto intacto');
  });

  it('Get on Board se puede repetir al minuto, que es su suelo', () => {
    const id = runs.start('getonbrd', RunTrigger.Manual, now.toISOString());
    runs.finish(id, { fetched: 187, accepted: 29, rejected: 158 });

    assert.match(refusal(() => runner([GETONBRD]).startManual()), /espera 1 min/);
    advance(61_000);
    assert.ok(runner([GETONBRD]).startManual().id);
  });

  it('si NINGUNA puede, se niega y dice el motivo de cada una', () => {
    pastManual(null);
    const id = runs.start('getonbrd', RunTrigger.Manual, now.toISOString());
    runs.finish(id, { fetched: 1, accepted: 0, rejected: 1 });
    advance(30_000);

    const message = refusal(() => runner([LINKEDIN, GETONBRD]).startManual());
    assert.match(message, /linkedin: /);
    assert.match(message, /getonbrd: /);
  });

  it('cada plataforma deja su propia fila, no una con los nombres pegados', () => {
    runner([LINKEDIN, GETONBRD]).startManual();
    assert.deepEqual(runs.list(10).items.map((r) => r.source).sort(), ['getonbrd', 'linkedin']);
  });

  it('el techo del día se cuenta por día de Venezuela, no por día UTC', () => {
    now = new Date('2026-11-10T20:00:00.000Z');
    for (let i = 0; i < 20; i++) pastRun(null, RunTrigger.Scheduled);
    now = new Date('2026-11-11T01:00:00.000Z');
    assert.match(refusal(() => runner().startManual()), /techo del día/);
    now = new Date('2026-11-11T05:00:00.000Z');
    assert.ok(runner().startManual().id);
  });
});

describe('Runner — cuándo se niega a buscar', () => {
  let dir: string;
  let db: Db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-gates-'));
    db = openDatabase(dir);
  });

  afterEach(async () => {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function runnerWith(gates: { onboarded?: boolean; enabled?: (source: string) => boolean }): Runner {
    return new Runner({
      sources: [LINKEDIN, GETONBRD],
      maxAgeDays: () => 90,
      jobs: new JobsRepository(db),
      runs: new RunsRepository(db),
      judge: null,
      profile: () => PROFILE,
      onboarded: () => gates.onboarded ?? true,
      enabled: gates.enabled ?? (() => true),
      timeZone: () => 'America/Caracas',
      mailer: new Mailer(null),
      dashboardUrl: 'http://localhost/',
    });
  }

  it('sin el alta terminada no busca: sin perfil, descartaría todo lo que encuentre', () => {
    const it0 = runnerWith({ onboarded: false });
    assert.throws(() => it0.startManual(), RunRefusedError);
  });

  it('el planificador tampoco arranca sin alta', () => {
    const it0 = runnerWith({ onboarded: false });
    it0.startScheduled(['linkedin']);
    assert.equal(it0.isBusy(), false);
  });

  it('una plataforma apagada no se lee, aunque el planificador la pida', () => {
    const only = runnerWith({ enabled: (name) => name === 'getonbrd' });
    only.startScheduled(['linkedin']);
    assert.equal(only.isBusy(), false, 'LinkedIn está apagada: no debería haber arrancado nada');
  });

  it('con todas apagadas, el botón dice qué hacer en vez de fallar', () => {
    const none = runnerWith({ enabled: () => false });
    assert.throws(() => none.startManual(), /Integraciones/);
  });
});
