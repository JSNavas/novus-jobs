import type { SettingsRepository } from '../db/settings.repository.js';

export const HIDDEN_KEY = 'sources:hidden';

export class HiddenSources {
  constructor(private readonly settings: Pick<SettingsRepository, 'get' | 'set'>) {}

  names(): string[] {
    const stored = this.settings.get(HIDDEN_KEY);
    if (!stored) return [];
    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : [];
    } catch {
      return [];
    }
  }

  has(name: string): boolean {
    return this.names().includes(name);
  }

  hide(name: string): void {
    const names = this.names();
    if (names.includes(name)) return;
    this.settings.set(HIDDEN_KEY, JSON.stringify([...names, name]));
  }

  showAll(): void {
    this.settings.set(HIDDEN_KEY, '[]');
  }
}
