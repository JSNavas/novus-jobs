import type { TextModel } from '../llm/client.js';
import type { Config } from '../config.js';
import { findCountry } from './countries.js';
import { otherTradesFor, tradesFor } from '../profile/roles.js';
import { t } from '../i18n/index.js';
import type { CandidateProfile, Offer } from './decide.js';
import { LEVEL_NAMES_FOR_JUDGE, wantsEveryLevel } from '../profile/seniority.js';
import { SENIORITY_LEVELS } from '../profile/types.js';

const JUDGE_REJECTIONS = ['onsite', 'other-country', 'english', 'seniority', 'technology', 'local-employer', 'role'] as const;
type JudgeRejection = (typeof JUDGE_REJECTIONS)[number];

export interface JudgeVerdict {
  index: number;
  isOffer: boolean;
  rejection: JudgeRejection | null;
  reason: string;
  aggregator: boolean;
}

export const POSTS_PER_CALL = 60;
const MAX_CHARS_PER_POST = 1800;

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

function parseJudgeItem(item: unknown, offset: number): JudgeVerdict | null {
  if (typeof item !== 'object' || item === null) return null;
  const fields: Record<string, unknown> = Object.fromEntries(Object.entries(item));
  const { i, esOferta, descarte, motivo, esAgregador } = fields;
  if (typeof i !== 'number' || !Number.isInteger(i)) return null;
  return {
    index: i + offset,
    isOffer: esOferta === true,
    rejection: isJudgeRejection(descarte) ? descarte : null,
    reason: typeof motivo === 'string' ? motivo.slice(0, 200) : '',
    aggregator: esAgregador === true,
  };
}

function countryName(profile: CandidateProfile): string | null {
  return findCountry(profile.geo.country)?.label ?? null;
}

function unwantedModalities(profile: CandidateProfile): string[] {
  const out: string[] = [];
  if (!profile.modality.onsite) out.push('presencial');
  if (!profile.modality.hybrid) out.push('híbrido');
  if (!profile.modality.remoteGlobal) out.push('remoto sin más');
  if (!profile.modality.remoteHomeCountry) out.push('remoto solo para su país');
  return out;
}

function experienceLine(profile: CandidateProfile): string {
  const { years, levels } = profile.experience;
  const said = years === null ? '' : `Experiencia: ${years} años. `;
  if (wantsEveryLevel(levels)) return `- ${said}Acepta puestos de CUALQUIER nivel: no descartes por nivel.`;
  return `- ${said}Solo quiere puestos de nivel: ${levels.map((l) => LEVEL_NAMES_FOR_JUDGE[l]).join(', ')}.`;
}

function seniorityRule(profile: CandidateProfile): string {
  const { levels } = profile.experience;
  if (wantsEveryLevel(levels)) return '   "seniority"         → no lo uses: acepta cualquier nivel.';
  const unwanted = SENIORITY_LEVELS.filter((level) => !levels.includes(level));
  return [
    '   "seniority"         → el puesto es CLARAMENTE de un nivel que no quiere:',
    `                         ${unwanted.map((l) => LEVEL_NAMES_FOR_JUDGE[l]).join(', ')}.`,
    '                         Lo dice el título, una línea de nivel o los años que EXIGE.',
    '                         Si admite varios niveles y uno es de los suyos, o no dice',
    '                         su nivel, NO es descarte.',
  ].join('\n');
}

