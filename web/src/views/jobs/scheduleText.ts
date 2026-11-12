import type { Schedule } from '../../api/client';
import { hourInUserZone } from '../../format';
import { t } from '../../i18n';

/**
 * Las horas, como las dice una persona: "9:00 am, 1:00 pm o 6:00 pm".
 *
 * El servidor trabaja con horas de 0 a 23 porque es lo que no admite
 * ambigüedad en un `.env` ni en una comparación. Pero nadie queda a las 18:00:
 * se queda a las 6 de la tarde, y leer "13:00" obliga a restar doce cada vez.
 * La conversión vive aquí, en el borde que se lee, y no toca el reloj de dentro.
 */
function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  // 0 → 12 am (medianoche) y 12 → 12 pm (mediodía): el módulo solo no basta.
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

/**
 * "La siguiente búsqueda es a las 9:00 am, 1:00 pm o 6:00 pm (Europe/Madrid)".
 *
 * Las horas venían escritas a mano en la interfaz, y son configurables: era una
 * frase que dejaba de ser verdad en cuanto alguien las cambiaba. Y sin la zona,
 * un "6:00 pm" no dice nada: el dashboard lo puede abrir alguien que no está
 * donde corre el servidor.
 */
export function nextSearchSentence(schedule: Schedule | null): string {
  if (!schedule || schedule.hours.length === 0) return '';
  const times = schedule.hours.map(hourLabel);
  const list = times.length === 1
    ? times[0]!
    : `${times.slice(0, -1).join(', ')} ${t('schedule.or')} ${times[times.length - 1]!}`;
  return t('schedule.nextSentence', { hours: list, timezone: schedule.timezone });
}

const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SIX_HOURS_IN_MINUTES = 360;

export interface NextSearch {
  hour: number;
  minutesLeft: number;
}

/**
 * The first scheduled hour strictly after `now`, read on the user's clock.
 * If today has no hour left, it is the earliest one of tomorrow. Null when the
 * schedule is empty: there is nothing to count down to.
 */
export function nextSearchIn(hours: number[], now: Date): NextSearch | null {
  const sorted = [...hours].sort((a, b) => a - b);
  const earliest = sorted[0];
  if (earliest === undefined) return null;

  // La hora del usuario, no la de UTC ni la del navegador: la del perfil.
  const nowSeconds = (hourInUserZone(now) * SECONDS_PER_HOUR
    + now.getUTCMinutes() * 60
    + now.getUTCSeconds()) % SECONDS_PER_DAY;
  const following = sorted.find((hour) => hour * SECONDS_PER_HOUR > nowSeconds);
  const targetSeconds = following === undefined
    ? earliest * SECONDS_PER_HOUR + SECONDS_PER_DAY
    : following * SECONDS_PER_HOUR;

  return {
    hour: following ?? earliest,
    minutesLeft: Math.floor((targetSeconds - nowSeconds) / 60),
  };
}

/**
 * El instante exacto que manda el servidor, leído como cuenta atrás.
 *
 * `nextAt` ya es la más próxima de TODAS las fuentes —franjas de LinkedIn e
 * intervalos de Get on Board mezclados—, así que la interfaz no recalcula
 * horarios: solo resta. `nextSearchIn` se queda para cuando el servidor es
 * viejo y no manda `nextAt`.
 */
export function nextSearchAt(nextAt: string, now: Date): NextSearch | null {
  const target = Date.parse(nextAt);
  if (Number.isNaN(target)) return null;
  return {
    hour: hourInUserZone(new Date(target)),
    minutesLeft: Math.max(0, Math.floor((target - now.getTime()) / 60_000)),
  };
}

/**
 * "Próxima en 2 h 14 min" while it is near; "Próxima a las 9:00 am" when it is
 * far, because a countdown of 14 hours is noise and the clock time is the fact.
 */
export function formatNextSearch(next: NextSearch): string {
  if (next.minutesLeft < 1) return t('schedule.nextUnderMinute');
  if (next.minutesLeft >= SIX_HOURS_IN_MINUTES) return t('schedule.nextAtHour', { hour: hourLabel(next.hour) });

  const hours = Math.floor(next.minutesLeft / 60);
  const minutes = next.minutesLeft % 60;
  if (hours === 0) return t('schedule.nextInMinutes', { minutes });
  if (minutes === 0) return t('schedule.nextInHours', { hours });
  return t('schedule.nextInHoursMinutes', { hours, minutes });
}
