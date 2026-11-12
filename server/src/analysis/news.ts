import { FOCUS_SEEN_KEY, type SettingsRepository } from '../db/settings.repository.js';
import type { Focus } from './focus.js';

function currentNames(focus: Focus): string[] {
  return [
    ...focus.topics.map((t) => `tema:${t.name}`),
    ...focus.emerging.map((e) => `nuevo:${e.term}`),
  ];
}

function readSeen(settings: SettingsRepository): Set<string> | null {
  const raw = settings.get(FOCUS_SEEN_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : null;
  } catch {
    return null;
  }
}

export function withNews(focus: Focus, settings: SettingsRepository): Focus {
  const seen = readSeen(settings);
  if (!seen) {
    settings.set(FOCUS_SEEN_KEY, JSON.stringify(currentNames(focus)));
    return { ...focus, newCount: 0 };
  }

  const topics = focus.topics.map((t) => ({ ...t, isNew: !seen.has(`tema:${t.name}`) }));
  const emerging = focus.emerging.map((e) => ({ ...e, isNew: !seen.has(`nuevo:${e.term}`) }));
  const newCount = topics.filter((t) => t.isNew).length + emerging.filter((e) => e.isNew).length;
  return { ...focus, topics, emerging, newCount };
}

export function markSeen(focus: Focus, settings: SettingsRepository): void {
  const seen = readSeen(settings) ?? new Set<string>();
  for (const name of currentNames(focus)) seen.add(name);
  settings.set(FOCUS_SEEN_KEY, JSON.stringify([...seen]));
}
