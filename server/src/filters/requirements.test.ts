import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFILE } from '../profile/profile.js';
import { demandedYears, englishDemand, isOtherEcosystem, isOwnRole, statedLevel, unknownRequiredTech } from './requirements.js';
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

describe('englishDemand — lo que de verdad piden', () => {
  it('"intermediate-advanced" es B2, no C1: el "advanced" va pegado al "intermediate"', () => {
    assert.equal(englishDemand('Required: Intermediate-advanced English.').level, 'b2');
    assert.equal(englishDemand('Inglés intermedio-avanzado requerido.').level, 'b2');
  });

  it('"professional English" es B2: nombra el uso, no el nivel', () => {
    assert.equal(englishDemand('Professional English communication skills required.').level, 'b2');
  });

  it('pero "advanced English" sigue siendo C1', () => {
    assert.equal(englishDemand('Advanced English (written and spoken) required.').level, 'c1');
  });
});

describe('unknownRequiredTech', () => {
  const veto = (t: string) => unknownRequiredTech(t, PROFILE.cannotDo, PROFILE.core);

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

  it('EL CASO REAL: 23 de 24 vetos por "go" eran la palabra inglesa, no el lenguaje', () => {
    assert.equal(veto('You think about what can go wrong. Failing dependencies, bad data.'), null);
    assert.equal(veto('Our technology helps Go-To-Market teams build the skills they need.'), null);
    assert.equal(veto('Acts as go-to for go-live off-hours help for clients.'), null);
  });

  it('las demás que también son palabras corrientes: backbone, phoenix, spark, rails', () => {
    assert.equal(veto('Bubbly but with a backbone, who can handle a tough client.'), null);
    assert.equal(veto('NIKSI is a Phoenix, Arizona-based real estate company.'), null);
    assert.equal(veto('Reach out by email to spark interest and generate leads.'), null);
    assert.equal(veto('Third-party financial rails are fundamental to the product.'), null);
  });

  it('pero nombradas como tecnología siguen vetando: lo que decide es la compañía que llevan', () => {
    assert.equal(veto('Senior Full-Stack Engineer (Go + Next.JS). Requisitos del puesto.'), 'go');
    assert.equal(veto('Buscamos un iOS Engineer con Swift y experiencia en apps nativas.'), 'swift');
    assert.equal(veto('Se requiere experiencia desarrollando con Ruby on Rails.'), 'ruby on rails');
  });
});

describe('demandedYears — the years an ad makes mandatory', () => {
  it('reads the common ways of writing it, in English and Spanish', () => {
    assert.equal(demandedYears('Requirements:\n- 5+ years of experience with Node.js'), 5);
    assert.equal(demandedYears('At least 3 years of professional experience.'), 3);
    assert.equal(demandedYears('Mínimo 4 años de experiencia como desarrollador'), 4);
    assert.equal(demandedYears('Buscamos alguien con +2 años de experiencia en React'), 2);
    assert.equal(demandedYears('Experiencia: 3 a 5 años en desarrollo web'), 3, 'a range counts by its floor');
    assert.equal(demandedYears('3-5 years of experience building APIs'), 3);
  });

  it('keeps the highest mandatory demand', () => {
    const ad = '• 2+ years of experience with React\n• 6+ years of experience in software development';
    assert.equal(demandedYears(ad), 6);
  });

  it('desirable years are not demanded', () => {
    assert.equal(demandedYears('5+ years of experience preferred'), null);
    assert.equal(demandedYears('Nice to have: 3+ years of experience with Kubernetes'), null);
    assert.equal(demandedYears('Idealmente 3 años de experiencia en fintech'), null);
  });

  it('a desirable clause does not cancel the mandatory one next to it', () => {
    assert.equal(demandedYears('5 años de experiencia en desarrollo, deseable 2 años con AWS'), 5);
  });

  it('the company talking about itself is not a requirement', () => {
    assert.equal(demandedYears('We have 15 years of experience building fintech products.'), null);
    assert.equal(demandedYears('Somos una empresa con 10 años de experiencia en el mercado'), null);
  });

  it('years without the word experience are not a demand', () => {
    assert.equal(demandedYears('Founded 12 years ago, we are a remote-first team'), null);
    assert.equal(demandedYears('Contrato por 2 años, renovable'), null);
  });

  it('an ad that asks for nothing returns null', () => {
    assert.equal(demandedYears('Buscamos desarrollador Node.js para proyecto remoto'), null);
  });
});

describe('statedLevel — the level a board writes on its own line', () => {
  it('reads the levels Get on Board uses', () => {
    assert.deepEqual(statedLevel('X busca: Dev\nNivel: Senior\nModalidad: 100% remoto'), { label: 'Senior', years: 5 });
    assert.equal(statedLevel('Nivel: Semi Senior')?.years, 2, '"semi senior" is not "senior"');
    assert.equal(statedLevel('Nivel: Junior')?.years, 0);
    assert.equal(statedLevel('Nivel: Expert')?.years, 7);
    assert.equal(statedLevel('Nivel: Sin experiencia')?.years, 0);
  });

  it('when several are named, the lowest one is the door', () => {
    assert.equal(statedLevel('Nivel: Semisenior / Senior.')?.years, 2);
    assert.equal(statedLevel('Seniority: Senior / Lead / Architect')?.years, 5);
  });

  it('only a line of its own counts: a level in the prose is not the role\'s level', () => {
    assert.equal(statedLevel('Trabajarás junto a desarrolladores senior del equipo'), null);
  });

  it('a level line about something else is ignored', () => {
    assert.equal(statedLevel('Inglés\nNivel: avanzado'), null);
  });
});

describe('the trade and the foreign stacks come from the profile', () => {
  it('a QA posting is "your role" for QA, not for a developer', () => {
    const ad = 'Buscamos QA Automation Engineer para nuestro equipo remoto';
    assert.equal(isOwnRole(ad, ['qa'], []), true);
    assert.equal(isOwnRole(ad, ['software'], PROFILE.cannotDo), false);
  });

  it('a developer keeps the titles that were "own role" before', () => {
    assert.equal(isOwnRole('Desarrollador Full Stack remoto', ['software'], PROFILE.cannotDo), true);
    assert.equal(isOwnRole('Full stack developer (Java, Spring Boot)', ['software'], PROFILE.cannotDo), false);
  });

  it('a "go" far from anything technical is not the Go language (the old fixed list said it was)', () => {
    const ad = 'Desarrollador Full Stack para proyecto remoto.\nBeneficios: horario flexible, días libres y ganas de crecer. Ready, set, go!';
    assert.equal(isOwnRole(ad, ['software'], PROFILE.cannotDo), true);
  });

  it('a QA testing an Angular app is not in someone else\'s ecosystem: Angular is not in their vetoes', () => {
    const ad = 'QA Engineer: pruebas E2E con JavaScript sobre una app en Angular';
    assert.equal(isOtherEcosystem(ad, ['JavaScript'], []), false);
    assert.equal(isOtherEcosystem(ad, ['JavaScript'], PROFILE.cannotDo), true, 'for a developer who vetoed Angular it is');
  });

  it('"with Java or C#" asks for one of them: a QA who knows Java is not vetoed by C#', () => {
    const ad = 'Requisitos: automatización con Selenium y Java o C#.';
    assert.equal(unknownRequiredTech(ad, ['C#'], ['Selenium', 'Java']), null);
    assert.equal(unknownRequiredTech(ad, ['C#'], ['Python']), 'c#');
  });
});
