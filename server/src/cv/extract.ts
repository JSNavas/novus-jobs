import { COUNTRIES } from '../filters/countries.js';
import { wordIn } from '../filters/text-match.js';
import {
  ECOSYSTEM_LABELS, TECHNOLOGIES, VETOABLE_ECOSYSTEMS, spellingsOf, technologiesOf,
  type Ecosystem,
} from '../profile/technologies.js';
import { ENGLISH_LEVELS, type EnglishLevel } from '../profile/types.js';

/**
 * LO QUE SE SACA DE UN CV, SIN RED.
 *
 * Todo con reglas, en la máquina del usuario: el CV no sale de su disco. Lo que
 * las reglas no encuentren se queda vacío y lo rellena él en el formulario —
 * nunca se inventa un valor, porque un campo inventado en `cannotDo` tira
 * ofertas buenas sin que nadie se entere.
 *
 * Quien tenga clave de Gemini puede además pedir la mejora de `enhance.ts`, que
 * sí manda el texto y rellena lo que esto dejó vacío. Es una decisión suya, con
 * el aviso delante, y el proyecto funciona entero sin ella.
 */
export interface CvExtraction {
  /** Las tecnologías del catálogo que el CV menciona. */
  stack: string[];
  /** De las anteriores, las que definen un oficio. */
  core: string[];
  /** Ecosistemas que el CV NO menciona: propuesta de veto, para revisar. */
  suggestedVetoes: { ecosystem: Ecosystem; label: string; technologies: string[] }[];
  english: EnglishLevel | null;
  /** Código ISO del país, si el CV lo dice. */
  country: string | null;
  city: string | null;
  /** Años de experiencia, si los dice. Solo informa: no filtra nada todavía. */
  years: number | null;
  /** Para que la pantalla pueda decir "esto lo saqué de tu CV, revísalo". */
  foundInCv: boolean;
}

export function extractFromCv(text: string): CvExtraction {
  const t = text.toLowerCase();
  const found = TECHNOLOGIES.filter((tech) => spellingsOf(tech).some((s) => wordIn(t, s.toLowerCase())));
  const stack = found.map((tech) => tech.name);
  const core = found.filter((tech) => tech.core).map((tech) => tech.name);
  const place = findPlace(t);
  return {
    stack,
    core,
    suggestedVetoes: suggestVetoes(found.map((f) => f.ecosystem)),
    english: findEnglish(t),
    country: place?.code ?? null,
    city: place?.city ?? null,
    years: findYears(t),
    foundInCv: stack.length > 0,
  };
}

/**
 * Los ecosistemas que el CV no toca, propuestos como veto en bloque.
 *
 * Solo los que cierran una oferta entera: un lenguaje de servidor que no se
 * sabe. Los transversales —frontend, nube, bases de datos— no se proponen
 * nunca, porque aparecen de refilón en casi cualquier anuncio y vetarlos
 * tiraría ofertas buenas (ver `VETOABLE_ECOSYSTEMS`).
 *
 * Y se exige que el ecosistema esté COMPLETAMENTE ausente: con que el CV
 * mencione una sola de sus tecnologías, no se propone. Quien pasó por Java hace
 * seis años quizá no quiera vetarlo, y proponérselo es invitarle a tirar algo
 * que sí podría hacer.
 */
function suggestVetoes(present: readonly Ecosystem[]): CvExtraction['suggestedVetoes'] {
  return VETOABLE_ECOSYSTEMS
    .filter((eco) => !present.includes(eco))
    .map((eco) => ({
      ecosystem: eco,
      label: ECOSYSTEM_LABELS[eco],
      technologies: technologiesOf(eco).map((t) => t.name),
    }));
}

