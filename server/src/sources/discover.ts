import { embeddedList } from './embedded.js';
import { jobLikeness, MIN_JOB_SCORE } from './joblike.js';

const TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT = 'novus-jobs (https://github.com/novus-jobs)';

export interface Candidate {
  readonly url: string;
  readonly format: 'json' | 'rss' | 'embedded';
  readonly how: string;
  readonly count: number;
  readonly score?: number;
}

export interface Discovery {
  readonly candidates: readonly Candidate[];
  readonly notes: readonly string[];
}

const ATS: readonly { readonly shape: RegExp; readonly api: (slug: string) => string; readonly name: string }[] = [
  { shape: /jobs\.lever\.co\/([A-Za-z0-9_-]+)/, name: 'Lever', api: (s) => `https://api.lever.co/v0/postings/${s}?mode=json` },
  { shape: /boards\.greenhouse\.io\/([A-Za-z0-9_-]+)/, name: 'Greenhouse', api: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true` },
  { shape: /job-boards\.greenhouse\.io\/([A-Za-z0-9_-]+)/, name: 'Greenhouse', api: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true` },
  { shape: /jobs\.ashbyhq\.com\/([A-Za-z0-9_-]+)/, name: 'Ashby', api: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}` },
  { shape: /([A-Za-z0-9_-]+)\.recruitee\.com/, name: 'Recruitee', api: (s) => `https://${s}.recruitee.com/api/offers/` },
  { shape: /apply\.workable\.com\/([A-Za-z0-9_-]+)/, name: 'Workable', api: (s) => `https://apply.workable.com/api/v1/widget/accounts/${s}` },
  { shape: /([A-Za-z0-9_-]+)\.teamtailor\.com/, name: 'Teamtailor', api: (s) => `https://${s}.teamtailor.com/jobs.rss` },
];

const BOARDS: readonly { readonly name: string; readonly format: 'json' | 'rss'; readonly url: (slug: string) => string }[] = [
  { name: 'Lever', format: 'json', url: (s) => `https://api.lever.co/v0/postings/${s}?mode=json` },
  { name: 'Greenhouse', format: 'json', url: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true` },
  { name: 'Ashby', format: 'json', url: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}` },
  { name: 'Recruitee', format: 'json', url: (s) => `https://${s}.recruitee.com/api/offers/` },
  { name: 'Workable', format: 'json', url: (s) => `https://apply.workable.com/api/v1/widget/accounts/${s}` },
  { name: 'SmartRecruiters', format: 'json', url: (s) => `https://api.smartrecruiters.com/v1/companies/${s}/postings` },
  { name: 'Breezy', format: 'json', url: (s) => `https://${s}.breezy.hr/json` },
  { name: 'Teamtailor', format: 'rss', url: (s) => `https://${s}.teamtailor.com/jobs.rss` },
  { name: 'Personio', format: 'rss', url: (s) => `https://${s}.jobs.personio.de/xml` },
];

const MAX_SLUGS = 3;

const MAX_SCRIPTS = 6;
const MAX_SCRIPT_BYTES = 3_000_000;
const MAX_FROM_SCRIPTS = 12;
const JOBISH = /job|vacan|posting|position|opening|empleo|puesto|career/i;

const SAME_ORIGIN_GUESSES = ['/api/jobs', '/api/positions', '/api/openings', '/api/vacancies', '/jobs.json'];

async function get(url: string, accept: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { accept, 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch {
    return null;
  }
}

function arraysIn(value: unknown, depth = 0): { path: string | null; length: number }[] {
  if (depth > 3) return [];
  if (Array.isArray(value)) {
    return value.length > 0 && typeof value[0] === 'object' && value[0] !== null
      ? [{ path: null, length: value.length }]
      : [];
  }
  if (value === null || typeof value !== 'object') return [];
  const found: { path: string | null; length: number }[] = [];
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    for (const hit of arraysIn(inner, depth + 1)) {
      found.push({ path: hit.path === null ? key : `${key}.${hit.path}`, length: hit.length });
    }
  }
  return found;
}

