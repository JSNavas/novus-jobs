import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { NAVIGATION_TIMEOUT_MS, type BrowserPool, type BrowserSession } from '../browser/session.js';
import type { Config } from '../config.js';
import { normalizeText } from '../filters/normalize.js';
import { loginWallAdvice, loginWallOf } from './login-wall.js';
import { WATCHED_ACCOUNT_POLICY } from './policy.js';
import { splitMergedPosts } from './split-posts.js';
import { LoginRequiredError, type JobSource, type PermalinkSelector, type RawPost } from './types.js';

interface PostSnapshot {
  text: string;
  author: string | null;
  authorUrl: string | null;
  externalLinks: string[];
  /** El identificador de la publicación, si LinkedIn lo dejó en el DOM. */
  activityUrn: string | null;
}

/* Valores medidos en un bot anterior del autor que lleva meses leyendo este
 * mismo feed sin que la cuenta se resienta: LinkedIn tiene que ver exactamente
 * ese patrón de navegación y no otro. */
const SETTLE_MS = 4_000;
const SCROLLS = 8;
const SCROLL_PAUSE_MS = 2_500;
const MENU_WAIT_MS = 1_200;
const COPY_WAIT_MS = 800;
const MENU_SELECTOR = 'button[aria-label*="opcion" i], button[aria-label*="Más" i], button[aria-label*="control" i], button[aria-label*="menu" i]';

export const LINKEDIN_PROFILE_ID = 'linkedin';
const LOGIN_URL = 'https://www.linkedin.com/login';

/**
 * Lee el feed de LinkedIn con la sesión persistida. No hay API de empleo: es la
 * misma lectura de siempre, con el mismo ritmo y la misma huella.
 *
 * El navegador NO es suyo: lo pide al pool, que garantiza un solo Chromium por
 * perfil. Y lo que esta clase sí decide es cómo distinguir "la sesión se cayó"
 * de "cambió el maquetado", que son los dos únicos motivos por los que una
 * pasada vuelve vacía y necesitan respuestas opuestas.
 */
export class LinkedInSource implements JobSource {
  readonly name = 'linkedin';
  readonly label = 'LinkedIn';
  readonly profileId = LINKEDIN_PROFILE_ID;
  readonly loginUrl = LOGIN_URL;
  readonly policy = WATCHED_ACCOUNT_POLICY;
  private readonly session: BrowserSession;

  constructor(private readonly config: Config, pool: BrowserPool) {
    this.session = pool.session(LINKEDIN_PROFILE_ID);
  }

  async fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]> {
    const context = await this.session.context();
    // Sin el permiso no hay permalinks, pero la pasada sigue con el enlace externo.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.linkedin.com' })
      .catch(() => undefined);
    const page = await context.newPage();
    try {
      await page.goto(this.config.linkedinFeedUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS);
      this.assertSignedIn(page);
      await scrollFeed(page);
      const snapshots = await collectPosts(page);
      // Se vuelve a mirar la URL: LinkedIn puede echarte A MITAD de la lectura,
      // en pleno scroll, y entonces el feed se queda vacío sin que la primera
      // comprobación haya visto nada raro.
      if (snapshots.length === 0) {
        this.assertSignedIn(page);
        await this.failEmptyPass(page);
      }
      const { posts, domIndex } = toRawPosts(snapshots);
      for (const index of new Set(selectPermalinks(posts))) {
        const post = posts[index];
        const dom = domIndex[index];
        // `dom` es -1 cuando la publicación salió de una tarjeta que traía
        // varias: el menú "⋯" de esa tarjeta devuelve el enlace de la primera,
        // así que pedirlo daría un enlace EQUIVOCADO. Mejor el de respaldo.
        if (!post || dom === undefined || dom < 0) continue;
        const permalink = await copyPermalink(page, dom);
        if (permalink) posts[index] = { ...post, url: permalink };
      }
      // La pasada fue bien: se refresca la copia de la sesión. LinkedIn rota
      // sus cookies, y una copia vieja caducaría sin que nadie supiera por qué.
      await this.session.rememberSession();
      return posts;
    } finally {
      await page.close().catch(() => undefined);
      this.session.scheduleIdleClose();
    }
  }

  /**
   * ¿Seguimos dentro? La URL final lo dice sin ambigüedad: pedimos el feed, y
   * si acabamos en el login, en un checkpoint o en el muro de invitados, la
   * sesión no está. Se lanza un error que el runner sabe NO reintentar.
   */
  private assertSignedIn(page: Page): void {
    const wall = loginWallOf(page.url());
    if (!wall) return;
    // Las cookies guardadas ya no valen: se tiran. Si no, se reinyectarían en
    // cada pasada para volver a chocar con el mismo muro, y el login nuevo
    // arrancaría con basura de la sesión anterior.
    this.session.forgetSession();
    throw new LoginRequiredError(this.name, wall, loginWallAdvice(wall, this.name));
  }

  /**
   * Aquí ya se descartó que falte sesión: el feed cargó, estamos dentro y no
   * hay ni una publicación. Eso es el maquetado, y es la pieza más frágil de
   * todo esto. La captura es para poder mirarlo sin tener que reproducirlo.
   */
  private async failEmptyPass(page: Page): Promise<never> {
    mkdirSync(this.config.logsDir, { recursive: true });
    const screenshot = join(this.config.logsDir, 'linkedin-empty-pass.png');
    await page.screenshot({ path: screenshot }).catch(() => undefined);
    const title = await page.title().catch(() => '');
    throw new Error(
      `la sesión está activa pero el feed no devolvió publicaciones: ¿cambió el maquetado de LinkedIn? ` +
      `(url: ${page.url()}, título: "${title}"); captura en ${screenshot}`,
    );
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}

