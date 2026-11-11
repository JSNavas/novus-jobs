import { JobLocation } from '../types.js';
import { COUNTRIES, REGION_MARKS, type Country } from './countries.js';
import { wordIn } from './text-match.js';

/**
 * Desde dónde busca el usuario. Lo que convierte las reglas de abajo en un
 * veredicto: "remoto Argentina" es una puerta abierta para quien vive en
 * Argentina y una pared para el resto, y la frase es la misma.
 *
 * `country` en `null` es un perfil que no dijo dónde vive. Entonces NO se aplica
 * ninguna regla de país: sin saber desde dónde busca, llamar "restringida" a una
 * oferta sería tirarla por una suposición. Se clasifica solo la modalidad.
 */
export interface HomeGeo {
  readonly country: Country | null;
  readonly city: string | null;
}

/**
 * Formas de decir "solo si vives aquí".
 *
 * "Exclusiva para" estaba de menos, y costó una oferta mandada por error: un
 * anuncio decía "Modalidad: 100 % remoto" y tres líneas después "📍 Vacante
 * exclusiva para Colombia". El remoto era cierto; lo que no era cierto es que
 * sirviera. Un "100% remoto" NO significa "desde donde vivas" cuando el propio
 * anuncio acota el país en otra línea.
 */
const RESTRICTION_MARKS = [
  'solo para', 'sólo para', 'only for', 'must be based in', 'must reside', 'residentes en',
  'residents of', 'based in', 'located in', 'ubicados en', 'radicados en', 'que vivan en',
  'authorized to work in', 'work authorization', 'visa', 'no sponsorship',
  'exclusiva para', 'exclusivo para', 'exclusivamente para', 'únicamente para', 'unicamente para',
  'solo residentes', 'sólo residentes', 'debes residir', 'debe residir', 'residir en',
  'con residencia en', 'nacionalidad', 'aplica solo', 'aplica únicamente', 'open to candidates in',
];

/**
 * Una etiqueta de sitio seguida de un país ES una restricción, aunque no lleve
 * ninguna de las frases de arriba: "📍 Ubicación: Argentina" no necesita decir
 * "solo para" para significarlo.
 */
const PLACE_LABEL = /(?:ubicaci[óo]n|localizaci[óo]n|cobertura|pa[íi]s|sede|vacante|residencia|location|country)\s*:?\s*[^.\n]{0,24}/i;

/**
 * Decir "desde donde sea" es una MODALIDAD: afirma que no importa dónde vivas.
 * Estas marcas sí pueden más que una ciudad nombrada en el anuncio.
 */
const ANYWHERE_MARKS = [
  'remoto global', 'remote global', 'fully remote', '100% remoto', '100% remote',
  'worldwide', 'work from anywhere', 'anywhere in the world', 'desde cualquier lugar',
];

/** "Híbrido" usado como término técnico (búsqueda híbrida, hybrid search), no como modalidad. */
const TECHNICAL_HYBRID = /(?:b[úu]squeda|search|retrieval|recuperaci[óo]n|nube|cloud|aplicaci[óo]n(?:es)?|apps?|arquitectura|perfil|[íi]ndice|embedding|rag|m[óo]vil(?:es)?|nativa|nativas)\s+(?:h[ií]brid\w*|hybrid\w*)|(?:h[ií]brid\w*|hybrid\w*)\s+(?:search|retrieval|rag|cloud)/i;

/** "Remoto / híbrido": la opción remota existe y es la que se tomaría. */
const REMOTE_OR_HYBRID = /remot[oa]s?\s*(?:\/|\bo\b|\by\b)\s*h[ií]brid\w*|h[ií]brid\w*\s*(?:\/|\bo\b)\s*remot[oa]s?|remote\s*(?:\/|&|\bor\b)\s*hybrid|hybrid\s*(?:\/|&|\bor\b)\s*remote/i;

/** Presencia de oficina puntual, no modalidad. Solo se perdona si además se nombra su país. */
const PUNCTUAL_ONSITE = /(puntual\w*|ocasional\w*|espor[áa]dic\w*|una\s+vez\s+al\s+mes|\d\s*(?:d[íi]as?|veces?)\s+(?:al|por)\s+mes)/i;