export function biggestList(payload: unknown): { path: string | null; length: number } | null {
  const lists = arraysIn(payload);
  if (!lists.length) return null;
  return lists.reduce((a, b) => (b.length > a.length ? b : a));
}

function arrayAt(payload: unknown, path: string | null): unknown[] {
  if (path === null) return Array.isArray(payload) ? payload : [];
  let node: unknown = payload;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object') return [];
    node = (node as Record<string, unknown>)[key];
  }
  return Array.isArray(node) ? node : [];
}

async function asJsonCandidate(url: string, how: string): Promise<Candidate | null> {
  const response = await get(url, 'application/json');
  if (!response?.ok) return null;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  const list = biggestList(payload);
  if (!list) return null;
  const score = jobLikeness(arrayAt(payload, list.path), url);
  if (score < MIN_JOB_SCORE) return null;
  return { url, format: 'json', how, count: list.length, score };
}

async function asFeedCandidate(url: string, how: string): Promise<Candidate | null> {
  const response = await get(url, 'application/rss+xml, application/xml');
  if (!response?.ok) return null;
  const body = await response.text();
  const items = body.match(/<(item|entry)[\s>]/gi);
  if (!items || items.length === 0) return null;
  return { url, format: 'rss', how, count: items.length };
}

function feedsIn(html: string, origin: string): string[] {
  const links = [...html.matchAll(/href="([^"]+\.(?:rss|xml))"/gi)].map((m) => m[1] ?? '');
  const declared = [...html.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]+href="([^"]+)"/gi)]
    .map((m) => m[1] ?? '');
  return [...new Set([...declared, ...links])]
    .map((href) => {
      try {
        return new URL(href, origin).href;
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .slice(0, 4);
}

function atsIn(html: string): { url: string; how: string }[] {
  const found: { url: string; how: string }[] = [];
  for (const ats of ATS) {
    const match = ats.shape.exec(html);
    const slug = match?.[1];
    if (!slug) continue;
    found.push({ url: ats.api(slug), how: `la página enlaza su tablero de ${ats.name} ("${slug}")` });
  }
  return found;
}

function scriptsIn(html: string, origin: string): string[] {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)]
    .map((m) => m[1] ?? '')
    .filter((src) => src.endsWith('.js') || src.includes('.js?'))
    .map((src) => {
      try {
        return new URL(src, origin).href;
      } catch {
        return '';
      }
    })
    .filter((url) => url.startsWith(origin))
    .slice(0, MAX_SCRIPTS);
}

