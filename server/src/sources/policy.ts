/**
 * ═══ CADA PLATAFORMA TIENE SU RITMO, Y NO SE MEZCLAN ═══
 *
 * Los topes nacieron globales porque solo había LinkedIn, y entonces "el
 * ritmo" y "el ritmo de LinkedIn" eran lo mismo. Con la segunda fuente dejó de
 * serlo: el 2026-11-11 el presupuesto manual, gastado leyendo LinkedIn, impedía
 * consultar una API pública que no tiene cuenta, no tiene sesión y no mira
 * quién la llama. Un tope sin nada que proteger no es prudencia, es una avería.
 *
 * Lo que decide el ritmo no es la plataforma: es QUÉ SE ARRIESGA al leerla.
 *
 *   · Una cuenta vigilada  → el ritmo es la salud de la cuenta.
 *   · Una API abierta      → solo queda la buena educación con su servidor.
 *
 * Por eso esto no se llama `LINKEDIN_POLICY` ni `GETONBRD_POLICY`: una fuente
 * nueva elige la que le corresponde por su naturaleza, no se escribe otra.
 */
export interface SourcePolicy {
  /** Cuándo la lanza el planificador. */
  readonly schedule: SourceSchedule;
  /** Búsquedas a mano al día (día de Venezuela). `null` = sin tope. */
  readonly manualDailyBudget: number | null;
  /** Suelo entre dos búsquedas a mano. */
  readonly manualMinIntervalMs: number;
  /** Hueco mínimo tras CUALQUIER pasada suya, incluida la automática. */
  readonly minGapAfterAnyPassMs: number;
  /** Techo duro de lecturas al día, cuente quien las pida. `null` = sin techo. */
  readonly maxPassesPerDay: number | null;
  /**
   * Suelo cuando la anterior murió con el perfil cogido por otra ventana: no
   * llegó a tocar la plataforma, así que reintentar no cuesta nada.
   */
  readonly retryAfterBusyMs: number;
}

export type SourceSchedule =
  /**
   * En franjas de hora en punto. Sin `hours`, las de `SCHEDULE_HOURS`; con
   * ellas, las que el señor eligió en Integraciones y están guardadas.
   */
  | { readonly kind: 'configured-hours'; readonly hours?: readonly number[] }
  /** Cada N minutos, sin franjas. */
  | { readonly kind: 'every-minutes'; readonly minutes: number };

/**
 * ═══ UNA CUENTA VIGILADA (LinkedIn) ═══
 *
 * Cuatro límites a la vez, y es deliberado que sean cuatro: lo que LinkedIn
 * mide no es cuántas veces pulsas un botón, sino cuántas veces un navegador
 * automatizado carga tu feed, cada cuánto, y si ese patrón parece una persona.
 *
 * La referencia es ARTIO: tres pasadas al día, sin botón, y la cuenta lleva
 * meses sana. Aquí hay botón porque el dashboard lo pide, así que estos
 * límites existen para que tenerlo no cambie lo que LinkedIn ve.
 */
export const WATCHED_ACCOUNT_POLICY: SourcePolicy = {
  schedule: { kind: 'configured-hours' },
  /*
   * UN SOLO TOPE MANUAL: una hora entre búsquedas. Decisión del señor el
   * 2026-11-11, y es suya porque es su cuenta.
   *
   * Antes había tres topes manuales encima de este —presupuesto de 3 al día,
   * 20 minutos tras cualquier lectura y techo de 8— pensados para que el botón
   * no cambiara lo que LinkedIn ve. En la práctica lo que hacían era negarle
   * el botón a media tarde. Con el suelo de una hora, el peor día posible son
   * ~14 lecturas manuales repartidas, que es un ritmo humano: nadie pulsa dos
   * veces seguidas y cada lectura está a una hora de la anterior.
   */
  manualDailyBudget: null,
  manualMinIntervalMs: 60 * 60_000,
  minGapAfterAnyPassMs: 0,
  /*
   * El techo se queda, pero alto: con el suelo de una hora no se puede llegar
   * a 20 en un día (14 manuales + 3 franjas son 17), así que nunca le estorba.
   * Sigue ahí para lo que siempre estuvo: que un `SCHEDULE_HOURS` con doce
   * horas, o un fallo que reintente en bucle, no puedan convertirse en un día
   * de cargas continuas sin que nadie lo pare.
   */
  maxPassesPerDay: 20,
  retryAfterBusyMs: 5 * 60_000,
};

/**
 * ═══ UNA API ABIERTA (Get on Board) ═══
 *
 * No hay cuenta, ni sesión, ni navegador, ni nadie midiendo el patrón: es un
 * endpoint que ellos publican sin autenticación. Aquí el único motivo para
 * limitar el ritmo es no ser un mal vecino de su servidor.
 *
 * Una por minuto a mano y una cada hora en automático es menos tráfico
 * del que hace una persona con la página abierta, y son ~24 peticiones al día
 * contra un endpoint de búsqueda. Sin presupuesto diario ni techo: no hay nada
 * que se gaste.
 */
export const OPEN_API_POLICY: SourcePolicy = {
  schedule: { kind: 'every-minutes', minutes: 60 },
  manualDailyBudget: null,
  manualMinIntervalMs: 60_000,
  minGapAfterAnyPassMs: 0,
  maxPassesPerDay: null,
  retryAfterBusyMs: 0,
};
