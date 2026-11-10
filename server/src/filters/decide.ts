import { createHash } from 'node:crypto';
import { JobLocation, JobSeniority } from '../types.js';
import { adBody, cleanLinkedInNoise, extractApplyUrl, extractEmail, isAggregatorPost, isCandidateSelfPromotion, isJuniorOrInternship, looksLikeOffer, matchStack } from './offer.js';
import { classifyLocation, isVenezuelanEmployer } from './location.js';
import { englishRequirement, hasSeveralOpenings, isOtherEcosystem, isOwnRole, unknownRequiredTech } from './requirements.js';

export interface Offer {
  text: string;
  url: string | null;
  author?: string | null;
}

export interface Verdict {
  accepted: boolean;
  reason: string | null;
  uncertain: boolean;
  seniority: JobSeniority;
  aggregator: boolean;
  location: JobLocation;
  stackMatch: string[];
  applyUrl: string | null;
  contactEmail: string | null;
}

export interface CandidateProfile {
  stack: readonly string[];
  core: readonly string[];
  cannotDo: readonly string[];
}

interface Context {
  text: string;
  stackMatch: string[];
  location: JobLocation;
  seniority: JobSeniority;
  aggregator: boolean;
  applyUrl: string | null;
  contactEmail: string | null;
}

function buildContext(text: string, stack: readonly string[]): Context {
  return {
    text,
    stackMatch: matchStack(text, stack),
    location: classifyLocation(text),
    seniority: isJuniorOrInternship(text) ? JobSeniority.Junior : JobSeniority.Regular,
    aggregator: isAggregatorPost(text),
    applyUrl: extractApplyUrl(text),
    contactEmail: extractEmail(text),
  };
}

function reject(ctx: Context, reason: string): Verdict {
  return { accepted: false, reason, uncertain: false, ...publicFields(ctx) };
}

function accept(ctx: Context, uncertain: boolean): Verdict {
  return { accepted: true, reason: null, uncertain, ...publicFields(ctx) };
}

function publicFields(ctx: Context): Omit<Verdict, 'accepted' | 'reason' | 'uncertain'> {
  return {
    seniority: ctx.seniority,
    aggregator: ctx.aggregator,
    location: ctx.location,
    stackMatch: ctx.stackMatch,
    applyUrl: ctx.applyUrl,
    contactEmail: ctx.contactEmail,
  };
}

/** Lo primero: ¿es siquiera una oferta de trabajo? */
function rejectNonOffer(ctx: Context): Verdict | null {
  if (isCandidateSelfPromotion(ctx.text)) return reject(ctx, 'no es una vacante: es alguien ofreciéndose como candidato');
  if (!looksLikeOffer(ctx.text)) return reject(ctx, 'no es una oferta de trabajo (publicación técnica o de opinión)');
  return null;
}

/** Descalificadores absolutos: un remoto de otro país o presencial no se rescatan con el stack. */
function rejectByLocation(ctx: Context): Verdict | null {
  if (ctx.location === JobLocation.OtherCountry) return reject(ctx, 'remoto restringido a otro país');
  if (ctx.location === JobLocation.Onsite) return reject(ctx, 'presencial o híbrido fuera de Venezuela');
  return null;
}

/** Los vetos por tecnología e idioma se juzgan sobre el anuncio sin la firma de quien lo publica. */
function rejectByVetoes(ctx: Context, ad: string): Verdict | null {
  const unknownTech = hasSeveralOpenings(ad) ? null : unknownRequiredTech(ad);
  if (unknownTech) return reject(ctx, `exigen ${unknownTech.trim()}, que no sabe`);
  if (englishRequirement(ad) === 'required') return reject(ctx, 'exigen inglés avanzado');
  if (isVenezuelanEmployer(ctx.text)) return reject(ctx, 'la contrata una empresa venezolana');
  return null;
}

/**
 * Núcleo: hace falta al menos una tecnología que defina el oficio. Docker, Git
 * o AWS aparecen en casi cualquier oferta y no pueden abrir la puerta solos.
 */
function judgeCore(ctx: Context, core: readonly string[]): Verdict | null {
  if (!core.length) return null;
  const coreMatch = matchStack(ctx.text, core);
  if (coreMatch.length && isOtherEcosystem(ctx.text, coreMatch)) {
    return reject(ctx, 'es de otro ecosistema (solo coincide en JavaScript, de refilón)');
  }
  if (coreMatch.length) return null;
  if (isOwnRole(ctx.text)) return accept(ctx, true);
  const reason = ctx.stackMatch.length
    ? `solo coincide en lo periférico (${ctx.stackMatch.join(', ')}), nada de su núcleo`
    : 'no menciona nada de su stack';
  return reject(ctx, reason);
}

function judgeStack(ctx: Context): Verdict | null {
  if (ctx.stackMatch.length) return null;
  if (isOwnRole(ctx.text)) return accept(ctx, true);
  return reject(ctx, 'no menciona nada de su stack');
}

/**
 * LA DECISIÓN. Ante la duda, se manda: un falso positivo cuesta diez segundos
 * de lectura y un falso negativo, una oferta que nunca se sabrá que existió.
 * Por eso `Unknown` no descarta, y se manda marcada como "por confirmar".
 */
export function decideShipping(offer: Offer, profile: CandidateProfile): Verdict {
  const ctx = buildContext(offer.text, profile.stack);
  const early = rejectNonOffer(ctx) ?? rejectByLocation(ctx) ?? rejectByVetoes(ctx, adBody(offer.text));
  if (early) return early;
  const core = judgeCore(ctx, profile.core);
  if (core) return core;
  const stack = judgeStack(ctx);
  if (stack) return stack;
  if (ctx.location === JobLocation.Unknown) return accept(ctx, true);
  return accept(ctx, false);
}

/** Texto legible de dónde se puede trabajar, tal y como se muestra en la tarjeta. */
export function locationLabel(location: JobLocation, reason: string | null): string | null {
  switch (location) {
    case JobLocation.Venezuela: return 'Venezuela';
    case JobLocation.Global: return 'remoto global / LATAM';
    case JobLocation.Unknown: return 'no dice desde dónde se puede trabajar';
    case JobLocation.OtherCountry:
    case JobLocation.Onsite: return reason;
  }
}

/**
 * Huella para no mandar dos veces la misma publicación. Se calcula sobre el
 * texto y no sobre la URL: LinkedIn cambia los parámetros de seguimiento entre
 * cargas, y el texto normalizado no cambia.
 */
export function fingerprint(text: string): string {
  const normal = text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 800);
  return createHash('sha1').update(normal).digest('hex').slice(0, 16);
}

/** El texto que se guarda y se muestra: sin mobiliario de LinkedIn y con tope. */
export function storedText(text: string): string {
  return cleanLinkedInNoise(text).slice(0, 4000);
}
