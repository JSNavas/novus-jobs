/**
 * Sacar el texto de un CV. Es lo único que se hace con el fichero.
 *
 * El PDF se lee EN LA MÁQUINA DEL USUARIO, con pdf.js, y el texto no sale de
 * aquí salvo que él active la mejora con el modelo (ver `enhance.ts`). Ese es el
 * motivo de existir del proyecto: su CV no se sube a ningún sitio.
 */

/** Lo que se acepta. Un .docx no: es un zip y pedía otra dependencia entera. */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md'] as const;

export class UnsupportedCvError extends Error {}

export async function extractCvText(file: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return file.toString('utf8');
  if (lower.endsWith('.pdf')) return extractPdfText(file);
  throw new UnsupportedCvError(
    `no sé leer "${filename}". Acepto ${ACCEPTED_EXTENSIONS.join(', ')}; ` +
    'si tu CV está en Word, expórtalo a PDF',
  );
}

/**
 * El texto de un PDF, página a página.
 *
 * pdf.js devuelve trozos sueltos con su posición, no líneas: se pegan con
 * espacio y se corta la línea cuando cambia la altura. Sin eso, "Inglés B2"
 * puede llegar como "InglésB2" y ninguna regla lo reconoce.
 */
async function extractPdfText(file: Buffer): Promise<string> {
  // Import dinámico: pdf.js es grande y solo hace falta cuando alguien sube un
  // CV, que son dos veces en la vida de una instalación.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(file);
  // `useSystemFonts: false` deja el trabajo en memoria: no se buscan fuentes
  // instaladas ni se toca nada del sistema para leer un fichero del usuario.
  const loading = pdfjs.getDocument({ data, useSystemFonts: false });
  const doc = await loading.promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(linesOf(content.items));
  }
  await loading.destroy();
  return pages.join('\n\n');
}

interface TextItem {
  str?: string;
  transform?: number[];
}

function linesOf(items: readonly unknown[]): string {
  const lines: string[] = [];
  let current: string[] = [];
  let lastY: number | null = null;
  for (const raw of items) {
    const item = raw as TextItem;
    if (typeof item.str !== 'string') continue;
    const y = item.transform?.[5] ?? null;
    // Más de dos puntos de diferencia vertical es otra línea, no otro trozo de
    // la misma: el umbral evita partir los superíndices y las tildes sueltas.
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
      lines.push(current.join(' ').replace(/\s+/g, ' ').trim());
      current = [];
    }
    current.push(item.str);
    if (y !== null) lastY = y;
  }
  lines.push(current.join(' ').replace(/\s+/g, ' ').trim());
  return lines.filter(Boolean).join('\n');
}
