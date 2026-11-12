export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    // Separadores invisibles que LinkedIn mete entre líneas (U+2060, U+200B y
    // el U+2063 que aparece al final de cada párrafo en los posts "con estilo").
    // Sin quitarlos, "Python⁣" no casa con "python".
    .replace(/[​-‏⁠-⁤﻿]/g, '')
    // Las comillas y guiones tipográficos rompen coincidencias literales.
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/ /g, ' ');
}
