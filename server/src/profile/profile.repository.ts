import type { SettingsRepository } from '../db/settings.repository.js';
import { DEFAULT_PROFILE } from './defaults.js';
import { isRole, type Role } from './roles.js';
import { levelsForYears } from './seniority.js';
import {
  ENGLISH_LEVELS, LANGUAGES, MAX_EXPERIENCE_YEARS, SENIORITY_LEVELS,
  type CandidateProfile, type EnglishLevel, type Language, type SeniorityLevel,
} from './types.js';

export const PROFILE_KEY = 'candidateProfile';

export const ONBOARDING_DONE_KEY = 'onboardingCompletedAt';

export class ProfileRepository {
  constructor(private readonly settings: SettingsRepository) {}

  get(): CandidateProfile {
    return parseProfile(this.settings.get(PROFILE_KEY));
  }

  save(profile: CandidateProfile): void {
    this.settings.set(PROFILE_KEY, JSON.stringify(profile));
  }

  patch(changes: Partial<CandidateProfile>): CandidateProfile {
    const next: CandidateProfile = { ...this.get(), ...changes };
    this.save(next);
    return next;
  }

  isOnboarded(): boolean {
    return this.settings.get(ONBOARDING_DONE_KEY) !== null;
  }

  completeOnboarding(now = new Date()): void {
    this.settings.set(ONBOARDING_DONE_KEY, now.toISOString());
  }
}

function parseProfile(raw: string | null): CandidateProfile {
  if (!raw) return DEFAULT_PROFILE;
  const stored = safeParse(raw);
  if (!stored) return DEFAULT_PROFILE;
  return {
    language: LANGUAGES.find((l) => l === stored.language) ?? DEFAULT_PROFILE.language,
    roles: roles(stored.roles) ?? DEFAULT_PROFILE.roles,
    stack: strings(stored.stack) ?? DEFAULT_PROFILE.stack,
    core: strings(stored.core) ?? DEFAULT_PROFILE.core,
    cannotDo: strings(stored.cannotDo) ?? DEFAULT_PROFILE.cannotDo,
    english: {
      level: level(record(stored.english)?.level) ?? DEFAULT_PROFILE.english.level,
      filter: bool(record(stored.english)?.filter) ?? DEFAULT_PROFILE.english.filter,
    },
    experience: experienceOf(record(stored.experience)),
    geo: {
      country: text(record(stored.geo)?.country) ?? DEFAULT_PROFILE.geo.country,
      city: text(record(stored.geo)?.city),
      timezone: timezone(record(stored.geo)?.timezone) ?? DEFAULT_PROFILE.geo.timezone,
      excludeLocalEmployers:
        bool(record(stored.geo)?.excludeLocalEmployers) ?? DEFAULT_PROFILE.geo.excludeLocalEmployers,
    },
    modality: {
      remoteGlobal: bool(record(stored.modality)?.remoteGlobal) ?? DEFAULT_PROFILE.modality.remoteGlobal,
      remoteHomeCountry:
        bool(record(stored.modality)?.remoteHomeCountry) ?? DEFAULT_PROFILE.modality.remoteHomeCountry,
      hybrid: bool(record(stored.modality)?.hybrid) ?? DEFAULT_PROFILE.modality.hybrid,
      onsite: bool(record(stored.modality)?.onsite) ?? DEFAULT_PROFILE.modality.onsite,
    },
  };
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return record(value);
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const clean = value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  return [...new Set(clean)];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function timezone(value: unknown): string | null {
  const name = text(value);
  if (!name) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return name;
  } catch {
    console.warn(`[perfil] zona horaria desconocida "${name}": se usa la de la máquina`);
    return null;
  }
}

function level(value: unknown): EnglishLevel | null {
  return ENGLISH_LEVELS.find((l) => l === value) ?? null;
}

/** The known trades in the list, or null when none is left: a profile always has one. */
export function roles(value: unknown): Role[] | null {
  if (!Array.isArray(value)) return null;
  const known = [...new Set(value.filter(isRole))];
  return known.length ? known : null;
}

/**
 * The ticked levels, or null when none is left: ticking nothing would discard
 * every posting that states a level.
 */
export function seniorityLevels(value: unknown): SeniorityLevel[] | null {
  if (!Array.isArray(value)) return null;
  const known = SENIORITY_LEVELS.filter((level) => value.includes(level));
  return known.length ? known : null;
}

function experienceOf(stored: Record<string, unknown> | null): CandidateProfile['experience'] {
  const years = experienceYears(stored?.years);
  const levels = seniorityLevels(stored?.levels);
  if (levels) return { years, levels };
  // Saved for a few hours as { years, filter } before levels were ticks: the
  // filter on meant "not far above my years", which is what the proposal says.
  const filter = bool(stored?.filter);
  return { years, levels: filter === true ? levelsForYears(years) : [...DEFAULT_PROFILE.experience.levels] };
}

/** Whole years, 0 to MAX_EXPERIENCE_YEARS. Anything else is "not said". */
export function experienceYears(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const years = Math.floor(value);
  return years <= MAX_EXPERIENCE_YEARS ? years : null;
}
