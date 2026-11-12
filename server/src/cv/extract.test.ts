import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractFromCv, knownTechnology, vetoesOf } from './extract.js';

const CV = `
Jesús Pérez — Desarrollador Full Stack
Caracas, Venezuela · jesus@example.com

9 años de experiencia en desarrollo de software.
Inglés B1 (en progreso), lectura técnica fluida.

Stack: TypeScript, Node.js, NestJS, React, Next.js, PostgreSQL, Redis, Docker, AWS.
También PHP con Laravel y algo de Python.
Pruebas con Jest y PHPUnit.
`;

describe('extractFromCv', () => {
  it('saca el stack del catálogo y marca como núcleo solo lo que define un oficio', () => {
    const cv = extractFromCv(CV);
    assert.ok(cv.stack.includes('TypeScript'));
    assert.ok(cv.stack.includes('PostgreSQL'));
    assert.ok(cv.core.includes('NestJS'));
    assert.ok(cv.stack.includes('Docker'));
    assert.ok(!cv.core.includes('Docker'), 'Docker nunca es núcleo');
  });

  it('lee el nivel de inglés declarado, sin subirlo', () => {
    assert.equal(extractFromCv(CV).english, 'b1');
  });

  it('deduce el país de la ciudad', () => {
    const cv = extractFromCv(CV);
    assert.equal(cv.country, 'VE');
    assert.equal(cv.city, 'Caracas');
  });

  it('lee los años de experiencia', () => {
    assert.equal(extractFromCv(CV).years, 9);
  });

  it('lo que el CV no dice se queda vacío', () => {
    const vacio = extractFromCv('Desarrollador. Me gusta programar.');
    assert.equal(vacio.english, null);
    assert.equal(vacio.country, null);
    assert.equal(vacio.years, null);
    assert.deepEqual(vacio.stack, []);
    assert.equal(vacio.foundInCv, false);
  });

  it('propone vetar solo los ecosistemas que el CV no toca', () => {
    const propuestos = extractFromCv(CV).suggestedVetoes.map((v) => v.ecosystem);
    assert.ok(propuestos.includes('jvm'));
    assert.ok(propuestos.includes('dotnet'));
    assert.ok(!propuestos.includes('php'), 'el CV trae Laravel: no se propone vetar PHP');
    assert.ok(!propuestos.includes('python'));
    assert.ok(!propuestos.includes('node'));
  });

  it('un ecosistema vetado se traduce a las tecnologías que el filtro mira', () => {
    const vetos = vetoesOf(['jvm']);
    assert.ok(vetos.includes('Java'));
    assert.ok(vetos.includes('Spring'));
    assert.ok(!vetos.includes('TypeScript'));
  });

  it('solo se aceptan tecnologías del catálogo, por su nombre o sus alias', () => {
    assert.equal(knownTechnology('nodejs'), 'Node.js');
    assert.equal(knownTechnology('  TypeScript '), 'TypeScript');
    assert.equal(knownTechnology('MiFrameworkInventado'), null);
  });
});
