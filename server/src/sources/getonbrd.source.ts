import { OPEN_API_POLICY } from './policy.js';
import type { JobSource, PermalinkSelector, PostMetrics, RawPost } from './types.js';

/**
 * ═══ GET ON BOARD, POR SU API PÚBLICA Y NO POR SU MCP ═══
 *
 * Ellos publican un servidor MCP (`getonbrd.com/mcp`), y no sirve para esto:
 * es la herramienta del RECLUTADOR. Sus cuatro tools son `whoami`,
 * `search_talent` —busca candidatos en su base de talento—, `list_jobs` y
 * `job_details`, que listan las vacantes que publica TU empresa, no las que
 * puedes solicitar. No hay nada para buscar empleo ni para ver postulaciones.
 *
 * Lo que sí hay es `GET /api/v0/search/jobs`, que responde 200 SIN
 * autenticación. Y eso cambia el trato con esta plataforma respecto a
 * LinkedIn, en lo único que de verdad manda aquí:
 *
 *   No hay cuenta que cuidar. No hay navegador, ni perfil de Playwright, ni
 *   sesión que caduque, ni muro de login, ni scroll que parezca un robot.
 *   Es una petición HTTP a un endpoint que ellos abren a propósito.
 *
 * Por eso `profileId` y `loginUrl` son `null`: el contrato ya preveía una
 * fuente que lee sin sesión.
 *
 * ═══ LO QUE ESTA FUENTE *NO* RESUELVE ═══
 *
 * Que contraten en Venezuela. `remote_zone` viene siempre `null` y el país de
 * un remoto llega como `["Remote"]`, así que la elegibilidad geográfica sigue
 * estando solo en la prosa del anuncio. Las reglas y el juez siguen hablando,
 * igual que con LinkedIn.
 */

const SEARCH_URL = 'https://www.getonbrd.com/api/v0/search/jobs';
const CATEGORIES_URL = 'https://www.getonbrd.com/api/v0/categories';

/**
 * Sin `query`: se piden TODAS las vacantes remotas y deciden los filtros, que
 * es lo mismo que se hace con el feed de LinkedIn. Buscar por palabras clave
 * aquí sería meter un criterio nuevo —y más estrecho— que el del resto del
 * proyecto, y ya se midió que el problema nunca fue la falta de ofertas.
 */
const QUERY: Record<string, string> = {
  remote: 'true',
  expand: '["company","seniority"]',
  per_page: '100',
};

/**
 * Tope de páginas. El 2026-11-11 había 187 vacantes remotas en total, o sea
 * dos páginas; tres deja margen para que crezcan sin que un día la pasada se
 * ponga a paginar sin fin porque cambió el significado de `total_pages`.
 */
const MAX_PAGES = 3;
const TIMEOUT_MS = 20_000;

/** Lo que de verdad se usa de la respuesta. Lo demás se ignora. */
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

/**
 * El anuncio viene en HTML (`<ul><li>…`), y el resto del proyecto lee texto
 * plano: las reglas buscan palabras y el juez recibe la prosa tal cual. Las
 * etiquetas de lista se convierten en guiones ANTES de borrar las demás, para
 * no fundir cinco requisitos en una línea ilegible.
 */
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

/**
 * La URL de la vacante.
 *
 * La canónica es `/jobs/<categoría>/<slug>`, y la respuesta trae el nombre de
 * la categoría ("Programming"), no su slug ("programming"), así que hace falta
 * el mapa de `/api/v0/categories`. Sin él se usa `/empleos/<slug>`, que
 * redirige con un 301 a la buena.
 *
 * Y la canónica importa por algo que no se ve: `extractApplyUrl` reconoce una
 * vía de postulación por la forma de la URL (`jobs`, `career`, `postula`…).
 * `/empleos/` no está en esa lista, así que con la de respaldo la oferta se
 * guardaba SIN botón de postularse —comprobado sobre las 187 de hoy: 29
 * aceptadas y las 29 sin vía— mientras que la canónica, que lleva `/jobs/`,
 * sí la reconoce. Se arregla con el dato correcto, no ensanchando el regex.
 */
