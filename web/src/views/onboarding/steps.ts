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

export interface Draft {
  language: CandidateProfile['language'];
  stack: string[];
  core: string[];
  vetoEcosystems: string[];
  english: CandidateProfile['english'];
  geo: CandidateProfile['geo'];
  modality: CandidateProfile['modality'];
}

export function draftFrom(state: OnboardingState): Draft {
  return {
    language: state.profile.language,
    stack: [...state.profile.stack],
    core: [...state.profile.core],
    vetoEcosystems: [],
    english: { ...state.profile.english },
    geo: { ...state.profile.geo },
    modality: { ...state.profile.modality },
  };
}

export function applyReading(draft: Draft, cv: CvReading): Draft {
  return {
    ...draft,
    stack: [...new Set([...draft.stack, ...cv.stack])],
    core: [...new Set([...draft.core, ...cv.core])],
    vetoEcosystems: draft.vetoEcosystems.length
      ? draft.vetoEcosystems
      : cv.suggestedVetoes.map((v) => v.ecosystem),
    english: cv.english ? { level: cv.english, filter: draft.english.filter } : draft.english,
    geo: {
      ...draft.geo,
      country: draft.geo.country || cv.country || '',
      city: draft.geo.city ?? cv.city,
    },
  };
}

export function blockingError(step: number, draft: Draft): string | null {
  if (step !== 1) return null;
  if (!draft.core.length) {
    return t('wiz.needCore');
  }
  return null;
}
