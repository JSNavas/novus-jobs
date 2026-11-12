export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const field = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asIfUtc = Date.UTC(
    field('year'), field('month') - 1, field('day'),
    field('hour') % 24, field('minute'), field('second'),
  );
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

export function toLocalTime(now: Date, timeZone: string): Date {
  return new Date(now.getTime() + offsetMsAt(now, timeZone));
}

interface PassSlot {
  date: string;
  hour: number;
  recovered: boolean;
}

export interface LastPass {
  date: string;
  hour: number;
}

export function localDayStart(now: Date, timeZone: string): Date {
  const local = toLocalTime(now, timeZone);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnight - offsetMsAt(new Date(midnight), timeZone));
}

export function currentSlot(local: Date, hours: readonly number[]): { date: string; hour: number } | undefined {
  const reached = hours.filter((h) => h <= local.getUTCHours());
  const hour = Math.max(...reached);
  if (!reached.length) return undefined;
  return { date: local.toISOString().slice(0, 10), hour };
}

export function shouldRunPass(local: Date, hours: readonly number[], last?: LastPass): PassSlot | undefined {
  const slot = currentSlot(local, hours);
  if (!slot) return undefined;
  if (last && last.date === slot.date && last.hour >= slot.hour) return undefined;
  return { ...slot, recovered: local.getUTCHours() !== slot.hour };
}

export interface NextRunSource {
  readonly name: string;
  readonly schedule:
    | { readonly kind: 'configured-hours'; readonly hours?: readonly number[] }
    | { readonly kind: 'every-minutes'; readonly minutes: number };
}

function nextSlotAt(now: Date, hours: readonly number[], timeZone: string): number | null {
  const sorted = [...hours].sort((a, b) => a - b);
  const earliest = sorted[0];
  if (earliest === undefined) return null;
  const midnight = localDayStart(now, timeZone).getTime();
  const following = sorted.find((hour) => midnight + hour * 3_600_000 > now.getTime());
  return following === undefined
    ? midnight + 24 * 3_600_000 + earliest * 3_600_000
    : midnight + following * 3_600_000;
}

export function nextRunAt(
  now: Date,
  hours: readonly number[],
  sources: readonly NextRunSource[],
  lastPassAt: (source: string) => number | null,
  timeZone: string,
): number | null {
  const candidates: number[] = [];
  for (const source of sources) {
    if (source.schedule.kind === 'every-minutes') {
      const last = lastPassAt(source.name);
      const due = last === null ? now.getTime() : last + source.schedule.minutes * 60_000;
      candidates.push(Math.max(due, now.getTime()));
      continue;
    }
    const slot = nextSlotAt(now, source.schedule.hours ?? hours, timeZone);
    if (slot !== null) candidates.push(slot);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
