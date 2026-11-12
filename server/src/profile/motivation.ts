import { t } from '../i18n/index.js';
import type { Language } from './types.js';

export function defaultMotivationTemplate(language: Language): string {
  return t(language, 'motivation.default');
}

export const MAX_MOTIVATION_CHARS = 1000;

export const DEFAULT_MAX_AGE_MONTHS = 3;
export const MIN_MAX_AGE_MONTHS = 1;
export const MAX_MAX_AGE_MONTHS = 24;

export const DEFAULT_FOCUS_MONTHS = 6;
export const MIN_FOCUS_MONTHS = 1;
export const MAX_FOCUS_MONTHS = 24;
