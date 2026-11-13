import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cardFrom, postTextOf } from './linkedin-jobs.source.js';

const HREF = '/jobs/view/4466802389/?eBP=NOT_CHARGEABLE&refId=abc';

describe('cardFrom', () => {
  it('EL CASO REAL: la tarjeta repite el título porque una copia es para el lector de pantalla', () => {
    const card = cardFrom(
      [
        'Full stack Semi senior - Senior (Caracas)',
        'Full stack Semi senior - Senior (Caracas)',
        'Azkait',
        'Caracas, Distrito Federal, Venezuela (Híbrido)',
      ],
      HREF,
    );
    assert.equal(card?.title, 'Full stack Semi senior - Senior (Caracas)');
    assert.equal(card?.company, 'Azkait');
    assert.equal(card?.place, 'Caracas, Distrito Federal, Venezuela (Híbrido)');
  });

  it('EL CASO REAL: la segunda línea es el título otra vez con «with verification» detrás', () => {
    const card = cardFrom(
      [
        'Senior Software Development Engineer',
        'Senior Software Development Engineer with verification',
        'Adobe',
        'Municipio San Francisco, Estado Zulia',
        'Promocionado',
      ],
      HREF,
    );
    assert.equal(card?.title, 'Senior Software Development Engineer');
    assert.equal(card?.company, 'Adobe', 'si la copia cuenta como línea, la empresa acaba de ubicación');
    assert.equal(card?.place, 'Municipio San Francisco, Estado Zulia');
  });

  it('las insignias de la tarjeta no son datos de la vacante', () => {
    const card = cardFrom(
      ['Nuxt Developer', 'BairesDev', 'Venezuela (En remoto)', 'Promocionado', 'Solicitud sencilla'],
      HREF,
    );
    assert.equal(card?.company, 'BairesDev');
    assert.equal(card?.place, 'Venezuela (En remoto)');
  });

  it('el identificador sale del enlace, no de la posición en la lista', () => {
    assert.equal(cardFrom(['Backend Engineer', 'Acme'], HREF)?.id, '4466802389');
  });

  it('sin identificador no hay vacante: no se puede volver a ella', () => {
    assert.equal(cardFrom(['Backend Engineer'], '/jobs/collections/recommended/'), null);
  });

  it('una tarjeta sin título tampoco, por mucho enlace que tenga', () => {
    assert.equal(cardFrom(['   ', ''], HREF), null);
  });
});

describe('postTextOf', () => {
  const card = { id: '123', title: 'Senior Backend Engineer', company: 'Acme', place: 'Venezuela (En remoto)' };

  it('la modalidad viaja en la línea de ubicación, que es lo que lee el filtro', () => {
    const text = postTextOf(card, 'Buscamos Node.js y TypeScript.');
    assert.match(text, /^Acme busca: Senior Backend Engineer$/m);
    assert.match(text, /^Ubicación: Venezuela \(En remoto\)$/m);
    assert.match(text, /jobs\/view\/123\//);
    assert.match(text, /Node\.js/);
  });

  it('sin empresa el título va solo, antes que escribir "undefined busca:"', () => {
    const text = postTextOf({ ...card, company: '' }, 'Descripción.');
    assert.match(text, /^Senior Backend Engineer$/m);
    assert.ok(!text.includes('busca:'));
  });

  it('sin ubicación no se inventa la línea', () => {
    const text = postTextOf({ ...card, place: '' }, 'Descripción.');
    assert.ok(!text.includes('Ubicación:'));
  });
});
