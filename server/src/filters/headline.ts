/**
 * EL TÍTULO DE LA OFERTA, que LinkedIn no da.
 *
 * Una publicación del feed no tiene campo "puesto": es un churro de texto que
 * empieza con la firma de quien publica. Por eso las tarjetas salían sin
 * título y con el titular del autor pegado delante —"Gloria Luz Gaviria
 * Ramírez • 2o Asistente / data entry / 🚀 ¡Oportunidad laboral…"—, que es
 * exactamente lo que no se quiere leer para decidir si una oferta interesa.
 *
 * LA CABECERA TIENE FORMA FIJA, medida con el feed real del 2026-11-10:
 *
 *     Gloria Luz Gaviria Ramírez          ← nombre
 *     • 2o                                ← grado de conexión o "Siguiendo"
 *     Asistente / data entry / …          ← titular del autor
 *     🚀 ¡Oportunidad laboral en Colombia! ← AQUÍ empieza el anuncio
 *
 * Y en una REPUBLICACIÓN hay dos cabeceras seguidas: la de quien comparte y la
 * de quien escribió. Por eso se quitan en bucle y no una sola vez.
 */

/** "• 2o", "• Siguiendo", "• 1er", "• 3er+"… la línea del grado de conexión. */
const CONNECTION_LINE = /^[•·]\s*(1er|2o|2do|3er|3o|siguiendo|seguir|seguido por\b.*)\s*\+?$/i;
/** Un nombre de persona o empresa: corto y sin la puntuación de una frase. */
const MAX_NAME_LINE = 60;
/** El titular del autor: su cargo, casi siempre con separadores o arrobas. */
const AUTHOR_HEADLINE = /\s[|·/]\s|@\w|\b(recruiter|talent|headhunter|founder|ceo|cto|coo|manager|partner|consultor|selecci[óo]n|recursos humanos|rrhh|hiring)\b/i;
/** Ruido de LinkedIn entre publicaciones republicadas. */
const DECORATION = /^[\s!¡?¿.·•▪—–\-–—🔁♻️↗️➡️⬇️🔽⚡️🚀✨💥🎯👇👉🔥💼📢📣🗣️]*$/u;

function isNoise(line: string): boolean {
  return line.length === 0 || DECORATION.test(line);
}

/**
 * Quita las cabeceras de autor del principio. Devuelve el anuncio a secas.
 *
 * Conservador: si al quitar no queda nada con cuerpo, se devuelve el texto tal
 * cual. Quedarse sin anuncio por recortar de más es peor que un título feo.
 */
export function stripAuthorHeaders(text: string): string {
  let lines = text.split('\n');
  for (let round = 0; round < 3; round++) {
    let i = 0;
    while (i < lines.length && isNoise(lines[i]!.trim())) i++;
    const name = lines[i]?.trim() ?? '';
    if (!name || name.length > MAX_NAME_LINE) break;
    // Tras el nombre tiene que venir el grado de conexión: es lo que distingue
    // una cabecera de una primera línea corta del anuncio ("Hola a todos!").
    const next = lines[i + 1]?.trim() ?? '';
    if (!CONNECTION_LINE.test(next)) break;
    let cut = i + 2;
    // El titular del autor, si lo hay: una línea más, y solo si parece un cargo.
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

/** "buscamos un/a Desarrollador Frontend React" → el puesto. */
const LOOKING_FOR = new RegExp(
  String.raw`(?:buscamos|estamos\s+buscando|se\s+busca|buscando|requerimos|necesitamos|incorporar(?:\s+a)?|vacante\s+(?:de|para)|puesto\s+de|posici[óo]n\s+de|b[úu]squeda\s+de)\s*` +
  String.raw`(?:un[ao]?(?:\/a)?|a|an|el|la|\d+)?\s*` +
  String.raw`(${ROLE}${MODIFIER}{0,3})`,
  'i',
);
/**
 * Una línea que ES el puesto, sin más: "Backend Engineer · Node.js · Buenos Aires".
 *
 * Los puntos NO se prohíben: "Node.js" lleva uno y era lo que impedía
 * reconocer justo las líneas más útiles. Lo que descalifica a una línea es ser
 * una FRASE, y eso se mira aparte (`looksLikeSentence`).
 */
const TITLE_LINE = new RegExp(String.raw`^.{0,80}${ROLE}.{0,60}$`, 'i');
const MAX_TITLE = 90;
/** Una frase tiene final de oración o varias oraciones dentro. */
const SENTENCE = /[.!?]\s+\S|[.!?]$|,\s+(?:que|donde|porque|y\s+que)\b/;
/** Un reguero de etiquetas no es un título, por mucho que diga "developer". */
const HASHTAG_LINE = /#\w/;
/** Un título no termina en preposición ni artículo: está cortado. */
const DANGLING = /\b(?:de|del|en|para|con|por|a|al|y|o|the|of|for|el|la|los|las|un|una)$/i;

function clean(value: string): string {
  return value
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s¡!¿?.,·•\-–—|/]+|[\s.,;:¡!¿?·•\-–—|/]+$/g, '')
    .trim();
}

