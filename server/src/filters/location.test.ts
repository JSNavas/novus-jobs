import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JobLocation } from '../types.js';
import { findCountry } from './countries.js';
import { classifyLocation } from './location.js';

const HOGAR = { country: findCountry('VE'), city: null };

describe('classifyLocation — abreviaturas de país', () => {
  // Caso real: oferta 639, «Ingeniero Junior de IA» de Freelanly, 11 nov 2026.
  // Decía «Remoto EE. UU.» y entró a la bandeja como remoto global porque el
  // catálogo solo conocía «estados unidos», «united states», «usa» y «u.s.a.».
  it('«Remoto EE. UU.» es Estados Unidos, no remoto global', () => {
    assert.equal(
      classifyLocation('Ingeniero de IA\n📍 Remoto EE. UU.\nUSD 58/hora', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  for (const forma of ['EE.UU.', 'EEUU', 'EE UU']) {
    it(`«${forma}» también se reconoce`, () => {
      assert.equal(
        classifyLocation(`Ingeniero de IA\n📍 Remoto ${forma}\nUSD 58/hora`, HOGAR),
        JobLocation.OtherCountry,
      );
    });
  }

  it('«Remoto UK» es Reino Unido', () => {
    assert.equal(
      classifyLocation('Backend Node.js, remoto UK.', HOGAR),
      JobLocation.OtherCountry,
    );
  });
});

describe('classifyLocation — región contra modalidad', () => {
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
    assert.equal(
      classifyLocation('Buscamos backend Node.js para una fintech de LatAm.', HOGAR),
      JobLocation.Unknown,
    );
  });

  it('una ciudad SE PERDONA si el anuncio afirma que es remoto', () => {
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
