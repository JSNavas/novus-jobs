import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunsRepository } from './db/runs.repository.js';
import type { CandidateProfile } from './filters/decide.js';
import type { ClaudeJudge } from './filters/judge.js';
import { failureMail, offersMail } from './notify/digest.js';
import type { Mailer } from './notify/mailer.js';
import { runPasses, type SourceFailure } from './pipeline.js';
import { vetDayStart } from './scheduler/timing.js';
import type { JobSource } from './sources/types.js';
import { RunFailure, RunStatus, RunTrigger, type RunInfo } from './types.js';

export interface PassRunner {
  isBusy(): boolean;
  startScheduled(): void;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL RITMO QUE VE LINKEDIN. Es lo único que protege la cuenta, y por eso no es
 * un número suelto sino CUATRO LÍMITES que se cumplen todos a la vez.
 *
 * Lo que LinkedIn mide no es cuántas veces pulsas un botón: es cuántas veces
 * un navegador automatizado carga tu feed, cada cuánto, y si ese patrón parece
 * una persona. Un solo tope "una por hora" deja pasar cosas que no parecen una
 * persona — pulsar justo después de la pasada automática, o veinticuatro
 * lecturas en un día repartidas una por hora.
 *
 * La referencia es ARTIO: tres pasadas al día, sin botón, y la cuenta del señor
 * lleva meses sana. Aquí hay botón porque el dashboard lo pide, así que estos
 * límites existen para que tenerlo no cambie lo que LinkedIn ve.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** 1. Entre dos búsquedas a mano. */
const MANUAL_MIN_INTERVAL_MS = 60 * 60_000;

/**
 * 2. Después de CUALQUIER lectura, también la automática.
 *
 * Sin esto, el botón pulsado a las 18:01 encadenaba dos cargas del feed con un
 * minuto de diferencia: la de la franja de las 6 y la tuya. Dos lecturas
 * seguidas es el patrón que menos se parece a una persona mirando LinkedIn.
 */
const MIN_GAP_AFTER_ANY_PASS_MS = 20 * 60_000;

/**
 * 3. Búsquedas a mano por día (día de Venezuela).
 *
 * Con el suelo de una hora, un día de insistir son catorce lecturas. Ninguna
 * persona abre LinkedIn catorce veces a buscar lo mismo, y el total diario es
 * lo que de verdad dibuja el patrón.
 */
const MANUAL_DAILY_BUDGET = 3;

/**
 * 4. Techo duro de lecturas al día, cuente quien las pida.
 *
 * Es la red de seguridad, no el límite de uso: con la configuración normal
 * —3 franjas + hasta 3 manuales— nunca salta. Está para que un `SCHEDULE_HOURS`
 * con doce horas, o un fallo que reintente en bucle, no puedan convertirse en
 * un día de cargas continuas sin que nadie lo pare.
 */
const MAX_PASSES_PER_DAY = 8;

/**
 * La ÚNICA excepción al suelo de una hora: el perfil estaba cogido por otra
 * ventana de Chromium. Eso no llegó a tocar la plataforma —ni se abrió el
 * navegador— así que reintentar no le cuesta nada a la cuenta, y lo arregla
 * cerrar una ventana.
 *
 * Antes la excepción era "la última manual leyó 0 publicaciones", y eso estaba
 * al revés: una sesión caída lee 0 publicaciones, así que una sesión perdida
 * autorizaba a golpear el feed cada diez minutos indefinidamente — justo el
 * comportamiento que marca una cuenta, y justo cuando menos convenía.
 */
const MANUAL_RETRY_AFTER_BUSY_MS = 5 * 60_000;

export class RunRefusedError extends Error {}

interface RunnerDeps {
  sources: readonly JobSource[];
  jobs: JobsRepository;
  runs: RunsRepository;
  judge: ClaudeJudge | null;
  profile: CandidateProfile;
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

  startScheduled(): void {
    // El techo duro vale también para el planificador: si no, una
    // configuración con muchas franjas lo esquivaría entero.
    const today = this.deps.runs.countTouchingSince(vetDayStart(this.clock()).toISOString());
    if (today >= MAX_PASSES_PER_DAY) {
      console.warn(`[runner] techo diario alcanzado (${today} lecturas): la franja se salta para no machacar la plataforma`);
      return;
    }
    this.launch(RunTrigger.Scheduled);
  }

