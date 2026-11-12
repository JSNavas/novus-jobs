import { t } from './i18n';

let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function setDisplayTimeZone(name: string | null | undefined): void {
  if (!name || name === timeZone) return;
  try {
    new Intl.DateTimeFormat(t('locale'), { timeZone: name });
    timeZone = name;
    parts = buildFormatter();
  } catch {
    // Se queda la del navegador.
  }
}

function buildFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(t('locale'), {
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
let builtFor = t('locale');

export function partsOf(date: Date): Record<string, string> {
  if (builtFor !== t('locale')) {
    parts = buildFormatter();
    builtFor = t('locale');
  }
  return Object.fromEntries(parts.formatToParts(date).map((p) => [p.type, p.value]));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = partsOf(date);
  const month = (p.month ?? '').replace('.', '');
  const period = (p.dayPeriod ?? '').replace(/[.\s\u202f\u00a0]/g, '').toLowerCase();
  return `${p.day} ${month} ${p.year}, ${p.hour}:${p.minute} ${period}`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = partsOf(date);
  const period = (p.dayPeriod ?? '').replace(/[.\s\u202f\u00a0]/g, '').toLowerCase();
  return `${p.hour}:${p.minute} ${period}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = partsOf(date);
  return `${p.day} ${p.month} ${p.year}`;
}

export function dayLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dayOf = (d: Date): string => {
    const p = partsOf(d);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayOf(date) === dayOf(now)) return t('dash.runs.today');
  if (dayOf(date) === dayOf(yesterday)) return t('dash.runs.yesterday');
  return formatDate(iso);
}

export function utcOffsetLabel(): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value;
  return (name ?? 'UTC').replace('GMT', 'UTC').replace('-', '\u2212');
}

export function hourInUserZone(instant: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false })
    .formatToParts(instant)
    .find((part) => part.type === 'hour')?.value;
  return Number(hour ?? 0) % 24;
}
