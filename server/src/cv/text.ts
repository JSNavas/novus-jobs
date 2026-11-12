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

async function extractPdfText(file: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(file);
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
