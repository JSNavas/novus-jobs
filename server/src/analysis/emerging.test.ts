import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_PROFILE } from '../profile/defaults.js';
import type { Job } from '../types.js';
import { findEmerging } from './emerging.js';

function job(text: string, company = 'Acme'): Job {
  return { company, author: company, text } as unknown as Job;
}

function terms(jobs: readonly Job[], profile = DEFAULT_PROFILE): string[] {
  return findEmerging(jobs, profile).map((e) => e.term);
}

describe('findEmerging', () => {
  it('EL CASO REAL (12 nov 2026): la primera palabra de CADA frase, no solo la de la línea', () => {
    const line = '- Apply. Complete a short screener interview and upload your resume here.';
    const found = terms([job(line), job(line, 'Otra')]);
    assert.ok(!found.includes('Complete'), 'empieza una frase: su mayúscula no es un nombre propio');
    assert.ok(!found.includes('Apply'));
  });

  it('una palabra que en otro sitio va en minúscula es una palabra corriente, no una tecnología', () => {
    const jobs = [
      job('- Run your task against the leading models until the strong ones fail here.\nWe run tests.'),
      job('- Run your task against the leading models until the strong ones fail here.\nYou run it.', 'Otra'),
    ];
    assert.ok(!terms(jobs).includes('Run'));
  });

  it('y por eso una tecnología de verdad sobrevive: nadie la escribe en minúscula', () => {
    const jobs = [
      job('- Deploy AI workloads to Microsoft Azure and containerize the services with care.'),
      job('- Deploy AI workloads to Microsoft Azure and containerize the services with care.', 'Otra'),
    ];
    assert.ok(terms(jobs).includes('Microsoft'));
  });

  it('lo que vetaste no es "qué aprender": el Enfoque dice dónde poner el esfuerzo', () => {
    const line = '- Experience in or desire to learn Rust; you will read systems written in it.';
    const jobs = [job(line), job(line, 'Otra')];
    assert.ok(terms(jobs).includes('Rust'), 'sin vetarlo, asoma');
    assert.ok(!terms(jobs, { ...DEFAULT_PROFILE, cannotDo: ['Rust'] }).includes('Rust'));
  });

  it('con una sola vacante no hay patrón, hay una empresa', () => {
    assert.deepEqual(terms([job('- Deploy AI workloads to Microsoft Azure and containerize services.')]), []);
  });

  it('dos letras no bastan para una palabra capitalizada, pero sí para una sigla', () => {
    const corto = '- No tooling needed beyond the usual, and the RL environments are provided here.';
    const found = terms([job(corto), job(corto, 'Otra')]);
    assert.ok(!found.includes('No'));
    assert.ok(found.includes('RL'));
  });
});
