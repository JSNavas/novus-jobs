import { t, type TranslationKey } from '../../i18n';
import type { Job } from '../../types';

/**
 * EL MOTIVO DE UN DESCARTE, escrito en el idioma de quien mira.
 *
 * El servidor manda un CÓDIGO con sus datos (`reject.english`, `{demanded,
 * yours}`) y aquí se convierte en frase y en etiqueta. Antes mandaba la frase
 * ya escrita en español y esto la clasificaba con expresiones regulares sobre
 * ese texto: bastó reescribir un motivo para que su etiqueta dejara de
 * reconocerlo, en silencio y sin que fallara ninguna prueba.
 *
 * Las ofertas guardadas ANTES de esto no traen código. Para esas se enseña la
 * frase tal como se guardó —en español, y así se queda— porque reescribir el
 * pasado sería inventarse qué regla fue.
 */
type RejectionTone = 'warning' | 'neutral';

export interface RejectionCategory {
  label: string;
  tone: RejectionTone;
}

/**
 * Ámbar para los juicios discutibles (la IA, lo periférico, el otro
 * ecosistema); gris para los hechos comprobables de la oferta. Nunca rojo: un
 * descarte no es un fallo del sistema.
 */
const BADGES: Record<string, { key: TranslationKey; tone: RejectionTone }> = {
  'reject.ai': { key: 'badge.ai', tone: 'warning' },
  'reject.notAVacancy': { key: 'badge.notOffer', tone: 'neutral' },
  'reject.notAnOffer': { key: 'badge.notOffer', tone: 'neutral' },
  'reject.otherCountry': { key: 'badge.otherCountry', tone: 'neutral' },
  'reject.onsite': { key: 'badge.onsite', tone: 'neutral' },
  'reject.hybrid': { key: 'badge.hybrid', tone: 'neutral' },
  'reject.homeCountryOnly': { key: 'badge.homeCountry', tone: 'neutral' },
  'reject.globalRemote': { key: 'badge.globalRemote', tone: 'neutral' },
  'reject.unknownTech': { key: 'badge.tech', tone: 'neutral' },
  'reject.english': { key: 'badge.english', tone: 'neutral' },
  'reject.localEmployer': { key: 'badge.localEmployer', tone: 'neutral' },
  'reject.otherEcosystem': { key: 'badge.otherEcosystem', tone: 'warning' },
  'reject.peripheral': { key: 'badge.peripheral', tone: 'warning' },
  'reject.noStack': { key: 'badge.noStack', tone: 'neutral' },
  'reject.stale': { key: 'badge.stale', tone: 'neutral' },
};

/** La etiqueta corta: de qué familia es el descarte. */
export function rejectionCategory(job: Pick<Job, 'rejectionCode'>): RejectionCategory {
  const badge = job.rejectionCode ? BADGES[job.rejectionCode] : undefined;
  if (!badge) return { label: t('badge.other'), tone: 'neutral' };
  return { label: t(badge.key), tone: badge.tone };
}

/** La frase entera. Sin código —ofertas de antes—, la que se guardó. */
export function rejectionText(job: Pick<Job, 'rejectionCode' | 'rejectionParams' | 'rejectionReason'>): string {
  if (!job.rejectionCode) return job.rejectionReason ?? '';
  return t(job.rejectionCode as TranslationKey, job.rejectionParams ?? undefined);
}
