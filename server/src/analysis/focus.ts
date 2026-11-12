import type { CandidateProfile } from '../filters/decide.js';
import { matchStack } from '../filters/offer.js';
import type { Job } from '../types.js';
import { findEmerging, type EmergingTerm } from './emerging.js';
import { TOPICS, type Topic, type TopicArea } from './topics.js';

export interface FocusTopic {
  name: string;
  area: TopicArea;
  vacancies: number;
  share: number;
  known: boolean;
  isNew?: boolean;
  examples: string[];
}

export interface Focus {
  analysed: number;
  windowDays: number;
  topics: FocusTopic[];
  emerging: EmergingTerm[];
  newCount?: number;
}

const MIN_VACANCIES = 2;

export const DEFAULT_WINDOW_DAYS = 180;
const DAY_MS = 24 * 60 * 60_000;
const MAX_EXAMPLES = 4;
const MAX_EXAMPLE_CHARS = 180;
const MIN_EXAMPLE_CHARS = 25;

function requirementLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, '').trim())
    .filter((line) => line.length >= MIN_EXAMPLE_CHARS && line.length <= MAX_EXAMPLE_CHARS);
}

function isKnown(topic: Topic, profile: CandidateProfile): boolean {
  const stack = profile.stack.map((s) => s.toLowerCase());
  return topic.aliases.some((alias) => stack.includes(alias.toLowerCase()));
}

function mentions(text: string, topic: Topic): boolean {
  return matchStack(text, topic.aliases).length > 0;
}

function sentenceWith(jobs: readonly Job[], topic: Topic): string | null {
  for (const job of jobs) {
    const sentences = job.text.split(/(?<=[.!?])\s+|\n/).map((x) => x.trim());
    const hit = sentences.find((x) =>
      x.length >= MIN_EXAMPLE_CHARS && x.length <= MAX_EXAMPLE_CHARS && mentions(x, topic));
    if (hit) return hit;
  }
  return null;
}

export function buildFocus(
  all: readonly Job[],
  profile: CandidateProfile,
  options: { now?: number; windowDays?: number } = {},
): Focus {
  const now = options.now ?? Date.now();
  const WINDOW_DAYS = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const since = now - WINDOW_DAYS * DAY_MS;
  const jobs = all.filter((job) => {
    const when = Date.parse(job.postedAt ?? job.foundAt);
    return Number.isNaN(when) ? true : when >= since;
  });

  const analysed = jobs.length;
  if (!analysed) return { analysed: 0, windowDays: WINDOW_DAYS, topics: [], emerging: [] };

  const lines = jobs.map((job) => requirementLines(job.text));

  const found = TOPICS.flatMap((topic) => {
    const vacancies = jobs.filter((job) => mentions(job.text, topic)).length;
    return vacancies >= MIN_VACANCIES ? [{ topic, vacancies }] : [];
  });

  found.sort((a, b) => b.vacancies - a.vacancies || a.topic.name.localeCompare(b.topic.name));

  const used = new Set<string>();

  const topics = found.map(({ topic, vacancies }): FocusTopic => {
    const mine = jobs.flatMap((job, index) => (mentions(job.text, topic) ? lines[index]! : []))
      .filter((line) => mentions(line, topic));

    const examples: string[] = [];
    for (const line of mine) {
      if (examples.length >= MAX_EXAMPLES) break;
      if (used.has(line) || examples.includes(line)) continue;
      examples.push(line);
      used.add(line);
    }
    if (!examples.length && mine.length) examples.push(mine[0]!);
    if (!examples.length) {
      const sentence = sentenceWith(jobs, topic);
      if (sentence) examples.push(sentence);
    }

    return {
      name: topic.name,
      area: topic.area,
      vacancies,
      share: Math.round((vacancies / analysed) * 100),
      known: isKnown(topic, profile),
      examples,
    };
  });

  return { analysed, windowDays: WINDOW_DAYS, topics, emerging: findEmerging(jobs) };
}
