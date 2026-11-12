const MIN_BLOB_CHARS = 40;
const MAX_BLOBS = 400;

function parseFrom(text: string, start: number): unknown | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) {
      if (i - start < MIN_BLOB_CHARS) return null;
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function listsIn(value: unknown, depth = 0): unknown[][] {
  if (depth > 8) return [];
  if (Array.isArray(value)) {
    const objects = value.filter((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry));
    const deeper = value.flatMap((entry) => listsIn(entry, depth + 1));
    return objects.length === value.length && objects.length > 0 ? [value, ...deeper] : deeper;
  }
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap((inner) => listsIn(inner, depth + 1));
}

export function embeddedList(html: string): unknown[] | null {
  let best: unknown[] | null = null;
  let blobs = 0;
  for (let i = 0; i < html.length && blobs < MAX_BLOBS; i++) {
    if (html[i] !== '{' || html[i + 1] !== '"') continue;
    const parsed = parseFrom(html, i);
    if (parsed === null) continue;
    blobs++;
    for (const list of listsIn(parsed)) {
      if (!best || list.length > best.length) best = list;
    }
  }
  return best;
}
