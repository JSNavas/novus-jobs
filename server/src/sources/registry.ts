import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import { GetOnBoardSource } from './getonbrd.source.js';
import { LinkedInSource } from './linkedin.source.js';
import type { JobSource, SourceDefinition } from './types.js';

const DEFINITIONS: readonly SourceDefinition[] = [
  {
    name: 'linkedin',
    label: 'LinkedIn',
    create: (config, pool) => new LinkedInSource(config, pool),
  },
  {
    name: 'getonbrd',
    label: 'Get on Board',
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
  return DEFINITIONS.map((definition) => {
    try {
      return definition.create(config, pool);
    } catch (error) {
      throw new Error(`JOB_SOURCES: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

export function buildSource(name: string, config: Config, pool: BrowserPool): JobSource {
  return sourceDefinition(name).create(config, pool);
}
