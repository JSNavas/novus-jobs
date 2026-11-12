import { JobLocation } from '../types.js';
import { COUNTRIES, REGION_MARKS, worldNamesExcept, type Country } from './countries.js';
import { wordIn } from './text-match.js';

export interface HomeGeo {
  readonly country: Country | null;
  readonly city: string | null;
}

const RESTRICTION_MARKS = [
  'solo para', 'sólo para', 'only for', 'must be based in', 'must reside', 'residentes en',
  'residents of', 'based in', 'located in', 'ubicados en', 'radicados en', 'que vivan en',
  'authorized to work in', 'work authorization', 'visa', 'no sponsorship',
  'exclusiva para', 'exclusivo para', 'exclusivamente para', 'únicamente para', 'unicamente para',
  'solo residentes', 'sólo residentes', 'debes residir', 'debe residir', 'residir en',
  'con residencia en', 'nacionalidad', 'aplica solo', 'aplica únicamente', 'open to candidates in',
];

const PLACE_LABEL = /(?:ubicaci[óo]n|localizaci[óo]n|cobertura|pa[íi]s|sede|vacante|residencia|location|country)\s*:?\s*[^.\n]{0,24}/i;

const ANYWHERE_MARKS = [
  'remoto global', 'remote global', 'fully remote', '100% remoto', '100% remote',
  'worldwide', 'work from anywhere', 'anywhere in the world', 'desde cualquier lugar',
];

const PLACE_LINE = /^[ \t]*(?:ubicaci[óo]n|localizaci[óo]n|location|pa[íi]s|country)[ \t]*:[ \t]*(.+)$/im;

const NO_PLACE_IN_LINE = [
  'global', 'anywhere', 'worldwide', 'internacional', 'international', 'mundial',
  'todo el mundo', 'cualquier lugar', 'varios', 'multiple', 'n/a', 'sin especificar',
  'no especificada', 'not specified', 'flexible',
];

const TECHNICAL_HYBRID = /(?:b[úu]squeda|search|retrieval|recuperaci[óo]n|nube|cloud|aplicaci[óo]n(?:es)?|apps?|arquitectura|perfil|[íi]ndice|embedding|rag|m[óo]vil(?:es)?|nativa|nativas)\s+(?:h[ií]brid\w*|hybrid\w*)|(?:h[ií]brid\w*|hybrid\w*)\s+(?:search|retrieval|rag|cloud)/i;

const REMOTE_OR_HYBRID = /remot[oa]s?\s*(?:\/|\bo\b|\by\b)\s*h[ií]brid\w*|h[ií]brid\w*\s*(?:\/|\bo\b)\s*remot[oa]s?|remote\s*(?:\/|&|\bor\b)\s*hybrid|hybrid\s*(?:\/|&|\bor\b)\s*remote/i;

const PUNCTUAL_ONSITE = /(puntual\w*|ocasional\w*|espor[áa]dic\w*|una\s+vez\s+al\s+mes|\d\s*(?:d[íi]as?|veces?)\s+(?:al|por)\s+mes)/i;

const REMOTE = String.raw`(?:remot[eoa]s?|home\s*-?\s*office|teletrabaj\w*|trabajo\s+a\s+distancia|\ba\s+distancia\b|desde\s+casa|work\s+from\s+home|\bwfh\b|deslocalizad\w*)`;
const REMOTE_RE = new RegExp(REMOTE, 'i');

const NOT_A_RESTRICTION = /equipo|team|cliente|client|colabora|junto|partner|oficina central/i;

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

