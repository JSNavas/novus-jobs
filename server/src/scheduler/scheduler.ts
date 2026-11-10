import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PassRunner } from '../runner.js';
import { currentSlot, shouldRunPass, toVet, type LastPass } from './timing.js';

const TICK_MS = 10 * 60_000;
/** Al arrancar se mira enseguida, para recuperar la franja pendiente sin esperar al siguiente tick. */
const STARTUP_DELAY_MS = 20_000;

/** La marca de la última pasada va a disco: sobrevive a reinicios del servidor. */
export class LastPassStore {
  constructor(private readonly file: string) {}

  read(): LastPass | undefined {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.file, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) return undefined;
      const { date, hour } = parsed as { date?: unknown; hour?: unknown };
      return typeof date === 'string' && typeof hour === 'number' ? { date, hour } : undefined;
    } catch {
      return undefined;
    }
  }

  write(last: LastPass): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(last), 'utf8');
    renameSync(tmp, this.file);
  }
}

interface SchedulerOptions {
  hours: readonly number[];
  store: LastPassStore;
  runner: PassRunner;
  clock?: () => Date;
}

/**
 * Ritmo de ARTIO: tick cada 10 minutos que solo comprueba si toca, sin leer
 * nada. Un tick ocupado no marca la franja, así que se reintenta en el siguiente.
 */
export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly clock: () => Date;

  constructor(private readonly options: SchedulerOptions) {
    this.clock = options.clock ?? (() => new Date());
  }

  start(): void {
    this.interval = setInterval(() => this.tick(), TICK_MS);
    this.startupTimer = setTimeout(() => this.tick(), STARTUP_DELAY_MS);
    console.log(`[scheduler] pasadas a las ${this.options.hours.join(', ')} (VET)`);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.interval = null;
    this.startupTimer = null;
  }

  tick(): void {
    const slot = shouldRunPass(toVet(this.clock()), this.options.hours, this.options.store.read());
    if (!slot) return;
    if (this.options.runner.isBusy()) return;
    this.options.store.write({ date: slot.date, hour: slot.hour });
    if (slot.recovered) console.log(`[scheduler] recuperando la franja de las ${slot.hour}:00 (VET)`);
    this.options.runner.startScheduled();
  }

  /**
   * Una búsqueda manual cuenta como la pasada de la franja actual: así el tick
   * no vuelve a mirar la misma franja justo después.
   */
  markCurrentSlot(): void {
    const slot = currentSlot(toVet(this.clock()), this.options.hours);
    if (slot) this.options.store.write(slot);
  }
}
