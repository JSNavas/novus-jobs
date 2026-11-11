import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunsRepository } from './db/runs.repository.js';
import type { CandidateProfile } from './filters/decide.js';
import type { LlmJudge } from './filters/judge.js';
import { failureMail, offersMail } from './notify/digest.js';
import type { Mailer } from './notify/mailer.js';
import { runPasses, type SourceFailure } from './pipeline.js';
import { localDayStart } from './scheduler/timing.js';
import type { JobSource } from './sources/types.js';
import { RunFailure, RunStatus, RunTrigger, type RunInfo } from './types.js';

export interface PassRunner {
  isBusy(): boolean;
  /** Lanza SOLO estas plataformas, por nombre. Las demás no se tocan. */
  startScheduled(sources: readonly string[]): void;
  /** Cuándo tocó esa plataforma por última vez, para las que van por intervalo. */
  lastPassAt(source: string): number | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL RITMO YA NO ES UNO, SINO EL DE CADA PLATAFORMA.
 *
 * Los cuatro límites que protegían la cuenta de LinkedIn vivían aquí como
 * constantes del módulo, y eso los hacía globales por construcción: al entrar
 * la segunda fuente, el presupuesto gastado leyendo LinkedIn impedía consultar
 * una API pública sin cuenta ni sesión. Ahora cada fuente trae su
 * `SourcePolicy` y este fichero solo sabe APLICARLA — los números y el porqué
 * están en `sources/policy.ts`.
 *
 * Lo que no cambió: una pasada a la vez, y cada plataforma con su propia fila
 * en `runs`, que es lo que permite contarle el ritmo por separado.
 * ═══════════════════════════════════════════════════════════════════════════ */

export class RunRefusedError extends Error {}

interface RunnerDeps {
  sources: readonly JobSource[];
  /** El tope de antigüedad, en días. Es una función porque se puede cambiar en caliente. */
  maxAgeDays: () => number;
  jobs: JobsRepository;
  runs: RunsRepository;
  judge: LlmJudge | null;
  /**
   * El perfil del candidato, como función: se lee al empezar cada pasada. Si
   * fuera un valor, editar el stack en Configuración no surtiría efecto hasta
   * reiniciar el servicio — y eso es justo lo que no se le puede pedir a quien
   * acaba de corregir una tecnología.
   */
  profile: () => CandidateProfile;
  /** Si esta plataforma está encendida en Integraciones. Se pregunta en cada pasada. */
  enabled: (source: string) => boolean;
  /**
   * La zona horaria del usuario, de su perfil. El presupuesto diario de
   * lecturas se corta a SU medianoche: con la de UTC, a quien vive al oeste se
   * le reiniciaría el contador a media tarde.
   */
  timeZone: () => string;
  /**
   * Si el alta está completa. Sin perfil no hay nada que coincidir y la pasada
   * descartaría cuanto llegue: se niega antes de gastar una lectura de su
   * cuenta en un resultado que ya se sabe.
   */
  onboarded: () => boolean;
  mailer: Mailer;
  dashboardUrl: string;
  clock?: () => Date;
}

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

/** Un solo run a la vez. Una pasada que falla queda registrada con su motivo y no se reintenta en bucle. */
export class Runner implements PassRunner {
  private busy = false;
  private readonly clock: () => Date;

