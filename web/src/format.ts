/**
 * TODAS las fechas del dashboard, en la zona del usuario y con am/pm.
 *
 * DOS DECISIONES, y las dos vienen de que esto se leía mal:
 *
 *  - LA ZONA ES LA DEL PERFIL, no la del navegador ni una fija. Estuvo clavada
 *    a Caracas, que era donde vivía el único usuario que había; un dashboard
 *    que enseña horas de otro país a quien lo abre desde Madrid convierte un
 *    horario en una adivinanza. El servidor busca en franjas de ESA zona y los
 *    correos hablan en ESA zona, así que la pantalla tiene que coincidir.
 *
 *    Mientras no se sepa cuál es —el primer render, antes de que conteste la
 *    API—, se usa la del navegador, que es la que acierta en el caso normal:
 *    el servidor corre en esta misma máquina.
 *
 *  - 12 HORAS CON am/pm. El servidor usa 0-23 porque es lo que no admite
 *    ambigüedad en un `.env`; pero nadie queda a las 18:00, se queda a las 6 de
 *    la tarde, y leer "16:35" obliga a restar doce cada vez.
 *
 * Se arma con `formatToParts` en vez de pedirle el formato a `es-ES`, porque
 * ese escribe "4:35 p. m." —con puntos y espacios— y aquí se quiere "4:35 pm".
 */
let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * La fija al valor del perfil. La llama la aplicación una vez, cuando la API
 * contesta. Un nombre de zona que este navegador no conozca se ignora: mejor
 * la hora del navegador que una pantalla que revienta al pintar una fecha.
 */
export function setDisplayTimeZone(name: string | null | undefined): void {
  if (!name || name === timeZone) return;
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: name });
    timeZone = name;
    parts = buildFormatter();
  } catch {
    // Se queda la del navegador.
  }
}

function buildFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

let parts = buildFormatter();

export function partsOf(date: Date): Record<string, string> {
  return Object.fromEntries(parts.formatToParts(date).map((p) => [p.type, p.value]));
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
