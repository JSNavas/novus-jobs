import { ENGLISH_LEVELS, type EnglishLevel } from '../profile/types.js';
import { escapeRegex } from './text-match.js';

export interface EnglishDemand {
  level: EnglishLevel;
  mandatory: boolean;
}

const ENGLISH_MENTION = /ingl[ée]s|english|biling[üu]e|bilingual/i;
const BILINGUAL = /\bbiling[üu]e\b|\bbilingual\b/i;
const NOT_REQUIRED = /deseable|no\s+excluyente|no\s+es\s+excluyente|no\s+obligatorio|no\s+requerid|no\s+requiere|no\s+se\s+requiere|no\s+es\s+necesario|no\s+indispensable|sin\s+necesidad|valorable|se\s+valorar[áa]?|valoramos|se\s+valora|es\s+un\s+plus|\ba\s+plus\b|is\s+a\s+plus|nice\s+to\s+have|not\s+required|preferible|preferred|opcional|optional/i;

const LEVEL_MARKS: ReadonlyArray<readonly [EnglishLevel, RegExp]> = [
  ['native', /\bnativ\w*|\bnative\b|biling[üu]e|bilingual/i],
  ['c2', /\bc2\b|dominio\s+total|proficiency/i],
  ['c1', /\bc1\b|avanzad|advanc|fluid|fluen|excelente|excellent|s[óo]lido|solid|business|proficien/i],
  ['b2', /\bb2\b|upper|intermedio\s+alto|conversacional|conversational|strong|professional|buen[ao]?\s|alto\b/i],
  ['b1', /\bb1\b|intermedi/i],
  ['a2', /\ba2\b|b[áa]sic[oa]|basic\b|elemental|lectura|reading|comprensi[óo]n\s+lectora|escrit[oa]\s+b[áa]sic|t[ée]cnico\s+b[áa]sico/i],
  ['a1', /\ba1\b|principiante|beginner/i],
];

const INTERMEDIATE_ADVANCED = /intermedi\w*[\s-]*(?:alto|avanzad\w*|advanc\w*)|intermediate[\s-]*advanced/i;

function demandedLevel(window: string): EnglishLevel | null {
  if (INTERMEDIATE_ADVANCED.test(window)) return 'b2';
  const found = LEVEL_MARKS.filter(([, re]) => re.test(window)).map(([level]) => level);
  if (!found.length) return null;
  return found.reduce((a, b) => (ENGLISH_LEVELS.indexOf(a) >= ENGLISH_LEVELS.indexOf(b) ? a : b));
}

const OBLIGATION = /obligatori|requerid|se\s+requiere|requiere|required|require\b|excluyente|indispensable|imprescindible|mandatory|must\b|necesario|es\s+un\s+requisito|requisito/i;
const REAL_USE = /hablad|escrit|oral|conversar|comunicars?e|comunicaci[óo]n|communicat|reuni[óo]n|reuniones|meetings?|stand-?ups?|daily|entrevista|equipo\s+trabaja|se\s+comunicar|skills?\b|speak|written|spoken/i;
const ENGLISH_WINDOW = 70;
const BULLET = /[\n\r]|[✔✅☑✓⭐★•●▪►▶→·]|(?:^|\s)-\s/;

function englishWindows(t: string): string[] {
  return [...t.matchAll(new RegExp(ENGLISH_MENTION.source, 'gi'))].map((m) => {
    const i = m.index ?? 0;
    const end = i + m[0].length;
    const before = t.slice(Math.max(0, i - ENGLISH_WINDOW), i);
    const after = t.slice(end, end + ENGLISH_WINDOW);
    return cutAtBullet(before, 'start') + m[0] + cutAtBullet(after, 'end');
  });
}

function cutAtBullet(fragment: string, side: 'start' | 'end'): string {
  const marks = [...fragment.matchAll(new RegExp(BULLET.source, 'gu'))];
  if (!marks.length) return fragment;
  if (side === 'end') return fragment.slice(0, marks[0]!.index ?? 0);
  const last = marks[marks.length - 1]!;
  return fragment.slice((last.index ?? 0) + last[0].length);
}

