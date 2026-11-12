import { COUNTRIES } from '../filters/countries.js';
import { escapeRegex, wordIn } from '../filters/text-match.js';
import {
  ECOSYSTEM_LABELS, TECHNOLOGIES, VETOABLE_ECOSYSTEMS, spellingsOf, technologiesOf,
  type Ecosystem,
} from '../profile/technologies.js';
import { ENGLISH_LEVELS, type EnglishLevel } from '../profile/types.js';

export interface CvExtraction {
  stack: string[];
  core: string[];
  suggestedVetoes: { ecosystem: Ecosystem; label: string; technologies: string[] }[];
  english: EnglishLevel | null;
  country: string | null;
  city: string | null;
  years: number | null;
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

function suggestVetoes(present: readonly Ecosystem[]): CvExtraction['suggestedVetoes'] {
  return VETOABLE_ECOSYSTEMS
    .filter((eco) => !present.includes(eco))
    .map((eco) => ({
      ecosystem: eco,
      label: ECOSYSTEM_LABELS[eco],
      technologies: technologiesOf(eco).map((t) => t.name),
    }));
}

const ENGLISH_PATTERNS: ReadonlyArray<readonly [EnglishLevel, RegExp]> = [
  // «nativo» pegado a «inglés», sin nada en medio: en «español nativo · inglés B1»
  // el nativo es del español, y leerlo como inglés nativo apaga el filtro entero.
  ['native', /ingl[ée]s[^.\n]{0,30}(nativ\w*|biling[üu]e)|(nativ\w*|biling[üu]e)\s+(en\s+)?ingl[ée]s|english[^.\n]{0,30}(native|bilingual)/i],
  ['c2', /ingl[ée]s[^.\n]{0,30}\bc2\b|english[^.\n]{0,30}\bc2\b|proficiency/i],
  ['c1', /ingl[ée]s[^.\n]{0,30}(\bc1\b|avanzad\w*|fluid\w*)|english[^.\n]{0,30}(\bc1\b|advanced|fluent)/i],
  ['b2', /ingl[ée]s[^.\n]{0,30}(\bb2\b|intermedio\s+alto|upper)|english[^.\n]{0,30}(\bb2\b|upper)/i],
  ['b1', /ingl[ée]s[^.\n]{0,30}(\bb1\b|intermedi\w*)|english[^.\n]{0,30}(\bb1\b|intermediate)/i],
  ['a2', /ingl[ée]s[^.\n]{0,30}(\ba2\b|b[áa]sic\w*|lectura)|english[^.\n]{0,30}(\ba2\b|basic|reading)/i],
  ['a1', /ingl[ée]s[^.\n]{0,30}(\ba1\b|principiante)|english[^.\n]{0,30}(\ba1\b|beginner)/i],
];

/** Un código del marco europeo escrito al lado de «inglés» vale más que cualquier adjetivo. */
const EXPLICIT_ENGLISH = /ingl[ée]s[^.\n]{0,30}\b([abc][12])\b|english[^.\n]{0,30}\b([abc][12])\b/gi;

function findEnglish(t: string): EnglishLevel | null {
  const explicit = [...t.matchAll(EXPLICIT_ENGLISH)]
    .map((match) => (match[1] ?? match[2] ?? '').toLowerCase())
    .filter((code): code is EnglishLevel => (ENGLISH_LEVELS as readonly string[]).includes(code));
  if (explicit.length) {
    return explicit.reduce((a, b) => (ENGLISH_LEVELS.indexOf(a) >= ENGLISH_LEVELS.indexOf(b) ? a : b));
  }

  const matches = ENGLISH_PATTERNS.filter(([, re]) => re.test(t)).map(([level]) => level);
  if (!matches.length) return null;
  return matches.reduce((a, b) => (ENGLISH_LEVELS.indexOf(a) >= ENGLISH_LEVELS.indexOf(b) ? a : b));
}

/**
 * «español», «inglés» o «portugués» son gentilicio e idioma a la vez. En la línea
 * de idiomas de un CV son idioma, y leerlos como país manda a buscar al sitio
 * equivocado: el CV de un venezolano que escribe «español nativo» decía España.
 */
const LANGUAGE_CONTEXT = /idiom|lengua|nativ|biling|nivel\s+de|lectura/i;

function adjectiveMeansCountry(t: string, adjective: string): boolean {
  const re = new RegExp(`(?<![a-záéíóúñ])${escapeRegex(adjective)}(?![a-záéíóúñ])`, 'gi');
  for (const match of t.matchAll(re)) {
    const from = Math.max(0, (match.index ?? 0) - 40);
    const window = t.slice(from, (match.index ?? 0) + adjective.length + 40);
    if (!LANGUAGE_CONTEXT.test(window)) return true;
  }
  return false;
}

function findPlace(t: string): { code: string; city: string | null } | null {
  for (const country of COUNTRIES) {
    const city = country.cities.find((c) => t.includes(c));
    if (city) return { code: country.code, city: capitalize(city) };
  }
  for (const country of COUNTRIES) {
    if (country.names.some((n) => wordIn(t, n))) return { code: country.code, city: null };
  }
  for (const country of COUNTRIES) {
    if (country.adjectives.some((a) => adjectiveMeansCountry(t, a))) return { code: country.code, city: null };
  }
  return null;
}

function capitalize(city: string): string {
  return city.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
}

function findYears(t: string): number | null {
  const found = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:años?|years?)\b[^.\n]{0,24}(?:experiencia|experience|desarrol|develop)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n < 60);
  return found.length ? Math.max(...found) : null;
}

export function suggestVetoesFor(names: readonly string[]): CvExtraction['suggestedVetoes'] {
  const present = TECHNOLOGIES.filter((t) => names.includes(t.name)).map((t) => t.ecosystem);
  return suggestVetoes(present);
}

export function vetoesOf(ecosystems: readonly Ecosystem[]): string[] {
  const names = ecosystems.flatMap((eco) => technologiesOf(eco).map((t) => t.name));
  return [...new Set(names)];
}

export function knownTechnology(name: string): string | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const match = TECHNOLOGIES.find((tech) => spellingsOf(tech).some((s) => s.toLowerCase() === wanted));
  return match?.name ?? null;
}
