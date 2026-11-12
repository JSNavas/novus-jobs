import type { GoogleGenAI } from '@google/genai';
import { DescriptorError, parseDescriptor, type SourceDescriptor } from './descriptor.js';

const MAX_SAMPLE_CHARS = 12_000;
const MAX_STRING_CHARS = 400;
const SAMPLE_ENTRIES = 2;

const INSTRUCTION = `Eres un integrador de bolsas de empleo. Te doy la respuesta de una API y me devuelves SOLO un objeto JSON, sin texto alrededor y sin markdown, que describe cómo leer sus vacantes.

Forma exacta:

{"version":1,"name":"...","label":"...","request":{"url":"...","method":"GET","format":"json","query":{},"paging":null},"fields":{"list":"...","title":"...","company":"...","description":"...","url":"...","urlTemplate":null,"location":"...","postedAt":"...","salary":"...","applications":"...","skip":0,"titleFromDescription":false,"companySeparator":null}}

Reglas:
- "name": minúsculas, sin espacios ni acentos, derivado del dominio. "label": el nombre humano del sitio.
- "request.url": la MISMA dirección que te doy, sin los parámetros de página. Los demás parámetros van en "query" como textos.
- "fields.list": el camino de puntos hasta el array de vacantes ("data.result", "jobs"). Si la respuesta ES el array, pon null.
- Los demás campos son caminos de puntos DENTRO de una vacante ("company.name"). Usa null si ese dato no existe; no inventes campos que no estén en la muestra.
- "description": el campo con el texto largo del anuncio. Es obligatorio y es el más importante: sin él no se puede filtrar nada. Si hay versión en texto plano y otra en HTML, elige la de texto plano.
- "url": el campo con el enlace a la oferta. Si no hay ninguno pero sí un id, deja "url" en null y escribe "urlTemplate" con el patrón público del sitio, por ejemplo "https://sitio.com/jobs/{id}".
- "paging": si la respuesta trae un total de páginas, pon {"param":"page","start":1,"max":3,"totalPages":"camino.al.total"}. Si no, null.
- "skip": 1 solo si el primer elemento del array no es una vacante (un aviso legal, por ejemplo).
- "companySeparator": solo si la empresa viene dentro del título, como "Empresa: Puesto" (pon ":") o "Empresa | Puesto" (pon "|").
- "titleFromDescription": true solo si no hay ningún campo de título.
No añadas claves que no estén en la forma de arriba.`;

function trim(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_CHARS ? `${value.slice(0, MAX_STRING_CHARS)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 3).map((v) => trim(v, depth + 1));
  if (value === null || typeof value !== 'object') return value;
  if (depth > 6) return '…';
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, trim(v, depth + 1)]));
}

export function sampleOf(payload: unknown, listPath: string | null): unknown {
  if (listPath === null) {
    return Array.isArray(payload) ? trim(payload.slice(0, SAMPLE_ENTRIES)) : trim(payload);
  }
  const shrunk = structuredClone(payload) as Record<string, unknown>;
  const keys = listPath.split('.');
  let node: Record<string, unknown> = shrunk;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    if (next === null || typeof next !== 'object') return trim(payload);
    node = next as Record<string, unknown>;
  }
  const last = keys[keys.length - 1] ?? '';
  const list = node[last];
  if (Array.isArray(list)) node[last] = list.slice(0, SAMPLE_ENTRIES);
  return trim(shrunk);
}

function firstJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
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
      try {
        return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export class DescriptorInventor {
  constructor(private readonly client: GoogleGenAI, private readonly model: string) {}

  async invent(endpoint: string, payload: unknown, listPath: string | null): Promise<SourceDescriptor> {
    const sample = JSON.stringify(sampleOf(payload, listPath), null, 1).slice(0, MAX_SAMPLE_CHARS);
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: `${INSTRUCTION}\n\n### Dirección\n${endpoint}\n\n### Respuesta (recortada)\n${sample}`,
    });

    const raw = firstJsonObject(response.text ?? '');
    if (!raw) {
      throw new DescriptorError('el modelo no devolvió un JSON que se pueda leer. Prueba otra vez.');
    }
    return parseDescriptor(raw);
  }
}
