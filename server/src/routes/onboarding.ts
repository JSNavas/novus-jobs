import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import '@fastify/multipart';
import { mergeExtraction, type CvEnhancer } from '../cv/enhance.js';
import { extractFromCv, vetoesOf } from '../cv/extract.js';
import { ACCEPTED_EXTENSIONS, extractCvText, UnsupportedCvError } from '../cv/text.js';
import { COUNTRIES } from '../filters/countries.js';
import { ECOSYSTEM_LABELS, VETOABLE_ECOSYSTEMS, type Ecosystem } from '../profile/technologies.js';
import type { ProfileRepository } from '../profile/profile.repository.js';
import { ENGLISH_LEVELS, LANGUAGES, type CandidateProfile, type EnglishLevel, type Language } from '../profile/types.js';

export interface OnboardingRoutesDeps {
  profiles: ProfileRepository;
  dataDir: string;
  enhancer: CvEnhancer | null;
}

const MAX_CV_BYTES = 8 * 1024 * 1024;

export function registerOnboardingRoutes(app: FastifyInstance, deps: OnboardingRoutesDeps): void {
  app.get('/api/onboarding', () => ({
    completed: deps.profiles.isOnboarded(),
    profile: deps.profiles.get(),
    catalogue: {
      countries: COUNTRIES.map((c) => ({ code: c.code, label: c.label })),
      englishLevels: ENGLISH_LEVELS,
      languages: LANGUAGES,
      ecosystems: VETOABLE_ECOSYSTEMS.map((eco) => ({ id: eco, label: ECOSYSTEM_LABELS[eco] })),
    },
    canEnhance: deps.enhancer !== null,
    acceptedFiles: ACCEPTED_EXTENSIONS,
  }));

  app.post<{ Querystring: { enhance?: string } }>('/api/onboarding/cv', async (request, reply) => {
    const upload = await request.file({ limits: { fileSize: MAX_CV_BYTES } });
    if (!upload) return reply.code(400).send({ error: 'no llegó ningún fichero' });

    const bytes = await upload.toBuffer().catch(() => null);
    if (!bytes) {
      return reply.code(413).send({
        error: `el fichero pasa de ${Math.round(MAX_CV_BYTES / 1024 / 1024)} MB. Un CV cabe de sobra: exporta el PDF sin las imágenes a tamaño original`,
      });
    }

    let text: string;
    try {
      text = await extractCvText(bytes, upload.filename);
    } catch (error) {
      if (error instanceof UnsupportedCvError) return reply.code(415).send({ error: error.message });
      return reply.code(422).send({
        error: `no pude leer el fichero: ${describeError(error)}`,
      });
    }

    if (text.trim().length < 80) {
      return reply.code(422).send({
        error: 'el fichero no trae texto legible. Si es un PDF escaneado, no hay nada que leer: rellena el formulario a mano',
      });
    }

    const rules = extractFromCv(text);
    const wantsEnhance = request.query.enhance === 'true' && deps.enhancer !== null;
    const enhanced = wantsEnhance ? await deps.enhancer!.enhance(text) : null;
    const extraction = mergeExtraction(rules, enhanced);

    saveCv(deps.dataDir, upload.filename, bytes);
    console.log(
      `[alta] CV leído: ${extraction.stack.length} tecnologías, inglés ${extraction.english ?? 'sin dato'}`
      + `, país ${extraction.country ?? 'sin dato'}${enhanced ? ' (con el modelo)' : ''}`,
    );
    return { ...extraction, enhanced: enhanced !== null };
  });

  app.put('/api/onboarding/profile', (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const changes: { -readonly [K in keyof CandidateProfile]?: CandidateProfile[K] } = {};

    for (const key of ['stack', 'core', 'cannotDo'] as const) {
      if (body[key] === undefined) continue;
      const list = strings(body[key]);
      if (!list) return reply.code(400).send({ error: `"${key}" tiene que ser una lista de textos` });
      changes[key] = list;
    }

    if (body.vetoEcosystems !== undefined) {
      const ids = strings(body.vetoEcosystems);
      if (!ids) return reply.code(400).send({ error: '"vetoEcosystems" tiene que ser una lista de textos' });
      const unknown = ids.find((id) => !VETOABLE_ECOSYSTEMS.includes(id as Ecosystem));
      if (unknown) {
        return reply.code(400).send({
          error: `"${unknown}" no es un ecosistema que se pueda vetar. Son: ${VETOABLE_ECOSYSTEMS.join(', ')}`,
        });
      }
      changes.cannotDo = vetoesOf(ids as Ecosystem[]);
    }

    if (body.language !== undefined) {
      const language = LANGUAGES.find((l) => l === body.language);
      if (!language) return reply.code(400).send({ error: `idioma inválido. Son: ${LANGUAGES.join(', ')}` });
      changes.language = language as Language;
    }

    if (body.english !== undefined) {
      const english = body.english as { level?: unknown; filter?: unknown };
      const level = ENGLISH_LEVELS.find((l) => l === english?.level);
      if (!level) {
        return reply.code(400).send({ error: `nivel de inglés inválido. Son: ${ENGLISH_LEVELS.join(', ')}` });
      }
      changes.english = { level: level as EnglishLevel, filter: english.filter === true };
    }

    if (body.geo !== undefined) {
      const geo = body.geo as {
        country?: unknown; city?: unknown; timezone?: unknown; excludeLocalEmployers?: unknown;
      };
      const code = typeof geo?.country === 'string' ? geo.country.trim().toUpperCase() : '';
      if (code && !COUNTRIES.some((c) => c.code === code)) {
        return reply.code(400).send({
          error: `no conozco el país "${code}". Deja el campo vacío si el tuyo no está: sin país no se aplica ninguna regla de país, que es mejor que aplicar la equivocada`,
        });
      }
      const zone = typeof geo?.timezone === 'string' ? geo.timezone.trim() : '';
      if (zone && !isKnownTimeZone(zone)) {
        return reply.code(400).send({ error: `no conozco la zona horaria "${zone}"` });
      }
      changes.geo = {
        country: code,
        city: typeof geo?.city === 'string' && geo.city.trim() ? geo.city.trim() : null,
        timezone: zone,
        excludeLocalEmployers: geo?.excludeLocalEmployers === true,
      };
    }

    if (body.modality !== undefined) {
      const modality = body.modality as Record<string, unknown>;
      changes.modality = {
        remoteGlobal: modality?.remoteGlobal !== false,
        remoteHomeCountry: modality?.remoteHomeCountry !== false,
        hybrid: modality?.hybrid === true,
        onsite: modality?.onsite === true,
      };
    }

    if (!Object.keys(changes).length) return reply.code(400).send({ error: 'no mandaste nada que guardar' });
    return { profile: deps.profiles.patch(changes), completed: deps.profiles.isOnboarded() };
  });

  app.post('/api/onboarding/complete', (_request, reply) => {
    const profile = deps.profiles.get();
    if (!profile.core.length) {
      return reply.code(400).send({
        error: 'elige al menos una tecnología de tu núcleo: sin ninguna, la búsqueda descartaría todo lo que encuentre',
      });
    }
    deps.profiles.completeOnboarding();
    console.log('[alta] terminada: las búsquedas quedan habilitadas');
    return { completed: true, profile };
  });
}

function saveCv(dataDir: string, filename: string, bytes: Buffer): void {
  const dir = join(dataDir, 'cv');
  mkdirSync(dir, { recursive: true });
  const extension = filename.toLowerCase().match(/\.[a-z]+$/)?.[0] ?? '.pdf';
  writeFileSync(join(dir, `cv${extension}`), bytes, { mode: 0o600 });
}

function isKnownTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function strings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === 'string')) return null;
  const clean = (value as string[]).map((v) => v.trim()).filter(Boolean);
  return [...new Set(clean)];
}
