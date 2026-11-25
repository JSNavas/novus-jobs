import type { CandidateProfile, CvReading, OnboardingState } from '../../api/client';
import { t, type TranslationKey } from '../../i18n';

export interface StepDefinition {
  label: TranslationKey;
  hint: TranslationKey;
  optional: boolean;
}

export const STEPS: readonly StepDefinition[] = [
  { label: 'wiz.step.cv', hint: 'wiz.step.cv.hint', optional: true },
  { label: 'wiz.step.stack', hint: 'wiz.step.stack.hint', optional: false },
  { label: 'wiz.step.english', hint: 'wiz.step.english.hint', optional: true },
  { label: 'wiz.step.where', hint: 'wiz.step.where.hint', optional: true },
  { label: 'wiz.step.platforms', hint: 'wiz.step.platforms.hint', optional: true },
  { label: 'wiz.step.limits', hint: 'wiz.step.limits.hint', optional: true },
  { label: 'wiz.step.done', hint: 'wiz.step.done.hint', optional: true },
];

/** How many levels exist: a draft with all of them ticked has not chosen yet. */
const ALL_LEVELS = 5;

export interface Draft {
  language: CandidateProfile['language'];
  roles: CandidateProfile['roles'];
  stack: string[];
  core: string[];
  vetoEcosystems: string[];
  english: CandidateProfile['english'];
  experience: CandidateProfile['experience'];
  geo: CandidateProfile['geo'];
  modality: CandidateProfile['modality'];
}

export function draftFrom(state: OnboardingState): Draft {
  return {
    language: state.profile.language,
    roles: [...state.profile.roles],
    stack: [...state.profile.stack],
    core: [...state.profile.core],
    vetoEcosystems: [],
    english: { ...state.profile.english },
    experience: { ...state.profile.experience },
    geo: { ...state.profile.geo },
    modality: { ...state.profile.modality },
  };
}

export function applyReading(draft: Draft, cv: CvReading): Draft {
  return {
    ...draft,
    // The CV's headline says the trade ("QA Automation Engineer"); when it says
    // none, what was chosen stays.
    roles: cv.roles.length ? [...cv.roles] : draft.roles,
    stack: [...new Set([...draft.stack, ...cv.stack])],
    core: [...new Set([...draft.core, ...cv.core])],
    vetoEcosystems: draft.vetoEcosystems.length
      ? draft.vetoEcosystems
      : cv.suggestedVetoes.map((v) => v.ecosystem),
    english: cv.english ? { level: cv.english, filter: draft.english.filter } : draft.english,
    // The CV knew the years all along; until now nobody kept them. Its level
    // proposal only replaces the default (every level), never a choice made.
    experience: {
      years: draft.experience.years ?? cv.years,
      levels: cv.levels.length && draft.experience.levels.length === ALL_LEVELS
        ? [...cv.levels]
        : draft.experience.levels,
    },
    geo: {
      ...draft.geo,
      country: draft.geo.country || cv.country || '',
      city: draft.geo.city ?? cv.city,
    },
  };
}

export function blockingError(step: number, draft: Draft): string | null {
  if (step === 2 && !draft.experience.levels.length) return t('wiz.needLevel');
  if (step !== 1) return null;
  if (!draft.roles.length) return t('wiz.needRole');
  if (!draft.core.length) {
    return t('wiz.needCore');
  }
  return null;
}
