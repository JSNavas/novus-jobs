import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import { GetOnBoardSource } from './getonbrd.source.js';
import { LinkedInSource } from './linkedin.source.js';
import type { JobSource, SourceDefinition } from './types.js';

/**
 * EL CATÁLOGO DE PLATAFORMAS. Es el único sitio del proyecto que las conoce.
 *
 * Para añadir una (InfoJobs, Glassdoor, Indeed, un RSS, una API):
 *   1. `sources/<nombre>.source.ts` con una clase que cumpla `JobSource`.
 *      Si necesita sesión, pide su navegador al pool con `pool.session('<id>')`
 *      y declara `profileId` y `loginUrl`; si no la necesita, los deja en `null`.
 *   2. Una línea en esta lista.
 *   3. Añadirla a `JOB_SOURCES` en el `.env`.
 *
 * Para quitarla: sacarla de `JOB_SOURCES`. El código se queda, inofensivo.
 *
 * Nada más cambia. El runner, el scheduler, el pipeline, la API y la UI no
 * saben cuántas plataformas hay ni cómo se llaman, y las ofertas ya se guardan
 * con su columna `source`.
 */
const DEFINITIONS: readonly SourceDefinition[] = [
  {
    name: 'linkedin',
    label: 'LinkedIn',
    create: (config, pool) => new LinkedInSource(config, pool),
  },
  {
    name: 'getonbrd',
    label: 'Get on Board',
    // Ni `config` ni `pool`: lee de una API pública, sin sesión ni navegador.
    create: () => new GetOnBoardSource(),
  },
];

const BY_NAME = new Map(DEFINITIONS.map((d) => [d.name, d]));

export function knownSourceNames(): string[] {
  return DEFINITIONS.map((d) => d.name);
}

export function sourceDefinition(name: string): SourceDefinition {
  const definition = BY_NAME.get(name);
  if (!definition) {
    throw new Error(`fuente desconocida "${name}". Conocidas: ${knownSourceNames().join(', ')}`);
  }
  return definition;
}

export function buildSources(config: Config, pool: BrowserPool): JobSource[] {
  return config.enabledSources.map((name) => {
    try {
      return sourceDefinition(name).create(config, pool);
    } catch (error) {
      throw new Error(`JOB_SOURCES: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/** Una fuente suelta, por nombre, sin mirar `JOB_SOURCES`: lo que necesita el login. */
export function buildSource(name: string, config: Config, pool: BrowserPool): JobSource {
  return sourceDefinition(name).create(config, pool);
}
