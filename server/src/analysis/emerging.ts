import { matchStack } from '../filters/offer.js';
import type { Job } from '../types.js';
import { TOPICS } from './topics.js';

/**
 * ═══ LO QUE SE REPITE Y NADIE CLASIFICÓ ═══
 *
 * El Enfoque cuenta temas de un catálogo escrito a mano, y ese es su único
 * agujero de verdad: **lo que no está en el catálogo no se detecta por mucho
 * que lo pidan**. Si mañana seis vacantes exigen Rust, Svelte o Temporal, la
 * pantalla no dice nada — y el día que uno se entera, ya llega tarde.
 *
 * Esto lo cierra por el otro lado: en vez de buscar lo que conocemos, busca
 * CUALQUIER palabra técnica que se repita en varias vacantes y que el
 * catálogo todavía no tenga. No necesita que nadie la haya previsto.
 *
 * El precio es el ruido: aquí no hay sinónimos ni criterio, solo palabras que
 * se repiten. Por eso va en su propia sección y no mezclada con los temas: lo
 * de arriba está curado y esto es materia prima.
 */
export interface EmergingTerm {
  term: string;
  vacancies: number;
  /** Una frase donde aparece, para no tener que ir al anuncio. */
  example: string | null;
  /** ¿Apareció desde la última vez que él miró? Lo decide `news.ts`. */
  isNew?: boolean;
}

/** Igual que un tema: con una sola vacante no hay patrón, hay una empresa. */
const MIN_VACANCIES = 2;
const MAX_TERMS = 15;
const MIN_EXAMPLE_CHARS = 25;
const MAX_EXAMPLE_CHARS = 180;

/**
 * Palabras que se escriben con mayúscula y no son tecnología.
 *
 * Casi todas son el arranque de una frase de requisitos —«Experiencia con…»,
 * «Conocimiento de…»— y por eso además se ignora SIEMPRE la primera palabra
 * de cada línea: en español una mayúscula ahí no significa nombre propio.
 */
const NOT_TECH = new Set([
  'experiencia', 'conocimiento', 'conocimientos', 'manejo', 'capacidad', 'habilidad', 'dominio',
  'buenas', 'buen', 'sólida', 'solida', 'sólidos', 'solidos', 'excelente', 'fuerte', 'deseable',
  'requisitos', 'funciones', 'beneficios', 'responsabilidades', 'nivel', 'modalidad', 'área', 'area',
  'sueldo', 'postular', 'empresa', 'equipo', 'puesto', 'cargo', 'trabajo', 'proyectos', 'clientes',
  'desarrollo', 'desarrollador', 'ingeniero', 'años', 'anos', 'más', 'mas', 'menos', 'ser', 'tener',
  'trabajar', 'participar', 'colaborar', 'diseñar', 'implementar', 'mantener', 'construir', 'crear',
  'remoto', 'presencial', 'híbrido', 'hibrido', 'full', 'time', 'senior', 'semi', 'junior', 'lead',
  'and', 'the', 'with', 'for', 'you', 'your', 'our', 'we', 'will', 'work', 'experience', 'knowledge',
  'strong', 'good', 'ability', 'skills', 'team', 'company', 'product', 'this', 'that', 'what', 'who',
  'latam', 'latinoamérica', 'latinoamerica', 'españa', 'espana', 'chile', 'perú', 'peru', 'colombia',
  'méxico', 'mexico', 'argentina', 'venezuela', 'estados', 'unidos', 'usa', 'eeuu',
]);

/**
 * Ya está contado arriba: todo alias del catálogo Y CADA PALABRA SUYA.
 *
 * Las palabras sueltas importan tanto como el alias entero. Sin ellas, el
 * detector proponía «CI», «CD», «IA», «Cloud» y «Arquitectura» como
 * hallazgos: son trozos de «CI/CD», «IA generativa», «Google Cloud» y
 * «arquitectura limpia», que el catálogo ya cuenta. Un detector que descubre
 * la mitad de una palabra que ya tienes no descubre nada, y encima entierra lo
 * que sí es nuevo.
 */
const CATALOGUED = new Set(TOPICS.flatMap((t) => t.aliases.flatMap((alias) => {
  const whole = alias.toLowerCase();
  return [whole, ...whole.split(/[^a-záéíóúñ0-9+#.]+/).filter((w) => w.length > 1)];
})));

/**
 * ¿Esta palabra parece una tecnología?
 *
 * Tres formas, y ninguna es infalible: empieza por mayúscula (Terraform),
 * son siglas (ETL, SQS), o lleva un símbolo o un número pegado (C++, S3, k6).
 * El filtro de verdad no es este, es que se repita en varias vacantes: una
 * palabra rara aparece una vez; una tecnología que están pidiendo, muchas.
 */
function looksTechnical(token: string): boolean {
  if (token.length < 2 || token.length > 24) return false;
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(token)) return true;
  if (/^[A-Z]{2,}$/.test(token)) return true;
  return /[0-9+#]/.test(token) && /[a-zA-Z]/.test(token);
}

function tokensOf(line: string): string[] {
  // La PRIMERA palabra se tira siempre: en una frase su mayúscula no
  // significa nombre propio, significa que ahí empieza la frase.
  return line.split(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9+#.]+/).slice(1)
    .map((t) => t.replace(/\.+$/, ''))
    .filter(Boolean);
}

function requirementLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim())
    .filter((l) => /^[-•*]\s+/.test(l))
    .map((l) => l.replace(/^[-•*]\s+/, '').trim())
    .filter((l) => l.length >= MIN_EXAMPLE_CHARS && l.length <= MAX_EXAMPLE_CHARS);
}

/**
 * Los nombres de las empresas, fuera.
 *
 * Son nombres propios que se repiten en cada anuncio suyo, así que sin esto
 * una consultora con cincuenta vacantes publicadas sería «la tecnología más
 * demandada del mercado».
 */
function employerWords(jobs: readonly Job[]): Set<string> {
  const words = new Set<string>();
  for (const job of jobs) {
    for (const name of [job.company, job.author]) {
      for (const word of (name ?? '').split(/\s+/)) {
        if (word.length > 1) words.add(word.toLowerCase());
      }
    }
  }
  return words;
}

export function findEmerging(jobs: readonly Job[]): EmergingTerm[] {
  const employers = employerWords(jobs);
  /** término normalizado → vacantes donde sale, y cómo se escribe de verdad. */
  const seen = new Map<string, { label: string; jobs: Set<number>; example: string | null }>();

  for (const [index, job] of jobs.entries()) {
    for (const line of requirementLines(job.text)) {
      for (const token of tokensOf(line)) {
        const key = token.toLowerCase();
        if (NOT_TECH.has(key) || CATALOGUED.has(key) || employers.has(key)) continue;
        if (!looksTechnical(token)) continue;
        // Y lo que ya cuenta un tema por otro alias suyo tampoco: «Postgres»
        // no es un término nuevo si «PostgreSQL» ya está en el catálogo.
        if (TOPICS.some((t) => matchStack(token, t.aliases).length > 0)) continue;

        const entry = seen.get(key) ?? { label: token, jobs: new Set<number>(), example: null };
        entry.jobs.add(index);
        entry.example ??= line;
        seen.set(key, entry);
      }
    }
  }

  return [...seen.values()]
    .filter((e) => e.jobs.size >= MIN_VACANCIES)
    .map((e) => ({ term: e.label, vacancies: e.jobs.size, example: e.example }))
    .sort((a, b) => b.vacancies - a.vacancies || a.term.localeCompare(b.term))
    .slice(0, MAX_TERMS);
}
