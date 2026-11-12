import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { PassRunner } from '../runner.js';
import { OPEN_API_POLICY, WATCHED_ACCOUNT_POLICY } from '../sources/policy.js';
import type { JobSource } from '../sources/types.js';
import { SourceSchedules } from '../sources/schedules.js';
import { LastPassStore, Scheduler } from './scheduler.js';

class FakeSettings {
  private readonly values = new Map<string, string>();
  get(key: string): string | null { return this.values.get(key) ?? null; }
  set(key: string, value: string): void { this.values.set(key, value); }
}

class FakeRunner implements PassRunner {
  busy = false;
  scheduled = 0;
  launched: string[][] = [];
  last = new Map<string, number>();

  isBusy(): boolean {
    return this.busy;
  }

  startScheduled(sources: readonly string[]): void {
    this.scheduled++;
    this.launched.push([...sources]);
  }

  lastPassAt(source: string): number | null {
    return this.last.get(source) ?? null;
  }
}

function fakeSource(name: string, policy: JobSource['policy']): JobSource {
  return { name, label: name, profileId: null, loginUrl: null, policy } as JobSource;
}

const LINKEDIN = fakeSource('linkedin', WATCHED_ACCOUNT_POLICY);
const GETONBRD = fakeSource('getonbrd', OPEN_API_POLICY);

