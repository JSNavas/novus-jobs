import { lstatSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import type { Config } from '../config.js';
import type { JobSource, PermalinkSelector, RawPost } from './types.js';

interface PostSnapshot {
  text: string;
  author: string | null;
  authorUrl: string | null;
  externalLinks: string[];
}

/* Valores copiados del ritmo de ARTIO (job-watch.service.ts / web-reader.service.ts):
 * LinkedIn tiene que ver exactamente el mismo patrón de navegación que ve hoy con ARTIO. */
const NAVIGATION_TIMEOUT_MS = 45_000;
const SETTLE_MS = 4_000;
const SCROLLS = 8;
const SCROLL_PAUSE_MS = 2_500;
const MENU_WAIT_MS = 1_200;
const COPY_WAIT_MS = 800;
const IDLE_CLOSE_MS = 5 * 60_000;
const MENU_SELECTOR = 'button[aria-label*="opcion" i], button[aria-label*="Más" i], button[aria-label*="control" i], button[aria-label*="menu" i]';

export function isProfileLocked(profileDir: string): boolean {
  try {
    lstatSync(join(profileDir, 'SingletonLock'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee el feed de LinkedIn con la sesión persistida. No hay API de empleo: es
 * la misma lectura que hace ARTIO. Un único navegador a la vez: el perfil lo
 * bloquea el SingletonLock de Chrome, y si está ocupado la pasada falla sin
 * reintentar en bucle.
 */
export class LinkedInSource implements JobSource {
  readonly name = 'linkedin';
  private context: BrowserContext | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(private readonly config: Config) {}

  async fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]> {
    const context = await this.openContext();
    const page = await context.newPage();
    try {
      await page.goto(this.config.linkedinFeedUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS);
      await scrollFeed(page);
      const snapshots = await collectPosts(page);
      if (snapshots.length === 0) await this.failEmptyPass(page);
      const posts = snapshots.map(toRawPost);
      for (const index of new Set(selectPermalinks(posts))) {
        const post = posts[index];
        const permalink = await copyPermalink(page, index);
        if (post && permalink) posts[index] = { ...post, url: permalink };
      }
      return posts;
    } finally {
      await page.close().catch(() => undefined);
      this.scheduleIdleClose();
    }
  }

  private async failEmptyPass(page: Page): Promise<never> {
    const logsDir = join(dirname(this.config.linkedinProfileDir), 'logs');
    const screenshot = join(logsDir, 'empty-pass.png');
    await page.screenshot({ path: screenshot }).catch(() => undefined);
    const title = await page.title().catch(() => '');
    throw new Error(`el feed no devolvió publicaciones (url: ${page.url()}, título: "${title}"); captura en ${screenshot}`);
  }

  async close(): Promise<void> {
    this.clearIdleTimer();
    const context = this.context;
    this.context = null;
    await context?.close().catch(() => undefined);
  }

  private async openContext(): Promise<BrowserContext> {
    this.clearIdleTimer();
    if (this.context) return this.context;
    if (isProfileLocked(this.config.linkedinProfileDir)) {
      throw new Error('el perfil de LinkedIn está en uso por otro navegador; la pasada no se reintenta');
    }
    const context = await chromium.launchPersistentContext(this.config.linkedinProfileDir, {
      headless: this.config.linkedinHeadless,
      viewport: { width: 1440, height: 900 },
      // Sin locale es-ES LinkedIn sirve el feed en inglés y "Publicación en el feed" no aparece.
      locale: 'es-ES',
      args: ['--disable-blink-features=AutomationControlled'],
    });
    // Sin el permiso no hay permalinks, pero la pasada sigue con el enlace externo.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.linkedin.com' })
      .catch(() => undefined);
    context.on('close', () => { this.context = null; });
    this.context = context;
    return context;
  }

  private scheduleIdleClose(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => void this.close(), IDLE_CLOSE_MS);
    this.idleTimer.unref();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

/** Sin permalink, la publicación apunta a su primer enlace externo y, si no hay, al perfil del autor (como ARTIO). */
function toRawPost(snapshot: PostSnapshot): RawPost {
  return {
    text: snapshot.text,
    author: snapshot.author,
    url: snapshot.externalLinks[0] ?? snapshot.authorUrl,
  };
}

/**
 * Se scrollea el contenedor interno: `window.scrollBy` no hace nada en el feed
 * de LinkedIn (la ventana no scrollea, lo hace un `<main>` interno).
 */
async function scrollFeed(page: Page): Promise<void> {
  for (let i = 0; i < SCROLLS; i++) {
    await page.evaluate(() => {
      const container = Array.from(document.querySelectorAll<HTMLElement>('main, div'))
        .find((e) => e.scrollHeight > e.clientHeight + 200);
      if (container) container.scrollBy(0, container.clientHeight * 1.5);
      else window.scrollBy(0, window.innerHeight * 1.5);
    });
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

/**
 * Las clases del DOM están ofuscadas y cambian solas: lo estable es el atributo
 * `componentkey` y el texto que empieza por "Publicación en el feed". Las
 * publicaciones se marcan en el DOM para poder volver a ellas por índice.
 */
async function collectPosts(page: Page): Promise<PostSnapshot[]> {
  return page.evaluate((): PostSnapshot[] => {
    const POST_MARK = /^\s*Publicaci[óo]n en el feed\s*/i;
    const LINKEDIN_LABEL = /^(sugerencias|promocionado|publicaci[óo]n|recomienda|siguiendo|seguir|seguido por|te sugiere|\d)/i;
    const all = Array.from(document.querySelectorAll<HTMLElement>('[componentkey]'));
    const isPost = (e: HTMLElement): boolean => POST_MARK.test(e.innerText || '');
    const posts = all.filter((e) => isPost(e) && !all.some((other) => other !== e && e.contains(other) && isPost(other)));
    const unwrapExternal = (href: string): string => {
      try {
        const real = new URL(href).searchParams.get('url');
        return real ? decodeURIComponent(real) : href;
      } catch {
        return href;
      }
    };
    return posts.map((e, index) => {
      e.setAttribute('data-post-index', String(index));
      const profile = e.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
      const externalLinks = Array.from(e.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .map((a) => a.href)
        .filter((href) => /\/safety\/go|lnkd\.in/.test(href))
        .map(unwrapExternal);
      const text = (e.innerText || '').replace(POST_MARK, '').trim();
      const author = text.split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 2 && line.length < 60 && !LINKEDIN_LABEL.test(line) && !/recomienda esto/i.test(line));
      return {
        text,
        author: author ?? null,
        authorUrl: profile?.href ?? null,
        externalLinks: [...new Set(externalLinks)].slice(0, 3),
      };
    });
  });
}

/**
 * LinkedIn no expone el enlace permanente en el DOM: solo lo genera "⋯ → Copiar
 * enlace a la publicación" y hay que leerlo del portapapeles. Un fallo aquí no
 * tumba la pasada: la publicación se queda con su enlace externo o su perfil.
 */
async function copyPermalink(page: Page, index: number): Promise<string | null> {
  try {
    const post = await page.$(`[data-post-index="${index}"]`);
    const menu = await post?.$(MENU_SELECTOR);
    if (!menu) return null;
    await menu.click();
    await page.waitForTimeout(MENU_WAIT_MS);
    const item = await page.$('text=/Copiar enlace a la publicaci/i');
    if (!item) {
      await page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    await item.click();
    await page.waitForTimeout(COPY_WAIT_MS);
    const link = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    return link ? (link.split('?')[0] ?? null) : null;
  } catch {
    return null;
  }
}
