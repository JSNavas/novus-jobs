import { escapeRegex } from './text-match.js';

/**
 * ¿Exige inglés? 'desirable' (plus, "inglés deseable") no descarta: aparece en
 * casi todas las ofertas de LATAM y tratarlo como exigencia perdería las buenas.
 */
type EnglishRequirement = 'required' | 'desirable' | 'none';

const ENGLISH_MENTION = /ingl[ée]s|english|biling[üu]e|bilingual/i;
const BILINGUAL = /\bbiling[üu]e\b|\bbilingual\b/i;
const NOT_REQUIRED = /deseable|no\s+excluyente|no\s+es\s+excluyente|no\s+obligatorio|no\s+requerid|no\s+requiere|no\s+se\s+requiere|no\s+es\s+necesario|no\s+indispensable|sin\s+necesidad|valorable|se\s+valorar[áa]?|valoramos|se\s+valora|es\s+un\s+plus|\ba\s+plus\b|is\s+a\s+plus|nice\s+to\s+have|not\s+required|preferible|preferred|opcional|optional/i;

/**
 * UN NIVEL BAJO SÍ LO TIENE, aunque el anuncio lo marque como excluyente.
 *
 * El CV dice "inglés B1 en progreso, lectura técnica fluida". Así que "inglés
 * A2 (excluyente)" o "inglés básico, lectura y escritura" NO son un motivo
 * para descartar: son requisitos que cumple. Antes "excluyente" mandaba sobre
 * todo y tiraba ofertas que le servían — y un descarte así no se ve nunca.
 *
 * B1 y por encima siguen descartando: ahí el CV dice "en progreso", que no es
 * lo mismo que tenerlo.
 */
const LOW_LEVEL = /\ba1\b|\ba2\b|b[áa]sic[oa]|basic\b|elemental|principiante|lectura|reading|comprensi[óo]n\s+lectora|escrit[oa]\s+b[áa]sic|t[ée]cnico\s+b[áa]sico/i;
const LEVEL = /avanzad|advanc|fluid|fluen|strong|conversacional|conversational|nativ|native|dominio|excelente|excellent|buen[ao]?\s|s[óo]lido|solid|alto\b|upper|intermedi|proficien|professional|business|\bb1\b|\bb2\b|\bc1\b|\bc2\b/i;
const OBLIGATION = /obligatori|requerid|se\s+requiere|requiere|required|require\b|excluyente|indispensable|imprescindible|mandatory|must\b|necesario|es\s+un\s+requisito|requisito/i;
const REAL_USE = /hablad|escrit|oral|conversar|comunicars?e|comunicaci[óo]n|communicat|reuni[óo]n|reuniones|meetings?|stand-?ups?|daily|entrevista|equipo\s+trabaja|se\s+comunicar|skills?\b|speak|written|spoken/i;
const ENGLISH_WINDOW = 70;
/** Donde termina un requisito y empieza el siguiente: salto de línea o viñeta. */
const BULLET = /[\n\r]|[✔✅☑✓⭐★•●▪►▶→·]|(?:^|\s)-\s/;

/**
 * La ventana se corta en la VIÑETA, no a los 70 caracteres a pelo.
 *
 * Con la ventana ciega pasó esto, medido con una oferta real:
 *
 *     ✔️ Inglés Upper Intermediate (B2+), excluyente.
 *     ⭐ Se valorará:
 *
 * Los 70 caracteres siguientes a "Inglés" se comían el "Se valorará" del
 * requisito SIGUIENTE, `NOT_REQUIRED` lo daba por "deseable" y la oferta se
 * mandaba pese a exigir un inglés que él no tiene. El texto decía "excluyente"
 * dos palabras antes. Cada viñeta es un requisito y se juzga sola.
 */
function englishWindows(t: string): string[] {
  return [...t.matchAll(new RegExp(ENGLISH_MENTION.source, 'gi'))].map((m) => {
    const i = m.index ?? 0;
    const end = i + m[0].length;
    const before = t.slice(Math.max(0, i - ENGLISH_WINDOW), i);
    const after = t.slice(end, end + ENGLISH_WINDOW);
    return cutAtBullet(before, 'start') + m[0] + cutAtBullet(after, 'end');
  });
}

/** Recorta por el lado que toca en cuanto aparece una viñeta o un salto de línea. */
function cutAtBullet(fragment: string, side: 'start' | 'end'): string {
  const marks = [...fragment.matchAll(new RegExp(BULLET.source, 'gu'))];
  if (!marks.length) return fragment;
  if (side === 'end') return fragment.slice(0, marks[0]!.index ?? 0);
  const last = marks[marks.length - 1]!;
  return fragment.slice((last.index ?? 0) + last[0].length);
}

/**
 * Se mira una VENTANA alrededor de cada mención, no frases completas: los
 * reclutadores escriben "inglés avanzado", "nivel de inglés: C1" y "se requiere
 * inglés", y cubrir eso con frases enteras exige una lista infinita.
 */
export function englishRequirement(text: string): EnglishRequirement {
  const t = text.toLowerCase();
  if (!ENGLISH_MENTION.test(t)) return 'none';
  if (BILINGUAL.test(t)) return 'required';
  const windows = englishWindows(t);
  // Lo que dice expresamente que NO es obligatorio manda sobre todo lo demás.
  if (windows.some((w) => NOT_REQUIRED.test(w))) return 'desirable';
  // Y un nivel bajo tampoco descarta, lo pidan como lo pidan: es el que tiene.
  if (windows.some((w) => LOW_LEVEL.test(w))) return 'desirable';
  const required = windows.some((w) => LEVEL.test(w) || OBLIGATION.test(w) || REAL_USE.test(w));
  return required ? 'required' : 'none';
}

