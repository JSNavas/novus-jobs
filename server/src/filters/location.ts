import { JobLocation } from '../types.js';
import { wordIn } from './text-match.js';

/**
 * Países cuyo "remoto" es una restricción de residencia: "remoto Argentina"
 * es para gente que vive allí, no una oportunidad para quien vive en Venezuela.
 */
const RESTRICTED_COUNTRIES = [
  'argentina', 'españa', 'espana', 'spain', 'méxico', 'mexico', 'colombia', 'chile', 'perú', 'peru',
  'uruguay', 'brasil', 'brazil', 'ecuador', 'bolivia', 'paraguay', 'costa rica', 'panamá', 'panama',
  'guatemala', 'honduras', 'nicaragua', 'salvador', 'república dominicana', 'republica dominicana',
  'portugal', 'estados unidos', 'united states', 'canadá', 'canada', 'reino unido', 'united kingdom',
  'alemania', 'germany', 'francia', 'france', 'italia', 'italy', 'polonia', 'poland', 'india',
];

/** Formas de decir "solo si vives aquí". */
const RESTRICTION_MARKS = [
  'solo para', 'sólo para', 'only for', 'must be based in', 'must reside', 'residentes en',
  'residents of', 'based in', 'located in', 'ubicados en', 'radicados en', 'que vivan en',
  'authorized to work in', 'work authorization', 'visa', 'no sponsorship',
];

/** Formas de decir "desde donde sea". */
const GLOBAL_MARKS = [
  'remoto global', 'remote global', 'fully remote', '100% remoto', '100% remote',
  'worldwide', 'work from anywhere', 'anywhere in the world', 'desde cualquier lugar',
  'latam', 'latinoamérica', 'latinoamerica', 'latin america', 'américa latina', 'america latina',
];

const VENEZUELA_MARKS = ['venezuela', 'venezolano', 'venezolana'];

/** Ciudades inequívocas de LATAM y España: nombrar una es decir dónde está el puesto. */
const LATAM_CITIES = [
  'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla', 'cartagena',
  'lima', 'arequipa', 'trujillo', 'santiago de chile', 'valparaíso', 'valparaiso',
  'buenos aires', 'rosario', 'ciudad de méxico', 'ciudad de mexico', 'cdmx',
  'guadalajara', 'monterrey', 'querétaro', 'queretaro', 'quito', 'guayaquil',
  'montevideo', 'asunción', 'asuncion', 'la paz', 'são paulo', 'sao paulo',
  'rio de janeiro', 'belo horizonte', 'san josé de costa rica', 'ciudad de panamá',
  'madrid', 'sevilla', 'bilbao', 'málaga', 'malaga', 'zaragoza',
];

/** Ciudades venezolanas que delatan a un empleador local. Sin ambigüedades a propósito. */
const VENEZUELA_CITIES = [
  'caracas', 'maracaibo', 'barquisimeto', 'maracay', 'punto fijo',
  'puerto la cruz', 'ciudad guayana', 'cumaná', 'cumana', 'porlamar',
];

/** "Híbrido" usado como término técnico (búsqueda híbrida, hybrid search), no como modalidad. */
const TECHNICAL_HYBRID = /(?:b[úu]squeda|search|retrieval|recuperaci[óo]n|nube|cloud|aplicaci[óo]n(?:es)?|apps?|arquitectura|perfil|[íi]ndice|embedding|rag|m[óo]vil(?:es)?|nativa|nativas)\s+(?:h[ií]brid\w*|hybrid\w*)|(?:h[ií]brid\w*|hybrid\w*)\s+(?:search|retrieval|rag|cloud)/i;

/** "Remoto / híbrido": la opción remota existe y es la que tomaría. */
const REMOTE_OR_HYBRID = /remot[oa]s?\s*(?:\/|\bo\b|\by\b)\s*h[ií]brid\w*|h[ií]brid\w*\s*(?:\/|\bo\b)\s*remot[oa]s?|remote\s*(?:\/|&|\bor\b)\s*hybrid|hybrid\s*(?:\/|&|\bor\b)\s*remote/i;

/** Presencia de oficina puntual, no modalidad. Solo se perdona si además se nombra Venezuela. */
const PUNCTUAL_ONSITE = /(puntual\w*|ocasional\w*|espor[áa]dic\w*|una\s+vez\s+al\s+mes|\d\s*(?:d[íi]as?|veces?)\s+(?:al|por)\s+mes)/i;

/** Todas las formas de decir "no hay que ir a la oficina". */
const REMOTE = String.raw`(?:remot[eoa]s?|home\s*-?\s*office|teletrabaj\w*|trabajo\s+a\s+distancia|\ba\s+distancia\b|desde\s+casa|work\s+from\s+home|\bwfh\b|deslocalizad\w*)`;
const REMOTE_RE = new RegExp(REMOTE, 'i');

