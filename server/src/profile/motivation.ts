import { t } from '../i18n/index.js';
import type { Language } from './types.js';

/**
 * ═══ EL «¿POR QUÉ TE INTERESA TRABAJAR AQUÍ?» ═══
 *
 * Varias plataformas lo piden en cada postulación (Get on Board, entre 50 y
 * 1000 caracteres). Esto es lo que hay el PRIMER DÍA: el usuario lo cambia
 * desde Configuración y lo suyo manda.
 *
 * Es deliberadamente sobrio y sin datos inventados —ni años de experiencia, ni
 * un puesto concreto— porque un párrafo por defecto que afirme cosas de alguien
 * que no las ha dicho es peor que uno aburrido: se manda sin leer y miente.
 *
 * ═══ LOS HUECOS ═══
 *
 * `{puesto}`, `{empresa}` y `{tecnologias}` se rellenan con los datos de cada
 * oferta. Son la diferencia entre un párrafo genérico —que se reconoce a la
 * legua— y uno que demuestra que leyó el anuncio.
 *
 * La frase de `{tecnologias}` DESAPARECE ENTERA cuando no hay coincidencias que
 * nombrar, en vez de quedarse coja. Por eso conviene que viva en su propia
 * frase y no incrustada en otra.
 *
 * Los nombres de los huecos NO se traducen: una plantilla escrita en español
 * tiene que seguir funcionando si mañana se cambia el idioma de la interfaz.
 */
export function defaultMotivationTemplate(language: Language): string {
  return t(language, 'motivation.default');
}

/**
 * El tope de Get on Board. Se valida al guardar: una plantilla más larga que
 * el formulario no se detecta hasta que él pega el texto y el sitio se lo
 * rechaza, que es el peor momento posible.
 */
export const MAX_MOTIVATION_CHARS = 1000;

/**
 * El tope de antigüedad de una vacante para ENTRAR, en meses.
 *
 * Tres de fábrica, que es lo que él pidió al verlo: de 27 ofertas aceptadas,
 * 14 llevaban más de dos meses publicadas y la primera era de hace un año con
 * 969 postulaciones. Se cambia en Configuración.
 *
 * Los topes del tope: menos de uno dejaría entrar casi nada, y más de dos
 * años es no tener tope. Se validan al guardar porque un número absurdo aquí
 * no se nota hasta la siguiente búsqueda, cuando ya no entró nada.
 */
export const DEFAULT_MAX_AGE_MONTHS = 3;
export const MIN_MAX_AGE_MONTHS = 1;
export const MAX_MAX_AGE_MONTHS = 24;

/** La ventana del Enfoque: medio año de fábrica, entre uno y dos años. */
export const DEFAULT_FOCUS_MONTHS = 6;
export const MIN_FOCUS_MONTHS = 1;
export const MAX_FOCUS_MONTHS = 24;
