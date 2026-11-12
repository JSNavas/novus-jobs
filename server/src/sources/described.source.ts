import {
  first,
  pick,
  type DescriptorFields,
  type SourceDescriptor,
} from './descriptor.js';
import { plainText } from './html.js';
import { embeddedList } from './embedded.js';
import { parseFeed } from './rss.js';
import { OPEN_API_POLICY } from './policy.js';
import type { FreshnessCheck, JobSource, PermalinkSelector, PostMetrics, RawPost } from './types.js';

const TIMEOUT_MS = 20_000;
const USER_AGENT = 'novus-jobs (https://github.com/novus-jobs)';
const SECONDS_IN_2001 = 978_307_200;
const NOT_A_COMPANY = new Set(['confidential', 'confidencial', 'n/a', 'na', 'none', 'undisclosed', 'anonymous', 'anónimo', 'anonimo', '-', '--']);

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(', ');
  return '';
}

function positiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  const numeric = positiveNumber(value);
  if (numeric !== null && typeof value !== 'string') {
    const ms = numeric > SECONDS_IN_2001 * 1000 ? numeric : numeric * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function firstLine(description: string): string {
  return description.split('\n').map((line) => line.trim()).find((line) => line !== '') ?? '';
}

function splitTitle(title: string, separator: string | null): { title: string; company: string } {
  if (separator === null) return { title, company: '' };
  const at = title.indexOf(separator);
  if (at <= 0) return { title, company: '' };
  return {
    title: title.slice(at + separator.length).trim(),
    company: title.slice(0, at).trim(),
  };
}

function namedCompany(entry: unknown, fields: DescriptorFields): string {
  const named = text(first(entry, fields.company)).trim();
  return NOT_A_COMPANY.has(named.toLowerCase()) ? '' : named;
}

function headlineOf(entry: unknown, fields: DescriptorFields, description: string): { title: string; company: string } {
  const raw = text(first(entry, fields.title)).trim()
    || (fields.titleFromDescription ? firstLine(description) : '');
  const named = namedCompany(entry, fields);
  if (named) return { title: raw, company: named };
  return splitTitle(raw, fields.companySeparator);
}

function toPostText(entry: unknown, fields: DescriptorFields): string | null {
  const description = plainText(text(first(entry, fields.description))).trim();
  if (!description) return null;

  const { title, company } = headlineOf(entry, fields, description);
  if (!title) return null;

  const location = text(first(entry, fields.location)).trim();
  const salary = text(first(entry, fields.salary)).trim();
  const url = urlOf(entry, fields);

  const head = [company ? `${company} busca: ${title}` : title];
  if (location) head.push(`Ubicación: ${location}`);
  if (salary) head.push(`Sueldo: ${salary}`);
  if (url) head.push(`Postular: ${url}`);

  return [head.join('\n'), description].join('\n\n');
}

function fillTemplate(template: string, entry: unknown): string {
  let complete = true;
  const filled = template.replace(/\{([A-Za-z0-9_.]+)\}/g, (_, path: string) => {
    const value = text(pick(entry, path)).trim();
    if (!value) complete = false;
    return value;
  });
  return complete ? filled : '';
}

function urlOf(entry: unknown, fields: DescriptorFields): string {
  const direct = text(first(entry, fields.url)).trim();
  if (direct) return direct;
  return fields.urlTemplate ? fillTemplate(fields.urlTemplate, entry) : '';
}

function toMetrics(entry: unknown, fields: DescriptorFields): PostMetrics {
  return {
    postedAt: toIsoDate(first(entry, fields.postedAt)),
    applications: positiveNumber(first(entry, fields.applications)),
    responseDays: null,
  };
}

function toRawPost(entry: unknown, fields: DescriptorFields): RawPost | null {
  const body = toPostText(entry, fields);
  if (!body) return null;
  const description = plainText(text(first(entry, fields.description))).trim();
  const { company } = headlineOf(entry, fields, description);
  const url = urlOf(entry, fields);
  return {
    text: body,
    author: company || null,
    employer: company || null,
    url: url || null,
    metrics: toMetrics(entry, fields),
  };
}

export class DescribedSource implements JobSource {
  readonly profileId = null;
  readonly loginUrl = null;
  readonly policy = OPEN_API_POLICY;

  constructor(private readonly descriptor: SourceDescriptor) {}

  get name(): string {
    return this.descriptor.name;
  }

  get label(): string {
    return this.descriptor.label;
  }

  async fetch(_selectPermalinks: PermalinkSelector, isFresh?: FreshnessCheck): Promise<RawPost[]> {
    const { paging } = this.descriptor.request;
    const posts: RawPost[] = [];
    const seen = new Set<string>();
    let pages = paging ? paging.max : 1;

    for (let index = 0; index < pages; index++) {
      const page = paging ? paging.start + index : null;
      const payload = await this.request(page);
      const entries = this.entriesOf(payload);

      if (paging?.totalPages) {
        const total = positiveNumber(pick(payload, paging.totalPages));
        if (total !== null) pages = Math.min(paging.max, total);
      }

      const pagePosts: RawPost[] = [];
      for (const entry of entries) {
        const post = toRawPost(entry, this.descriptor.fields);
        if (!post) continue;
        const key = post.url ?? post.text;
        if (seen.has(key)) continue;
        seen.add(key);
        posts.push(post);
        pagePosts.push(post);
      }

      if (entries.length === 0) break;
      if (isFresh && !pagePosts.some((post) => isFresh(post.text))) break;
    }

    if (posts.length === 0 && !this.descriptor.allowEmpty) {
      throw new Error(
        `${this.descriptor.request.url} respondió sin vacantes utilizables: ` +
        'o cambió la forma de la respuesta, o el descriptor apunta a campos que ya no existen.',
      );
    }
    return posts;
  }

  async close(): Promise<void> {}

  private entriesOf(payload: unknown): unknown[] {
    const { list, skip } = this.descriptor.fields;
    const found = pick(payload, list);
    if (!Array.isArray(found)) {
      throw new Error(
        `${this.descriptor.request.url}: "${list ?? 'la raíz'}" no es una lista en la respuesta. ` +
        'Revisa fields.list del descriptor.',
      );
    }
    return found.slice(skip);
  }

  private async request(page: number | null): Promise<unknown> {
    const { url, method, headers, query, body } = this.descriptor.request;
    const target = new URL(url);
    for (const [key, value] of Object.entries(query)) {
      target.searchParams.set(key, value);
    }
    if (page !== null && this.descriptor.request.paging) {
      target.searchParams.set(this.descriptor.request.paging.param, String(page));
    }

    const { format } = this.descriptor.request;

    const response = await fetch(target, {
      method,
      headers: {
        accept: format === 'json' ? 'application/json' : 'text/html, application/rss+xml, application/xml',
        'user-agent': USER_AGENT,
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${target.href} respondió ${response.status} ${response.statusText}`);
    }

    if (format === 'embedded') {
      const list = embeddedList(await response.text(), target.href);
      if (!list) {
        throw new Error(
          `${target.href} no trae ninguna lista de vacantes dentro de la página. ` +
          '¿Sigue dibujándose en el servidor?',
        );
      }
      return list;
    }

    if (format === 'rss') {
      const items = parseFeed(await response.text());
      if (items.length === 0) {
        throw new Error(`${target.href} no trajo ni un <item>: ¿sigue siendo un feed RSS?`);
      }
      return items;
    }

    try {
      return await response.json();
    } catch {
      throw new Error(
        `${target.href} no devolvió JSON. Si la fuente es un feed, ` +
        'el descriptor necesita "format": "rss".',
      );
    }
  }
}
