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
const SCROLL_PAUSE_MS = 1_800;
const SCROLLS = 3;
const MAX_CARDS = 25;
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

export class LinkedInJobsSource implements JobSource {
  readonly name = 'linkedin-jobs';
  readonly label = 'LinkedIn (empleos)';
  readonly profileId = LINKEDIN_PROFILE_ID;
  readonly loginUrl = LOGIN_URL;
  readonly policy = WATCHED_ACCOUNT_POLICY;
  readonly endpoint = LINKEDIN_JOBS_URL;
  private readonly session: BrowserSession;

  constructor(pool: BrowserPool) {
    this.session = pool.session(LINKEDIN_PROFILE_ID);
  }

  async fetch(_selectPermalinks: PermalinkSelector, isFresh?: FreshnessCheck): Promise<RawPost[]> {
    const context = await this.session.context();
    const page = await context.newPage();
    try {
      await page.goto(LINKEDIN_JOBS_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS);
      this.assertSignedIn(page);
      await scrollList(page);

      const cards = await readCards(page);
      if (cards.length === 0) {
        this.assertSignedIn(page);
        throw new Error(
          `la sesión está activa pero ${LINKEDIN_JOBS_URL} no listó ninguna vacante: ` +
          `¿cambió el maquetado? (url: ${page.url()})`,
        );
      }

      const posts: RawPost[] = [];
      let known = 0;
      for (const card of cards.slice(0, MAX_CARDS)) {
        if (known >= STOP_AFTER_KNOWN) break;
        const description = await openCard(page, card.id);
        if (description.length < MIN_DESCRIPTION_CHARS) continue;
        const text = postTextOf(card, description);
        posts.push({
          text,
          author: card.company || null,
          employer: card.company || null,
          url: `https://www.linkedin.com/jobs/view/${card.id}/`,
        });
        known = isFresh && isFresh(text) ? 0 : known + 1;
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

  async close(): Promise<void> {
    await this.session.close();
  }
}

async function scrollList(page: Page): Promise<void> {
  for (let i = 0; i < SCROLLS; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
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
