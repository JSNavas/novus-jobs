import { isOurOwnLine } from './offer.js';
const CONNECTION_LINE = /^[•·]\s*(1er|2o|2do|3er|3o|siguiendo|seguir|seguido por\b.*)\s*\+?$/i;
const MAX_NAME_LINE = 60;
const AUTHOR_HEADLINE = /\s[|·/]\s|@\w|\b(recruiter|talent|headhunter|founder|ceo|cto|coo|manager|partner|consultor|selecci[óo]n|recursos humanos|rrhh|hiring)\b/i;
const DECORATION = /^[\s!¡?¿.·•▪—–\-–—🔁♻️↗️➡️⬇️🔽⚡️🚀✨💥🎯👇👉🔥💼📢📣🗣️]*$/u;

function isNoise(line: string): boolean {
  return line.length === 0 || DECORATION.test(line);
}

export function stripAuthorHeaders(text: string): string {
  let lines = text.split('\n');
  for (let round = 0; round < 3; round++) {
    let i = 0;
    while (i < lines.length && isNoise(lines[i]!.trim())) i++;
    const name = lines[i]?.trim() ?? '';
    if (!name || name.length > MAX_NAME_LINE) break;
    const next = lines[i + 1]?.trim() ?? '';
    if (!CONNECTION_LINE.test(next)) break;
    let cut = i + 2;
    const headline = lines[cut]?.trim() ?? '';
    if (headline && headline.length <= 200 && AUTHOR_HEADLINE.test(headline)) cut++;
    const rest = lines.slice(cut);
    if (rest.join('\n').trim().length < 60) break;
    lines = rest;
  }
  const body = lines.join('\n').trim();
  return body.length >= 60 ? body : text.trim();
}

const ROLE = String.raw`(?:desarrollador\w*|programador\w*|ingenier\w*|arquitect\w*|analista|dise[ñn]ador\w*|developer|engineer|architect|designer|tech\s*lead|team\s*lead|scrum\s*master|product\s*owner|qa\b|devops|sre\b|data\s*(?:engineer|scientist|analyst))`;
const MODIFIER = String.raw`(?:\s+(?:de|en|para|full[\s-]?stack|fullstack|front[\s-]?end|back[\s-]?end|web|m[óo]vil|mobile|senior|sr\.?|semi[\s-]?senior|ssr|junior|jr\.?|ssr\.?|l[íi]der|[a-záéíóúñ0-9.#+]+))`;

const LOOKING_FOR = new RegExp(
  String.raw`(?:buscamos|estamos\s+buscando|se\s+busca|buscando|requerimos|necesitamos|incorporar(?:\s+a)?|vacante\s+(?:de|para)|puesto\s+de|posici[óo]n\s+de|b[úu]squeda\s+de)\s*` +
  String.raw`(?:un[ao]?(?:\/a)?|a|an|el|la|\d+)?\s*` +
  String.raw`(${ROLE}${MODIFIER}{0,3})`,
  'i',
);
const TITLE_LINE = new RegExp(String.raw`^.{0,80}${ROLE}.{0,60}$`, 'i');
const MAX_TITLE = 90;
const MIN_TITLE = 4;
const SENTENCE = /[.!?]\s+\S|[.!?]$|,\s+(?:que|donde|porque|y\s+que)\b/;
const HASHTAG_LINE = /#\w/;
const DANGLING = /\b(?:de|del|en|para|con|por|a|al|y|o|the|of|for|el|la|los|las|un|una)$/i;

function clean(value: string): string {
  return value
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s¡!¿?.,·•\-–—|/]+|[\s.,;:¡!¿?·•\-–—|/]+$/g, '')
    .trim();
}

function usableTitle(title: string): boolean {
  return title.length >= 5 && title.length <= MAX_TITLE && !DANGLING.test(title) && !HASHTAG_LINE.test(title);
}

function looksLikeSentence(line: string): boolean {
  return SENTENCE.test(line);
}

export function jobTitle(adText: string): string | null {
  const phrase = adText.match(LOOKING_FOR);
  if (phrase?.[1]) {
    const title = clean(phrase[1]);
    if (usableTitle(title)) return title;
  }
  for (const raw of adText.split('\n').slice(0, 8)) {
    if (HASHTAG_LINE.test(raw)) continue;
    const line = clean(raw);
    if (usableTitle(line) && !looksLikeSentence(line) && TITLE_LINE.test(line)) return line;
  }
  return null;
}

export function offerTitle(adText: string): string {
  const title = jobTitle(adText);
  if (title) return title;
  const theirs = adText.split('\n').filter((line) => !isOurOwnLine(line)).map(clean);
  const line = theirs.find((l) => l.length >= MIN_TITLE) ?? theirs.find((l) => l.length > 0);
  return shorten(line ?? clean(adText)) || 'Publicación sin título';
}

function shorten(value: string): string {
  if (value.length <= MAX_TITLE) return value;
  const cut = value.slice(0, MAX_TITLE);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const COMPANY = [
  /\b[Ee]n\s+([A-ZÁÉÍÓÚÑ][\w.&'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w.&'-]*){0,3})\s+(?:estamos|buscamos|nos\s+encontramos|seguimos|necesitamos)/,
  /\b(?:[Ee]mpresa|[Cc]ompañ[íi]a|[Cc]liente|[Ss]tartup)\s*:?\s*([A-ZÁÉÍÓÚÑ][\w.&'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w.&'-]*){0,3})/,
  /\b(?:at|en|de)\s+@([A-Za-z][\w.&-]{2,30})\b/i,
];

export function companyName(adText: string): string | null {
  for (const pattern of COMPANY) {
    const match = adText.match(pattern);
    const name = match?.[1] ? clean(match[1]) : '';
    if (name.length >= 2) return name.slice(0, 60);
  }
  return null;
}

const MODIFIER_ALT = String.raw`full[\s-]?stack|fullstack|front[\s-]?end|frontend|back[\s-]?end|backend|web|m[óo]vil|mobile|software|data|cloud|senior|sr\.?|semi[\s-]?senior|ssr|junior|jr\.?|tech|team|product|scrum`;
const ROLE_ALT = String.raw`desarrollador\w*|programador\w*|ingenier\w*|arquitect\w*|analista|dise[ñn]ador\w*|developer|engineer|architect|designer|lead|qa|devops|sre`;
const ROLE_PHRASE = new RegExp(
  String.raw`(?:(?:${MODIFIER_ALT})\s+)*(?:${ROLE_ALT})(?:\s+(?:${ROLE_ALT}))?(?:\s+(?:${MODIFIER_ALT}))*`,
  'i',
);

export function roleOnly(title: string | null): string | null {
  if (!title) return null;
  const head = clean(title.replace(/\([^)]*\)/g, ' ').split(/[·|/•—–]|\s-\s/)[0] ?? '');
  const phrase = ROLE_PHRASE.exec(head)?.[0];
  const role = clean(phrase ?? head);
  return role.length >= 3 ? role : null;
}
