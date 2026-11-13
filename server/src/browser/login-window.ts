import { profileLockHolder } from './profile-lock.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import type { BrowserPool } from './session.js';

export type LoginStatus = 'idle' | 'open' | 'saved' | 'failed';

export interface LoginState {
  readonly status: LoginStatus;
  readonly message: string | null;
  readonly since: string;
  readonly signedIn: boolean;
}

interface Remembered {
  status: LoginStatus;
  message: string | null;
  since: string;
}

const IDLE: Remembered = { status: 'idle', message: null, since: '' };

export class WindowAlreadyOpenError extends Error {
  constructor(readonly profileId: string) {
    super(`ya hay una ventana de ${profileId} abierta: termina en ella o ciérrala.`);
    this.name = 'WindowAlreadyOpenError';
  }
}

export class LoginWindows {
  private readonly states = new Map<string, Remembered>();

  constructor(
    private readonly pool: BrowserPool,
    private readonly scheduler: Pick<Scheduler, 'pauseForLogin' | 'resume'>,
  ) {}

  state(profileId: string): LoginState {
    const session = this.pool.session(profileId);
    const stored = this.states.get(profileId) ?? IDLE;
    const status = stored.status === 'open' && profileLockHolder(session.dir) === null
      ? 'saved' as const
      : stored.status;
    if (status !== stored.status) this.states.set(profileId, { ...stored, status });
    return { ...stored, status, signedIn: session.hasSession };
  }

  private mark(profileId: string, status: LoginStatus, message: string | null = null): LoginState {
    this.states.set(profileId, { status, message, since: new Date().toISOString() });
    return this.state(profileId);
  }

  async cancel(profileId: string): Promise<LoginState> {
    await this.pool.session(profileId).close();
    return this.mark(profileId, 'idle');
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
