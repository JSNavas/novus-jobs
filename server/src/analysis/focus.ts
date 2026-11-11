import type { CandidateProfile } from '../filters/decide.js';
import { matchStack } from '../filters/offer.js';
import type { Job } from '../types.js';
import { TOPICS, type Topic, type TopicArea } from './topics.js';

/**
 * ═══ EL ENFOQUE: QUÉ ESTUDIAR, SEGÚN LAS VACANTES QUE LE SIRVEN ═══
 *
 * La idea es suya: si dos o tres vacantes piden lo mismo, eso es lo relevante,
 * y ahí hay que poner el esfuerzo.
 *
 * Se mira SOLO lo aceptado, nunca lo descartado. Las descartadas piden C#,
 * SAP o inglés avanzado: contarlas convertiría la lista de estudio en «aprende
 * lo que no quieres hacer».
 *
 * Y se cuenta UNA VEZ POR VACANTE, no por menciones. Un anuncio que repite
 * «AWS» catorce veces en sus funciones no hace a AWS más demandado: hace a esa
 * empresa más repetitiva. Lo que importa es en cuántas vacantes aparece.
 */
export interface FocusTopic {
  name: string;
  area: TopicArea;
  /** En cuántas vacantes aceptadas aparece. */
  vacancies: number;
  /** Sobre el total analizado, redondeado. */
  share: number;
  /** Si ya está en su perfil. Lo que NO lo está es la lista de estudio. */
  known: boolean;
  /**
   * Frases reales de los anuncios, tal cual las escribieron. Es lo que él
   * pidió ver: no la etiqueta «Docker», sino «Experiencia con Docker y
   * pipelines de CI/CD mediante GitHub Actions».
   */
  examples: string[];
}

export interface Focus {
  /** Cuántas vacantes aceptadas se analizaron. */
  analysed: number;
  topics: FocusTopic[];
}

/** Con una sola vacante no hay patrón, hay una empresa. Lo dijo él: «2 o 3». */
const MIN_VACANCIES = 2;
/** Dos frases bastan para entender qué piden; más es una pared de texto. */
const MAX_EXAMPLES = 2;
/** Una línea más larga que esto no es un requisito: es un párrafo. */
const MAX_EXAMPLE_CHARS = 180;
const MIN_EXAMPLE_CHARS = 25;

/**
 * Las líneas de requisitos del anuncio.
 *
 * Se queda con las viñetas, que es donde las plataformas ponen lo que piden.
 * El resto del anuncio —la presentación de la empresa, los beneficios— habla
 * de otra cosa, y colarlo aquí llenaría la lista de «excelente ambiente
 * laboral».
 */
function requirementLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, '').trim())
    .filter((line) => line.length >= MIN_EXAMPLE_CHARS && line.length <= MAX_EXAMPLE_CHARS);
}

/** ¿Está ya en su perfil? Se compara contra el stack, no contra el texto. */
function isKnown(topic: Topic, profile: CandidateProfile): boolean {
  const stack = profile.stack.map((s) => s.toLowerCase());
  return topic.aliases.some((alias) => stack.includes(alias.toLowerCase()));
}

function mentions(text: string, topic: Topic): boolean {
  return matchStack(text, topic.aliases).length > 0;
}

/**
 * El enfoque a partir de las vacantes aceptadas.
 *
 * Función pura: recibe las ofertas y devuelve la lista. Así se puede probar
 * con cuatro anuncios inventados sin levantar nada.
 */
export function buildFocus(jobs: readonly Job[], profile: CandidateProfile): Focus {
  const analysed = jobs.length;
  if (!analysed) return { analysed: 0, topics: [] };

  const lines = jobs.map((job) => requirementLines(job.text));

  const topics = TOPICS.flatMap((topic): FocusTopic[] => {
    const hits = jobs.filter((job) => mentions(job.text, topic));
    if (hits.length < MIN_VACANCIES) return [];

    // Las frases se buscan en las vacantes donde el tema aparece, y se
    // esquivan las repetidas: la misma consultora publica cincuenta anuncios
    // calcados, y tres ejemplos idénticos no enseñan nada.
    const examples: string[] = [];
    for (const [index, job] of jobs.entries()) {
      if (examples.length >= MAX_EXAMPLES) break;
      if (!mentions(job.text, topic)) continue;
      const line = lines[index]!.find((l) => mentions(l, topic) && !examples.includes(l));
      if (line) examples.push(line);
    }

    return [{
      name: topic.name,
      area: topic.area,
      vacancies: hits.length,
      share: Math.round((hits.length / analysed) * 100),
      known: isKnown(topic, profile),
      examples,
    }];
  });

  // Lo más pedido primero. A igualdad, lo que NO sabe antes que lo que ya
  // sabe: la lista existe para estudiar, no para felicitarse.
  topics.sort((a, b) => b.vacancies - a.vacancies || Number(a.known) - Number(b.known) || a.name.localeCompare(b.name));
  return { analysed, topics };
}
