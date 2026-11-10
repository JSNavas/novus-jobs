import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { PassRunner } from '../runner.js';
import { LastPassStore, Scheduler } from './scheduler.js';

class FakeRunner implements PassRunner {
  busy = false;
  scheduled = 0;

  isBusy(): boolean {
    return this.busy;
  }

  startScheduled(): void {
    this.scheduled++;
  }
}

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

  function schedulerAt(iso: string): Scheduler {
    return new Scheduler({ hours: [9, 13, 18], store, runner, clock: () => new Date(iso) });
  }

  it('lanza una pasada en la franja y deja la marca en disco', () => {
    schedulerAt('2026-11-10T17:20:00Z').tick();
    assert.equal(runner.scheduled, 1);
    assert.deepEqual(store.read(), { date: '2026-11-10', hour: 13 });
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
    assert.equal(store.read(), undefined);
  });

  it('una búsqueda manual cuenta como la pasada de la franja actual', () => {
    schedulerAt('2026-11-10T17:20:00Z').markCurrentSlot();
    schedulerAt('2026-11-10T17:25:00Z').tick();
    assert.equal(runner.scheduled, 0);
  });

  it('LastPassStore devuelve undefined si el fichero no existe o está roto', () => {
    assert.equal(store.read(), undefined);
  });
});
