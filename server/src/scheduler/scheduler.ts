import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PassRunner } from '../runner.js';
import type { JobSource } from '../sources/types.js';
import type { SourceSchedules } from '../sources/schedules.js';
import { currentSlot, shouldRunPass, toLocalTime, type LastPass } from './timing.js';

const TICK_MS = 5 * 60_000;
const STARTUP_DELAY_MS = 20_000;

export class LastPassStore {
  constructor(private readonly file: string) {}

  read(source: string): LastPass | undefined {
    const all = this.readAll();
    return all[source];
  }

  write(source: string, last: LastPass): void {
    const all = this.readAll();
    all[source] = last;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(all), 'utf8');
    renameSync(tmp, this.file);
  }

  private readAll(): Record<string, LastPass> {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.file, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) return {};
      const legacy = asLastPass(parsed);
      if (legacy) return { linkedin: legacy };
      const out: Record<string, LastPass> = {};
      for (const [source, value] of Object.entries(parsed)) {
        const last = asLastPass(value);
        if (last) out[source] = last;
      }
      return out;
    } catch {
      return {};
    }
  }
}

function asLastPass(value: unknown): LastPass | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { date, hour } = value as { date?: unknown; hour?: unknown };
  return typeof date === 'string' && typeof hour === 'number' ? { date, hour } : undefined;
}

interface SchedulerOptions {
  hours: readonly number[];
  sources: readonly JobSource[];
  schedules: SourceSchedules;
  enabled: (source: string) => boolean;
  timeZone: () => string;
  store: LastPassStore;
  runner: PassRunner;
  clock?: () => Date;
}

const LOGIN_PAUSE_MS = 15 * 60_000;

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedUntil: number | null = null;
  private readonly clock: () => Date;

  constructor(private readonly options: SchedulerOptions) {
    this.clock = options.clock ?? (() => new Date());
  }

  start(): void {
    this.interval = setInterval(() => this.tick(), TICK_MS);
    this.startupTimer = setTimeout(() => this.tick(), STARTUP_DELAY_MS);
    for (const source of this.options.sources) {
      if (!this.options.enabled(source.name)) {
        console.log(`[scheduler] ${source.name}: apagada`);
        continue;
      }
      const schedule = this.options.schedules.of(source);
      const when = schedule.kind === 'every-minutes'
        ? `cada ${schedule.minutes} min`
        : `a las ${this.hoursOf(source).join(', ')} (VET)`;
      console.log(`[scheduler] ${source.name}: ${when}`);
    }
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.interval = null;
    this.startupTimer = null;
  }

  pauseForLogin(): Date {
    this.pausedUntil = this.clock().getTime() + LOGIN_PAUSE_MS;
    console.log('[scheduler] pasadas pausadas mientras inicias sesión');
    return new Date(this.pausedUntil);
  }

  resume(): void {
    if (this.pausedUntil === null) return;
    this.pausedUntil = null;
    console.log('[scheduler] pasadas reanudadas');
  }

  isPaused(): boolean {
    return this.pausedUntil !== null && this.clock().getTime() < this.pausedUntil;
  }

  tick(): void {
    if (this.isPaused()) return;
    if (this.options.runner.isBusy()) return;

    const local = toLocalTime(this.clock(), this.options.timeZone());
    const now = this.clock().getTime();
    const due: string[] = [];

    for (const source of this.options.sources) {
      if (!this.options.enabled(source.name)) continue;
      const schedule = this.options.schedules.of(source);
      if (schedule.kind === 'every-minutes') {
        const last = this.options.runner.lastPassAt(source.name);
        if (last === null || now - last >= schedule.minutes * 60_000) due.push(source.name);
        continue;
      }
      const slot = shouldRunPass(local, this.hoursOf(source), this.options.store.read(source.name));
      if (!slot) continue;
      this.options.store.write(source.name, { date: slot.date, hour: slot.hour });
      if (slot.recovered) console.log(`[scheduler] ${source.name}: recuperando la franja de las ${slot.hour}:00 (VET)`);
      due.push(source.name);
    }

    if (due.length) this.options.runner.startScheduled(due);
  }

  markCurrentSlot(): void {
    for (const source of this.options.sources) {
      if (!this.options.enabled(source.name)) continue;
      if (this.options.schedules.of(source).kind !== 'configured-hours') continue;
      const slot = currentSlot(toLocalTime(this.clock(), this.options.timeZone()), this.hoursOf(source));
      if (slot) this.options.store.write(source.name, slot);
    }
  }

  private hoursOf(source: JobSource): readonly number[] {
    const schedule = this.options.schedules.of(source);
    if (schedule.kind !== 'configured-hours') return [];
    return schedule.hours ?? this.options.hours;
  }
}
