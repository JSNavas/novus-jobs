import type { Schedule } from '../../api/client';

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
 * "a las 9:00 am, 1:00 pm o 6:00 pm (hora de Venezuela)".
 *
 * Las horas venían escritas a mano en la interfaz, y son configurables con
 * `SCHEDULE_HOURS`: era una frase que dejaba de ser verdad en cuanto alguien
 * tocaba el `.env`. Y sin la zona, un "6:00 pm" no dice nada — el servidor
 * trabaja en hora de Venezuela y quien mira el dashboard necesita saberlo.
 */
export function nextSearchSentence(schedule: Schedule | null): string {
  if (!schedule || schedule.hours.length === 0) return '';
  const times = schedule.hours.map(hourLabel);
  const list = times.length === 1
    ? times[0]!
    : `${times.slice(0, -1).join(', ')} o ${times[times.length - 1]!}`;
  return `La siguiente búsqueda es a las ${list} (${schedule.timezone}).`;
}

// Venezuela has no daylight saving time, so the searcher's clock is a fixed
// UTC-4. Only this constant changes if the searcher ever moves to another zone.
const VET_OFFSET_HOURS = -4;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SIX_HOURS_IN_MINUTES = 360;

export interface NextSearch {
  hour: number;
  minutesLeft: number;
}

/**
 * The first scheduled hour strictly after `now`, read on the Venezuelan clock.
 * If today has no hour left, it is the earliest one of tomorrow. Null when the
 * schedule is empty: there is nothing to count down to.
 */
export function nextSearchIn(hours: number[], now: Date): NextSearch | null {
  const sorted = [...hours].sort((a, b) => a - b);
  const earliest = sorted[0];
  if (earliest === undefined) return null;

  const nowSeconds = (now.getUTCHours() * SECONDS_PER_HOUR
    + now.getUTCMinutes() * 60
    + now.getUTCSeconds()
    + VET_OFFSET_HOURS * SECONDS_PER_HOUR
    + SECONDS_PER_DAY) % SECONDS_PER_DAY;
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
 * "Próxima en 2 h 14 min" while it is near; "Próxima a las 9:00 am" when it is
 * far, because a countdown of 14 hours is noise and the clock time is the fact.
 */
export function formatNextSearch(next: NextSearch): string {
  if (next.minutesLeft < 1) return 'Próxima en menos de 1 min';
  if (next.minutesLeft >= SIX_HOURS_IN_MINUTES) return `Próxima a las ${hourLabel(next.hour)}`;

  const hours = Math.floor(next.minutesLeft / 60);
  const minutes = next.minutesLeft % 60;
  if (hours === 0) return `Próxima en ${minutes} min`;
  if (minutes === 0) return `Próxima en ${hours} h`;
  return `Próxima en ${hours} h ${minutes} min`;
}
