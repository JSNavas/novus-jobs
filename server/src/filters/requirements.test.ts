import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { englishDemand, unknownRequiredTech } from './requirements.js';
import { englishRank, type EnglishLevel } from '../profile/types.js';

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

  it('una lista unida por «y» exige las dos cosas: no es alternativa', () => {
    // Caso real: oferta 639, «Ingeniero Junior de IA» de Freelanly, 11 nov 2026.
    // Entró a la bandeja porque la coma de «Python, Java y fundamentos de la
    // nube» se leyó como «Python O Java», y al reconocer Python se perdonó el
    // veto de Java. Una coma no dice «elige una»; una barra o un «o» sí.
    assert.match(
      veto('Requiere prompt engineering, Python, Java y fundamentos de la nube.') ?? '',
      /java/,
    );
  });

  it('con «o» entre medias sí es alternativa, y se perdona', () => {
    assert.equal(veto('Buscamos experiencia en Python o Java para el backend.'), null);
    assert.equal(veto('Stack: Node.js / Go, elige el que domines.'), null);
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
