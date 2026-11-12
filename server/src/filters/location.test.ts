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

  it('EL CASO REAL: un país que el catálogo no conocía ya no pasa por remoto global', () => {
    const oferta = [
      'Praktika busca: Lead DevOps Engineer',
      'Ubicación: Belarus, Moldova, Ukraine, United Arab Emirates',
      'We are hiring for this position to be based in Dubai (UAE) or Eastern Europe.',
    ].join('\n');
    assert.equal(classifyLocation(oferta, HOGAR), JobLocation.OtherCountry);
  });

  it('una línea de ubicación con sitios concretos y ajenos basta, aunque diga remoto el resto', () => {
    assert.equal(
      classifyLocation('Ubicación: Warsaw\nFully remote engineer.', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('pero esa misma línea puede decir que no hay sitio concreto, y entonces es global', () => {
    assert.equal(
      classifyLocation('Ubicación: Anywhere in the World\nHeadquarters: Sweden', HOGAR),
      JobLocation.Global,
    );
  });

  it('nombrar la región de casa pesa más que cuántos países se mencionen de paso', () => {
    const oferta = 'Remoto para LATAM. Tenemos oficinas en Berlin, Tokyo y Lagos.';
    assert.equal(classifyLocation(oferta, HOGAR), JobLocation.Global);
  });

  it('"remoto Colombia" es remoto, pero hay que vivir en Colombia: no sirve', () => {
    assert.equal(classifyLocation('Backend Node.js. Remoto Colombia.', HOGAR), JobLocation.OtherCountry);
  });

  it('"remoto Buenos Aires" tampoco: un remoto atado a una ciudad ajena sigue siendo ajeno', () => {
    assert.equal(
      classifyLocation('Backend Node.js. Remoto desde Buenos Aires.', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('y el sitio concreto del cuerpo manda aunque la cabecera prometa el mundo entero', () => {
    assert.equal(
      classifyLocation('Ubicación: Anywhere in the World\nBackend. Remoto Colombia.', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('una ciudad de casa es casa, aunque no se nombre el país', () => {
    assert.equal(classifyLocation('Remoto desde Caracas.', HOGAR), JobLocation.HomeCountry);
  });

  it('EL CASO REAL (hackernews): "REMOTE (US)" dice remoto y dice dónde, y el dónde manda', () => {
    assert.equal(
      classifyLocation('Sphinx Defense | Software Engineering | Remote (US Only)', HOGAR),
      JobLocation.OtherCountry,
    );
    assert.equal(
      classifyLocation('Opsfleet | AI Engineer | REMOTE (EEA) | Full-time', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('y el sitio se mira antes que el reloj: "(US, East Coast hours)" es un sitio', () => {
    assert.equal(
      classifyLocation('VALIS | Software Engineer | REMOTE (US, East Coast hours)', HOGAR),
      JobLocation.OtherCountry,
    );
    assert.equal(
      classifyLocation('PlantingSpace | Full-time | Remote (EU time zone)', HOGAR),
      JobLocation.OtherCountry,
    );
  });

  it('pero el paréntesis puede no hablar de sitios, y entonces no dice nada', () => {
    assert.equal(
      classifyLocation('BuildQ | Founding Engineer | REMOTE (PT to ET overlap preferred)', HOGAR),
      JobLocation.Global,
    );
    assert.equal(
      classifyLocation('Collabify | Senior Full-Stack Engineer | REMOTE (worldwide)', HOGAR),
      JobLocation.Global,
    );
    assert.equal(classifyLocation('Acme | REMOTE (LATAM) | Full-time', HOGAR), JobLocation.Global);
  });

  it('la restricción tiene que estar junto al país: "revisa" no es "visa"', () => {
    const oferta = 'Remoto global. Hay que revisar el código del equipo. Nuestra matriz está en Sweden.';
    assert.equal(classifyLocation(oferta, HOGAR), JobLocation.Global);
  });
});