export function englishDemand(text: string): EnglishDemand {
  const t = text.toLowerCase();
  if (!ENGLISH_MENTION.test(t)) return { level: 'none', mandatory: false };
  if (BILINGUAL.test(t)) return { level: 'native', mandatory: true };
  const windows = englishWindows(t);
  const level = windows.map(demandedLevel).reduce<EnglishLevel | null>(
    (best, next) => (next && (!best || ENGLISH_LEVELS.indexOf(next) > ENGLISH_LEVELS.indexOf(best)) ? next : best),
    null,
  );
  if (windows.some((w) => NOT_REQUIRED.test(w))) return { level: level ?? 'none', mandatory: false };
  const mandatory = windows.some((w) => demandedLevel(w) !== null || OBLIGATION.test(w) || REAL_USE.test(w));
  if (mandatory && !level) return { level: 'b2', mandatory: true };
  return { level: level ?? 'none', mandatory };
}

const TECH_PATTERN_CACHE = new Map<string, RegExp>();

function unknownTechPattern(cannotDo: readonly string[]): RegExp {
  const key = cannotDo.join('|');
  const cached = TECH_PATTERN_CACHE.get(key);
  if (cached) return cached;
  const alternatives = [...cannotDo]
    .sort((a, b) => b.length - a.length)
    .map((tech) => escapeRegex(tech.toLowerCase()).replace(/ /g, String.raw`\s+`))
    .join('|');
  const pattern = new RegExp(
    String.raw`(?<![a-z0-9#+.])(?:${alternatives})(?![a-z0-9#+]|\.[a-z])`,
    'gi',
  );
  TECH_PATTERN_CACHE.set(key, pattern);
  return pattern;
}
const ALSO_A_PLAIN_WORD = new Set([
  'go', 'spark', 'rails', 'backbone', 'phoenix', 'unity', 'unreal', 'swift', 'dart',
  'rust', 'ruby', 'julia', 'groovy', 'informatica', 'informática', 'ember', 'flutter',
  'scala', 'pascal', 'delphi', 'struts', 'talend',
]);

const TECH_CUE = /experien|conocimient|dominio|manejo|lenguaje|language|programaci|programming|developer|desarroll\w*|engineer|ingenier|framework|backend|back-end|frontend|front-end|microservi|migra\w*|proficien|expertise|familiar/i;

const PLAIN_WORD_WINDOW = 40;

const OPTIONAL_TECH = /deseable|valorable|se\s+valora\w*|valoramos|plus|nice\s+to\s+have|no\s+excluyente|opcional|preferible|bonus|ideal(mente)?/i;
const MIGRATION_CONTEXT = /migra\w*|legacy|reemplaz\w*|sustitu\w*|desde\s+\w*\s*hacia|monolito/i;
const TECH_WINDOW = 60;

function namedAsTechnology(t: string, index: number, length: number): boolean {
  if (t[index - 1] === '-' || t[index + length] === '-') return false;
  const near = t.slice(Math.max(0, index - PLAIN_WORD_WINDOW), index + length + PLAIN_WORD_WINDOW);
  return TECH_CUE.test(near);
}

export function unknownRequiredTech(text: string, cannotDo: readonly string[]): string | null {
  const t = text.toLowerCase();
  for (const m of t.matchAll(unknownTechPattern(cannotDo))) {
    const i = m.index ?? 0;
    const window = t.slice(Math.max(0, i - TECH_WINDOW), i + m[0].length + TECH_WINDOW);
    if (OPTIONAL_TECH.test(window)) continue;
    if (ALSO_A_PLAIN_WORD.has(m[0]) && !namedAsTechnology(t, i, m[0].length)) continue;
    if (isAlternativeToKnownTech(t, i, m[0].length)) continue;
    if (MIGRATION_CONTEXT.test(window)) continue;
    return m[0];
  }
  return null;
}

