import { t } from '../../i18n';
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 24 * 60;

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

export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

export const ALL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
