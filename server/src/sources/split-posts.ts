/**
 * DOS PUBLICACIONES EN UNA TARJETA.
 *
 * El extractor elige los `[componentkey]` que contienen "Publicación en el
 * feed" y que no envuelven a otro que también lo contenga. Cuando LinkedIn
 * mete dos publicaciones del mismo autor dentro de un mismo contenedor —y la
 * de dentro no lleva `componentkey`— se quedan las dos juntas en un solo
 * bloque de texto.
 *
 * No es cosmético. Medido el 2026-11-10 con el feed real: una tarjeta juntó un
 * post genérico de una recruiter ("escribime por privado", sin puesto ni
 * requisitos) con la oferta de verdad que venía debajo, un Sr Fullstack C++.
 * Las reglas juzgaron el amasijo: el "Coincide con" salió del segundo anuncio y
 * el texto que se mostraba era el del primero. Una oferta mal descrita es una
 * oferta mal juzgada.
 *
 * LA SEÑAL es que la cabecera del autor vuelve a aparecer. LinkedIn abre cada
 * publicación con el nombre de quien la firma en su propia línea, así que ese
 * nombre repetido a mitad del texto solo puede significar que ahí empieza otra.
 * No se usa ningún selector del DOM a propósito: las clases están ofuscadas y
 * cambian solas, el nombre no.
 */

/** Un nombre de persona o empresa: corto y sin la puntuación de una frase. */
const MAX_AUTHOR_LINE = 60;
/** Por debajo de esto no es una publicación, es un resto; no se parte. */
const MIN_SEGMENT_LENGTH = 150;

export interface PostSegment {
  text: string;
  /** `true` si esta publicación venía sola en su tarjeta. */
  alone: boolean;
}

function firstMeaningfulLine(lines: readonly string[]): string | null {
  const line = lines.map((l) => l.trim()).find((l) => l.length > 0);
  if (!line || line.length > MAX_AUTHOR_LINE) return null;
  return line;
}

/**
 * Parte el texto de una tarjeta en las publicaciones que lleve dentro.
 *
 * Conservador por diseño: si no encuentra la cabecera repetida, o si al partir
 * quedarían trozos demasiado cortos, devuelve el texto tal cual. Partir de más
 * rompería anuncios buenos, y eso es peor que dejar una tarjeta doble.
 */
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
