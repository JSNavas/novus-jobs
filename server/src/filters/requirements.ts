import { escapeRegex } from './text-match.js';

/**
 * ¿Exige inglés? 'desirable' (plus, "inglés deseable") no descarta: aparece en
 * casi todas las ofertas de LATAM y tratarlo como exigencia perdería las buenas.
 */
type EnglishRequirement = 'required' | 'desirable' | 'none';

const ENGLISH_MENTION = /ingl[ée]s|english|biling[üu]e|bilingual/i;
const BILINGUAL = /\bbiling[üu]e\b|\bbilingual\b/i;
const NOT_REQUIRED = /deseable|no\s+excluyente|no\s+es\s+excluyente|no\s+obligatorio|no\s+requerid|no\s+requiere|no\s+se\s+requiere|no\s+es\s+necesario|no\s+indispensable|sin\s+necesidad|valorable|se\s+valorar[áa]?|valoramos|se\s+valora|es\s+un\s+plus|\ba\s+plus\b|is\s+a\s+plus|nice\s+to\s+have|not\s+required|preferible|preferred|opcional|optional|b[áa]sico|basic\b|lectura/i;
const LEVEL = /avanzad|advanc|fluid|fluen|strong|conversacional|conversational|nativ|native|dominio|excelente|excellent|buen[ao]?\s|s[óo]lido|solid|alto\b|upper|intermedi|proficien|professional|business|\bb1\b|\bb2\b|\bc1\b|\bc2\b/i;
const OBLIGATION = /obligatori|requerid|se\s+requiere|requiere|required|require\b|excluyente|indispensable|imprescindible|mandatory|must\b|necesario|es\s+un\s+requisito|requisito/i;
const REAL_USE = /hablad|escrit|oral|conversar|comunicars?e|comunicaci[óo]n|communicat|reuni[óo]n|reuniones|meetings?|stand-?ups?|daily|entrevista|equipo\s+trabaja|se\s+comunicar|skills?\b|speak|written|spoken/i;
const ENGLISH_WINDOW = 70;

function englishWindows(t: string): string[] {
  return [...t.matchAll(new RegExp(ENGLISH_MENTION.source, 'gi'))].map((m) => {
    const i = m.index ?? 0;
    return t.slice(Math.max(0, i - ENGLISH_WINDOW), i + m[0].length + ENGLISH_WINDOW);
  });
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
  const required = windows.some((w) => LEVEL.test(w) || OBLIGATION.test(w) || REAL_USE.test(w));
  return required ? 'required' : 'none';
}

/** Tecnologías que no maneja, para reconocerlas dentro del texto del anuncio. */
const UNKNOWN_TECH = /(?<![a-z0-9#.])(?:asp\.net|\.net(?:\s*core)?|dotnet|java\s*\d*\+?|spring\s*boot|spring|c#|blazor|kotlin|swift|ruby\s+on\s+rails|rails|golang|go|angular|flutter|scala|elixir|phoenix|django|flask|sqlalchemy|symfony|codeigniter|wordpress|woocommerce|shopify|drupal|joomla|magento|sharepoint|salesforce|abap|cobol)(?![a-z0-9+#.])/gi;
const OPTIONAL_TECH = /deseable|valorable|se\s+valora\w*|valoramos|plus|nice\s+to\s+have|no\s+excluyente|opcional|preferible|bonus|ideal(mente)?/i;
const MIGRATION_CONTEXT = /migra\w*|legacy|reemplaz\w*|sustitu\w*|desde\s+\w*\s*hacia|monolito/i;
const TECH_WINDOW = 60;

/**
 * Tecnología ajena que el anuncio EXIGE. Nombrarla no basta: puede ser
 * deseable, una alternativa a algo que sí sabe, o el pasado del que quieren salir.
 */
export function unknownRequiredTech(text: string): string | null {
  const t = text.toLowerCase();
  for (const m of t.matchAll(UNKNOWN_TECH)) {
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
