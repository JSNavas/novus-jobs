import type { Job, JobStatus, JobVerdict, RunInfo } from '../types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const PAGE_SIZE = 10;

export const ALL_VERDICTS = 'todas';

export interface RejectionCount {
  code: string;
  count: number;
}

export function listRejectionReasons(): Promise<RejectionCount[]> {
  return request<RejectionCount[]>('/jobs/reasons');
}

export interface JobQuery {
  rejectionCode?: string;
  source?: string;
  since?: string;
  verdict?: JobVerdict | typeof ALL_VERDICTS;
  runId?: number;
  limit?: number;
  offset?: number;
  status?: JobStatus;
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
  rejected: number;
  byStatus: Record<JobStatus, number>;
  focusNew: number;
  lastRun: RunInfo | null;
}

export interface Schedule {
  hours: number[];
  timezone: string;
  nextAt: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    // Solo el cuerpo de texto es JSON: un FormData trae su propio límite multipart
    // y ponerle la cabecera a mano lo rompe.
    headers: typeof init?.body === 'string'
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
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
  if (query.source) params.set('source', query.source);
  if (query.since) params.set('since', query.since);
  if (query.rejectionCode) params.set('rejectionCode', query.rejectionCode);
  if (query.q) params.set('q', query.q);
  if (query.hasApply !== undefined) params.set('hasApply', String(query.hasApply));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));
  return request<JobsPage>(`/jobs?${params.toString()}`);
}

