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