/** Todas las formas de decir "no hay que ir a la oficina". */
const REMOTE = String.raw`(?:remot[eoa]s?|home\s*-?\s*office|teletrabaj\w*|trabajo\s+a\s+distancia|\ba\s+distancia\b|desde\s+casa|work\s+from\s+home|\bwfh\b|deslocalizad\w*)`;
const REMOTE_RE = new RegExp(REMOTE, 'i');

/** Un "no" delante de un equipo o cliente significa que el país es de la empresa, no del puesto. */
const NOT_A_RESTRICTION = /equipo|team|cliente|client|colabora|junto|partner|oficina central/i;

/** Cómo se nombra su país: el nombre, el gentilicio y sus ciudades. */
function homeMarks(home: HomeGeo): string[] {
  const marks = home.country ? [...home.country.names, ...home.country.adjectives] : [];
  if (home.city) marks.push(home.city.toLowerCase());
  return marks;
}

function homeCities(home: HomeGeo): string[] {
  const cities = home.country ? [...home.country.cities] : [];
  if (home.city) cities.push(home.city.toLowerCase());
  return cities;
}

function foreignCountries(home: HomeGeo): readonly Country[] {
  return home.country ? COUNTRIES.filter((c) => c.code !== home.country?.code) : [];
}

function isPunctualHomeVisit(t: string, home: HomeGeo): boolean {
  const marks = homeMarks(home);
  if (!marks.length) return false;
  const onsite = /presencial\w*/.exec(t);
  const window = onsite ? t.slice(Math.max(0, onsite.index - 60), onsite.index + 60) : '';
  return marks.some((m) => t.includes(m)) && REMOTE_RE.test(t) && PUNCTUAL_ONSITE.test(window);
}

function hasNonTechnicalHybrid(t: string): boolean {
  for (const m of t.matchAll(/h[ií]brid\w*|hybrid\w*/g)) {
    const i = m.index ?? 0;
    const window = t.slice(Math.max(0, i - 40), i + m[0].length + 40);
    if (!TECHNICAL_HYBRID.test(window)) return true;
  }
  return false;
}

/**
 * ¿Hay que ir a una oficina? Distingue presencial de híbrido porque son dos
 * decisiones distintas del usuario: hay quien acepta ir dos días y no cinco.
 * Antes las dos caían en `Onsite` y se descartaban juntas.
 */
function onsiteKind(t: string, home: HomeGeo): JobLocation.Onsite | JobLocation.Hybrid | null {
  if (REMOTE_OR_HYBRID.test(t)) return null;
  if (/presencial|on-?site/i.test(t) && !isPunctualHomeVisit(t, home)) return JobLocation.Onsite;
  return hasNonTechnicalHybrid(t) ? JobLocation.Hybrid : null;
}

function nearRemote(t: string, first: string, second: string): boolean {
  const match = new RegExp(`${first}([^.]{0,14})${second}`, 'i').exec(t);
  return !!match && !NOT_A_RESTRICTION.test(match[1] ?? '');
}

function labelledWithCountry(t: string, country: string): boolean {
  return new RegExp(PLACE_LABEL.source + escapeForCountry(country), 'i').test(t);
}

