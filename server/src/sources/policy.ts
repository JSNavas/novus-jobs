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
  /** En las franjas de `SCHEDULE_HOURS` (9, 13 y 18, hora de Venezuela). */
  | { readonly kind: 'configured-hours' }
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
  // Con el suelo de una hora, un día de insistir son catorce lecturas. Nadie
  // abre LinkedIn catorce veces a buscar lo mismo.
  manualDailyBudget: 3,
  manualMinIntervalMs: 60 * 60_000,
  // Sin esto, el botón pulsado a las 18:01 encadenaba dos cargas del feed con
  // un minuto de diferencia: la de la franja y la tuya. Dos lecturas seguidas
  // es el patrón que menos se parece a una persona.
  minGapAfterAnyPassMs: 20 * 60_000,
  // Red de seguridad, no límite de uso: con 3 franjas + 3 manuales nunca salta.
  // Está para que un SCHEDULE_HOURS de doce horas, o un fallo en bucle, no
  // puedan convertirse en un día de cargas continuas sin que nadie lo pare.
  maxPassesPerDay: 8,
  retryAfterBusyMs: 5 * 60_000,
};

/**
 * ═══ UNA API ABIERTA (Get on Board) ═══
 *
 * No hay cuenta, ni sesión, ni navegador, ni nadie midiendo el patrón: es un
 * endpoint que ellos publican sin autenticación. Aquí el único motivo para
 * limitar el ritmo es no ser un mal vecino de su servidor.
 *
 * Una por minuto a mano y una cada media hora en automático es menos tráfico
 * del que hace una persona con la página abierta, y son ~48 peticiones al día
 * contra un endpoint de búsqueda. Sin presupuesto diario ni techo: no hay nada
 * que se gaste.
 */
export const OPEN_API_POLICY: SourcePolicy = {
  schedule: { kind: 'every-minutes', minutes: 30 },
  manualDailyBudget: null,
  manualMinIntervalMs: 60_000,
  minGapAfterAnyPassMs: 0,
  maxPassesPerDay: null,
  retryAfterBusyMs: 0,
};
