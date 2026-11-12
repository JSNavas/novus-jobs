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
  HomeCountry = 'home_country',
  Global = 'global',
  OtherCountry = 'other_country',
  Onsite = 'onsite',
  Hybrid = 'hybrid',
  Unknown = 'unknown',
}

export enum RunFailure {
  LoginRequired = 'login_required',
  ProfileBusy = 'profile_busy',
  Layout = 'layout',
  Other = 'other',
}

export enum RunTrigger {
  Scheduled = 'scheduled',
  Manual = 'manual',
}

export interface Job {
  id: number;
  source: string;
  fingerprint: string;
  title: string | null;
  role: string | null;
  company: string | null;
  author: string | null;
  text: string;
  url: string | null;
  location: string | null;
  verdict: JobVerdict;
  rejectionReason: string | null;
  rejectionCode: string | null;
  rejectionParams: Record<string, string | number> | null;
  seniority: JobSeniority;
  isAggregator: boolean;
  judgeStatus: JudgeStatus;
  status: JobStatus;
  foundAt: string;
  postedAt: string | null;
  applications: number | null;
  responseDays: { min: number | null; max: number | null } | null;
  stackMatch: string[];
  locationKind: JobLocation;
  applyUrl: string | null;
  contactEmail: string | null;
  isUncertain: boolean;
  runId: number | null;
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
