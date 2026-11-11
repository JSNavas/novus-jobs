import type { SettingsRepository } from '../db/settings.repository.js';
import type { SourceSchedule } from './policy.js';
import type { JobSource } from './types.js';

/**
 * EL HORARIO DE CADA INTEGRACIÓN, GUARDADO Y EDITABLE.
 *
 * Antes el ritmo vivía en dos sitios inmutables: `SCHEDULE_HOURS` en el `.env`
 * para las de franjas y un número escrito en `policy.ts` para las de
 * intervalo. Cambiar cualquiera de los dos pedía tocar un fichero y reiniciar
 * el servicio, así que en la práctica no se cambiaban.
 *
 * Aquí viven en la base de datos, uno por fuente, bajo `schedule:<fuente>`.
 * La política sigue mandando en la FORMA —LinkedIn va por franjas porque es
 * una cuenta vigilada, Get on Board por intervalo porque es una API abierta—
 * y lo guardado solo decide los números. Nadie puede convertir LinkedIn en
 * "cada 5 minutos" desde la interfaz, que es exactamente la protección que
 * tenía estar en el código.
 */
export const scheduleKey = (source: string): string => `schedule:${source}`;

/** Suelo para no martillear una API ajena ni una cuenta vigilada. */
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 24 * 60;

export class SourceSchedules {
  constructor(
    private readonly settings: Pick<SettingsRepository, 'get' | 'set'>,
    /** Las franjas del `.env`: el valor de partida de quien va por franjas. */
    private readonly defaultHours: readonly number[],
  ) {}

  /** Lo que de verdad se usa: lo guardado si lo hay, y si no el defecto. */
  of(source: JobSource): SourceSchedule {
    const stored = this.read(source.name);
    const fallback = source.policy.schedule;
    if (!stored) return fallback.kind === 'configured-hours' ? fallback : fallback;
    if (fallback.kind === 'configured-hours' && stored.kind === 'configured-hours') return stored;
    if (fallback.kind === 'every-minutes' && stored.kind === 'every-minutes') return stored;
    // La forma la manda la política: un guardado de otra forma es basura vieja.
    return fallback;
  }

  /** Las horas efectivas de una fuente por franjas. */
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
