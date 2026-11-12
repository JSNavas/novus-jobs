const MAX_AUTHOR_LINE = 60;
const MIN_SEGMENT_LENGTH = 150;

export interface PostSegment {
  text: string;
  alone: boolean;
}

function firstMeaningfulLine(lines: readonly string[]): string | null {
  const line = lines.map((l) => l.trim()).find((l) => l.length > 0);
  if (!line || line.length > MAX_AUTHOR_LINE) return null;
  return line;
}

export function splitMergedPosts(text: string): PostSegment[] {
  const lines = text.split('\n');
  const header = firstMeaningfulLine(lines);
  if (!header) return [{ text, alone: true }];

  const starts = lines.flatMap((line, index) => (index > 0 && line.trim() === header ? [index] : []));
  if (!starts.length) return [{ text, alone: true }];

  const boundaries = [0, ...starts, lines.length];
  const segments: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push(lines.slice(boundaries[i], boundaries[i + 1]).join('\n').trim());
  }
  const usable = segments.filter((s) => s.length >= MIN_SEGMENT_LENGTH);
  if (usable.length < 2) return [{ text, alone: true }];
  return usable.map((s) => ({ text: s, alone: false }));
}
