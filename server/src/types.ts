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

/**
 * POR QUÉ se cayó una pasada, en una palabra que el código pueda mirar.
 *
 * El mensaje de error es para el señor; esto es para decidir si tiene sentido
 * reintentar. Son decisiones opuestas: con el perfil ocupado se reintenta
 * pronto porque basta con cerrar una ventana, y con la sesión caída NO se
 * reintenta nunca — nada va a cambiar hasta que él inicie sesión, y machacar
 * una pantalla de login es exactamente lo que marca una cuenta.
 */
export enum RunFailure {
  /** La plataforma pide entrar. Solo lo arregla `npm run login`. */
  LoginRequired = 'login_required',
  /** Otro Chromium vivo tenía el perfil. Se puede reintentar pronto. */
  ProfileBusy = 'profile_busy',
  /** Hay sesión y el feed vino vacío: cambió el maquetado. No se reintenta en bucle. */
  Layout = 'layout',
  /** Red, timeout, cualquier otra cosa. */
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
  /** El puesto a secas, sin tecnologías ni apostillas. Va al asunto del correo. */
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
  /** Presente solo cuando `status` es `error`. */
  failure: RunFailure | null;
}
