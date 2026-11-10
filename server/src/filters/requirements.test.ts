import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { englishRequirement, unknownRequiredTech } from './requirements.js';

/**
 * El CV del señor: "inglés B1 en progreso, lectura técnica fluida".
 *
 * Lo que descarta no es que pidan inglés, sino que pidan MÁS del que tiene. Un
 * "inglés A2 (excluyente)" es un requisito que cumple, y tirarlo era perder
 * ofertas buenas sin que nadie se enterase.
 */
describe('englishRequirement', () => {
  const pasa = (t: string) => assert.notEqual(englishRequirement(t), 'required', t);
  const descarta = (t: string) => assert.equal(englishRequirement(t), 'required', t);

  it('un nivel BAJO no descarta, aunque lo marquen como excluyente', () => {
    pasa('✔️ Inglés A2 (excluyente).');
    pasa('Inglés A1 requerido.');
    pasa('Inglés básico obligatorio.');
    pasa('Se requiere inglés de lectura y escritura básica.');
    pasa('Inglés: comprensión lectora técnica, indispensable.');
  });

  it('un nivel ALTO sí descarta: ahí el CV dice "en progreso"', () => {
    descarta('✔️ Inglés Upper Intermediate (B2+), excluyente.');
    descarta('Se requiere inglés avanzado (C1).');
    descarta('Inglés conversacional para reuniones diarias.');
    descarta('Buscamos perfil bilingüe.');
  });

  it('lo marcado como deseable nunca descarta', () => {
    pasa('Inglés deseable, no excluyente.');
    pasa('English is a plus.');
  });

  it('sin mención del idioma no hay nada que juzgar', () => {
    pasa('Buscamos backend Node.js remoto desde Venezuela.');
  });

  it('el "Se valorará" de la viñeta siguiente no cuenta como esta', () => {
    descarta('✔️ Inglés avanzado, excluyente.\n⭐ Se valorará:\n✔️ AWS');
  });
});

describe('unknownRequiredTech', () => {
  const veto = (t: string) => unknownRequiredTech(t, PROFILE.cannotDo);

  it('descarta la tecnología que el anuncio EXIGE', () => {
    assert.match(veto('3+ años de experiencia en desarrollo backend con C++.') ?? '', /c\+\+/);
    assert.match(veto('Buscamos Frontend Angular senior con 5 años.') ?? '', /angular/);
  });

  it('NO veta lo que el CV sí tiene', () => {
    assert.equal(veto('Buscamos desarrollador PHP con Symfony y Doctrine.'), null);
    assert.equal(veto('Python con FastAPI y PostgreSQL.'), null);
    assert.equal(veto('Node.js, Redis y SQL Server.'), null);
  });

  it('no veta lo deseable, ni el menú, ni el legacy del que migran', () => {
    assert.equal(veto('Node.js remoto. Deseable: conocimientos de Go.'), null);
    assert.equal(veto('Backend: Node.js, TypeScript, Python o Go.'), null);
    assert.equal(veto('Node.js para migrar un legacy Java a microservicios.'), null);
  });
});
