import { JobLocation, JobSeniority, JobStatus, RunFailure } from './types';

export const jobStatusLabel: Record<JobStatus, string> = {
  [JobStatus.New]: 'Nueva',
  [JobStatus.Seen]: 'Vista',
  [JobStatus.Saved]: 'Guardada',
  [JobStatus.Dismissed]: 'Descartada',
};

export const jobSeniorityLabel: Record<JobSeniority, string> = {
  [JobSeniority.Regular]: 'Para ti',
  [JobSeniority.Junior]: 'Extras (junior)',
};

/**
 * Las etiquetas no nombran ningún país: el mismo dashboard lo usa gente que
 * busca desde sitios distintos, y "tu país" es cierto para todas. Cuál es ese
 * país lo dice su perfil, no esta tabla.
 */
export const jobLocationLabel: Record<JobLocation, string> = {
  [JobLocation.HomeCountry]: 'desde tu país',
  [JobLocation.Global]: 'remoto global / tu región',
  [JobLocation.OtherCountry]: 'remoto desde otro país',
  [JobLocation.Onsite]: 'presencial',
  [JobLocation.Hybrid]: 'híbrido',
  [JobLocation.Unknown]: 'no dice desde dónde se puede trabajar',
};

/**
 * Lo que se le dice al usuario cuando una pasada falla.
 *
 * El motivo importa más que el mensaje técnico: una sesión caducada es una
 * acción suya de treinta segundos, y hasta ahora se escondía detrás de un
 * "el feed no devolvió publicaciones" que mandaba a revisar selectores.
 */
export const runFailureLabel: Record<RunFailure, string> = {
  [RunFailure.LoginRequired]: 'Hay que iniciar sesión otra vez',
  [RunFailure.ProfileBusy]: 'El navegador estaba ocupado',
  [RunFailure.Layout]: 'La plataforma cambió su maquetado',
  [RunFailure.Other]: 'La última búsqueda falló',
};

export const runFailureAdvice: Record<RunFailure, string> = {
  [RunFailure.LoginRequired]:
    'La plataforma pidió entrar. En el servidor: `npm run login -- linkedin`, inicia sesión y cierra la ventana. Las búsquedas se reanudan solas.',
  [RunFailure.ProfileBusy]:
    'Otra ventana de Chromium tenía el perfil abierto. Ciérrala y vuelve a buscar: se puede reintentar en unos minutos.',
  [RunFailure.Layout]:
    'La sesión está bien, pero no se encontró ninguna publicación. Hay una captura en los logs del servidor.',
  [RunFailure.Other]: 'Mira el detalle debajo y los logs del servidor.',
};

/**
 * De dónde salió la oferta, con el nombre que usa la plataforma.
 *
 * Es una función y no un `Record` porque `Job.source` es un `string` libre —el
 * id que la fuente guarda en la BD— y no un enum: una plataforma nueva aparece
 * en los datos antes que en esta tabla. Ante un nombre desconocido se enseña
 * el id tal cual, que dice la verdad, en vez de un hueco.
 */
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  getonbrd: 'Get on Board',
};

export const jobSourceLabel = (source: string): string => SOURCE_LABELS[source] ?? source;
