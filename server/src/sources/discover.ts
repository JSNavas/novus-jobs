const TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT = 'novus-jobs (https://github.com/novus-jobs)';

export interface Candidate {
  readonly url: string;
  readonly format: 'json' | 'rss';
  readonly how: string;
  readonly count: number;
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
  return { url, format: 'json', how, count: list.length };
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

export async function discover(input: string): Promise<Discovery> {
  const notes: string[] = [];
  let target: URL;
  try {
    target = new URL(input);
  } catch {
    return { candidates: [], notes: ['Eso no es una URL. Tiene que empezar por https://'] };
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
  ];

  const candidates: Candidate[] = [];
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
      'La página no publica sus vacantes en ningún sitio que se pueda leer sin navegador.',
      'Suele pasar con las que piden iniciar sesión, y con las que dibujan la lista en el navegador sin una API detrás.',
      'Si conoces la dirección exacta que devuelve el JSON, pégala directamente.',
    );
  }
  return { candidates: candidates.sort((a, b) => b.count - a.count), notes };
}
