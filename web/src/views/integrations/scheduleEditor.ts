import { t } from '../../i18n';
/**
 * Las reglas del horario, fuera de la pantalla que las usa.
 *
 * Son las mismas que valida el servidor. Repetirlas aquí no es duplicar la
 * verdad: es poder decir "mínimo 5 minutos" ANTES de mandar la petición, que
 * es cuando la frase sirve de algo. El servidor sigue siendo el que manda.
 */
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 24 * 60;

/** Atajos de ritmo: lo que de verdad se elige, sin teclear. */
export const INTERVAL_PRESETS = [15, 30, 60, 120, 180, 360, 720] as const;

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return t('interval.minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? t('interval.hour') : t('interval.hours', { hours });
  return t('interval.hoursMinutes', { hours, rest });
}

export function intervalError(raw: string): string | null {
  const minutes = Number(raw);
  if (!Number.isInteger(minutes)) return t('interval.notInteger');
  if (minutes < MIN_INTERVAL_MINUTES) return t('interval.tooLow', { min: MIN_INTERVAL_MINUTES });
  if (minutes > MAX_INTERVAL_MINUTES) return t('interval.tooHigh');
  return null;
}

/** "9:00 am", como lo dice una persona. Igual que en el resto de la interfaz. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

export const ALL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
