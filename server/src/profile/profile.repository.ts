import type { SettingsRepository } from '../db/settings.repository.js';
import { DEFAULT_PROFILE } from './defaults.js';
import { ENGLISH_LEVELS, LANGUAGES, type CandidateProfile, type EnglishLevel, type Language } from './types.js';

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
    stack: strings(stored.stack) ?? DEFAULT_PROFILE.stack,
    core: strings(stored.core) ?? DEFAULT_PROFILE.core,
    cannotDo: strings(stored.cannotDo) ?? DEFAULT_PROFILE.cannotDo,
    english: {
      level: level(record(stored.english)?.level) ?? DEFAULT_PROFILE.english.level,
      filter: bool(record(stored.english)?.filter) ?? DEFAULT_PROFILE.english.filter,
    },
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
