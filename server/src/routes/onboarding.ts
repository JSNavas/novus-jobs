import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
// El import da por efecto los tipos de `request.file()` en FastifyRequest.
import '@fastify/multipart';
import { mergeExtraction, type CvEnhancer } from '../cv/enhance.js';
import { extractFromCv, vetoesOf } from '../cv/extract.js';
import { ACCEPTED_EXTENSIONS, extractCvText, UnsupportedCvError } from '../cv/text.js';
import { COUNTRIES } from '../filters/countries.js';
import { ECOSYSTEM_LABELS, VETOABLE_ECOSYSTEMS, type Ecosystem } from '../profile/technologies.js';
import type { ProfileRepository } from '../profile/profile.repository.js';
import { ENGLISH_LEVELS, LANGUAGES, type CandidateProfile, type EnglishLevel, type Language } from '../profile/types.js';

/**
 * EL ALTA. Lo que convierte este proyecto en algo que puede usar cualquiera.
 *
 * Tres rutas y ninguna magia:
 *
 *   POST /api/onboarding/cv       sube el CV y devuelve lo que se pudo leer
 *   PUT  /api/onboarding/profile  guarda un paso (o varios) del formulario
 *   POST /api/onboarding/complete da el alta por terminada
 *
 * El alta se guarda PASO A PASO y no al final: se puede cerrar el navegador en
 * el paso 3 y volver mañana. Lo que marca el final es una clave aparte
 * (`onboardingCompletedAt`), no que el perfil parezca completo — un perfil a
 * medias es un estado normal y el servidor no tiene que adivinarlo.
 *
 * El CV se guarda en el directorio de datos del usuario, fuera del repo, por lo
 * mismo que las sesiones del navegador: es suyo, no se puede regenerar y no lo
 * toca ningún `build` ni ningún `npm ci`. Y no se sirve de vuelta por HTTP: ya
 * está en su disco.
 */
export interface OnboardingRoutesDeps {
  profiles: ProfileRepository;
  dataDir: string;
  /** `null` si no hay GEMINI_API_KEY: entonces solo hay lectura por reglas. */
  enhancer: CvEnhancer | null;
}

/** 8 MB. Un CV es texto; lo que pase de aquí es un PDF con fotos a tamaño imprenta. */
const MAX_CV_BYTES = 8 * 1024 * 1024;

export function registerOnboardingRoutes(app: FastifyInstance, deps: OnboardingRoutesDeps): void {
  /**
   * El estado del alta. Lo pide la interfaz al arrancar para saber si tiene que
   * mandar a la bienvenida o al dashboard.
   */
  app.get('/api/onboarding', () => ({
    completed: deps.profiles.isOnboarded(),
    profile: deps.profiles.get(),
    /** El catálogo que necesitan los desplegables, para no duplicarlo en React. */
    catalogue: {
      countries: COUNTRIES.map((c) => ({ code: c.code, label: c.label })),
      englishLevels: ENGLISH_LEVELS,
      languages: LANGUAGES,
      ecosystems: VETOABLE_ECOSYSTEMS.map((eco) => ({ id: eco, label: ECOSYSTEM_LABELS[eco] })),
    },
    /** Si se puede ofrecer la mejora con el modelo, que exige clave propia. */
    canEnhance: deps.enhancer !== null,
    acceptedFiles: ACCEPTED_EXTENSIONS,
  }));

  /**
   * Sube el CV y devuelve lo que se leyó. NO guarda nada en el perfil: lo que
   * sale de aquí es una PROPUESTA que el usuario revisa y confirma en el
   * formulario. Un CV mal leído que se guardase solo dejaría vetos que él no
   * puso y ofertas descartadas sin que nadie se enterase.
   *
   * `?enhance=true` manda además el texto al modelo. Es una decisión explícita
   * suya, con el aviso en la pantalla: por defecto el CV no sale de su máquina.
   */
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

  /**
   * Guarda un paso. Lo que no venga en el cuerpo no se toca: así el paso 2 no
   * puede borrar lo que eligió el paso 4, y guardar a medias es seguro.
   *
   * `vetoEcosystems` es azúcar del formulario: el usuario marca "Java y JVM" y
   * aquí se traduce a las tecnologías que el filtro mira de verdad.
   */
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

  /**
   * Cierra el alta y deja que empiecen las búsquedas.
   *
   * Se exige lo mínimo con lo que una búsqueda tiene sentido: al menos una
   * tecnología de núcleo. Sin eso, el filtro descartaría todo lo que encuentre y
   * el usuario vería un dashboard vacío sin saber por qué, que es la peor
   * primera impresión posible. Lo demás —la motivación, la antigüedad, el
   * ritmo— tiene valores por defecto y se puede dejar para después.
   */
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

/**
 * Guarda el CV junto a los datos del usuario, con un nombre fijo por extensión:
 * subir uno nuevo sustituye al viejo en vez de ir dejando copias.
 */
function saveCv(dataDir: string, filename: string, bytes: Buffer): void {
  const dir = join(dataDir, 'cv');
  mkdirSync(dir, { recursive: true });
  const extension = filename.toLowerCase().match(/\.[a-z]+$/)?.[0] ?? '.pdf';
  // Permisos 600: vale lo mismo que la cookie de sesión, y por el mismo motivo.
  writeFileSync(join(dir, `cv${extension}`), bytes, { mode: 0o600 });
}

/** Lo valida el propio runtime: la lista de zonas la trae `Intl`, no nosotros. */
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
