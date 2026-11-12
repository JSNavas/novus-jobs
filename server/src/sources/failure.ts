import { ProfileBusyError } from '../browser/session.js';
import { RunFailure } from '../types.js';
import { LoginRequiredError } from './types.js';

export function classifyFailure(error: unknown): RunFailure {
  if (error instanceof LoginRequiredError) return RunFailure.LoginRequired;
  if (error instanceof ProfileBusyError) return RunFailure.ProfileBusy;
  const message = error instanceof Error ? error.message : String(error);
  if (/no devolvió publicaciones|maquetado/i.test(message)) return RunFailure.Layout;
  return RunFailure.Other;
}

export function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const PRIORITY: readonly RunFailure[] = [
  RunFailure.LoginRequired,
  RunFailure.ProfileBusy,
  RunFailure.Layout,
  RunFailure.Other,
];

export function worstFailure(failures: readonly RunFailure[]): RunFailure {
  return PRIORITY.find((candidate) => failures.includes(candidate)) ?? RunFailure.Other;
}
