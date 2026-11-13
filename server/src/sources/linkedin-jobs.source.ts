import type { Page } from 'playwright';
import { NAVIGATION_TIMEOUT_MS, type BrowserPool, type BrowserSession } from '../browser/session.js';
import { normalizeText } from '../filters/normalize.js';
import { LINKEDIN_PROFILE_ID } from './linkedin.source.js';
import { loginWallAdvice, loginWallOf } from './login-wall.js';
import { WATCHED_ACCOUNT_POLICY } from './policy.js';
import { LoginRequiredError, type FreshnessCheck, type JobSource, type PermalinkSelector, type RawPost } from './types.js';

export const LINKEDIN_JOBS_URL = 'https://www.linkedin.com/jobs/collections/recommended/';
const LOGIN_URL = 'https://www.linkedin.com/login';

const SETTLE_MS = 7_000;
const CARD_WAIT_MS = 2_600;
const SCROLL_PAUSE_MS = 2_000;
const MAX_SCROLLS = 10;
const PAGE_SIZE = 25;
const MAX_PAGES = 3;
const MAX_CARDS = 60;
const STOP_AFTER_KNOWN = 6;
const MIN_DESCRIPTION_CHARS = 120;

const CARD_LINK = 'a[href*="/jobs/view/"]';
const DETAIL = '#job-details';

export interface JobCard {
  readonly title: string;
  readonly company: string;
  readonly place: string;
  readonly id: string;
}

export function cardFrom(lines: readonly string[], href: string): JobCard | null {
  const id = /\/jobs\/view\/(\d+)/.exec(href)?.[1] ?? '';
  const clean: string[] = [];
  for (const line of lines.map((l) => l.trim()).filter(Boolean)) {
    if (clean[clean.length - 1] !== line) clean.push(line);
  }
  const title = clean[0] ?? '';
  if (!id || !title) return null;
  return { id, title, company: clean[1] ?? '', place: clean[2] ?? '' };
}

export function postTextOf(card: JobCard, description: string): string {
  const head = card.company ? `${card.company} busca: ${card.title}` : card.title;
  const lines = [head];
  if (card.place) lines.push(`Ubicación: ${card.place}`);
  lines.push(`Postular: https://www.linkedin.com/jobs/view/${card.id}/`);
  return normalizeText(`${lines.join('\n')}\n\n${description}`.trim());
}

export interface SearchList {
  urls(): string[];
}

interface Harvest {
  posts: RawPost[];
  seen: Set<string>;
  known: number;
  isFresh: FreshnessCheck | undefined;
}

export class LinkedInJobsSource implements JobSource {
  readonly name = 'linkedin-jobs';
  readonly label = 'LinkedIn (empleos)';
  readonly profileId = LINKEDIN_PROFILE_ID;
  readonly loginUrl = LOGIN_URL;
  readonly policy = WATCHED_ACCOUNT_POLICY;
  private readonly session: BrowserSession;

  get endpoint(): string {
    return this.searches.urls()[0] ?? LINKEDIN_JOBS_URL;
  }

  constructor(pool: BrowserPool, private readonly searches: SearchList = { urls: () => [LINKEDIN_JOBS_URL] }) {
    this.session = pool.session(LINKEDIN_PROFILE_ID);
  }

  async fetch(_selectPermalinks: PermalinkSelector, isFresh?: FreshnessCheck): Promise<RawPost[]> {
    const context = await this.session.context();
    const page = await context.newPage();
    const harvest: Harvest = { posts: [], seen: new Set<string>(), known: 0, isFresh };
    try {
      for (const [index, list] of this.searches.urls().entries()) {
        await this.readList(page, list, harvest, index === 0);
        if (harvest.known >= STOP_AFTER_KNOWN || harvest.posts.length >= MAX_CARDS) break;
      }
      await this.session.rememberSession();
      return harvest.posts;
    } finally {
      await page.close().catch(() => undefined);
      this.session.scheduleIdleClose();
    }
  }

