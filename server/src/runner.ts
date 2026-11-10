import type { JobsRepository } from './db/jobs.repository.js';
import type { RunsRepository } from './db/runs.repository.js';
import type { CandidateProfile } from './filters/decide.js';
import type { ClaudeJudge } from './filters/judge.js';
import { runPasses } from './pipeline.js';
import type { JobSource } from './sources/types.js';
import { RunTrigger, type RunInfo } from './types.js';

export interface PassRunner {
  isBusy(): boolean;
  startScheduled(): void;
}

/** Una búsqueda manual por hora: el botón no puede multiplicar el ritmo que LinkedIn ve hoy con ARTIO. */
const MANUAL_MIN_INTERVAL_MS = 60 * 60_000;

export class RunRefusedError extends Error {}

export interface RunnerDeps {
  sources: readonly JobSource[];
  jobs: JobsRepository;
  runs: RunsRepository;
  judge: ClaudeJudge | null;
  profile: CandidateProfile;
  clock?: () => Date;
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
    this.launch(RunTrigger.Scheduled);
  }

  startManual(): RunInfo {
    if (this.busy) throw new RunRefusedError('ya hay una búsqueda en curso');
    const last = this.deps.runs.lastManualStartedAt();
    if (last && this.clock().getTime() - Date.parse(last) < MANUAL_MIN_INTERVAL_MS) {
      throw new RunRefusedError('solo se permite una búsqueda manual por hora');
    }
    return this.launch(RunTrigger.Manual);
  }

  private launch(trigger: RunTrigger): RunInfo {
    this.busy = true;
    const id = this.deps.runs.start(this.deps.sources.map((s) => s.name).join(','), trigger);
    const run = this.deps.runs.find(id);
    if (!run) throw new Error(`la pasada ${id} no se encontró tras crearla`);
    void this.execute(id);
    return run;
  }

  private async execute(id: number): Promise<void> {
    try {
      const outcome = await runPasses(this.deps.sources, {
        jobs: this.deps.jobs,
        judge: this.deps.judge,
        profile: this.deps.profile,
      });
      this.deps.runs.finish(id, outcome);
      console.log(`[run ${id}] ok: ${outcome.fetched} leídas, ${outcome.accepted} aceptadas, ${outcome.rejected} descartadas`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.runs.fail(id, message);
      console.error(`[run ${id}] error: ${message}`);
    } finally {
      this.busy = false;
    }
  }
}
