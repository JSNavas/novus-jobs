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
  /** Se puede trabajar desde el país del usuario: remoto local, o la oferta lo nombra. */
  HomeCountry = 'home_country',
  /** Remoto sin restricción de residencia, o restringido a una región que le incluye. */
  Global = 'global',
  /** Remoto, pero solo para residentes de otro país. */
  OtherCountry = 'other_country',
  Onsite = 'onsite',
  /** Presencial a tiempo parcial. Separado de `Onsite`: son dos decisiones distintas. */
  Hybrid = 'hybrid',
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
  /** El motivo sin idioma. `null` en lo guardado antes de que existiera. */
  rejectionCode: string | null;
  rejectionParams: Record<string, string | number> | null;
  seniority: JobSeniority;
  isAggregator: boolean;
  judgeStatus: JudgeStatus;
  status: JobStatus;
  foundAt: string;
  /** Cuándo la publicó la plataforma. `null` si no lo dice. */
  postedAt: string | null;
  /** Cuánta gente se había postulado la última vez que se leyó. */
  applications: number | null;
  /** Lo que la empresa tarda en contestar, en días. */
  responseDays: { min: number | null; max: number | null } | null;
  stackMatch: string[];
  locationKind: JobLocation;
  applyUrl: string | null;
  contactEmail: string | null;
  isUncertain: boolean;
  /** La pasada que la encontró. `null` en lo guardado antes de registrarlo. */
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
