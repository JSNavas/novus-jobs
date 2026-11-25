import { SENIORITY_LEVELS, type SeniorityLevel } from './types.js';

/**
 * Levels, as a set of ticks in the profile: "only Senior" gets only senior
 * postings, every tick gets everything. A posting whose level cannot be told
 * always gets through — discarding it would be discarding on a guess.
 */

export function isSeniorityLevel(value: unknown): value is SeniorityLevel {
  return typeof value === 'string' && SENIORITY_LEVELS.some((l) => l === value);
}

/** Every level ticked: nothing is filtered by level. */
export function wantsEveryLevel(levels: readonly SeniorityLevel[]): boolean {
  return SENIORITY_LEVELS.every((level) => levels.includes(level));
}

/**
 * What to propose from the years a CV states. The person's level and the one
 * below — a senior still wants Semi Senior, not Junior — and Lead from eight
 * years on. Only a proposal: the wizard lets every tick be changed.
 */
export function levelsForYears(years: number | null): SeniorityLevel[] {
  if (years === null) return [...SENIORITY_LEVELS];
  if (years < 1) return ['trainee', 'junior'];
  if (years <= 2) return ['junior', 'semi'];
  if (years <= 7) return ['semi', 'senior'];
  return ['semi', 'senior', 'lead'];
}

/**
 * The levels an ad's minimum of years points at, when it names no level.
 * A floor is not a ceiling: "3+ years" is open to a senior too, so it counts
 * as Semi Senior and Senior. "1+ year" is a junior opening.
 */
export function levelsForDemandedYears(years: number): SeniorityLevel[] {
  if (years <= 1) return ['trainee', 'junior'];
  if (years === 2) return ['junior', 'semi'];
  if (years <= 4) return ['semi', 'senior'];
  return ['senior', 'lead'];
}

// Checked in this order inside each part of a label: "semi senior" before
// "senior", "lead" before "senior" ("Senior Tech Lead" leads).
const LEVEL_WORDS: ReadonlyArray<readonly [SeniorityLevel, RegExp]> = [
  ['semi', /\bsemi[\s-]?senior\b|\bsemisenior\b|\bssr\b|\bmid(?:[\s-]?level)?\b/i],
  ['lead', /\b(?:tech(?:nical)?\s+)?lead\b|\bstaff\b|\bprincipal\b|\bhead\s+of\b|\bexpert[oa]?\b|\barchitect\b|\barquitect[oa]\b/i],
  ['senior', /\bsenior\b|\bsr\b/i],
  ['junior', /\bjunior\b|\bjr\b/i],
  ['trainee', /sin\s+experiencia|no\s+experience|\btrainee\b|\bintern(?:ship)?\b|pasant[eií]a?s?\b|\bpracticante\b|\bbecari[oa]\b|\bentry[\s-]?level\b/i],
];

const LABEL_PARTS = /\s*(?:\/|\||,|·|\s-\s|–|—|\bor\b|\bo\b|\by\b|\band\b)\s*/i;

export interface LabelLevels {
  /** From less to more experience; empty when the label names no level. */
  readonly levels: SeniorityLevel[];
  /** The words that named them, as written ("Semi Senior / Senior"), for the reason shown. */
  readonly words: string;
}

/**
 * The levels a label names: "Senior" → senior, "Semisenior / Senior" →
 * semi and senior, "QA Tester Entry Level" → trainee.
 */
export function levelsInLabel(label: string): LabelLevels {
  const found = new Set<SeniorityLevel>();
  const words: string[] = [];
  for (const part of label.split(LABEL_PARTS)) {
    for (const [level, re] of LEVEL_WORDS) {
      const match = re.exec(part);
      if (!match) continue;
      found.add(level);
      words.push(match[0].trim());
      break;
    }
  }
  return { levels: SENIORITY_LEVELS.filter((level) => found.has(level)), words: words.join(' / ') };
}

/** How the judge's instruction (in Spanish) names each level. */
export const LEVEL_NAMES_FOR_JUDGE: Readonly<Record<SeniorityLevel, string>> = {
  trainee: 'trainee/prácticas (sin experiencia)',
  junior: 'junior (0-2 años)',
  semi: 'semi senior (2-5 años)',
  senior: 'senior (5+ años)',
  lead: 'lead/staff/principal/arquitecto',
};
