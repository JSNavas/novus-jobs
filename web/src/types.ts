export enum JobVerdict {
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export enum JobStatus {
  New = 'new',
  Seen = 'seen',
  Saved = 'saved',
  Dismissed = 'dismissed',
}

export enum JobSeniority {
  Regular = 'regular',
  Junior = 'junior',
}

export enum JudgeStatus {
  Judged = 'judged',
  Skipped = 'skipped',
}

export enum RunStatus {
  Running = 'running',
  Ok = 'ok',
  Error = 'error',
}

export enum JobLocation {
  Venezuela = 'venezuela',
  Global = 'global',
  OtherCountry = 'other_country',
  Onsite = 'onsite',
  Unknown = 'unknown',
}

/** Espejo de `RunFailure` del servidor: por qué se cayó la última pasada. */
export enum RunFailure {
  LoginRequired = 'login_required',
  ProfileBusy = 'profile_busy',
  Layout = 'layout',
  Other = 'other',
}

export interface Job {
  id: number;
  source: string;
  fingerprint: string;
  title: string | null;
  /** El puesto a secas, sin tecnologías ni apostillas. Es el asunto del correo. */
  role: string | null;
  company: string | null;
  author: string | null;
  text: string;
  url: string | null;
  location: string | null;
  verdict: JobVerdict;
  rejectionReason: string | null;
  seniority: JobSeniority;
  isAggregator: boolean;
  judgeStatus: JudgeStatus;
  status: JobStatus;
  foundAt: string;
  postedAt: string | null;
  stackMatch: string[];
  locationKind: JobLocation;
  applyUrl: string | null;
  contactEmail: string | null;
  isUncertain: boolean;
}

export interface RunInfo {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  status: RunStatus;
  fetched: number;
  accepted: number;
  rejected: number;
  error: string | null;
  failure: RunFailure | null;
}
