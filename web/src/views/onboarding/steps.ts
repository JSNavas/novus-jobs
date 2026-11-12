import type { CandidateProfile, CvReading, OnboardingState } from '../../api/client';
import { t, type TranslationKey } from '../../i18n';

/**
 * LOS PASOS DEL ALTA, en un sitio y no repartidos por el componente.
 *
 * El orden no es decorativo: el CV va primero porque es lo que rellena los
 * demás, y lo obligatorio va antes de lo que tiene valor por defecto. Quien
 * abandone en el paso 4 ya tiene un perfil que busca; quien abandone en el 2,
 * no, y por eso el 2 es el único que no se puede saltar.
 */
export interface StepDefinition {
  /** Lo que se lee en el indicador de pasos. Corto: es una línea apretada. */
  label: TranslationKey;
  /** La frase bajo el título. Dice qué decide este paso. */
  hint: TranslationKey;
  /** Si se puede pasar al siguiente sin tocar nada. */
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

/** El estado del formulario mientras se rellena. Se guarda paso a paso. */
export interface Draft {
  language: CandidateProfile['language'];
  stack: string[];
  core: string[];
  /** Los ecosistemas marcados para vetar. El servidor los traduce a tecnologías. */
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

/**
 * Lo que trajo el CV entra en el borrador SIN pisar lo que el usuario ya haya
 * tocado a mano: si volvió al paso 1 a subir otro CV, lo que escribió en el
 * paso 2 sigue ahí y el CV solo añade.
 */
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

/** El paso 2 es el único que bloquea: sin núcleo, la búsqueda descarta todo. */
export function blockingError(step: number, draft: Draft): string | null {
  if (step !== 1) return null;
  if (!draft.core.length) {
    return t('wiz.needCore');
  }
  return null;
}
