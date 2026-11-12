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

export type RejectedBy = 'not-offer' | 'location' | 'veto' | 'stack' | 'stale';

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
  reason: string | null;
  rejection: Rejection | null;
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

function rejectNonOffer(ctx: Context): Verdict | null {
  if (isCandidateSelfPromotion(ctx.text)) return reject(ctx, { code: 'reject.notAVacancy', params: {} }, 'not-offer');
  if (!looksLikeOffer(ctx.text)) return reject(ctx, { code: 'reject.notAnOffer', params: {} }, 'not-offer');
  return null;
}

function homeOf(profile: CandidateProfile): HomeGeo {
  return { country: findCountry(profile.geo.country), city: profile.geo.city };
}

function rejectByLocation(ctx: Context, profile: CandidateProfile): Verdict | null {
  const { modality } = profile;
  if (ctx.location === JobLocation.OtherCountry) return reject(ctx, { code: 'reject.otherCountry', params: {} }, 'location');
  if (ctx.location === JobLocation.Onsite && !modality.onsite) return reject(ctx, { code: 'reject.onsite', params: {} }, 'location');
  if (ctx.location === JobLocation.Hybrid && !modality.hybrid) return reject(ctx, { code: 'reject.hybrid', params: {} }, 'location');
  if (ctx.location === JobLocation.HomeCountry && !modality.remoteHomeCountry) return reject(ctx, { code: 'reject.homeCountryOnly', params: {} }, 'location');
  if (ctx.location === JobLocation.Global && !modality.remoteGlobal) return reject(ctx, { code: 'reject.globalRemote', params: {} }, 'location');
  return null;
}

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

export function fingerprint(text: string): string {
  const normal = text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 800);
  return createHash('sha1').update(normal).digest('hex').slice(0, 16);
}

export function storedText(text: string): string {
  return cleanLinkedInNoise(text).slice(0, 4000);
}
