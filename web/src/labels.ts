import { t } from './i18n';
import { JobLocation, JobSeniority, JobStatus, RunFailure } from './types';

/**
 * Las etiquetas del dominio, traducidas.
 *
 * Son FUNCIONES y no tablas constantes: una tabla se construye al importar el
 * módulo, y para entonces todavía no se sabe en qué idioma habla este usuario
 * —lo dice la API—. Una tabla congelaría el idioma del primer render.
 *
 * Y no nombran ningún país: el mismo dashboard lo usa gente que busca desde
 * sitios distintos, así que "tu país" es cierto para todas. Cuál es lo dice su
 * perfil, no esta tabla.
 */
export function jobStatusLabel(status: JobStatus): string {
  switch (status) {
    case JobStatus.New: return t('status.new');
    case JobStatus.Seen: return t('status.seen');
    case JobStatus.Saved: return t('status.saved');
    case JobStatus.Dismissed: return t('status.dismissed');
  }
}

export function jobSeniorityLabel(seniority: JobSeniority): string {
  return seniority === JobSeniority.Junior ? t('seniority.junior') : t('seniority.regular');
}

export function jobLocationLabel(location: JobLocation): string {
  switch (location) {
    case JobLocation.HomeCountry: return t('location.homeCountry');
    case JobLocation.Global: return t('location.global');
    case JobLocation.OtherCountry: return t('location.otherCountry');
    case JobLocation.Onsite: return t('location.onsite');
    case JobLocation.Hybrid: return t('location.hybrid');
    case JobLocation.Unknown: return t('location.unknown');
  }
}

/**
 * Lo que se le dice al usuario cuando una pasada falla.
 *
 * El motivo importa más que el mensaje técnico: una sesión caducada es una
 * acción suya de treinta segundos, y antes se escondía detrás de un "el feed no
 * devolvió publicaciones" que mandaba a revisar selectores.
 */
export function runFailureLabel(failure: RunFailure): string {
  switch (failure) {
    case RunFailure.LoginRequired: return t('failure.loginRequired');
    case RunFailure.ProfileBusy: return t('failure.profileBusy');
    case RunFailure.Layout: return t('failure.layout');
    case RunFailure.Other: return t('failure.other');
  }
}

/** Qué hacer. El comando lleva la plataforma que falló, no una escrita a mano. */
export function runFailureAdvice(failure: RunFailure, source = 'linkedin'): string {
  switch (failure) {
    case RunFailure.LoginRequired: return t('failure.loginRequired.advice', { source });
    case RunFailure.ProfileBusy: return t('failure.profileBusy.advice');
    case RunFailure.Layout: return t('failure.layout.advice');
    case RunFailure.Other: return t('failure.other.advice');
  }
}

/**
 * De dónde salió la oferta, con el nombre que usa la plataforma.
 *
 * No se traduce: un nombre propio es el mismo en los dos idiomas. Es una
 * función y no un `Record` porque `Job.source` es un `string` libre —el id que
 * la fuente guarda en la BD— y una plataforma nueva aparece en los datos antes
 * que en esta tabla. Ante un id desconocido se enseña tal cual, que dice la
 * verdad, en vez de un hueco.
 */
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  getonbrd: 'Get on Board',
};

export const jobSourceLabel = (source: string): string => SOURCE_LABELS[source] ?? source;
