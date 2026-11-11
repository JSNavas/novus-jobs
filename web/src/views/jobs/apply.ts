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
 * Get on Board lo pide en cada postulación, con un mínimo de 50 caracteres y
 * un máximo de 1000. Escribirlo a mano en cada una es lo que hace que se acabe
 * pegando siempre el mismo párrafo genérico — y un párrafo genérico se nota.
 *
 * EL TEXTO YA NO VIVE AQUÍ. Está en la BD y se edita en Configuración: una
 * frase que no le gusta se corrige en la pantalla, no en el código, y cada
 * cambio de redacción no es un despliegue. Lo que queda aquí es RELLENAR SUS
 * HUECOS con los datos de esa oferta, que es lo único que un texto guardado no
 * puede saber.
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
 * Pérez» sería peor que no nombrar a nadie, así que ahí se dice «la empresa».
 */
function employerName(job: Job): string {
  const company = job.company?.trim();
  if (company) return company;
  const author = job.author?.trim();
  return job.source === 'getonbrd' && author ? author : 'la empresa';
}

function positionName(job: Job): string {
  return job.role?.trim() || job.title?.trim() || 'la vacante';
}

/**
 * Quita lo que ya está dicho dentro de otra tecnología de la lista.
 *
 * `stackMatch` guarda cada coincidencia por separado, así que un anuncio con
 * Node.js casa con «Node.js» y con «Node», y la carta salía diciendo
 * «TypeScript, Node.js, Node y NestJS». Enumerar la misma tecnología dos veces
 * en una frase que presume de leer el anuncio es justo lo contrario de lo que
 * esa frase intenta demostrar.
 */
function withoutRedundant(stack: readonly string[]): string[] {
  return stack.filter((tech) => !stack.some((other) =>
    other !== tech && other.toLowerCase().includes(tech.toLowerCase()),
  ));
}

function stackList(job: Job): string {
  const stack = withoutRedundant(job.stackMatch).slice(0, STACK_IN_LETTER);
  if (!stack.length) return '';
  if (stack.length === 1) return stack[0]!;
  return `${stack.slice(0, -1).join(', ')} y ${stack[stack.length - 1]}`;
}

/**
 * Tira las frases que mencionan un hueco que se quedó sin valor.
 *
 * Sin coincidencias de stack, «requieren conocimientos en las tecnologías ,
 * que son justo las que vengo usando» es una frase rota pegada en una
 * postulación real. Se va entera y el resto del párrafo sigue en pie, que es
 * exactamente lo que hacía el texto cuando vivía en el código.
 */
function dropSentencesWith(template: string, placeholder: string): string {
  return template
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !sentence.includes(placeholder))
    .join(' ')
    .trim();
}

/** `split`/`join` y no `replaceAll`: el target de TS de este proyecto es anterior. */
function fill(template: string, job: Job, stack: string): string {
  return template
    .split('{puesto}').join(positionName(job))
    .split('{empresa}').join(employerName(job))
    .split('{tecnologias}').join(stack);
}

/**
 * El párrafo listo para pegar, con los datos de esta oferta.
 *
 * Si se pasara del tope del formulario cae la frase de las tecnologías, que es
 * la única prescindible: un texto cortado a la mitad se ve peor que uno sin
 * ese detalle. El servidor ya valida el largo de la plantilla, pero los huecos
 * crecen al rellenarse, así que el último control tiene que estar aquí.
 */
export function motivationLetter(job: Job, template: string): string {
  const stack = stackList(job);
  const base = stack ? template : dropSentencesWith(template, '{tecnologias}');
  const letter = fill(base, job, stack);

  if (letter.length <= MAX_LETTER_CHARS) return letter;
  return fill(dropSentencesWith(template, '{tecnologias}'), job, '');
}
