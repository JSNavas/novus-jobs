import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { JobLocation } from '../types.js';
import { decideShipping } from './decide.js';

const REMOTE_TS_OFFER = [
  'Buscamos Desarrollador Full Stack con TypeScript, Node.js y React.',
  'Trabajo 100% remoto, podemos contratar desde Venezuela.',
  'Contacto: rrhh@example.com',
].join('\n');

describe('decideShipping', () => {
  it('acepta una oferta remota que encaja con el stack', () => {
    const verdict = decideShipping({ text: REMOTE_TS_OFFER, url: null }, PROFILE);
    assert.equal(verdict.accepted, true);
    assert.equal(verdict.location, JobLocation.Venezuela);
    assert.equal(verdict.stackMatch.includes('TypeScript'), true);
  });

  it('rechaza la oferta que exige inglés avanzado', () => {
    const verdict = decideShipping({ text: `${REMOTE_TS_OFFER}\nSe requiere inglés avanzado (C1).`, url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
    assert.equal(verdict.reason, 'exigen inglés avanzado');
  });

  it('rechaza la oferta presencial fuera de Venezuela', () => {
    const verdict = decideShipping({ text: 'Desarrollador TypeScript, presencial en Madrid, oficina diaria.', url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
  });
});
