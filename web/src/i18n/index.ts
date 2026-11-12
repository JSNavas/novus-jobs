import { en } from './en';
import { es } from './es';

/**
 * TRADUCCIÓN, SIN LIBRERÍA.
 *
 * Un diccionario plano por idioma y una función. No hay `i18next` ni nada
 * parecido porque lo que hace falta aquí cabe en treinta líneas: dos idiomas,
 * sin plurales de lenguas eslavas, sin carga diferida y sin namespaces. Meter
 * 40 KB de dependencia para esto sería pagar por problemas que no se tienen.
 *
 * Las CLAVES son el contrato: `es` las define y `en` se declara con su mismo
 * tipo, así que olvidar una traducción no compila. Es la única garantía que
 * importa — una cadena sin traducir no se ve hasta que alguien abre esa
 * pantalla en el otro idioma, y entonces ya está publicado.
 *
 * El idioma se fija UNA vez, al arrancar, con el del perfil. Cambiarlo desde
 * los ajustes recarga la página: es un cambio de dos veces en la vida de una
 * instalación, y una recarga es más honesta que repintar media aplicación
 * desde un estado global que solo existiría para esto.
 */
export type Language = 'es' | 'en';

export type TranslationKey = keyof typeof es;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { es, en };

let current: Language = browserLanguage();

/** El idioma del navegador, si es uno de los que hay. Es el que propone el alta. */
export function browserLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function language(): Language {
  return current;
}

export function setLanguage(next: Language | null | undefined): void {
  if (next && next !== current) current = next;
}

/**
 * El texto de una clave, con sus huecos rellenos.
 *
 * Los huecos van como `{nombre}` y no como posiciones: el orden de las partes
 * de una frase cambia de un idioma a otro, y un `%s` obliga a que no cambie.
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const text = DICTIONARIES[current][key] ?? es[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

/** Para contar cosas: "1 oferta" / "3 ofertas", que es todo el plural que hace falta. */
export function plural(count: number, one: TranslationKey, many: TranslationKey): string {
  return t(count === 1 ? one : many, { count });
}
