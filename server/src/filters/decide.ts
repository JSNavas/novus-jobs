import { createHash } from 'node:crypto';
import { JobLocation, JobSeniority } from '../types.js';
import { adBody, cleanLinkedInNoise, extractApplyUrl, extractEmail, isAggregatorPost, isCandidateSelfPromotion, isJuniorOrInternship, looksLikeOffer, matchStack } from './offer.js';
import { classifyLocation, isLocalEmployer, type HomeGeo } from './location.js';
import { findCountry } from './countries.js';
import { englishDemand, hasSeveralOpenings, isOtherEcosystem, isOwnRole, unknownRequiredTech } from './requirements.js';
import { englishRank, type CandidateProfile, type Language } from '../profile/types.js';
import { t } from '../i18n/index.js';

export interface Offer {
  text: string;
  url: string | null;
  author?: string | null;
}

/**
 * Qué familia de reglas descartó. Existe para que el juez IA pueda REVOCAR un
 * descarte, pero solo de lo que se le pregunta: la instrucción le pide decidir
 * si es una vacante, la ubicación, el idioma y la tecnología — nunca si el
 * anuncio cubre el stack del candidato. Un descarte `stack` es, por tanto,
 * definitivo: dejar que lo revoque sería dejar entrar «Encargado de atención a
 * pacientes» porque el modelo confirma que sí, es una vacante remota de verdad.
 */
export type RejectedBy = 'not-offer' | 'location' | 'veto' | 'stack' | 'stale';

/**
 * POR QUÉ EL MOTIVO ES UN CÓDIGO Y NO UNA FRASE.
 *
 * La frase se guarda igual —la leen los correos y las ofertas de antes—, pero
 * lo que viaja a la pantalla es el código con sus datos, y el dashboard lo
 * escribe en el idioma de quien mira. Mientras fue una frase, la interfaz la
 * clasificaba con expresiones regulares sobre el texto español, y bastó
 * cambiar "presencial o híbrido" por algo más claro para que esas etiquetas
 * dejaran de reconocerla sin que fallara ningún test.
 *
 * `RejectedBy` dice QUÉ FAMILIA de reglas descartó —de eso depende si el juez
 * puede revocarlo—; esto dice exactamente cuál, y con qué datos.
 */
export type RejectionCode =
  | 'reject.notAVacancy' | 'reject.notAnOffer'
  | 'reject.otherCountry' | 'reject.onsite' | 'reject.hybrid'
  | 'reject.homeCountryOnly' | 'reject.globalRemote'
  | 'reject.unknownTech' | 'reject.english' | 'reject.localEmployer'
  | 'reject.otherEcosystem' | 'reject.peripheral' | 'reject.noStack'
  | 'reject.stale' | 'reject.ai';

export interface Rejection {
  readonly code: RejectionCode;
  readonly params: Readonly<Record<string, string | number>>;
}

export interface Verdict {
  accepted: boolean;
  /** El motivo ya escrito, en el idioma del usuario. Lo guardan la BD y los correos. */
  reason: string | null;
  /** El mismo motivo, sin idioma: lo que la pantalla vuelve a escribir. */
  rejection: Rejection | null;
  /** `null` si está aceptada. Dice quién la descartó, no por qué. */
  rejectedBy: RejectedBy | null;
  uncertain: boolean;
  seniority: JobSeniority;
  aggregator: boolean;
  location: JobLocation;
  stackMatch: string[];
  applyUrl: string | null;
  contactEmail: string | null;
}

export type { CandidateProfile } from '../profile/types.js';

interface Context {
  text: string;
  /** En qué idioma se le escribe el motivo a quien lo va a leer. */
  language: Language;
  stackMatch: string[];
  location: JobLocation;
  seniority: JobSeniority;
  aggregator: boolean;
  applyUrl: string | null;
  contactEmail: string | null;
}

function buildContext(text: string, profile: CandidateProfile): Context {
  return {
    text,
    language: profile.language,
    stackMatch: matchStack(text, profile.stack),
    location: classifyLocation(text, homeOf(profile)),
    seniority: isJuniorOrInternship(text) ? JobSeniority.Junior : JobSeniority.Regular,
    aggregator: isAggregatorPost(text),
    applyUrl: extractApplyUrl(text),
    contactEmail: extractEmail(text),
  };
}

function reject(ctx: Context, rejection: Rejection, by: RejectedBy): Verdict {
  return {
    accepted: false,
    reason: t(ctx.language, rejection.code, rejection.params),
    rejection,
    rejectedBy: by,
    uncertain: false,
    ...publicFields(ctx),
  };
}

function accept(ctx: Context, uncertain: boolean): Verdict {
  return { accepted: true, reason: null, rejection: null, rejectedBy: null, uncertain, ...publicFields(ctx) };
}

function publicFields(ctx: Context): Omit<Verdict, 'accepted' | 'reason' | 'rejection' | 'rejectedBy' | 'uncertain'> {
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
  if (isCandidateSelfPromotion(ctx.text)) return reject(ctx, { code: 'reject.notAVacancy', params: {} }, 'not-offer');
  if (!looksLikeOffer(ctx.text)) return reject(ctx, { code: 'reject.notAnOffer', params: {} }, 'not-offer');
  return null;
}

