import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import type { LoginWall } from './login-wall.js';
import type { SourcePolicy } from './policy.js';

/**
 * Los números que la plataforma pone junto a la oferta.
 *
 * VAN APARTE DEL TEXTO, y es lo único importante de este tipo. `applications`
 * sube cada día: si se escribiera dentro del anuncio, cambiaría la huella sha1
 * que deduplica y las 187 vacantes volverían a entrar como nuevas en cada
 * pasada. Como campos sueltos se pueden refrescar sin tocar la huella.
 *
 * Todo opcional porque solo los da quien los tiene: Get on Board los entrega en
 * su API; de un post de LinkedIn no se sacan sin abrir la publicación.
 */
export interface PostMetrics {
  /** Cuándo la publicaron ELLOS, en ISO. No cuándo la encontramos nosotros. */
  postedAt: string | null;
  /** Cuánta gente se ha postulado ya. Dice si llegas tarde. */
  applications: number | null;
  /** Lo que tarda la empresa en contestar, en días. */
  responseDays: { min: number | null; max: number | null } | null;
}

export interface RawPost {
  text: string;
  author: string | null;
  url: string | null;
  metrics?: PostMetrics;
}

/**
 * La fuente pide esto antes de ir a por los enlaces permanentes: solo se
 * devuelven los índices de las publicaciones que ya encajan por reglas. Menos
 * interacción con la plataforma es menos riesgo para la cuenta, y eso pesa más
 * que tener el enlace bonito de todas.
 */
export type PermalinkSelector = (posts: readonly RawPost[]) => number[];

/**
 * La plataforma nos pide entrar. No es un fallo técnico y NO se reintenta: nada
 * va a cambiar hasta que el señor inicie sesión a mano, y repetir la pasada
 * cada diez minutos contra una pantalla de login es justo lo que acaba con una
 * cuenta marcada.
 */
export class LoginRequiredError extends Error {
  constructor(readonly source: string, readonly wall: LoginWall, advice: string) {
    super(advice);
    this.name = 'LoginRequiredError';
  }
}

/**
 * Una plataforma de la que se leen ofertas.
 *
 * Añadir una es escribir una `SourceDefinition` y registrarla; quitarla es
 * sacarla de `JOB_SOURCES`. Nada más del proyecto sabe qué plataformas existen:
 * ni el runner, ni el scheduler, ni la API, ni la UI.
 */
export interface JobSource {
  /** Id estable: va a la BD, a `JOB_SOURCES` y a la URL del login. */
  readonly name: string;
  /** Cómo se llama para un humano. */
  readonly label: string;
  /** El perfil de navegador que necesita, o `null` si lee sin sesión (una API, un RSS). */
  readonly profileId: string | null;
  /** Dónde se inicia sesión. `null` si no hace falta. */
  readonly loginUrl: string | null;
  /**
   * Su ritmo: cuándo la lanza el planificador y cuánto se puede insistir a
   * mano. Va en la fuente y no en un sitio común porque lo que lo decide es
   * qué se arriesga al leerla, y eso solo lo sabe ella.
   */
  readonly policy: SourcePolicy;
  fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]>;
  close(): Promise<void>;
}

/** Lo único que hay que escribir para enchufar una plataforma nueva. */
export interface SourceDefinition {
  readonly name: string;
  readonly label: string;
  create(config: Config, pool: BrowserPool): JobSource;
}
