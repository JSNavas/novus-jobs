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
