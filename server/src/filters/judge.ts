import type { GoogleGenAI } from '@google/genai';
import type { Config } from '../config.js';
import type { CandidateProfile, Offer } from './decide.js';

/**
 * Segundo par de ojos, en los dos sentidos: el modelo puede DESCARTAR lo que
 * las reglas dejaron pasar y REVOCAR lo que las reglas descartaron por algo
 * que él sabe leer mejor (ubicación, idioma, tecnología, o si es una vacante).
 * Solo con uno de estos motivos: uno fuera de la lista se trata como "sin
 * descarte", porque el modelo no puede inventarse un veto. Qué descartes puede
 * revocar lo decide `applyJudgment`, no este fichero.
 */
const JUDGE_REJECTIONS = ['onsite', 'other-country', 'english', 'technology', 'venezuelan-employer'] as const;
type JudgeRejection = (typeof JUDGE_REJECTIONS)[number];

export interface JudgeVerdict {
  index: number;
  isOffer: boolean;
  rejection: JudgeRejection | null;
  reason: string;
  junior: boolean;
  aggregator: boolean;
}

const POSTS_PER_CALL = 20;
const MAX_CHARS_PER_POST = 1800;

/**
 * Extrae el primer array JSON completo de la respuesta contando corchetes
 * balanceados fuera de cadenas. No se recorta del primer `[` al último `]`: un
 * modelo que devuelve dos arrays rompería ese recorte.
 */
function firstJsonArray(text: string): unknown[] | null {
  const start = text.indexOf('[');
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
    if (c === '[') depth++;
    if (c === ']') depth--;
    if (depth === 0) {
      const parsed: unknown = JSON.parse(text.slice(start, i + 1));
      return Array.isArray(parsed) ? parsed : null;
    }
  }
  return null;
}

function isJudgeRejection(value: unknown): value is JudgeRejection {
  return typeof value === 'string' && JUDGE_REJECTIONS.some((r) => r === value);
}

/** Valida un elemento de la respuesta. Lo que no encaja se descarta, no se adivina. */
function parseJudgeItem(item: unknown, offset: number): JudgeVerdict | null {
  if (typeof item !== 'object' || item === null) return null;
  const fields: Record<string, unknown> = Object.fromEntries(Object.entries(item));
  const { i, esOferta, descarte, motivo, esJunior, esAgregador } = fields;
  if (typeof i !== 'number' || !Number.isInteger(i)) return null;
  return {
    index: i + offset,
    isOffer: esOferta === true,
    rejection: isJudgeRejection(descarte) ? descarte : null,
    reason: typeof motivo === 'string' ? motivo.slice(0, 200) : '',
    junior: esJunior === true,
    aggregator: esAgregador === true,
  };
}

function instruction(profile: CandidateProfile): string {
  return [
    'Eres el filtro de ofertas de trabajo de un desarrollador. Juzga cada publicación de LinkedIn que te paso.',
    '',
    'EL CANDIDATO:',
    '- Full Stack Engineer con 9 años de experiencia. Vive en Venezuela (estado Falcón).',
    `- Sabe: ${profile.stack.join(', ')}.`,
    `- NO sabe, y si lo EXIGEN el puesto no le sirve: ${profile.cannotDo.join(', ')}.`,
    '- Inglés A2: lee documentación técnica, pero NO puede trabajar en inglés.',
    '- Solo le sirve el trabajo REMOTO. No puede ir a ninguna oficina.',
    '- Busca empresas EXTRANJERAS: las venezolanas no le interesan.',
    '',
    'PARA CADA PUBLICACIÓN, RESPONDE:',
    '',
    '1. esOferta: ¿es una VACANTE de verdad? NO lo es un artículo técnico, un tutorial,',
    '   una opinión, un consejo sobre cómo buscar trabajo, ni alguien OFRECIÉNDOSE como',
    '   candidato ("Hola red, soy X, busco oportunidades").',
    '',
    '2. descarte: SOLO uno de estos valores, o null:',
    '   "onsite"            → presencial, híbrido, o pide ir a una oficina.',
    '   "other-country"     → el remoto exige residir en otro país ("remoto Argentina",',
    '                         "must be based in Spain"), o la lista de países donde',
    '                         contratan NO incluye Venezuela.',
    '   "english"           → EXIGEN inglés por escrito.',
    '   "technology"        → EXIGEN algo que no sabe (de la lista de arriba).',
    '   "venezuelan-employer" → la contrata una empresa de Venezuela.',
    '   null                → EL RESTO DE CASOS.',
    '',
    '   Si no está en esa lista, es null. Que no diga si es remoto NO es un descarte.',
    '   Ante la duda, null: perder una oferta buena cuesta más que leer una de más.',
    '',
    '   DISTINGUE EXIGIR de MENCIONAR. Estas van con null:',
    '     · "inglés deseable", "se valora inglés", "English is a plus".',
    '     · la publicación escrita en inglés (él lee inglés técnico sin problema).',
    '     · cualquier lista de alternativas que incluya algo que SÍ sabe:',
    '       "React, Angular o similar" → sabe React → null.',
    '       "Python / Go"              → sabe Python → null.',
    '     · "migrar nuestro legacy en Java" → buscan a alguien que NO venga de ahí.',
    '     · "remoto global, clientes en Estados Unidos" → dice dónde están los clientes.',
    '     · "empresa de Bogotá, trabajo 100% remoto" → la ciudad es de la empresa.',
    '     · "remoto PARA Venezuela" de una extranjera → es justo lo que busca.',
    '',
    '3. esJunior: ¿es junior, trainee, becario o prácticas? Solo para la sección de',
    '   extras, NO es un descarte. "Semi Senior" y "Junior/Semi Senior" NO son junior.',
    '',
    '4. esAgregador: ¿la publica un intermediario que capturó la oferta de otro sitio',
    '   y la revende? (Freelanly, Jobfound, "Jobs Watcher"). Una bolsa de empleo que',
    '   publica SU propia vacante NO es agregador.',
    '',
    '5. motivo: una frase corta explicando la decisión, en español.',
    '',
    'RESPONDE SOLO CON UN ARRAY JSON, sin markdown ni texto alrededor:',
    '[{"i":0,"esOferta":true,"descarte":null,"esJunior":false,"esAgregador":false,"motivo":"…"}]',
    'Un objeto por publicación, con su índice. Ni uno más ni uno menos.',
  ].join('\n');
}