/** De dónde vive, tal como lo necesita el clasificador de ubicación. */
function homeOf(profile: CandidateProfile): HomeGeo {
  return { country: findCountry(profile.geo.country), city: profile.geo.city };
}

/**
 * Descalificadores absolutos: una modalidad que no acepta no se rescata con el
 * stack. Cuál no acepta lo dice su perfil — antes era fijo: remoto de otro país
 * y cualquier presencial fuera de Venezuela.
 */
function rejectByLocation(ctx: Context, profile: CandidateProfile): Verdict | null {
  const { modality } = profile;
  if (ctx.location === JobLocation.OtherCountry) return reject(ctx, { code: 'reject.otherCountry', params: {} }, 'location');
  if (ctx.location === JobLocation.Onsite && !modality.onsite) return reject(ctx, { code: 'reject.onsite', params: {} }, 'location');
  if (ctx.location === JobLocation.Hybrid && !modality.hybrid) return reject(ctx, { code: 'reject.hybrid', params: {} }, 'location');
  if (ctx.location === JobLocation.HomeCountry && !modality.remoteHomeCountry) return reject(ctx, { code: 'reject.homeCountryOnly', params: {} }, 'location');
  if (ctx.location === JobLocation.Global && !modality.remoteGlobal) return reject(ctx, { code: 'reject.globalRemote', params: {} }, 'location');
  return null;
}

/** Los vetos por tecnología e idioma se juzgan sobre el anuncio sin la firma de quien lo publica. */
function rejectByVetoes(ctx: Context, ad: string, profile: CandidateProfile): Verdict | null {
  const unknownTech = hasSeveralOpenings(ad) ? null : unknownRequiredTech(ad, profile.cannotDo);
  if (unknownTech) return reject(ctx, { code: 'reject.unknownTech', params: { tech: unknownTech.trim() } }, 'veto');
  const english = rejectByEnglish(ctx, ad, profile);
  if (english) return english;
  if (profile.geo.excludeLocalEmployers && isLocalEmployer(ctx.text, homeOf(profile))) {
    return reject(ctx, { code: 'reject.localEmployer', params: {} }, 'veto');
  }
  return null;
}

/**
 * El idioma descarta solo si pide MÁS de lo que tiene, y solo si él pidió
 * filtrar por idioma. Apagado el filtro, un C1 exigido no esconde la oferta:
 * hay quien quiere verlas igual, para medir cuánto le cierra el inglés.
 */
function rejectByEnglish(ctx: Context, ad: string, profile: CandidateProfile): Verdict | null {
  if (!profile.english.filter) return null;
  const demand = englishDemand(ad);
  if (!demand.mandatory) return null;
  if (englishRank(demand.level) <= englishRank(profile.english.level)) return null;
  return reject(ctx, {
    code: 'reject.english',
    params: { demanded: demand.level.toUpperCase(), yours: profile.english.level.toUpperCase() },
  }, 'veto');
}

/**
 * Núcleo: hace falta al menos una tecnología que defina el oficio. Docker, Git
 * o AWS aparecen en casi cualquier oferta y no pueden abrir la puerta solos.
 */
function judgeCore(ctx: Context, core: readonly string[]): Verdict | null {
  if (!core.length) return null;
  const coreMatch = matchStack(ctx.text, core);
  if (coreMatch.length && isOtherEcosystem(ctx.text, coreMatch)) {
    return reject(ctx, { code: 'reject.otherEcosystem', params: {} }, 'stack');
  }
  if (coreMatch.length) return null;
  if (isOwnRole(ctx.text)) return accept(ctx, true);
  const rejection: Rejection = ctx.stackMatch.length
    ? { code: 'reject.peripheral', params: { matches: ctx.stackMatch.join(', ') } }
    : { code: 'reject.noStack', params: {} };
  return reject(ctx, rejection, 'stack');
}

function judgeStack(ctx: Context): Verdict | null {
  if (ctx.stackMatch.length) return null;
  if (isOwnRole(ctx.text)) return accept(ctx, true);
  return reject(ctx, { code: 'reject.noStack', params: {} }, 'stack');
}

/**
 * LA DECISIÓN. Ante la duda, se manda: un falso positivo cuesta diez segundos
 * de lectura y un falso negativo, una oferta que nunca se sabrá que existió.
 * Por eso `Unknown` no descarta, y se manda marcada como "por confirmar".
 */
export function decideShipping(offer: Offer, profile: CandidateProfile): Verdict {
  const ctx = buildContext(offer.text, profile);
  const early = rejectNonOffer(ctx) ?? rejectByLocation(ctx, profile) ?? rejectByVetoes(ctx, adBody(offer.text), profile);
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
    case JobLocation.HomeCountry: return 'desde su país';
    case JobLocation.Global: return 'remoto global / su región';
    case JobLocation.Unknown: return 'no dice desde dónde se puede trabajar';
    case JobLocation.OtherCountry:
    case JobLocation.Hybrid:
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
