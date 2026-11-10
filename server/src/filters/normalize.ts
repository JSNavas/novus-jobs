/**
 * EL TEXTO QUE LOS FILTROS CREEN QUE ESTÁN LEYENDO.
 *
 * En LinkedIn no se puede poner negrita, así que medio feed escribe con
 * caracteres matemáticos Unicode: `𝗦𝗶 𝗾𝘂𝗶𝗲𝗿𝗲𝘀` no es "Si quieres", son puntos
 * de código del bloque Mathematical Alphanumeric Symbols (U+1D400–U+1D7FF) que
 * solo SE PARECEN a letras.
 *
 * Y eso deja ciego a TODO lo que hay debajo: `toLowerCase()` no los toca, los
 * `includes()` fallan y las expresiones regulares no casan. Medido el
 * 2026-11-10 con el feed real: un anuncio de un curso de PySpark pasó el filtro
 * de "¿es siquiera una oferta?" porque ninguna de las marcas de contenido
 * —"curso de", "a tu formación"— podía verse. No es que la regla estuviera mal:
 * es que no estaba leyendo el texto.
 *
 * NFKC es exactamente la respuesta del estándar a esto: la normalización de
 * compatibilidad mapea cada una de esas letras decorativas a su ASCII, y
 * también arregla los caracteres de ancho completo, las ligaduras y los
 * superíndices. Hacerlo a mano con rangos sería peor: el bloque tiene huecos
 * —varias letras viven en Letterlike Symbols— y los huecos es justo lo que se
 * olvida.
 *
 * Se aplica EN LA FUENTE, no en cada filtro: así el texto que se guarda, el que
 * ve el juez y el que se muestra en el dashboard son el mismo y son legibles.
 */
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