  private async readList(page: Page, list: string, harvest: Harvest, first: boolean): Promise<void> {
    for (let index = 0; index < MAX_PAGES; index++) {
      if (harvest.known >= STOP_AFTER_KNOWN || harvest.posts.length >= MAX_CARDS) return;

      await page.goto(pageUrl(list, index * PAGE_SIZE), {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      await page.waitForTimeout(SETTLE_MS);
      this.assertSignedIn(page);
      await scrollList(page);

      const cards = (await readCards(page)).filter((card) => !harvest.seen.has(card.id));
      if (cards.length === 0) {
        if (first && index === 0) {
          this.assertSignedIn(page);
          throw new Error(
            `la sesión está activa pero ${list} no listó ninguna vacante: ` +
            `¿cambió el maquetado? (url: ${page.url()})`,
          );
        }
        return;
      }

      for (const card of cards) {
        if (harvest.known >= STOP_AFTER_KNOWN || harvest.posts.length >= MAX_CARDS) return;
        harvest.seen.add(card.id);
        const description = await openCard(page, card.id);
        if (description.length < MIN_DESCRIPTION_CHARS) continue;
        const text = postTextOf(card, description);
        harvest.posts.push({
          text,
          author: card.company || null,
          employer: card.company || null,
          url: `https://www.linkedin.com/jobs/view/${card.id}/`,
        });
        harvest.known = harvest.isFresh && harvest.isFresh(text) ? 0 : harvest.known + 1;
      }
    }
  }

  private assertSignedIn(page: Page): void {
    const wall = loginWallOf(page.url());
    if (!wall) return;
    this.session.forgetSession();
    throw new LoginRequiredError(this.name, wall, loginWallAdvice(wall, this.name));
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}

export function pageUrl(base: string, start: number): string {
  if (start === 0) return base;
  const url = new URL(base);
  url.searchParams.set('start', String(start));
  return url.toString();
}

async function scrollList(page: Page): Promise<void> {
  let before = await page.locator(CARD_LINK).count();
  for (let i = 0; i < MAX_SCROLLS; i++) {
    await page.evaluate((selector) => {
      const anchor = document.querySelector(selector);
      let box = anchor?.closest('li')?.parentElement ?? null;
      while (box && box !== document.body) {
        const style = getComputedStyle(box);
        const scrolls = style.overflowY === 'auto' || style.overflowY === 'scroll';
        if (scrolls && box.scrollHeight > box.clientHeight + 50) {
          box.scrollTop = box.scrollHeight;
          return;
        }
        box = box.parentElement;
      }
      window.scrollTo(0, document.body.scrollHeight);
    }, CARD_LINK);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
    const after = await page.locator(CARD_LINK).count();
    if (after === before && i > 0) return;
    before = after;
  }
}

async function readCards(page: Page): Promise<JobCard[]> {
  const raw = await page.evaluate((selector) => {
    const seen = new Set<string>();
    const out: { href: string; lines: string[] }[] = [];
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>(selector)) {
      const href = anchor.getAttribute('href') ?? '';
      const id = /\/jobs\/view\/(\d+)/.exec(href)?.[1];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const box = anchor.closest('li') ?? anchor.parentElement;
      out.push({ href, lines: (box?.innerText ?? '').split('\n') });
    }
    return out;
  }, CARD_LINK);

  return raw.map((entry) => cardFrom(entry.lines, entry.href)).filter((card): card is JobCard => card !== null);
}

async function openCard(page: Page, id: string): Promise<string> {
  const link = page.locator(`${CARD_LINK}[href*="/jobs/view/${id}"]`).first();
  await link.click({ timeout: NAVIGATION_TIMEOUT_MS }).catch(() => undefined);
  await page.waitForTimeout(CARD_WAIT_MS);
  return page.locator(DETAIL).first().innerText().catch(() => '');
}
