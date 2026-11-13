import type { SettingsRepository } from '../db/settings.repository.js';
import { LINKEDIN_JOBS_URL } from './linkedin-jobs.source.js';

export const SEARCHES_KEY = 'linkedin:searches';
export const MAX_SEARCHES = 6;

const LINKEDIN_JOBS = /^https:\/\/(www\.)?linkedin\.com\/jobs\//i;

export class SearchNotFromLinkedInError extends Error {
  constructor(readonly url: string) {
    super(`"${url}" no es una dirección de empleos de LinkedIn: tiene que empezar por https://www.linkedin.com/jobs/`);
    this.name = 'SearchNotFromLinkedInError';
  }
}

export function cleanSearch(raw: string): string {
  const text = raw.trim();
  if (!LINKEDIN_JOBS.test(text)) throw new SearchNotFromLinkedInError(text);
  const url = new URL(text);
  url.searchParams.delete('currentJobId');
  url.searchParams.delete('start');
  url.searchParams.delete('originToLandingJobPostings');
  url.hash = '';
  return url.toString();
}

export class LinkedInSearches {
  constructor(private readonly settings: Pick<SettingsRepository, 'get' | 'set'>) {}

  urls(): string[] {
    const stored = this.settings.get(SEARCHES_KEY);
    if (!stored) return [LINKEDIN_JOBS_URL];
    try {
      const parsed: unknown = JSON.parse(stored);
      const list = Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
      return list.length > 0 ? list : [LINKEDIN_JOBS_URL];
    } catch {
      return [LINKEDIN_JOBS_URL];
    }
  }

  save(raw: readonly string[]): string[] {
    const clean: string[] = [];
    for (const entry of raw) {
      if (entry.trim() === '') continue;
      const url = cleanSearch(entry);
      if (!clean.includes(url)) clean.push(url);
    }
    const kept = clean.slice(0, MAX_SEARCHES);
    this.settings.set(SEARCHES_KEY, JSON.stringify(kept));
    return this.urls();
  }
}
