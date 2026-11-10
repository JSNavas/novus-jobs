import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '../config.js';
import type { CandidateProfile, Offer } from './decide.js';

/**
 * Segundo par de ojos: el modelo solo puede DESCARTAR lo que las reglas
 * dejaron pasar, y solo con uno de estos motivos. Un motivo fuera de la lista
 * se trata como "sin descarte": el modelo no puede inventarse un veto.
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
    '- Full Stack Engineer con más de 7 años. Vive en Venezuela (estado Falcón).',
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

export class ClaudeJudge {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  /**
   * Juzga el lote entero. Devuelve `null` si cualquier tanda falla: en ese caso
   * mandan las reglas, y nunca se mezclan criterios a medias.
   */
  async judge(offers: readonly Offer[], profile: CandidateProfile): Promise<JudgeVerdict[] | null> {
    const verdicts: JudgeVerdict[] = [];
    for (let start = 0; start < offers.length; start += POSTS_PER_CALL) {
      const batch = offers.slice(start, start + POSTS_PER_CALL);
      const batchVerdicts = await this.judgeBatch(batch, profile, start);
      if (!batchVerdicts) return null;
      verdicts.push(...batchVerdicts);
    }
    return verdicts;
  }

  private async judgeBatch(batch: readonly Offer[], profile: CandidateProfile, offset: number): Promise<JudgeVerdict[] | null> {
    const posts = batch
      .map((o, i) => `### PUBLICACIÓN ${i}\n${o.text.slice(0, MAX_CHARS_PER_POST)}`)
      .join('\n\n');
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: `${instruction(profile)}\n\n${posts}` }],
      });
      const reply = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const array = firstJsonArray(reply);
      if (!array) return null;
      return array.flatMap((item) => parseJudgeItem(item, offset) ?? []);
    } catch {
      return null;
    }
  }
}
