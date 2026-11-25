import { createHash } from 'node:crypto';
import { JobLocation } from '../types.js';
import { adBody, cleanLinkedInNoise, extractApplyUrl, extractEmail, isAggregatorPost, isCandidateSelfPromotion, looksLikeOffer, matchStack } from './offer.js';
import { classifyLocation, isLocalEmployer, type HomeGeo } from './location.js';
import { findCountry } from './countries.js';
import {
  adLevel, demandedYears, englishDemand, hasSeveralOpenings, isOtherEcosystem, isOwnRole, unknownRequiredTech,
} from './requirements.js';
import { englishRank, type CandidateProfile, type Language, type ModalityPreference } from '../profile/types.js';
import { levelsForDemandedYears, wantsEveryLevel } from '../profile/seniority.js';
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
  | 'reject.seniority' | 'reject.seniorityLevel'
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

export function locationRejectionCode(
  location: JobLocation,
  modality: ModalityPreference,
): RejectionCode | null {
  if (location === JobLocation.OtherCountry) return 'reject.otherCountry';
  if (location === JobLocation.Onsite && !modality.onsite) return 'reject.onsite';
  if (location === JobLocation.Hybrid && !modality.hybrid) return 'reject.hybrid';
  if (location === JobLocation.HomeCountry && !modality.remoteHomeCountry) return 'reject.homeCountryOnly';
  if (location === JobLocation.Global && !modality.remoteGlobal) return 'reject.globalRemote';
  return null;
}

function rejectByLocation(ctx: Context, profile: CandidateProfile): Verdict | null {
  const code = locationRejectionCode(ctx.location, profile.modality);
  return code ? reject(ctx, { code, params: {} }, 'location') : null;
}

function rejectByVetoes(ctx: Context, ad: string, profile: CandidateProfile): Verdict | null {
  const unknownTech = hasSeveralOpenings(ad) ? null : unknownRequiredTech(ad, profile.cannotDo, profile.core);
  if (unknownTech) return reject(ctx, { code: 'reject.unknownTech', params: { tech: unknownTech.trim() } }, 'veto');
  const english = rejectByEnglish(ctx, ad, profile);
  if (english) return english;
  const seniority = rejectBySeniority(ctx, ad, profile);
  if (seniority) return seniority;
  if (profile.geo.excludeLocalEmployers && isLocalEmployer(ctx.text, homeOf(profile))) {
    return reject(ctx, { code: 'reject.localEmployer', params: {} }, 'veto');
  }
  return null;
}

function rejectBySeniority(ctx: Context, ad: string, profile: CandidateProfile): Verdict | null {
  const { levels } = profile.experience;
  if (wantsEveryLevel(levels)) return null;
  if (hasSeveralOpenings(ad)) return null;
  const stated = adLevel(ctx.text);
  if (stated) {
    if (stated.levels.some((level) => levels.includes(level))) return null;
    return reject(ctx, { code: 'reject.seniorityLevel', params: { level: stated.label } }, 'veto');
  }
  const demanded = demandedYears(ad);
  if (demanded === null) return null;
  if (levelsForDemandedYears(demanded).some((level) => levels.includes(level))) return null;
  return reject(ctx, { code: 'reject.seniority', params: { demanded } }, 'veto');
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

function judgeCore(ctx: Context, profile: CandidateProfile): Verdict | null {
  if (!profile.core.length) return null;
  const coreMatch = matchStack(ctx.text, profile.core);
  if (coreMatch.length && isOtherEcosystem(ctx.text, coreMatch, profile.cannotDo)) {
    return reject(ctx, { code: 'reject.otherEcosystem', params: {} }, 'stack');
  }
  if (coreMatch.length) return null;
  if (isOwnRole(ctx.text, profile.roles, profile.cannotDo)) return accept(ctx, true);
  const rejection: Rejection = ctx.stackMatch.length
    ? { code: 'reject.peripheral', params: { matches: ctx.stackMatch.join(', ') } }
    : { code: 'reject.noStack', params: {} };
  return reject(ctx, rejection, 'stack');
}

function judgeStack(ctx: Context, profile: CandidateProfile): Verdict | null {
  if (ctx.stackMatch.length) return null;
  if (isOwnRole(ctx.text, profile.roles, profile.cannotDo)) return accept(ctx, true);
  return reject(ctx, { code: 'reject.noStack', params: {} }, 'stack');
}

export function decideShipping(offer: Offer, profile: CandidateProfile): Verdict {
  const ctx = buildContext(offer.text, profile);
  const early = rejectNonOffer(ctx) ?? rejectByLocation(ctx, profile) ?? rejectByVetoes(ctx, adBody(offer.text), profile);
  if (early) return early;
  const core = judgeCore(ctx, profile);
  if (core) return core;
  const stack = judgeStack(ctx, profile);
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
