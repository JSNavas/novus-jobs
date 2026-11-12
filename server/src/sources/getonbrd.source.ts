import { OPEN_API_POLICY } from './policy.js';
import type { JobSource, PermalinkSelector, PostMetrics, RawPost } from './types.js';

const SEARCH_URL = 'https://www.getonbrd.com/api/v0/search/jobs';
const CATEGORIES_URL = 'https://www.getonbrd.com/api/v0/categories';

const QUERY: Record<string, string> = {
  remote: 'true',
  expand: '["company","seniority"]',
  per_page: '100',
};

const MAX_PAGES = 3;
const TIMEOUT_MS = 20_000;

interface ApiJob {
  id?: unknown;
  attributes?: {
    title?: unknown;
    description?: unknown;
    functions?: unknown;
    desirable?: unknown;
    remote?: unknown;
    remote_modality?: unknown;
    countries?: unknown;
    min_salary?: unknown;
    max_salary?: unknown;
    published_at?: unknown;
    applications_count?: unknown;
    response_time_in_days?: { min?: unknown; max?: unknown };
    category_name?: unknown;
    company?: { data?: { attributes?: { name?: unknown } } };
    seniority?: { data?: { attributes?: { name?: unknown } } };
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function plainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function jobUrl(slug: string, categorySlug: string | null): string {
  return categorySlug
    ? `https://www.getonbrd.com/jobs/${categorySlug}/${slug}`
    : `https://www.getonbrd.com/empleos/${slug}`;
}

function locationLines(attributes: NonNullable<ApiJob['attributes']>): string[] {
  const remote = attributes.remote === true;
  const modality = text(attributes.remote_modality);
  const lines: string[] = [];

  if (remote) lines.push('Modalidad: 100% remoto');
  else if (modality === 'hybrid') lines.push('Modalidad: híbrido');
  else lines.push('Modalidad: presencial');

  const countries = Array.isArray(attributes.countries)
    ? attributes.countries.filter((c): c is string => typeof c === 'string' && c !== 'Remote')
    : [];
  if (countries.length) {
    lines.push(remote ? `Remoto para: ${countries.join(', ')}` : `Ubicación: ${countries.join(', ')}`);
  }
  return lines;
}

function toPostText(job: ApiJob, categories: Map<string, string>): string | null {
  const attributes = job.attributes;
  const slug = typeof job.id === 'string' ? job.id : '';
  const title = text(attributes?.title).trim();
  if (!attributes || !slug || !title) return null;

  const company = text(attributes.company?.data?.attributes?.name).trim();
  const seniority = text(attributes.seniority?.data?.attributes?.name).trim();
  const min = positiveNumber(attributes.min_salary);
  const max = positiveNumber(attributes.max_salary);

  const head = [company ? `${company} busca: ${title}` : title];
  if (seniority) head.push(`Nivel: ${seniority}`);
  head.push(...locationLines(attributes));
  if (min && max) head.push(`Sueldo: USD ${min} - ${max} al mes`);
  else if (min) head.push(`Sueldo: desde USD ${min} al mes`);
  const category = text(attributes.category_name).trim();
  if (category) head.push(`Área: ${category}`);
  head.push(`Postular: ${jobUrl(slug, categories.get(category) ?? null)}`);

  const requirements = plainText(text(attributes.description));
  const desirable = plainText(text(attributes.desirable));
  const functions = plainText(text(attributes.functions));

  const body = [
    requirements && `Requisitos:\n${requirements}`,
    desirable && `Deseable:\n${desirable}`,
    functions && `Funciones del cargo:\n${functions}`,
  ].filter(Boolean);

  return [head.join('\n'), ...body].join('\n\n');
}

function toMetrics(attributes: NonNullable<ApiJob['attributes']>): PostMetrics {
  const published = positiveNumber(attributes.published_at);
  const response = attributes.response_time_in_days;
  const min = positiveNumber(response?.min);
  const max = positiveNumber(response?.max);
  return {
    postedAt: published ? new Date(published * 1000).toISOString() : null,
    applications: typeof attributes.applications_count === 'number' ? attributes.applications_count : null,
    responseDays: min || max ? { min, max } : null,
  };
}

function toRawPost(job: ApiJob, categories: Map<string, string>): RawPost | null {
  const body = toPostText(job, categories);
  if (!body) return null;
  const company = text(job.attributes?.company?.data?.attributes?.name).trim();
  const category = text(job.attributes?.category_name).trim();
  return {
    text: body,
    author: company || null,
    url: jobUrl(String(job.id), categories.get(category) ?? null),
    metrics: toMetrics(job.attributes!),
  };
}

export class GetOnBoardSource implements JobSource {
  readonly name = 'getonbrd';
  readonly label = 'Get on Board';
  readonly profileId = null;
  readonly loginUrl = null;
  readonly policy = OPEN_API_POLICY;

  async fetch(_selectPermalinks: PermalinkSelector): Promise<RawPost[]> {
    const categories = await this.categories();
    const posts: RawPost[] = [];
    let pages = MAX_PAGES;

    for (let page = 1; page <= pages; page++) {
      const { jobs, totalPages } = await this.page(page);
      if (totalPages !== null) pages = Math.min(MAX_PAGES, totalPages);
      for (const job of jobs) {
        const post = toRawPost(job, categories);
        if (post) posts.push(post);
      }
      if (jobs.length === 0) break;
    }

    if (posts.length === 0) {
      throw new Error(
        `${SEARCH_URL} respondió sin vacantes utilizables: ¿cambió la forma de la respuesta? ` +
        '(se piden las remotas, sin palabra clave)',
      );
    }
    return posts;
  }

  private async categories(): Promise<Map<string, string>> {
    try {
      const response = await fetch(CATEGORIES_URL, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`respondió ${response.status}`);
      const payload = (await response.json()) as { data?: unknown };
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const pairs = rows.flatMap((row) => {
        const { id, attributes } = row as { id?: unknown; attributes?: { name?: unknown } };
        const name = text(attributes?.name).trim();
        return typeof id === 'string' && name ? [[name, id] as const] : [];
      });
      return new Map(pairs);
    } catch (error) {
      console.warn(
        `[getonbrd] sin el mapa de categorías (${error instanceof Error ? error.message : String(error)}): ` +
        'las ofertas van con la URL de respaldo y puede que sin vía de postulación',
      );
      return new Map();
    }
  }

  private async page(page: number): Promise<{ jobs: ApiJob[]; totalPages: number | null }> {
    const url = `${SEARCH_URL}?${new URLSearchParams({ ...QUERY, page: String(page) })}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(`no se pudo consultar Get on Board (${error instanceof Error ? error.message : String(error)})`);
    }
    if (!response.ok) {
      throw new Error(`Get on Board respondió ${response.status} ${response.statusText} en la página ${page}`);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (typeof payload !== 'object' || payload === null) {
      throw new Error(`Get on Board no devolvió JSON en la página ${page}`);
    }
    const { data, meta } = payload as { data?: unknown; meta?: unknown };
    const total = (meta as { total_pages?: unknown } | undefined)?.total_pages;
    return {
      jobs: Array.isArray(data) ? (data as ApiJob[]) : [],
      totalPages: typeof total === 'number' && total > 0 ? total : null,
    };
  }

  async close(): Promise<void> {}
}
