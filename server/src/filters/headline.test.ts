import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { companyName, jobTitle, offerTitle, stripAuthorHeaders } from './headline.js';

const CON_CABECERA = [
  'Gloria Luz Gaviria Ramírez',
  '• 2o',
  'Asistente  / data entry /Desarollo web /',
  '🚀 ¡Oportunidad laboral en Colombia! 🇨🇴',
  'En CSTI Corp estamos buscando un/a Desarrollador Frontend React.',
  '🎯 Requisitos:',
  'Dominio de React, Next.js y TypeScript.',
  '💼 Modalidad: 100 % remoto.',
].join('\n');

const REPUBLICADA = [
  'Tomas Banegas',
  '• Siguiendo',
  'Talent Partner at @deRecruiters | Scaling tech teams in LATAM, EU & US.',
  'Alan Gosiker',
  '• 2o',
  'Founder - deRecruiters | Delegate your hiring to us',
  'Hola a todos! Con Macarena buscamos 10 Node.Js con mucha experiencia en fintech.',
  'Backend Engineer · Node.js · Buenos Aires',
  'Estamos buscando backends para dos fintechs del ecosistema en LatAm.',
].join('\n');

describe('stripAuthorHeaders', () => {
  it('quita nombre, grado de conexión y titular del autor', () => {
    const ad = stripAuthorHeaders(CON_CABECERA);
    assert.ok(ad.startsWith('🚀 ¡Oportunidad laboral'));
    assert.equal(ad.includes('Gloria Luz'), false);
    assert.equal(ad.includes('data entry'), false);
  });

  it('quita las DOS cabeceras de una republicación', () => {
    const ad = stripAuthorHeaders(REPUBLICADA);
    assert.ok(ad.startsWith('Hola a todos!'));
    assert.equal(ad.includes('Talent Partner'), false);
    assert.equal(ad.includes('Alan Gosiker'), false);
  });

  it('un anuncio sin cabecera se devuelve intacto', () => {
    const plano = 'Buscamos Desarrollador Node.js remoto desde Venezuela con experiencia en NestJS y PostgreSQL.';
    assert.equal(stripAuthorHeaders(plano), plano);
  });

  it('no recorta hasta dejarlo sin anuncio', () => {
    const corto = 'Ana Pérez\n• 2o\nRecruiter | Talent\nBuscamos dev.';
    assert.ok(stripAuthorHeaders(corto).includes('Buscamos dev'));
  });
});

describe('jobTitle', () => {
  it('saca el puesto de la frase "estamos buscando un/a X"', () => {
    assert.equal(jobTitle(stripAuthorHeaders(CON_CABECERA)), 'Desarrollador Frontend React');
  });

  it('reconoce una línea que ES el puesto, con puntos dentro', () => {
    assert.equal(jobTitle(stripAuthorHeaders(REPUBLICADA)), 'Backend Engineer · Node.js · Buenos Aires');
  });

  it('un reguero de etiquetas no es un título', () => {
    assert.equal(jobTitle('#desarrollador #junior #remoto #react'), null);
  });

  it('no devuelve un título cortado que acabe en preposición', () => {
    assert.equal(jobTitle('Me encuentro en la búsqueda de un Analista de'), null);
  });

  it('una frase larga no es un título', () => {
    assert.equal(jobTitle('La gente que más miedo le tiene a la IA suele ser la que menos la ha usado. Y se nota.'), null);
  });

  it('si el anuncio no nombra el puesto, no se inventa', () => {
    assert.equal(jobTitle('Tenemos novedades esta semana en la empresa.'), null);
  });
});

describe('offerTitle', () => {
  it('EL CASO REAL (Puente Talent): un título corto perdía contra nuestra propia línea', () => {
    const anuncio = [
      'GTM Ops',
      'Ubicación: Mexico, Colombia, Brazil, Argentina, Chile, Peru, Venezuela',
      'Postular: https://puentetalent.com/jobs/1',
      '',
      'Buscamos a alguien para operaciones de go-to-market.',
    ].join('\n');
    assert.equal(offerTitle(anuncio), 'GTM Ops', 'el respaldo pedía 12 caracteres y «GTM Ops» tiene 7');
  });

  it('las líneas que escribimos nosotros nunca son el título', () => {
    assert.equal(offerTitle('Bookkeeper\nUbicación: LATAM\nPostular: https://x/2'), 'Bookkeeper');
  });

  it('siempre devuelve algo que ojear: una tarjeta sin título no se puede leer', () => {
    assert.equal(offerTitle('Tenemos novedades esta semana en la empresa.').length > 0, true);
  });

  it('recorta por palabra y lo marca, sin cortar a mitad', () => {
    const title = offerTitle(`${'palabra '.repeat(30)}final`);
    assert.ok(title.endsWith('…'));
    assert.equal(title.includes('palabr…'), false);
  });

  it('no deja nunca una tarjeta en blanco', () => {
    assert.equal(offerTitle(''), 'Publicación sin título');
  });
});

describe('companyName', () => {
  it('saca la empresa de "En X estamos buscando"', () => {
    assert.equal(companyName(stripAuthorHeaders(CON_CABECERA)), 'CSTI Corp');
  });

  it('la arroba solo cuenta tras "at"/"en"/"de"', () => {
    assert.equal(companyName('Ejemplo de Spring:\n@PostMapping("/users")'), null);
    assert.equal(companyName('Talent Partner at @deRecruiters'), 'deRecruiters');
  });

  it('si no se nombra, no se inventa', () => {
    assert.equal(companyName('Buscamos un desarrollador Node.js remoto.'), null);
  });
});