/** Las formas en que un CV declara su inglés, de la más alta a la más baja. */
const ENGLISH_PATTERNS: ReadonlyArray<readonly [EnglishLevel, RegExp]> = [
  ['native', /ingl[ée]s[^.\n]{0,30}(nativ\w*|biling[üu]e)|(nativ\w*|biling[üu]e)[^.\n]{0,20}ingl[ée]s|english[^.\n]{0,30}(native|bilingual)/i],
  ['c2', /ingl[ée]s[^.\n]{0,30}\bc2\b|english[^.\n]{0,30}\bc2\b|proficiency/i],
  ['c1', /ingl[ée]s[^.\n]{0,30}(\bc1\b|avanzad\w*|fluid\w*)|english[^.\n]{0,30}(\bc1\b|advanced|fluent)/i],
  ['b2', /ingl[ée]s[^.\n]{0,30}(\bb2\b|intermedio\s+alto|upper)|english[^.\n]{0,30}(\bb2\b|upper)/i],
  ['b1', /ingl[ée]s[^.\n]{0,30}(\bb1\b|intermedi\w*)|english[^.\n]{0,30}(\bb1\b|intermediate)/i],
  ['a2', /ingl[ée]s[^.\n]{0,30}(\ba2\b|b[áa]sic\w*|lectura)|english[^.\n]{0,30}(\ba2\b|basic|reading)/i],
  ['a1', /ingl[ée]s[^.\n]{0,30}(\ba1\b|principiante)|english[^.\n]{0,30}(\ba1\b|beginner)/i],
];

/**
 * El nivel declarado. Se coge el MÁS ALTO que aparezca: un CV que dice "inglés
 * B1, en progreso hacia B2" declara B1 como lo que tiene, pero uno que dice
 * "inglés técnico de lectura (B2)" declara B2 — y entre varias menciones, la
 * alta es la que el candidato considera suya.
 *
 * `null` cuando el CV no lo dice. No se asume "ninguno": asumirlo activaría un
 * filtro que el usuario no pidió y le esconderían ofertas sin saber por qué.
 */
function findEnglish(t: string): EnglishLevel | null {
  const matches = ENGLISH_PATTERNS.filter(([, re]) => re.test(t)).map(([level]) => level);
  if (!matches.length) return null;
  return matches.reduce((a, b) => (ENGLISH_LEVELS.indexOf(a) >= ENGLISH_LEVELS.indexOf(b) ? a : b));
}

/**
 * Dónde vive. Se busca la ciudad antes que el país: un CV suele poner
 * "Caracas, Venezuela" o solo la ciudad, y de la ciudad se deduce el país.
 */
function findPlace(t: string): { code: string; city: string | null } | null {
  for (const country of COUNTRIES) {
    const city = country.cities.find((c) => t.includes(c));
    if (city) return { code: country.code, city: capitalize(city) };
  }
  for (const country of COUNTRIES) {
    if (country.names.some((n) => wordIn(t, n))) return { code: country.code, city: null };
    if (country.adjectives.some((a) => wordIn(t, a))) return { code: country.code, city: null };
  }
  return null;
}

function capitalize(city: string): string {
  return city.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
}

/** "9 años de experiencia", "9+ years". Se coge el número más alto que aparezca. */
function findYears(t: string): number | null {
  const found = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:años?|years?)\b[^.\n]{0,24}(?:experiencia|experience|desarrol|develop)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n < 60);
  return found.length ? Math.max(...found) : null;
}

/**
 * La propuesta de vetos a partir de una lista de tecnologías ya resuelta.
 *
 * Se recalcula tras juntar las dos lecturas del CV: si el modelo encontró Java
 * donde las reglas no lo vieron, proponer vetar la JVM sería invitar al usuario
 * a tirar ofertas que sí puede hacer.
 */
export function suggestVetoesFor(names: readonly string[]): CvExtraction['suggestedVetoes'] {
  const present = TECHNOLOGIES.filter((t) => names.includes(t.name)).map((t) => t.ecosystem);
  return suggestVetoes(present);
}

/** Las tecnologías de los ecosistemas elegidos, que es lo que va a `cannotDo`. */
export function vetoesOf(ecosystems: readonly Ecosystem[]): string[] {
  const names = ecosystems.flatMap((eco) => technologiesOf(eco).map((t) => t.name));
  return [...new Set(names)];
}

/** Usado por `enhance.ts` para no aceptar del modelo nada que no esté en el catálogo. */
export function knownTechnology(name: string): string | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const match = TECHNOLOGIES.find((tech) => spellingsOf(tech).some((s) => s.toLowerCase() === wanted));
  return match?.name ?? null;
}
