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

export const SENIORITY_LEVELS = ['trainee', 'junior', 'semi', 'senior', 'lead'] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

export interface ExperiencePreference {
  years: number | null;
  levels: readonly SeniorityLevel[];
}

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
  readonly roles: readonly Role[];
  readonly stack: readonly string[];
  readonly core: readonly string[];
  readonly cannotDo: readonly string[];
  readonly english: EnglishPreference;
  readonly experience: ExperiencePreference;
  readonly geo: GeoPreference;
  readonly modality: ModalityPreference;
}
