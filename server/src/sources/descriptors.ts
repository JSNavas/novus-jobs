import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SettingsRepository } from '../db/settings.repository.js';
import { DescriptorError, parseDescriptor, type SourceDescriptor } from './descriptor.js';

export const DESCRIPTORS_KEY = 'sources:descriptors';

export function readCatalog(dir: string): SourceDescriptor[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return [];
  }

  const catalog: SourceDescriptor[] = [];
  for (const name of names) {
    const path = join(dir, name);
    try {
      catalog.push(parseDescriptor(JSON.parse(readFileSync(path, 'utf8'))));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`[fuentes] ${path} no se pudo leer como descriptor: ${detail}`);
    }
  }
  return catalog;
}

export class SourceDescriptors {
  constructor(private readonly settings: Pick<SettingsRepository, 'get' | 'set'>) {}

  all(): SourceDescriptor[] {
    const stored = this.settings.get(DESCRIPTORS_KEY);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      console.warn('[fuentes] los descriptores guardados no son JSON válido: se ignoran todos.');
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const descriptors: SourceDescriptor[] = [];
    for (const entry of parsed) {
      try {
        descriptors.push(parseDescriptor(entry));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn(`[fuentes] un descriptor guardado dejó de ser válido y se ignora: ${detail}`);
      }
    }
    return descriptors;
  }

  find(name: string): SourceDescriptor | null {
    return this.all().find((descriptor) => descriptor.name === name) ?? null;
  }

  save(input: unknown): SourceDescriptor {
    const descriptor = parseDescriptor(input);
    const rest = this.all().filter((entry) => entry.name !== descriptor.name);
    this.write([...rest, descriptor]);
    return descriptor;
  }

  remove(name: string): boolean {
    const all = this.all();
    const rest = all.filter((entry) => entry.name !== name);
    if (rest.length === all.length) return false;
    this.write(rest);
    return true;
  }

  private write(descriptors: readonly SourceDescriptor[]): void {
    this.settings.set(DESCRIPTORS_KEY, JSON.stringify(descriptors));
  }
}

export { DescriptorError };