/**
 * ═══ GEMINI, Y NO OTRO ═══
 *
 * Porque es el que ya usa ARTIO para juzgar estas mismas ofertas
 * (`job-judge.service.ts`, `gemini-3.1-flash-lite`), con la clave que el señor
 * ya tiene y ya paga. Este proyecto arrancó pidiendo una clave de Anthropic
 * que no tenía, así que el juez nació apagado y las reglas quedaron solas —que
 * es justo lo que el juez existe para evitar.
 *
 * El criterio para elegir proveedor aquí no es cuál es mejor: es cuál ya está
 * en casa. Una cuenta nueva y una factura nueva por un segundo par de ojos no
 * se justifican cuando el primero ya está pagado.
 */
/**
 * UN reintento, y solo ante un fallo pasajero del proveedor.
 *
 * Medido en real: un 503 "high demand" de Google tumbaba el juicio de la
 * pasada entera. Es un error que se arregla solo en segundos, y perder el
 * segundo par de ojos por eso es tonto. Lo que NO se reintenta es una
 * respuesta mal formada: eso no mejora repitiendo, y encima gastaría el
 * presupuesto de la capa gratuita.
 */
const RETRIES = 1;
const RETRY_DELAY_MS = 4_000;
const TRANSIENT = /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|timeout|ETIMEDOUT|ECONNRESET/i;

export class LlmJudge {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
  ) {}

  /**
   * Juzga el lote entero, tanda a tanda.
   *
   * UNA TANDA QUE FALLA NO TIRA LAS DEMÁS. Antes se devolvía `null` al primer
   * fallo: mandaban las reglas y no se mezclaban criterios a medias. Eso valía
   * cuando el juez solo podía VETAR, porque perderlo solo dejaba pasar algún
   * falso positivo. Ahora el juez también RESCATA descartes de las reglas, así
   * que un 503 de Google en la segunda tanda borraba los rescates de la
   * primera: la pasada entera volvía a cero ofertas por un fallo pasajero.
   * Cada oferta sin veredicto se guarda como `Skipped`, que es exactamente lo
   * que era antes para todas.
   *
   * Devuelve `null` solo si no se pudo juzgar NADA.
   */
  async judge(offers: readonly Offer[], profile: CandidateProfile): Promise<JudgeVerdict[] | null> {
    const verdicts: JudgeVerdict[] = [];
    let failed = 0;
    for (let start = 0; start < offers.length; start += POSTS_PER_CALL) {
      const batch = offers.slice(start, start + POSTS_PER_CALL);
      const batchVerdicts = await this.judgeBatch(batch, profile, start);
      if (!batchVerdicts) {
        failed++;
        continue;
      }
      verdicts.push(...batchVerdicts);
    }
    if (failed) console.warn(`[juez] ${failed} tanda(s) sin veredicto; esas ofertas las deciden las reglas`);
    return verdicts.length ? verdicts : null;
  }

  private async judgeBatch(batch: readonly Offer[], profile: CandidateProfile, offset: number): Promise<JudgeVerdict[] | null> {
    const posts = batch
      .map((o, i) => `### PUBLICACIÓN ${i}\n${o.text.slice(0, MAX_CHARS_PER_POST)}`)
      .join('\n\n');
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: `${instruction(profile)}\n\n${posts}`,
        });
        const array = firstJsonArray(response.text ?? '');
        if (array) return array.flatMap((item) => parseJudgeItem(item, offset) ?? []);
        // Respondió, pero no con el JSON pedido. Reintentar no suele arreglarlo.
        console.warn('[juez] la respuesta no traía un array JSON; mandan las reglas');
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // ═══ EL MOTIVO NO SE TIRA ═══
        // Este `catch` se tragaba el error entero y devolvía `null`. La pasada
        // seguía con las reglas —que es lo correcto— pero nadie sabía nunca por
        // qué el juez no había opinado. Se comprobó en real: era un 503 de
        // Google por saturación, cosa que se arregla sola y que, en silencio,
        // parecía un juez roto.
        if (attempt < RETRIES && TRANSIENT.test(message)) {
          console.warn(`[juez] fallo pasajero (${message.slice(0, 80)}): reintento en ${RETRY_DELAY_MS / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        console.warn(`[juez] no pudo juzgar (${message.slice(0, 160)}); mandan las reglas`);
        return null;
      }
    }
    return null;
  }
}
