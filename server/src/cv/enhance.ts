import type { GoogleGenAI } from '@google/genai';
import { COUNTRIES } from '../filters/countries.js';
import { ENGLISH_LEVELS, type EnglishLevel } from '../profile/types.js';
import { knownTechnology, suggestVetoesFor, type CvExtraction } from './extract.js';

/**
 * LA MEJORA OPCIONAL, Y POR QUÉ ES OPCIONAL.
 *
 * Las reglas de `extract.ts` encuentran lo que está escrito con sus palabras:
 * "TypeScript", "Inglés B2", "Caracas". Lo que no saben leer es un CV que dice
 * "llevo años montando APIs con el stack de Vercel" o "me comunico sin problema
 * con clientes en Estados Unidos". Para eso sirve mandar el texto a un modelo.
 *
 * Pero mandarlo es justo lo que este proyecto existe para no hacer: el CV se
 * queda en la máquina del usuario. Así que esto NO se llama solo. Hace falta
 * que haya clave de Gemini y que él pulse el botón con el aviso delante, y
 * entonces va el texto del CV —solo el texto— a Google. Sin clave y sin pulsar,
 * el alta entera funciona con las reglas.
 *
 * Lo que vuelve NO se cree a ciegas:
 * - una tecnología que no esté en el catálogo se tira (`knownTechnology`),
 * - un nivel de inglés que no sea del Marco Común se tira,
 * - un país que no esté en el dataset se tira,
 * - y NADA sobreescribe lo que las reglas ya encontraron: solo rellena huecos.
 *   Si las reglas leyeron "B1" en el papel, el modelo no puede subirlo a B2.
 */
const INSTRUCTION = `Eres un lector de CV. Te doy el texto de un CV y me devuelves SOLO un objeto JSON, sin texto alrededor y sin markdown, con esta forma exacta:

{"stack":["..."],"core":["..."],"english":"none|a1|a2|b1|b2|c1|c2|native","country":"XX","city":"...","years":0}

Reglas:
- "stack": TODA tecnología que el CV demuestre saber, con su nombre canónico en inglés (TypeScript, Node.js, PostgreSQL...). No inventes ninguna que el CV no respalde.
- "core": solo las que definen su oficio, las que al aparecer en una oferta dicen de qué va el puesto. Nunca Docker, Git, AWS ni similares.
- "english": el nivel que el CV declare o que se deduzca de haber trabajado en inglés. Si no hay nada, "none".
- "country": el código ISO de dos letras del país donde VIVE, no de donde trabajó.
- "city": su ciudad, o null.
- "years": años de experiencia profesional, o 0 si no se puede saber.
Si un campo no se puede saber, devuelve null (o [] en las listas). No adivines.`;

export interface CvEnhancement {
  stack: string[];
  core: string[];
  english: EnglishLevel | null;
  country: string | null;
  city: string | null;
  years: number | null;
}

const MAX_CV_CHARS = 20_000;

export class CvEnhancer {
  constructor(private readonly client: GoogleGenAI, private readonly model: string) {}

  /**
   * Devuelve `null` si el modelo falla o responde cualquier cosa: el alta sigue
   * con lo que dieron las reglas, que es un resultado peor pero nunca un error
   * en la cara de quien está dándose de alta.
   */
  async enhance(cvText: string): Promise<CvEnhancement | null> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: `${INSTRUCTION}\n\n### CV\n${cvText.slice(0, MAX_CV_CHARS)}`,
      });
      return parseEnhancement(response.text ?? '');
    } catch (error) {
      console.warn(`[cv] la mejora con el modelo falló: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

/** El primer objeto JSON balanceado de la respuesta. El modelo suele envolverlo en texto. */
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
    if (c === '}') depth--;
    if (depth === 0) {
      try {
        const parsed: unknown = JSON.parse(text.slice(start, i + 1));
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function parseEnhancement(raw: string): CvEnhancement | null {
  const parsed = firstJsonObject(raw);
  if (!parsed) {
    console.warn('[cv] la respuesta del modelo no traía un objeto JSON; se queda lo de las reglas');
    return null;
  }
  return {
    stack: technologies(parsed.stack),
    core: technologies(parsed.core),
    english: level(parsed.english),
    country: country(parsed.country),
    city: typeof parsed.city === 'string' && parsed.city.trim() ? parsed.city.trim() : null,
    years: typeof parsed.years === 'number' && parsed.years > 0 && parsed.years < 60
      ? Math.round(parsed.years)
      : null,
  };
}

/** Solo lo que el catálogo conoce: el modelo no puede meter una tecnología nueva en el perfil. */
function technologies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => knownTechnology(v) ?? []);
  return [...new Set(names)];
}

function level(value: unknown): EnglishLevel | null {
  return ENGLISH_LEVELS.find((l) => l === value) ?? null;
}

function country(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return COUNTRIES.some((c) => c.code === code) ? code : null;
}

/**
 * Junta las dos lecturas. LAS REGLAS MANDAN: lo que se leyó literalmente en el
 * papel no lo cambia el modelo, que solo rellena los huecos. Un modelo que
 * "corrige" un B1 a B2 porque el CV suena bien le activaría al usuario un
 * filtro con un nivel que no tiene.
 */
export function mergeExtraction(rules: CvExtraction, llm: CvEnhancement | null): CvExtraction {
  if (!llm) return rules;
  const stack = [...new Set([...rules.stack, ...llm.stack])];
  return {
    ...rules,
    stack,
    suggestedVetoes: suggestVetoesFor(stack),
    core: [...new Set([...rules.core, ...llm.core])],
    english: rules.english ?? llm.english,
    country: rules.country ?? llm.country,
    city: rules.city ?? llm.city,
    years: rules.years ?? llm.years,
    foundInCv: rules.foundInCv || llm.stack.length > 0,
  };
}