const LIST_SEPARATOR = String.raw`(?:\s*(?:,|/|\||·|•|;|\by\/o\b|\bo\b|\bu\b|\bor\b)\s*)`;
const LIST_ITEM = String.raw`\.?[a-záéíóúñ0-9][a-záéíóúñ0-9.#+_-]*(?:\s+(?!(?:o|u|y|or|and)\b)\.?[a-záéíóúñ0-9][a-záéíóúñ0-9.#+_-]*){0,2}`;
const KNOWN_TECH = /\b(node(?:js|\.js)?|typescript|javascript|react|reactjs|vue(?:js|\.js)?|nuxt|next(?:js|\.js)?|php|laravel|python|nest(?:js|\.js)?|fastapi|express)\b/i;
const CHOOSE_ONE = /al\s+menos\s+uno|alguno?\s+de\s+(?:los|las)|cualquiera\s+de|o\s+similar(?:es)?|u\s+otr[ao]s?|entre\s+otr[ao]s|o\s+equivalentes?/i;
const DISJUNCTIVE = /\/|\||\by\/o\b|\bo\b|\bu\b|\bor\b/i;

function isAlternativeToKnownTech(t: string, i: number, length: number): boolean {
  const chain = new RegExp(`${LIST_ITEM}(?:${LIST_SEPARATOR}${LIST_ITEM})+`, 'gi');
  const end = i + length;
  for (const c of t.matchAll(chain)) {
    const from = c.index ?? 0;
    if (from > i || from + c[0].length < end) continue;
    if (KNOWN_TECH.test(c[0]) && DISJUNCTIVE.test(c[0])) return true;
  }
  const sentence = t.slice(Math.max(0, i - 120), end + 120);
  return CHOOSE_ONE.test(sentence) && KNOWN_TECH.test(sentence);
}

