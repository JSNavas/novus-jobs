import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JobLocation } from '../types.js';
import { findCountry } from './countries.js';
import { classifyLocation } from './location.js';

/**
 * Estas pruebas se escribieron con casos reales de alguien que busca desde
 * Venezuela, así que el hogar del perfil es Venezuela. La regla que miden no es
 * "Venezuela encaja": es "el país del usuario encaja y los demás no".
 */
const HOGAR = { country: findCountry('VE'), city: null };

describe('classifyLocation — región contra modalidad', () => {
  /**
   * EL CASO REAL, 2026-11-10. Llegó al dashboard y no debía: el puesto es en
   * Buenos Aires y en todo el anuncio no aparece la palabra "remoto". "LatAm"
   * describe dónde operan las empresas, no desde dónde se puede trabajar.
   */
  const BUENOS_AIRES = [
    'Hola a todos! buscamos 10 Node.Js con mucha experiencia en fintech.',
    'Backend Engineer · Node.js · Buenos Aires',
    'Estamos buscando backends (node.js) para dos fintechs del ecosistema en LatAm',
  ].join('\n');

  it('una ciudad concreta descarta aunque el texto diga "LatAm"', () => {
    assert.equal(classifyLocation(BUENOS_AIRES, HOGAR), JobLocation.OtherCountry);
  });

  it('"remoto para LATAM" sí vale: Venezuela está dentro', () => {
    assert.equal(
      classifyLocation('Buscamos backend Node.js. 100% remoto para toda LATAM.', HOGAR),
      JobLocation.Global,
    );
  });

  it('"LatAm" a secas no dice la modalidad: queda por confirmar, no se tira', () => {
    // Ante la duda se manda marcada, que es lo contrario de darla por buena.
    assert.equal(
      classifyLocation('Buscamos backend Node.js para una fintech de LatAm.', HOGAR),
      JobLocation.Unknown,
    );
  });

  it('una ciudad SE PERDONA si el anuncio afirma que es remoto', () => {
    // "Oficinas en Bogotá" no es dónde tienes que vivir si el puesto es remoto.
    assert.equal(
      classifyLocation('Backend Node.js, 100% remoto. Nuestras oficinas están en Bogotá.', HOGAR),
      JobLocation.Global,
    );
  });

  it('Venezuela manda sobre cualquier otra señal', () => {
    assert.equal(
      classifyLocation('Remoto desde Venezuela. Oficina en Buenos Aires.', HOGAR),
      JobLocation.HomeCountry,
    );
  });

  it('un remoto restringido a otro país se descarta', () => {
    assert.equal(
      classifyLocation('Desarrollador Node.js, remoto Argentina.', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('lo presencial manda sobre todo lo demás', () => {
    assert.equal(
      classifyLocation('Backend Node.js, presencial. Remoto global no disponible.', HOGAR),
      JobLocation.Onsite,
    );
  });

  it('sin ninguna pista, por confirmar', () => {
    assert.equal(classifyLocation('Buscamos backend Node.js con experiencia.', HOGAR), JobLocation.Unknown);
  });
});
