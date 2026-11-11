/**
 * El perfil del candidato: lo que decide qué oferta le sirve y qué no.
 *
 * Vivía como una constante en `profile.ts`, editable solo en código, porque el
 * proyecto tenía un único usuario. Ahora vive en la base de datos y lo rellena
 * cada quien en el alta: las reglas son las mismas, los valores son suyos.
 *
 * Las tres listas de tecnología siguen haciendo cosas distintas:
 *
 * - `stack`: todo lo que sabe. Enriquece el "Coincide con", NO abre la puerta.
 * - `core`: al menos una tiene que aparecer para que la oferta encaje. Sin este
 *   corte, una vacante de Java que mencione Docker llegaría igual.
 * - `cannotDo`: si una oferta EXIGE alguna de estas, no sirve. De aquí sale el
 *   veto por tecnología.
 *
 * ⚠️ `cannotDo` es lo que más se equivoca en los dos sentidos: meter algo que SÍ
 * sabe tira ofertas buenas sin que nadie se entere. Por eso el alta la propone
 * desde el CV y la deja editar, en vez de darla por cerrada.
 */

/**
 * Nivel de inglés en la escala del Marco Común Europeo, que es la que usan los
 * propios anuncios ("inglés B2", "C1 excluyente"). `none` es no tener ninguno y
 * `native` el techo: con él no hay exigencia de idioma que descarte.
 */
export const ENGLISH_LEVELS = ['none', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const;

export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

/** El orden de la escala, para poder comparar lo que piden con lo que se tiene. */
export function englishRank(level: EnglishLevel): number {
  return ENGLISH_LEVELS.indexOf(level);
}

export interface EnglishPreference {
  /** El que tiene. */
  level: EnglishLevel;
  /**
   * Si descartar lo que exige más de su nivel.
   *
   * Separado del nivel a propósito: hay quien quiere ver esas ofertas igual
   * —para medir cuánto le cierra el idioma, o porque va a estudiarlo— y quien
   * prefiere no verlas. Apagado, el idioma solo informa; no veta.
   */
  filter: boolean;
}

/**
 * Las modalidades que acepta. Cada una se apaga por separado porque son
 * decisiones distintas: quien no se puede mudar apaga `onsite` e `hybrid` y
 * deja el remoto; quien busca oficina hace lo contrario.
 */
export interface ModalityPreference {
  /** Remoto sin restricción de residencia, o restringido a una región que le incluye. */
  remoteGlobal: boolean;
  /** Remoto, pero solo para residentes de su propio país. */
  remoteHomeCountry: boolean;
  hybrid: boolean;
  onsite: boolean;
}

export interface GeoPreference {
  /**
   * Dónde vive, en el código ISO de dos letras. Es lo que convierte "remoto
   * para Colombia" en una oferta que sirve o en una que no: la misma frase es
   * una puerta abierta para quien vive allí y una pared para el resto.
   */
  country: string;
  /** Su ciudad, si la dio: hace que un presencial o un híbrido local sí encajen. */
  city: string | null;
  /**
   * Si descartar a los empleadores de su propio país.
   *
   * Suena raro hasta que se mira el caso que lo motivó: quien busca sueldo en
   * divisas no quiere las vacantes locales que pagan en moneda local. Apagado
   * por defecto, porque es una preferencia y no una regla.
   */
  excludeLocalEmployers: boolean;
}

export interface CandidateProfile {
  readonly stack: readonly string[];
  readonly core: readonly string[];
  readonly cannotDo: readonly string[];
  readonly english: EnglishPreference;
  readonly geo: GeoPreference;
  readonly modality: ModalityPreference;
}
