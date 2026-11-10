import { escapeRegex } from './text-match.js';

/** Qué partes del stack aparecen en la oferta, con los nombres tal y como están en el perfil. */
export function matchStack(text: string, stack: readonly string[]): string[] {
  const t = text.toLowerCase();
  return stack.filter((tech) => {
    const s = tech.trim().toLowerCase();
    if (!s) return false;
    // Solo se rechaza un punto SEGUIDO de algo: así "node.js" casa y "postgresql." también.
    return new RegExp(`(?<![a-z0-9+#.])${escapeRegex(s)}(?![a-z0-9+#])(?!\\.[a-z0-9])`, 'i').test(t);
  });
}

const LINKEDIN_NOISE = /^(sugerencias|seguir|siguiendo|seguido por .*|.* recomienda esto|promocionado|•\s*\d+er\+?|\d+\s*(h|d[íi]as?|min|semanas?)\s*•?\s*|…\s*m[áa]s|mostrar traducci[óo]n|ir a mi sitio web|\d+)$/i;

/** Quita el mobiliario de LinkedIn (botones, contadores, "Sugerencias") del texto de la publicación. */
export function cleanLinkedInNoise(text: string): string {
  const lines = text.split('\n').map((l) => l.trim());
  while (lines.length && /^[\d\s\u200b]*$/.test(lines[lines.length - 1] ?? '')) lines.pop();
  return lines.filter((l) => l && !LINKEDIN_NOISE.test(l)).join('\n').trim();
}

const FURNITURE = /^(?:\d+\s*(?:h|d|min|sem|horas?|d[íi]as?|minutos?|semanas?|meses?)\b.*|.*\beditado\b.*|seguir|siguiendo|conectar|contactar|unirse|m[áa]s informaci[óo]n|ver mis servicios|ver perfil|concertar una cita|•\s*(?:1er|2º|2do|3er)\+?|sugerencias|promocionado|de tu actividad|te recomendamos)$/i;
const HEADLINE = /(?:\s[|·]\s.*){2,}|@\w|(?:engineer|developer|desarrollador|recruiter|talent|headhunter|founder|ceo|cto|manager|specialist|consultor|psic[óo]log|selecci[óo]n|recursos humanos|rrhh)/i;
const ALREADY_THE_AD = /buscamos|estamos contratando|vacante|oportunidad|se busca|hiring|requisitos|postul|ofrecemos|salario/i;
const MIN_AD_LENGTH = 120;

/**
 * El anuncio sin la firma de quien lo publica. El titular del autor lista
 * tecnologías e idiomas que no son del puesto, así que los vetos se juzgan
 * sin él. Si no encuentra cabecera o no queda anuncio, devuelve el texto tal cual.
 */
export function adBody(text: string): string {
  const lines = text.split('\n');
  if (lines.length < 2) return text;
  let cut = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i]?.trim() ?? '';
    if (!line) continue;
    if (ALREADY_THE_AD.test(line)) break;
    if (FURNITURE.test(line) || (i < 4 && HEADLINE.test(line))) cut = i + 1;
  }
  if (!cut) return text;
  const body = lines.slice(cut).join('\n').trim();
  return body.length >= MIN_AD_LENGTH ? body : text;
}

/** Enlace de postulación: lnkd.in / bit.ly, o una URL que parezca de empleo. */
export function extractApplyUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:lnkd\.in|bit\.ly)\/\S+|https?:\/\/\S*(?:jobs?|career|apply|postula|vacante|greenhouse|lever|workable)\S*/i);
  return match ? match[0].replace(/[.,)»"']+$/, '') : null;
}

/** Correo de contacto. Se descartan extensiones de imagen que a veces cuelan los extractores. */
export function extractEmail(text: string): string | null {
  const match = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!match) return null;
  const email = match[0];
  return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(email) ? null : email;
}

const SOURCE_AGGREGATOR_MARKS = [
  'capturada de', 'capturada hace', 'capturado de', 'capturamos', 'atrapado en una publicación', 'atrapada de una publicación',
  'antes de que llegue a los tableros', 'antes de llegar a los portales',
  'tu postulación ya está redactada', 'va por nuestra cuenta',
  'roles tech remotos llegan', 'sé el primero', 'contacto directo del anunciante',
  'antes de que se agote', 'jobs watcher', 'freelanly', 'jobfound',
  'de una publicación de linkedin', 'de un post de contratación',
];

/** Publicada por un agregador que revende la oferta. Se marca, no se descarta. */
export function isAggregatorPost(text: string): boolean {
  const t = text.toLowerCase();
  return SOURCE_AGGREGATOR_MARKS.some((m) => t.includes(m));
}

const JUNIOR_TERMS = /\b(junior|jr\.?|trainee|intern(ship)?|becari[oa]|pasant[íi]a|practicante|pr[áa]cticas profesionales|entry[\s-]?level|reci[ée]n graduad|primer empleo|sin experiencia previa)\b/i;
const SENIOR_TERMS = /\b(semi[\s-]?senior|semi[\s-]?sr|senior|sr\.?|ssr|especialista|lead|arquitect)\b/i;

/** Junior, trainee o prácticas. Se manda igual, pero en su propia sección. */
export function isJuniorOrInternship(text: string): boolean {
  const t = text.toLowerCase();
  return JUNIOR_TERMS.test(t) && !SENIOR_TERMS.test(t);
}

