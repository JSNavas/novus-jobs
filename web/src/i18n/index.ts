import { en } from './en';
import { es } from './es';

export type Language = 'es' | 'en';

export type TranslationKey = keyof typeof es;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { es, en };

let current: Language = browserLanguage();

export function browserLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function language(): Language {
  return current;
}

export function setLanguage(next: Language | null | undefined): void {
  if (next && next !== current) current = next;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const text = DICTIONARIES[current][key] ?? es[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

export function plural(count: number, one: TranslationKey, many: TranslationKey): string {
  return t(count === 1 ? one : many, { count });
}
