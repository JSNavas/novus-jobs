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
  /**
   * Si está en su perfil. Ya no parte la lista —lo que se viene a ver aquí es
   * qué piden las vacantes, lo sepa él o no— pero se sigue calculando: es un
   * dato barato y la pantalla puede querer matizarlo algún día.
   */
  known: boolean;
  /**
   * Frases reales de los anuncios, tal cual las escribieron. Es lo que él
   * pidió ver: no la etiqueta «Docker», sino «Experiencia con Docker y
   * pipelines de CI/CD mediante GitHub Actions».
   */
  examples: string[];
}

export interface Focus {
  /** Cuántas vacantes aceptadas se analizaron, ya dentro de la ventana. */
  analysed: number;
  /** El tamaño de la ventana, para que la pantalla no lo invente. */
  windowDays: number;
  topics: FocusTopic[];
}

/** Con una sola vacante no hay patrón, hay una empresa. Lo dijo él: «2 o 3». */
const MIN_VACANCIES = 2;

/**
 * SEIS MESES, y la ventana importa tanto como la cuenta.
 *
 * El tope de tres meses del pipeline se aplica AL ENTRAR: una vacante aceptada
 * hoy se seguiría contando dentro de un año, cuando ya no exista. Sin ventana,
 * la lista acabaría mezclando lo que se pide ahora con lo que se pedía la
 * temporada pasada, y eso en una lista de estudio es peor que no tenerla.
 *
 * Seis y no tres, y es decisión suya: una ventana corta reacciona rápido pero
 * tiembla —con pocas vacantes, dos anuncios mueven un tema diez puntos—, y lo
 * que él quiere ver es justo lo contrario: que algo EMPIEZA a pedirse, como la
 * IA, con tiempo para reaccionar antes de que sea un requisito en todas.
 */
const WINDOW_DAYS = 180;
const DAY_MS = 24 * 60 * 60_000;
/**
 * CUATRO frases, no dos.
 *
 * Las frases no son un adorno del tema: son LO QUE SE LEE. Un tema ancho como
 * «IA aplicada» con dos ejemplos deja fuera la mitad de lo que piden, y
 * entonces hay que ir a buscarlo al anuncio — que es justo lo que esta
 * pantalla existe para evitar.
 */
const MAX_EXAMPLES = 4;
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
 * El último recurso cuando el tema no aparece en ninguna viñeta: la oración
 * del anuncio donde se menciona. Una fila con un número y sin una sola frase
 * no se entiende — pasaba con «Machine learning», que se pedía en prosa.
 */
function sentenceWith(jobs: readonly Job[], topic: Topic): string | null {
  for (const job of jobs) {
    const sentences = job.text.split(/(?<=[.!?])\s+|\n/).map((x) => x.trim());
    const hit = sentences.find((x) =>
      x.length >= MIN_EXAMPLE_CHARS && x.length <= MAX_EXAMPLE_CHARS && mentions(x, topic));
    if (hit) return hit;
  }
  return null;
}

/**
 * El enfoque a partir de las vacantes aceptadas.
 *
 * Función pura: recibe las ofertas y devuelve la lista. Así se puede probar
 * con cuatro anuncios inventados sin levantar nada.
 */
export function buildFocus(all: readonly Job[], profile: CandidateProfile, now = Date.now()): Focus {
  // Por fecha de publicación, y si no la hay por cuándo se encontró: una
  // oferta de LinkedIn sin fecha es de la pasada que la leyó, y esa sí se sabe.
  const since = now - WINDOW_DAYS * DAY_MS;
  const jobs = all.filter((job) => {
    const when = Date.parse(job.postedAt ?? job.foundAt);
    return Number.isNaN(when) ? true : when >= since;
  });

  const analysed = jobs.length;
  if (!analysed) return { analysed: 0, windowDays: WINDOW_DAYS, topics: [] };

  const lines = jobs.map((job) => requirementLines(job.text));

  const found = TOPICS.flatMap((topic) => {
    const vacancies = jobs.filter((job) => mentions(job.text, topic)).length;
    return vacancies >= MIN_VACANCIES ? [{ topic, vacancies }] : [];
  });

  // Se ordena ANTES de repartir las frases, y no es un detalle: la frase que
  // vale para dos temas se la queda el más pedido, que es el que más gente va
  // a leer.
  found.sort((a, b) => b.vacancies - a.vacancies || a.topic.name.localeCompare(b.topic.name));

  /*
   * ═══ CADA FRASE, EN UN SOLO SITIO ═══
   *
   * Medido sobre la pantalla real: nueve frases salían repetidas en varios
   * temas, y «Soltura con JavaScript/TypeScript (idealmente Next.js/React) y
   * bases de datos SQL» aparecía CUATRO veces —bajo TypeScript, React,
   * JavaScript y Next.js—. Leída cuatro veces, una frase deja de informar y
   * empieza a estorbar: parece que la página se repite, y uno deja de leerla.
   *
   * Un anuncio que nombra cuatro tecnologías en una línea es un hecho; lo que
   * no hace falta es contarlo cuatro veces.
   */
  const used = new Set<string>();

  const topics = found.map(({ topic, vacancies }): FocusTopic => {
    const mine = jobs.flatMap((job, index) => (mentions(job.text, topic) ? lines[index]! : []))
      .filter((line) => mentions(line, topic));

    const examples: string[] = [];
    for (const line of mine) {
      if (examples.length >= MAX_EXAMPLES) break;
      if (used.has(line) || examples.includes(line)) continue;
      examples.push(line);
      used.add(line);
    }
    // Antes que dejar la fila muda: si TODAS sus frases se las llevaron otros
    // temas, se repite una. Un tema sin una sola frase no se entiende.
    if (!examples.length && mine.length) examples.push(mine[0]!);
    // Y si no hay viñetas que lo nombren —lo pide en prosa, no en una lista—
    // se recorta la oración donde aparece. Vale menos, pero dice algo.
    if (!examples.length) {
      const sentence = sentenceWith(jobs, topic);
      if (sentence) examples.push(sentence);
    }

    return {
      name: topic.name,
      area: topic.area,
      vacancies,
      share: Math.round((vacancies / analysed) * 100),
      known: isKnown(topic, profile),
      examples,
    };
  });

  return { analysed, windowDays: WINDOW_DAYS, topics };
}