function instruction(profile: CandidateProfile, country: string | null): string {
  const unwanted = unwantedModalities(profile);
  const accepted = [
    profile.modality.remoteGlobal ? 'remoto' : null,
    profile.modality.remoteHomeCountry ? 'remoto para su país' : null,
    profile.modality.hybrid ? 'híbrido' : null,
    profile.modality.onsite ? 'presencial' : null,
  ].filter(Boolean).join(', ');

  return [
    'Eres el filtro de ofertas de trabajo de una persona que busca empleo. Juzga cada publicación que te paso.',
    '',
    'EL CANDIDATO:',
    `- Su oficio: ${tradesFor(profile.roles)}.`,
    `- Sabe: ${profile.stack.join(', ') || 'no lo ha dicho'}.`,
    `- Su oficio lo definen: ${profile.core.join(', ') || 'no lo ha dicho'}.`,
    profile.cannotDo.length
      ? `- NO sabe, y si lo EXIGEN el puesto no le sirve: ${profile.cannotDo.join(', ')}.`
      : '- No ha declarado tecnologías que no maneje.',
    country ? `- Vive en: ${country}.` : '- No ha dicho dónde vive: no descartes por país.',
    profile.english.filter
      ? `- Inglés ${profile.english.level.toUpperCase()}: si EXIGEN más que eso, el puesto no le sirve.`
      : `- Inglés ${profile.english.level.toUpperCase()}. NO descartes por idioma: quiere verlas igual.`,
    experienceLine(profile),
    `- Acepta: ${accepted || 'no lo ha dicho'}.`,
    unwanted.length ? `- NO acepta: ${unwanted.join(', ')}.` : null,
    profile.geo.excludeLocalEmployers && country
      ? `- Busca empresas EXTRANJERAS: las de ${country} no le interesan.`
      : null,
    '',
    'PARA CADA PUBLICACIÓN, RESPONDE:',
    '',
    '1. esOferta: ¿es una VACANTE de verdad? NO lo es un artículo técnico, un tutorial,',
    '   una opinión, un consejo sobre cómo buscar trabajo, ni alguien OFRECIÉNDOSE como',
    '   candidato ("Hola red, soy X, busco oportunidades").',
    '',
    '2. descarte: SOLO uno de estos valores, o null:',
    '   "onsite"            → la modalidad es una de las que NO acepta.',
    country
      ? `   "other-country"     → el remoto exige residir en otro país, o la lista de países\n                         donde contratan NO incluye ${country}.`
      : '   "other-country"     → no lo uses: no ha dicho desde dónde busca.',
    profile.english.filter
      ? '   "english"           → EXIGEN un inglés por encima del suyo.'
      : '   "english"           → no lo uses: no quiere filtrar por idioma.',
    seniorityRule(profile),
    '   "technology"        → EXIGEN algo que no sabe (de la lista de arriba).',
    profile.geo.excludeLocalEmployers && country
      ? `   "local-employer" → la contrata una empresa de ${country}.`
      : '   "local-employer" → no lo uses.',
    '   "role"              → el trabajo principal del puesto NO es de su oficio, aunque',
    '                         el anuncio mencione tecnologías que sabe. NO son de su',
    `                         oficio: ${otherTradesFor(profile.roles)}.`,
    '                         Un puesto de su oficio que ADEMÁS pida nociones de otra',
    '                         área NO es "role": lo es cuando el trabajo principal es otro.',
    '   null                → EL RESTO DE CASOS.',
    '',
    '   Si no está en esa lista, es null. Que no diga si es remoto NO es un descarte.',
    '   Ante la duda, null: perder una oferta buena cuesta más que leer una de más.',
    '',
    '   DISTINGUE EXIGIR de MENCIONAR. Estas van con null:',
    '     · "inglés deseable", "se valora inglés", "English is a plus".',
    '     · "5+ years preferred", "idealmente 3 años": los años deseables no se exigen.',
    '     · la publicación escrita en inglés: escribirla en inglés no es exigirlo.',
    '     · cualquier lista de alternativas que incluya algo que SÍ sabe:',
    '       "React, Angular o similar" → sabe React → null.',
    '     · "migrar nuestro legacy en Java" → buscan a alguien que NO venga de ahí.',
    '     · "remoto global, clientes en Estados Unidos" → dice dónde están los clientes.',
    '     · "empresa de Bogotá, trabajo 100% remoto" → la ciudad es de la empresa.',
    '',
    '3. esAgregador: ¿la publica un intermediario que capturó la oferta de otro sitio',
    '   y la revende? Una bolsa de empleo que publica SU propia vacante NO es agregador.',
    '',
    `4. motivo: una frase corta explicando la decisión. ${t(profile.language, 'judge.language')}`,
    '',
    'RESPONDE SOLO CON UN ARRAY JSON, sin markdown ni texto alrededor:',
    '[{"i":0,"esOferta":true,"descarte":null,"esAgregador":false,"motivo":"…"}]',
    'Un objeto por publicación, con su índice. Ni uno más ni uno menos.',
  ].filter((line) => line !== null).join('\n');
}

const RETRIES = 1;
const RETRY_DELAY_MS = 4_000;
const TRANSIENT = /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|timeout|ETIMEDOUT|ECONNRESET/i;

export class LlmJudge {
  constructor(
    private readonly client: TextModel,
    private readonly model: string,
  ) {}

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
          contents: `${instruction(profile, countryName(profile))}\n\n${posts}`,
        });
        const array = firstJsonArray(response.text ?? '');
        if (array) return array.flatMap((item) => parseJudgeItem(item, offset) ?? []);
        console.warn('[juez] la respuesta no traía un array JSON; mandan las reglas');
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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