  startManual(): RunInfo {
    if (this.busy) throw new RunRefusedError('ya hay una búsqueda en curso');
    const last = this.deps.runs.lastManual();

    // Sin sesión no hay nada que reintentar: el feed va a devolver la misma
    // pantalla de login por mucho que se pulse. Se niega y se dice qué hacer.
    if (last?.failure === RunFailure.LoginRequired) {
      throw new RunRefusedError(
        'la última búsqueda se encontró sin sesión. Inicia sesión otra vez (`npm run login -- <plataforma>`) ' +
        'y la siguiente pasada funcionará; insistir ahora solo arriesga la cuenta. ' +
        'El detalle está en el error de esa pasada.',
      );
    }

    const now = this.clock().getTime();
    const dayStart = vetDayStart(this.clock()).toISOString();

    // Presupuesto del día. Se cuenta solo lo que llegó a cargar el feed.
    const manualToday = this.deps.runs.countTouchingSince(dayStart, RunTrigger.Manual);
    if (manualToday >= MANUAL_DAILY_BUDGET) {
      throw new RunRefusedError(
        `ya has buscado a mano ${manualToday} ${manualToday === 1 ? 'vez' : 'veces'} hoy, que es el máximo. ` +
        'Las búsquedas automáticas siguen funcionando: el tope está para que LinkedIn no vea un patrón raro en tu cuenta.',
      );
    }
    const today = this.deps.runs.countTouchingSince(dayStart);
    if (today >= MAX_PASSES_PER_DAY) {
      throw new RunRefusedError(`hoy ya se ha leído el feed ${today} veces, que es el techo del día`);
    }

    // Entre manuales. Si la anterior murió con el perfil ocupado no llegó a
    // tocar nada, así que ese suelo es mucho más corto.
    const floor = last?.failure === RunFailure.ProfileBusy ? MANUAL_RETRY_AFTER_BUSY_MS : MANUAL_MIN_INTERVAL_MS;
    if (last) {
      const waited = now - Date.parse(last.startedAt);
      if (waited < floor) {
        throw new RunRefusedError(
          `la última búsqueda manual fue hace ${minutes(waited)} min; ` +
          `espera ${minutes(floor - waited)} min más para no subir el ritmo que ve la plataforma`,
        );
      }
    }

    // Tras cualquier lectura, también la automática.
    const lastTouch = this.deps.runs.lastTouchingAt();
    if (lastTouch) {
      const since = now - Date.parse(lastTouch);
      if (since < MIN_GAP_AFTER_ANY_PASS_MS) {
        throw new RunRefusedError(
          `se acaba de leer el feed hace ${minutes(since)} min; ` +
          `espera ${minutes(MIN_GAP_AFTER_ANY_PASS_MS - since)} min para no encadenar dos lecturas seguidas`,
        );
      }
    }
    return this.launch(RunTrigger.Manual);
  }

  private launch(trigger: RunTrigger): RunInfo {
    this.busy = true;
    const id = this.deps.runs.start(this.deps.sources.map((s) => s.name).join(','), trigger, this.clock().toISOString());
    const run = this.deps.runs.find(id);
    if (!run) throw new Error(`la pasada ${id} no se encontró tras crearla`);
    void this.execute(id);
    return run;
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

  private async execute(id: number): Promise<void> {
    try {
      const result = await runPasses(this.deps.sources, {
        jobs: this.deps.jobs,
        judge: this.deps.judge,
        profile: this.deps.profile,
      });
      const note = describe(result.failures);

      // Una pasada sin NI UNA oferta leída y con fuentes caídas es un fallo. Si
      // alguna plataforma entregó, la pasada valió: se cierra bien y el motivo
      // de la que falló queda anotado, no escondido.
      if (note && result.outcome.fetched === 0) {
        this.deps.runs.fail(id, note.message, note.failure);
        console.error(`[run ${id}] error: ${note.message}`);
        await this.warn(id, note.failure, note.message);
        return;
      }
      this.deps.runs.finish(id, result.outcome, note);
      const partial = note ? ` (parcial: ${note.message})` : '';
      console.log(
        `[run ${id}] ok: ${result.outcome.fetched} leídas, ` +
        `${result.outcome.accepted} aceptadas, ${result.outcome.rejected} descartadas${partial}`,
      );
      await this.announce(result.accepted);
    } catch (error) {
      // `runPasses` ya atrapa por fuente: si algo llega aquí es un fallo del
      // propio pipeline (la BD, el juez), no de una plataforma.
      const message = error instanceof Error ? error.message : String(error);
      this.deps.runs.fail(id, message, RunFailure.Other);
      console.error(`[run ${id}] error: ${message}`);
    } finally {
      this.busy = false;
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
