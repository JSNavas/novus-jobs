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
  startScheduled(sources: readonly string[]): void;
  lastPassAt(source: string): number | null;
}

export class RunRefusedError extends Error {}

interface RunnerDeps {
  sources: readonly JobSource[];
  maxAgeDays: () => number;
  jobs: JobsRepository;
  runs: RunsRepository;
  judge: LlmJudge | null;
  profile: () => CandidateProfile;
  enabled: (source: string) => boolean;
  timeZone: () => string;
  onboarded: () => boolean;
  mailer: Mailer;
  dashboardUrl: string;
  clock?: () => Date;
}

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

export class Runner implements PassRunner {
  private busy = false;
  private readonly clock: () => Date;

  constructor(private readonly deps: RunnerDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  isBusy(): boolean {
    return this.busy;
  }

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

  lastPassAt(source: string): number | null {
    const last = this.deps.runs.lastTouchingAt(source);
    return last ? Date.parse(last) : null;
  }

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
    if (refusals.length) console.log(`[runner] a mano se saltan — ${refusals.join(' · ')}`);
    return this.launch(RunTrigger.Manual, allowed);
  }

  private refuseManual(source: JobSource): string | null {
    const policy = source.policy;
    const last = this.deps.runs.lastManual(source.name);

    if (last?.failure === RunFailure.LoginRequired) {
      return (
        'la última búsqueda se encontró sin sesión. Inicia sesión otra vez ' +
        `(\`npm run login -- ${source.name}\`) y la siguiente pasada funcionará; ` +
        'insistir ahora solo arriesga la cuenta'
      );
    }

    const now = this.clock().getTime();
    const dayStart = localDayStart(this.clock(), this.deps.timeZone()).toISOString();

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

  private sourcesNamed(names: readonly string[]): JobSource[] {
    return this.deps.sources.filter((source) => names.includes(source.name) && this.deps.enabled(source.name));
  }

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

  private async announce(accepted: readonly NewJob[]): Promise<void> {
    if (!accepted.length || !this.deps.mailer.enabled()) return;
    await this.deps.mailer.send(offersMail(accepted, this.deps.dashboardUrl, this.deps.profile().language));
  }

  private async warn(id: number, failure: RunFailure, detail: string): Promise<void> {
    if (!this.deps.mailer.warnsEnabled()) return;
    const previous = this.deps.runs.previousTo(id);
    if (previous?.status === RunStatus.Error && previous.failure === failure) return;
    await this.deps.mailer.send(
      failureMail(failure, detail, this.deps.dashboardUrl, this.deps.profile().language),
    );
  }

  private async execute(id: number, source: JobSource): Promise<void> {
    try {
      const result = await runPasses([source], {
        maxAgeDays: this.deps.maxAgeDays(),
        jobs: this.deps.jobs,
        judge: this.deps.judge,
        profile: this.deps.profile(),
        runId: id,
      });
      const note = describe(result.failures);

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