function escapeForCountry(country: string): string {
  return country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function namesOf(countries: readonly Country[]): string[] {
  return countries.flatMap((c) => c.names);
}

function foreignNames(home: HomeGeo): string[] {
  const catalogued = namesOf(foreignCountries(home));
  return home.country ? [...catalogued, ...worldNamesExcept(home.country.code)] : catalogued;
}

function placeLine(t: string): string | null {
  const line = PLACE_LINE.exec(t)?.[1]?.trim();
  return line ? line : null;
}

type PlaceReading = 'reachable' | 'foreign' | null;

function readPlaceLine(t: string, home: HomeGeo): PlaceReading {
  const line = placeLine(t);
  if (line === null) return null;
  if (homeMarks(home).some((m) => line.includes(m))) return 'reachable';
  if (homeCities(home).some((c) => line.includes(c))) return 'reachable';
  const region = home.country ? REGION_MARKS[home.country.region] : [];
  if (region.some((m) => line.includes(m))) return 'reachable';
  if (NO_PLACE_IN_LINE.some((m) => line.includes(m))) return 'reachable';
  if (ANYWHERE_MARKS.some((m) => line.includes(m)) || REMOTE_RE.test(line)) return 'reachable';
  return 'foreign';
}

const LETTER = '[a-záéíóúñ]';
const RESTRICTION_RE = new RegExp(
  `(?<!${LETTER})(?:${RESTRICTION_MARKS.map(escapeForCountry).join('|')})(?!${LETTER})`,
  'i',
);

function restrictionNear(t: string, country: string): boolean {
  const matches = t.matchAll(new RegExp(escapeForCountry(country), 'g'));
  for (const match of matches) {
    const before = t.slice(Math.max(0, (match.index ?? 0) - 60), match.index ?? 0);
    if (RESTRICTION_RE.test(before)) return true;
  }
  return false;
}

const REMOTE_SCOPE = new RegExp(String.raw`${REMOTE}\s*[(\[]([^)\]]{1,45})[)\]]`, 'gi');

const NOT_A_PLACE_SCOPE = /overlap|timezone|time\s*zone|husos?|horari|hours|gmt|utc|[+-]\d|cet\b|est\b|pst\b|ist\b|preferr?ed|opcional|optional|full[\s-]?time|part[\s-]?time|contract/i;

const SCOPE_ABBREVIATIONS = ['us', 'u.s.', 'usa', 'uk', 'eu', 'eea', 'emea', 'apac', 'anz', 'dach', 'uae'];

function scopeNamesAPlace(scope: string, home: HomeGeo): boolean {
  if (foreignNames(home).some((name) => wordIn(scope, name))) return true;
  if (foreignCities(home).some((city) => wordIn(scope, city))) return true;
  return SCOPE_ABBREVIATIONS.some((short) => wordIn(scope, short));
}

function remoteScopeIsForeign(t: string, home: HomeGeo): boolean {
  for (const match of t.matchAll(REMOTE_SCOPE)) {
    const scope = (match[1] ?? '').trim();
    if (!scope) continue;
    if (homeMarks(home).some((m) => scope.includes(m))) continue;
    if (homeCities(home).some((c) => scope.includes(c))) continue;
    if (NO_PLACE_IN_LINE.some((m) => scope.includes(m))) continue;
    if (ANYWHERE_MARKS.some((m) => scope.includes(m))) continue;
    const region = home.country ? REGION_MARKS[home.country.region] : [];
    if (region.some((m) => scope.includes(m))) continue;
    if (scopeNamesAPlace(scope, home)) return true;
    if (NOT_A_PLACE_SCOPE.test(scope)) continue;
    return true;
  }
  return false;
}

function tiedTo(t: string, place: string): boolean {
  return restrictionNear(t, place) || nearRemote(t, REMOTE, place) || nearRemote(t, place, REMOTE);
}

function foreignCities(home: HomeGeo): string[] {
  const mine = homeCities(home);
  return foreignCountries(home).flatMap((c) => c.cities).filter((c) => !mine.includes(c));
}

function restrictsToForeignCountry(t: string, home: HomeGeo, spelled: boolean): boolean {
  if (remoteScopeIsForeign(t, home)) return true;
  const named = foreignNames(home).filter((c) => wordIn(t, c));
  if (named.some((country) => tiedTo(t, country))) return true;
  if (!spelled && named.some((country) => labelledWithCountry(t, country))) return true;
  return foreignCities(home).filter((c) => wordIn(t, c)).some((city) => tiedTo(t, city));
}

export function classifyLocation(text: string, home: HomeGeo): JobLocation {
  const t = text.toLowerCase();
  const tied = home.country !== null && restrictsToForeignCountry(t, home, readPlaceLine(t, home) !== null);

  const onsite = onsiteKind(t, home);
  if (onsite) return tied ? JobLocation.OtherCountry : onsite;

  const marks = homeMarks(home);
  if (marks.some((m) => t.includes(m))) return JobLocation.HomeCountry;
  if (homeCities(home).some((c) => wordIn(t, c))) return JobLocation.HomeCountry;

  const line = readPlaceLine(t, home);
  if (line === 'foreign') return JobLocation.OtherCountry;
  if (tied) return JobLocation.OtherCountry;
  if (line === 'reachable') return JobLocation.Global;

  const homeRegion = home.country ? REGION_MARKS[home.country.region] : [];
  if (homeRegion.some((m) => t.includes(m)) && REMOTE_RE.test(t)) return JobLocation.Global;
  if (ANYWHERE_MARKS.some((m) => t.includes(m))) return JobLocation.Global;

  if (home.country && foreignNames(home).filter((c) => wordIn(t, c)).length >= 3) {
    return JobLocation.OtherCountry;
  }

  const saysRemote = REMOTE_RE.test(t) || ANYWHERE_MARKS.some((m) => t.includes(m));
  const foreignCity = foreignCountries(home).flatMap((c) => c.cities).some((c) => wordIn(t, c));
  if (foreignCity && !saysRemote && !homeCities(home).some((c) => wordIn(t, c))) return JobLocation.OtherCountry;

  if (ANYWHERE_MARKS.some((m) => t.includes(m))) return JobLocation.Global;
  if (REMOTE_RE.test(t)) return JobLocation.Global;
  return JobLocation.Unknown;
}

const ESTABLISHMENT_CUE = /(oficina|sede|ubicad|situad|estamos en|nos encontramos|planta|sucursal|instalaciones)/i;

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

function selfDeclaredLocal(t: string, country: Country): boolean {
  const adjectives = country.adjectives.map(escapeForCountry).join('|');
  if (!adjectives) return false;
  return new RegExp(
    `(empresa|compa[ñn][íi]a|startup|firma|agencia|consultora|organizaci[óo]n|somos una|grupo)\\s+\\w{0,12}\\s*(${adjectives})`,
    'i',
  ).test(t);
}

function localCompanyType(t: string, country: Country): boolean {
  const adjectives = country.adjectives.map(escapeForCountry).join('|');
  if (!adjectives) return false;
  return new RegExp(`(${adjectives})\\s+(empresa|compa[ñn][íi]a|startup|firma)`, 'i').test(t);
}

function locatedInHome(t: string, country: Country): boolean {
  const names = country.names.map(escapeForCountry).join('|');
  return new RegExp(`(oficina|sede|ubicad|situad|con sede|estamos en)\\w*\\s+(en\\s+)?(${names})`, 'i').test(t);
}
