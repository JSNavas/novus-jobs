import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isCandidateSelfPromotion, looksLikeOffer } from './offer.js';

const HN_OFERTA = [
  'Helmsted busca: Founding AI Engineer | REMOTE | Full-time | $160K–$200K',
  'Hilo: Ask HN: Who is hiring? (November 2026)',
  'Postular: https://news.ycombinator.com/item?id=50341824',
  '',
  'Helmsted is building agents for construction teams. Stack: TypeScript, Node.js and Postgres.',
].join('\n');

const HN_CANDIDATO = [
  "I'm Sushant Gangurde, A Software Engineer focused on Full-Stack Development.",
  'Hilo: Ask HN: Who is hiring? (November 2026)',
  'I work with React, Next.js, TypeScript and Node.js.',
].join('\n');

describe('looksLikeOffer', () => {
  it('EL CASO REAL: 169 de 188 de Hacker News caían por el "Hilo:" que escribimos nosotros', () => {
    assert.equal(looksLikeOffer(HN_OFERTA), true);
  });

  it('una línea nuestra no es prueba contra el anuncio, pero el texto de ellos sí', () => {
    assert.equal(looksLikeOffer('Ubicación: Remoto\nTe enseño a programar en mi curso de Node.js.'), false);
  });
});

describe('isCandidateSelfPromotion', () => {
  it('EL CASO REAL: un candidato presentándose en el hilo de ofertas no es una oferta', () => {
    assert.equal(isCandidateSelfPromotion(HN_CANDIDATO), true);
  });

  it('y quien contrata sí lo es, aunque hable en primera persona', () => {
    assert.equal(isCandidateSelfPromotion("I'm looking for a Senior Backend Engineer to join us."), false);
    assert.equal(isCandidateSelfPromotion('Buscamos un Full-Stack Engineer con Node.js.'), false);
  });
});