function jobUrl(slug: string, categorySlug: string | null): string {
  return categorySlug
    ? `https://www.getonbrd.com/jobs/${categorySlug}/${slug}`
    : `https://www.getonbrd.com/empleos/${slug}`;
}

/**
 * La línea de modalidad y país, que es la que leen las reglas de ubicación.
 *
 * `countries: ["Remote"]` NO es un país: es su forma de decir "no lo
 * especifican". En ese caso no se escribe línea de país, porque inventarla
 * sería afirmar algo que el anuncio no dice — y una ubicación inventada
 * descarta o rescata por el motivo equivocado.
 */
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

/**
 * De JSON estructurado a un anuncio en texto.
 *
 * Suena a paso atrás —se tiene el dato limpio y se devuelve prosa— pero el
 * pipeline entero recibe `RawPost.text` y de ahí saca TODO: ubicación, stack,
 * seniority, vía de postulación. Reescribirlo para que acepte campos sueltos
 * sería tocar las reglas, el juez y la BD por una sola fuente.
 *
 * LO DECISIVO VA PRIMERO, y es deliberado: el juez corta cada publicación a
 * 1800 caracteres, así que el puesto, la modalidad y los requisitos tienen que
 * caber antes del recorte. Las funciones del cargo van al final porque son lo
 * primero que sobra.
 *
 * Y NADA VOLÁTIL entra aquí. La huella que deduplica es un sha1 de los
 * primeros 800 caracteres: si se colara `applications_count`, que sube cada
 * día, la misma vacante entraría como nueva en cada pasada.
 */
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
  // El enlace va en el cuerpo porque de ahí lo saca `buildContext` para la vía
  // de postulación, igual que un `lnkd.in` en un post de LinkedIn.
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

/**
 * Los números de la plataforma, fuera del texto.
 *
 * `published_at` llega en segundos desde epoch. Importa que sea la fecha de
 * ELLOS: hasta ahora la tarjeta enseñaba cuándo la habíamos encontrado
 * nosotros, que con una pasada cada media hora es siempre «hace un rato» y no
 * dice nada. Saber que una vacante es del 2 de noviembre y lleva 298
 * postulaciones sí dice algo: que llegas tarde.
 */
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
    // Se sabe desde el primer momento, sin pedir nada más. En LinkedIn hay que
    // abrir el menú "⋯" de cada publicación para esto, y ese clic se raciona
    // porque lo paga la cuenta; aquí el enlace viene en la respuesta.
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

  /**
   * `selectPermalinks` se ignora, y es correcto: existe para racionar los
   * clics que cuestan salud de cuenta en una plataforma que te vigila. Aquí
   * cada vacante ya trae su URL en el JSON, así que no hay nada que racionar.
   */
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

    // Que el endpoint responda 200 con cero vacantes no es un fallo de red: es
    // que cambió el contrato o el filtro. Se grita, porque en silencio parece
    // simplemente "hoy no había nada".
    if (posts.length === 0) {
      throw new Error(
        `${SEARCH_URL} respondió sin vacantes utilizables: ¿cambió la forma de la respuesta? ` +
        '(se piden las remotas, sin palabra clave)',
      );
    }
    return posts;
  }

  /**
   * El mapa nombre → slug de categoría, para armar la URL canónica.
   *
   * Una petición por pasada, y si falla NO se cae la pasada: se devuelve vacío
   * y las URLs salen por `/empleos/<slug>`, que redirige igual. Perder el
   * botón de postularse es malo; perder las 187 ofertas por un fallo en una
   * petición accesoria es peor.
   */
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

  /** Nada que cerrar: no hay navegador ni conexión que sostener. */
  async close(): Promise<void> {}
}
