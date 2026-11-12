import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NewJob } from '../db/jobs.repository.js';
import { JobLocation, JobVerdict, JudgeStatus, RunFailure } from '../types.js';
import { failureMail, headline, offersMail, offersSubject } from './digest.js';

function job(overrides: Partial<NewJob> = {}): NewJob {
  return {
    source: 'linkedin',
    fingerprint: 'fp',
    title: null,
    role: null,
    company: null,
    author: 'Ana Pérez',
    text: 'Buscamos\nDesarrollador Full Stack con TypeScript y Node.js, remoto desde Venezuela',
    url: 'https://www.linkedin.com/feed/update/1',
    location: 'Venezuela',
    locationKind: JobLocation.HomeCountry,
    verdict: JobVerdict.Accepted,
    rejectionReason: null,
    isAggregator: false,
    isUncertain: false,
    judgeStatus: JudgeStatus.Skipped,
    stackMatch: ['TypeScript', 'Node.js'],
    applyUrl: null,
    contactEmail: null,
    postedAt: null,
    ...overrides,
  };
}

describe('headline', () => {
  it('coge la primera línea con algo que contar, no la primera a secas', () => {
    assert.equal(headline('Buscamos\nDesarrollador Node.js remoto desde Venezuela'), 'Desarrollador Node.js remoto desde Venezuela');
  });

  it('recorta lo muy largo sin cortar a mitad de palabra el correo', () => {
    const long = headline('x'.repeat(300));
    assert.ok(long.length <= 110);
    assert.ok(long.endsWith('…'));
  });
});

describe('offersMail', () => {
  it('el asunto dice cuántas son, en singular y en plural', () => {
    assert.equal(offersSubject(1, 'es'), '1 oferta nueva para revisar');
    assert.equal(offersSubject(4, 'es'), '4 ofertas nuevas para revisar');
  });

  it('concuerda en singular y en plural, sin "1 oferta que pasan"', () => {
    const una = offersMail([job()], 'http://x/', 'es');
    assert.match(una.html, /Llegó <strong>1 oferta nueva<\/strong> que pasa tus reglas/);
    assert.match(una.text, /^Llegó 1 oferta nueva\./m);
    const varias = offersMail([job(), job()], 'http://x/', 'es');
    assert.match(varias.html, /Llegaron <strong>2 ofertas nuevas<\/strong> que pasan tus reglas/);
  });

  it('lleva al dashboard y resume cada oferta con dónde y con qué encaja', () => {
    const mail = offersMail([job()], 'http://127.0.0.1:47831/', 'es');
    assert.match(mail.text, /Desarrollador Full Stack/);
    assert.match(mail.text, /Venezuela · TypeScript, Node\.js/);
    assert.match(mail.text, /http:\/\/127\.0\.0\.1:47831\//);
    assert.match(mail.html, /Abrir el dashboard/);
  });

  it('con muchas ofertas lista unas pocas y dice cuántas faltan', () => {
    const mail = offersMail(Array.from({ length: 20 }, () => job()), 'http://x/', 'es');
    assert.match(mail.text, /…y 8 más en el dashboard/);
  });

  it('escapa el HTML del texto de la oferta', () => {
    const mail = offersMail([job({ text: 'Buscamos\n<script>alert(1)</script> Node.js developer remoto' })], 'http://x/', 'es');
    assert.equal(mail.html.includes('<script>'), false);
    assert.match(mail.html, /&lt;script&gt;/);
  });
});

describe('failureMail', () => {
  it('la sesión caída dice exactamente qué comando correr', () => {
    const mail = failureMail(RunFailure.LoginRequired, 'url: /uas/login', 'http://x/', 'es');
    assert.match(mail.subject, /sesión de LinkedIn caducó/);
    assert.match(mail.text, /npm run login -- linkedin/);
  });

  it('cada motivo tiene su propio asunto y su propio arreglo', () => {
    const subjects = Object.values(RunFailure).map((f) => failureMail(f, 'detalle', 'http://x/', 'es').subject);
    assert.equal(new Set(subjects).size, subjects.length);
  });

  it('el mismo correo sale en inglés si ese es el idioma del perfil', () => {
    const mail = offersMail([job()], 'http://x/', 'en');
    assert.equal(mail.subject, '1 new posting to review');
    assert.match(mail.html, /made it through your profile rules/);
    assert.match(mail.html, /Open the dashboard/);
  });
});
