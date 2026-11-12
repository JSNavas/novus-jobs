import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jobLikeness, MIN_JOB_SCORE } from './joblike.js';

const VACANTES = [
  { id: 1, job_title: 'Senior Backend Engineer', company: { name: 'Acme' }, description: 'x'.repeat(400), salary_range: {}, country: 'Remote' },
  { id: 2, job_title: 'Frontend Engineer', company: { name: 'Beta' }, description: 'y'.repeat(400), salary_range: {}, country: 'Remote' },
];

const HABILIDADES = [{ id: 1, name: 'React' }, { id: 2, name: 'Node.js' }];
const PAISES = [{ id: 1, name: 'Venezuela', code: 'VE' }, { id: 2, name: 'Chile', code: 'CL' }];

describe('jobLikeness', () => {
  it('EL CASO REAL (remotelatinos): la lista de vacantes gana a la de habilidades, que es 50 veces mayor', () => {
    const vacantes = jobLikeness(VACANTES, 'https://api.test/api/v1/posts?take=15');
    const skills = jobLikeness(Array.from({ length: 789 }, () => HABILIDADES[0]), 'https://api.test/api/v1/skills');
    assert.ok(vacantes >= MIN_JOB_SCORE, `las vacantes puntúan ${vacantes}`);
    assert.ok(skills < MIN_JOB_SCORE, `las habilidades puntúan ${skills}`);
    assert.ok(vacantes > skills);
  });

  it('un catálogo de países no entra por mucho que sea una lista de objetos', () => {
    assert.ok(jobLikeness(PAISES, 'https://api.test/api/v1/locations/countries') < MIN_JOB_SCORE);
  });

  it('la dirección por sí sola no basta: hacen falta campos de vacante', () => {
    assert.ok(jobLikeness(HABILIDADES, 'https://api.test/api/v1/jobs') < MIN_JOB_SCORE);
  });

  it('y unos campos de vacante bastan aunque la dirección no diga nada', () => {
    assert.ok(jobLikeness(VACANTES, 'https://api.test/api/v1/data') >= MIN_JOB_SCORE);
  });

  it('una lista vacía o de textos sueltos no puntúa', () => {
    assert.equal(jobLikeness([], 'https://api.test/jobs'), 0);
    assert.equal(jobLikeness(['Backend', 'Frontend'], 'https://api.test/jobs'), 0);
  });
});