/** Un "no" delante de un equipo o cliente significa que el país es de la empresa, no del puesto. */
const NOT_A_RESTRICTION = /equipo|team|cliente|client|colabora|junto|partner|oficina central/i;

function isPunctualVenezuelaVisit(t: string): boolean {
  const onsite = /presencial\w*/.exec(t);
  const window = onsite ? t.slice(Math.max(0, onsite.index - 60), onsite.index + 60) : '';
  return VENEZUELA_MARKS.some((m) => t.includes(m)) && REMOTE_RE.test(t) && PUNCTUAL_ONSITE.test(window);
}

function hasNonTechnicalHybrid(t: string): boolean {
  for (const m of t.matchAll(/h[ií]brid\w*|hybrid\w*/g)) {
    const i = m.index ?? 0;
    const window = t.slice(Math.max(0, i - 40), i + m[0].length + 40);
    if (!TECHNICAL_HYBRID.test(window)) return true;
  }
  return false;
}

/** ¿Hay que ir a una oficina de verdad? Una sola mención de "presencial" basta para descartar. */
export function requiresOnsite(text: string): boolean {
  const t = text.toLowerCase();
  if (REMOTE_OR_HYBRID.test(t)) return false;
  const hardOnsite = /presencial|on-?site/i.test(t);
  if (hardOnsite && !isPunctualVenezuelaVisit(t)) return true;
  return hasNonTechnicalHybrid(t);
}

function nearRemote(t: string, first: string, second: string): boolean {
  const match = new RegExp(`${first}([^.]{0,14})${second}`, 'i').exec(t);
  return !!match && !NOT_A_RESTRICTION.test(match[1] ?? '');
}

function restrictsToOtherCountry(t: string): boolean {
  const country = RESTRICTED_COUNTRIES.find((c) => wordIn(t, c));
  if (!country) return false;
  return RESTRICTION_MARKS.some((m) => t.includes(m))
    || nearRemote(t, REMOTE, country)
    || nearRemote(t, country, REMOTE);
}

/**
 * ¿Dónde se puede trabajar desde esta oferta?
 *
 * El orden importa: lo presencial manda sobre todo, Venezuela encaja aunque
 * mencione otros países, y las restricciones de país se miran antes que el
 * "remoto global" genérico. Sin pistas devuelve `Unknown`, que NO descarta.
 */
export function classifyLocation(text: string): JobLocation {
  const t = text.toLowerCase();
  if (requiresOnsite(t)) return JobLocation.Onsite;
  if (VENEZUELA_MARKS.some((m) => t.includes(m))) return JobLocation.Venezuela;
  if (restrictsToOtherCountry(t)) return JobLocation.OtherCountry;
  // Una lista de tres o más países es el alcance de contratación: si Venezuela no está, no está.
  if (RESTRICTED_COUNTRIES.filter((c) => wordIn(t, c)).length >= 3) return JobLocation.OtherCountry;
  const remoteOrGlobal = REMOTE_RE.test(t) || GLOBAL_MARKS.some((m) => t.includes(m));
  if (LATAM_CITIES.some((c) => wordIn(t, c)) && !remoteOrGlobal) return JobLocation.OtherCountry;
  if (GLOBAL_MARKS.some((m) => t.includes(m))) return JobLocation.Global;
  if (REMOTE_RE.test(t)) return JobLocation.Global;
  return JobLocation.Unknown;
}

const VENEZUELAN_CURRENCY = /\bbol[íi]vares?\b|\bbs\.?s?\s*\d|\d[\d.,]*\s*bs\.?s?\b|\bbsd\b|\bvef\b|\bves\b/i;
const SELF_DECLARED_VENEZUELAN = /(empresa|compa[ñn][íi]a|startup|firma|agencia|consultora|organizaci[óo]n|somos una|grupo)\s+\w{0,12}\s*venezolan[ao]/i;
const VENEZUELAN_COMPANY_TYPE = /venezolan[ao]\s+(empresa|compa[ñn][íi]a|startup|firma)/i;
const ESTABLISHMENT_CUE = /(oficina|sede|ubicad|situad|estamos en|nos encontramos|planta|sucursal|instalaciones)/i;
const LOCATED_IN_VENEZUELA = /(oficina|sede|ubicad|situad|con sede|estamos en)\w*\s+(en\s+)?venezuela/i;

/**
 * ¿La contrata una empresa VENEZOLANA? Distinto de "remoto para Venezuela":
 * eso es lo que busca. Aquí se descarta quien paga, no quien recibe.
 */
export function isVenezuelanEmployer(text: string): boolean {
  const t = text.toLowerCase();
  if (VENEZUELAN_CURRENCY.test(t)) return true;
  if (SELF_DECLARED_VENEZUELAN.test(t) || VENEZUELAN_COMPANY_TYPE.test(t)) return true;
  const city = VENEZUELA_CITIES.find((c) => t.includes(c));
  if (city && ESTABLISHMENT_CUE.test(t)) return true;
  return LOCATED_IN_VENEZUELA.test(t);
}
