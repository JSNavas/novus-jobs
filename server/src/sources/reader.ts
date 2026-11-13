import type { BrowserPool } from '../browser/session.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT_MS = 30_000;
const PROFILE_ID = 'wall';
const LOAD_TIMEOUT_MS = 45_000;
const SETTLE_MS = 2_500;
const POLITE_PAUSE_MS = 700;

const WALL_MARKS = [
  'just a moment',
  'checking your browser',
  'cf-browser-verification',
  'challenge-platform',
  'security verification',
  'enable javascript and cookies to continue',
  'attention required',
];

export function looksLikeABotWall(status: number, body: string): boolean {
  if (status !== 403 && status !== 503 && status !== 429) return false;
  const head = body.slice(0, 4000).toLowerCase();
  return WALL_MARKS.some((mark) => head.includes(mark));
}

export class BotWallError extends Error {
  constructor(readonly url: string) {
    super(
      `${url} está detrás de un muro antibot y solo se deja leer con una ventana de navegador ` +
      'abierta. Las búsquedas programadas no abren ventanas, así que esta fuente no puede correr sola.',
    );
    this.name = 'BotWallError';
  }
}

async function overHttp(url: string): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: response.status, body: await response.text() };
}

export class PageReader {
  private walled = false;

  /**
   * `mayOpenAWindow` solo es cierto cuando hay alguien delante: añadir una fuente.
   * Una pasada programada no abre ventanas — aparecerían solas en mitad del día.
   */
  constructor(
    private readonly pool: BrowserPool | null,
    private readonly mayOpenAWindow = false,
  ) {}

  get usedTheBrowser(): boolean {
    return this.walled;
  }

  async read(url: string, browserOnly = false): Promise<string> {
    if (!browserOnly && !this.walled) {
      const { status, body } = await overHttp(url);
      if (!looksLikeABotWall(status, body)) {
        if (status >= 400) throw new Error(`${url} respondió ${status}.`);
        return body;
      }
      this.walled = true;
    }
    if (this.pool === null || !this.mayOpenAWindow) throw new BotWallError(url);
    return this.inAWindow(url);
  }

  private async inAWindow(url: string): Promise<string> {
    const session = this.pool?.session(PROFILE_ID, 'es-ES', false);
    if (!session) throw new BotWallError(url);
    const context = await session.context();
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS);
      return await page.content();
    } finally {
      await page.close().catch(() => undefined);
      session.scheduleIdleClose();
    }
  }

  async pause(): Promise<void> {
    await new Promise((resume) => setTimeout(resume, POLITE_PAUSE_MS));
  }
}
