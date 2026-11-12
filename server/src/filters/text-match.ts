export function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wordIn(text: string, word: string): boolean {
  return new RegExp(`(?<![a-záéíóúñ])${escapeRegex(word)}(?![a-záéíóúñ])`, 'i').test(text);
}