const STACKS_FOREIGN = /\b(\.net|dotnet|asp\.net|c#|blazor|java\b|spring\s*boot|kotlin|swift\b|ruby\s+on\s+rails|\brails\b|golang|\bgo\b|angular|flutter|scala|elixir|phoenix|drupal|umbraco|sharepoint|salesforce|abap|cobol)\b/i;
const OWN_ROLES = /\b(front[\s-]?end|back[\s-]?end|full[\s-]?stack|web\s+developer|desarrollador(a)?\s+web|software\s+engineer|desarrollador(a)?\s+(de\s+)?software)\b/i;

export function isOwnRole(text: string): boolean {
  return OWN_ROLES.test(text) && !STACKS_FOREIGN.test(text);
}

export function isOtherEcosystem(text: string, coreMatch: readonly string[]): boolean {
  const onlyJs = coreMatch.length > 0 && coreMatch.every((x) => /^javascript$/i.test(x));
  return onlyJs && STACKS_FOREIGN.test(text);
}

// ── Experience ────────────────────────────────────────────────────────────────
// What the ad asks for, read two ways: the years it writes ("5+ years of
// experience", "mínimo 3 años") and the level a board states on its own line
// ("Nivel: Semi Senior" from Get on Board). Both are read conservatively: the
// rule that uses them only discards what is clearly far above the person.

const YEARS_UNIT = String.raw`(?:years?|yrs?\.?|años|anos)`;
const YEARS_MENTION = new RegExp(
  String.raw`(?:\+\s*)?(\d{1,2})\s*\+?\s*(?:(?:-|–|a|to|y|or|o)\s*(\d{1,2})\s*\+?\s*)?${YEARS_UNIT}`,
  'gi',
);
const EXPERIENCE_CUE = /experien|trayectoria|track\s+record/i;
const OPTIONAL_EXPERIENCE = /deseable|valorable|se\s+valora\w*|valoramos|\bplus\b|nice\s+to\s+have|no\s+excluyente|opcional|optional|preferibl\w*|preferr?ed|preferably|ideal(?:mente|ly)?|bonus/i;
// "We have 15 years of experience", "una empresa con 10 años en el mercado":
// the company bragging, not a requirement.
const ABOUT_THE_COMPANY = /\b(?:we|we've|we're|our|us|tenemos|contamos|nuestr[oa]s?|empresa|company|compañía|founded|fundad[ao]s?|en\s+el\s+mercado|in\s+the\s+market|in\s+business|clientes|clients)\b/i;
const EXPERIENCE_WINDOW = 60;
const MAX_DEMANDED_YEARS = 20;
// A clause ends at a line, a bullet or a punctuation mark followed by a space,
// so "5 años de experiencia, deseable 2 con AWS" reads as two separate demands.
const CLAUSE_BREAK = new RegExp(String.raw`${BULLET.source}|[.;,!?](?=\s|$)`, 'gu');

function clauseAround(t: string, index: number, length: number): string {
  const before = t.slice(Math.max(0, index - EXPERIENCE_WINDOW), index);
  const after = t.slice(index + length, index + length + EXPERIENCE_WINDOW);
  const breaksBefore = [...before.matchAll(CLAUSE_BREAK)];
  const last = breaksBefore[breaksBefore.length - 1];
  const start = last ? (last.index ?? 0) + last[0].length : 0;
  const firstAfter = [...after.matchAll(CLAUSE_BREAK)][0];
  const end = firstAfter ? firstAfter.index ?? after.length : after.length;
  return before.slice(start) + t.slice(index, index + length) + after.slice(0, end);
}

/**
 * The most years of experience the ad makes mandatory, or null when it asks
 * for none. A range counts by its floor: "3-5 years" lets three in.
 */
export function demandedYears(text: string): number | null {
  const t = text.toLowerCase();
  let most: number | null = null;
  for (const m of t.matchAll(YEARS_MENTION)) {
    const years = Number(m[1]);
    if (!Number.isInteger(years) || years > MAX_DEMANDED_YEARS) continue;
    const window = clauseAround(t, m.index ?? 0, m[0].length);
    if (!EXPERIENCE_CUE.test(window)) continue;
    if (OPTIONAL_EXPERIENCE.test(window) || ABOUT_THE_COMPANY.test(window)) continue;
    if (most === null || years > most) most = years;
  }
  return most;
}

export interface StatedLevel {
  /** As the ad wrote it, for the reason shown to the person. */
  readonly label: string;
  /** The fewest years that level usually means. */
  readonly years: number;
}

const LEVEL_LINE = /^[ \t]*(?:nivel|seniority(?:\s+level)?)[ \t]*:[ \t]*(.+)$/im;
// Checked in this order: "semi senior" before "senior", "expert" before both.
const LEVEL_YEARS: ReadonlyArray<readonly [RegExp, number]> = [
  [/\bsemi[\s-]?senior\b|\bssr\b|\bmid(?:[\s-]?level)?\b/i, 2],
  [/\bexpert[oa]?\b|\blead\b|\bstaff\b|\bprincipal\b|\barchitect\b|\barquitect[oa]\b/i, 7],
  [/\bsenior\b|\bsr\b/i, 5],
  [/\bjunior\b|\bjr\b/i, 0],
  [/sin\s+experiencia|no\s+experience|\btrainee\b|\bintern(?:ship)?\b|pasant[ií]a|practicante|\bentry[\s-]?level\b/i, 0],
];

/**
 * The level a board states on a line of its own ("Nivel: Senior"). When it
 * names several ("Semisenior / Senior") the lowest one is the door.
 */
export function statedLevel(text: string): StatedLevel | null {
  const line = LEVEL_LINE.exec(text)?.[1]?.trim();
  if (!line) return null;
  const parts = line.split(/\s*(?:\/|,|\bor\b|\bo\b|\by\b|\band\b)\s*/i).filter(Boolean);
  let lowest: number | null = null;
  for (const part of parts) {
    const found = LEVEL_YEARS.find(([re]) => re.test(part));
    if (found && (lowest === null || found[1] < lowest)) lowest = found[1];
  }
  return lowest === null ? null : { label: line.replace(/[.\s]+$/, ''), years: lowest };
}

const SEVERAL_OPENINGS = new RegExp(String.raw`\b[2-9]\s*(?:vacantes|posiciones|perfiles|oportunidades|roles|puestos|b[úu]squedas)\b`, 'i');
const NUMBERED_ROLE = new RegExp(String.raw`[1-9][.)️⃣]?[\s️⃣]*(?:desarrollador\w*|ingenier\w*|developer|engineer|arquitect\w*|analista|tech\s*lead|dise[ñn]ador\w*|frontend|front-end|backend|back-end|full\s?stack|qa\b|data\b)`, 'gi');

export function hasSeveralOpenings(text: string): boolean {
  if (SEVERAL_OPENINGS.test(text)) return true;
  return [...text.matchAll(NUMBERED_ROLE)].length >= 2;
}
