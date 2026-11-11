import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { englishDemand, unknownRequiredTech } from './requirements.js';
import { englishRank, type EnglishLevel } from '../profile/types.js';

/**
 * Lo que mide esto no es "¿piden inglés?" sino "¿piden MÁS del que tengo?", y la
 * respuesta depende de quién pregunte: el mismo "inglés B2 excluyente" descarta
 * a quien tiene B1 y no a quien tiene C1. Por eso los casos se escriben contra
 * un nivel concreto y no contra una verdad absoluta.
 *
 * El nivel de referencia es B1 porque es el del perfil de ejemplo, con el que
 * se encontraron estos casos reales.
 */
describe('englishDemand', () => {
  const cierra = (texto: string, mio: EnglishLevel): boolean => {
    const demand = englishDemand(texto);
    return demand.mandatory && englishRank(demand.level) > englishRank(mio);
  };
  const pasa = (t: string) => assert.equal(cierra(t, 'b1'), false, t);
  const descarta = (t: string) => assert.equal(cierra(t, 'b1'), true, t);

  it('un nivel que SÍ se tiene no descarta, aunque lo marquen como excluyente', () => {
    pasa('✔️ Inglés A2 (excluyente).');
    pasa('Inglés A1 requerido.');
    pasa('Inglés básico obligatorio.');
    pasa('Se requiere inglés de lectura y escritura básica.');
    pasa('Inglés: comprensión lectora técnica, indispensable.');
  });

  it('un nivel por encima del propio sí descarta', () => {
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

  /** La misma oferta, otro candidato: con C1 encima, un B2 excluyente ya no cierra. */
  it('el mismo anuncio no descarta a quien tiene más nivel', () => {
    assert.equal(cierra('✔️ Inglés Upper Intermediate (B2+), excluyente.', 'c1'), false);
    assert.equal(cierra('Buscamos perfil bilingüe.', 'native'), false);
  });

  it('pedir inglés sin decir cuánto se toma como nivel de trabajo', () => {
    assert.deepEqual(englishDemand('Se requiere inglés para el día a día.'), { level: 'b2', mandatory: true });
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
