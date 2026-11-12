import type { Language } from '../profile/types.js';
import { en } from './en.js';
import { es } from './es.js';

export type ServerKey = keyof typeof es;

const DICTIONARIES: Record<Language, Record<ServerKey, string>> = { es, en };

export function t(
  language: Language,
  key: ServerKey,
  params?: Record<string, string | number>,
): string {
  const text = DICTIONARIES[language][key] ?? es[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}
