import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localDayStart, nextRunAt, offsetMsAt, shouldRunPass, toLocalTime } from './timing.js';

const HOURS = [9, 13, 18];

const ZONA = 'America/Caracas';

describe('shouldRunPass (las franjas son del reloj del usuario)', () => {
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
    const now = new Date('2026-11-11T22:30:00Z');
    const next = nextRunAt(now, HOURS, SOURCES, (source) => (
      source === 'getonbrd' ? Date.parse('2026-11-11T22:20:00Z') : null
    ), ZONA);
    assert.equal(new Date(next!).toISOString(), '2026-11-11T22:50:00.000Z');
  });

  it('sin fuentes de intervalo, es la franja siguiente', () => {
    const now = new Date('2026-11-11T22:30:00Z');
    const next = nextRunAt(now, HOURS, [SOURCES[0]!], () => null, ZONA);
    assert.equal(new Date(next!).toISOString(), '2026-11-12T13:00:00.000Z');
  });

  it('una fuente de intervalo que nunca leyó toca ya', () => {
    const now = new Date('2026-11-11T22:30:00Z');
    assert.equal(nextRunAt(now, HOURS, [SOURCES[1]!], () => null, ZONA), now.getTime());
  });

  it('sin fuentes no hay nada que anunciar', () => {
    assert.equal(nextRunAt(new Date(), HOURS, [], () => null, ZONA), null);
  });
});

describe('zonas horarias', () => {
  it('la misma hora UTC cae en franjas distintas según dónde viva el usuario', () => {
    const now = new Date('2026-11-11T13:30:00Z');
    assert.equal(shouldRunPass(toLocalTime(now, 'America/Caracas'), HOURS)?.hour, 9);
    assert.equal(shouldRunPass(toLocalTime(now, 'Europe/Madrid'), HOURS)?.hour, 13);
  });

  it('el día del usuario empieza a SU medianoche, no a la de UTC', () => {
    const start = localDayStart(new Date('2026-11-12T02:00:00Z'), 'America/Caracas');
    assert.equal(start.toISOString(), '2026-11-11T04:00:00.000Z');
  });

  it('el horario de verano se respeta: Madrid son +2 en julio y +1 en enero', () => {
    assert.equal(offsetMsAt(new Date('2026-07-15T12:00:00Z'), 'Europe/Madrid'), 2 * 3_600_000);
    assert.equal(offsetMsAt(new Date('2026-01-15T12:00:00Z'), 'Europe/Madrid'), 1 * 3_600_000);
  });

  it('Caracas no tiene horario de verano: siempre -4', () => {
    assert.equal(offsetMsAt(new Date('2026-07-15T12:00:00Z'), 'America/Caracas'), -4 * 3_600_000);
  });
});