/** Un título que termina colgando ("Analista De") está cortado: no sirve. */
function usableTitle(title: string): boolean {
  return title.length >= 5 && title.length <= MAX_TITLE && !DANGLING.test(title) && !HASHTAG_LINE.test(title);
}

function looksLikeSentence(line: string): boolean {
  return SENTENCE.test(line);
}

/**
 * El puesto, para el título de la tarjeta. `null` si el anuncio no lo nombra:
 * inventarlo sería peor que no ponerlo.
 *
 * Se mira primero la frase "buscamos X" y después una línea que sea el puesto
 * a secas. En ese orden porque la frase es explícita y la línea es una
 * suposición, y cuando las dos existen manda la que el anuncio afirma.
 */
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

/**
 * Lo que se enseña como título de la tarjeta. SIEMPRE devuelve algo.
 *
 * Si el anuncio no nombra el puesto, vale su primera línea con contenido: es lo
 * que el usuario leería de todas formas al abrirla, y una tarjeta sin título no
 * se puede ojear — que es justo para lo que sirve una lista de ofertas.
 */
export function offerTitle(adText: string): string {
  const title = jobTitle(adText);
  if (title) return title;
  const line = adText.split('\n').map(clean).find((l) => l.length > 12);
  return shorten(line ?? clean(adText)) || 'Publicación sin título';
}

/** Recorta por palabra, no a mitad de una: "…desarrolla" no dice nada. */
function shorten(value: string): string {
  if (value.length <= MAX_TITLE) return value;
  const cut = value.slice(0, MAX_TITLE);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** "En CSTI Corp estamos buscando…", "at @deRecruiters" → la empresa. */
const COMPANY = [
  // Ojo con las mayúsculas: el conector se escribe "En" al principio de frase,
  // pero el NOMBRE tiene que seguir empezando por mayúscula —es lo que
  // distingue "En CSTI Corp estamos" de "en nuestro equipo estamos"—, así que
  // el conector se abre a las dos formas y el resto se queda sensible.
  /\b[Ee]n\s+([A-ZÁÉÍÓÚÑ][\w.&'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w.&'-]*){0,3})\s+(?:estamos|buscamos|nos\s+encontramos|seguimos|necesitamos)/,
  /\b(?:[Ee]mpresa|[Cc]ompañ[íi]a|[Cc]liente|[Ss]tartup)\s*:?\s*([A-ZÁÉÍÓÚÑ][\w.&'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w.&'-]*){0,3})/,
  // La arroba SOLO tras "at"/"en"/"de". Suelta cazaba anotaciones de código:
  // un post con `@PostMapping` salía contratado por una empresa llamada
  // "PostMapping", y un correo de contacto daba su dominio por empresa.
  /\b(?:at|en|de)\s+@([A-Za-z][\w.&-]{2,30})\b/i,
];