/**
 * Las tecnologías que no maneja salen del PERFIL, no de una lista paralela.
 *
 * Antes había dos sitios que decían lo mismo —`profile.cannotDo` y una
 * expresión regular aquí— y, como siempre que hay dos, divergieron: la regex
 * nunca supo de C++ (y así una oferta que pedía "3+ años de backend con C++"
 * se mandaba igual) y en cambio sí vetaba Symfony, que él SÍ sabe. Añadir una
 * tecnología es ahora una línea en `profile.ts` y nada más.
 *
 * `C++`, `C#` y `.NET` obligan a cuidar los bordes: el `\b` de toda la vida no
 * funciona junto a `+`, `#` ni `.`, así que los límites se construyen a mano.
 */
const TECH_PATTERN_CACHE = new Map<string, RegExp>();

function unknownTechPattern(cannotDo: readonly string[]): RegExp {
  const key = cannotDo.join('|');
  const cached = TECH_PATTERN_CACHE.get(key);
  if (cached) return cached;
  // Las más largas primero: así "ruby on rails" gana a "ruby" y ".net core" a ".net".
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
const OPTIONAL_TECH = /deseable|valorable|se\s+valora\w*|valoramos|plus|nice\s+to\s+have|no\s+excluyente|opcional|preferible|bonus|ideal(mente)?/i;
const MIGRATION_CONTEXT = /migra\w*|legacy|reemplaz\w*|sustitu\w*|desde\s+\w*\s*hacia|monolito/i;
const TECH_WINDOW = 60;

/**
 * Tecnología ajena que el anuncio EXIGE. Nombrarla no basta: puede ser
 * deseable, una alternativa a algo que sí sabe, o el pasado del que quieren salir.
 */
export function unknownRequiredTech(text: string, cannotDo: readonly string[]): string | null {
  const t = text.toLowerCase();
  for (const m of t.matchAll(unknownTechPattern(cannotDo))) {
    const i = m.index ?? 0;
    const window = t.slice(Math.max(0, i - TECH_WINDOW), i + m[0].length + TECH_WINDOW);
    if (OPTIONAL_TECH.test(window)) continue;
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

/**
 * ¿La tecnología ajena vive en una ENUMERACIÓN donde también hay algo suyo?
 * Se mira la cadena entera: en "Node.js, TypeScript, Python, Go o C#/.NET"
 * basta que aparezca algo que sabe para que sea un menú y no un requisito.
 */
function isAlternativeToKnownTech(t: string, i: number, length: number): boolean {
  const chain = new RegExp(`${LIST_ITEM}(?:${LIST_SEPARATOR}${LIST_ITEM})+`, 'gi');
  const end = i + length;
  for (const c of t.matchAll(chain)) {
    const from = c.index ?? 0;
    if (from > i || from + c[0].length < end) continue;
    if (KNOWN_TECH.test(c[0])) return true;
  }
  const sentence = t.slice(Math.max(0, i - 120), end + 120);
  return CHOOSE_ONE.test(sentence) && KNOWN_TECH.test(sentence);
}

const STACKS_FOREIGN = /\b(\.net|dotnet|asp\.net|c#|blazor|java\b|spring\s*boot|kotlin|swift\b|ruby\s+on\s+rails|\brails\b|golang|\bgo\b|angular|flutter|scala|elixir|phoenix|drupal|umbraco|sharepoint|salesforce|abap|cobol)\b/i;
const OWN_ROLES = /\b(front[\s-]?end|back[\s-]?end|full[\s-]?stack|web\s+developer|desarrollador(a)?\s+web|software\s+engineer|desarrollador(a)?\s+(de\s+)?software)\b/i;

/**
 * El puesto es de lo suyo aunque el anuncio no liste tecnologías: los anuncios
 * cortos listan el rol, no el stack. Solo cuenta si no hay otro ecosistema mandando.
 */
export function isOwnRole(text: string): boolean {
  return OWN_ROLES.test(text) && !STACKS_FOREIGN.test(text);
}

/** Solo coincide en JavaScript, de refilón, en un puesto de otro ecosistema (.NET, Java…). */
export function isOtherEcosystem(text: string, coreMatch: readonly string[]): boolean {
  const onlyJs = coreMatch.length > 0 && coreMatch.every((x) => /^javascript$/i.test(x));
  return onlyJs && STACKS_FOREIGN.test(text);
}

const SEVERAL_OPENINGS = new RegExp(String.raw`\b[2-9]\s*(?:vacantes|posiciones|perfiles|oportunidades|roles|puestos|b[úu]squedas)\b`, 'i');
const NUMBERED_ROLE = new RegExp(String.raw`[1-9][.)️⃣]?[\s️⃣]*(?:desarrollador\w*|ingenier\w*|developer|engineer|arquitect\w*|analista|tech\s*lead|dise[ñn]ador\w*|frontend|front-end|backend|back-end|full\s?stack|qa\b|data\b)`, 'gi');

/**
 * El anuncio lleva VARIAS vacantes. El veto por tecnología no puede aplicarse:
 * la tecnología ajena puede pertenecer a otro puesto del mismo anuncio.
 */
export function hasSeveralOpenings(text: string): boolean {
  if (SEVERAL_OPENINGS.test(text)) return true;
  return [...text.matchAll(NUMBERED_ROLE)].length >= 2;
}
