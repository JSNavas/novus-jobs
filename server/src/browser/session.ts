import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Cookie, type Page, type Route } from 'playwright';
import { isProfileBusy, profileLockHolder } from './profile-lock.js';

export class ProfileBusyError extends Error {
  constructor(profileDir: string, pid: number) {
    super(
      `el perfil ${profileDir} lo tiene abierto otro navegador (pid ${pid}); ` +
      'un perfil de Chromium solo admite UN proceso. Cierra esa ventana y vuelve a intentarlo: ' +
      'la sesión que iniciaste ahí ya quedó guardada.',
    );
    this.name = 'ProfileBusyError';
  }
}

function missingPlaywright(cause: unknown): Error {
  return new Error(
    'falta playwright: npm i && npx playwright install chromium ' +
    `(${cause instanceof Error ? cause.message : String(cause)})`,
  );
}

const IDLE_CLOSE_MS = 5 * 60_000;

export const NAVIGATION_TIMEOUT_MS = 45_000;

const STATE_SNAPSHOT_MS = 5_000;

export class BrowserSession {
  private ctx: BrowserContext | null = null;
  private starting: Promise<BrowserContext> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private savingCookies = false;

  constructor(
    readonly id: string,
    readonly dir: string,
    private readonly root: string,
    private readonly options: { headless: boolean; locale: string },
  ) {}

  isBusyElsewhere(): boolean {
    return this.ctx === null && isProfileBusy(this.dir);
  }

  async context(): Promise<BrowserContext> {
    this.clearIdleTimer();
    if (this.ctx) return this.ctx;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      const pid = profileLockHolder(this.dir);
      if (pid !== null) throw new ProfileBusyError(this.dir, pid);
      mkdirSync(this.dir, { recursive: true });
      let ctx: BrowserContext;
      try {
        ctx = await chromium.launchPersistentContext(this.dir, {
          headless: this.options.headless,
          viewport: { width: 1440, height: 900 },
          locale: this.options.locale,
          args: ['--disable-blink-features=AutomationControlled'],
        });
      } catch (error) {
        throw missingPlaywright(error);
      }
      await ctx.route('**/*', (route: Route) => {
        const type = route.request().resourceType();
        if (type === 'image' || type === 'media' || type === 'font') return route.abort();
        return route.continue();
      });
      await this.restoreCookies(ctx);
      ctx.on('close', () => { this.ctx = null; });
      this.ctx = ctx;
      console.log(`[browser:${this.id}] arrancado (perfil ${this.dir}, headless=${this.options.headless})`);
      return ctx;
    })();

    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private get stateFile(): string {
    return join(this.root, `${this.id}.cookies.json`);
  }

  private async saveCookies(ctx: BrowserContext): Promise<void> {
    if (this.savingCookies) return;
    this.savingCookies = true;
    try {
      const cookies = await ctx.cookies();
      if (!cookies.length) return;
      mkdirSync(this.root, { recursive: true });
      const tmp = `${this.stateFile}.tmp`;
      writeFileSync(tmp, JSON.stringify(cookies), { encoding: 'utf8', mode: 0o600 });
      renameSync(tmp, this.stateFile);
    } catch {
      // El contexto puede estar cerrándose justo ahora: no es un fallo.
    } finally {
      this.savingCookies = false;
    }
  }

  private async restoreCookies(ctx: BrowserContext): Promise<void> {
    if (!existsSync(this.stateFile)) return;
    try {
      const cookies = JSON.parse(readFileSync(this.stateFile, 'utf8')) as Cookie[];
      if (Array.isArray(cookies) && cookies.length) {
        await ctx.addCookies(cookies);
        console.log(`[browser:${this.id}] sesión restaurada (${cookies.length} cookies)`);
      }
    } catch (error) {
      console.warn(`[browser:${this.id}] no pude restaurar la sesión guardada: ${String(error)}`);
    }
  }

  async rememberSession(): Promise<void> {
    if (this.ctx) await this.saveCookies(this.ctx);
  }

  forgetSession(): void {
    rmSync(this.stateFile, { force: true });
  }

  scheduleIdleClose(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => void this.close(), IDLE_CLOSE_MS);
    this.idleTimer.unref();
  }

  async close(): Promise<void> {
    this.clearIdleTimer();
    const ctx = this.ctx;
    this.ctx = null;
    if (!ctx) return;
    await ctx.close().catch(() => undefined);
    console.log(`[browser:${this.id}] cerrado`);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  async openWindow(url: string): Promise<void> {
    const pid = profileLockHolder(this.dir);
    if (pid !== null) throw new ProfileBusyError(this.dir, pid);
    await this.close();
    mkdirSync(this.dir, { recursive: true });
    let ctx: BrowserContext;
    try {
      ctx = await chromium.launchPersistentContext(this.dir, {
        headless: false,
        viewport: null,
        locale: this.options.locale,
      });
    } catch (error) {
      throw missingPlaywright(error);
    }
    const closed = new Promise<void>((resolve) => ctx.once('close', () => resolve()));

    const watch = (page: Page): void => {
      page.on('domcontentloaded', () => void this.saveCookies(ctx));
    };
    ctx.on('page', watch);
    ctx.pages().forEach(watch);
    const ticker = setInterval(() => void this.saveCookies(ctx), STATE_SNAPSHOT_MS);
    ticker.unref();

    try {
      const page = ctx.pages()[0] ?? await ctx.newPage();
      watch(page);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
        .catch((error: unknown) => {
          console.error(`no se pudo abrir ${url}: ${error instanceof Error ? error.message : String(error)}`);
        });
      await closed;
    } finally {
      clearInterval(ticker);
    }
  }
}

export class BrowserPool {
  private readonly sessions = new Map<string, BrowserSession>();

  constructor(private readonly root: string, private readonly headless: boolean) {}

  session(profileId: string, locale = 'es-ES'): BrowserSession {
    const existing = this.sessions.get(profileId);
    if (existing) return existing;
    const created = new BrowserSession(profileId, join(this.root, profileId), this.root, {
      headless: this.headless,
      locale,
    });
    this.sessions.set(profileId, created);
    return created;
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.sessions.values()].map((s) => s.close()));
  }
}
