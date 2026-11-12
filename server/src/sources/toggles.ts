import type { SettingsRepository } from '../db/settings.repository.js';
import type { JobSource } from './types.js';

export const enabledKey = (source: string): string => `source:${source}:enabled`;

export class SourceToggles {
  constructor(
    private readonly settings: Pick<SettingsRepository, 'get' | 'set'>,
    private readonly seed: readonly string[],
  ) {}

  isEnabled(name: string): boolean {
    const stored = this.settings.get(enabledKey(name));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return this.seed.includes(name);
  }

  set(name: string, enabled: boolean): void {
    this.settings.set(enabledKey(name), enabled ? 'true' : 'false');
  }

  enabled<T extends JobSource>(sources: readonly T[]): T[] {
    return sources.filter((s) => this.isEnabled(s.name));
  }
}
