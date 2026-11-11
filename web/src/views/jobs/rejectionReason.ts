/**
 * Only two tones. A discard is not a system failure, so it never goes red.
 */
type RejectionTone = 'warning' | 'neutral';

interface RejectionCategory {
  label: string;
  tone: RejectionTone;
}

/**
 * Patterns mirror the texts emitted by `server/src/filters/decide.ts` and
 * `server/src/pipeline.ts`. If those change, change this list too: without a
 * match the reason falls back to "Otro motivo", which is honest but less useful.
 *
 * Amber marks judgment calls that can be disputed (AI, peripheral, other
 * ecosystem); gray marks verifiable facts about the offer.
 */
const CATEGORIES: readonly { match: RegExp; category: RejectionCategory }[] = [
  { match: /^\[IA\]/, category: { label: 'Rechazo IA', tone: 'warning' } },
  { match: /^no es una (vacante|oferta de trabajo)/, category: { label: 'No es oferta', tone: 'neutral' } },
  { match: /^remoto restringido a otro país/, category: { label: 'Otro país', tone: 'neutral' } },
  { match: /^presencial o híbrido/, category: { label: 'Presencial', tone: 'neutral' } },
  { match: /^exigen .+, que no sabe$/, category: { label: 'Tecnología desconocida', tone: 'neutral' } },
  { match: /^exigen inglés/, category: { label: 'Inglés', tone: 'neutral' } },
  { match: /^la contrata una empresa venezolana/, category: { label: 'Empresa venezolana', tone: 'neutral' } },
  { match: /^es de otro ecosistema/, category: { label: 'Otro ecosistema', tone: 'warning' } },
  { match: /^solo coincide en lo periférico/, category: { label: 'Solo periférico', tone: 'warning' } },
  { match: /^no menciona nada de su stack/, category: { label: 'Sin stack', tone: 'neutral' } },
];

const FALLBACK: RejectionCategory = { label: 'Otro motivo', tone: 'neutral' };

export const rejectionCategory = (reason: string): RejectionCategory =>
  CATEGORIES.find(({ match }) => match.test(reason))?.category ?? FALLBACK;