/**
 * De lo que se leyó del DOM a las publicaciones que juzgan las reglas.
 *
 * Dos cosas pasan aquí y las dos son decisiones:
 *
 *  - El texto se NORMALIZA (ver `filters/normalize.ts`). Medio feed escribe con
 *    letras matemáticas Unicode para simular negrita, y sin esto los filtros no
 *    leen el texto que el usuario ve, sino otro que solo se le parece.
 *  - Una tarjeta puede traer DOS publicaciones; se parten. Se devuelve además
 *    de qué elemento del DOM salió cada una, porque el enlace permanente se
 *    pide por ahí — y `-1` significa "esta vino mezclada, no pidas su enlace".
 *
 * Sin permalink, la publicación apunta a su primer enlace externo y, si no hay,
 * al perfil propio.
 */
function toRawPosts(snapshots: readonly PostSnapshot[]): { posts: RawPost[]; domIndex: number[] } {
  const posts: RawPost[] = [];
  const domIndex: number[] = [];
  snapshots.forEach((snapshot, index) => {
    const permalink = snapshot.activityUrn
      ? `https://www.linkedin.com/feed/update/${snapshot.activityUrn}/`
      : null;
    for (const segment of splitMergedPosts(normalizeText(snapshot.text))) {
      posts.push({
        text: segment.text,
        author: snapshot.author,
        // El orden es el que pidió el usuario: la publicación primero, después el
        // enlace de postulación, y en último caso el perfil de quien publica
        // para encontrarla a mano.
        url: permalink ?? snapshot.externalLinks[0] ?? snapshot.authorUrl,
      });
      // Con el enlace ya resuelto no hay nada que pedir por el menú: -1.
      domIndex.push(permalink === null && segment.alone ? index : -1);
    }
  });
  return { posts, domIndex };
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
      // ═══ EL ENLACE SIN TOCAR NADA ═══
      // LinkedIn no publica un atributo "permalink", pero sí deja el URN de la
      // actividad suelto por el marcado. Si está, el enlace se construye con
      // él y NO hace falta abrir el menú "⋯" ni leer el portapapeles: dos clics
      // menos por oferta sobre la cuenta del usuario, que es lo irremplazable.
      const urn = /urn:li:(?:activity|share|ugcPost):\d+/.exec(e.outerHTML)?.[0] ?? null;
      const text = (e.innerText || '').replace(POST_MARK, '').trim();
      const author = text.split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 2 && line.length < 60 && !LINKEDIN_LABEL.test(line) && !/recomienda esto/i.test(line));
      return {
        text,
        author: author ?? null,
        authorUrl: profile?.href ?? null,
        externalLinks: [...new Set(externalLinks)].slice(0, 3),
        activityUrn: urn,
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