const CANDIDATE_PHRASES = [
  'busco trabajo', 'busco empleo', 'busco oportunidad', 'busco nuevas oportunidad',
  'me encuentro en búsqueda', 'me encuentro en busqueda', 'estoy en búsqueda',
  'estoy buscando trabajo', 'estoy buscando empleo', 'estoy buscando oportunidad',
  'estoy disponible para', 'me encuentro disponible', 'open to work',
  'looking for opportunities', 'looking for a new', 'mi perfil profesional',
  'les comparto mi cv', 'les dejo mi cv', 'adjunto mi cv', 'mi hoja de vida',
  'agradezco cualquier recomendación', 'agradecería que compartieran',
  'busco nuevos retos', 'busco nuevo reto', 'tengo disponibilidad inmediata',
  'disponibilidad inmediata para incorporarme', 'ofrezco mis servicios',
  'me ofrezco como', 'estoy disponible como',
];
const SELF_INTRODUCTION = /\bsoy\s+[a-záéíóúñ]+([\s,]|\s+[a-záéíóúñ]+\s*,)?\s*(desarrollador|developer|ingenier|programador|full\s*stack|frontend|backend)/i;

/** Alguien ofreciéndose como candidato. Es competencia, no una vacante. */
export function isCandidateSelfPromotion(text: string): boolean {
  const t = text.toLowerCase();
  return CANDIDATE_PHRASES.some((m) => t.includes(m)) || SELF_INTRODUCTION.test(t);
}

const CONTENT_MARKS: Array<string | RegExp> = [
  'guardá este post', 'guarda este post', 'guardalo para no perderlo',
  'tip extra en comentarios', 'link en comentarios', 'te lo dejo en comentarios',
  'estas son las plataformas', 'estos son los lugares', 'lugares para conseguir',
  'recomiendo esta formación', 'recomiendo este curso', 'curso de', 'formación práctica',
  'me quedo especialmente con', 'hilo:', 'thread:', 'aprendí',
  /te\s+comparto\s+(?:sitios|lugares|plataformas|portales|p[áa]ginas|webs?|tips?|consejos|recursos|herramientas|mi\b|lo\s+que|c[óo]mo)/i,
  'mi stack de trabajo', 'por qué migré', 'mi experiencia con', 'lo que aprendí',
  'sígueme para', 'síguelo para', 'comparto contigo',
  // ═══ VENDER FORMACIÓN NO ES CONTRATAR ═══
  // Un anuncio de curso habla de tecnologías, dice "necesitas conocer X" y
  // suena a requisitos. Las marcas son específicas a propósito: una oferta de
  // trabajo sí puede decir "ofrecemos formación continua", y eso no la
  // convierte en un curso.
  'a tu formación', 'tu formación', 'incorporar a tu', 'suma a tu perfil',
  'curso de', 'nuestro curso', 'el curso', 'masterclass', 'webinar',
  'bootcamp', 'inscríbete', 'inscribite', 'inscripciones', 'cupos',
  'clase gratuita', 'taller gratuito', 'capacitación online', 'certifícate',
  'aprende a', 'aprendé a', 'te enseño', 'te explico', 'guía completa',
];
const OFFER_SIGNALS = [
  'buscamos', 'estamos buscando', 'se busca', 'búsqueda de', 'busqueda de',
  'vacante', 'oportunidad laboral', 'oportunidad de trabajo', 'estamos contratando',
  'contratando', 'se requiere', 'requisitos', 'postula', 'postúlate', 'postularse',
  'aplicar a', 'envía tu cv', 'envia tu cv', 'enviar cv', 'mándame tu cv', 'tu cv',
  'hoja de vida', 'we are hiring', "we're hiring", 'hiring', 'join our team',
  'apply now', 'job opening', 'open position', 'estamos sumando', 'sumate', 'súmate',
  // "incorporar" a secas era demasiado débil: un anuncio de curso que decía
  // "herramientas que vale la pena incorporar a tu formación" entraba como
  // oferta. Lo que indica contratación es incorporar a un EQUIPO.
  'incorporar a nuestro', 'incorporar a su equipo', 'incorporarse a', 'incorporación',
  'seleccionamos', 'reclutamiento', 'posición abierta', 'puesto de',
  'perfil buscado', 'ofrecemos', 'salario', 'modalidad de trabajo', 'jornada',
  // ═══ EL MOTIVO TAMBIÉN TIENE QUE SER VERDAD ═══
  //
  // Sin estas, una oferta escrita en inglés o de otro rubro se descartaba con
  // "no es una oferta de trabajo", que es falso: SÍ lo era, solo que no era
  // para él. El veredicto acertaba y el motivo mentía, y un motivo que miente
  // hace imposible auditar el criterio — que es justo para lo que se guardan
  // los descartes.
  'responsabilidades', 'funciones del puesto', 'perfil requerido', 'experiencia mínima',
  'experiencia minima', 'horario:', 'beneficios:', 'contratación', 'contratacion',
  'we are looking for', "we're looking for", 'skills we', 'looking for your next',
  'talent network', 'job opportunit', 'career opportunit', 'now hiring', 'position available',
  'client project', 'send your cv', 'send your resume',
];

/**
 * ¿Es una oferta de trabajo y no un artículo técnico? Aquí no aplica "ante la
 * duda, mándala": una publicación sin ninguna señal de contratación no es una
 * oferta que se escape, es contenido.
 */
export function looksLikeOffer(text: string): boolean {
  const t = text.toLowerCase();
  if (CONTENT_MARKS.some((m) => (typeof m === 'string' ? t.includes(m) : m.test(t)))) return false;
  if (OFFER_SIGNALS.some((m) => t.includes(m))) return true;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return true;
  return /\busd\s*\$?\s*[\d.,]+|\$\s?[\d.,]{3,}|sueldo|remuneraci[óo]n/i.test(t);
}
