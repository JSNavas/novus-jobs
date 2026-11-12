import { matchStack } from '../filters/offer.js';
import type { CandidateProfile } from '../profile/types.js';
import type { Job } from '../types.js';
import { TOPICS } from './topics.js';

export interface EmergingTerm {
  term: string;
  vacancies: number;
  example: string | null;
  isNew?: boolean;
}

const MIN_VACANCIES = 2;
const MAX_TERMS = 15;
const MIN_EXAMPLE_CHARS = 25;
const MIN_WORD_CHARS = 3;
const MAX_EXAMPLE_CHARS = 180;

const NOT_TECH = new Set([
  'experiencia', 'conocimiento', 'conocimientos', 'manejo', 'capacidad', 'habilidad', 'dominio',
  'buenas', 'buen', 'sólida', 'solida', 'sólidos', 'solidos', 'excelente', 'fuerte', 'deseable',
  'requisitos', 'funciones', 'beneficios', 'responsabilidades', 'nivel', 'modalidad', 'área', 'area',
  'sueldo', 'postular', 'empresa', 'equipo', 'puesto', 'cargo', 'trabajo', 'proyectos', 'clientes',
  'desarrollo', 'desarrollador', 'ingeniero', 'años', 'anos', 'más', 'mas', 'menos', 'ser', 'tener',
  'trabajar', 'participar', 'colaborar', 'diseñar', 'implementar', 'mantener', 'construir', 'crear',
  'remoto', 'presencial', 'híbrido', 'hibrido', 'full', 'time', 'senior', 'semi', 'junior', 'lead',
  'and', 'the', 'with', 'for', 'you', 'your', 'our', 'we', 'will', 'work', 'experience', 'knowledge',
  'strong', 'good', 'ability', 'skills', 'team', 'company', 'product', 'this', 'that', 'what', 'who',
  'latam', 'latinoamérica', 'latinoamerica', 'españa', 'espana', 'chile', 'perú', 'peru', 'colombia',
  'méxico', 'mexico', 'argentina', 'venezuela', 'estados', 'unidos', 'usa', 'eeuu',
  'able', 'about', 'across', 'after', 'all', 'also', 'any', 'are', 'because', 'been', 'both',
  'build', 'building', 'can', 'close', 'complete', 'from', 'have', 'help', 'here', 'how', 'into',
  'join', 'just', 'like', 'make', 'many', 'more', 'most', 'much', 'must', 'not', 'now', 'once',
  'only', 'other', 'own', 'plus', 'run', 'same', 'some', 'such', 'than', 'their', 'them', 'then',
  'there', 'these', 'they', 'those', 'through', 'try', 'typical', 'use', 'using', 'very', 'want',
  'well', 'when', 'where', 'which', 'while', 'why', 'within', 'without', 'would', 'write',
  'role', 'roles', 'job', 'jobs', 'candidate', 'candidates', 'position', 'positions', 'apply',
  'review', 'reviewer', 'interview', 'salary', 'remote', 'onsite', 'hybrid', 'fulltime',
]);

const CATALOGUED = new Set(TOPICS.flatMap((t) => t.aliases.flatMap((alias) => {
  const whole = alias.toLowerCase();
  return [whole, ...whole.split(/[^a-záéíóúñ0-9+#.]+/).filter((w) => w.length > 1)];
})));

function looksTechnical(token: string): boolean {
  if (token.length < 2 || token.length > 24) return false;
  if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(token)) return token.length >= MIN_WORD_CHARS;
  if (/^[A-Z]{2,}$/.test(token)) return true;
  return /[0-9+#]/.test(token) && /[a-zA-Z]/.test(token);
}

function wordsOf(fragment: string): string[] {
  return fragment.split(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9+#.]+/)
    .map((t) => t.replace(/\.+$/, ''))
    .filter(Boolean);
}

function tokensOf(line: string): string[] {
  return line.split(/(?<=[.!?:;])\s+/)
    .flatMap((sentence) => wordsOf(sentence).slice(1));
}

function lowercaseWords(jobs: readonly Job[]): Set<string> {
  const words = new Set<string>();
  for (const job of jobs) {
    for (const word of wordsOf(job.text)) {
      if (word === word.toLowerCase()) words.add(word);
    }
  }
  return words;
}

function requirementLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim())
    .filter((l) => /^[-•*]\s+/.test(l))
    .map((l) => l.replace(/^[-•*]\s+/, '').trim())
    .filter((l) => l.length >= MIN_EXAMPLE_CHARS && l.length <= MAX_EXAMPLE_CHARS);
}

function employerWords(jobs: readonly Job[]): Set<string> {
  const words = new Set<string>();
  for (const job of jobs) {
    for (const name of [job.company, job.author]) {
      for (const word of (name ?? '').split(/\s+/)) {
        if (word.length > 1) words.add(word.toLowerCase());
      }
    }
  }
  return words;
}

export function findEmerging(jobs: readonly Job[], profile: CandidateProfile): EmergingTerm[] {
  const employers = employerWords(jobs);
  const ordinary = lowercaseWords(jobs);
  const vetoed = new Set(profile.cannotDo.map((v) => v.toLowerCase()));
  const seen = new Map<string, { label: string; jobs: Set<number>; example: string | null }>();

  for (const [index, job] of jobs.entries()) {
    for (const line of requirementLines(job.text)) {
      for (const token of tokensOf(line)) {
        const key = token.toLowerCase();
        if (NOT_TECH.has(key) || CATALOGUED.has(key) || employers.has(key)) continue;
        if (ordinary.has(key) || vetoed.has(key)) continue;
        if (!looksTechnical(token)) continue;
        if (TOPICS.some((t) => matchStack(token, t.aliases).length > 0)) continue;

        const entry = seen.get(key) ?? { label: token, jobs: new Set<number>(), example: null };
        entry.jobs.add(index);
        entry.example ??= line;
        seen.set(key, entry);
      }
    }
  }

  return [...seen.values()]
    .filter((e) => e.jobs.size >= MIN_VACANCIES)
    .map((e) => ({ term: e.label, vacancies: e.jobs.size, example: e.example }))
    .sort((a, b) => b.vacancies - a.vacancies || a.term.localeCompare(b.term))
    .slice(0, MAX_TERMS);
}
