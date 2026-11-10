import { ProfileBusyError } from '../browser/session.js';
import { RunFailure } from '../types.js';
import { LoginRequiredError } from './types.js';

/**
 * Traduce lo que explotó a un motivo que el código pueda mirar.
 *
 * El orden importa: los dos tipos propios son los que cambian la decisión de
 * reintentar, y por eso existen como clases y no como mensajes de texto. Lo
 * demás cae en `Layout` u `Other` y se trata igual: se registra y se espera a
 * la franja siguiente.
 */
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

/**
 * Cuando varias plataformas fallan a la vez, ¿cuál se cuenta?
 *
 * La que el señor puede arreglar. Una sesión caducada es una acción concreta
 * suya; un timeout no es nada que él pueda hacer. Si el mensaje que llega al
 * dashboard fuera el del timeout, la sesión caída se quedaría escondida detrás.
 */
const PRIORITY: readonly RunFailure[] = [
  RunFailure.LoginRequired,
  RunFailure.ProfileBusy,
  RunFailure.Layout,
  RunFailure.Other,
];

export function worstFailure(failures: readonly RunFailure[]): RunFailure {
  return PRIORITY.find((candidate) => failures.includes(candidate)) ?? RunFailure.Other;
}
