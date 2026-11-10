import type { Job, JobSeniority, JobStatus, JobVerdict, RunInfo } from '../types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface JobQuery {
  verdict?: JobVerdict;
  status?: JobStatus;
  seniority?: JobSeniority;
  q?: string;
  hasApply?: boolean;
}

export interface JobsPage {
  items: Job[];
  total: number;
}

export interface Stats {
  new: number;
  saved: number;
  total: number;
  lastRun: RunInfo | null;
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
  if (query.status) params.set('status', query.status);
  if (query.seniority) params.set('seniority', query.seniority);
  if (query.q) params.set('q', query.q);
  if (query.hasApply !== undefined) params.set('hasApply', String(query.hasApply));
  return request<JobsPage>(`/jobs?${params.toString()}`);
}

export function updateJobStatus(id: number, status: JobStatus): Promise<Job> {
  return request<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function getStats(): Promise<Stats> {
  return request<Stats>('/stats');
}

export function startRun(): Promise<RunInfo> {
  return request<RunInfo>('/runs', { method: 'POST' });
}
