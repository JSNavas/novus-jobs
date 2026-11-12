export interface SourcePolicy {
  readonly schedule: SourceSchedule;
  readonly manualDailyBudget: number | null;
  readonly manualMinIntervalMs: number;
  readonly minGapAfterAnyPassMs: number;
  readonly maxPassesPerDay: number | null;
  readonly retryAfterBusyMs: number;
}

export type SourceSchedule =
  | { readonly kind: 'configured-hours'; readonly hours?: readonly number[] }
  /** Cada N minutos, sin franjas. */
  | { readonly kind: 'every-minutes'; readonly minutes: number };

export const WATCHED_ACCOUNT_POLICY: SourcePolicy = {
  schedule: { kind: 'configured-hours' },
  manualDailyBudget: null,
  manualMinIntervalMs: 60 * 60_000,
  minGapAfterAnyPassMs: 0,
  maxPassesPerDay: 20,
  retryAfterBusyMs: 5 * 60_000,
};

export const OPEN_API_POLICY: SourcePolicy = {
  schedule: { kind: 'every-minutes', minutes: 60 },
  manualDailyBudget: null,
  manualMinIntervalMs: 60_000,
  minGapAfterAnyPassMs: 0,
  maxPassesPerDay: null,
  retryAfterBusyMs: 0,
};
