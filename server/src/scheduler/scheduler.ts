import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PassRunner } from '../runner.js';
import type { JobSource } from '../sources/types.js';
import type { SourceSchedules } from '../sources/schedules.js';
import { currentSlot, shouldRunPass, toVet, type LastPass } from './timing.js';

/**
 * Cada cuánto se MIRA si toca. No es cada cuánto se lee.
 *
 * Bajó de 10 a 5 minutos al entrar una fuente que va cada 30: con ticks de 10
 * el intervalo real oscilaba entre 30 y 40 minutos según cómo cayera el reloj.
 * Un tick no toca ninguna plataforma —solo compara fechas— así que mirar más a
 * menudo no cuesta nada ni cambia el ritmo que nadie ve.
 */
const TICK_MS = 5 * 60_000;
/** Al arrancar se mira enseguida, para recuperar la franja pendiente sin esperar al siguiente tick. */
const STARTUP_DELAY_MS = 20_000;

/**
 * La marca de la última franja va a disco: sobrevive a reinicios del servidor.
 *
 * UNA MARCA POR PLATAFORMA. Con una sola, dos fuentes en franjas compartirían
 * el registro y la segunda se daría por hecha sin haber leído nada. El fichero
 * viejo —`{date, hour}` suelto, de cuando solo existía LinkedIn— se sigue
 * leyendo como la marca de LinkedIn, para no perder la franja del día al
 * desplegar esto.
 */
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
  /** Las franjas de `SCHEDULE_HOURS`: el defecto de quien no tenga horario propio. */
  hours: readonly number[];
  sources: readonly JobSource[];
  /**
   * El horario vivo de cada fuente, leído de la base en cada tick.
   *
   * Se consulta cada vez y no se guarda: cambiar el ritmo en Integraciones
   * tiene que notarse en el tick siguiente, no al reiniciar el servicio.
   */
  schedules: SourceSchedules;
  /** Si una plataforma está encendida. Se pregunta en cada tick, no al arrancar. */
  enabled: (source: string) => boolean;
  store: LastPassStore;
  runner: PassRunner;
  clock?: () => Date;
}

/**
 * Cuánto se pausan las pasadas mientras el señor inicia sesión a mano.
 *
 * Es un techo, no una espera: el login avisa al terminar y la pausa se levanta
 * sola. El techo está para que un login que se abandone a medias —o un script
 * que muera— no deje las pasadas apagadas para siempre.
 */
const LOGIN_PAUSE_MS = 15 * 60_000;

/**
 * Ritmo de ARTIO: tick cada 10 minutos que solo comprueba si toca, sin leer
 * nada. Un tick ocupado no marca la franja, así que se reintenta en el siguiente.
 */
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

  /**
   * Pausa las pasadas mientras hay una ventana de login abierta.
   *
   * Sin esto, el login y la pasada se pelean por el perfil: el señor abre la
   * ventana, llega la franja de las 13:00, la pasada intenta arrancar su
   * Chromium sobre el mismo perfil y falla — o peor, el señor cierra el login y
   * la pasada se queda con una sesión a medio guardar.
   *
   * La franja NO se marca: si tocaba mirar y no se pudo, se recupera en el tick
   * siguiente, que es exactamente lo que `shouldRunPass` sabe hacer.
   */
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

  /**
   * Mira si le toca a ALGUNA plataforma. Dos cadencias conviven:
   *
   *   · por franjas   → la de siempre, con su marca en disco y recuperación de
   *                     la franja perdida si el servidor estuvo apagado.
   *   · por intervalo → se compara con su última pasada REAL, leída de la base.
   *                     No necesita marca: la propia fila es la marca, así que
   *                     un reinicio no la descoloca ni la duplica.
   */
  tick(): void {
    if (this.isPaused()) return;
    if (this.options.runner.isBusy()) return;

    const vet = toVet(this.clock());
    const now = this.clock().getTime();
    const due: string[] = [];

    for (const source of this.options.sources) {
      // Una apagada no marca franja ni acumula retraso: cuando se encienda,
      // empieza desde su siguiente franja y no con una recuperación de ayer.
      if (!this.options.enabled(source.name)) continue;
      const schedule = this.options.schedules.of(source);
      if (schedule.kind === 'every-minutes') {
        const last = this.options.runner.lastPassAt(source.name);
        if (last === null || now - last >= schedule.minutes * 60_000) due.push(source.name);
        continue;
      }
      const slot = shouldRunPass(vet, this.hoursOf(source), this.options.store.read(source.name));
      if (!slot) continue;
      this.options.store.write(source.name, { date: slot.date, hour: slot.hour });
      if (slot.recovered) console.log(`[scheduler] ${source.name}: recuperando la franja de las ${slot.hour}:00 (VET)`);
      due.push(source.name);
    }

    if (due.length) this.options.runner.startScheduled(due);
  }

  /**
   * Una búsqueda manual cuenta como la pasada de la franja actual: así el tick
   * no vuelve a mirar la misma franja justo después.
   *
   * Solo para las de franjas. Las de intervalo no llevan marca: su reloj es la
   * última fila de `runs`, que la búsqueda manual acaba de escribir.
   */
  markCurrentSlot(): void {
    for (const source of this.options.sources) {
      if (!this.options.enabled(source.name)) continue;
      if (this.options.schedules.of(source).kind !== 'configured-hours') continue;
      const slot = currentSlot(toVet(this.clock()), this.hoursOf(source));
      if (slot) this.options.store.write(source.name, slot);
    }
  }

  /** Las franjas de esta fuente: las suyas si las eligió, y si no las del `.env`. */
  private hoursOf(source: JobSource): readonly number[] {
    const schedule = this.options.schedules.of(source);
    if (schedule.kind !== 'configured-hours') return [];
    return schedule.hours ?? this.options.hours;
  }
}
