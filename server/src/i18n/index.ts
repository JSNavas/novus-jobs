import type { Language } from '../profile/types.js';
import { en } from './en.js';
import { es } from './es.js';

/**
 * EL TEXTO QUE ESCRIBE EL SERVIDOR, en el idioma del usuario.
 *
 * Son tres cosas y las tres las lee una persona: el motivo por el que se
 * descartó una oferta, los correos de aviso, y la instrucción que se le da al
 * juez —que contesta en el idioma en que se le habla—.
 *
 * Mismo planteamiento que en el frontend: diccionario plano, `es` define las
 * claves y `en` se declara con su tipo, así que una traducción que falte no
 * compila. Lo que NO es igual es que aquí el idioma viaja como argumento en vez
 * de vivir en una variable del módulo: el servidor atiende peticiones, y un
 * idioma global sería un estado compartido entre ellas.
 */
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
