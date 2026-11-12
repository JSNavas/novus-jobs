export const DESCRIPTOR_VERSION = 1;

export type FieldPath = string;

export type DescriptorMethod = 'GET' | 'POST';

export type DescriptorFormat = 'json' | 'rss' | 'embedded';

export interface DescriptorPaging {
  readonly param: string;
  readonly start: number;
  readonly max: number;
  readonly totalPages: FieldPath | null;
}

export interface DescriptorRequest {
  readonly url: string;
  readonly method: DescriptorMethod;
  readonly format: DescriptorFormat;
  readonly headers: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body: Readonly<Record<string, unknown>> | null;
  readonly paging: DescriptorPaging | null;
}

export interface DescriptorFields {
  readonly list: FieldPath | null;
  readonly skip: number;
  readonly titleFromDescription: boolean;
  readonly companySeparator: string | null;
  readonly title: readonly FieldPath[];
  readonly company: readonly FieldPath[];
  readonly description: readonly FieldPath[];
  readonly url: readonly FieldPath[];
  readonly urlTemplate: string | null;
  readonly location: readonly FieldPath[];
  readonly postedAt: readonly FieldPath[];
  readonly salary: readonly FieldPath[];
  readonly applications: readonly FieldPath[];
}

export interface SourceDescriptor {
  readonly version: number;
  readonly name: string;
  readonly label: string;
  readonly author: string | null;
  readonly homepage: string | null;
  readonly allowEmpty: boolean;
  readonly request: DescriptorRequest;
  readonly fields: DescriptorFields;
}

const NAME_SHAPE = /^[a-z0-9][a-z0-9-]*$/;
const MAX_PAGES_CEILING = 20;
const DEFAULT_MAX_PAGES = 3;
const DEFAULT_FIRST_PAGE = 1;
const MAX_SKIP = 10;

export class DescriptorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DescriptorError';
  }
}

export function pick(root: unknown, path: FieldPath | null): unknown {
  if (path === null || path === '') return root;
  let current = root;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function first(root: unknown, paths: readonly FieldPath[]): unknown {
  for (const path of paths) {
    const value = pick(root, path);
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return value;
  }
  return undefined;
}

function asObject(value: unknown, what: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DescriptorError(`${what} tiene que ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DescriptorError(`${what} tiene que ser un texto con contenido.`);
  }
  return value.trim();
}

function asStringMap(value: unknown, what: string): Record<string, string> {
  if (value === undefined || value === null) return {};
  const raw = asObject(value, what);
  const map: Record<string, string> = {};
  for (const [key, entry] of Object.entries(raw)) {
    map[key] = typeof entry === 'string' ? entry : asString(entry, `${what}.${key}`);
  }
  return map;
}

function asPaths(value: unknown, what: string, required: boolean): string[] {
  if (value === undefined || value === null) {
    if (required) {
      throw new DescriptorError(`falta "${what}": sin eso no se puede leer la vacante.`);
    }
    return [];
  }
  const list = Array.isArray(value) ? value : [value];
  return list.map((entry, index) => asString(entry, `${what}[${index}]`));
}

function asMethod(value: unknown): DescriptorMethod {
  if (value === undefined || value === null) return 'GET';
  const text = asString(value, 'request.method').toUpperCase();
  if (text !== 'GET' && text !== 'POST') {
    throw new DescriptorError(`request.method solo puede ser GET o POST, no "${text}".`);
  }
  return text;
}

function asFormat(value: unknown): DescriptorFormat {
  if (value === undefined || value === null) return 'json';
  const text = asString(value, 'request.format').toLowerCase();
  if (text !== 'json' && text !== 'rss' && text !== 'embedded') {
    throw new DescriptorError(`request.format solo puede ser json, rss o embedded, no "${text}".`);
  }
  return text;
}

function asBody(value: unknown, method: DescriptorMethod): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (method !== 'POST') {
    throw new DescriptorError('request.body solo tiene sentido con request.method POST.');
  }
  return asObject(value, 'request.body');
}

function asSkip(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > MAX_SKIP) {
    throw new DescriptorError(`fields.skip tiene que ser un entero entre 0 y ${MAX_SKIP}.`);
  }
  return value as number;
}

function parsePaging(value: unknown): DescriptorPaging | null {
  if (value === undefined || value === null) return null;
  const raw = asObject(value, 'request.paging');
  const max = typeof raw.max === 'number' ? raw.max : DEFAULT_MAX_PAGES;
  if (!Number.isInteger(max) || max < 1) {
    throw new DescriptorError('request.paging.max tiene que ser un entero de 1 o más.');
  }
  const start = typeof raw.start === 'number' ? raw.start : DEFAULT_FIRST_PAGE;
  if (!Number.isInteger(start) || start < 0) {
    throw new DescriptorError('request.paging.start tiene que ser 0 o 1.');
  }
  return {
    param: asString(raw.param, 'request.paging.param'),
    start,
    max: Math.min(max, MAX_PAGES_CEILING),
    totalPages:
      raw.totalPages === undefined || raw.totalPages === null
        ? null
        : asString(raw.totalPages, 'request.paging.totalPages'),
  };
}

function parseHttpsUrl(value: unknown, what: string): string {
  const text = asString(value, what);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new DescriptorError(`${what} no es una URL válida: "${text}".`);
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new DescriptorError(`${what} tiene que ser https (salvo localhost, para probar).`);
  }
  return text;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function parseDescriptor(input: unknown): SourceDescriptor {
  const raw = asObject(input, 'el descriptor');

  const version = typeof raw.version === 'number' ? raw.version : DESCRIPTOR_VERSION;
  if (version !== DESCRIPTOR_VERSION) {
    throw new DescriptorError(
      `este descriptor es de la versión ${version} y aquí se entiende la ${DESCRIPTOR_VERSION}.`,
    );
  }

  const name = asString(raw.name, 'name');
  if (!NAME_SHAPE.test(name)) {
    throw new DescriptorError(`name "${name}" no vale: en minúsculas, sin espacios ni acentos.`);
  }

  const request = asObject(raw.request, 'request');
  const fields = asObject(raw.fields, 'fields');
  const method = asMethod(request.method);

  return {
    version,
    name,
    label: optionalText(raw.label) ?? name,
    author: optionalText(raw.author),
    allowEmpty: raw.allowEmpty === true,
    homepage: raw.homepage === undefined || raw.homepage === null
      ? null
      : parseHttpsUrl(raw.homepage, 'homepage'),
    request: {
      url: parseHttpsUrl(request.url, 'request.url'),
      method,
      format: asFormat(request.format),
      headers: asStringMap(request.headers, 'request.headers'),
      query: asStringMap(request.query, 'request.query'),
      body: asBody(request.body, method),
      paging: parsePaging(request.paging),
    },
    fields: {
      list: optionalText(fields.list),
      skip: asSkip(fields.skip),
      titleFromDescription: fields.titleFromDescription === true,
      companySeparator: optionalText(fields.companySeparator),
      title: asPaths(fields.title, 'fields.title', fields.titleFromDescription !== true),
      company: asPaths(fields.company, 'fields.company', false),
      description: asPaths(fields.description, 'fields.description', true),
      url: asPaths(fields.url, 'fields.url', false),
      urlTemplate: optionalText(fields.urlTemplate),
      location: asPaths(fields.location, 'fields.location', false),
      postedAt: asPaths(fields.postedAt, 'fields.postedAt', false),
      salary: asPaths(fields.salary, 'fields.salary', false),
      applications: asPaths(fields.applications, 'fields.applications', false),
    },
  };
}

export function serializeDescriptor(descriptor: SourceDescriptor): string {
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}
