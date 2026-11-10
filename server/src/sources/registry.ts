import type { Config } from '../config.js';
import { LinkedInSource } from './linkedin.source.js';
import type { JobSource } from './types.js';

type SourceFactory = (config: Config) => JobSource;

const FACTORIES: Record<string, SourceFactory> = {
  linkedin: (config) => new LinkedInSource(config),
};

export function buildSources(config: Config): JobSource[] {
  return config.enabledSources.map((id) => {
    const factory = FACTORIES[id];
    if (!factory) throw new Error(`JOB_SOURCES: fuente desconocida "${id}"`);
    return factory(config);
  });
}
