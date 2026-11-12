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
  activityUrn: string | null;
}

const SETTLE_MS = 4_000;
const SCROLLS = 8;
const SCROLL_PAUSE_MS = 2_500;
const MENU_WAIT_MS = 1_200;
const COPY_WAIT_MS = 800;
const MENU_SELECTOR = 'button[aria-label*="opcion" i], button[aria-label*="Más" i], button[aria-label*="control" i], button[aria-label*="menu" i]';

export const LINKEDIN_PROFILE_ID = 'linkedin';
const LOGIN_URL = 'https://www.linkedin.com/login';

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
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.linkedin.com' })
      .catch(() => undefined);
    const page = await context.newPage();
    try {
      await page.goto(this.config.linkedinFeedUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS);
      this.assertSignedIn(page);
      await scrollFeed(page);
      const snapshots = await collectPosts(page);
      if (snapshots.length === 0) {
        this.assertSignedIn(page);
        await this.failEmptyPass(page);
      }
      const { posts, domIndex } = toRawPosts(snapshots);
      for (const index of new Set(selectPermalinks(posts))) {
        const post = posts[index];
        const dom = domIndex[index];
        if (!post || dom === undefined || dom < 0) continue;
        const permalink = await copyPermalink(page, dom);
        if (permalink) posts[index] = { ...post, url: permalink };
      }
      await this.session.rememberSession();
      return posts;
    } finally {
      await page.close().catch(() => undefined);
      this.session.scheduleIdleClose();
    }
  }

  private assertSignedIn(page: Page): void {
    const wall = loginWallOf(page.url());
    if (!wall) return;
    this.session.forgetSession();
    throw new LoginRequiredError(this.name, wall, loginWallAdvice(wall, this.name));
  }

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
        url: permalink ?? snapshot.externalLinks[0] ?? snapshot.authorUrl,
      });
      domIndex.push(permalink === null && segment.alone ? index : -1);
    }
  });
  return { posts, domIndex };
}

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
