import type { Schedule } from '../../api/client';
import { hourInUserZone } from '../../format';
import { t } from '../../i18n';

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

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
  secondsLeft: number;
}

export function nextSearchIn(hours: number[], now: Date): NextSearch | null {
  const sorted = [...hours].sort((a, b) => a - b);
  const earliest = sorted[0];
  if (earliest === undefined) return null;

  const nowSeconds = (hourInUserZone(now) * SECONDS_PER_HOUR
    + now.getUTCMinutes() * 60
    + now.getUTCSeconds()) % SECONDS_PER_DAY;
  const following = sorted.find((hour) => hour * SECONDS_PER_HOUR > nowSeconds);
  const targetSeconds = following === undefined
    ? earliest * SECONDS_PER_HOUR + SECONDS_PER_DAY
    : following * SECONDS_PER_HOUR;

  const left = targetSeconds - nowSeconds;
  return {
    hour: following ?? earliest,
    minutesLeft: Math.floor(left / 60),
    secondsLeft: left,
  };
}

export function nextSearchAt(nextAt: string, now: Date): NextSearch | null {
  const target = Date.parse(nextAt);
  if (Number.isNaN(target)) return null;
  const left = Math.max(0, Math.round((target - now.getTime()) / 1_000));
  return {
    hour: hourInUserZone(new Date(target)),
    minutesLeft: Math.floor(left / 60),
    secondsLeft: left,
  };
}

export function formatNextSearch(next: NextSearch): string {
  if (next.minutesLeft < 1) return t('schedule.nextUnderMinute');
  if (next.minutesLeft >= SIX_HOURS_IN_MINUTES) return t('schedule.nextAtHour', { hour: hourLabel(next.hour) });

  const hours = Math.floor(next.minutesLeft / 60);
  const minutes = next.minutesLeft % 60;
  if (hours === 0) return t('schedule.nextInMinutes', { minutes });
  if (minutes === 0) return t('schedule.nextInHours', { hours });
  return t('schedule.nextInHoursMinutes', { hours, minutes });
}

export function countdownOf(secondsLeft: number, withSeconds: boolean): string {
  const safe = Math.max(0, secondsLeft);
  const parts = [Math.floor(safe / SECONDS_PER_HOUR), Math.floor(safe / 60) % 60];
  if (withSeconds) parts.push(safe % 60);
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
}

export function searchHourLabel(hour: number): string {
  return hourLabel(hour);
}

export function shareSince(startedAt: string, next: NextSearch, now: Date): number | null {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return null;
  const span = (now.getTime() - started) / 1_000 + next.secondsLeft;
  if (span <= 0) return null;
  return Math.min(1, Math.max(0, 1 - next.secondsLeft / span));
}

export function elapsedShare(hours: number[], next: NextSearch): number | null {
  if (hours.length === 0) return null;
  const sorted = [...hours].sort((a, b) => a - b);
  const index = sorted.indexOf(next.hour);
  if (index === -1) return null;

  const previous = sorted.length === 1
    ? next.hour
    : sorted[(index - 1 + sorted.length) % sorted.length]!;
  const spanHours = sorted.length === 1 ? 24 : (next.hour - previous + 24) % 24 || 24;
  const span = spanHours * SECONDS_PER_HOUR;

  return Math.min(1, Math.max(0, (span - next.secondsLeft) / span));
}