describe('Scheduler', () => {
  let dir: string;
  let store: LastPassStore;
  let runner: FakeRunner;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scheduler-test-'));
    store = new LastPassStore(join(dir, 'data', 'last-pass.json'));
    runner = new FakeRunner();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function schedulerAt(
    iso: string,
    sources: readonly JobSource[] = [LINKEDIN],
    schedules = new SourceSchedules(new FakeSettings(), [9, 13, 18]),
  ): Scheduler {
    return new Scheduler({ hours: [9, 13, 18], sources, store, runner, schedules, enabled: () => true, timeZone: () => 'America/Caracas', clock: () => new Date(iso) });
  }

  it('lanza una pasada en la franja y deja la marca en disco', () => {
    schedulerAt('2026-11-10T17:20:00Z').tick();
    assert.equal(runner.scheduled, 1);
    assert.deepEqual(store.read('linkedin'), { date: '2026-11-10', hour: 13 });
  });

  it('un segundo tick en la misma franja no lanza nada', () => {
    const scheduler = schedulerAt('2026-11-10T17:30:00Z');
    scheduler.tick();
    scheduler.tick();
    assert.equal(runner.scheduled, 1);
  });

  it('no marca la franja si ya hay un run en curso, para reintentarla en el siguiente tick', () => {
    runner.busy = true;
    schedulerAt('2026-11-10T17:20:00Z').tick();
    assert.equal(runner.scheduled, 0);
    assert.equal(store.read('linkedin'), undefined);
  });

  it('una búsqueda manual cuenta como la pasada de la franja actual', () => {
    schedulerAt('2026-11-10T17:20:00Z').markCurrentSlot();
    schedulerAt('2026-11-10T17:25:00Z').tick();
    assert.equal(runner.scheduled, 0);
  });

  it('mientras se inicia sesión no se lanza nada, y la franja NO se marca', () => {
    const scheduler = schedulerAt('2026-11-10T17:20:00Z');
    scheduler.pauseForLogin();
    scheduler.tick();
    assert.equal(runner.scheduled, 0);
    assert.equal(store.read('linkedin'), undefined);
  });

  it('al reanudar se recupera la franja que se perdió durante el login', () => {
    const scheduler = schedulerAt('2026-11-10T17:20:00Z');
    scheduler.pauseForLogin();
    scheduler.tick();
    scheduler.resume();
    scheduler.tick();
    assert.equal(runner.scheduled, 1);
    assert.deepEqual(store.read('linkedin'), { date: '2026-11-10', hour: 13 });
  });

  it('la pausa caduca sola: un login abandonado no apaga las pasadas para siempre', () => {
    let clock = new Date('2026-11-10T17:20:00Z');
    const scheduler = new Scheduler({
      hours: [9, 13, 18], sources: [LINKEDIN], store, runner, clock: () => clock,
      enabled: () => true, timeZone: () => 'America/Caracas',
      schedules: new SourceSchedules(new FakeSettings(), [9, 13, 18]),
    });
    scheduler.pauseForLogin();
    assert.equal(scheduler.isPaused(), true);
    clock = new Date('2026-11-10T17:50:00Z');
    assert.equal(scheduler.isPaused(), false);
    scheduler.tick();
    assert.equal(runner.scheduled, 1);
  });

  it('LastPassStore devuelve undefined si el fichero no existe o está roto', () => {
    assert.equal(store.read('linkedin'), undefined);
  });

  it('la fuente por intervalo se lanza aunque no sea franja de la otra', () => {
    store.write('linkedin', { date: '2026-11-10', hour: 13 });
    schedulerAt('2026-11-10T19:00:00Z', [LINKEDIN, GETONBRD]).tick();
    assert.deepEqual(runner.launched, [['getonbrd']]);
  });

  it('la de intervalo no se repite antes de su hora, y sí después', () => {
    const now = Date.parse('2026-11-10T19:00:00Z');
    runner.last.set('getonbrd', now - 40 * 60_000);
    schedulerAt('2026-11-10T19:00:00Z', [GETONBRD]).tick();
    assert.equal(runner.scheduled, 0, 'a los 40 min todavía no');

    runner.last.set('getonbrd', now - 61 * 60_000);
    schedulerAt('2026-11-10T19:00:00Z', [GETONBRD]).tick();
    assert.deepEqual(runner.launched, [['getonbrd']]);
  });

  it('EL HORARIO GUARDADO MANDA: 15 min elegidos en Integraciones ganan al defecto de 1 h', () => {
    const settings = new FakeSettings();
    const schedules = new SourceSchedules(settings, [9, 13, 18]);
    schedules.save(GETONBRD, { kind: 'every-minutes', minutes: 15 });
    const now = Date.parse('2026-11-10T19:00:00Z');
    runner.last.set('getonbrd', now - 20 * 60_000);
    schedulerAt('2026-11-10T19:00:00Z', [GETONBRD], schedules).tick();
    assert.deepEqual(runner.launched, [['getonbrd']], 'con el defecto de 1 h no habría tocado');
  });

  it('las franjas guardadas de LinkedIn sustituyen a las del .env', () => {
    const schedules = new SourceSchedules(new FakeSettings(), [9, 13, 18]);
    schedules.save(LINKEDIN, { kind: 'configured-hours', hours: [7] });
    schedulerAt('2026-11-10T11:20:00Z', [LINKEDIN], schedules).tick();
    assert.deepEqual(store.read('linkedin'), { date: '2026-11-10', hour: 7 });
  });

  it('en una franja coinciden las dos y se lanzan en el mismo disparo', () => {
    schedulerAt('2026-11-10T17:20:00Z', [LINKEDIN, GETONBRD]).tick();
    assert.deepEqual(runner.launched, [['linkedin', 'getonbrd']]);
  });

  it('la marca de franja es de cada fuente: la de una no da por hecha la otra', () => {
    const otra = fakeSource('otra', WATCHED_ACCOUNT_POLICY);
    schedulerAt('2026-11-10T17:20:00Z', [LINKEDIN]).tick();
    assert.deepEqual(store.read('linkedin'), { date: '2026-11-10', hour: 13 });
    assert.equal(store.read('otra'), undefined, 'nadie leyó por ella');

    schedulerAt('2026-11-10T17:25:00Z', [LINKEDIN, otra]).tick();
    assert.deepEqual(runner.launched[1], ['otra'], 'solo la que faltaba');
  });

  it('una búsqueda manual NO marca franja para las de intervalo: su reloj es la BD', () => {
    schedulerAt('2026-11-10T17:20:00Z', [LINKEDIN, GETONBRD]).markCurrentSlot();
    assert.deepEqual(store.read('linkedin'), { date: '2026-11-10', hour: 13 });
    assert.equal(store.read('getonbrd'), undefined);
  });

  it('lee el fichero viejo de una sola marca como la de LinkedIn', () => {
    const file = join(dir, 'data', 'last-pass.json');
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(file, JSON.stringify({ date: '2026-11-10', hour: 13 }), 'utf8');

    assert.deepEqual(new LastPassStore(file).read('linkedin'), { date: '2026-11-10', hour: 13 });
  });
});
