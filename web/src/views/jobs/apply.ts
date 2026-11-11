import { JobSeniority, type Job } from '../../types';

/**
 * LA CANDIDATURA, tal y como la escribe él.
 *
 * Plantilla suya, literal. El título de la vacante se sustituye pero el resto
 * no se toca: un correo de presentación con palabras que no son las tuyas se
 * nota, y quien lo recibe también lo nota.
 */
const GREETING = 'Hola, un gusto saludarte!';
const BODY = (vacancy: string): string =>
  `Estoy interesado en la vacante de ${vacancy}. Le adjunto mi cv para que pueda ver mis habilidades y experiencia. Saludos!`;

/**
 * ¿Se le escribe a esta oferta?
 *
 * A las junior NO. Él no se postula a esas: le llegan porque pueden servir
 * para pasarlas a alguien, pero ofrecerle "enviar CV" ahí es ofrecerle algo
 * que no va a hacer, y un botón que nunca se pulsa estorba a los que sí.
 */
export function shouldOfferApplication(job: Job): boolean {
  return job.seniority !== JobSeniority.Junior && !!job.contactEmail;
}

/**
 * Cómo se llama la vacante en el correo.
 *
 * Primero el ROL a secas —"Desarrollador Full Stack"—, que es lo que el
 * reclutador necesita leer en su bandeja. El título entero lleva la tecnología
 * y el sitio pegados ("Desarrollador Full Stack TypeScript (PRUEBA)") y eso
 * en un asunto es ruido. Si no se pudo extraer el rol, se recurre al título.
 */
function vacancyName(job: Job): string {
  const role = job.role?.trim();
  if (role) return role;
  const title = job.title?.trim();
  if (!title || title.length > 80) return 'la publicación que compartiste en LinkedIn';
  return title;
}

/**
 * El asunto es EL NOMBRE DE LA VACANTE, sin nada delante.
 *
 * Llevaba un "Candidatura: " por delante y sobra: quien recibe el correo ya
 * sabe que es una candidatura —lo dice la primera línea del cuerpo—, y lo que
 * necesita leer de un vistazo en su bandeja es a qué puesto se presenta.
 */
export function applicationSubject(job: Job): string {
  return vacancyName(job);
}

export function applicationBody(job: Job): string {
  return `${GREETING}\n\n${BODY(vacancyName(job))}`;
}

/**
 * El redactor de Gmail, ya escrito.
 *
 * ⚠️ NO PUEDE LLEVAR EL CV ADJUNTO. El formato de redacción de Gmail admite
 * destinatario, asunto y cuerpo, y nada más: Google no deja que una página web
 * meta ficheros en el correo de nadie, y es una buena decisión suya. Por eso la
 * tarjeta pone el CV a un clic justo al lado — es lo más cerca que se puede
 * estar sin montar la API de Gmail con OAuth.
 *
 * Se usa el redactor web y no un `mailto:` porque el `mailto:` depende de que
 * haya una app de correo configurada en el sistema; sin ella no hace nada.
 */
export function gmailComposeUrl(job: Job, account: string | null): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: job.contactEmail ?? '',
    su: applicationSubject(job),
    body: applicationBody(job),
  });
  // Con varias sesiones de Google abiertas, Gmail usa la PRIMERA, que puede no
  // ser la suya: la candidatura saldría de la cuenta equivocada y ni se
  // enteraría. Nombrar la cuenta en la ruta obliga a abrir la buena.
  const inbox = account ? `u/${encodeURIComponent(account)}/` : '';
  return `https://mail.google.com/mail/${inbox}?${params.toString()}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * «¿POR QUÉ TE INTERESA TRABAJAR EN <EMPRESA>?»
 *
 * Get on Board pide ese texto en cada postulación, con un mínimo de 50
 * caracteres y un máximo de 1000. Escribirlo a mano en cada una es lo que hace
 * que se acabe pegando siempre el mismo párrafo genérico — y un párrafo
 * genérico se nota, sobre todo cuando el formulario de al lado ya dice que
 * otros candidatos pidieron entre $2.250 y $3.500.
 *
 * Esto arma el párrafo CON LOS DATOS DE ESA OFERTA. Son sus palabras: la
 * plantilla es la suya, con los acentos puestos y dos cambios de fondo:
 *
 *   1. Empieza por lo que él APORTA y no por lo que busca. «Busco una empresa
 *      donde explotar mi potencial» habla de él; quien lee quiere saber qué
 *      recibe. Dice lo mismo, en el orden que le sirve.
 *   2. Nombra la coincidencia real de tecnologías. Es la única frase que no se
 *      puede escribir de antemano, y por eso es la que demuestra que leyó el
 *      anuncio.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Cuántas tecnologías se nombran. Más de cuatro parece una lista pegada. */
const STACK_IN_LETTER = 4;
/** El tope del formulario de Get on Board. */
const MAX_LETTER_CHARS = 1000;

/**
 * El nombre de la empresa, y SOLO si de verdad lo es.
 *
 * En Get on Board `author` es la empresa, porque la API la entrega. En
 * LinkedIn es la persona que publicó: escribir «me interesa trabajar en María
 * Pérez» sería peor que no nombrar a nadie. Cuando no se sabe, la carta
 * arranca sin nombre en vez de dejar un hueco que se pegue sin querer.
 */
function employerName(job: Job): string | null {
  const company = job.company?.trim();
  if (company) return company;
  const author = job.author?.trim();
  return job.source === 'getonbrd' && author ? author : null;
}

function opening(job: Job): string {
  const company = employerName(job);
  const role = job.role?.trim();
  if (role && company) return `Me interesa el puesto de ${role} en ${company}`;
  if (company) return `Me interesa trabajar en ${company}`;
  if (role) return `Me interesa el puesto de ${role}`;
  return 'Me interesa esta oportunidad';
}

/** Lo que de verdad coincide, dicho sin exagerar: «lo que uso a diario». */
function stackSentence(job: Job): string {
  const stack = job.stackMatch.slice(0, STACK_IN_LETTER);
  if (!stack.length) return '';
  const list = stack.length > 1
    ? `${stack.slice(0, -1).join(', ')} y ${stack[stack.length - 1]}`
    : stack[0];
  return ` Vi que el puesto trabaja con ${list}, que es justo lo que uso a diario.`;
}

const PITCH =
  ' porque busco un equipo donde aportar todo lo que he construido en más de 9 años como ' +
  'desarrollador de software, tanto en frontend como en backend.';

const CLOSING =
  ' Soy responsable y dedicado, me gusta trabajar en equipo y me adapto rápido a los entornos ' +
  'nuevos. Me fascina aprender tecnologías nuevas, y soy amante de las buenas prácticas y del ' +
  'código escalable, lo que me mantiene en estudio constante para crecer cada día como desarrollador.';

/**
 * El párrafo listo para pegar en la postulación.
 *
 * Si se pasara del tope del formulario cae la frase de las tecnologías, que es
 * la única prescindible: un texto cortado a la mitad se ve peor que uno sin
 * ese detalle. Con el stack más largo posible se queda en ~700 caracteres, así
 * que el recorte es un seguro, no algo que vaya a pasar.
 */
export function motivationLetter(job: Job): string {
  const full = `${opening(job)}${PITCH}${stackSentence(job)}${CLOSING}`;
  if (full.length <= MAX_LETTER_CHARS) return full;
  return `${opening(job)}${PITCH}${CLOSING}`;
}
