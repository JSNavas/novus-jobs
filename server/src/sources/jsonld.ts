import { plainText } from './html.js';

const NOISE = /<(script|style|noscript|svg|nav|header|footer|form)\b[^>]*>[\s\S]*?<\/\1>/gi;

const SCRIPT = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const SITEMAP_LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
const ANCHOR = /<a\b[^>]*\bhref\s*=\s*["']([^"'#?]+)["']/gi;

const JOB_POSTING = 'JobPosting';
const NOT_A_JOB_PATH = /\/(blog|news|noticias|about|nosotros|contacto|contact|privacy|privacidad|legal|cookies|terms|login|signin|register|tag|category|author|feed)(\/|$)/i;
const MIN_SEGMENT_CHARS = 8;

function types(node: Record<string, unknown>): string[] {
  const raw = node['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  return [];
}

function walk(node: unknown, found: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, found);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if (types(record).includes(JOB_POSTING)) {
    found.push(record);
    return;
  }
  for (const child of Object.values(record)) walk(child, found);
}

export function jobPostings(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  for (const match of html.matchAll(SCRIPT)) {
    const blob = (match[1] ?? '').trim();
    if (!blob) continue;
    try {
      walk(JSON.parse(blob), found);
    } catch {
      continue;
    }
  }
  return found;
}

function sameOrigin(candidate: string, base: URL): URL | null {
  try {
    const url = new URL(candidate, base);
    return url.origin === base.origin ? url : null;
  } catch {
    return null;
  }
}

function couldBeAJob(url: URL): boolean {
  if (NOT_A_JOB_PATH.test(url.pathname)) return false;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  const last = segments[segments.length - 1] ?? '';
  return last.length >= MIN_SEGMENT_CHARS;
}

export function pageLinks(html: string, from: string): string[] {
  let base: URL;
  try {
    base = new URL(from);
  } catch {
    return [];
  }

  const links = new Set<string>();
  const patterns = html.includes('<loc>') ? [SITEMAP_LOC] : [ANCHOR];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = sameOrigin((match[1] ?? '').trim(), base);
      if (url === null || !couldBeAJob(url)) continue;
      url.hash = '';
      links.add(url.toString());
    }
  }
  return [...links];
}

export function readableText(html: string): string {
  return plainText(html.replace(NOISE, ' '));
}
