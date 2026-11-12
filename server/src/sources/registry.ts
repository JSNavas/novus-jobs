import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import { DescribedSource } from './described.source.js';
import type { SourceDescriptor } from './descriptor.js';
import { GetOnBoardSource } from './getonbrd.source.js';
import { HackerNewsSource } from './hackernews.source.js';
import { LinkedInSource } from './linkedin.source.js';
import type { JobSource, SourceDefinition } from './types.js';

const NATIVE: readonly SourceDefinition[] = [
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
  {
    name: 'hackernews',
    label: 'Hacker News (Who is hiring)',
    create: () => new HackerNewsSource(),
  },
];

const NATIVE_NAMES = new Set(NATIVE.map((d) => d.name));

let described: readonly SourceDescriptor[] = [];

function asDefinition(descriptor: SourceDescriptor): SourceDefinition {
  return {
    name: descriptor.name,
    label: descriptor.label,
    create: () => new DescribedSource(descriptor),
  };
}

function definitions(): SourceDefinition[] {
  return [...NATIVE, ...described.map(asDefinition)];
}

export function isNativeSource(name: string): boolean {
  return NATIVE_NAMES.has(name);
}

export function registerDescriptors(list: readonly SourceDescriptor[]): void {
  const kept: SourceDescriptor[] = [];
  const names = new Set<string>();
  for (const descriptor of list) {
    if (NATIVE_NAMES.has(descriptor.name)) {
      console.warn(`[fuentes] se ignora el descriptor "${descriptor.name}": ese nombre ya es de una fuente del repositorio.`);
      continue;
    }
    if (names.has(descriptor.name)) {
      console.warn(`[fuentes] se ignora un descriptor "${descriptor.name}" repetido.`);
      continue;
    }
    names.add(descriptor.name);
    kept.push(descriptor);
  }
  described = kept;
}

export function describedSources(): readonly SourceDescriptor[] {
  return described;
}

export function buildDescribedSources(): JobSource[] {
  return described.map((descriptor) => new DescribedSource(descriptor));
}

export function knownSourceNames(): string[] {
  return definitions().map((d) => d.name);
}

export function sourceDefinition(name: string): SourceDefinition {
  const definition = definitions().find((d) => d.name === name);
  if (!definition) {
    throw new Error(`fuente desconocida "${name}". Conocidas: ${knownSourceNames().join(', ')}`);
  }
  return definition;
}

export function buildSources(config: Config, pool: BrowserPool): JobSource[] {
  return definitions().map((definition) => {
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

export function sourceLabelOf(name: string): string {
  return definitions().find((d) => d.name === name)?.label ?? name;
}