function endpointsIn(code: string, origin: string): string[] {
  const absolute = [...code.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\/[A-Za-z0-9/_.-]{2,60}/g)].map((m) => m[0]);
  const relative = [...code.matchAll(/["'`](\/(?:api|rest|v\d)\/[A-Za-z0-9/_.-]{2,60})["'`]/g)]
    .map((m) => new URL(m[1] ?? '/', origin).href);
  return [...new Set([...absolute, ...relative])].filter((url) => JOBISH.test(url));
}

async function fromScripts(html: string, origin: string): Promise<string[]> {
  const scripts = scriptsIn(html, origin);
  const found: string[] = [];
  for (const script of scripts) {
    const response = await get(script, 'text/javascript');
    if (!response?.ok) continue;
    const code = (await response.text()).slice(0, MAX_SCRIPT_BYTES);
    found.push(...endpointsIn(code, origin));
    if (found.length >= MAX_FROM_SCRIPTS) break;
  }
  return [...new Set(found)].slice(0, MAX_FROM_SCRIPTS);
}

export function slugsOf(name: string): string[] {
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = clean.split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  return [...new Set([words.join(''), words.join('-'), words[0] ?? ''])]
    .filter(Boolean)
    .slice(0, MAX_SLUGS);
}

export async function searchByName(name: string): Promise<Discovery> {
  const slugs = slugsOf(name);
  if (!slugs.length) return { candidates: [], notes: ['Escribe el nombre de la empresa.'] };

  const attempts = BOARDS.flatMap((board) => slugs.map((slug) => ({ board, slug })));
  const found = await Promise.all(attempts.map(async ({ board, slug }) => {
    const url = board.url(slug);
    const how = `tablero de ${board.name} de "${slug}"`;
    return board.format === 'rss' ? asFeedCandidate(url, how) : asJsonCandidate(url, how);
  }));

  const candidates = found.filter((c): c is Candidate => c !== null);
  if (candidates.length === 0) {
    return {
      candidates: [],
      notes: [
        `No hay ningún tablero público a nombre de "${name.trim()}" en ${BOARDS.map((b) => b.name).join(', ')}.`,
        'Puede que use otro sistema, que no tenga vacantes abiertas, o que su nombre en el tablero sea otro.',
        'Si la encuentras a mano, pega aquí la dirección de su página de empleo y se intenta de nuevo.',
      ],
    };
  }
  return { candidates: candidates.sort((a, b) => b.count - a.count), notes: [] };
}

export async function discover(input: string): Promise<Discovery> {
  const notes: string[] = [];
  const looksLikeAddress = /^https?:\/\//i.test(input) || (/\./.test(input) && !/\s/.test(input));
  if (!looksLikeAddress) return searchByName(input);

  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return searchByName(input);
  }
  if (target.protocol !== 'https:' && target.hostname !== 'localhost') {
    return { candidates: [], notes: ['La dirección tiene que ser https.'] };
  }

  const direct = await asJsonCandidate(target.href, 'la dirección que pegaste ya devuelve JSON');
  if (direct) return { candidates: [direct], notes };

  const feed = await asFeedCandidate(target.href, 'la dirección que pegaste ya es un feed');
  if (feed) return { candidates: [feed], notes };

  const page = await get(target.href, 'text/html');
  if (!page?.ok) {
    return { candidates: [], notes: [`No se pudo abrir ${target.href}${page ? ` (respondió ${page.status})` : ''}.`] };
  }
  const html = (await page.text()).slice(0, MAX_HTML_BYTES);

  const tried: { url: string; how: string; format: 'json' | 'rss' }[] = [
    ...atsIn(html).map((a) => ({ ...a, format: 'json' as const })),
    ...feedsIn(html, target.origin).map((url) => ({ url, how: 'un feed enlazado en la página', format: 'rss' as const })),
    ...SAME_ORIGIN_GUESSES.map((path) => ({
      url: new URL(path, target.origin).href,
      how: `una dirección habitual del mismo sitio (${path})`,
      format: 'json' as const,
    })),
    ...(await fromScripts(html, target.origin)).map((url) => ({
      url,
      how: 'una dirección que nombra su propio JavaScript',
      format: 'json' as const,
    })),
  ];

  const candidates: Candidate[] = [];
  const inPage = embeddedList(html);
  if (inPage && jobLikeness(inPage, target.href) >= MIN_JOB_SCORE) {
    candidates.push({
      url: target.href,
      format: 'embedded',
      how: 'la página trae sus vacantes dentro, en JSON',
      count: inPage.length,
      score: jobLikeness(inPage, target.href),
    });
  }
  const seen = new Set<string>();
  for (const attempt of tried) {
    if (seen.has(attempt.url)) continue;
    seen.add(attempt.url);
    const found = attempt.format === 'rss'
      ? await asFeedCandidate(attempt.url, attempt.how)
      : await asJsonCandidate(attempt.url, attempt.how);
    if (found) candidates.push(found);
  }

  if (candidates.length === 0) {
    notes.push(
      `${target.href} no deja ver sus vacantes desde fuera: ni API, ni feed, ni datos dentro de la página.`,
      'Casi siempre es porque hay que iniciar sesión, o porque la lista se pide aparte y la página llega vacía.',
      'Queda buscar esa petición a mano: abre la página en el navegador, pulsa F12 → pestaña Red → filtro Fetch/XHR, recarga, y mira cuál devuelve la lista de vacantes.',
      'Copia esa dirección (botón derecho → Copiar → Copiar dirección del enlace) y pégala aquí arriba.',
    );
  }
  return { candidates: candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.count - a.count), notes };
}
