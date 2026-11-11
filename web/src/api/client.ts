import type { Job, JobSeniority, JobStatus, JobVerdict, RunInfo } from '../types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * CUÁNTAS SE PIDEN DE UNA VEZ, en todas las listas.
 *
 * Diez, y la siguiente página se pide al servidor cuando hace falta. Traerse
 * las setenta para enseñar diez es pagar el transporte de sesenta que nadie va
 * a mirar, y con el historial creciendo tres veces al día eso solo empeora.
 */
export const PAGE_SIZE = 10;

/** Las dos listas a la vez: lo aceptado y lo que el filtro descartó. */
export const ALL_VERDICTS = 'todas';

export interface JobQuery {
  verdict?: JobVerdict | typeof ALL_VERDICTS;
  /** Solo lo que encontró una búsqueda concreta. */
  runId?: number;
  /** Cuántas se piden y desde cuál: la paginación la hace el servidor. */
  limit?: number;
  offset?: number;
  status?: JobStatus;
  seniority?: JobSeniority;
  q?: string;
  hasApply?: boolean;
}

export interface JobsPage {
  items: Job[];
  total: number;
  /** Cuántas hay en cada pestaña con los mismos filtros, ignorando la elegida. */
  bySeniority: Record<JobSeniority, number>;
}

export interface Stats {
  new: number;
  saved: number;
  total: number;
  /** Cuántas descartó el filtro por no encajar. No entran en la bandeja. */
  rejected: number;
  /** Cuántas hay en cada estado: lo que enseña el menú lateral. */
  byStatus: Record<JobStatus, number>;
  lastRun: RunInfo | null;
}

export interface Schedule {
  hours: number[];
  timezone: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(response.status, body.error ?? `Error ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listJobs(query: JobQuery): Promise<JobsPage> {
  const params = new URLSearchParams();
  if (query.verdict) params.set('verdict', query.verdict);
  if (query.runId !== undefined) params.set('runId', String(query.runId));
  if (query.status) params.set('status', query.status);
  if (query.seniority) params.set('seniority', query.seniority);
  if (query.q) params.set('q', query.q);
  if (query.hasApply !== undefined) params.set('hasApply', String(query.hasApply));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));
  return request<JobsPage>(`/jobs?${params.toString()}`);
}

export function updateJobStatus(id: number, status: JobStatus): Promise<Job> {
  return request<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

/** Una página del historial de búsquedas, lo más reciente primero. */
export interface RunsPage {
  items: RunInfo[];
  total: number;
}

export function listRuns(limit = PAGE_SIZE, offset = 0): Promise<RunsPage> {
  return request<RunsPage>(`/runs?limit=${limit}&offset=${offset}`);
}

export function getRun(id: number): Promise<RunInfo> {
  return request<RunInfo>(`/runs/${id}`);
}

export function getStats(): Promise<Stats> {
  return request<Stats>('/stats');
}

export function startRun(): Promise<RunInfo> {
  return request<RunInfo>('/runs', { method: 'POST' });
}

export interface FocusTopic {
  name: string;
  area: string;
  /** En cuántas vacantes aceptadas aparece. */
  vacancies: number;
  share: number;
  /** Si ya está en su perfil. Lo que no lo está es la lista de estudio. */
  known: boolean;
  /** Frases reales de los anuncios, tal cual las escribieron. */
  examples: string[];
}

export interface Focus {
  analysed: number;
  topics: FocusTopic[];
}

/** Qué piden en común las vacantes aceptadas. Se calcula al vuelo. */
export function getFocus(): Promise<Focus> {
  return request<Focus>('/focus');
}

export interface Settings {
  /** La cuenta desde la que él se postula. No tiene que ver con los avisos. */
  gmailAccount: string | null;
  /** El párrafo de motivación, con sus huecos. Se edita en Configuración. */
  motivationTemplate: string;
  /** La de fábrica, para poder volver a ella desde la pantalla. */
  defaultMotivationTemplate: string;
}

/** Desde qué cuenta escribe él, y con qué párrafo se postula. */
export function getSettings(): Promise<Settings> {
  return request<Settings>('/settings');
}

/** Guarda la plantilla. Con el texto vacío el servidor restituye la de fábrica. */
export function updateSettings(motivationTemplate: string): Promise<Settings> {
  return request<Settings>('/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ motivationTemplate }),
  });
}

/** Cuándo busca el servidor. Lo dice él: las horas son configurables. */
export function getSchedule(): Promise<Schedule> {
  return request<Schedule>('/schedule');
}
