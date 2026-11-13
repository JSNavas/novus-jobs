import type { Scheduler } from '../scheduler/scheduler.js';
import type { BrowserPool } from './session.js';

export type LoginStatus = 'idle' | 'open' | 'saved' | 'failed';

export interface LoginState {
  readonly status: LoginStatus;
  readonly message: string | null;
  readonly since: string;
}

const IDLE: LoginState = { status: 'idle', message: null, since: '' };

export class WindowAlreadyOpenError extends Error {
  constructor(readonly profileId: string) {
    super(`ya hay una ventana de ${profileId} abierta: termina en ella o ciérrala.`);
    this.name = 'WindowAlreadyOpenError';
  }
}

export class LoginWindows {
  private readonly states = new Map<string, LoginState>();

  constructor(
    private readonly pool: BrowserPool,
    private readonly scheduler: Pick<Scheduler, 'pauseForLogin' | 'resume'>,
  ) {}

  state(profileId: string): LoginState {
    return this.states.get(profileId) ?? IDLE;
  }

  private mark(profileId: string, status: LoginStatus, message: string | null = null): LoginState {
    const state: LoginState = { status, message, since: new Date().toISOString() };
    this.states.set(profileId, state);
    return state;
  }

  async open(profileId: string, loginUrl: string): Promise<LoginState> {
    if (this.state(profileId).status === 'open') throw new WindowAlreadyOpenError(profileId);

    this.scheduler.pauseForLogin();
    const session = this.pool.session(profileId);
    await session.close();

    const opened = this.mark(profileId, 'open');
    void session.openWindow(loginUrl)
      .then(() => {
        this.mark(profileId, 'saved');
        console.log(`[login] sesión de ${profileId} guardada`);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        this.mark(profileId, 'failed', detail);
        console.warn(`[login] la ventana de ${profileId} no pudo abrirse: ${detail}`);
      })
      .finally(() => {
        this.scheduler.resume();
      });

    return opened;
  }
}
