import type { Role } from './roles.js';

export const ENGLISH_LEVELS = ['none', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const;

export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export function englishRank(level: EnglishLevel): number {
  return ENGLISH_LEVELS.indexOf(level);
}

export interface EnglishPreference {
  level: EnglishLevel;
  filter: boolean;
}

/** From less to more experience. Lead covers staff, principal, architect and expert roles. */
export const SENIORITY_LEVELS = ['trainee', 'junior', 'semi', 'senior', 'lead'] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

/**
 * `levels` are the levels whose postings the person wants: a senior who ticks
 * Semi Senior and Senior stops getting Junior ones; ticking all of them filters
 * nothing. `years` is what the CV said, used to propose the levels and to tell
 * the judge; null when not said.
 */
export interface ExperiencePreference {
  years: number | null;
  levels: readonly SeniorityLevel[];
}

/** More than this is a typo or a joke, not a career. */
export const MAX_EXPERIENCE_YEARS = 50;

export interface ModalityPreference {
  remoteGlobal: boolean;
  remoteHomeCountry: boolean;
  hybrid: boolean;
  onsite: boolean;
}

export interface GeoPreference {
  country: string;
  city: string | null;
  timezone: string;
  excludeLocalEmployers: boolean;
}

export const LANGUAGES = ['es', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

export interface CandidateProfile {
  readonly language: Language;
  /** The trades the person looks for work in. Never empty: see `roles.ts`. */
  readonly roles: readonly Role[];
  readonly stack: readonly string[];
  readonly core: readonly string[];
  readonly cannotDo: readonly string[];
  readonly english: EnglishPreference;
  readonly experience: ExperiencePreference;
  readonly geo: GeoPreference;
  readonly modality: ModalityPreference;
}
