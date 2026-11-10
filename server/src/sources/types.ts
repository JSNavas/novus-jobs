import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import type { LoginWall } from './login-wall.js';

export interface RawPost {
  text: string;
  author: string | null;
  url: string | null;
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
  fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]>;
  close(): Promise<void>;
}

/** Lo único que hay que escribir para enchufar una plataforma nueva. */
export interface SourceDefinition {
  readonly name: string;
  readonly label: string;
  create(config: Config, pool: BrowserPool): JobSource;
}
