/** Escapa un literal para usarlo dentro de una RegExp. */
export function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ¿Aparece la palabra completa? Con límites de palabra, no `includes`: "lima"
 * no debe casar dentro de "clima" ni "peru" dentro de "superusuario".
 */
export function wordIn(text: string, word: string): boolean {
  return new RegExp(`(?<![a-záéíóúñ])${escapeRegex(word)}(?![a-záéíóúñ])`, 'i').test(text);
}