/** El país puede llevar tilde o espacios; nada más hay que escapar aquí. */
function escapeForCountry(country: string): string {
  return country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function namesOf(countries: readonly Country[]): string[] {
  return countries.flatMap((c) => c.names);
}

function restrictsToForeignCountry(t: string, home: HomeGeo): boolean {
  const country = namesOf(foreignCountries(home)).find((c) => wordIn(t, c));
  if (!country) return false;
  return RESTRICTION_MARKS.some((m) => t.includes(m))
    || labelledWithCountry(t, country)
    || nearRemote(t, REMOTE, country)
    || nearRemote(t, country, REMOTE);
}

/**
 * ¿Dónde se puede trabajar desde esta oferta?
 *
 * El orden importa: lo presencial manda sobre todo, su propio país encaja aunque
 * el anuncio mencione otros, y las restricciones de país se miran antes que el
 * "remoto global" genérico. Sin pistas devuelve `Unknown`, que NO descarta: un
 * falso positivo cuesta diez segundos de lectura y un falso negativo, una oferta
 * que nunca se sabrá que existió.
 */
export function classifyLocation(text: string, home: HomeGeo): JobLocation {
  const t = text.toLowerCase();
  const onsite = onsiteKind(t, home);
  if (onsite) return onsite;

  const marks = homeMarks(home);
  if (marks.some((m) => t.includes(m))) return JobLocation.HomeCountry;

  // Sin país en el perfil no hay "otro país" que detectar: solo la modalidad.
  if (home.country) {
    if (restrictsToForeignCountry(t, home)) return JobLocation.OtherCountry;
    // Una lista de tres o más países es el alcance de contratación: si el suyo no está, no está.
    if (namesOf(foreignCountries(home)).filter((c) => wordIn(t, c)).length >= 3) return JobLocation.OtherCountry;
  }

  // ¿El anuncio AFIRMA que se trabaja a distancia? Solo eso permite perdonar
  // una ciudad nombrada: "100% remoto, oficinas en Bogotá" sí sirve.
  const saysRemote = REMOTE_RE.test(t) || ANYWHERE_MARKS.some((m) => t.includes(m));
  const foreignCity = foreignCountries(home).flatMap((c) => c.cities).some((c) => wordIn(t, c));
  if (foreignCity && !saysRemote && !homeCities(home).some((c) => wordIn(t, c))) return JobLocation.OtherCountry;

  if (ANYWHERE_MARKS.some((m) => t.includes(m))) return JobLocation.Global;
  // "Remoto para LATAM" sirve a quien vive dentro de LATAM: la región lo incluye.
  const homeRegion = home.country ? REGION_MARKS[home.country.region] : [];
  if (homeRegion.some((m) => t.includes(m)) && REMOTE_RE.test(t)) return JobLocation.Global;
  if (REMOTE_RE.test(t)) return JobLocation.Global;
  // Una región a secas no dice desde dónde se trabaja: se manda marcada como
  // "por confirmar" en vez de darla por buena o tirarla.
  return JobLocation.Unknown;
}

const ESTABLISHMENT_CUE = /(oficina|sede|ubicad|situad|estamos en|nos encontramos|planta|sucursal|instalaciones)/i;

/**
 * ¿La contrata una empresa DEL PAÍS DEL USUARIO? Distinto de "remoto para su
 * país": eso es justo lo que busca. Aquí se mira quien paga, no quien recibe, y
 * solo descarta si él lo pidió (`geo.excludeLocalEmployers`): quien busca sueldo
 * en divisas no quiere las vacantes locales, y a quien le da igual no se le
 * esconden.
 */
export function isLocalEmployer(text: string, home: HomeGeo): boolean {
  const country = home.country;
  if (!country) return false;
  const t = text.toLowerCase();
  if (country.currency.some((c) => wordIn(t, c))) return true;
  if (selfDeclaredLocal(t, country) || localCompanyType(t, country)) return true;
  const city = homeCities(home).find((c) => t.includes(c));
  if (city && ESTABLISHMENT_CUE.test(t)) return true;
  return locatedInHome(t, country);
}

/** "Somos una empresa venezolana", en cualquiera de sus formas. */
function selfDeclaredLocal(t: string, country: Country): boolean {
  const adjectives = country.adjectives.map(escapeForCountry).join('|');
  if (!adjectives) return false;
  return new RegExp(
    `(empresa|compa[ñn][íi]a|startup|firma|agencia|consultora|organizaci[óo]n|somos una|grupo)\\s+\\w{0,12}\\s*(${adjectives})`,
    'i',
  ).test(t);
}

/** "Venezolana empresa": el gentilicio delante, que también se escribe así. */
function localCompanyType(t: string, country: Country): boolean {
  const adjectives = country.adjectives.map(escapeForCountry).join('|');
  if (!adjectives) return false;
  return new RegExp(`(${adjectives})\\s+(empresa|compa[ñn][íi]a|startup|firma)`, 'i').test(t);
}

/** "Con sede en Venezuela". */
function locatedInHome(t: string, country: Country): boolean {
  const names = country.names.map(escapeForCountry).join('|');
  return new RegExp(`(oficina|sede|ubicad|situad|con sede|estamos en)\\w*\\s+(en\\s+)?(${names})`, 'i').test(t);
}
