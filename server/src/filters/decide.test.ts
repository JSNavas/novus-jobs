import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { JobLocation } from '../types.js';
import { decideShipping } from './decide.js';
import { normalizeText } from './normalize.js';

const REMOTE_TS_OFFER = [
  'Buscamos Desarrollador Full Stack con TypeScript, Node.js y React.',
  'Trabajo 100% remoto, podemos contratar desde Venezuela.',
  'Contacto: rrhh@example.com',
].join('\n');

describe('decideShipping', () => {
  it('acepta una oferta remota que encaja con el stack', () => {
    const verdict = decideShipping({ text: REMOTE_TS_OFFER, url: null }, PROFILE);
    assert.equal(verdict.accepted, true);
    assert.equal(verdict.location, JobLocation.HomeCountry);
    assert.equal(verdict.stackMatch.includes('TypeScript'), true);
  });

  it('rechaza la oferta que exige inglés avanzado', () => {
    const verdict = decideShipping({ text: `${REMOTE_TS_OFFER}\nSe requiere inglés avanzado (C1).`, url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
    assert.equal(verdict.reason, 'exigen inglés C1 y tiene B1');
  });

  it('rechaza la oferta presencial fuera de Venezuela', () => {
    const verdict = decideShipping({ text: 'Desarrollador TypeScript, presencial en Madrid, oficina diaria.', url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
  });

  /**
   * LA OFERTA QUE SE COLÓ. Texto real del feed del 2026-11-10, el que el señor
   * señaló: encaja de sobra por Node/React/TypeScript y aun así no le sirve,
   * porque pide tres años de C++ que no tiene. Y, de propina, un inglés B2
   * marcado como excluyente.
   */
  const OFERTA_CPP = [
    '🚀 ¡Nueva oportunidad laboral! | Sr Fullstack Developer C++ / React / Node.js | LATAM',
    'Buscamos un perfil Senior con sólida experiencia en desarrollo backend con C++.',
    '📍 Ubicación: LATAM.  🏢 Modalidad: 100% remota.',
    '🎯 ¿Qué buscamos?',
    '✔️ 5+ años de experiencia Fullstack con JavaScript/TypeScript, Node.js y React.',
    '✔️ 3+ años de experiencia en desarrollo backend con C++.',
    '✔️ Experiencia con soluciones de caching, como Redis.',
    '✔️ Inglés Upper Intermediate (B2+), excluyente.',
    '⭐ Se valorará:',
    '✔️ Experiencia con plataformas Cloud (AWS o Azure).',
    '✔️ Conocimientos de Docker y Kubernetes.',
  ].join('\n');

  it('rechaza la oferta que exige C++, por mucho que encaje el resto', () => {
    const verdict = decideShipping({ text: OFERTA_CPP, url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
    assert.match(verdict.reason ?? '', /c\+\+/i);
  });

  it('el "Se valorará" de la viñeta siguiente no convierte el inglés excluyente en deseable', () => {
    // Sin el C++ de por medio, el inglés tiene que tumbarla igual: era el
    // segundo motivo, y lo tapaba una ventana que cruzaba de requisito.
    const sinCpp = OFERTA_CPP.replace(/C\+\+/g, 'Node.js');
    const verdict = decideShipping({ text: sinCpp, url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
    assert.equal(verdict.reason, 'exigen inglés B2 y tiene B1');
  });

  it('Symfony NO se veta: el CV dice que lo trabajó en ePayco', () => {
    const verdict = decideShipping({
      text: 'Buscamos desarrollador backend PHP con Symfony y Laravel. 100% remoto desde Venezuela. Enviar CV a rrhh@example.com',
      url: null,
    }, PROFILE);
    assert.equal(verdict.accepted, true);
  });

  it('un anuncio de curso escrito en negrita Unicode no es una oferta', () => {
    const curso = '🚀 𝗦𝗶 𝗾𝘂𝗶𝗲𝗿𝗲𝘀 𝗮𝘃𝗮𝗻𝘇𝗮𝗿 𝗲𝗻 𝗱𝗮𝘁𝗼𝘀, 𝗻𝗲𝗰𝗲𝘀𝗶𝘁𝗮𝘀 𝗣𝘆𝗦𝗽𝗮𝗿𝗸 𝘆 𝗗𝗮𝘁𝗮𝗯𝗿𝗶𝗰𝗸𝘀.\n'
      + 'Dos herramientas que vale la pena incorporar a tu formación, con Python por debajo.';
    const verdict = decideShipping({ text: normalizeText(curso), url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
  });
});
