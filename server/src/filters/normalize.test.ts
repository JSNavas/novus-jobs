import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeText } from './normalize.js';
import { looksLikeOffer } from './offer.js';

describe('normalizeText', () => {
  it('convierte las letras matemáticas de LinkedIn en texto de verdad', () => {
    const bold = '🚀 𝗦𝗶 𝗾𝘂𝗶𝗲𝗿𝗲𝘀 𝗮𝘃𝗮𝗻𝘇𝗮𝗿 𝗲𝗻 𝗶𝗻𝗴𝗲𝗻𝗶𝗲𝗿í𝗮 𝗱𝗲 𝗱𝗮𝘁𝗼𝘀';
    assert.equal(normalizeText(bold), '🚀 Si quieres avanzar en ingeniería de datos');
  });

  it('el texto en negrita Unicode ya se puede minusculizar y buscar', () => {
    const bold = '𝗣𝘆𝗦𝗽𝗮𝗿𝗸 𝘆 𝗗𝗮𝘁𝗮𝗯𝗿𝗶𝗰𝗸𝘀';
    assert.equal(bold.toLowerCase().includes('pyspark'), false, 'así estaba el bug');
    assert.equal(normalizeText(bold).toLowerCase().includes('pyspark'), true);
  });

  it('quita los separadores invisibles que pega LinkedIn al final de cada línea', () => {
    assert.equal(normalizeText('Python⁣'), 'Python');
    assert.equal(normalizeText('Node​.js'), 'Node.js');
  });

  it('normaliza comillas y guiones tipográficos', () => {
    assert.equal(normalizeText('“full-stack”'), '"full-stack"');
    assert.equal(normalizeText('e‑mail'), 'e-mail');
  });

  it('no toca los emojis ni los acentos', () => {
    assert.equal(normalizeText('🚀 ingeniería'), '🚀 ingeniería');
  });

  it('EL CASO REAL: el anuncio del curso ya no se cuela como oferta', () => {
    const curso = normalizeText(
      '🚀 𝗦𝗶 𝗾𝘂𝗶𝗲𝗿𝗲𝘀 𝗮𝘃𝗮𝗻𝘇𝗮𝗿 𝗲𝗻 𝗶𝗻𝗴𝗲𝗻𝗶𝗲𝗿í𝗮 𝗱𝗲 𝗱𝗮𝘁𝗼𝘀, 𝗻𝗲𝗰𝗲𝘀𝗶𝘁𝗮𝘀 𝗰𝗼𝗻𝗼𝗰𝗲𝗿 𝗣𝘆𝗦𝗽𝗮𝗿𝗸.⁣\n' +
      'Aquí entran dos herramientas que vale la pena incorporar a tu formación:',
    );
    assert.equal(looksLikeOffer(curso), false);
  });
});
