import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SourceSchedules } from './schedules.js';
import { OPEN_API_POLICY, WATCHED_ACCOUNT_POLICY } from './policy.js';
import type { JobSource } from './types.js';

function fakeSettings(): Pick<ConstructorParameters<typeof SourceSchedules>[0], 'get' | 'set'> {
  const store = new Map<string, string>();
  return {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => { store.set(key, value); },
  };
}

const source = (name: string, policy: JobSource['policy']): JobSource => ({
  name, label: name, endpoint: null, profileId: null, loginUrl: null, policy,
  fetch: async () => [], close: async () => undefined,
});

describe('SourceSchedules', () => {
  it('sin nada guardado manda la política de la fuente', () => {
    const schedules = new SourceSchedules(fakeSettings(), [9, 13, 18]);
    assert.deepEqual(schedules.of(source('linkedin', WATCHED_ACCOUNT_POLICY)), { kind: 'configured-hours' });
    assert.deepEqual(schedules.of(source('getonbrd', OPEN_API_POLICY)), { kind: 'every-minutes', minutes: 60 });
  });

  it('una fuente de franjas se puede pasar a intervalo, y se respeta', () => {
    // Pedido a mano: que LinkedIn se comporte como las demás, cada 6 horas,
    // en vez de las tres franjas fijas. Antes el guardado se ignoraba si no
    // coincidía con la forma de la política, así que no había manera.
    const schedules = new SourceSchedules(fakeSettings(), [9, 13, 18]);
    const linkedin = source('linkedin', WATCHED_ACCOUNT_POLICY);
    schedules.save(linkedin, { kind: 'every-minutes', minutes: 360 });
    assert.deepEqual(schedules.of(linkedin), { kind: 'every-minutes', minutes: 360 });
    assert.deepEqual(schedules.hoursOf(linkedin), []);
  });

  it('y se puede volver a franjas', () => {
    const schedules = new SourceSchedules(fakeSettings(), [9, 13, 18]);
    const linkedin = source('linkedin', WATCHED_ACCOUNT_POLICY);
    schedules.save(linkedin, { kind: 'every-minutes', minutes: 360 });
    schedules.save(linkedin, { kind: 'configured-hours', hours: [8, 20] });
    assert.deepEqual(schedules.hoursOf(linkedin), [8, 20]);
  });
});
