import type { Db } from './database.js';

export class SettingsRepository {
  constructor(private readonly db: Db) {}

  get(key: string): string | null {
    const row = this.db.prepare<[string], { value: string }>(
      'SELECT value FROM settings WHERE key = ?',
    ).get(key);
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    ).run(key, value);
  }
}

export const MOTIVATION_TEMPLATE_KEY = 'motivationTemplate';

export const MAX_AGE_MONTHS_KEY = 'vacancyMaxAgeMonths';

export const FOCUS_SEEN_KEY = 'focusSeen';

export const MAIL_TO_KEY = 'mail:to';
export const MAIL_ONLY_NEW_KEY = 'mail:onlyNewOffers';

export const FOCUS_WINDOW_MONTHS_KEY = 'focusWindowMonths';