  constructor(private readonly deps: RunnerDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  isBusy(): boolean {
    return this.busy;
  }

  /**
   * Las franjas (o el intervalo) ya dijeron que toca: aquí solo queda el techo
   * duro de cada plataforma, que vale también para el planificador. Si no, una
   * configuración con muchas franjas lo esquivaría entero.
   */
  startScheduled(names: readonly string[]): void {
    if (!this.deps.onboarded()) {
      console.log('[runner] alta sin terminar: la búsqueda automática espera a que haya perfil');
      return;
    }
    const dayStart = localDayStart(this.clock(), this.deps.timeZone()).toISOString();
    const due = this.sourcesNamed(names).filter((source) => {
      const ceiling = source.policy.maxPassesPerDay;
      if (ceiling === null) return true;
      const today = this.deps.runs.countTouchingSince(dayStart, source.name);
      if (today < ceiling) return true;
      console.warn(`[runner] ${source.name}: techo diario alcanzado (${today} lecturas); la franja se salta`);
      return false;
    });
    if (due.length) this.launch(RunTrigger.Scheduled, due);
  }

  /** Lo que necesita el planificador para las fuentes que van por intervalo. */
  lastPassAt(source: string): number | null {
    const last = this.deps.runs.lastTouchingAt(source);
    return last ? Date.parse(last) : null;
  }

  /**
   * El botón.
   *
   * Pregunta plataforma por plataforma, y lanza las que puedan. Antes era todo
   * o nada: el presupuesto de LinkedIn, ya gastado, bloqueaba también a Get on
   * Board, que no tiene nada que gastar. Si NINGUNA puede, se niega con el
   * motivo de la primera — el del usuario, no el del código.
   */
  startManual(): RunInfo {
    if (this.busy) throw new RunRefusedError('ya hay una búsqueda en curso');
    if (!this.deps.onboarded()) throw new RunRefusedError('todavía no has terminado el alta: sin tu perfil, una búsqueda descartaría todo lo que encuentre');
    const active = this.deps.sources.filter((s) => this.deps.enabled(s.name));
    if (!active.length) throw new RunRefusedError('no hay ninguna plataforma encendida: enciende alguna en Integraciones');

    const allowed: JobSource[] = [];
    const refusals: string[] = [];
    for (const source of active) {
      const why = this.refuseManual(source);
      if (why) refusals.push(`${source.label}: ${why}`);
      else allowed.push(source);
    }
    if (!allowed.length) throw new RunRefusedError(refusals.join(' · '));
    // Las que no pudieron se dicen en el log, no en el error: la búsqueda SÍ
    // arrancó, y un 409 con el texto de una negativa sería mentir.
    if (refusals.length) console.log(`[runner] a mano se saltan — ${refusals.join(' · ')}`);
    return this.launch(RunTrigger.Manual, allowed);
  }

  /** `null` si esta plataforma se puede leer ahora a mano; si no, por qué no. */
  private refuseManual(source: JobSource): string | null {
    const policy = source.policy;
    const last = this.deps.runs.lastManual(source.name);

    // Sin sesión no hay nada que reintentar: el feed va a devolver la misma
    // pantalla de login por mucho que se pulse. Se niega y se dice qué hacer.
    if (last?.failure === RunFailure.LoginRequired) {
      return (
        'la última búsqueda se encontró sin sesión. Inicia sesión otra vez ' +
        `(\`npm run login -- ${source.name}\`) y la siguiente pasada funcionará; ` +
        'insistir ahora solo arriesga la cuenta'
      );
    }

    const now = this.clock().getTime();
    const dayStart = localDayStart(this.clock(), this.deps.timeZone()).toISOString();

    // Presupuesto del día. Se cuenta solo lo que llegó a tocar la plataforma.
    if (policy.manualDailyBudget !== null) {
      const manualToday = this.deps.runs.countTouchingSince(dayStart, source.name, RunTrigger.Manual);
      if (manualToday >= policy.manualDailyBudget) {
        return (
          `ya has buscado a mano ${manualToday} ${manualToday === 1 ? 'vez' : 'veces'} hoy, que es el máximo. ` +
          'Las búsquedas automáticas siguen funcionando: el tope está para que no vea un patrón raro en tu cuenta'
        );
      }
    }
    if (policy.maxPassesPerDay !== null) {
      const today = this.deps.runs.countTouchingSince(dayStart, source.name);
      if (today >= policy.maxPassesPerDay) return `hoy ya se ha leído ${today} veces, que es el techo del día`;
    }

    // Entre manuales. Si la anterior murió con el perfil ocupado no llegó a
    // tocar nada, así que ese suelo es mucho más corto.
    const floor = last?.failure === RunFailure.ProfileBusy ? policy.retryAfterBusyMs : policy.manualMinIntervalMs;
    if (last && floor > 0) {
      const waited = now - Date.parse(last.startedAt);
      if (waited < floor) {
        return (
          `la última búsqueda manual fue hace ${minutes(waited)} min; ` +
          `espera ${minutes(floor - waited)} min más para no subir el ritmo que ve la plataforma`
        );
      }
    }

    // Tras cualquier lectura suya, también la automática.
    if (policy.minGapAfterAnyPassMs > 0) {
      const lastTouch = this.deps.runs.lastTouchingAt(source.name);
      if (lastTouch) {
        const since = now - Date.parse(lastTouch);
        if (since < policy.minGapAfterAnyPassMs) {
          return (
            `se acaba de leer hace ${minutes(since)} min; ` +
            `espera ${minutes(policy.minGapAfterAnyPassMs - since)} min para no encadenar dos lecturas seguidas`
          );
        }
      }
    }
    return null;
  }

  /**
   * Las fuentes pedidas que además estén ENCENDIDAS. El filtro va aquí y no en
   * quien llama porque es el último punto antes de tocar una plataforma: un
   * planificador con una lista calculada hace un minuto no puede leer una cuenta
   * que el usuario acaba de apagar.
   */
  private sourcesNamed(names: readonly string[]): JobSource[] {
    return this.deps.sources.filter((source) => names.includes(source.name) && this.deps.enabled(source.name));
  }

  /**
   * UNA FILA DE `runs` POR PLATAFORMA, y las pasadas en serie.
   *
   * Antes era una sola fila con los nombres pegados con comas. Eso bastaba con
   * una fuente, pero hace imposible contarle el ritmo a cada una por separado
   * —que es justo lo que protege la cuenta de LinkedIn sin castigar a una API
   * abierta— y además mezclaba en un número los resultados de dos sitios.
   *
   * En serie, no en paralelo: dos navegadores a la vez son dos plataformas
   * viendo actividad simultánea desde la misma máquina.
   */
  private launch(trigger: RunTrigger, sources: readonly JobSource[]): RunInfo {
    this.busy = true;
    const startedAt = this.clock().toISOString();
    const planned = sources.map((source) => ({ source, id: this.deps.runs.start(source.name, trigger, startedAt) }));
    const first = this.deps.runs.find(planned[0]!.id);
    if (!first) throw new Error(`la pasada ${planned[0]!.id} no se encontró tras crearla`);
    void this.executeAll(planned);
    return first;
  }

  private async executeAll(planned: readonly { source: JobSource; id: number }[]): Promise<void> {
    try {
      for (const { source, id } of planned) {
        await this.execute(id, source);
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * Avisa por correo de las ofertas nuevas. Solo si hay: un correo de "hoy no
   * hay nada" tres veces al día enseña a no abrirlos, y entonces tampoco se
   * abriría el día que llegue la buena.
   */
  private async announce(accepted: readonly NewJob[]): Promise<void> {
    if (!accepted.length || !this.deps.mailer.enabled()) return;
    await this.deps.mailer.send(offersMail(accepted, this.deps.dashboardUrl));
  }

  /**
   * Avisa de que la búsqueda está parada, UNA sola vez por racha.
   *
   * Una sesión caída no se nota sola: el dashboard sigue enseñando lo de ayer y
   * todo parece normal mientras pasan los días sin buscar nada. Pero si se
   * avisara en cada pasada serían tres correos diarios repitiendo lo mismo
   * hasta que él tuviera un rato, así que se mira la pasada ANTERIOR: si ya
   * falló por lo mismo, él ya está avisado y aquí no se dice nada.
   */
  private async warn(id: number, failure: RunFailure, detail: string): Promise<void> {
    if (!this.deps.mailer.enabled()) return;
    const previous = this.deps.runs.previousTo(id);
    if (previous?.status === RunStatus.Error && previous.failure === failure) return;
    await this.deps.mailer.send(failureMail(failure, detail, this.deps.dashboardUrl));
  }

  private async execute(id: number, source: JobSource): Promise<void> {
    try {
      const result = await runPasses([source], {
        // Se lee EN CADA PASADA, no al arrancar: si él cambia el tope en
        // Configuración, la siguiente búsqueda ya lo respeta sin reiniciar nada.
        maxAgeDays: this.deps.maxAgeDays(),
        jobs: this.deps.jobs,
        judge: this.deps.judge,
        profile: this.deps.profile(),
        runId: id,
      });
      const note = describe(result.failures);

      // La fuente falló y no entregó nada: la fila se cierra como error. Las
      // demás plataformas de esta tanda siguen con su propia fila, así que una
      // caída ya no se lleva por delante lo que las otras sí leyeron.
      if (note && result.outcome.fetched === 0) {
        this.deps.runs.fail(id, note.message, note.failure);
        console.error(`[run ${id}] error: ${note.message}`);
        await this.warn(id, note.failure, note.message);
        return;
      }
      this.deps.runs.finish(id, result.outcome, note);
      const partial = note ? ` (parcial: ${note.message})` : '';
      console.log(
        `[run ${id}] ${source.name} ok: ${result.outcome.fetched} leídas, ` +
        `${result.outcome.accepted} aceptadas, ${result.outcome.rejected} descartadas${partial}`,
      );
      await this.announce(result.accepted);
    } catch (error) {
      // `runPasses` ya atrapa por fuente: si algo llega aquí es un fallo del
      // propio pipeline (la BD, el juez), no de una plataforma.
      const message = error instanceof Error ? error.message : String(error);
      this.deps.runs.fail(id, message, RunFailure.Other);
      console.error(`[run ${id}] ${source.name} error: ${message}`);
    }
  }
}

function describe(failures: readonly SourceFailure[]): { message: string; failure: RunFailure } | null {
  if (!failures.length) return null;
  const sorted = [...failures].sort((a, b) => rank(a.kind) - rank(b.kind));
  const first = sorted[0]!;
  return {
    message: sorted.map((f) => `[${f.source}] ${f.message}`).join(' | '),
    failure: first.kind,
  };
}

const RANKS: Record<RunFailure, number> = {
  [RunFailure.LoginRequired]: 0,
  [RunFailure.ProfileBusy]: 1,
  [RunFailure.Layout]: 2,
  [RunFailure.Other]: 3,
};

function rank(kind: RunFailure): number {
  return RANKS[kind];
}
