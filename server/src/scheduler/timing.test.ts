import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextRunAt, shouldRunPass } from './timing.js';

const HOURS = [9, 13, 18];

describe('shouldRunPass (ritmo de ARTIO)', () => {
  it('no toca antes de la primera franja del día', () => {
    assert.equal(shouldRunPass(new Date('2026-11-10T08:30:00Z'), HOURS), undefined);
  });

  it('toca en la franja cuando aún no se ha hecho', () => {
    const slot = shouldRunPass(new Date('2026-11-10T13:05:00Z'), HOURS, { date: '2026-11-10', hour: 9 });
    assert.deepEqual(slot, { date: '2026-11-10', hour: 13, recovered: false });
  });

  it('no repite una franja ya hecha', () => {
    assert.equal(shouldRunPass(new Date('2026-11-10T13:05:00Z'), HOURS, { date: '2026-11-10', hour: 13 }), undefined);
  });

  it('recupera una sola franja perdida, la más tardía', () => {
    const slot = shouldRunPass(new Date('2026-11-10T19:00:00Z'), HOURS, { date: '2026-11-10', hour: 9 });
    assert.deepEqual(slot, { date: '2026-11-10', hour: 18, recovered: true });
    const late = shouldRunPass(new Date('2026-11-10T15:00:00Z'), HOURS, { date: '2026-11-10', hour: 9 });
    assert.deepEqual(late, { date: '2026-11-10', hour: 13, recovered: true });
  });

  it('marca como recuperada una franja que se mira después de su hora', () => {
    const slot = shouldRunPass(new Date('2026-11-10T16:20:00Z'), HOURS, undefined);
    assert.deepEqual(slot, { date: '2026-11-10', hour: 13, recovered: true });
  });

  it('una franja de un día anterior no bloquea la del día nuevo', () => {
    const slot = shouldRunPass(new Date('2026-11-11T13:30:00Z'), HOURS, { date: '2026-11-10', hour: 18 });
    assert.deepEqual(slot, { date: '2026-11-11', hour: 13, recovered: false });
  });
});

describe('nextRunAt (la próxima lectura de verdad)', () => {
  const SOURCES = [
    { name: 'linkedin', schedule: { kind: 'configured-hours' } as const },
    { name: 'getonbrd', schedule: { kind: 'every-minutes', minutes: 30 } as const },
  ];

  it('EL CASO REAL: gana el intervalo de Get on Board, no la franja de LinkedIn', () => {
    // 22:30 UTC = 6:30 pm VET, con Get on Board leído hace 10 minutos.
    const now = new Date('2026-11-11T22:30:00Z');
    const next = nextRunAt(now, HOURS, SOURCES, (source) => (
      source === 'getonbrd' ? Date.parse('2026-11-11T22:20:00Z') : null
    ));
    assert.equal(new Date(next!).toISOString(), '2026-11-11T22:50:00.000Z');
  });

  it('sin fuentes de intervalo, es la franja siguiente', () => {
    const now = new Date('2026-11-11T22:30:00Z');
    const next = nextRunAt(now, HOURS, [SOURCES[0]!], () => null);
    // 9:00 am VET del día siguiente = 13:00 UTC.
    assert.equal(new Date(next!).toISOString(), '2026-11-12T13:00:00.000Z');
  });

  it('una fuente de intervalo que nunca leyó toca ya', () => {
    const now = new Date('2026-11-11T22:30:00Z');
    assert.equal(nextRunAt(now, HOURS, [SOURCES[1]!], () => null), now.getTime());
  });

  it('sin fuentes no hay nada que anunciar', () => {
    assert.equal(nextRunAt(new Date(), HOURS, [], () => null), null);
  });
});
