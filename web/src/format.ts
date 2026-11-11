/**
 * TODAS las fechas del dashboard, en hora de Venezuela y con am/pm.
 *
 * DOS DECISIONES, y las dos vienen de que esto se leía mal:
 *
 *  - LA ZONA SE FIJA A CARACAS, no se hereda del navegador. El servidor busca
 *    en franjas de hora venezolana, los correos hablan en hora venezolana y el
 *    señor vive allí: que una fecha del dashboard cambiara de valor por abrirla
 *    desde otro sitio es justo lo que convierte un horario en una adivinanza.
 *    Una hora que no dice su zona no es una hora.
 *
 *  - 12 HORAS CON am/pm. El servidor usa 0-23 porque es lo que no admite
 *    ambigüedad en un `.env`; pero nadie queda a las 18:00, se queda a las 6 de
 *    la tarde, y leer "16:35" obliga a restar doce cada vez.
 *
 * Se arma con `formatToParts` en vez de pedirle el formato a `es-ES`, porque
 * ese escribe "4:35 p. m." —con puntos y espacios— y aquí se quiere "4:35 pm".
 */
const CARACAS = 'America/Caracas';

const PARTS = new Intl.DateTimeFormat('es-ES', {
  timeZone: CARACAS,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function partsOf(date: Date): Record<string, string> {
  return Object.fromEntries(PARTS.formatToParts(date).map((p) => [p.type, p.value]));
}

/** "10 nov 2026, 4:35 pm" */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = partsOf(date);
  const month = (p.month ?? '').replace('.', '');
  const period = (p.dayPeriod ?? '').replace(/[.\s\u202f\u00a0]/g, '').toLowerCase();
  return `${p.day} ${month} ${p.year}, ${p.hour}:${p.minute} ${period}`;
}

/**
 * Solo el día. En la fecha en que se publicó una vacante la hora no aporta
 * nada: lo que importa es si es de hoy o de hace tres semanas.
 */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = partsOf(date);
  return `${p.day} ${p.month} ${p.year}`;
}