/** La empresa que contrata, si el anuncio la nombra. `null` si no. */
export function companyName(adText: string): string | null {
  for (const pattern of COMPANY) {
    const match = adText.match(pattern);
    const name = match?.[1] ? clean(match[1]) : '';
    if (name.length >= 2) return name.slice(0, 60);
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL ROL A SECAS, para el asunto del correo.
 *
 * El título de la tarjeta puede ser largo y conviene que lo sea: "Backend
 * Engineer · Node.js · Buenos Aires" dice de un vistazo si una oferta
 * interesa. Pero en el ASUNTO de una candidatura eso sobra. Lo que el
 * reclutador necesita leer en su bandeja es el puesto:
 *
 *   "Desarrollador Full Stack TypeScript (PRUEBA)" → "Desarrollador Full Stack"
 *   "Backend Engineer · Node.js · Buenos Aires"    → "Backend Engineer"
 *   "Desarrollador Frontend React"                 → "Desarrollador Frontend"
 *
 * NO se recorta con una lista de tecnologías. Esa lista ya existe en el perfil
 * y duplicarla aquí es cómo se coló el veto a Symfony: dos sitios que dicen lo
 * mismo acaban diciendo cosas distintas. Lo que se hace es reconocer el ROL y
 * sus palabras de modalidad —las que lo definen— y cortar justo ahí. Todo lo
 * que viene después es contexto, y el contexto no va en el asunto.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** La palabra que nombra el oficio. */
/**
 * El puesto completo: sus palabras de modalidad, el oficio, y nada más.
 *
 * Se busca sobre la CADENA entera y no palabra a palabra, y eso es el arreglo
 * de un error que se veía en el asunto del correo: troceando por espacios,
 * "Full Stack" son dos fichas y ninguna de las dos es "full stack", así que
 * "Desarrollador Full Stack TypeScript" se quedaba en "Desarrollador" a secas.
 */
const MODIFIER_ALT = String.raw`full[\s-]?stack|fullstack|front[\s-]?end|frontend|back[\s-]?end|backend|web|m[óo]vil|mobile|software|data|cloud|senior|sr\.?|semi[\s-]?senior|ssr|junior|jr\.?|tech|team|product|scrum`;
const ROLE_ALT = String.raw`desarrollador\w*|programador\w*|ingenier\w*|arquitect\w*|analista|dise[ñn]ador\w*|developer|engineer|architect|designer|lead|qa|devops|sre`;
const ROLE_PHRASE = new RegExp(
  String.raw`(?:(?:${MODIFIER_ALT})\s+)*(?:${ROLE_ALT})(?:\s+(?:${ROLE_ALT}))?(?:\s+(?:${MODIFIER_ALT}))*`,
  'i',
);

/**
 * EL ROL A SECAS, para el asunto de la candidatura.
 *
 * El título de la tarjeta puede ser largo y conviene que lo sea: "Backend
 * Engineer · Node.js · Buenos Aires" dice de un vistazo si una oferta
 * interesa. Pero en el ASUNTO de un correo eso sobra; lo que el reclutador
 * necesita leer en su bandeja es el puesto:
 *
 *   "Desarrollador Full Stack TypeScript (PRUEBA)" → "Desarrollador Full Stack"
 *   "Backend Engineer · Node.js · Buenos Aires"    → "Backend Engineer"
 *   "Desarrollador Frontend React"                 → "Desarrollador Frontend"
 *
 * NO se recorta con una lista de tecnologías. Esa lista ya vive en el perfil y
 * duplicarla aquí es cómo se coló el veto a Symfony: dos sitios que dicen lo
 * mismo acaban diciendo cosas distintas. Lo que se reconoce es el oficio y sus
 * palabras de modalidad; lo que viene después es contexto, y el contexto no va
 * en el asunto.
 */
export function roleOnly(title: string | null): string | null {
  if (!title) return null;
  // Fuera los paréntesis y lo que siga a un separador: en un título son
  // siempre apostillas ("(PRUEBA)", "· Buenos Aires", "| LATAM").
  const head = clean(title.replace(/\([^)]*\)/g, ' ').split(/[·|/•—–]|\s-\s/)[0] ?? '');
  const phrase = ROLE_PHRASE.exec(head)?.[0];
  const role = clean(phrase ?? head);
  return role.length >= 3 ? role : null;
}
