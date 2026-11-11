/**
 * Tono del distintivo. Solo dos: un descarte no es un fallo del sistema, así
 * que nunca va en rojo (eso ya lo dice el chip "Descartada por el filtro").
 */
type RejectionTone = 'warning' | 'neutral';

interface RejectionCategory {
  label: string;
  tone: RejectionTone;
}

/**
 * Los textos son los que emiten `server/src/filters/decide.ts` y
 * `server/src/pipeline.ts`. Si cambian allí, cambian aquí: sin coincidencia cae
 * en "Otro motivo", que es honesto aunque menos útil.
 *
 * Ámbar para los juicios que se pueden discutir (IA, periférico, otro
 * ecosistema); gris para los hechos verificables de la oferta.
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
