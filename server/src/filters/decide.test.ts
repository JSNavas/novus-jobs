import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { JobLocation } from '../types.js';
import { decideShipping, type CandidateProfile } from './decide.js';
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
    assert.deepEqual(verdict.rejection, { code: 'reject.english', params: { demanded: 'C1', yours: 'B1' } });
  });

  it('rechaza la oferta presencial fuera de Venezuela', () => {
    const verdict = decideShipping({ text: 'Desarrollador TypeScript, presencial en Madrid, oficina diaria.', url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
  });

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
    const sinCpp = OFERTA_CPP.replace(/C\+\+/g, 'Node.js');
    const verdict = decideShipping({ text: sinCpp, url: null }, PROFILE);
    assert.equal(verdict.accepted, false);
    assert.deepEqual(verdict.rejection, { code: 'reject.english', params: { demanded: 'B2', yours: 'B1' } });
  });

  it('Symfony NO se veta: está en el stack del perfil de ejemplo', () => {
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

describe('decideShipping — the level comes from the profile', () => {
  const JUNIOR: CandidateProfile = { ...PROFILE, experience: { years: 1, filter: true } };
  const decide = (text: string, profile: CandidateProfile = JUNIOR) => decideShipping({ text, url: null }, profile);

  it('a junior does not get the ad that demands five years', () => {
    const verdict = decide(`${REMOTE_TS_OFFER}\n- 5+ years of experience with Node.js`);
    assert.equal(verdict.accepted, false);
    assert.deepEqual(verdict.rejection, { code: 'reject.seniority', params: { demanded: 5, yours: 1 } });
  });

  it('but does get the one that asks a little more than they have: ads overshoot', () => {
    assert.equal(decide(`${REMOTE_TS_OFFER}\nExperiencia: 3 años en desarrollo web`).accepted, true);
  });

  it('a board that states "Senior" is above a junior', () => {
    const verdict = decide(`Acme busca: Desarrollador Full Stack\nNivel: Senior\n${REMOTE_TS_OFFER}`);
    assert.deepEqual(verdict.rejection, { code: 'reject.seniorityLevel', params: { level: 'Senior', yours: 1 } });
  });

  it('"Semi Senior" is within reach of a junior', () => {
    assert.equal(decide(`Acme busca: Desarrollador Full Stack\nNivel: Semi Senior\n${REMOTE_TS_OFFER}`).accepted, true);
  });

  it('nine years: senior roles and long demands pass', () => {
    assert.equal(decide(`${REMOTE_TS_OFFER}\n- 8+ years of experience`, PROFILE).accepted, true);
    assert.equal(decide(`Acme busca: Dev\nNivel: Expert\n${REMOTE_TS_OFFER}`, PROFILE).accepted, true);
  });

  it('a role below your level is not discarded for it', () => {
    assert.equal(decide(`Acme busca: Dev\nNivel: Junior\n${REMOTE_TS_OFFER}`, PROFILE).accepted, true);
  });

  it('with the filter off, or without saying your years, nothing is discarded by level', () => {
    const ad = `${REMOTE_TS_OFFER}\n- 7+ years of experience`;
    assert.equal(decide(ad, { ...PROFILE, experience: { years: 1, filter: false } }).accepted, true);
    assert.equal(decide(ad, { ...PROFILE, experience: { years: null, filter: true } }).accepted, true);
  });

  it('a post with several openings is not judged by one of their levels', () => {
    const ad = `${REMOTE_TS_OFFER}\nTenemos 3 vacantes: junior, semi senior y senior (5+ years of experience).`;
    assert.equal(decide(ad).accepted, true);
  });
});

describe('decideShipping — a QA profile gets QA postings', () => {
  const QA: CandidateProfile = {
    ...PROFILE,
    roles: ['qa'],
    stack: ['Cypress', 'Selenium', 'Playwright', 'Postman', 'JavaScript', 'Java', 'Jira'],
    core: ['Cypress', 'Selenium', 'Playwright', 'Postman'],
    cannotDo: ['C#', '.NET'],
    experience: { years: 3, filter: true },
  };
  const decide = (text: string, profile: CandidateProfile = QA) => decideShipping({ text, url: null }, profile);
  const REMOTE = 'Trabajo 100% remoto, podemos contratar desde Venezuela.';

  it('a QA automation posting with their tools passes', () => {
    const verdict = decide(`Buscamos QA Automation Engineer con Cypress y Postman. ${REMOTE}`);
    assert.equal(verdict.accepted, true);
    assert.ok(verdict.stackMatch.includes('Cypress'));
  });

  it('a QA posting that names none of their tools still reaches them, unconfirmed', () => {
    const verdict = decide(`Se busca QA Engineer para pruebas funcionales. ${REMOTE}`);
    assert.equal(verdict.accepted, true);
    assert.equal(verdict.uncertain, true);
  });

  it('the same postings are not a developer\'s', () => {
    assert.equal(decide(`Se busca QA Engineer para pruebas funcionales. ${REMOTE}`, PROFILE).accepted, false);
  });

  it('a developer posting is not a QA\'s: none of their tools, not their title', () => {
    assert.equal(decide(`Desarrollador Backend con Go y Kafka. ${REMOTE}`).accepted, false);
  });
});
