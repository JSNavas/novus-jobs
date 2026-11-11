import type { NewJob } from '../db/jobs.repository.js';
import { RunFailure } from '../types.js';
import type { Mail } from './mailer.js';

/**
 * El correo que avisa de que hay ofertas nuevas.
 *
 * NO ES LA OFERTA, ES EL AVISO. El correo dice cuántas llegaron y de qué van en
 * una línea cada una; lo demás —el texto entero, el enlace de postulación, el
 * botón de guardar— vive en el dashboard, que es donde se actúa. Meter la
 * oferta completa aquí duplicaría la fuente de verdad y haría ilegible un
 * correo de diez ofertas.
 *
 * SOLO SE MANDA SI HAY ALGO NUEVO. Un correo de "hoy no hay nada" tres veces al
 * día enseña a no abrirlos, y el día que llegue una oferta buena tampoco se
 * abrirá. El silencio significa "no había nada", que es información.
 */

const MAX_LISTED = 12;

/** La primera línea con contenido: lo más parecido a un titular que trae un post. */
export function headline(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 15);
  const raw = line ?? text.trim();
  return raw.length > 110 ? `${raw.slice(0, 107)}…` : raw;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function offersSubject(count: number): string {
  return count === 1
    ? '1 oferta nueva para revisar'
    : `${count} ofertas nuevas para revisar`;
}

/**
 * El nombre de la plataforma. Un `Record` abierto y no un enum: `source` es el
 * id libre que guarda cada fuente, y una plataforma nueva llega a los datos
 * antes que a esta tabla. Lo desconocido se enseña tal cual.
 */
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  getonbrd: 'Get on Board',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/** El aviso de ofertas nuevas. `dashboardUrl` es a dónde tiene que ir. */
export function offersMail(jobs: readonly NewJob[], dashboardUrl: string): Mail {
  const listed = jobs.slice(0, MAX_LISTED);
  const rest = jobs.length - listed.length;

  const lines = listed.map((job) => {
    const stack = job.stackMatch.slice(0, 5).join(', ');
    const where = job.location ?? 'sin ubicación';
    // De dónde viene, lo primero: con dos plataformas, dice si hay que
    // responderle a alguien o rellenar un formulario.
    return {
      title: headline(job.text),
      meta: [sourceLabel(job.source), where, stack].filter(Boolean).join(' · '),
    };
  });

  const text = [
    `${plural(jobs.length, 'Llegó 1 oferta nueva', `Llegaron ${jobs.length} ofertas nuevas`)}. Revisa el dashboard:`,
    dashboardUrl,
    '',
    ...lines.map((l) => `• ${l.title}\n  ${l.meta}`),
    rest > 0 ? `\n…y ${rest} más en el dashboard.` : '',
  ].filter(Boolean).join('\n');

  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">',
    // La concordancia se arma entera por rama: con "Llegaron 1 oferta que pasan"
    // el correo parece generado por una plantilla, que es justo lo que es.
    `<p>${plural(jobs.length,
      'Llegó <strong>1 oferta nueva</strong> que pasa tus reglas de perfil.',
      `Llegaron <strong>${jobs.length} ofertas nuevas</strong> que pasan tus reglas de perfil.`)}</p>`,
    '<ul style="padding-left:18px">',
    ...lines.map((l) =>
      `<li style="margin-bottom:10px"><strong>${escapeHtml(l.title)}</strong>` +
      `<br><span style="color:#6b7280;font-size:13px">${escapeHtml(l.meta)}</span></li>`),
    '</ul>',
    rest > 0 ? `<p style="color:#6b7280">…y ${rest} más.</p>` : '',
    `<p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:10px 18px;background:#5d87ff;color:#fff;border-radius:6px;text-decoration:none">Abrir el dashboard</a></p>`,
    `<p style="color:#9ca3af;font-size:12px">El detalle, el enlace de postulación y los botones de guardar o descartar están en el dashboard.</p>`,
    '</div>',
  ].filter(Boolean).join('');

  return { subject: offersSubject(jobs.length), html, text };
}

/**
 * El aviso de que la búsqueda está PARADA.
 *
 * Es el correo más importante de los dos. Una sesión caída no se nota: el
 * dashboard sigue enseñando las ofertas de ayer y todo parece normal mientras
 * pasan los días sin buscar nada. Fue exactamente lo que pasó antes de que
 * existiera este aviso.
 */
export function failureMail(failure: RunFailure, detail: string, dashboardUrl: string): Mail {
  const what: Record<RunFailure, string> = {
    [RunFailure.LoginRequired]: 'La sesión de LinkedIn caducó: la búsqueda está parada',
    [RunFailure.ProfileBusy]: 'La búsqueda no pudo correr: el navegador estaba ocupado',
    [RunFailure.Layout]: 'La búsqueda no encontró publicaciones: puede haber cambiado LinkedIn',
    [RunFailure.Other]: 'La búsqueda de empleo falló',
  };
  const fix: Record<RunFailure, string> = {
    [RunFailure.LoginRequired]: 'En el servidor: cd server && npm run login -- linkedin, inicia sesión y cierra la ventana. Las pasadas se reanudan solas.',
    [RunFailure.ProfileBusy]: 'Cierra la ventana de Chromium que tenga abierto el perfil.',
    [RunFailure.Layout]: 'Hay una captura en server/data/logs/ para ver qué sirvió LinkedIn.',
    [RunFailure.Other]: 'Mira el detalle y los logs del servidor.',
  };

  const subject = what[failure];
  const text = `${subject}\n\n${fix[failure]}\n\nDetalle: ${detail}\n\nDashboard: ${dashboardUrl}`;
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">' +
    `<p><strong>${escapeHtml(subject)}</strong></p>` +
    `<p>${escapeHtml(fix[failure])}</p>` +
    `<p style="color:#6b7280;font-size:13px">Detalle: ${escapeHtml(detail)}</p>` +
    `<p><a href="${escapeHtml(dashboardUrl)}">Abrir el dashboard</a></p></div>`;

  return { subject, html, text };
}
