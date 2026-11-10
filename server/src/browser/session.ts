import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Cookie, type Page, type Route } from 'playwright';
import { isProfileBusy, profileLockHolder } from './profile-lock.js';

/**
 * El perfil lo tiene cogido otro Chromium VIVO. No es un fallo de la
 * plataforma ni de la red: es una ventana abierta, casi siempre la del login.
 * Viaja como tipo propio porque es el único motivo de fallo que SÍ se puede
 * reintentar pronto sin tocar LinkedIn de más.
 */
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

/** Playwright no está instalado: se dice claro, no se finge otro error. */
function missingPlaywright(cause: unknown): Error {
  return new Error(
    'falta playwright: npm i && npx playwright install chromium ' +
    `(${cause instanceof Error ? cause.message : String(cause)})`,
  );
}

/**
 * Cuánto se queda vivo el navegador sin usarse. Arrancar Chromium cuesta
 * segundos; apagarlo tras cada lectura los pagaría en cada pasada. Es el mismo
 * número que usa ARTIO.
 */
const IDLE_CLOSE_MS = 5 * 60_000;

/** Lo que tarda en abrirse una web pesada sin quedarse colgado para siempre. */
export const NAVIGATION_TIMEOUT_MS = 45_000;

/**
 * Cada cuánto se copian las cookies de la ventana de login a nuestro fichero.
 * Además se copia en cada navegación, así que esto es solo la red de seguridad.
 */
const STATE_SNAPSHOT_MS = 5_000;

/**
 * UN perfil de navegador, con UN Chromium detrás.
 *
 * Toda plataforma que necesite sesión iniciada (LinkedIn hoy, InfoJobs o
 * Glassdoor mañana) pide su sesión aquí y no lanza navegadores por su cuenta.
 * Esa es la regla que mantiene la cuenta sana: el número de Chromium que ve la
 * plataforma no depende de cuántas fuentes haya activas.
 *
 * Dos modos, nunca a la vez:
 *   - `context()`  headless, para leer. Es lo que corre tres veces al día.
 *   - `openWindow()` con ventana, para que el señor inicie sesión a mano.
 */
export class BrowserSession {
  private ctx: BrowserContext | null = null;
  /** Arranque en curso: dos lecturas a la vez no deben levantar dos Chromium. */
  private starting: Promise<BrowserContext> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private savingCookies = false;

  constructor(
    readonly id: string,
    readonly dir: string,
    private readonly root: string,
    private readonly options: { headless: boolean; locale: string },
  ) {}

  /** `true` si un proceso vivo (nuestro o ajeno) tiene cogido el perfil. */
  isBusyElsewhere(): boolean {
    return this.ctx === null && isProfileBusy(this.dir);
  }

  /**
   * El contexto headless de lectura. Se reusa mientras esté vivo.
   *
   * La huella es fija y deliberada: el mismo viewport, el mismo idioma y el
   * mismo flag en todas las pasadas. Lo que la plataforma ve hoy es lo que verá
   * mañana, y eso es más importante que cualquier truco de sigilo.
   */
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
          // Sin locale es-ES LinkedIn sirve el feed en inglés y los textos que
          // busca el extractor ("Publicación en el feed") no aparecen.
          locale: this.options.locale,
          // La zona horaria NO se fija: Chromium hereda la del sistema, que es
          // la de verdad. Mentirle a la plataforma sobre dónde estás es
          // exactamente el tipo de incoherencia que levanta una revisión.
          args: ['--disable-blink-features=AutomationControlled'],
        });
      } catch (error) {
        throw missingPlaywright(error);
      }
      // Imágenes, vídeo y fuentes no aportan ni una palabra al texto y son la
      // mayor parte de lo que tarda en cargar un feed. Se cortan en la puerta:
      // menos peticiones por pasada y pasadas más cortas.
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

  /**
   * ═══ POR QUÉ EL PERFIL NO BASTA ═══
   *
   * Medido el 2026-11-10 con la cuenta del señor: inició sesión en la ventana,
   * vio su feed, cerró, y en el perfil quedaron `bcookie`, `bscookie`, `lidc` y
   * `__cf_bm` — pero NO `li_at`. La siguiente lectura, headless o con ventana,
   * caía en `/uas/login`. No es detección de bots ni un cierre a destiempo: es
   * que LinkedIn entregó `li_at` como cookie DE SESIÓN, sin fecha de
   * caducidad, y una cookie de sesión vive en memoria y muere con el navegador.
   * Chromium hizo exactamente lo que debía al no escribirla.
   *
   * Por eso la sesión se guarda aparte: se copian las cookies mientras la
   * ventana está viva y se reinyectan en cada contexto de lectura. Es lo que
   * convierte "iniciar sesión" en algo que pasa UNA vez.
   *
   * El fichero lleva cookies de autenticación: vale lo mismo que la
   * contraseña. Va fuera del perfil (Chromium no lo toca) y con permisos 600.
   */
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

  /**
   * Refresca la sesión guardada tras una lectura que fue bien.
   *
   * LinkedIn rota sus cookies: si solo se guardaran las del login, la copia se
   * quedaría vieja y un día dejaría de valer sin que nadie supiera por qué.
   */
  async rememberSession(): Promise<void> {
    if (this.ctx) await this.saveCookies(this.ctx);
  }

  /** Olvida la sesión guardada. Para cuando la plataforma nos echa de verdad. */
  forgetSession(): void {
    rmSync(this.stateFile, { force: true });
  }

  /** Se llama al terminar de leer: el navegador se apaga solo si nadie vuelve. */
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

  /**
   * Abre una ventana DE VERDAD y se queda ahí hasta que el señor la cierra.
   *
   * Dos cosas que no son adorno:
   *
   *  - `viewport: null` y SIN `--disable-blink-features`. El resto del tiempo la
   *    huella de lectura es fija, pero el login es el momento en que la
   *    plataforma mira con más lupa, y ahí lo que más se parece a una persona es
   *    un Chromium sin tocar en una ventana del tamaño que tenga la pantalla.
   *
   *  - La espera es el CIERRE DE LA VENTANA, no un temporizador ni una URL.
   *    Esperar a que la URL llegue al feed y cerrar cinco segundos después es
   *    adivinar: la plataforma todavía está rotando cookies de sesión, y un
   *    cierre a destiempo guarda una sesión a medias que caduca en días. Cuando
   *    el señor cierra la ventana, Chromium vuelca su cookie jar entero en un
   *    cierre limpio. Además así un checkpoint de verificación no rompe nada:
   *    tarda lo que tarde.
   */
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

    // ═══ LA SESIÓN SE COPIA MIENTRAS LA VENTANA VIVE ═══
    //
    // No se puede leer las cookies DESPUÉS de cerrar: para entonces el
    // navegador ya no existe y `li_at`, que es de sesión, se fue con él. Así
    // que se copia cada pocos segundos y en cada navegación — la que lleva al
    // feed tras entrar es justo la que trae la cookie buena.
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

/**
 * Los perfiles de navegador del proyecto, uno por plataforma que necesite
 * sesión. Las fuentes piden el suyo por id y comparten el de al lado si
 * declaran el mismo: añadir o quitar una plataforma no toca esto.
 */
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

  /** Suelta TODOS los perfiles: lo que necesita el login para poder arrancar. */
  async closeAll(): Promise<void> {
    await Promise.all([...this.sessions.values()].map((s) => s.close()));
  }
}
