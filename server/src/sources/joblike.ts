const TITLE_KEY = /(^|_)(title|position|puesto|vacante|role|headline|job)/i;
const BODY_KEY = /(description|content|body|summary|requisit|responsib|funciones)/i;
const PAY_KEY = /(salary|sueldo|compensation|pay|remuner)/i;
const PLACE_KEY = /(location|remote|country|city|region|ubicaci|modalidad|workplace)/i;
const JOB_PATH = /job|vacan|posting|position|opening|empleo|puesto|career|offer/i;
const NOT_JOBS = /(skill|tag|categor|industr|countr|region|language|currenc|benefit|question|timezone|city|cities)/i;

const LONG_TEXT_CHARS = 200;
const SAMPLE = 3;

export const MIN_JOB_SCORE = 5;

export function jobLikeness(list: readonly unknown[], where: string): number {
  const entries = list.filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object' && !Array.isArray(e));
  if (!entries.length) return 0;

  const keys = [...new Set(entries.slice(0, SAMPLE).flatMap((entry) => Object.keys(entry)))];
  if (keys.length < 2) return 0;

  let score = 0;
  if (JOB_PATH.test(where)) score += 3;
  if (NOT_JOBS.test(where)) score -= 4;
  if (keys.some((key) => TITLE_KEY.test(key))) score += 3;
  if (keys.some((key) => BODY_KEY.test(key))) score += 2;
  if (keys.some((key) => PAY_KEY.test(key))) score += 1;
  if (keys.some((key) => PLACE_KEY.test(key))) score += 1;

  const hasLongText = entries.slice(0, SAMPLE).some((entry) =>
    Object.values(entry).some((value) => typeof value === 'string' && value.length > LONG_TEXT_CHARS));
  if (hasLongText) score += 2;

  return score;
}

export function mostJobLike<T>(
  lists: readonly { list: readonly unknown[]; where: string; carry: T }[],
): { list: readonly unknown[]; score: number; carry: T } | null {
  let best: { list: readonly unknown[]; score: number; carry: T } | null = null;
  for (const entry of lists) {
    const score = jobLikeness(entry.list, entry.where);
    if (!best || score > best.score || (score === best.score && entry.list.length > best.list.length)) {
      best = { list: entry.list, score, carry: entry.carry };
    }
  }
  return best;
}
