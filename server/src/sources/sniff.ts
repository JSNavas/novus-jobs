import type { BrowserPool } from '../browser/session.js';
import { biggestList } from './discover.js';
import { jobLikeness, MIN_JOB_SCORE } from './joblike.js';
import type { Candidate } from './discover.js';

const PROFILE_ID = 'discover';
const LOAD_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2_000;
const IDLE_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 4_000_000;

function arrayAt(payload: unknown, path: string | null): unknown[] {
  if (path === null) return Array.isArray(payload) ? payload : [];
  let node: unknown = payload;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object') return [];
    node = (node as Record<string, unknown>)[key];
  }
  return Array.isArray(node) ? node : [];
}

export async function sniff(pool: BrowserPool, url: string): Promise<Candidate[]> {
  const session = pool.session(PROFILE_ID);
  const context = await session.context();
  const page = await context.newPage();
  const found = new Map<string, { count: number; score: number }>();

  page.on('response', (response) => {
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('json') || !response.ok()) return;
    void (async () => {
      try {
        const body = await response.text();
        if (body.length > MAX_BODY_BYTES) return;
        const payload: unknown = JSON.parse(body);
        const list = biggestList(payload);
        if (!list || list.length === 0) return;
        const clean = response.url().split('#')[0] ?? response.url();
        const entries = arrayAt(payload, list.path);
        found.set(clean, { count: list.length, score: jobLikeness(entries, clean) });
      } catch {
        return;
      }
    })();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT_MS });
    await page.waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT_MS }).catch(() => undefined);
    await page.waitForTimeout(SETTLE_MS);
  } catch {
    return [];
  } finally {
    await page.close().catch(() => undefined);
    session.scheduleIdleClose();
  }

  return [...found.entries()]
    .filter(([, hit]) => hit.score >= MIN_JOB_SCORE)
    .map(([endpoint, hit]): Candidate => ({
      url: endpoint,
      format: 'json',
      how: 'la petición que la propia página hace al cargar',
      count: hit.count,
      score: hit.score,
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.count - a.count);
}