export function updateJobStatus(id: number, status: JobStatus): Promise<Job> {
  return request<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export interface RunsPage {
  items: RunInfo[];
  total: number;
}

export function listRuns(limit = PAGE_SIZE, offset = 0, since: string | null = null): Promise<RunsPage> {
  const window = since === null ? '' : `&since=${encodeURIComponent(since)}`;
  return request<RunsPage>(`/runs?limit=${limit}&offset=${offset}${window}`);
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
  vacancies: number;
  share: number;
  known: boolean;
  isNew?: boolean;
  examples: string[];
}

export interface EmergingTerm {
  term: string;
  vacancies: number;
  example: string | null;
  isNew?: boolean;
}

export interface Focus {
  analysed: number;
  windowDays: number;
  topics: FocusTopic[];
  emerging: EmergingTerm[];
  newCount?: number;
}

export function markFocusSeen(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/focus/seen', { method: 'POST' });
}

export function getFocus(months?: number): Promise<Focus> {
  return request<Focus>(months ? `/focus?months=${months}` : '/focus');
}

export interface Settings {
  gmailAccount: string | null;
  motivationTemplate: string;
  defaultMotivationTemplate: string;
  maxAgeMonths: number;
  focusWindowMonths: number;
  mailConfigured: boolean;
  mailTo: string;
  mailOnlyNewOffers: boolean;
  linkedinSearches: string[];
}

export function getSettings(): Promise<Settings> {
  return request<Settings>('/settings');
}

export function updateSettings(
  changes: {
    motivationTemplate?: string;
    maxAgeMonths?: number;
    focusWindowMonths?: number;
    mailTo?: string;
    mailOnlyNewOffers?: boolean;
  },
): Promise<Settings> {
  return request<Settings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
}

export function updateLinkedInSearches(urls: readonly string[]): Promise<{ urls: string[] }> {
  return request<{ urls: string[] }>('/settings/linkedin-searches', {
    method: 'PUT',
    body: JSON.stringify({ urls }),
  });
}

export function getSchedule(): Promise<Schedule> {
  return request<Schedule>('/schedule');
}

export type IntegrationSchedule =
  | { kind: 'configured-hours'; hours: number[] }
  | { kind: 'every-minutes'; minutes: number };

export interface Integration {
  name: string;
  label: string;
  endpoint: string | null;
  needsLogin: boolean;
  profileId: string | null;
  enabled: boolean;
  schedule: IntegrationSchedule;
  timezone: string;
  lastRunAt: string | null;
  nextAt: string | null;
}

export function listIntegrations(): Promise<Integration[]> {
  return request<Integration[]>('/integrations');
}

export type LoginStatus = 'idle' | 'open' | 'saved' | 'failed';

export interface LoginState {
  status: LoginStatus;
  message: string | null;
  since: string;
}

export function loginState(profileId: string): Promise<LoginState> {
  return request<LoginState>(`/browser/${profileId}/login`);
}

export function openLoginWindow(profileId: string): Promise<LoginState> {
  return request<LoginState>(`/browser/${profileId}/login`, { method: 'POST' });
}

export function updateIntegrationEnabled(name: string, enabled: boolean): Promise<Integration> {
  return request<Integration>(`/integrations/${name}/enabled`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

export function updateIntegrationSchedule(
  name: string,
  schedule: { minutes: number } | { hours: number[] },
): Promise<Integration> {
  return request<Integration>(`/integrations/${name}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  });
}

export type EnglishLevel = 'none' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native';

export interface CandidateProfile {
  language: 'es' | 'en';
  stack: string[];
  core: string[];
  cannotDo: string[];
  english: { level: EnglishLevel; filter: boolean };
  geo: { country: string; city: string | null; timezone: string; excludeLocalEmployers: boolean };
  modality: { remoteGlobal: boolean; remoteHomeCountry: boolean; hybrid: boolean; onsite: boolean };
}

export interface OnboardingState {
  completed: boolean;
  profile: CandidateProfile;
  catalogue: {
    countries: { code: string; label: string; cities: string[] }[];
    englishLevels: EnglishLevel[];
    ecosystems: { id: string; label: string }[];
  };
  canEnhance: boolean;
  acceptedFiles: string[];
  cv: { name: string; updatedAt: string; bytes: number } | null;
}

export interface CvReading {
  stack: string[];
  core: string[];
  suggestedVetoes: { ecosystem: string; label: string; technologies: string[] }[];
  english: EnglishLevel | null;
  country: string | null;
  city: string | null;
  years: number | null;
  foundInCv: boolean;
  enhanced: boolean;
}

export function uploadCv(file: File, enhance: boolean): Promise<CvReading> {
  const body = new FormData();
  body.append('cv', file);
  return request<CvReading>(`/onboarding/cv?enhance=${enhance ? 'true' : 'false'}`, { method: 'POST', body });
}

export function getOnboarding(): Promise<OnboardingState> {
  return request<OnboardingState>('/onboarding');
}

export async function readCv(file: File, enhance: boolean): Promise<CvReading> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api/onboarding/cv?enhance=${enhance ? 'true' : 'false'}`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(response.status, body.error ?? `Error ${response.status}`);
  }
  return (await response.json()) as CvReading;
}

export function saveOnboardingStep(changes: {
  language?: 'es' | 'en';
  stack?: string[];
  core?: string[];
  cannotDo?: string[];
  vetoEcosystems?: string[];
  english?: { level: EnglishLevel; filter: boolean };
  geo?: CandidateProfile['geo'];
  modality?: CandidateProfile['modality'];
}): Promise<{ profile: CandidateProfile; completed: boolean }> {
  return request('/onboarding/profile', {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
}

export function completeOnboarding(): Promise<{ completed: boolean; profile: CandidateProfile }> {
  return request('/onboarding/complete', { method: 'POST' });
}

export interface SourceCandidate {
  url: string;
  format: 'json' | 'rss';
  how: string;
  count: number;
}

export interface Discovery {
  candidates: SourceCandidate[];
  notes: string[];
}

export interface SourcePreview {
  count: number;
  posts: { employer: string | null; url: string | null; postedAt: string | null; text: string }[];
}

export interface InventedSource {
  descriptor: Record<string, unknown>;
  preview: SourcePreview;
}

export function discoverSource(url: string): Promise<Discovery> {
  return request('/descriptors/discover', { method: 'POST', body: JSON.stringify({ url }) });
}

export function inventSource(url: string): Promise<InventedSource> {
  return request('/descriptors/invent', { method: 'POST', body: JSON.stringify({ url }) });
}

export function previewSource(descriptor: unknown): Promise<InventedSource> {
  return request('/descriptors/preview', { method: 'POST', body: JSON.stringify(descriptor) });
}

export function saveSource(descriptor: unknown): Promise<{ ok: boolean }> {
  return request('/descriptors', { method: 'POST', body: JSON.stringify(descriptor) });
}

export function listSources(): Promise<Record<string, unknown>[]> {
  return request('/descriptors');
}

export function listHiddenSources(): Promise<string[]> {
  return request('/descriptors/hidden');
}

export function showHiddenSources(): Promise<{ ok: boolean }> {
  return request('/descriptors/hidden/clear', { method: 'POST' });
}

export function deleteSource(name: string): Promise<{ ok: boolean; removed?: boolean }> {
  return request(`/descriptors/${encodeURIComponent(name)}`, { method: 'DELETE' });
}
