import type { SettingsRepository } from '../db/settings.repository.js';
import type { SourceSchedule } from './policy.js';
import type { JobSource } from './types.js';

export const scheduleKey = (source: string): string => `schedule:${source}`;

export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 24 * 60;

export class SourceSchedules {
  constructor(
    private readonly settings: Pick<SettingsRepository, 'get' | 'set'>,
    private readonly defaultHours: readonly number[],
  ) {}

  of(source: JobSource): SourceSchedule {
    return this.read(source.name) ?? source.policy.schedule;
  }

  hoursOf(source: JobSource): readonly number[] {
    const schedule = this.of(source);
    if (schedule.kind !== 'configured-hours') return [];
    return schedule.hours ?? this.defaultHours;
  }

  save(source: JobSource, schedule: SourceSchedule): void {
    this.settings.set(scheduleKey(source.name), JSON.stringify(schedule));
  }

  private read(name: string): SourceSchedule | null {
    const raw = this.settings.get(scheduleKey(name));
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return asSchedule(parsed);
    } catch {
      return null;
    }
  }
}

function asSchedule(value: unknown): SourceSchedule | null {
  if (typeof value !== 'object' || value === null) return null;
  const { kind } = value as { kind?: unknown };
  if (kind === 'every-minutes') {
    const { minutes } = value as { minutes?: unknown };
    return typeof minutes === 'number' && Number.isInteger(minutes) ? { kind, minutes } : null;
  }
  if (kind === 'configured-hours') {
    const { hours } = value as { hours?: unknown };
    if (hours === undefined) return { kind };
    if (!Array.isArray(hours) || !hours.every((h) => Number.isInteger(h) && h >= 0 && h <= 23)) return null;
    return { kind, hours: [...new Set(hours as number[])].sort((a, b) => a - b) };
  }
  return null;
}
